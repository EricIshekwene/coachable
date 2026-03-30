import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

/**
 * GET /page-sections/:key
 * Returns a single page section by key, including the assigned play's full play_data.
 * Public — no authentication required.
 */
router.get("/:key", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ps.section_key, ps.label, ps.page, ps.play_id,
              pp.title AS play_title, pp.sport AS play_sport,
              pp.thumbnail_url AS play_thumbnail, pp.play_data
       FROM page_sections ps
       LEFT JOIN platform_plays pp ON pp.id = ps.play_id
       WHERE ps.section_key = $1`,
      [req.params.key]
    );
    if (!rows.length) return res.status(404).json({ error: "Section not found" });
    const r = rows[0];
    res.json({
      section: {
        sectionKey: r.section_key,
        label: r.label,
        page: r.page,
        play: r.play_id
          ? {
              id: r.play_id,
              title: r.play_title,
              sport: r.play_sport || null,
              thumbnail: r.play_thumbnail || null,
              playData: r.play_data || null,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
