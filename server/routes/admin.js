import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../db/pool.js";

const router = Router();
const ADMIN_HASH = "$2b$10$VHa04rH/gcOa97BFMCM7WOvEVU5kU2KK4pfMa9A1fj.HuSO903Ri2";

// In-memory session store (resets on server restart — fine for admin)
const sessions = new Map();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function requireAdmin(req, res, next) {
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

// POST /admin/login
router.post("/login", async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });

  const valid = await bcrypt.compare(password, ADMIN_HASH);
  if (!valid) return res.status(401).json({ error: "Invalid password" });

  const sid = crypto.randomBytes(32).toString("hex");
  sessions.set(sid, { expiresAt: Date.now() + SESSION_TTL_MS });
  res.json({ session: sid });
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
              tm.role, t.name AS team_name
       FROM users u
       LEFT JOIN team_memberships tm ON tm.user_id = u.id
       LEFT JOIN teams t ON t.id = tm.team_id
       ORDER BY u.created_at DESC`
    );
    res.json({ users: rows });
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

// DELETE /admin/users/:id — delete a single user and their owned teams
router.delete("/users/:id", requireAdmin, async (req, res, next) => {
  try {
    await deleteUserCascade(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/users — delete ALL users
router.delete("/users", requireAdmin, async (_req, res, next) => {
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
    if (playData !== undefined) { setClauses.push(`play_data = $${idx++}`); values.push(playData); }
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

// DELETE /admin/plays/:id — delete a platform play
router.delete("/plays/:id", requireAdmin, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM platform_plays WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
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

// DELETE /admin/platform-folders/:id — delete a folder (plays become un-foldered)
router.delete("/platform-folders/:id", requireAdmin, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM platform_play_folders WHERE id = $1", [req.params.id]);
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

export default router;
