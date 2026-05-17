import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * List all published (is_hidden = false) prefab presets for a sport. These are
 * shown to every user of that sport inside the Slate Prefabs panel under a
 * "Published Presets" section. Hidden rows are admin-only and never returned
 * from this route — admins manage visibility via PATCH /admin/sport-prefab-presets/:sport/:id.
 * @route GET /sport-prefab-presets/:sport
 */
router.get("/:sport", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, prefab_data FROM sport_prefab_presets WHERE LOWER(sport) = LOWER($1) AND is_hidden = false ORDER BY sort_order ASC, created_at ASC",
      [req.params.sport]
    );
    const presets = rows.map((r) => ({ id: r.id, name: r.name, prefabData: r.prefab_data }));
    res.json({ presets });
  } catch (err) {
    next(err);
  }
});

export default router;
