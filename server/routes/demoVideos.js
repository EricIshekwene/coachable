import { Router } from "express";
import pool from "../db/pool.js";
import { requireAdmin, requireElevated } from "./admin.js";

const router = Router();

/**
 * Build a canonical demo video response from a DB row.
 * @param {Object} row - Database row
 * @returns {Object}
 */
function toDemoVideoResponse(row) {
  return {
    id: row.id,
    title: row.title,
    youtubeUrl: row.youtube_url || null,
    keywords: row.keywords || "",
    done: row.done,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /demo-videos
 * Returns all demo videos ordered by sort_order. Public — no auth required.
 */
router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM demo_videos ORDER BY sort_order ASC, created_at ASC"
    );
    res.json({ videos: rows.map(toDemoVideoResponse) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /demo-videos
 * Create a new demo video entry. Admin only.
 * @body {string} title
 * @body {string} [youtubeUrl]
 * @body {boolean} [done]
 * @body {number} [sortOrder]
 */
router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const { title, youtubeUrl, keywords = "", done = false, sortOrder } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Title is required" });

    let order = sortOrder;
    if (order == null) {
      const { rows } = await pool.query("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM demo_videos");
      order = rows[0].next;
    }

    const { rows } = await pool.query(
      `INSERT INTO demo_videos (title, youtube_url, keywords, done, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title.trim(), youtubeUrl?.trim() || null, keywords?.trim() || "", done, order]
    );
    res.status(201).json({ video: toDemoVideoResponse(rows[0]) });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /demo-videos/:id
 * Update a demo video entry. Admin only.
 * @body {string} [title]
 * @body {string} [youtubeUrl]
 * @body {boolean} [done]
 * @body {number} [sortOrder]
 */
router.patch("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { rows: existing } = await pool.query(
      "SELECT * FROM demo_videos WHERE id = $1",
      [req.params.id]
    );
    if (!existing.length) return res.status(404).json({ error: "Video not found" });

    const current = existing[0];
    const title = req.body.title !== undefined ? req.body.title : current.title;
    const youtubeUrl = req.body.youtubeUrl !== undefined ? req.body.youtubeUrl : current.youtube_url;
    const keywords = req.body.keywords !== undefined ? req.body.keywords : current.keywords;
    const done = req.body.done !== undefined ? req.body.done : current.done;
    const sortOrder = req.body.sortOrder !== undefined ? req.body.sortOrder : current.sort_order;

    if (!title?.trim()) return res.status(400).json({ error: "Title is required" });

    const { rows } = await pool.query(
      `UPDATE demo_videos
       SET title = $1, youtube_url = $2, keywords = $3, done = $4, sort_order = $5, updated_at = now()
       WHERE id = $6
       RETURNING *`,
      [title.trim(), youtubeUrl?.trim() || null, keywords?.trim() || "", done, sortOrder, req.params.id]
    );
    res.json({ video: toDemoVideoResponse(rows[0]) });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /demo-videos/:id
 * Delete a demo video entry. Requires elevated (Danger Mode) session.
 */
router.delete("/:id", requireElevated, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "DELETE FROM demo_videos WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Video not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
