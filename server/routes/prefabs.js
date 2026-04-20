import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * GET /prefabs
 * Returns all saved prefabs for the authenticated user.
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, label, prefab_data, created_at
         FROM user_prefabs
        WHERE user_id = $1
        ORDER BY created_at ASC`,
      [req.userId]
    );
    const prefabs = rows.map((r) => ({
      ...r.prefab_data,
      id: r.id,
      label: r.label,
      createdAt: r.created_at,
    }));
    res.json({ prefabs });
  } catch (err) {
    console.error("GET /prefabs error:", err);
    res.status(500).json({ error: "Failed to load prefabs" });
  }
});

/**
 * POST /prefabs
 * Save a new prefab for the authenticated user.
 * Body: { label, prefab_data }
 */
router.post("/", requireAuth, async (req, res) => {
  const { label, prefab_data } = req.body;
  if (!label || !prefab_data) {
    return res.status(400).json({ error: "label and prefab_data are required" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO user_prefabs (user_id, label, prefab_data)
       VALUES ($1, $2, $3)
       RETURNING id, label, prefab_data, created_at`,
      [req.userId, label, prefab_data]
    );
    const row = rows[0];
    res.status(201).json({
      prefab: {
        ...row.prefab_data,
        id: row.id,
        label: row.label,
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    console.error("POST /prefabs error:", err);
    res.status(500).json({ error: "Failed to save prefab" });
  }
});

/**
 * DELETE /prefabs/:id
 * Delete a prefab by ID, must belong to the authenticated user.
 */
router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM user_prefabs WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );
    if (!rowCount) return res.status(404).json({ error: "Prefab not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /prefabs/:id error:", err);
    res.status(500).json({ error: "Failed to delete prefab" });
  }
});

export default router;
