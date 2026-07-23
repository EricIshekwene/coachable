import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * Looks up a specific team membership for a user, or null if they don't
 * belong to that team at all.
 * @param {string} userId
 * @param {string} teamId
 * @returns {Promise<{team_id: string, role: string}|null>}
 */
async function findMembership(userId, teamId) {
  const { rows } = await pool.query(
    `SELECT tm.team_id, tm.role FROM team_memberships tm WHERE tm.user_id = $1 AND tm.team_id = $2`,
    [userId, teamId]
  );
  return rows[0] || null;
}

/**
 * Resolves which team to copy a shared item into when the caller didn't
 * explicitly pick one: the user's currently active team (the one shown in
 * the app sidebar), falling back to their earliest membership.
 * @param {string} userId
 * @returns {Promise<{team_id: string, role: string}|null>}
 */
async function resolveDefaultMembership(userId) {
  const { rows: userRows } = await pool.query(
    "SELECT active_team_id FROM users WHERE id = $1",
    [userId]
  );
  const activeTeamId = userRows[0]?.active_team_id || null;
  if (activeTeamId) {
    const membership = await findMembership(userId, activeTeamId);
    if (membership) return membership;
  }
  const { rows } = await pool.query(
    `SELECT tm.team_id, tm.role FROM team_memberships tm WHERE tm.user_id = $1 ORDER BY tm.joined_at ASC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

/**
 * Resolves the coach-level membership to copy a shared play/folder into.
 * Honors an explicit `teamId` (verifying the user actually belongs to it —
 * never trust the client blindly) or falls back to their default team.
 * @param {string} userId
 * @param {string|null} requestedTeamId
 * @returns {Promise<{ok: true, membership: object}|{ok: false, status: number, error: string}>}
 */
async function resolveTargetMembership(userId, requestedTeamId) {
  const membership = requestedTeamId
    ? await findMembership(userId, requestedTeamId)
    : await resolveDefaultMembership(userId);

  if (!membership) {
    return requestedTeamId
      ? { ok: false, status: 403, error: "You don't have access to that team" }
      : { ok: false, status: 400, error: "You are not a member of any team" };
  }
  if (!["owner", "coach", "assistant_coach"].includes(membership.role)) {
    return { ok: false, status: 403, error: "Only coaches can add plays to the playbook" };
  }
  return { ok: true, membership };
}

// GET /shared/plays/:token — fetch a shared play (public, no team membership needed)
router.get("/plays/:token", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.play_data, p.notes, p.notes_author_name,
              p.notes_updated_at, p.created_at, p.updated_at, p.thumbnail_url,
              t.name AS team_name,
              sl.expires_at, sl.revoked_at
       FROM play_share_links sl
       JOIN plays p ON p.id = sl.play_id
       JOIN teams t ON t.id = p.team_id
       WHERE sl.token = $1`,
      [req.params.token]
    );

    if (!rows.length) return res.status(404).json({ error: "Shared play not found" });

    const link = rows[0];
    if (link.revoked_at) return res.status(410).json({ error: "This share link has been revoked" });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: "This share link has expired" });
    }

    // Fetch tags
    const tagRes = await pool.query(
      `SELECT pt.label FROM play_tag_links ptl
       JOIN play_tags pt ON pt.id = ptl.tag_id
       WHERE ptl.play_id = $1`,
      [link.id]
    );

    res.json({
      play: {
        id: link.id,
        title: link.title,
        playData: link.play_data,
        thumbnail: link.thumbnail_url || null,
        notes: link.notes || "",
        notesAuthorName: link.notes_author_name || "",
        notesUpdatedAt: link.notes_updated_at || null,
        tags: tagRes.rows.map((r) => r.label),
        teamName: link.team_name,
        createdAt: link.created_at,
        updatedAt: link.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /shared/plays/:token/copy — copy a shared play to the user's team
router.post("/plays/:token/copy", requireAuth, async (req, res, next) => {
  try {
    // Look up the shared play
    const { rows: linkRows } = await pool.query(
      `SELECT sl.play_id, sl.expires_at, sl.revoked_at,
              p.title, p.play_data, p.notes, p.notes_author_name, p.thumbnail_url
       FROM play_share_links sl
       JOIN plays p ON p.id = sl.play_id
       WHERE sl.token = $1`,
      [req.params.token]
    );

    if (!linkRows.length) return res.status(404).json({ error: "Shared play not found" });

    const link = linkRows[0];
    if (link.revoked_at) return res.status(410).json({ error: "This share link has been revoked" });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: "This share link has expired" });
    }

    // Resolve which of the user's teams to copy into — an explicit choice
    // from the client's team picker, or their default team as a fallback.
    const resolved = await resolveTargetMembership(req.userId, req.body?.teamId || null);
    if (!resolved.ok) {
      return res.status(resolved.status).json({ error: resolved.error });
    }
    const membership = resolved.membership;

    // Create a copy in the user's team
    const { rows: newPlay } = await pool.query(
      `INSERT INTO plays (team_id, title, play_data, thumbnail_url, notes, notes_author_name, notes_updated_at, created_by_user_id, updated_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING *`,
      [
        membership.team_id,
        link.title,
        link.play_data,
        link.thumbnail_url || null,
        link.notes || "",
        link.notes_author_name || "",
        link.notes ? new Date().toISOString() : null,
        req.userId,
      ]
    );

    res.status(201).json({
      play: {
        id: newPlay[0].id,
        teamId: newPlay[0].team_id,
        title: newPlay[0].title,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /shared/folders/:token — fetch a shared folder with its plays (public)
router.get("/folders/:token", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.id, f.name, t.name AS team_name,
              sl.expires_at, sl.revoked_at
       FROM folder_share_links sl
       JOIN play_folders f ON f.id = sl.folder_id
       JOIN teams t ON t.id = f.team_id
       WHERE sl.token = $1`,
      [req.params.token]
    );

    if (!rows.length) return res.status(404).json({ error: "Shared folder not found" });

    const link = rows[0];
    if (link.revoked_at) return res.status(410).json({ error: "This share link has been revoked" });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: "This share link has expired" });
    }

    // Fetch plays in this folder
    const playRes = await pool.query(
      `SELECT id, title, play_data, thumbnail_url, notes, notes_author_name, notes_updated_at, created_at, updated_at
       FROM plays
       WHERE folder_id = $1 AND archived_at IS NULL
       ORDER BY updated_at DESC`,
      [link.id]
    );

    // Fetch tags for all plays
    const playIds = playRes.rows.map((p) => p.id);
    let tagsByPlayId = {};
    if (playIds.length > 0) {
      const tagRes = await pool.query(
        `SELECT ptl.play_id, pt.label FROM play_tag_links ptl
         JOIN play_tags pt ON pt.id = ptl.tag_id
         WHERE ptl.play_id = ANY($1)`,
        [playIds]
      );
      for (const row of tagRes.rows) {
        if (!tagsByPlayId[row.play_id]) tagsByPlayId[row.play_id] = [];
        tagsByPlayId[row.play_id].push(row.label);
      }
    }

    const plays = playRes.rows.map((p) => ({
      id: p.id,
      title: p.title,
      playData: p.play_data,
      thumbnail: p.thumbnail_url || null,
      notes: p.notes || "",
      notesAuthorName: p.notes_author_name || "",
      notesUpdatedAt: p.notes_updated_at || null,
      tags: tagsByPlayId[p.id] || [],
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    res.json({
      folder: {
        id: link.id,
        name: link.name,
        teamName: link.team_name,
        plays,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /shared/folders/:token/copy — copy all plays from a shared folder to the user's team
router.post("/folders/:token/copy", requireAuth, async (req, res, next) => {
  try {
    const { rows: linkRows } = await pool.query(
      `SELECT sl.folder_id, sl.expires_at, sl.revoked_at, f.name, f.team_id
       FROM folder_share_links sl
       JOIN play_folders f ON f.id = sl.folder_id
       WHERE sl.token = $1`,
      [req.params.token]
    );

    if (!linkRows.length) return res.status(404).json({ error: "Shared folder not found" });

    const link = linkRows[0];
    if (link.revoked_at) return res.status(410).json({ error: "This share link has been revoked" });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: "This share link has expired" });
    }

    const resolved = await resolveTargetMembership(req.userId, req.body?.teamId || null);
    if (!resolved.ok) {
      return res.status(resolved.status).json({ error: resolved.error });
    }
    const membership = resolved.membership;

    // Create a new folder in the user's team
    const { rows: newFolderRows } = await pool.query(
      `INSERT INTO play_folders (team_id, name, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [membership.team_id, link.name, req.userId]
    );
    const newFolderId = newFolderRows[0].id;

    // Fetch plays from the shared folder
    const playRes = await pool.query(
      `SELECT title, play_data, thumbnail_url, notes, notes_author_name
       FROM plays
       WHERE folder_id = $1 AND archived_at IS NULL`,
      [link.folder_id]
    );

    // Copy each play into the new folder
    let copiedCount = 0;
    for (const p of playRes.rows) {
      await pool.query(
        `INSERT INTO plays (team_id, folder_id, title, play_data, thumbnail_url, notes, notes_author_name, notes_updated_at, created_by_user_id, updated_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
        [
          membership.team_id,
          newFolderId,
          p.title,
          p.play_data,
          p.thumbnail_url || null,
          p.notes || "",
          p.notes_author_name || "",
          p.notes ? new Date().toISOString() : null,
          req.userId,
        ]
      );
      copiedCount++;
    }

    res.status(201).json({
      folder: { id: newFolderId, name: link.name },
      copiedCount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
