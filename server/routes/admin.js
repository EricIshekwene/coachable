import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../db/pool.js";
import { generateCode, sendDangerModeEmail, sendAccountDeletedEmail, sendBroadcastEmails } from "../lib/email.js";
import { storeGifAsset, getGifAsset } from "../lib/gifAssetStore.js";
import { computeNextSendAt } from "../utils/computeNextSendAt.js";
import {
  requireAdminOrStaff,
  requireOwnerOrLegacyAdmin,
  requirePerm,
  requireAnyPerm,
  requireSportScope,
  redactByPerm,
  actorHasPerm,
  actorHasSportScope,
  actorOwnsResource,
  actorCanModify,
  mergeStaffPermissions,
  writeAudit,
} from "../middleware/staffAuth.js";

// ── Sport resolvers (for requireSportScope on platform play / preset routes) ─

/**
 * Resolve the sport of a platform play by id (req.params.id).
 * Joins through platform_play_folders for plays inside a sport folder; falls
 * back to platform_plays.sport for plays not inside a folder.
 * @param {import('express').Request} req
 * @returns {Promise<string | null>}
 */
async function resolveSportForPlatformPlay(req) {
  const playId = req.params.id;
  if (!playId) return null;
  const { rows } = await pool.query(
    `SELECT COALESCE(f.sport, p.sport) AS sport
       FROM platform_plays p
       LEFT JOIN platform_play_folders f ON p.folder_id = f.id
      WHERE p.id = $1`,
    [playId]
  );
  return rows[0]?.sport || null;
}

/**
 * Resolve the sport for a play being created from req.body. Prefers the
 * folder's sport (when folderId is set and the folder is a sport folder),
 * otherwise uses body.sport. Returns null if neither is present — caller
 * should treat that as "no scope constraint applicable" only when the actor
 * is the owner; staff create-play without an inferable sport is denied.
 * @param {import('express').Request} req
 * @returns {Promise<string | null>}
 */
async function resolveSportFromPlayBody(req) {
  const { folderId, sport } = req.body || {};
  if (folderId) {
    const { rows } = await pool.query(
      `SELECT sport, is_sport_folder FROM platform_play_folders WHERE id = $1`,
      [folderId]
    );
    if (rows[0]?.is_sport_folder && rows[0]?.sport) return rows[0].sport;
  }
  return sport?.trim() || null;
}

function isPermissionObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizePermissionObject(value) {
  return isPermissionObject(value) ? value : {};
}

async function loadStaffRole(roleId) {
  if (!roleId) return null;
  const { rows } = await pool.query(
    `SELECT id, name, description, permissions, created_at, updated_at
       FROM staff_admin_roles
      WHERE id = $1`,
    [roleId]
  );
  return rows[0] || null;
}

async function requireExistingStaffRole(roleId) {
  if (!roleId) return null;
  const role = await loadStaffRole(roleId);
  if (!role) {
    const err = new Error("Staff role not found");
    err.statusCode = 400;
    throw err;
  }
  return role;
}

function buildStaffRolePayload(role) {
  if (!role) return null;
  return {
    id: role.id,
    name: role.name,
    description: role.description || "",
    permissions: normalizePermissionObject(role.permissions),
    created_at: role.created_at,
    updated_at: role.updated_at,
  };
}

const router = Router();
const COACHING_ROLES = ["owner", "coach", "assistant_coach"];
const ADMIN_HASH = globalThis.process.env.ADMIN_HASH;
if (!ADMIN_HASH) {
  throw new Error("ADMIN_HASH environment variable must be set.");
}

// In-memory session store (resets on server restart — fine for admin)
const sessions = new Map();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (matches cookie lifetime)
const ELEVATED_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Danger Mode OTP store: sessionId -> { code, expiresAt }
const dangerModeCodes = new Map();
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Admin security email for Danger Mode verification (persists in memory; set via admin UI)
let adminSecurityEmail = process.env.ADMIN_SECURITY_EMAIL || "";

const COOKIE_NAME = "admin_sid";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "strict",
  maxAge: SESSION_TTL_MS,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

/** Resolve session ID from header (preferred) or cookie fallback. */
function resolveSessionId(req) {
  return req.headers["x-admin-session"] || req.cookies?.[COOKIE_NAME];
}

/**
 * Returns true if the request carries a valid, non-expired legacy admin
 * session (the shared-password flow). Used by staff-auth middleware to
 * recognise the owner's legacy login without re-implementing session lookup.
 * @param {import('express').Request} req
 * @returns {boolean}
 */
export function hasValidAdminSession(req) {
  const sid = resolveSessionId(req);
  if (!sid || !sessions.has(sid)) return false;
  const session = sessions.get(sid);
  if (Date.now() > session.expiresAt) {
    sessions.delete(sid);
    return false;
  }
  return true;
}

export function requireAdmin(req, res, next) {
  const sid = resolveSessionId(req);
  if (!sid || !sessions.has(sid)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const session = sessions.get(sid);
  if (Date.now() > session.expiresAt) {
    sessions.delete(sid);
    return res.status(401).json({ error: "Session expired" });
  }
  next();
}

/**
 * Middleware that requires the session to be in an elevated (Danger Mode) state.
 * Elevation is granted via POST /admin/elevate and expires after ELEVATED_TTL_MS.
 */
export function requireElevated(req, res, next) {
  const sid = resolveSessionId(req);
  if (!sid || !sessions.has(sid)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const session = sessions.get(sid);
  if (Date.now() > session.expiresAt) {
    sessions.delete(sid);
    return res.status(401).json({ error: "Session expired" });
  }
  if (!session.elevatedAt || Date.now() - session.elevatedAt > ELEVATED_TTL_MS) {
    return res.status(403).json({ error: "Danger Mode required. Re-authenticate to perform this action." });
  }
  next();
}

/**
 * Boolean form of `requireElevated`. True only if the request carries a
 * legacy admin session that has been elevated within ELEVATED_TTL_MS.
 * Used by ownership-aware delete handlers that need to keep Danger Mode
 * for owner deletions while still letting staff delete their own resources.
 *
 * @param {import('express').Request} req
 * @returns {boolean}
 */
export function isLegacyAdminElevated(req) {
  const sid = resolveSessionId(req);
  if (!sid || !sessions.has(sid)) return false;
  const session = sessions.get(sid);
  if (Date.now() > session.expiresAt) return false;
  if (!session.elevatedAt) return false;
  return Date.now() - session.elevatedAt <= ELEVATED_TTL_MS;
}

// GET /admin/session — verify cookie-based session for auto-login
router.get("/session", (req, res) => {
  const sid = req.cookies?.[COOKIE_NAME];
  if (!sid || !sessions.has(sid)) {
    return res.status(401).json({ error: "No session" });
  }
  const session = sessions.get(sid);
  if (Date.now() > session.expiresAt) {
    sessions.delete(sid);
    res.clearCookie(COOKIE_NAME, { path: "/" });
    return res.status(401).json({ error: "Session expired" });
  }
  res.json({ session: sid });
});

// POST /admin/login
router.post("/login", async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });

  const valid = await bcrypt.compare(password, ADMIN_HASH);
  if (!valid) return res.status(401).json({ error: "Invalid password" });

  const sid = crypto.randomBytes(32).toString("hex");
  sessions.set(sid, { expiresAt: Date.now() + SESSION_TTL_MS, elevatedAt: null });
  res.cookie(COOKIE_NAME, sid, COOKIE_OPTS);
  res.json({ session: sid });
});

/**
 * Step 1: Validate admin password and send a 6-digit OTP to the configured
 * security email. If no security email is configured, elevates immediately
 * (backwards-compatible fallback).
 * @route POST /admin/elevate/request
 */
router.post("/elevate/request", requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });

  const valid = await bcrypt.compare(password, ADMIN_HASH);
  if (!valid) return res.status(401).json({ error: "Invalid password" });

  const sid = resolveSessionId(req);

  // No security email configured — elevate immediately (legacy fallback)
  if (!adminSecurityEmail) {
    const session = sessions.get(sid);
    session.elevatedAt = Date.now();
    const elevatedUntil = session.elevatedAt + ELEVATED_TTL_MS;
    return res.json({ ok: true, elevated: true, elevatedUntil });
  }

  // Generate and store OTP
  const code = generateCode();
  dangerModeCodes.set(sid, { code, expiresAt: Date.now() + OTP_TTL_MS });

  try {
    await sendDangerModeEmail(adminSecurityEmail, code);
  } catch (err) {
    dangerModeCodes.delete(sid);
    return res.status(500).json({ error: "Failed to send verification email. Check server email config." });
  }

  // Mask email for display: a*****@example.com
  const [localPart, domain] = adminSecurityEmail.split("@");
  const maskedEmail = `${localPart[0]}*****@${domain}`;

  res.json({ ok: true, codeSent: true, maskedEmail });
});

/**
 * Step 2: Verify the OTP sent to the security email and elevate the session.
 * @route POST /admin/elevate/confirm
 */
router.post("/elevate/confirm", requireAdmin, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Verification code required" });

  const sid = resolveSessionId(req);
  const pending = dangerModeCodes.get(sid);

  if (!pending) return res.status(400).json({ error: "No pending verification. Request a new code." });
  if (Date.now() > pending.expiresAt) {
    dangerModeCodes.delete(sid);
    return res.status(400).json({ error: "Code expired. Request a new one." });
  }
  if (pending.code !== String(code).trim()) {
    return res.status(401).json({ error: "Invalid code" });
  }

  dangerModeCodes.delete(sid);
  const session = sessions.get(sid);
  session.elevatedAt = Date.now();
  const elevatedUntil = session.elevatedAt + ELEVATED_TTL_MS;
  res.json({ ok: true, elevatedUntil });
});

// Pending security email changes: sessionId -> { newEmail, code, expiresAt }
const pendingEmailChanges = new Map();

/**
 * Get the currently configured admin security email (masked).
 * @route GET /admin/settings/security-email
 */
router.get("/settings/security-email", requireOwnerOrLegacyAdmin, (req, res) => {
  if (!adminSecurityEmail) return res.json({ email: "" });
  const [localPart, domain] = adminSecurityEmail.split("@");
  const maskedEmail = `${localPart[0]}*****@${domain}`;
  res.json({ email: maskedEmail, configured: true });
});

/**
 * Step 1: Request a security email change. If a current email is configured,
 * sends an OTP to that address before applying the change. If no email is set,
 * applies immediately.
 * @route PUT /admin/settings/security-email
 */
router.put("/settings/security-email", requireOwnerOrLegacyAdmin, async (req, res) => {
  const { email } = req.body;
  const newEmail = (email || "").trim();

  if (newEmail !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  // No current email — apply immediately (nothing to verify against)
  if (!adminSecurityEmail) {
    adminSecurityEmail = newEmail;
    if (!adminSecurityEmail) return res.json({ ok: true, configured: false });
    const [localPart, domain] = adminSecurityEmail.split("@");
    return res.json({ ok: true, configured: true, maskedEmail: `${localPart[0]}*****@${domain}` });
  }

  // Current email exists — send OTP to it before allowing the change
  const sid = resolveSessionId(req);
  const code = generateCode();
  pendingEmailChanges.set(sid, { newEmail, code, expiresAt: Date.now() + OTP_TTL_MS });

  try {
    await sendDangerModeEmail(adminSecurityEmail, code);
  } catch (err) {
    pendingEmailChanges.delete(sid);
    return res.status(500).json({ error: "Failed to send verification email." });
  }

  const [localPart, domain] = adminSecurityEmail.split("@");
  res.json({ ok: true, codeSent: true, maskedEmail: `${localPart[0]}*****@${domain}` });
});

/**
 * Step 2: Confirm the OTP sent to the current security email and apply the change.
 * @route POST /admin/settings/security-email/confirm
 */
router.post("/settings/security-email/confirm", requireOwnerOrLegacyAdmin, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Verification code required" });

  const sid = resolveSessionId(req);
  const pending = pendingEmailChanges.get(sid);

  if (!pending) return res.status(400).json({ error: "No pending change. Request a new code." });
  if (Date.now() > pending.expiresAt) {
    pendingEmailChanges.delete(sid);
    return res.status(400).json({ error: "Code expired. Request a new one." });
  }
  if (pending.code !== String(code).trim()) {
    return res.status(401).json({ error: "Invalid code" });
  }

  pendingEmailChanges.delete(sid);
  adminSecurityEmail = pending.newEmail;

  if (!adminSecurityEmail) return res.json({ ok: true, configured: false });
  const [localPart, domain] = adminSecurityEmail.split("@");
  res.json({ ok: true, configured: true, maskedEmail: `${localPart[0]}*****@${domain}` });
});

/**
 * Backfill is_seeded for plays that were seeded before the column existed.
 * Matches existing plays whose title exactly matches a platform play title.
 * Safe to run multiple times.
 * @route POST /admin/backfill-seeded-plays
 */
