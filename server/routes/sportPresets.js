import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * List all admin-configured presets for a sport.
 * Returns an empty array if none have been configured.
 * @route GET /sport-presets/:sport
 */
router.get("/:sport", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, play_data FROM sport_presets WHERE sport = $1 AND is_hidden = false ORDER BY sort_order ASC, created_at ASC",
      [req.params.sport]
    );
    const presets = rows.map((r) => ({ id: r.id, name: r.name, playData: r.play_data }));
    res.json({ presets });
  } catch (err) {
    next(err);
  }
});

export default router;
