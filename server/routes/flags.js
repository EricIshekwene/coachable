/**
 * Feature flag routes.
 *
 * User-facing:
 *   GET /flags/me  — resolve all flags for the authenticated user
 *
 * Admin CRUD (owner / legacy admin only):
 *   GET    /flags/admin           — list all flags
 *   POST   /flags/admin           — create a flag
 *   PUT    /flags/admin/:id       — update a flag (name, description, enabled, rules)
 *   DELETE /flags/admin/:id       — delete a flag
 */

import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { requireOwnerOrLegacyAdmin } from "../middleware/staffAuth.js";
import { resolveFlags } from "../lib/featureFlags.js";

const router = Router();

// ── User-facing ──────────────────────────────────────────────────────────────

/**
 * GET /flags/me
 * Returns a map of { flagName: boolean } for the authenticated user.
 * The client IP is read from X-Forwarded-For (Cloudflare/Railway proxy) or
 * falls back to req.socket.remoteAddress for geolocation rules.
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      null;

    const flags = await resolveFlags(req.userId, ip);
    res.json({ flags });
  } catch (err) {
    next(err);
  }
});

// ── Admin CRUD ────────────────────────────────────────────────────────────────

/**
 * GET /flags/admin
 * List all feature flags (raw rows, including rules).
 */
router.get("/admin", requireOwnerOrLegacyAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description, enabled, rules, created_at, updated_at
         FROM feature_flags
        ORDER BY name`
    );
    res.json({ flags: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /flags/admin
 * Create a new feature flag.
 * Body: { name, description?, enabled?, rules? }
 */
router.post("/admin", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { name, description = "", enabled = true, rules = [] } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    const { rows } = await pool.query(
      `INSERT INTO feature_flags (name, description, enabled, rules)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, enabled, rules, created_at, updated_at`,
      [name.trim(), description.trim(), enabled, JSON.stringify(rules)]
    );
    res.status(201).json({ flag: rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A flag with that name already exists" });
    }
    next(err);
  }
});

/**
 * PUT /flags/admin/:id
 * Update a feature flag.
 * Body: { name?, description?, enabled?, rules? }
 */
router.put("/admin/:id", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, enabled, rules } = req.body;

    const { rows: existing } = await pool.query(
      `SELECT * FROM feature_flags WHERE id = $1`,
      [id]
    );
    if (!existing.length) {
      return res.status(404).json({ error: "Flag not found" });
    }

    const cur = existing[0];
    const newName = name !== undefined ? name.trim() : cur.name;
    const newDesc = description !== undefined ? description.trim() : cur.description;
    const newEnabled = enabled !== undefined ? Boolean(enabled) : cur.enabled;
    const newRules = rules !== undefined ? rules : cur.rules;

    const { rows } = await pool.query(
      `UPDATE feature_flags
          SET name        = $1,
              description = $2,
              enabled     = $3,
              rules       = $4,
              updated_at  = now()
        WHERE id = $5
        RETURNING id, name, description, enabled, rules, created_at, updated_at`,
      [newName, newDesc, newEnabled, JSON.stringify(newRules), id]
    );
    res.json({ flag: rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A flag with that name already exists" });
    }
    next(err);
  }
});

/**
 * DELETE /flags/admin/:id
 * Permanently delete a feature flag.
 */
router.delete("/admin/:id", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      `DELETE FROM feature_flags WHERE id = $1`,
      [id]
    );
    if (!rowCount) {
      return res.status(404).json({ error: "Flag not found" });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
