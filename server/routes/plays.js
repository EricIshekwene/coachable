import { Router } from "express";
import crypto from "crypto";
import pool from "../db/pool.js";
import { requireAuth, requireTeamRole } from "../middleware/auth.js";

const router = Router();

/** Build a canonical play response object from a DB row + extras. */
function toPlayResponse(row, { tags = [], favorited = false } = {}) {
  return {
    id: row.id,
    teamId: row.team_id,
    folderId: row.folder_id || null,
    title: row.title,
    tags,
    playData: row.play_data,
    thumbnail: row.thumbnail_url || null,
    notes: row.notes || "",
    notesAuthorName: row.notes_author_name || "",
    notesUpdatedAt: row.notes_updated_at || null,
    favorited,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /teams/:teamId/plays
router.get(
  "/:teamId/plays",
  requireAuth,
  requireTeamRole(),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM plays
         WHERE team_id = $1 AND archived_at IS NULL
         ORDER BY updated_at DESC`,
        [req.params.teamId]
      );

      // Batch-fetch tags and favorites
      const playIds = rows.map((r) => r.id);

      let tagMap = {};
      if (playIds.length) {
        const tagRes = await pool.query(
          `SELECT ptl.play_id, pt.label
           FROM play_tag_links ptl
           JOIN play_tags pt ON pt.id = ptl.tag_id
           WHERE ptl.play_id = ANY($1)`,
          [playIds]
        );
        tagRes.rows.forEach((r) => {
          (tagMap[r.play_id] ||= []).push(r.label);
        });
      }

      let favSet = new Set();
      if (playIds.length) {
        const favRes = await pool.query(
          "SELECT play_id FROM play_favorites WHERE user_id = $1 AND play_id = ANY($2)",
          [req.userId, playIds]
        );
        favRes.rows.forEach((r) => favSet.add(r.play_id));
      }

      const plays = rows.map((r) =>
        toPlayResponse(r, {
          tags: tagMap[r.id] || [],
          favorited: favSet.has(r.id),
        })
      );

      res.json({ plays });
    } catch (err) {
      next(err);
    }
  }
);

// POST /teams/:teamId/plays
router.post(
  "/:teamId/plays",
  requireAuth,
  requireTeamRole("owner", "coach", "assistant_coach"),
  async (req, res, next) => {
    try {
      const { title, folderId, playData, thumbnail, tags, notes, notesAuthorName } = req.body;
      if (!title?.trim()) {
        return res.status(400).json({ error: "title is required" });
      }

      const { rows } = await pool.query(
        `INSERT INTO plays (team_id, folder_id, title, play_data, thumbnail_url, notes, notes_author_name, notes_updated_at, created_by_user_id, updated_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
         RETURNING *`,
        [
          req.params.teamId,
          folderId || null,
          title.trim(),
          playData || null,
          thumbnail || null,
          notes?.trim() || "",
          notesAuthorName?.trim() || "",
          notes?.trim() ? new Date().toISOString() : null,
          req.userId,
        ]
      );

      // Handle tags
      const tagLabels = Array.isArray(tags) ? tags.filter((t) => t?.trim()) : [];
      const resolvedTags = [];
      for (const label of tagLabels) {
        const normalized = label.trim().toLowerCase();
        const tagRes = await pool.query(
          `INSERT INTO play_tags (team_id, label, normalized_label)
           VALUES ($1, $2, $3)
           ON CONFLICT (team_id, normalized_label) DO UPDATE SET label = EXCLUDED.label
           RETURNING id, label`,
          [req.params.teamId, label.trim(), normalized]
        );
        const tag = tagRes.rows[0];
        resolvedTags.push(tag.label);
        await pool.query(
          `INSERT INTO play_tag_links (play_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [rows[0].id, tag.id]
        );
      }

      res.status(201).json({
        play: toPlayResponse(rows[0], { tags: resolvedTags }),
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /teams/:teamId/plays/:playId
router.get(
  "/:teamId/plays/:playId",
  requireAuth,
  requireTeamRole(),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM plays WHERE id = $1 AND team_id = $2",
        [req.params.playId, req.params.teamId]
      );
      if (!rows.length) return res.status(404).json({ error: "Play not found" });

      const tagRes = await pool.query(
        `SELECT pt.label FROM play_tag_links ptl
         JOIN play_tags pt ON pt.id = ptl.tag_id
         WHERE ptl.play_id = $1`,
        [rows[0].id]
      );
      const favRes = await pool.query(
        "SELECT 1 FROM play_favorites WHERE play_id = $1 AND user_id = $2",
        [rows[0].id, req.userId]
      );

      res.json({
        play: toPlayResponse(rows[0], {
          tags: tagRes.rows.map((r) => r.label),
          favorited: favRes.rows.length > 0,
        }),
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /teams/:teamId/plays/:playId
router.patch(
  "/:teamId/plays/:playId",
  requireAuth,
  requireTeamRole("owner", "coach", "assistant_coach"),
  async (req, res, next) => {
    try {
      const { title, folderId, playData, thumbnail, notes, notesAuthorName } = req.body;

      const setClauses = ["updated_at = now()", "updated_by_user_id = $1"];
      const values = [req.userId];
      let idx = 2;

      if (title !== undefined) {
        setClauses.push(`title = $${idx++}`);
        values.push(title.trim());
      }
      if (folderId !== undefined) {
        setClauses.push(`folder_id = $${idx++}`);
        values.push(folderId || null);
      }
      if (playData !== undefined) {
        setClauses.push(`play_data = $${idx++}`);
        values.push(playData);
      }
      if (thumbnail !== undefined) {
        setClauses.push(`thumbnail_url = $${idx++}`);
        values.push(thumbnail || null);
      }
      if (notes !== undefined) {
        setClauses.push(`notes = $${idx++}`);
        values.push(notes.trim());
        setClauses.push(`notes_updated_at = now()`);
      }
      if (notesAuthorName !== undefined) {
        setClauses.push(`notes_author_name = $${idx++}`);
        values.push(notesAuthorName.trim());
      }

      values.push(req.params.playId);
      values.push(req.params.teamId);

      const { rows } = await pool.query(
        `UPDATE plays SET ${setClauses.join(", ")}
         WHERE id = $${idx++} AND team_id = $${idx}
         RETURNING *`,
        values
      );

      if (!rows.length) return res.status(404).json({ error: "Play not found" });

      res.json({ play: toPlayResponse(rows[0]) });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /teams/:teamId/plays/:playId  (soft delete → trash)
router.delete(
  "/:teamId/plays/:playId",
  requireAuth,
  requireTeamRole("owner", "coach", "assistant_coach"),
  async (req, res, next) => {
    try {
      await pool.query(
        "UPDATE plays SET archived_at = now(), updated_at = now() WHERE id = $1 AND team_id = $2",
        [req.params.playId, req.params.teamId]
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// GET /teams/:teamId/plays/trash — list trashed plays
router.get(
  "/:teamId/plays-trash",
  requireAuth,
  requireTeamRole("owner", "coach", "assistant_coach"),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM plays
         WHERE team_id = $1 AND archived_at IS NOT NULL
         ORDER BY archived_at DESC`,
        [req.params.teamId]
      );

      const playIds = rows.map((r) => r.id);
      let tagMap = {};
      if (playIds.length) {
        const tagRes = await pool.query(
          `SELECT ptl.play_id, pt.label
           FROM play_tag_links ptl
           JOIN play_tags pt ON pt.id = ptl.tag_id
           WHERE ptl.play_id = ANY($1)`,
          [playIds]
        );
        tagRes.rows.forEach((r) => {
          (tagMap[r.play_id] ||= []).push(r.label);
        });
      }

      const plays = rows.map((r) =>
        toPlayResponse(r, { tags: tagMap[r.id] || [] })
      );
      // Add archivedAt to response
      const playsWithArchived = plays.map((p, i) => ({
        ...p,
        archivedAt: rows[i].archived_at,
      }));

      res.json({ plays: playsWithArchived });
    } catch (err) {
      next(err);
    }
  }
);

// POST /teams/:teamId/plays/:playId/restore — restore from trash
router.post(
  "/:teamId/plays/:playId/restore",
  requireAuth,
  requireTeamRole("owner", "coach", "assistant_coach"),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `UPDATE plays SET archived_at = NULL, updated_at = now()
         WHERE id = $1 AND team_id = $2 AND archived_at IS NOT NULL
         RETURNING *`,
        [req.params.playId, req.params.teamId]
      );
      if (!rows.length) return res.status(404).json({ error: "Play not found in trash" });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /teams/:teamId/plays/:playId/permanent — permanently delete
router.delete(
  "/:teamId/plays/:playId/permanent",
  requireAuth,
  requireTeamRole("owner", "coach", "assistant_coach"),
  async (req, res, next) => {
    try {
      await pool.query(
        "DELETE FROM plays WHERE id = $1 AND team_id = $2",
        [req.params.playId, req.params.teamId]
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /teams/:teamId/plays/:playId/tags
router.patch(
  "/:teamId/plays/:playId/tags",
  requireAuth,
  requireTeamRole("owner", "coach", "assistant_coach"),
  async (req, res, next) => {
    try {
      const { tags } = req.body;
      if (!Array.isArray(tags)) {
        return res.status(400).json({ error: "tags must be an array" });
      }

      // Clear existing links
      await pool.query("DELETE FROM play_tag_links WHERE play_id = $1", [req.params.playId]);

      // Re-create
      const resolvedTags = [];
      for (const label of tags) {
        if (!label?.trim()) continue;
        const normalized = label.trim().toLowerCase();
        const tagRes = await pool.query(
          `INSERT INTO play_tags (team_id, label, normalized_label)
           VALUES ($1, $2, $3)
           ON CONFLICT (team_id, normalized_label) DO UPDATE SET label = EXCLUDED.label
           RETURNING id, label`,
          [req.params.teamId, label.trim(), normalized]
        );
        resolvedTags.push(tagRes.rows[0].label);
        await pool.query(
          "INSERT INTO play_tag_links (play_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [req.params.playId, tagRes.rows[0].id]
        );
      }

      res.json({ tags: resolvedTags });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /teams/:teamId/plays/:playId/favorite
router.put(
  "/:teamId/plays/:playId/favorite",
  requireAuth,
  requireTeamRole(),
  async (req, res, next) => {
    try {
      const { favorited } = req.body;
      if (favorited) {
        await pool.query(
          "INSERT INTO play_favorites (play_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [req.params.playId, req.userId]
        );
      } else {
        await pool.query(
          "DELETE FROM play_favorites WHERE play_id = $1 AND user_id = $2",
          [req.params.playId, req.userId]
        );
      }
      res.json({ favorited: Boolean(favorited) });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /teams/:teamId/plays/:playId/notes
router.patch(
  "/:teamId/plays/:playId/notes",
  requireAuth,
  requireTeamRole("owner", "coach", "assistant_coach"),
  async (req, res, next) => {
    try {
      const { notes, notesAuthorName } = req.body;
      await pool.query(
        `UPDATE plays SET
           notes = COALESCE($1, notes),
           notes_author_name = COALESCE($2, notes_author_name),
           notes_updated_at = now(),
           updated_at = now()
         WHERE id = $3 AND team_id = $4`,
        [notes ?? null, notesAuthorName ?? null, req.params.playId, req.params.teamId]
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /teams/:teamId/plays/:playId/folder  (move play)
router.patch(
  "/:teamId/plays/:playId/folder",
  requireAuth,
  requireTeamRole("owner", "coach", "assistant_coach"),
  async (req, res, next) => {
    try {
      const { folderId } = req.body;
      await pool.query(
        "UPDATE plays SET folder_id = $1, updated_at = now() WHERE id = $2 AND team_id = $3",
        [folderId || null, req.params.playId, req.params.teamId]
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// POST /teams/:teamId/plays/:playId/share — create a share link
router.post(
  "/:teamId/plays/:playId/share",
  requireAuth,
  requireTeamRole("owner", "coach", "assistant_coach"),
  async (req, res, next) => {
    try {
      // Verify play exists
      const { rows: playRows } = await pool.query(
        "SELECT id FROM plays WHERE id = $1 AND team_id = $2",
        [req.params.playId, req.params.teamId]
      );
      if (!playRows.length) return res.status(404).json({ error: "Play not found" });

      const token = crypto.randomBytes(16).toString("hex");
      await pool.query(
        `INSERT INTO play_share_links (play_id, created_by_user_id, token)
         VALUES ($1, $2, $3)`,
        [req.params.playId, req.userId, token]
      );

      res.status(201).json({ token });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
