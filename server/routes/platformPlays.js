import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

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
 * Returns all featured platform plays (is_featured = true) that are not in a folder,
 * ordered by sort_order. Public — no authentication required.
 */
router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM platform_plays
       WHERE is_featured = true AND folder_id IS NULL
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

/**
 * POST /platform-plays/:id/copy
 * Copies a platform play into the authenticated user's team playbook.
 * Requires the user to be a coach/owner/assistant_coach.
 */
router.post("/:id/copy", requireAuth, async (req, res, next) => {
  try {
    // Fetch the platform play
    const { rows: playRows } = await pool.query(
      "SELECT * FROM platform_plays WHERE id = $1",
      [req.params.id]
    );
    if (!playRows.length) return res.status(404).json({ error: "Platform play not found" });

    const platformPlay = playRows[0];

    // Find the user's team and verify coach role
    const { rows: memberRows } = await pool.query(
      "SELECT tm.team_id, tm.role FROM team_memberships tm WHERE tm.user_id = $1",
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
      `INSERT INTO plays (team_id, title, play_data, thumbnail_url, created_by_user_id, updated_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING *`,
      [
        membership.team_id,
        platformPlay.title,
        platformPlay.play_data,
        platformPlay.thumbnail_url || null,
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

export default router;
