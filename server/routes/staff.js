/**
 * Routes for the scoped-staff-admin tier. See STAFF_ADMIN_PLAN.md.
 *
 * Endpoints here are mounted under `/staff/*` (not `/admin/*`):
 *   - GET  /staff/session       — returns the caller's staff actor (perms + owner flag)
 *   - POST /staff/accept-invite — public; accepts an invite token. If the
 *                                 inviter's email matches an existing user,
 *                                 grants staff admin to that user. Otherwise
 *                                 returns a hint to sign up first.
 */

import { Router } from "express";
import pool from "../db/pool.js";
import { readSessionToken, verifySessionToken } from "../middleware/auth.js";
import { resolveActor, resolveJwtActor } from "../middleware/staffAuth.js";

const router = Router();

/**
 * GET /staff/session
 * Reads the caller's JWT, resolves the actor (owner or staff), and returns
 * the permissions blob the frontend uses to drive nav + conditional UI.
 *
 * Owner gets `permissions: null` (sentinel for "all"); staff get the JSONB
 * permissions object from staff_admins.
 */
router.get("/session", async (req, res, next) => {
  try {
    // Use JWT-only resolver: a stale admin-session header from a same-browser
    // /admin login must NOT make a staff JWT appear to be the owner.
    const actor = await resolveJwtActor(req);
    if (!actor) return res.status(401).json({ error: "Not a staff session" });
    res.json({
      authMode: actor.authMode,
      userId: actor.userId,
      isOwner: actor.isOwner,
      roleId: actor.roleId || null,
      roleName: actor.roleName || null,
      roleDescription: actor.roleDescription || null,
      rolePermissions: actor.rolePermissions || {},
      permissionOverrides: actor.permissionOverrides || {},
      permissions: actor.permissions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /staff/accept-invite
 * If someone clicks an invite link that points at the API host (legacy
 * invite URLs from before FRONTEND_URL was used), redirect to the frontend
 * route which renders the React UI that POSTs back here.
 */
router.get("/accept-invite", (req, res) => {
  const frontend = process.env.FRONTEND_URL || "/";
  const base = frontend.replace(/\/$/, "");
  const token = req.query.token || "";
  res.redirect(302, `${base}/staff/accept-invite${token ? `?token=${encodeURIComponent(token)}` : ""}`);
});

/**
 * POST /staff/accept-invite
 * Public. Body: { token, mustMatchUserId? }.
 *
 * Behavior:
 *  - Looks up `staff_admin_invites` by token; rejects if missing, expired,
 *    or already accepted.
 *  - If the caller is authenticated AND their JWT user has an email matching
 *    the invite, the invite is bound to that user and a `staff_admins` row
 *    is created (or updated if a revoked row exists).
 *  - Otherwise returns { ok: false, needsSignup: true, email } so the frontend
 *    can route the user to /signup with the email prefilled.
 *
 * @returns { ok: true } on success, or { ok: false, needsSignup, email } if
 * the recipient must sign up first.
 */
router.post("/accept-invite", async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: "token is required" });

    const { rows: inviteRows } = await pool.query(
      `SELECT id, email, role_id, permissions, expires_at, accepted_at, created_by
         FROM staff_admin_invites
        WHERE token = $1`,
      [token]
    );
    const invite = inviteRows[0];
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.accepted_at) return res.status(410).json({ error: "Invite already accepted" });
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: "Invite expired" });
    }

    const callerUserId = verifySessionToken(readSessionToken(req));
    // Find the user this email maps to, if any
    const { rows: userRows } = await pool.query(
      `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)`,
      [invite.email]
    );
    const user = userRows[0];

    if (!user) {
      return res.json({
        ok: false,
        needsSignup: true,
        email: invite.email,
        message: "Sign up with this email, then click the invite link again.",
      });
    }

    if (callerUserId && callerUserId !== user.id) {
      return res.status(403).json({
        error: "This invite is for a different account",
        invitedEmail: invite.email,
      });
    }

    // Upsert the staff_admins row
    await pool.query(
      `INSERT INTO staff_admins (user_id, role_id, permissions, invited_by, invited_at, accepted_at, revoked_at)
       VALUES ($1, $2, $3, $4, now(), now(), NULL)
       ON CONFLICT (user_id) DO UPDATE
         SET role_id      = EXCLUDED.role_id,
             permissions  = EXCLUDED.permissions,
             invited_by  = EXCLUDED.invited_by,
             accepted_at = now(),
             revoked_at  = NULL`,
      [user.id, invite.role_id || null, invite.permissions, invite.created_by]
    );

    await pool.query(
      `UPDATE staff_admin_invites
          SET accepted_at = now(), accepted_user = $1
        WHERE id = $2`,
      [user.id, invite.id]
    );

    res.json({ ok: true, userId: user.id });
  } catch (err) {
    next(err);
  }
});

export default router;
