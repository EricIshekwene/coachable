import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

/** Build a canonical platform play response from a DB row. */
function toPlatformPlayResponse(row, { includePlayData = false } = {}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    sport: row.sport || null,
    ...(includePlayData ? { playData: row.play_data || null } : {}),
    thumbnail: row.thumbnail_url || null,
    tags: row.tags || [],
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /platform-plays
 * Returns all featured platform plays (is_featured = true), ordered by sort_order.
 * Public — no authentication required.
 */
router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM platform_plays
       WHERE is_featured = true
       ORDER BY sort_order ASC, created_at DESC`
    );
    res.json({ plays: rows.map((r) => toPlatformPlayResponse(r)) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /platform-plays/:id
 * Returns a single platform play including its full play_data.
 * Public — no authentication required.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM platform_plays WHERE id = $1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Play not found" });
    res.json({ play: toPlatformPlayResponse(rows[0], { includePlayData: true }) });
  } catch (err) {
    next(err);
  }
});

export default router;
