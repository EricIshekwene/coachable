import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * Build a canonical playbook section response from a DB row.
 * @param {Object} row - Database row from playbook_sections
 * @param {number} playCount - Number of plays in this section
 * @returns {Object} Camelcased section object
 */
function toSectionResponse(row, playCount = 0) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sport: row.sport || null,
    sortOrder: row.sort_order,
    isDefault: Boolean(row.is_default),
    playCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /playbook-sections
 * Returns all published playbook sections with play counts.
 * Public endpoint — only exposes published sections.
 */
router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ps.*, COUNT(psp.play_id)::int AS play_count
       FROM playbook_sections ps
       LEFT JOIN playbook_section_plays psp ON psp.section_id = ps.id
       WHERE ps.is_published = true
       GROUP BY ps.id
       ORDER BY ps.sort_order ASC, ps.name ASC`
    );
    res.json({ sections: rows.map((r) => toSectionResponse(r, r.play_count)) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /playbook-sections/sport/:sport/plays
 * Returns the first N published plays for a sport across published sections.
 * Public endpoint — used by the public sport playbooks landing page.
 *
 * Query params:
 *   limit  {number}  default 20, max 50
 *   type   {"platform"|"community"}  filter by section type.
 *          "platform"  → is_default = true sections only
 *          "community" → is_default = false sections only
 *          omitted     → all published sections
 */
router.get("/sport/:sport/plays", async (req, res, next) => {
  try {
    const sport = req.params.sport.toLowerCase().replace(/-/g, " ");
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const type = req.query.type; // "platform" | "community" | undefined

    let typeFilter = "";
    if (type === "platform") typeFilter = "AND ps.is_default = true";
    else if (type === "community") typeFilter = "AND ps.is_default = false";

    const { rows } = await pool.query(
      `SELECT pp.id, pp.title, pp.description, pp.sport, pp.thumbnail_url,
              pp.tags, pp.play_data
       FROM platform_plays pp
       JOIN playbook_section_plays psp ON psp.play_id = pp.id
       JOIN playbook_sections ps ON ps.id = psp.section_id
       WHERE ps.is_published = true
         AND LOWER(ps.sport) = $1
         ${typeFilter}
       ORDER BY ps.sort_order ASC, psp.sort_order ASC
       LIMIT $2`,
      [sport, limit]
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(DISTINCT pp.id)::int AS total
       FROM platform_plays pp
       JOIN playbook_section_plays psp ON psp.play_id = pp.id
       JOIN playbook_sections ps ON ps.id = psp.section_id
       WHERE ps.is_published = true
         AND LOWER(ps.sport) = $1
         ${typeFilter}`,
      [sport]
    );

    const plays = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || "",
      sport: r.sport || null,
      thumbnail: r.thumbnail_url || null,
      tags: r.tags || [],
      playData: r.play_data || null,
    }));

    res.json({ plays, total: countRows[0]?.total ?? 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /playbook-sections/:id
 * Returns a single published playbook section with its full plays list (thumbnails included).
 * Requires authentication.
 */
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const { rows: sectionRows } = await pool.query(
      "SELECT * FROM playbook_sections WHERE id = $1 AND is_published = true",
      [req.params.id]
    );
    if (!sectionRows.length) return res.status(404).json({ error: "Section not found" });

    const { rows: playRows } = await pool.query(
      `SELECT pp.id, pp.title, pp.description, pp.sport, pp.thumbnail_url,
              pp.tags, pp.play_data, psp.sort_order AS section_sort_order, psp.added_at
       FROM platform_plays pp
       JOIN playbook_section_plays psp ON psp.play_id = pp.id
       WHERE psp.section_id = $1
       ORDER BY psp.sort_order ASC, psp.added_at ASC`,
      [req.params.id]
    );

    const plays = playRows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || "",
      sport: r.sport || null,
      thumbnail: r.thumbnail_url || null,
      tags: r.tags || [],
      playData: r.play_data || null,
      sortOrder: r.section_sort_order,
    }));

    res.json({
      section: toSectionResponse(sectionRows[0], plays.length),
      plays,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /playbook-sections/:id/copy
 * Copies all plays in a published playbook section into the authenticated coach's team playbook.
 * Optionally copy into a specific folder via body: { folderId? }.
 * Only coaches, assistant coaches, and owners may use this endpoint.
 * Returns the list of newly created team play IDs.
 */
router.post("/:id/copy", requireAuth, async (req, res, next) => {
  try {
    // Verify section exists and is published
    const { rows: sectionRows } = await pool.query(
      "SELECT * FROM playbook_sections WHERE id = $1 AND is_published = true",
      [req.params.id]
    );
    if (!sectionRows.length) return res.status(404).json({ error: "Section not found" });

    // Resolve the user's currently active team (the one they're viewing in the app),
    // falling back to their earliest membership if active_team_id is unset.
    const { rows: userRows } = await pool.query(
      "SELECT active_team_id FROM users WHERE id = $1",
      [req.userId]
    );
    const activeTeamId = userRows[0]?.active_team_id || null;

    const { rows: memberRows } = activeTeamId
      ? await pool.query(
          "SELECT team_id, role FROM team_memberships WHERE user_id = $1 AND team_id = $2",
          [req.userId, activeTeamId]
        )
      : await pool.query(
          "SELECT team_id, role FROM team_memberships WHERE user_id = $1 ORDER BY joined_at ASC LIMIT 1",
          [req.userId]
        );
    if (!memberRows.length) {
      return res.status(400).json({ error: "You are not a member of any team" });
    }
    const membership = memberRows[0];
    if (!["owner", "coach", "assistant_coach"].includes(membership.role)) {
      return res.status(403).json({ error: "Only coaches can add plays to the playbook" });
    }

    const { folderId } = req.body;

    // Fetch plays in the section
    const { rows: playRows } = await pool.query(
      `SELECT pp.* FROM platform_plays pp
       JOIN playbook_section_plays psp ON psp.play_id = pp.id
       WHERE psp.section_id = $1
       ORDER BY psp.sort_order ASC`,
      [req.params.id]
    );

    if (!playRows.length) {
      return res.json({ plays: [], message: "Section has no plays to copy" });
    }

    // Bulk insert copies into the team's play library
    const createdPlays = [];
    for (const play of playRows) {
      const { rows: newRows } = await pool.query(
        `INSERT INTO plays (team_id, folder_id, title, play_data, thumbnail_url, created_by_user_id, updated_by_user_id, copied_from_platform_play_id)
         VALUES ($1, $2, $3, $4, $5, $6, $6, $7)
         RETURNING id, title`,
        [
          membership.team_id,
          folderId || null,
          play.title,
          play.play_data || null,
          play.thumbnail_url || null,
          req.userId,
          play.id,
        ]
      );
      createdPlays.push({ id: newRows[0].id, title: newRows[0].title });
    }

    res.status(201).json({ plays: createdPlays });
  } catch (err) {
    next(err);
  }
});

export default router;
