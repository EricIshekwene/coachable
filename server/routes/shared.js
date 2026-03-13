import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

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

    // Find the user's team (they must be a coach/owner to add plays)
    const { rows: memberRows } = await pool.query(
      `SELECT tm.team_id, tm.role FROM team_memberships tm
       WHERE tm.user_id = $1`,
      [req.userId]
    );

    if (!memberRows.length) {
      return res.status(400).json({ error: "You are not a member of any team" });
    }

    const membership = memberRows[0];
    if (!["owner", "coach", "assistant_coach"].includes(membership.role)) {
      return res.status(403).json({ error: "Only coaches can add plays to the playbook" });
    }

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

    const { rows: memberRows } = await pool.query(
      `SELECT tm.team_id, tm.role FROM team_memberships tm WHERE tm.user_id = $1`,
      [req.userId]
    );

    if (!memberRows.length) {
      return res.status(400).json({ error: "You are not a member of any team" });
    }

    const membership = memberRows[0];
    if (!["owner", "coach", "assistant_coach"].includes(membership.role)) {
      return res.status(403).json({ error: "Only coaches can add plays to the playbook" });
    }

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