router.post("/backfill-seeded-plays", requireOwnerOrLegacyAdmin, async (_req, res, next) => {
  try {
    const { rowCount } = await pool.query(`
      UPDATE plays
      SET is_seeded = true
      WHERE is_seeded = false
        AND title IN (SELECT title FROM platform_plays)
    `);
    res.json({ ok: true, updated: rowCount });
  } catch (err) {
    next(err);
  }
});

// POST /admin/logout
router.post("/logout", (req, res) => {
  const sid = resolveSessionId(req);
  if (sid) sessions.delete(sid);
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

// GET /admin/users — list all users
router.get("/users", requireAdminOrStaff, requirePerm("users.viewTable"), redactByPerm({
  email: { perm: "users.viewEmails", mask: "email" },
  name: { perm: "users.viewUsernames", mask: "username" },
}), async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.email_verified_at, u.onboarded_at, u.created_at,
              u.updated_at,
              u.is_beta_tester,
              (SELECT COUNT(*)::int FROM plays WHERE created_by_user_id = u.id AND NOT is_seeded AND copied_from_platform_play_id IS NULL) AS plays_created,
              (SELECT COUNT(*)::int FROM play_folders WHERE created_by_user_id = u.id) AS folders_created,
              COALESCE(
                json_agg(
                  json_build_object(
                    'teamId', t.id,
                    'teamName', t.name,
                    'sport', t.sport,
                    'role', tm.role,
                    'joinedAt', tm.joined_at,
                    'isPersonal', t.is_personal
                  )
                  ORDER BY tm.joined_at
                ) FILTER (WHERE tm.id IS NOT NULL),
                '[]'::json
              ) AS memberships,
              COALESCE(bool_or(tm.role = ANY($1::team_role[])), false) AS can_view_activity
       FROM users u
       LEFT JOIN team_memberships tm ON tm.user_id = u.id
       LEFT JOIN teams t ON t.id = tm.team_id
       GROUP BY u.id, u.name, u.email, u.email_verified_at, u.onboarded_at, u.created_at, u.updated_at, u.is_beta_tester
       ORDER BY u.created_at DESC`,
      [COACHING_ROLES]
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

// GET /admin/users/:id/activity - detail + recent activity for a single user
router.get("/users/:id/activity", requireAdminOrStaff, requirePerm("users.viewTable"), redactByPerm({
  email: { perm: "users.viewEmails", mask: "email" },
  name: { perm: "users.viewUsernames", mask: "username" },
}), async (req, res, next) => {
  try {
    const userId = req.params.id;

    const [userResult, summaryResult, recentPlaysResult, recentActivityResult] = await Promise.all([
      pool.query(
        `SELECT u.id, u.name, u.email, u.email_verified_at, u.onboarded_at, u.created_at,
                u.updated_at, u.active_team_id, u.is_beta_tester,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'teamId', t.id,
                      'teamName', t.name,
                      'sport', t.sport,
                      'role', tm.role,
                      'joinedAt', tm.joined_at,
                      'isPersonal', t.is_personal,
                      'isOwner', t.owner_user_id = u.id
                    )
                    ORDER BY tm.joined_at
                  ) FILTER (WHERE tm.id IS NOT NULL),
                  '[]'::json
                ) AS memberships,
                COALESCE(bool_or(tm.role = ANY($2::team_role[])), false) AS can_view_activity
         FROM users u
         LEFT JOIN team_memberships tm ON tm.user_id = u.id
         LEFT JOIN teams t ON t.id = tm.team_id
         WHERE u.id = $1
         GROUP BY u.id, u.name, u.email, u.email_verified_at, u.onboarded_at, u.created_at, u.updated_at, u.active_team_id, u.is_beta_tester`,
        [userId, COACHING_ROLES]
      ),
      pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM plays WHERE created_by_user_id = $1 AND NOT is_seeded AND copied_from_platform_play_id IS NULL) AS plays_created,
           (SELECT COUNT(*)::int FROM plays WHERE updated_by_user_id = $1 AND created_by_user_id <> $1 AND NOT is_seeded AND copied_from_platform_play_id IS NULL) AS plays_updated,
           (SELECT COUNT(*)::int FROM play_folders WHERE created_by_user_id = $1) AS folders_created,
           (SELECT COUNT(*)::int FROM play_share_links WHERE created_by_user_id = $1) AS play_shares_created,
           (SELECT COUNT(*)::int FROM folder_share_links WHERE created_by_user_id = $1) AS folder_shares_created,
           (SELECT COUNT(*)::int FROM team_invites WHERE invited_by_user_id = $1) AS invites_sent,
           (SELECT COUNT(*)::int FROM user_issues WHERE user_id = $1) AS issues_reported,
           (SELECT COUNT(*)::int FROM error_reports WHERE user_id = $1) AS error_reports,
           (SELECT COUNT(*)::int FROM play_favorites WHERE user_id = $1) AS favorite_plays`,
        [userId]
      ),
      pool.query(
        `SELECT p.id, p.title,
                p.play_data AS "playData",
                p.thumbnail_url AS thumbnail,
                p.created_at AS "createdAt",
                p.updated_at AS "updatedAt",
                p.archived_at AS "archivedAt",
                p.hidden_from_players AS "hiddenFromPlayers",
                t.id AS "teamId",
                t.name AS "teamName",
                t.sport AS sport,
                pf.name AS "folderName"
         FROM plays p
         JOIN teams t ON t.id = p.team_id
         LEFT JOIN play_folders pf ON pf.id = p.folder_id
         WHERE p.created_by_user_id = $1
           AND p.copied_from_platform_play_id IS NULL
         ORDER BY p.created_at DESC
         LIMIT 25`,
        [userId]
      ),
      pool.query(
        `SELECT activity_type, activity_id, label, team_name, occurred_at, meta
         FROM (
           SELECT
             'play_created' AS activity_type,
             p.id::text AS activity_id,
             p.title AS label,
             t.name AS team_name,
             p.created_at AS occurred_at,
             json_build_object(
               'playId', p.id,
               'hiddenFromPlayers', p.hidden_from_players,
               'archivedAt', p.archived_at
             ) AS meta
           FROM plays p
           JOIN teams t ON t.id = p.team_id
           WHERE p.created_by_user_id = $1
             AND p.copied_from_platform_play_id IS NULL

           UNION ALL

           SELECT
             'play_updated' AS activity_type,
             p.id::text AS activity_id,
             p.title AS label,
             t.name AS team_name,
             p.updated_at AS occurred_at,
             json_build_object('playId', p.id) AS meta
           FROM plays p
           JOIN teams t ON t.id = p.team_id
           WHERE p.updated_by_user_id = $1
             AND p.created_by_user_id <> $1
             AND p.copied_from_platform_play_id IS NULL

           UNION ALL

           SELECT
             'folder_created' AS activity_type,
             pf.id::text AS activity_id,
             pf.name AS label,
             t.name AS team_name,
             pf.created_at AS occurred_at,
             json_build_object('folderId', pf.id) AS meta
           FROM play_folders pf
           JOIN teams t ON t.id = pf.team_id
           WHERE pf.created_by_user_id = $1

           UNION ALL

           SELECT
             'play_share_created' AS activity_type,
             psl.id::text AS activity_id,
             p.title AS label,
             t.name AS team_name,
             psl.created_at AS occurred_at,
             json_build_object(
               'playId', p.id,
               'expiresAt', psl.expires_at,
               'revokedAt', psl.revoked_at
             ) AS meta
           FROM play_share_links psl
           JOIN plays p ON p.id = psl.play_id
           JOIN teams t ON t.id = p.team_id
           WHERE psl.created_by_user_id = $1

           UNION ALL

           SELECT
             'folder_share_created' AS activity_type,
             fsl.id::text AS activity_id,
             pf.name AS label,
             t.name AS team_name,
             fsl.created_at AS occurred_at,
             json_build_object(
               'folderId', pf.id,
               'expiresAt', fsl.expires_at,
               'revokedAt', fsl.revoked_at
             ) AS meta
           FROM folder_share_links fsl
           JOIN play_folders pf ON pf.id = fsl.folder_id
           JOIN teams t ON t.id = pf.team_id
           WHERE fsl.created_by_user_id = $1

           UNION ALL

           SELECT
             'invite_sent' AS activity_type,
             ti.id::text AS activity_id,
             COALESCE(ti.contact_email, ti.contact_phone, ti.requested_role::text) AS label,
             t.name AS team_name,
             ti.created_at AS occurred_at,
             json_build_object(
               'requestedRole', ti.requested_role,
               'status', ti.status,
               'acceptedAt', ti.accepted_at
             ) AS meta
           FROM team_invites ti
           JOIN teams t ON t.id = ti.team_id
           WHERE ti.invited_by_user_id = $1

           UNION ALL

           SELECT
             'issue_reported' AS activity_type,
             ui.id::text AS activity_id,
             ui.title AS label,
             NULL::text AS team_name,
             ui.created_at AS occurred_at,
             json_build_object('status', ui.status) AS meta
           FROM user_issues ui
           WHERE ui.user_id = $1

           UNION ALL

           SELECT
             'error_reported' AS activity_type,
             er.id::text AS activity_id,
             COALESCE(er.component, er.action, er.error_message, 'Error report') AS label,
             NULL::text AS team_name,
             er.created_at AS occurred_at,
             json_build_object(
               'action', er.action,
               'pageUrl', er.page_url
             ) AS meta
           FROM error_reports er
           WHERE er.user_id = $1
         ) activity
         ORDER BY occurred_at DESC
         LIMIT 50`,
        [userId]
      ),
    ]);

    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user,
      summary: summaryResult.rows[0],
      recentPlays: recentPlaysResult.rows,
      activity: recentActivityResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Fully delete a user and all their data, and send the user a notification
 * email so they aren't silently stranded on the next login attempt.
 *
 * @param {string} userId - User UUID to delete.
 * @param {"stale"|"admin"} [reason="admin"] - Why the account is being removed.
 *   Drives the wording of the notification email.
 * @returns {Promise<{email: string|null, name: string|null}|null>} The
 *   captured contact info for the deleted user (so callers can log or
 *   suppress email separately), or null if the user did not exist.
 */
