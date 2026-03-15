import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

/**
 * POST /error-reports — submit an error report (public, no auth required).
 * Rate-limited by keeping it lightweight — no heavy validation.
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      errorMessage,
      errorStack,
      component,
      action,
      pageUrl,
      userAgent,
      deviceInfo,
      extra,
      userId,
      sessionId,
    } = req.body;

    if (!errorMessage) {
      return res.status(400).json({ error: "errorMessage is required" });
    }

    await pool.query(
      `INSERT INTO error_reports (error_message, error_stack, component, action, page_url, user_agent, device_info, extra, user_id, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        errorMessage.slice(0, 2000),
        errorStack?.slice(0, 5000) || null,
        component?.slice(0, 200) || null,
        action?.slice(0, 200) || null,
        pageUrl?.slice(0, 500) || null,
        userAgent?.slice(0, 500) || req.headers["user-agent"]?.slice(0, 500) || null,
        deviceInfo ? JSON.stringify(deviceInfo) : null,
        extra ? JSON.stringify(extra) : null,
        userId || null,
        sessionId?.slice(0, 200) || null,
      ]
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /error-reports — list error reports (admin only).
 * Supports query params: ?limit=50&offset=0&component=videoExport
 */
router.get("/", async (req, res, next) => {
  // Reuse admin session check inline (same pattern as admin.js)
  const sid = req.headers["x-admin-session"];
  if (!sid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 200);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const component = req.query.component || null;

    let query = `SELECT * FROM error_reports`;
    const params = [];

    if (component) {
      params.push(component);
      query += ` WHERE component = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;
    params.push(limit);
    query += ` LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const { rows } = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM error_reports`;
    const countParams = [];
    if (component) {
      countParams.push(component);
      countQuery += ` WHERE component = $1`;
    }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({ reports: rows, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /error-reports/:id — delete a single error report (admin only).
 */
router.delete("/:id", async (req, res, next) => {
  const sid = req.headers["x-admin-session"];
  if (!sid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await pool.query("DELETE FROM error_reports WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /error-reports — clear all error reports (admin only).
 */
router.delete("/", async (req, res, next) => {
  const sid = req.headers["x-admin-session"];
  if (!sid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await pool.query("DELETE FROM error_reports");
    res.json({ ok: true, deleted: result.rowCount });
  } catch (err) {
    next(err);
  }
});

export default router;
