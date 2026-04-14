import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../db/pool.js";

const router = Router();
const COACHING_ROLES = ["owner", "coach", "assistant_coach"];
const ADMIN_HASH = globalThis.process.env.ADMIN_HASH;
if (!ADMIN_HASH) {
  throw new Error("ADMIN_HASH environment variable must be set.");
}

// In-memory session store (resets on server restart — fine for admin)
const sessions = new Map();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const ELEVATED_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function requireAdmin(req, res, next) {
  const sid = req.headers["x-admin-session"];
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
  const sid = req.headers["x-admin-session"];
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

// POST /admin/login
router.post("/login", async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });

  const valid = await bcrypt.compare(password, ADMIN_HASH);
  if (!valid) return res.status(401).json({ error: "Invalid password" });

  const sid = crypto.randomBytes(32).toString("hex");
  sessions.set(sid, { expiresAt: Date.now() + SESSION_TTL_MS, elevatedAt: null });
  res.json({ session: sid });
});

// POST /admin/elevate — re-authenticate to enter Danger Mode (elevated permissions)
router.post("/elevate", requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });

  const valid = await bcrypt.compare(password, ADMIN_HASH);
  if (!valid) return res.status(401).json({ error: "Invalid password" });

  const sid = req.headers["x-admin-session"];
  const session = sessions.get(sid);
  session.elevatedAt = Date.now();
  const elevatedUntil = session.elevatedAt + ELEVATED_TTL_MS;
  res.json({ ok: true, elevatedUntil });
});

// POST /admin/logout
router.post("/logout", (req, res) => {
  const sid = req.headers["x-admin-session"];
  if (sid) sessions.delete(sid);
  res.json({ ok: true });
});

// GET /admin/users — list all users
router.get("/users", requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.email_verified_at, u.onboarded_at, u.created_at,
              u.is_beta_tester,
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
       GROUP BY u.id, u.name, u.email, u.email_verified_at, u.onboarded_at, u.created_at, u.is_beta_tester
       ORDER BY u.created_at DESC`,
      [COACHING_ROLES]
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

// GET /admin/users/:id/activity - detail + recent activity for a single user
router.get("/users/:id/activity", requireAdmin, async (req, res, next) => {
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
           (SELECT COUNT(*)::int FROM plays WHERE created_by_user_id = $1) AS plays_created,
           (SELECT COUNT(*)::int FROM plays WHERE updated_by_user_id = $1 AND created_by_user_id <> $1) AS plays_updated,
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

// Helper: fully delete a user and all their data
async function deleteUserCascade(userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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
router.post("/create-account", requireAdmin, async (req, res, next) => {
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
router.post("/cleanup", requireAdmin, async (_req, res, next) => {
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
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /admin/plays — list all platform plays
router.get("/plays", requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM platform_plays ORDER BY sort_order ASC, created_at DESC"
    );
    res.json({ plays: rows.map(toPlatformPlayResponse) });
  } catch (err) {
    next(err);
  }
});

// GET /admin/plays/:id — get a single platform play (for loading in editor)
router.get("/plays/:id", requireAdmin, async (req, res, next) => {
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
router.post("/plays", requireAdmin, async (req, res, next) => {
  try {
    const { title, description, sport, playData, thumbnail, tags, isFeatured, sortOrder, folderId } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "title is required" });

    const { rows } = await pool.query(
      `INSERT INTO platform_plays
         (title, description, sport, play_data, thumbnail_url, tags, is_featured, sort_order, folder_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        title.trim(),
        description?.trim() || "",
        sport?.trim() || null,
        playData || null,
        thumbnail || null,
        tags || [],
        isFeatured ?? false,
        sortOrder ?? 0,
        folderId || null,
      ]
    );
    res.status(201).json({ play: toPlatformPlayResponse(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/plays/:id — update a platform play
router.patch("/plays/:id", requireAdmin, async (req, res, next) => {
  try {
    const { title, description, sport, playData, thumbnail, tags, isFeatured, sortOrder, folderId } = req.body;

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
router.post("/plays/:id/restore", requireAdmin, async (req, res, next) => {
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

// DELETE /admin/plays/:id — delete a platform play (requires Danger Mode)
router.delete("/plays/:id", requireElevated, async (req, res, next) => {
  try {
    // Clear any page sections referencing this play before deleting
    const { rows: clearedSections } = await pool.query(
      `UPDATE page_sections SET play_id = NULL, updated_at = now()
       WHERE play_id = $1 RETURNING section_key, label`,
      [req.params.id]
    );
    await pool.query("DELETE FROM platform_plays WHERE id = $1", [req.params.id]);
    res.json({ ok: true, clearedSections });
  } catch (err) {
    next(err);
  }
});

// POST /admin/plays/:id/duplicate — clone a platform play
router.post("/plays/:id/duplicate", requireAdmin, async (req, res, next) => {
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
router.get("/platform-folders", requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM platform_play_folders ORDER BY sort_order ASC, name ASC"
    );
    res.json({ folders: rows.map(toPlatformFolderResponse) });
  } catch (err) {
    next(err);
  }
});

// POST /admin/platform-folders — create a platform play folder
router.post("/platform-folders", requireAdmin, async (req, res, next) => {
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
router.patch("/platform-folders/:id", requireAdmin, async (req, res, next) => {
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
router.get("/page-sections", requireAdmin, async (_req, res, next) => {
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
router.patch("/page-sections/:key", requireAdmin, async (req, res, next) => {
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
router.get("/playbook-sections", requireAdmin, async (_req, res, next) => {
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
router.post("/playbook-sections", requireAdmin, async (req, res, next) => {
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
router.patch("/playbook-sections/:id", requireAdmin, async (req, res, next) => {
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
 */
router.delete("/playbook-sections/:id", requireAdmin, async (req, res, next) => {
  try {
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
router.get("/playbook-sections/:id/plays", requireAdmin, async (req, res, next) => {
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
router.post("/playbook-sections/:id/plays", requireAdmin, async (req, res, next) => {
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
router.delete("/playbook-sections/:id/plays/:playId", requireAdmin, async (req, res, next) => {
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
router.patch("/playbook-sections/:id/plays/:playId", requireAdmin, async (req, res, next) => {
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

// Cleanup helper — exported for use by the auto-cleanup scheduler
export async function cleanupStaleAccounts() {
  const { rows } = await pool.query(
    "SELECT id FROM users WHERE onboarded_at IS NULL AND created_at < now() - interval '24 hours'"
  );
  for (const row of rows) {
    try {
      await deleteUserCascade(row.id);
    } catch (err) {
      console.error(`Failed to cleanup user ${row.id}:`, err.message);
    }
  }
  return { ok: true, cleaned: rows.length };
}

// PATCH /admin/users/:id/beta-tester — toggle beta tester status for a user
router.patch("/users/:id/beta-tester", requireAdmin, async (req, res, next) => {
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
router.get("/user-issues", requireAdmin, async (req, res, next) => {
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
router.patch("/user-issues/:id", requireAdmin, async (req, res, next) => {
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
router.delete("/user-issues/:id", requireAdmin, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM user_issues WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
