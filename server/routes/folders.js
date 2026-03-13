import { Router } from "express";
import crypto from "crypto";
import pool from "../db/pool.js";
import { requireAuth, requireTeamRole } from "../middleware/auth.js";

const router = Router();

// GET /teams/:teamId/folders
router.get(
  "/:teamId/folders",
  requireAuth,
  requireTeamRole(),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, parent_id, name, sort_order, created_at, updated_at
         FROM play_folders
         WHERE team_id = $1
         ORDER BY sort_order, name`,
        [req.params.teamId]
      );

      const folders = rows.map((r) => ({
        id: r.id,
        parentId: r.parent_id || null,
        name: r.name,
        sortOrder: r.sort_order,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      res.json({ folders });
    } catch (err) {
      next(err);
    }
  }
);

// POST /teams/:teamId/folders
router.post(
  "/:teamId/folders",
  requireAuth,
  requireTeamRole("owner", "coach", "assistant_coach"),
  async (req, res, next) => {
    try {
      const { name, parentId } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ error: "name is required" });
      }

      // Enforce max depth of 4
      if (parentId) {
        let depth = 1;
        let currentId = parentId;
        while (currentId) {
          const parentRes = await pool.query(
            "SELECT parent_id FROM play_folders WHERE id = $1",
            [currentId]
          );
          if (!parentRes.rows.length) break;
          currentId = parentRes.rows[0].parent_id;
          depth++;
          if (depth >= 4) {
            return res.status(400).json({ error: "Maximum folder depth (4) reached" });
          }
        }
      }

      const { rows } = await pool.query(
        `INSERT INTO play_folders (team_id, parent_id, name, created_by_user_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, parent_id, name, sort_order, created_at, updated_at`,
        [req.params.teamId, parentId || null, name.trim(), req.userId]
      );

      res.status(201).json({
        folder: {
          id: rows[0].id,
          parentId: rows[0].parent_id || null,
          name: rows[0].name,
          sortOrder: rows[0].sort_order,
          createdAt: rows[0].created_at,
          updatedAt: rows[0].updated_at,
        },
      });
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({ error: "Folder with this name already exists at this level" });
      }
      next(err);
    }
  }
);

// PATCH /teams/:teamId/folders/:folderId
router.patch(
  "/:teamId/folders/:folderId",
  requireAuth,
  requireTeamRole("owner", "coach", "assistant_coach"),
  async (req, res, next) => {
    try {
      const { name, sortOrder } = req.body;

      const setClauses = ["updated_at = now()"];
      const values = [];
      let idx = 1;

      if (name !== undefined) {
        setClauses.push(`name = $${idx++}`);
        values.push(name.trim());
      }
      if (sortOrder !== undefined) {
        setClauses.push(`sort_order = $${idx++}`);
        values.push(sortOrder);
      }

      values.push(req.params.folderId);
      values.push(req.params.teamId);

      const { rows } = await pool.query(
        `UPDATE play_folders SET ${setClauses.join(", ")}
         WHERE id = $${idx++} AND team_id = $${idx}
         RETURNING id, parent_id, name, sort_order, created_at, updated_at`,
        values
      );

      if (!rows.length) return res.status(404).json({ error: "Folder not found" });

      res.json({
        folder: {
          id: rows[0].id,
          parentId: rows[0].parent_id || null,
          name: rows[0].name,
          sortOrder: rows[0].sort_order,
          createdAt: rows[0].created_at,
          updatedAt: rows[0].updated_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /teams/:teamId/folders/:folderId
router.delete(
  "/:teamId/folders/:folderId",
  requireAuth,
  requireTeamRole("owner", "coach", "assistant_coach"),
  async (req, res, next) => {
    try {
      // Plays in this folder get folder_id set to NULL (ON DELETE SET NULL)
      await pool.query(
        "DELETE FROM play_folders WHERE id = $1 AND team_id = $2",
        [req.params.folderId, req.params.teamId]
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// POST /teams/:teamId/folders/:folderId/share — create a share link for a folder
router.post(
  "/:teamId/folders/:folderId/share",
  requireAuth,
  requireTeamRole("owner", "coach", "assistant_coach"),
  async (req, res, next) => {
    try {
      const { rows: folderRows } = await pool.query(
        "SELECT id FROM play_folders WHERE id = $1 AND team_id = $2",
        [req.params.folderId, req.params.teamId]
      );
      if (!folderRows.length) return res.status(404).json({ error: "Folder not found" });

      const token = crypto.randomBytes(16).toString("hex");
      await pool.query(
        `INSERT INTO folder_share_links (folder_id, created_by_user_id, token)
         VALUES ($1, $2, $3)`,
        [req.params.folderId, req.userId, token]
      );

      res.status(201).json({ token });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