async function deleteUserCascade(userId, reason = "admin") {
  const client = await pool.connect();
  let userContact = null;
  try {
    await client.query("BEGIN");
    // Snapshot email/name BEFORE deletion so we can email the user afterwards.
    const { rows: contactRows } = await client.query(
      "SELECT email, name FROM users WHERE id = $1",
      [userId]
    );
    userContact = contactRows[0] || null;

    // Clean up tables that reference users without ON DELETE CASCADE
    await client.query("DELETE FROM folder_share_links WHERE created_by_user_id = $1", [userId]);
    await client.query("DELETE FROM play_share_links WHERE created_by_user_id = $1", [userId]);
    await client.query("UPDATE plays SET created_by_user_id = (SELECT owner_user_id FROM teams WHERE id = plays.team_id), updated_by_user_id = (SELECT owner_user_id FROM teams WHERE id = plays.team_id) WHERE created_by_user_id = $1 OR updated_by_user_id = $1", [userId]);
    await client.query("UPDATE play_folders SET created_by_user_id = NULL WHERE created_by_user_id = $1", [userId]);
    await client.query("UPDATE team_invites SET invited_by_user_id = (SELECT owner_user_id FROM teams WHERE id = team_invites.team_id) WHERE invited_by_user_id = $1", [userId]);
    await client.query("UPDATE team_invites SET accepted_by_user_id = NULL WHERE accepted_by_user_id = $1", [userId]);
    await client.query("UPDATE team_join_requests SET reviewed_by_user_id = NULL WHERE reviewed_by_user_id = $1", [userId]);
    await client.query("DELETE FROM team_invite_codes WHERE created_by_user_id = $1", [userId]);
    // Delete teams owned by this user (cascades to memberships, plays, folders, etc.)
    await client.query("DELETE FROM teams WHERE owner_user_id = $1", [userId]);
    // Delete the user (cascades to memberships, preferences, verification codes, etc.)
    await client.query("DELETE FROM users WHERE id = $1", [userId]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // Best-effort notification AFTER the transaction commits. Never let an
  // email failure roll back or surface as a delete failure.
  if (userContact?.email) {
    try {
      await sendAccountDeletedEmail({
        toEmail: userContact.email,
        userName: userContact.name,
        reason,
      });
    } catch (emailErr) {
      console.error(`Failed to send account-deleted email to ${userContact.email}:`, emailErr.message);
    }
  }

  return userContact;
}

// DELETE /admin/users/:id — delete a single user and their owned teams (requires Danger Mode)
router.delete("/users/:id", requireElevated, async (req, res, next) => {
  try {
    await deleteUserCascade(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/users — delete ALL users (requires Danger Mode)
router.delete("/users", requireElevated, async (_req, res, next) => {
  try {
    // Delete all teams first (cascades to memberships, invites, plays, etc.)
    await pool.query("DELETE FROM teams");
    await pool.query("DELETE FROM users");
    res.json({ ok: true, message: "All users deleted" });
  } catch (err) {
    next(err);
  }
});

// POST /admin/create-account — create a user with no verification required
router.post("/create-account", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { name, email, password, teamName, sport, role } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const hash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create user with email already verified
      const { rows: userRows } = await client.query(
        `INSERT INTO users (name, email, password_hash, email_verified_at)
         VALUES ($1, $2, $3, now())
         RETURNING id, name, email, created_at`,
        [name.trim(), email.trim().toLowerCase(), hash]
      );
      const user = userRows[0];

      // Create default preferences
      await client.query(
        "INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING",
        [user.id]
      );

      // Optionally create a team and onboard
      let team = null;
      if (teamName?.trim()) {
        const teamRes = await client.query(
          `INSERT INTO teams (name, sport, owner_user_id)
           VALUES ($1, $2, $3)
           RETURNING id, name, sport`,
          [teamName.trim(), sport?.trim() || null, user.id]
        );
        team = teamRes.rows[0];

        await client.query(
          "INSERT INTO team_settings (team_id) VALUES ($1)",
          [team.id]
        );

        const memberRole = role || "owner";
        await client.query(
          `INSERT INTO team_memberships (team_id, user_id, role)
           VALUES ($1, $2, $3)`,
          [team.id, user.id, memberRole]
        );

        // Generate invite codes
        const playerCode = crypto.randomBytes(4).toString("hex").toUpperCase();
        const coachCode = crypto.randomBytes(4).toString("hex").toUpperCase();
        await client.query(
          `INSERT INTO team_invite_codes (team_id, role, code, created_by_user_id)
           VALUES ($1, 'player', $2, $3), ($1, 'coach', $4, $3)`,
          [team.id, playerCode, user.id, coachCode]
        );

        // Mark onboarded
        await client.query(
          "UPDATE users SET onboarded_at = now(), updated_at = now() WHERE id = $1",
          [user.id]
        );
      }

      await client.query("COMMIT");
      res.status(201).json({ user, team });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
    next(err);
  }
});

// POST /admin/cleanup — delete non-onboarded accounts older than 24h
router.post("/cleanup", requireOwnerOrLegacyAdmin, async (_req, res, next) => {
  try {
    const result = await cleanupStaleAccounts();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Platform plays ──────────────────────────────────────────────────────────

/** Build a canonical platform play response from a DB row. */
function toPlatformPlayResponse(row) {
  return {
    id: row.id,
    folderId: row.folder_id || null,
    title: row.title,
    description: row.description || "",
    sport: row.sport || null,
    playData: row.play_data || null,
    thumbnail: row.thumbnail_url || null,
    tags: row.tags || [],
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    createdBy: row.created_by || null,
    creatorName: row.creator_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Build a canonical platform play folder response from a DB row. */
function toPlatformFolderResponse(row) {
  return {
    id: row.id,
    parentId: row.parent_id || null,
    name: row.name,
    sport: row.sport || null,
    isSportFolder: row.is_sport_folder ?? false,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function filterRowsBySportScope(actor, permPath, rows, getSport) {
  if (!actor || actor.isOwner) return rows;
  return rows.filter((row) => {
    const sport = getSport(row);
    return !!sport && actorHasSportScope(actor, permPath, sport);
  });
}

// GET /admin/plays — list admin-curated platform plays only (excludes community submissions)
router.get("/plays", requireAdminOrStaff, requirePerm("plays.viewFolders"), async (req, res, next) => {
  try {
    // ?picker=1 — skip the playbook-section exclusion so all platform plays are returned
    // (used by the email composer play picker which needs the full catalogue)
    const isPicker = req.query.picker === "1";
    const { rows } = await pool.query(
      `SELECT p.*, f.sport AS folder_sport,
              COALESCE(u.name, u.email) AS creator_name
         FROM platform_plays p
         LEFT JOIN platform_play_folders f ON p.folder_id = f.id
         LEFT JOIN users u ON u.id = p.created_by
        WHERE is_community_submitted = false
          ${!isPicker ? `AND p.id NOT IN (
            SELECT psp.play_id
            FROM playbook_section_plays psp
            JOIN playbook_sections ps ON ps.id = psp.section_id
            WHERE ps.is_default = false
          )` : ""}
        ORDER BY p.sort_order ASC, p.created_at DESC`
    );
    const visibleRows = filterRowsBySportScope(
      req.actor,
      "plays.sportScope",
      rows,
      (row) => row.folder_sport || row.sport || null
    );
    res.json({ plays: visibleRows.map(toPlatformPlayResponse) });
  } catch (err) {
    next(err);
  }
});

// GET /admin/plays/:id — get a single platform play (for loading in editor)
router.get("/plays/:id", requireAdminOrStaff, requirePerm("plays.viewFolders"), requireSportScope("plays.sportScope", resolveSportForPlatformPlay), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM platform_plays WHERE id = $1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Play not found" });
    res.json({ play: toPlatformPlayResponse(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// POST /admin/plays — create a platform play
router.post("/plays", requireAdminOrStaff, requirePerm("plays.add"), requireSportScope("plays.sportScope", resolveSportFromPlayBody), async (req, res, next) => {
  try {
    const { title, description, sport, playData, thumbnail, tags, isFeatured, sortOrder, folderId } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "title is required" });

    // If the play is being created inside a sport folder, infer sport from the folder
    let resolvedSport = sport?.trim() || null;
    if (folderId) {
      const { rows: [f] } = await pool.query(
        `SELECT sport, is_sport_folder FROM platform_play_folders WHERE id = $1`,
        [folderId]
      );
      if (f?.is_sport_folder && f.sport) resolvedSport = f.sport;
    }

    const { rows } = await pool.query(
      `INSERT INTO platform_plays
         (title, description, sport, play_data, thumbnail_url, tags, is_featured, sort_order, folder_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        title.trim(),
        description?.trim() || "",
        resolvedSport,
        playData || null,
        thumbnail || null,
        tags || [],
        isFeatured ?? false,
        sortOrder ?? 0,
        folderId || null,
        req.actor?.userId || null,
      ]
    );
    writeAudit(req, "play.create", { targetType: "platform_play", targetId: rows[0].id });
    res.status(201).json({ play: toPlatformPlayResponse(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/plays/:id — update a platform play
router.patch("/plays/:id", requireAdminOrStaff, requireSportScope("plays.sportScope", resolveSportForPlatformPlay), async (req, res, next) => {
  try {
    const { title, description, sport, playData, thumbnail, tags, isFeatured, sortOrder, folderId } = req.body;
    const actor = req.actor;

    // Load the play's creator so staff can edit their OWN plays without
    // needing the per-field permission.
    const { rows: existingRows } = await pool.query(
      `SELECT created_by FROM platform_plays WHERE id = $1`,
      [req.params.id]
    );
    if (!existingRows.length) return res.status(404).json({ error: "Play not found" });
    const createdBy = existingRows[0].created_by;
    const ownsResource = actorOwnsResource(actor, createdBy);

    if (title !== undefined && !ownsResource && !actorHasPerm(actor, "plays.rename")) {
      return res.status(403).json({ error: "Forbidden", missingPermission: "plays.rename" });
    }
    if (tags !== undefined && !ownsResource && !actorHasPerm(actor, "plays.editTags")) {
      return res.status(403).json({ error: "Forbidden", missingPermission: "plays.editTags" });
    }
    if ((description !== undefined || playData !== undefined || thumbnail !== undefined) && !ownsResource && !actorHasPerm(actor, "plays.editContent")) {
      return res.status(403).json({ error: "Forbidden", missingPermission: "plays.editContent" });
    }
    if (!actor?.isOwner && (sport !== undefined || isFeatured !== undefined || sortOrder !== undefined || folderId !== undefined)) {
      return res.status(403).json({ error: "Forbidden", ownerOnlyFields: ["sport", "isFeatured", "sortOrder", "folderId"] });
    }

    const setClauses = ["updated_at = now()"];
    const values = [];
    let idx = 1;

    if (title !== undefined) { setClauses.push(`title = $${idx++}`); values.push(title.trim()); }
    if (description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(description.trim()); }
    if (sport !== undefined) { setClauses.push(`sport = $${idx++}`); values.push(sport?.trim() || null); }
    if (playData !== undefined) {
      // Shift current play_data into previous_play_data before overwriting —
      // gives a one-step rollback in case of client-side corruption bugs.
      setClauses.push(`previous_play_data = play_data`);
      setClauses.push(`play_data = $${idx++}`);
      values.push(playData);
    }
    if (thumbnail !== undefined) { setClauses.push(`thumbnail_url = $${idx++}`); values.push(thumbnail || null); }
    if (tags !== undefined) { setClauses.push(`tags = $${idx++}`); values.push(tags); }
    if (isFeatured !== undefined) { setClauses.push(`is_featured = $${idx++}`); values.push(Boolean(isFeatured)); }
    if (sortOrder !== undefined) { setClauses.push(`sort_order = $${idx++}`); values.push(sortOrder); }
    if (folderId !== undefined) { setClauses.push(`folder_id = $${idx++}`); values.push(folderId || null); }

    if (setClauses.length === 1) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE platform_plays SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: "Play not found" });
    res.json({ play: toPlatformPlayResponse(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// POST /admin/plays/:id/restore — restore play_data from previous_play_data (one-step rollback)
router.post("/plays/:id/restore", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE platform_plays
         SET play_data = previous_play_data,
             previous_play_data = play_data,
             updated_at = now()
       WHERE id = $1
         AND previous_play_data IS NOT NULL
       RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Play not found or no previous version available" });
    }
    res.json({ play: toPlatformPlayResponse(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/plays/:id — delete a platform play
router.delete("/plays/:id", requireAdminOrStaff, async (req, res, next) => {
  try {
    const { rows: existingRows } = await pool.query(
      `SELECT created_by FROM platform_plays WHERE id = $1`,
      [req.params.id]
    );
    if (!existingRows.length) return res.status(404).json({ error: "Play not found" });
    const createdBy = existingRows[0].created_by;

    // Staff can delete a play they created. Deleting someone else's play
    // requires `plays.delete`. Owner can always delete (no Danger Mode).
    if (!req.actor.isOwner) {
      if (!actorOwnsResource(req.actor, createdBy) && !actorHasPerm(req.actor, "plays.delete")) {
        return res.status(403).json({ error: "Cannot delete plays you didn't create" });
      }
    }

    // Clear any page sections referencing this play before deleting
    const { rows: clearedSections } = await pool.query(
      `UPDATE page_sections SET play_id = NULL, updated_at = now()
       WHERE play_id = $1 RETURNING section_key, label`,
      [req.params.id]
    );
    await pool.query("DELETE FROM platform_plays WHERE id = $1", [req.params.id]);
    writeAudit(req, "play.delete", { targetType: "platform_play", targetId: req.params.id, metadata: { wasCreatedBy: createdBy } });
    res.json({ ok: true, clearedSections });
  } catch (err) {
    next(err);
  }
});

// POST /admin/plays/:id/duplicate — clone a platform play
router.post("/plays/:id/duplicate", requireAdminOrStaff, requirePerm("plays.add"), requireSportScope("plays.sportScope", resolveSportForPlatformPlay), async (req, res, next) => {
  try {
    const { rows: src } = await pool.query(
      "SELECT * FROM platform_plays WHERE id = $1",
      [req.params.id]
    );
    if (!src.length) return res.status(404).json({ error: "Play not found" });
    const s = src[0];
    const { rows } = await pool.query(
      `INSERT INTO platform_plays
         (title, description, sport, play_data, thumbnail_url, tags, is_featured, sort_order, folder_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        `${s.title} (Copy)`,
        s.description || "",
        s.sport || null,
        s.play_data || null,
        s.thumbnail_url || null,
        s.tags || [],
        false,
        s.sort_order ?? 0,
        s.folder_id || null,
      ]
    );
    res.status(201).json({ play: toPlatformPlayResponse(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// ── Platform play folders ────────────────────────────────────────────────────

// GET /admin/platform-folders — list all platform play folders
router.get("/platform-folders", requireAdminOrStaff, requirePerm("plays.viewFolders"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM platform_play_folders ORDER BY sort_order ASC, name ASC"
    );
    if (req.actor?.isOwner) {
      return res.json({ folders: rows.map(toPlatformFolderResponse) });
    }

    const folderMap = new Map(rows.map((row) => [row.id, row]));
    const visibleFolderIds = new Set();

    for (const row of rows) {
      if (row.is_sport_folder && row.sport && actorHasSportScope(req.actor, "plays.sportScope", row.sport)) {
        visibleFolderIds.add(row.id);
      }
    }

    const { rows: playRows } = await pool.query(
      `SELECT p.folder_id, p.sport, f.sport AS folder_sport
         FROM platform_plays p
         LEFT JOIN platform_play_folders f ON p.folder_id = f.id
        WHERE p.is_community_submitted = false
          AND p.id NOT IN (
            SELECT psp.play_id
            FROM playbook_section_plays psp
            JOIN playbook_sections ps ON ps.id = psp.section_id
            WHERE ps.is_default = false
          )`
    );

    for (const play of playRows) {
      const sport = play.folder_sport || play.sport || null;
      if (!sport || !actorHasSportScope(req.actor, "plays.sportScope", sport)) continue;
      let folderId = play.folder_id || null;
      while (folderId) {
        if (visibleFolderIds.has(folderId)) break;
        visibleFolderIds.add(folderId);
        folderId = folderMap.get(folderId)?.parent_id || null;
      }
    }

    const visibleRows = rows.filter((row) => visibleFolderIds.has(row.id));
    res.json({ folders: visibleRows.map(toPlatformFolderResponse) });
  } catch (err) {
    next(err);
  }
});

// POST /admin/platform-folders — create a platform play folder
router.post("/platform-folders", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { name, parentId, sortOrder } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });
    const { rows } = await pool.query(
      `INSERT INTO platform_play_folders (name, parent_id, sort_order)
       VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), parentId || null, sortOrder ?? 0]
    );
    res.status(201).json({ folder: toPlatformFolderResponse(rows[0]) });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A folder with that name already exists here" });
    }
    next(err);
  }
});

// PATCH /admin/platform-folders/:id — rename or reorder a folder
router.patch("/platform-folders/:id", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { name, sortOrder, parentId } = req.body;
    const setClauses = ["updated_at = now()"];
    const values = [];
    let idx = 1;
    if (name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(name.trim()); }
    if (sortOrder !== undefined) { setClauses.push(`sort_order = $${idx++}`); values.push(sortOrder); }
    if (parentId !== undefined) { setClauses.push(`parent_id = $${idx++}`); values.push(parentId || null); }
    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE platform_play_folders SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: "Folder not found" });
    res.json({ folder: toPlatformFolderResponse(rows[0]) });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A folder with that name already exists here" });
    }
    next(err);
  }
});

// DELETE /admin/platform-folders/:id — delete a folder (plays become un-foldered) (requires Danger Mode)
router.delete("/platform-folders/:id", requireElevated, async (req, res, next) => {
  try {
    const { rows: [folder] } = await pool.query(
      `SELECT is_sport_folder FROM platform_play_folders WHERE id = $1`,
      [req.params.id]
    );
    if (!folder) return res.status(404).json({ error: "Folder not found." });
    if (folder.is_sport_folder) return res.status(403).json({ error: "Sport folders cannot be deleted." });
    await pool.query("DELETE FROM platform_play_folders WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Page sections ────────────────────────────────────────────────────────────

/**
 * GET /admin/page-sections
 * Returns all page sections with their assigned play (if any).
 */
router.get("/page-sections", requireAdminOrStaff, requirePerm("pageSections.manage"), async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ps.section_key, ps.label, ps.page, ps.play_id, ps.is_priority, ps.updated_at,
              pp.title AS play_title, pp.thumbnail_url AS play_thumbnail, pp.sport AS play_sport
       FROM page_sections ps
       LEFT JOIN platform_plays pp ON pp.id = ps.play_id
       ORDER BY ps.page ASC, ps.section_key ASC`
    );
    res.json({
      sections: rows.map((r) => ({
        sectionKey: r.section_key,
        label: r.label,
        page: r.page,
        playId: r.play_id || null,
        playTitle: r.play_title || null,
        playThumbnail: r.play_thumbnail || null,
        playSport: r.play_sport || null,
        isPriority: r.is_priority ?? false,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/page-sections/:key
 * Assigns or unassigns a play to a page section, and/or toggles priority flag.
 * Body: { playId?: string | null, isPriority?: boolean }
 */
router.patch("/page-sections/:key", requireAdminOrStaff, requirePerm("pageSections.manage"), async (req, res, next) => {
  try {
    const { playId, isPriority } = req.body;
    const setClauses = [];
    const params = [];
    let idx = 1;

    if ("playId" in req.body) {
      setClauses.push(`play_id = $${idx++}`);
      params.push(playId || null);
    }
    if ("isPriority" in req.body) {
      setClauses.push(`is_priority = $${idx++}`);
      params.push(!!isPriority);
    }
    if (setClauses.length === 0) return res.status(400).json({ error: "Nothing to update" });
    setClauses.push(`updated_at = now()`);
    params.push(req.params.key);

    const { rows } = await pool.query(
      `UPDATE page_sections SET ${setClauses.join(", ")} WHERE section_key = $${idx} RETURNING *`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: "Section not found" });
    res.json({
      section: {
        sectionKey: rows[0].section_key,
        playId: rows[0].play_id || null,
        isPriority: rows[0].is_priority ?? false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Playbook sections ────────────────────────────────────────────────────────

/**
 * GET /admin/playbook-sections
 * Returns all playbook sections with their play count.
 */
router.get("/playbook-sections", requireAdminOrStaff, requirePerm("playbooks.view"), async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ps.*, COUNT(psp.play_id)::int AS play_count
       FROM playbook_sections ps
       LEFT JOIN playbook_section_plays psp ON psp.section_id = ps.id
       GROUP BY ps.id
       ORDER BY ps.sort_order ASC, ps.name ASC`
    );
    res.json({
      sections: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        sport: r.sport || null,
        sortOrder: r.sort_order,
        isPublished: r.is_published,
        isDefault: r.is_default,
        playCount: r.play_count,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/playbook-sections
 * Create a new playbook section.
 * Body: { name, description?, sport?, sortOrder? }
 */
router.post("/playbook-sections", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { name, description, sport, sortOrder } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });
    const { rows } = await pool.query(
      `INSERT INTO playbook_sections (name, description, sport, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), description?.trim() || "", sport || null, sortOrder ?? 0]
    );
    const r = rows[0];
    res.status(201).json({
      section: {
        id: r.id,
        name: r.name,
        description: r.description,
        sport: r.sport || null,
        sortOrder: r.sort_order,
        isPublished: r.is_published,
        isDefault: r.is_default,
        playCount: 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/playbook-sections/:id
 * Update a playbook section's name, description, sport, sort_order, or is_published.
 * Body: { name?, description?, sport?, sortOrder?, isPublished? }
 */
router.patch("/playbook-sections/:id", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { name, description, sport, sortOrder, isPublished } = req.body;
    const setClauses = ["updated_at = now()"];
    const values = [];
    let idx = 1;
    if (name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(name.trim()); }
    if (description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(description.trim()); }
    if (sport !== undefined) { setClauses.push(`sport = $${idx++}`); values.push(sport || null); }
    if (sortOrder !== undefined) { setClauses.push(`sort_order = $${idx++}`); values.push(sortOrder); }
    if (isPublished !== undefined) { setClauses.push(`is_published = $${idx++}`); values.push(!!isPublished); }
    // is_default is system-managed — never allow API callers to change it
    if (setClauses.length === 1) return res.status(400).json({ error: "Nothing to update" });
    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE playbook_sections SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: "Section not found" });
    const r = rows[0];
    const { rows: countRows } = await pool.query(
      "SELECT COUNT(*)::int AS play_count FROM playbook_section_plays WHERE section_id = $1",
      [r.id]
    );
    res.json({
      section: {
        id: r.id,
        name: r.name,
        description: r.description,
        sport: r.sport || null,
        sortOrder: r.sort_order,
        isPublished: r.is_published,
        isDefault: r.is_default,
        playCount: countRows[0].play_count,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/playbook-sections/:id
 * Delete a playbook section and all its play associations (cascade).
 * Default sections (is_default = true) cannot be deleted.
 */
router.delete("/playbook-sections/:id", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT is_default FROM playbook_sections WHERE id = $1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Section not found" });
    if (rows[0].is_default) {
      return res.status(403).json({ error: "Default playbook sections cannot be deleted." });
    }
    await pool.query("DELETE FROM playbook_sections WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/playbook-sections/:id/plays
 * Returns all plays in a section, ordered by sort_order.
 */
router.get("/playbook-sections/:id/plays", requireAdminOrStaff, requirePerm("playbooks.view"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT pp.*, psp.sort_order AS section_sort_order, psp.added_at
       FROM platform_plays pp
       JOIN playbook_section_plays psp ON psp.play_id = pp.id
       WHERE psp.section_id = $1
       ORDER BY psp.sort_order ASC, psp.added_at ASC`,
      [req.params.id]
    );
    res.json({
      plays: rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description || "",
        sport: r.sport || null,
        thumbnail: r.thumbnail_url || null,
        tags: r.tags || [],
        sortOrder: r.section_sort_order,
        addedAt: r.added_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/playbook-sections/:id/plays
 * Add a platform play to a playbook section.
 * Body: { playId, sortOrder? }
 */
router.post("/playbook-sections/:id/plays", requireAdminOrStaff, requirePerm("playbooks.addPlays"), async (req, res, next) => {
  try {
    const { playId, sortOrder } = req.body;
    if (!playId) return res.status(400).json({ error: "playId is required" });
    // Verify play exists
    const { rows: playRows } = await pool.query(
      "SELECT id FROM platform_plays WHERE id = $1",
      [playId]
    );
    if (!playRows.length) return res.status(404).json({ error: "Play not found" });
    // Default sort_order to end of list
    let order = sortOrder;
    if (order === undefined) {
      const { rows: maxRows } = await pool.query(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM playbook_section_plays WHERE section_id = $1",
        [req.params.id]
      );
      order = maxRows[0].next;
    }
    await pool.query(
      `INSERT INTO playbook_section_plays (section_id, play_id, sort_order)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [req.params.id, playId, order]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/playbook-sections/:id/plays/:playId
 * Remove a platform play from a playbook section.
 */
router.delete("/playbook-sections/:id/plays/:playId", requireAdminOrStaff, requirePerm("playbooks.addPlays"), async (req, res, next) => {
  try {
    await pool.query(
      "DELETE FROM playbook_section_plays WHERE section_id = $1 AND play_id = $2",
      [req.params.id, req.params.playId]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/playbook-sections/:id/plays/:playId
 * Reorder a play within a playbook section.
 * Body: { sortOrder }
 */
router.patch("/playbook-sections/:id/plays/:playId", requireAdminOrStaff, requirePerm("playbooks.addPlays"), async (req, res, next) => {
  try {
    const { sortOrder } = req.body;
    if (sortOrder === undefined) return res.status(400).json({ error: "sortOrder is required" });
    const { rowCount } = await pool.query(
      "UPDATE playbook_section_plays SET sort_order = $1 WHERE section_id = $2 AND play_id = $3",
      [sortOrder, req.params.id, req.params.playId]
    );
    if (!rowCount) return res.status(404).json({ error: "Play not in section" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Cleanup helper — deletes any user with `onboarded_at IS NULL` that is
 * older than 24 hours, and emails them so they aren't silently stranded.
 * Exported for use by the auto-cleanup scheduler.
 *
 * @returns {Promise<{ok: true, cleaned: number}>}
 */
export async function cleanupStaleAccounts() {
  const { rows } = await pool.query(
    "SELECT id FROM users WHERE onboarded_at IS NULL AND created_at < now() - interval '24 hours'"
  );
  for (const row of rows) {
    try {
      await deleteUserCascade(row.id, "stale");
    } catch (err) {
      console.error(`Failed to cleanup user ${row.id}:`, err.message);
    }
  }
  return { ok: true, cleaned: rows.length };
}

/**
 * Hard-deletes teams that have been soft-deleted for more than 30 days.
 * Called on server startup and every 24 hours.
 * @returns {Promise<{ok: boolean, cleaned: number}>}
 */
export async function cleanupDeletedTeams() {
  const { rows } = await pool.query(
    "SELECT id FROM teams WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days'"
  );
  let cleaned = 0;
  for (const row of rows) {
    try {
      await pool.query("DELETE FROM teams WHERE id = $1", [row.id]);
      cleaned++;
    } catch (err) {
      console.error(`Failed to hard-delete team ${row.id}:`, err.message);
    }
  }
  return { ok: true, cleaned };
}

// GET /admin/users/:id/deleted-teams — list soft-deleted teams owned by a user
router.get("/users/:id/deleted-teams", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, sport, season_year, deleted_at, created_at
       FROM teams
       WHERE owner_user_id = $1 AND deleted_at IS NOT NULL
       ORDER BY deleted_at DESC`,
      [req.params.id]
    );
    res.json({ deletedTeams: rows });
  } catch (err) {
    next(err);
  }
});

// POST /admin/teams/:teamId/restore — restore a soft-deleted team
router.post("/teams/:teamId/restore", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE teams SET deleted_at = NULL, updated_at = now()
       WHERE id = $1 AND deleted_at IS NOT NULL
       RETURNING id, name`,
      [req.params.teamId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Team not found or not deleted" });
    }
    res.json({ ok: true, team: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/users/:id/beta-tester — toggle beta tester status for a user
router.patch("/users/:id/beta-tester", requireAdminOrStaff, requirePerm("users.editStatus"), async (req, res, next) => {
  try {
    const { isBetaTester } = req.body;
    if (typeof isBetaTester !== "boolean") {
      return res.status(400).json({ error: "isBetaTester must be a boolean" });
    }
    const { rows } = await pool.query(
      `UPDATE users SET is_beta_tester = $1, updated_at = now() WHERE id = $2
       RETURNING id, is_beta_tester`,
      [isBetaTester, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /admin/user-issues — list all user-reported issues
router.get("/user-issues", requireAdminOrStaff, requirePerm("issues.view"), redactByPerm({
  user_email: { perm: "users.viewEmails", mask: "email" },
  user_name: { perm: "users.viewUsernames", mask: "username" },
}), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const { rows } = await pool.query(
      `SELECT id, user_id, user_name, user_email, title, description, status, created_at
       FROM user_issues
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const { rows: countRows } = await pool.query("SELECT COUNT(*) FROM user_issues");
    res.json({ issues: rows, total: parseInt(countRows[0].count) });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/user-issues/:id — update status of a reported issue
router.patch("/user-issues/:id", requireAdminOrStaff, requirePerm("issues.resolve"), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["open", "in_progress", "resolved"].includes(status)) {
      return res.status(400).json({ error: "status must be open, in_progress, or resolved" });
    }
    const { rows } = await pool.query(
      `UPDATE user_issues SET status = $1 WHERE id = $2 RETURNING id, status`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Issue not found" });
    res.json({ issue: rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/user-issues/:id — delete a single reported issue
router.delete("/user-issues/:id", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM user_issues WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Admin Prefabs ────────────────────────────────────────────────────────────

/**
 * GET /admin/prefabs
 * Returns all admin-saved prefabs (cross-device, all sports).
 */
router.get("/prefabs", requireAdminOrStaff, requirePerm("prefabs.manage"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, label, prefab_data, created_at
         FROM admin_prefabs
        ORDER BY created_at ASC`
    );
    const prefabs = rows.map((r) => ({
      ...r.prefab_data,
      id: r.id,
      label: r.label,
      createdAt: r.created_at,
    }));
    res.json({ prefabs });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/prefabs
 * Save a new admin prefab.
 * Body: { label, prefab_data }
 */
router.post("/prefabs", requireAdminOrStaff, requirePerm("prefabs.manage"), async (req, res, next) => {
  const { label, prefab_data } = req.body;
  if (!label || !prefab_data) {
    return res.status(400).json({ error: "label and prefab_data are required" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO admin_prefabs (label, prefab_data, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, label, prefab_data, created_at, created_by`,
      [label, prefab_data, req.actor?.userId || null]
    );
    const row = rows[0];
    writeAudit(req, "adminPrefab.create", { targetType: "admin_prefab", targetId: row.id });
    res.status(201).json({
      prefab: {
        ...row.prefab_data,
        id: row.id,
        label: row.label,
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/prefabs/:id
 * Staff can delete admin prefabs they created without `prefabs.manage`;
 * deleting someone else's still requires the permission.
 */
router.delete("/prefabs/:id", requireAdminOrStaff, async (req, res, next) => {
  try {
    const { rows: existingRows } = await pool.query(
      `SELECT created_by FROM admin_prefabs WHERE id = $1`,
      [req.params.id]
    );
    if (!existingRows.length) return res.status(404).json({ error: "Prefab not found" });
    const createdBy = existingRows[0].created_by;

    if (!actorCanModify(req.actor, createdBy, "prefabs.manage")) {
      return res.status(403).json({ error: "Cannot delete prefabs you didn't create" });
    }

    await pool.query(`DELETE FROM admin_prefabs WHERE id = $1`, [req.params.id]);
    writeAudit(req, "adminPrefab.delete", { targetType: "admin_prefab", targetId: req.params.id, metadata: { wasCreatedBy: createdBy } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Sport Presets ─────────────────────────────────────────────────────────────

/** Serialize a sport_presets DB row to the API response shape. */
function toSportPresetResponse(row) {
  return {
    id: row.id,
    sport: row.sport,
    name: row.name,
    playData: row.play_data,
    sortOrder: row.sort_order,
    isHidden: row.is_hidden ?? true,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * List all sport presets grouped by sport (for the presets tab overview).
 * @route GET /admin/sport-presets
 */
router.get("/sport-presets", requireAdminOrStaff, requireAnyPerm(["presets.create", "presets.edit"]), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM sport_presets ORDER BY sport, sort_order ASC, created_at ASC"
    );
    const visibleRows = filterRowsBySportScope(req.actor, "presets.sportScope", rows, (row) => row.sport || null);
    res.json({ presets: visibleRows.map(toSportPresetResponse) });
  } catch (err) {
    next(err);
  }
});

/**
 * List all presets for a specific sport (case-insensitive sport match).
 * @route GET /admin/sport-presets/:sport
 */
router.get("/sport-presets/:sport", requireAdminOrStaff, requireAnyPerm(["presets.create", "presets.edit"]), requireSportScope("presets.sportScope"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM sport_presets WHERE LOWER(sport) = LOWER($1) ORDER BY sort_order ASC, created_at ASC",
      [req.params.sport]
    );
    res.json({ presets: rows.map(toSportPresetResponse) });
  } catch (err) {
    next(err);
  }
});

/**
 * Fetch a single sport preset by ID (case-insensitive sport match).
 * @route GET /admin/sport-presets/:sport/:id
 */
router.get("/sport-presets/:sport/:id", requireAdminOrStaff, requireAnyPerm(["presets.create", "presets.edit"]), requireSportScope("presets.sportScope"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM sport_presets WHERE id = $1 AND LOWER(sport) = LOWER($2)",
      [req.params.id, req.params.sport]
    );
    if (!rows.length) return res.status(404).json({ error: "Preset not found" });
    res.json({ preset: toSportPresetResponse(rows[0]) });
  } catch (err) {
    next(err);
  }
});

/**
 * Reorder presets for a sport by assigning sort_order = index of each ID.
 * Body: { ids: string[] } — full ordered list of preset UUIDs for the sport.
 * @route POST /admin/sport-presets/:sport/reorder
 */
router.post("/sport-presets/:sport/reorder", requireAdminOrStaff, requirePerm("presets.edit"), requireSportScope("presets.sportScope"), async (req, res, next) => {
  const { sport } = req.params;
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be an array" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < ids.length; i++) {
      await client.query(
        "UPDATE sport_presets SET sort_order = $1, updated_at = now() WHERE id = $2 AND LOWER(sport) = LOWER($3)",
        [i, ids[i], sport]
      );
    }
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Create a new preset for a sport.
 * @route POST /admin/sport-presets/:sport
 */
router.post("/sport-presets/:sport", requireAdminOrStaff, requirePerm("presets.create"), requireSportScope("presets.sportScope"), async (req, res, next) => {
  try {
    const { sport } = req.params;
    const { name, playData } = req.body;
    if (!playData) return res.status(400).json({ error: "playData is required" });
    const { rows } = await pool.query(
      `INSERT INTO sport_presets (sport, name, play_data, sort_order, created_by)
       VALUES ($1, $2, $3, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM sport_presets WHERE sport = $1), $4)
       RETURNING *`,
      [sport, (name || "Preset").trim(), JSON.stringify(playData), req.actor?.userId || null]
    );
    writeAudit(req, "preset.create", { targetType: "sport_preset", targetId: rows[0].id });
    res.status(201).json({ preset: toSportPresetResponse(rows[0]) });
  } catch (err) {
    next(err);
  }
});

/**
 * Update an existing preset (play data and/or name).
 * @route PATCH /admin/sport-presets/:sport/:id
 */
router.patch("/sport-presets/:sport/:id", requireAdminOrStaff, requireSportScope("presets.sportScope"), async (req, res, next) => {
  try {
    const { sport, id } = req.params;
    const { name, playData, isHidden } = req.body;

    // Ownership-aware: staff editing their own preset doesn't need presets.edit.
    const { rows: existingRows } = await pool.query(
      `SELECT created_by FROM sport_presets WHERE id = $1 AND LOWER(sport) = LOWER($2)`,
      [id, sport]
    );
    if (!existingRows.length) return res.status(404).json({ error: "Preset not found" });
    if (!actorCanModify(req.actor, existingRows[0].created_by, "presets.edit")) {
      return res.status(403).json({ error: "Forbidden", missingPermission: "presets.edit" });
    }

    const sets = [];
    const vals = [];
    if (name !== undefined) { sets.push(`name = $${vals.length + 1}`); vals.push(name.trim()); }
    if (playData !== undefined) { sets.push(`play_data = $${vals.length + 1}`); vals.push(JSON.stringify(playData)); }
    if (isHidden !== undefined) { sets.push(`is_hidden = $${vals.length + 1}`); vals.push(Boolean(isHidden)); }
    if (!sets.length) return res.status(400).json({ error: "Nothing to update" });
    sets.push("updated_at = now()");
    vals.push(id, sport);
    const { rows } = await pool.query(
      `UPDATE sport_presets SET ${sets.join(", ")} WHERE id = $${vals.length - 1} AND LOWER(sport) = LOWER($${vals.length}) RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: "Preset not found" });
    writeAudit(req, "preset.update", { targetType: "sport_preset", targetId: id });
    res.json({ preset: toSportPresetResponse(rows[0]) });
  } catch (err) {
    next(err);
  }
});

/**
 * Delete a sport preset. Requires elevated (Danger Mode) session.
 * @route DELETE /admin/sport-presets/:sport/:id
 */
router.delete("/sport-presets/:sport/:id", requireAdminOrStaff, requireSportScope("presets.sportScope"), async (req, res, next) => {
  try {
    const { sport, id } = req.params;

    const { rows: existingRows } = await pool.query(
      `SELECT created_by FROM sport_presets WHERE id = $1 AND LOWER(sport) = LOWER($2)`,
      [id, sport]
    );
    if (!existingRows.length) return res.status(404).json({ error: "Preset not found" });
    const createdBy = existingRows[0].created_by;

    if (!req.actor.isOwner) {
      if (!actorOwnsResource(req.actor, createdBy) && !actorHasPerm(req.actor, "presets.edit")) {
        return res.status(403).json({ error: "Cannot delete presets you didn't create" });
      }
    } else if (req.actor.authMode === "legacy_admin" && !isLegacyAdminElevated(req)) {
      return res.status(403).json({ error: "Danger Mode required. Re-authenticate to perform this action." });
    }

    await pool.query(
      "DELETE FROM sport_presets WHERE id = $1 AND LOWER(sport) = LOWER($2)",
      [id, sport]
    );
    writeAudit(req, "preset.delete", { targetType: "sport_preset", targetId: id, metadata: { wasCreatedBy: createdBy } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Sport Prefab Presets ──────────────────────────────────────────────────────
// Admin-curated reusable player groupings per sport. Distinct from sport_presets
// (which seed a full starting canvas). Published rows are visible to users via
// GET /sport-prefab-presets/:sport and surface inside the Slate Prefabs panel.

/** Serialize a sport_prefab_presets DB row to the API response shape. */
function toSportPrefabPresetResponse(row) {
  return {
    id: row.id,
    sport: row.sport,
    name: row.name,
    prefabData: row.prefab_data,
    sortOrder: row.sort_order,
    isHidden: row.is_hidden ?? true,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * List all sport prefab presets across every sport (for the overview cards).
 * @route GET /admin/sport-prefab-presets
 */
router.get("/sport-prefab-presets", requireAdminOrStaff, requirePerm("prefabs.manage"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM sport_prefab_presets ORDER BY sport, sort_order ASC, created_at ASC"
    );
    const visibleRows = filterRowsBySportScope(req.actor, "presets.sportScope", rows, (row) => row.sport || null);
    res.json({ presets: visibleRows.map(toSportPrefabPresetResponse) });
  } catch (err) {
    next(err);
  }
});

/**
 * List all prefab presets for a specific sport (case-insensitive sport match).
 * @route GET /admin/sport-prefab-presets/:sport
 */
router.get("/sport-prefab-presets/:sport", requireAdminOrStaff, requirePerm("prefabs.manage"), requireSportScope("presets.sportScope"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM sport_prefab_presets WHERE LOWER(sport) = LOWER($1) ORDER BY sort_order ASC, created_at ASC",
      [req.params.sport]
    );
    res.json({ presets: rows.map(toSportPrefabPresetResponse) });
  } catch (err) {
    next(err);
  }
});

/**
 * Fetch a single prefab preset by ID (case-insensitive sport match).
 * @route GET /admin/sport-prefab-presets/:sport/:id
 */
router.get("/sport-prefab-presets/:sport/:id", requireAdminOrStaff, requirePerm("prefabs.manage"), requireSportScope("presets.sportScope"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM sport_prefab_presets WHERE id = $1 AND LOWER(sport) = LOWER($2)",
      [req.params.id, req.params.sport]
    );
    if (!rows.length) return res.status(404).json({ error: "Prefab preset not found" });
    res.json({ preset: toSportPrefabPresetResponse(rows[0]) });
  } catch (err) {
    next(err);
  }
});

/**
 * Reorder prefab presets for a sport by assigning sort_order = index of each ID.
 * Body: { ids: string[] } — full ordered list of preset UUIDs for the sport.
 * @route POST /admin/sport-prefab-presets/:sport/reorder
 */
router.post("/sport-prefab-presets/:sport/reorder", requireAdminOrStaff, requirePerm("prefabs.manage"), requireSportScope("presets.sportScope"), async (req, res, next) => {
  const { sport } = req.params;
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be an array" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < ids.length; i++) {
      await client.query(
        "UPDATE sport_prefab_presets SET sort_order = $1, updated_at = now() WHERE id = $2 AND LOWER(sport) = LOWER($3)",
        [i, ids[i], sport]
      );
    }
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Create a new prefab preset for a sport.
 * @route POST /admin/sport-prefab-presets/:sport
 */
router.post("/sport-prefab-presets/:sport", requireAdminOrStaff, requirePerm("prefabs.manage"), requireSportScope("presets.sportScope"), async (req, res, next) => {
  try {
    const { sport } = req.params;
    const { name, prefabData } = req.body;
    if (!prefabData || typeof prefabData !== "object") {
      return res.status(400).json({ error: "prefabData is required" });
    }
    const players = Array.isArray(prefabData.players) ? prefabData.players : [];
    const objects = Array.isArray(prefabData.objects) ? prefabData.objects : [];
    if (players.length === 0 && objects.length === 0 && !prefabData.ball) {
      return res.status(400).json({ error: "prefabData must include at least one player, ball, or cone" });
    }
    const { rows } = await pool.query(
      `INSERT INTO sport_prefab_presets (sport, name, prefab_data, sort_order, created_by)
       VALUES ($1, $2, $3, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM sport_prefab_presets WHERE sport = $1), $4)
       RETURNING *`,
      [sport, (name || "Prefab").trim(), JSON.stringify(prefabData), req.actor?.userId || null]
    );
    writeAudit(req, "prefabPreset.create", { targetType: "sport_prefab_preset", targetId: rows[0].id });
    res.status(201).json({ preset: toSportPrefabPresetResponse(rows[0]) });
  } catch (err) {
    next(err);
  }
});

/**
 * Update an existing prefab preset (name, prefab data, and/or hidden state).
 * Staff can edit prefab presets they created without needing `prefabs.manage`;
 * editing someone else's requires the permission.
 * @route PATCH /admin/sport-prefab-presets/:sport/:id
 */
router.patch("/sport-prefab-presets/:sport/:id", requireAdminOrStaff, requireSportScope("presets.sportScope"), async (req, res, next) => {
  try {
    const { sport, id } = req.params;
    const { name, prefabData, isHidden } = req.body;

    const { rows: existingRows } = await pool.query(
      `SELECT created_by FROM sport_prefab_presets WHERE id = $1 AND LOWER(sport) = LOWER($2)`,
      [id, sport]
    );
    if (!existingRows.length) return res.status(404).json({ error: "Prefab preset not found" });
    if (!actorCanModify(req.actor, existingRows[0].created_by, "prefabs.manage")) {
      return res.status(403).json({ error: "Forbidden", missingPermission: "prefabs.manage" });
    }

    const sets = [];
    const vals = [];
    if (name !== undefined) { sets.push(`name = $${vals.length + 1}`); vals.push(String(name).trim()); }
    if (prefabData !== undefined) {
      if (!prefabData || typeof prefabData !== "object") {
        return res.status(400).json({ error: "prefabData must be an object" });
      }
      const players = Array.isArray(prefabData.players) ? prefabData.players : [];
      const objects = Array.isArray(prefabData.objects) ? prefabData.objects : [];
      if (players.length === 0 && objects.length === 0 && !prefabData.ball) {
        return res.status(400).json({ error: "prefabData must include at least one player, ball, or cone" });
      }
      sets.push(`prefab_data = $${vals.length + 1}`);
      vals.push(JSON.stringify(prefabData));
    }
    if (isHidden !== undefined) { sets.push(`is_hidden = $${vals.length + 1}`); vals.push(Boolean(isHidden)); }
    if (!sets.length) return res.status(400).json({ error: "Nothing to update" });
    sets.push("updated_at = now()");
    vals.push(id, sport);
    const { rows } = await pool.query(
      `UPDATE sport_prefab_presets SET ${sets.join(", ")} WHERE id = $${vals.length - 1} AND LOWER(sport) = LOWER($${vals.length}) RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: "Prefab preset not found" });
    res.json({ preset: toSportPrefabPresetResponse(rows[0]) });
  } catch (err) {
    next(err);
  }
});

/**
 * Delete a sport prefab preset. Requires elevated (Danger Mode) session.
 * @route DELETE /admin/sport-prefab-presets/:sport/:id
 */
router.delete("/sport-prefab-presets/:sport/:id", requireAdminOrStaff, requireSportScope("presets.sportScope"), async (req, res, next) => {
  try {
    const { sport, id } = req.params;

    const { rows: existingRows } = await pool.query(
      `SELECT created_by FROM sport_prefab_presets WHERE id = $1 AND LOWER(sport) = LOWER($2)`,
      [id, sport]
    );
    if (!existingRows.length) return res.status(404).json({ error: "Prefab preset not found" });
    const createdBy = existingRows[0].created_by;

    if (!req.actor.isOwner) {
      if (!actorOwnsResource(req.actor, createdBy) && !actorHasPerm(req.actor, "prefabs.manage")) {
        return res.status(403).json({ error: "Cannot delete prefab presets you didn't create" });
      }
    } else if (req.actor.authMode === "legacy_admin" && !isLegacyAdminElevated(req)) {
      return res.status(403).json({ error: "Danger Mode required. Re-authenticate to perform this action." });
    }

    await pool.query(
      "DELETE FROM sport_prefab_presets WHERE id = $1 AND LOWER(sport) = LOWER($2)",
      [id, sport]
    );
    writeAudit(req, "prefabPreset.delete", { targetType: "sport_prefab_preset", targetId: id, metadata: { wasCreatedBy: createdBy } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Staff Admin Management (owner-only) ────────────────────────────────────────

/**
 * GET /admin/staff-roles
 * List reusable staff roles with lightweight usage counts.
 */
router.get("/staff-roles", requireOwnerOrLegacyAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         sar.id,
         sar.name,
         sar.description,
         sar.permissions,
         sar.created_at,
         sar.updated_at,
         (
           SELECT COUNT(*)
             FROM staff_admins sa
            WHERE sa.role_id = sar.id
              AND sa.revoked_at IS NULL
         ) AS active_staff_count,
         (
           SELECT COUNT(*)
             FROM staff_admin_invites sai
            WHERE sai.role_id = sar.id
              AND sai.accepted_at IS NULL
         ) AS pending_invite_count
        FROM staff_admin_roles sar
       ORDER BY LOWER(sar.name) ASC`
    );
    res.json({
      roles: rows.map((row) => ({
        ...buildStaffRolePayload(row),
        activeStaffCount: Number(row.active_staff_count || 0),
        pendingInviteCount: Number(row.pending_invite_count || 0),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/staff-roles
 * Body: { name, description?, permissions }
 */
router.post("/staff-roles", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { name, description, permissions } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });
    if (permissions !== undefined && !isPermissionObject(permissions)) {
      return res.status(400).json({ error: "permissions must be an object" });
    }
    const { rows } = await pool.query(
      `INSERT INTO staff_admin_roles (name, description, permissions, updated_at)
       VALUES ($1, $2, $3, now())
       RETURNING id, name, description, permissions, created_at, updated_at`,
      [name.trim(), description?.trim() || "", normalizePermissionObject(permissions)]
    );
    writeAudit(req, "staff.role.create", {
      targetType: "staff_role",
      targetId: rows[0].id,
      metadata: { name: rows[0].name },
    });
    res.status(201).json({ role: buildStaffRolePayload(rows[0]) });
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "A staff role with that name already exists" });
    }
    next(err);
  }
});

/**
 * PATCH /admin/staff-roles/:id
 * Body: { name?, description?, permissions? }
 */
router.patch("/staff-roles/:id", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const existing = await loadStaffRole(req.params.id);
    if (!existing) return res.status(404).json({ error: "Staff role not found" });
    const body = req.body || {};
    if (body.permissions !== undefined && !isPermissionObject(body.permissions)) {
      return res.status(400).json({ error: "permissions must be an object" });
    }
    const nextName = Object.prototype.hasOwnProperty.call(body, "name")
      ? body.name?.trim()
      : existing.name;
    if (!nextName) return res.status(400).json({ error: "name is required" });
    const nextDescription = Object.prototype.hasOwnProperty.call(body, "description")
      ? body.description?.trim() || ""
      : existing.description || "";
    const nextPermissions = Object.prototype.hasOwnProperty.call(body, "permissions")
      ? normalizePermissionObject(body.permissions)
      : normalizePermissionObject(existing.permissions);
    const { rows } = await pool.query(
      `UPDATE staff_admin_roles
          SET name = $1,
              description = $2,
              permissions = $3,
              updated_at = now()
        WHERE id = $4
      RETURNING id, name, description, permissions, created_at, updated_at`,
      [nextName, nextDescription, nextPermissions, req.params.id]
    );
    writeAudit(req, "staff.role.update", {
      targetType: "staff_role",
      targetId: req.params.id,
      metadata: { name: nextName },
    });
    res.json({ role: buildStaffRolePayload(rows[0]) });
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "A staff role with that name already exists" });
    }
    next(err);
  }
});

/**
 * DELETE /admin/staff-roles/:id
 * Roles can only be deleted when nothing active still references them.
 */
router.delete("/staff-roles/:id", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const [{ rows: activeStaffRows }, { rows: pendingInviteRows }] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS count
           FROM staff_admins
          WHERE role_id = $1 AND revoked_at IS NULL`,
        [req.params.id]
      ),
      pool.query(
        `SELECT COUNT(*) AS count
           FROM staff_admin_invites
          WHERE role_id = $1 AND accepted_at IS NULL`,
        [req.params.id]
      ),
    ]);
    const activeStaffCount = Number(activeStaffRows[0]?.count || 0);
    const pendingInviteCount = Number(pendingInviteRows[0]?.count || 0);
    if (activeStaffCount || pendingInviteCount) {
      return res.status(409).json({
        error: "Remove this role from active staff and pending invites before deleting it",
        activeStaffCount,
        pendingInviteCount,
      });
    }
    const { rowCount } = await pool.query(
      `DELETE FROM staff_admin_roles WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Staff role not found" });
    writeAudit(req, "staff.role.delete", { targetType: "staff_role", targetId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/staff-invites
 * Body: { email, roleId?, permissions?, expiresInDays? }
 * Creates an invite. Email is sent to the recipient with the accept-invite URL.
 */
router.post("/staff-invites", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { email, roleId, permissions, expiresInDays } = req.body || {};
    if (!email?.trim()) return res.status(400).json({ error: "email is required" });
    if (permissions !== undefined && !isPermissionObject(permissions)) {
      return res.status(400).json({ error: "permissions must be an object" });
    }
    const lower = email.trim().toLowerCase();
    const token = crypto.randomBytes(32).toString("hex");
    const days = Math.max(1, Math.min(30, Number(expiresInDays) || 7));
    const expiresAt = new Date(Date.now() + days * 86_400_000);
    const inviterId = req.actor?.userId || null;
    const role = await requireExistingStaffRole(roleId || null);
    const permissionOverrides = normalizePermissionObject(permissions);

    const { rows } = await pool.query(
      `INSERT INTO staff_admin_invites (email, role_id, permissions, token, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role_id, permissions, token, created_by, created_at, expires_at`,
      [lower, role?.id || null, permissionOverrides, token, inviterId, expiresAt]
    );
    const effectivePermissions = mergeStaffPermissions(role?.permissions, permissionOverrides);

    const frontendBase = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
    const inviteUrl = `${frontendBase.replace(/\/$/, "")}/staff/accept-invite?token=${token}`;
    // Best-effort: don't fail the request if email send fails — return the URL so the owner can paste manually
    let emailSent = false;
    let emailError = null;
    try {
      const { sendStaffAdminInviteEmail } = await import("../lib/email.js");
      await sendStaffAdminInviteEmail({
        toEmail: lower,
        inviteUrl,
        ownerName: "Coachable",
        permissionsSummary: summarizePermissions(effectivePermissions, role?.name || null),
      });
      emailSent = true;
    } catch (err) {
      emailError = err.message;
    }

    writeAudit(req, "staff.invite.create", {
      targetType: "staff_invite",
      targetId: rows[0].id,
      metadata: { email: lower, roleId: role?.id || null, roleName: role?.name || null },
    });
    res.status(201).json({
      invite: {
        ...rows[0],
        role: buildStaffRolePayload(role),
        permissionOverrides,
        permissions: effectivePermissions,
      },
      inviteUrl,
      emailSent,
      emailError,
    });
  } catch (err) {
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /admin/staff-invites
 * List pending (not-yet-accepted) staff invites.
 */
router.get("/staff-invites", requireOwnerOrLegacyAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         sai.id,
         sai.email,
         sai.role_id,
         sai.permissions,
         sai.created_by,
         sai.created_at,
         sai.expires_at,
         sai.accepted_at,
         sai.accepted_user,
         sar.name AS role_name,
         sar.description AS role_description,
         sar.permissions AS role_permissions,
         sar.created_at AS role_created_at,
         sar.updated_at AS role_updated_at
        FROM staff_admin_invites sai
        LEFT JOIN staff_admin_roles sar ON sar.id = sai.role_id
       WHERE sai.accepted_at IS NULL
       ORDER BY sai.created_at DESC`
    );
    res.json({
      invites: rows.map((row) => {
        const role = row.role_id
          ? {
              id: row.role_id,
              name: row.role_name,
              description: row.role_description || "",
              permissions: normalizePermissionObject(row.role_permissions),
              created_at: row.role_created_at,
              updated_at: row.role_updated_at,
            }
          : null;
        const permissionOverrides = normalizePermissionObject(row.permissions);
        return {
          id: row.id,
          email: row.email,
          role_id: row.role_id,
          role: role ? buildStaffRolePayload(role) : null,
          permissionOverrides,
          permissions: mergeStaffPermissions(role?.permissions, permissionOverrides),
          created_by: row.created_by,
          created_at: row.created_at,
          expires_at: row.expires_at,
          accepted_at: row.accepted_at,
          accepted_user: row.accepted_user,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/staff-invites/:id
 * Revoke a pending invite.
 */
router.delete("/staff-invites/:id", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM staff_admin_invites WHERE id = $1 AND accepted_at IS NULL`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Invite not found or already accepted" });
    writeAudit(req, "staff.invite.revoke", { targetType: "staff_invite", targetId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/staff-admins
 * List active staff admins (joined to users for display).
 */
router.get("/staff-admins", requireOwnerOrLegacyAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         sa.user_id,
         u.email,
         u.name,
         sa.role_id,
         sa.permissions,
         sa.invited_by,
         sa.invited_at,
         sa.accepted_at,
         sa.revoked_at,
         sar.name AS role_name,
         sar.description AS role_description,
         sar.permissions AS role_permissions,
         sar.created_at AS role_created_at,
         sar.updated_at AS role_updated_at
         FROM staff_admins sa
         JOIN users u ON u.id = sa.user_id
         LEFT JOIN staff_admin_roles sar ON sar.id = sa.role_id
        ORDER BY sa.accepted_at DESC NULLS LAST, sa.invited_at DESC`
    );
    res.json({
      staffAdmins: rows.map((row) => {
        const role = row.role_id
          ? {
              id: row.role_id,
              name: row.role_name,
              description: row.role_description || "",
              permissions: normalizePermissionObject(row.role_permissions),
              created_at: row.role_created_at,
              updated_at: row.role_updated_at,
            }
          : null;
        const permissionOverrides = normalizePermissionObject(row.permissions);
        return {
          user_id: row.user_id,
          email: row.email,
          name: row.name,
          role_id: row.role_id,
          role: role ? buildStaffRolePayload(role) : null,
          permissionOverrides,
          permissions: mergeStaffPermissions(role?.permissions, permissionOverrides),
          invited_by: row.invited_by,
          invited_at: row.invited_at,
          accepted_at: row.accepted_at,
          revoked_at: row.revoked_at,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/staff-admins/:userId
 * Body: { roleId?, permissions? }
 */
router.patch("/staff-admins/:userId", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    if (
      !Object.prototype.hasOwnProperty.call(body, "permissions") &&
      !Object.prototype.hasOwnProperty.call(body, "roleId")
    ) {
      return res.status(400).json({ error: "roleId or permissions is required" });
    }
    if (body.permissions !== undefined && !isPermissionObject(body.permissions)) {
      return res.status(400).json({ error: "permissions must be an object" });
    }
    const { rows: existingRows } = await pool.query(
      `SELECT role_id, permissions FROM staff_admins WHERE user_id = $1`,
      [req.params.userId]
    );
    if (!existingRows.length) return res.status(404).json({ error: "Staff admin not found" });
    const nextRoleId = Object.prototype.hasOwnProperty.call(body, "roleId")
      ? body.roleId || null
      : existingRows[0].role_id || null;
    const role = await requireExistingStaffRole(nextRoleId);
    const nextOverrides = Object.prototype.hasOwnProperty.call(body, "permissions")
      ? normalizePermissionObject(body.permissions)
      : normalizePermissionObject(existingRows[0].permissions);
    const { rows, rowCount } = await pool.query(
      `UPDATE staff_admins
          SET role_id = $1,
              permissions = $2
        WHERE user_id = $3
      RETURNING user_id, role_id, permissions`,
      [nextRoleId, nextOverrides, req.params.userId]
    );
    if (!rowCount) return res.status(404).json({ error: "Staff admin not found" });
    writeAudit(req, "staff.permissions.update", {
      targetType: "staff_admin",
      targetId: req.params.userId,
      metadata: { roleId: nextRoleId },
    });
    res.json({
      staffAdmin: {
        ...rows[0],
        role: buildStaffRolePayload(role),
        permissionOverrides: nextOverrides,
        permissions: mergeStaffPermissions(role?.permissions, nextOverrides),
      },
    });
  } catch (err) {
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * DELETE /admin/staff-admins/:userId
 * Revoke staff access (sets revoked_at; keeps row for audit).
 */
router.delete("/staff-admins/:userId", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE staff_admins SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
      [req.params.userId]
    );
    if (!rowCount) return res.status(404).json({ error: "Staff admin not found or already revoked" });
    writeAudit(req, "staff.revoke", { targetType: "staff_admin", targetId: req.params.userId });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * Build a short human-readable summary of granted permissions for the
 * invite email body. Pure formatting helper.
 * @param {object} perms
 * @returns {string[]}
 */
function summarizePermissions(perms, roleName = null) {
  const lines = [];
  if (roleName) lines.push(`Role: ${roleName}`);
  if (perms?.dashboard?.viewAnalytics) lines.push("View analytics dashboard");
  if (perms?.users?.viewTable) lines.push("View users");
  if (perms?.users?.editStatus) lines.push("Edit user status");
  if (perms?.tests?.run) lines.push("Run tests");
  if (perms?.errors?.viewReports) lines.push("View error reports");
  if (perms?.issues?.view) lines.push("View reported issues");
  if (perms?.plays?.viewFolders) {
    const scope = perms?.plays?.sportScope;
    const sports = Array.isArray(scope) ? scope.join(", ") : scope === "*" ? "all sports" : "(no sports)";
    lines.push(`Manage plays — ${sports}`);
  }
  if (perms?.playbooks?.view) lines.push("View playbook sessions");
  if (perms?.pageSections?.manage) lines.push("Manage landing page sections");
  if (perms?.presets?.create || perms?.presets?.edit) {
    const scope = perms?.presets?.sportScope;
    const sports = Array.isArray(scope) ? scope.join(", ") : scope === "*" ? "all sports" : "(no sports)";
    lines.push(`Manage sport presets — ${sports}`);
  }
  if (perms?.prefabs?.manage) lines.push("Manage admin prefabs");
  if (perms?.videos?.addDemo) lines.push("Add demo videos");
  return lines.length ? lines : ["(no permissions yet)"];
}

// ── Analytics Dashboard ────────────────────────────────────────────────────────

const PERIOD_MAP = {
  "7d":  "7 days",
  "30d": "30 days",
  "90d": "90 days",
  "all": null,
};

/**
 * GET /admin/analytics?period=30d
 * Returns all dashboard analytics in one request.
 * period: "7d" | "30d" | "90d" | "all"
 */
router.get("/analytics", requireAdminOrStaff, requirePerm("dashboard.viewAnalytics"), redactByPerm({
  email: { perm: "users.viewEmails", mask: "email" },
  name: { perm: "users.viewUsernames", mask: "username" },
  user_name: { perm: "users.viewUsernames", mask: "username" },
}), async (req, res, next) => {
  try {
    const periodKey = PERIOD_MAP.hasOwnProperty(req.query.period) ? req.query.period : "30d";
    const interval = PERIOD_MAP[periodKey];
    const whereClause = interval ? `WHERE created_at >= now() - INTERVAL '${interval}'` : "";

    const [
      summaryResult,
      userGrowthResult,
      playActivityResult,
      sportMixResult,
      funnelResult,
      recentUsersResult,
      recentErrorsResult,
      recentIssuesResult,
    ] = await Promise.all([
      // ── Summary KPIs ──
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM users) AS total_users,
          (SELECT COUNT(*)::int FROM users ${whereClause}) AS new_users,
          (SELECT COUNT(*)::int FROM teams WHERE deleted_at IS NULL) AS total_teams,
          (SELECT COUNT(*)::int FROM teams WHERE deleted_at IS NULL ${interval ? `AND created_at >= now() - INTERVAL '${interval}'` : ""}) AS new_teams,
          (SELECT COUNT(*)::int FROM plays WHERE NOT is_seeded) AS total_plays,
          (SELECT COUNT(*)::int FROM plays WHERE NOT is_seeded ${whereClause ? `AND created_at >= now() - INTERVAL '${interval}'` : ""}) AS new_plays,
          (SELECT COUNT(*)::int FROM error_reports ${whereClause}) AS open_errors,
          (SELECT COUNT(*)::int FROM user_issues WHERE status = 'open') AS open_issues
      `),
      // ── New users per day ──
      pool.query(`
        SELECT DATE(created_at)::text AS date, COUNT(*)::int AS count
        FROM users
        ${whereClause}
        GROUP BY 1 ORDER BY 1
      `),
      // ── Play activity per day ──
      pool.query(`
        WITH created_by_day AS (
          SELECT DATE(created_at) AS day, COUNT(*)::int AS created
          FROM plays
          WHERE NOT is_seeded
            ${interval ? `AND created_at >= now() - INTERVAL '${interval}'` : ""}
          GROUP BY 1
        ),
        updated_by_day AS (
          SELECT DATE(updated_at) AS day, COUNT(*)::int AS updated
          FROM plays
          WHERE NOT is_seeded
            AND updated_at - created_at >= INTERVAL '1 minute'
            ${interval ? `AND updated_at >= now() - INTERVAL '${interval}'` : ""}
          GROUP BY 1
        )
        SELECT
          COALESCE(c.day, u.day)::text AS date,
          COALESCE(c.created, 0) AS created,
          COALESCE(u.updated, 0) AS updated
        FROM created_by_day c
        FULL OUTER JOIN updated_by_day u ON c.day = u.day
        ORDER BY 1
      `),
      // ── Sport distribution ──
      pool.query(`
        SELECT COALESCE(sport, 'unknown') AS sport, COUNT(*)::int AS teams
        FROM teams WHERE deleted_at IS NULL
        GROUP BY 1 ORDER BY 2 DESC
        LIMIT 8
      `),
      // ── Onboarding funnel ──
      pool.query(`
        SELECT
          COUNT(*)::int                                              AS registered,
          COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL)::int AS email_verified,
          COUNT(*) FILTER (WHERE onboarded_at IS NOT NULL)::int      AS onboarded,
          (SELECT COUNT(DISTINCT user_id)::int FROM team_memberships WHERE role = 'owner') AS has_team,
          (SELECT COUNT(DISTINCT created_by_user_id)::int FROM plays WHERE NOT is_seeded) AS has_plays
        FROM users
      `),
      // ── Recent users ──
      pool.query(`
        SELECT u.id, u.name, u.email, u.created_at,
               (SELECT t.sport FROM teams t JOIN team_memberships tm ON tm.team_id = t.id
                WHERE tm.user_id = u.id ORDER BY tm.joined_at LIMIT 1) AS sport
        FROM users u ORDER BY u.created_at DESC LIMIT 8
      `),
      // ── Recent errors (grouped by message) ──
      pool.query(`
        SELECT (array_agg(id ORDER BY created_at DESC))[1]::text AS id,
               error_message, component, action,
               COUNT(*)::int AS count, MAX(created_at) AS last_seen,
               (SELECT extra FROM error_reports e2 WHERE e2.error_message = e.error_message LIMIT 1) AS extra
        FROM error_reports e
        ${whereClause}
        GROUP BY error_message, component, action
        ORDER BY last_seen DESC LIMIT 6
      `),
      // ── Recent open issues ──
      pool.query(`
        SELECT id, title, status, created_at, user_name
        FROM user_issues
        ORDER BY created_at DESC LIMIT 6
      `),
    ]);

    const s = summaryResult.rows[0];

    // Derive active-teams % from teams that have at least one play
    const activeTeamsResult = await pool.query(`
      SELECT COUNT(DISTINCT team_id)::int AS active FROM plays
    `);
    const activeTeams = activeTeamsResult.rows[0].active;
    const activeTeamsPct = s.total_teams > 0
      ? Math.round((activeTeams / s.total_teams) * 100)
      : 0;

    res.json({
      period: periodKey,
      summary: {
        totalUsers:     s.total_users,
        newUsers:       s.new_users,
        totalTeams:     s.total_teams,
        newTeams:       s.new_teams,
        totalPlays:     s.total_plays,
        newPlays:       s.new_plays,
        activeTeamsPct,
        openErrors:     s.open_errors,
        openIssues:     s.open_issues,
      },
      userGrowth:       userGrowthResult.rows,
      playActivity:     playActivityResult.rows,
      sportMix:         sportMixResult.rows,
      onboardingFunnel: funnelResult.rows[0],
      recentUsers:      recentUsersResult.rows,
      recentErrors:     recentErrorsResult.rows,
      recentIssues:     recentIssuesResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ── Email broadcast ──────────────────────────────────────────────────────────

const EMAIL_MAX_RECIPIENTS = 2000;

/**
 * Resolve the list of users to target for a broadcast email based on filter config.
 * Always requires email_verified_at to avoid sending to unverified accounts.
 *
 * @param {Object} filters
 * @param {"all"|"onboarded"|"beta"} [filters.userType="all"] - User scope
 * @param {string} [filters.sport=""] - Restrict to users with a team in this sport
 * @returns {Promise<{ id: string, name: string, email: string }[]>}
 */
async function resolveEmailRecipients({ userType = "all", sport = "" } = {}) {
  const conditions = [
    "u.email IS NOT NULL",
    "u.email != ''",
    "u.email_verified_at IS NOT NULL",
  ];
  const params = [];

  if (userType === "onboarded") {
    conditions.push("u.onboarded_at IS NOT NULL");
  } else if (userType === "beta") {
    conditions.push("u.is_beta_tester = true");
  }

  let joinSql = "";
  if (sport) {
    params.push(sport);
    joinSql = `
      JOIN team_memberships tm ON tm.user_id = u.id
      JOIN teams t ON t.id = tm.team_id`;
    conditions.push(`t.sport = $${params.length}`);
  }

  const { rows } = await pool.query(
    `SELECT DISTINCT ON (u.id) u.id, u.name, u.email,
            (SELECT t2.name FROM teams t2
               JOIN team_memberships tm2 ON tm2.team_id = t2.id
              WHERE tm2.user_id = u.id AND (t2.deleted_at IS NULL OR t2.deleted_at > now())
              ORDER BY tm2.joined_at
              LIMIT 1) AS team_name
       FROM users u${joinSql}
      WHERE ${conditions.join(" AND ")}
      ORDER BY u.id`,
    params
  );
  return rows;
}

/**
 * POST /admin/email/preview-recipients
 * Returns a count + first 8 email addresses matching the given filters.
 * Used by the admin composer to show the audience size before sending.
 */
router.post(
  "/email/preview-recipients",
  requireOwnerOrLegacyAdmin,
  async (req, res, next) => {
    try {
      const { filters = {} } = req.body;
      const recipients = await resolveEmailRecipients(filters);
      const preview = recipients.slice(0, 8).map((r) => ({ name: r.name, email: r.email, team_name: r.team_name || "" }));
      res.json({ count: recipients.length, preview });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /admin/email/send
 * Send a broadcast email to all users matching the supplied filters.
 * Pass `previewTo` to send a single test message to that address instead.
 *
 * Body: { subject, subheader?, body, youtubeUrl?, gifUrl?, filters, previewTo? }
 */
router.post(
  "/email/send",
  requireOwnerOrLegacyAdmin,
  async (req, res, next) => {
    try {
      const {
        subject,
        subheader = "",
        body,
        youtubeUrl = "",
        gifUrl = "",
        playEmbed = null,
        filters = {},
        previewTo,
      } = req.body;

      if (!subject?.trim()) return res.status(400).json({ error: "Subject is required" });
      if (!body?.trim()) return res.status(400).json({ error: "Body is required" });

      if (previewTo) {
        const result = await sendBroadcastEmails({
          recipients: [{ email: previewTo, name: "Preview" }],
          subject,
          subheader,
          body,
          youtubeUrl,
          gifUrl,
          playEmbed,
        });
        return res.json({ ...result, preview: true });
      }

      const recipients = await resolveEmailRecipients(filters);
      if (recipients.length === 0) {
        return res.status(400).json({ error: "No recipients match the selected filters" });
      }
      if (recipients.length > EMAIL_MAX_RECIPIENTS) {
        return res.status(400).json({
          error: `Too many recipients (${recipients.length}). Max per send: ${EMAIL_MAX_RECIPIENTS}.`,
        });
      }

      const result = await sendBroadcastEmails({ recipients, subject, subheader, body, youtubeUrl, gifUrl, playEmbed });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ── Recurring email campaigns ─────────────────────────────────────────────────

/**
 * Fire all active recurring campaigns whose next_send_at has passed.
 * Called by the server's interval timer. Returns a summary of what was sent.
 * @returns {Promise<{ fired: number, errors: string[] }>}
 */
export async function runRecurringEmailCampaigns() {
  const { rows: due } = await pool.query(
    `SELECT * FROM recurring_email_campaigns
      WHERE active = true AND next_send_at IS NOT NULL AND next_send_at <= NOW()`
  );

  let fired = 0;
  const errors = [];

  for (const campaign of due) {
    try {
      const recipients = await resolveEmailRecipients({
        userType: campaign.audience_user_type,
        sport: campaign.audience_sport,
      });

      if (recipients.length > 0) {
        await sendBroadcastEmails({
          recipients,
          subject: campaign.subject,
          subheader: campaign.subheader,
          body: campaign.body,
          youtubeUrl: campaign.youtube_url,
          gifUrl: campaign.gif_url,
        });
      }

      const nextSendAt = computeNextSendAt(campaign, new Date());
      await pool.query(
        `UPDATE recurring_email_campaigns
            SET last_sent_at = NOW(),
                next_send_at = $1,
                send_count   = send_count + 1,
                updated_at   = NOW()
          WHERE id = $2`,
        [nextSendAt, campaign.id]
      );
      fired++;
    } catch (err) {
      errors.push(`Campaign "${campaign.name}" (${campaign.id}): ${err.message}`);
    }
  }

  return { fired, errors };
}

/**
 * GET /admin/email/recurring
 * List all recurring email campaigns.
 */
router.get("/email/recurring", requireOwnerOrLegacyAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM recurring_email_campaigns ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/email/recurring
 * Create a new recurring email campaign.
 */
router.post("/email/recurring", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const {
      name,
      subject,
      subheader = "",
      body,
      youtube_url = "",
      gif_url = "",
      audience_user_type = "onboarded",
      audience_sport = "",
      frequency_type,
      frequency_day_of_week = null,
      frequency_day_of_month = null,
      frequency_interval_days = null,
      frequency_hour = 9,
      active = true,
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });
    if (!subject?.trim()) return res.status(400).json({ error: "Subject is required" });
    if (!body?.trim()) return res.status(400).json({ error: "Body is required" });
    if (!["weekly", "monthly", "custom"].includes(frequency_type)) {
      return res.status(400).json({ error: "frequency_type must be weekly, monthly, or custom" });
    }

    const draft = {
      frequency_type,
      frequency_day_of_week,
      frequency_day_of_month,
      frequency_interval_days,
      frequency_hour,
      last_sent_at: null,
    };
    const nextSendAt = active ? computeNextSendAt(draft) : null;

    const { rows } = await pool.query(
      `INSERT INTO recurring_email_campaigns
        (name, subject, subheader, body, youtube_url, gif_url,
         audience_user_type, audience_sport,
         frequency_type, frequency_day_of_week, frequency_day_of_month,
         frequency_interval_days, frequency_hour, active, next_send_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        name.trim(), subject.trim(), subheader, body,
        youtube_url, gif_url,
        audience_user_type, audience_sport,
        frequency_type, frequency_day_of_week, frequency_day_of_month,
        frequency_interval_days, frequency_hour, active, nextSendAt,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /admin/email/recurring/:id
 * Update an existing recurring email campaign.
 */
router.put("/email/recurring/:id", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      subject,
      subheader = "",
      body,
      youtube_url = "",
      gif_url = "",
      audience_user_type = "onboarded",
      audience_sport = "",
      frequency_type,
      frequency_day_of_week = null,
      frequency_day_of_month = null,
      frequency_interval_days = null,
      frequency_hour = 9,
      active = true,
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });
    if (!subject?.trim()) return res.status(400).json({ error: "Subject is required" });
    if (!body?.trim()) return res.status(400).json({ error: "Body is required" });
    if (!["weekly", "monthly", "custom"].includes(frequency_type)) {
      return res.status(400).json({ error: "frequency_type must be weekly, monthly, or custom" });
    }

    const { rows: existing } = await pool.query(
      "SELECT last_sent_at FROM recurring_email_campaigns WHERE id = $1",
      [id]
    );
    if (!existing.length) return res.status(404).json({ error: "Campaign not found" });

    const draft = {
      frequency_type,
      frequency_day_of_week,
      frequency_day_of_month,
      frequency_interval_days,
      frequency_hour,
      last_sent_at: existing[0].last_sent_at,
    };
    const nextSendAt = active ? computeNextSendAt(draft) : null;

    const { rows } = await pool.query(
      `UPDATE recurring_email_campaigns
          SET name = $1, subject = $2, subheader = $3, body = $4,
              youtube_url = $5, gif_url = $6,
              audience_user_type = $7, audience_sport = $8,
              frequency_type = $9, frequency_day_of_week = $10,
              frequency_day_of_month = $11, frequency_interval_days = $12,
              frequency_hour = $13, active = $14, next_send_at = $15,
              updated_at = NOW()
        WHERE id = $16
        RETURNING *`,
      [
        name.trim(), subject.trim(), subheader, body,
        youtube_url, gif_url,
        audience_user_type, audience_sport,
        frequency_type, frequency_day_of_week, frequency_day_of_month,
        frequency_interval_days, frequency_hour, active, nextSendAt,
        id,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: "Campaign not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/email/recurring/:id
 * Delete a recurring email campaign.
 */
router.delete("/email/recurring/:id", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM recurring_email_campaigns WHERE id = $1",
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Campaign not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/email/recurring/:id/send-now
 * Manually fire a campaign immediately and reset its next_send_at.
 */
router.post("/email/recurring/:id/send-now", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM recurring_email_campaigns WHERE id = $1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Campaign not found" });

    const campaign = rows[0];
    const recipients = await resolveEmailRecipients({
      userType: campaign.audience_user_type,
      sport: campaign.audience_sport,
    });

    let sendResult = { sent: 0, batches: 0, errors: [] };
    if (recipients.length > 0) {
      sendResult = await sendBroadcastEmails({
        recipients,
        subject: campaign.subject,
        subheader: campaign.subheader,
        body: campaign.body,
        youtubeUrl: campaign.youtube_url,
        gifUrl: campaign.gif_url,
      });
    }

    const nextSendAt = campaign.active ? computeNextSendAt({ ...campaign, last_sent_at: new Date() }) : null;
    await pool.query(
      `UPDATE recurring_email_campaigns
          SET last_sent_at = NOW(), next_send_at = $1,
              send_count = send_count + 1, updated_at = NOW()
        WHERE id = $2`,
      [nextSendAt, campaign.id]
    );

    res.json({ ...sendResult, next_send_at: nextSendAt });
  } catch (err) {
    next(err);
  }
});

// ── Email GIF assets ─────────────────────────────────────────────────────────

/**
 * GET /admin/gif-asset/:id — serve a generated GIF by its UUID.
 * Intentionally auth-free so email clients can load the image.
 * UUIDs are cryptographically random, providing access security equivalent
 * to a pre-signed URL.
 */
router.get("/gif-asset/:id", (req, res) => {
  const buf = getGifAsset(req.params.id);
  if (!buf) return res.status(404).json({ error: "GIF not found or expired" });
  res.set({
    "Content-Type": "image/gif",
    "Content-Length": buf.length,
    "Cache-Control": "public, max-age=86400",
  });
  res.send(buf);
});

/**
 * POST /admin/email/gif-asset — accept a base64-encoded GIF, store it,
 * and return a publicly accessible URL usable in broadcast emails.
 *
 * @body {{ gif: string, playTitle?: string }} gif - base64-encoded GIF data
 * @returns {{ url: string }}
 */
router.post("/email/gif-asset", requireAdminOrStaff, async (req, res, next) => {
  try {
    const { gif } = req.body;
    if (!gif || typeof gif !== "string") {
      return res.status(400).json({ error: "gif (base64 string) is required" });
    }
    const buffer = Buffer.from(gif, "base64");
    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(413).json({ error: "GIF exceeds 20 MB limit" });
    }
    const id = crypto.randomUUID();
    storeGifAsset(id, buffer);
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.json({ url: `${baseUrl}/admin/gif-asset/${id}` });
  } catch (err) {
    next(err);
  }
});

export default router;
