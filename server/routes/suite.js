/**
 * Team Suite routes — per-team paid feature set.
 *
 * All routes are mounted under /teams/:teamId/suite/
 * and require the user to be authenticated and a member of the team.
 *
 * Feature-specific routes additionally verify that the feature is
 * enabled for the team via the team_suite_features table.
 *
 * Features:
 *   roster          — GET/POST/PATCH/DELETE /roster  + depth chart
 *   practice_plans  — GET/POST/PATCH/DELETE /practice-plans + blocks
 *   install_calendar— GET/POST/PATCH/DELETE /install
 *   game_plans      — GET/POST/PATCH/DELETE /game-plans
 *   assignments     — GET/POST/PATCH/DELETE /assignments + progress
 *
 * Write operations (POST/PATCH/DELETE) require coach/owner role.
 */

import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth, requireTeamRole } from "../middleware/auth.js";
import {
  requireString,
  optionalString,
  optionalInt,
  optionalBoolean,
  optionalEnum,
  requireEnum,
  requireUuid,
  optionalUuid,
  requireDate,
  optionalDate,
  requireUuidArray,
  LIMITS,
} from "../lib/validate.js";

const router = Router({ mergeParams: true });

const SUITE_FEATURES = ["roster", "practice_plans", "install_calendar", "game_plans", "assignments", "printing"];
const COACH_ROLES = ["owner", "coach", "assistant_coach"];

// ── Feature check middleware factory ─────────────────────────────────────────

/**
 * Returns middleware that verifies a suite feature is enabled for the team.
 * @param {string} feature
 * @returns {import('express').RequestHandler}
 */
function requireSuiteFeature(feature) {
  return async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const { rows } = await pool.query(
        `SELECT enabled FROM team_suite_features
          WHERE team_id = $1 AND feature = $2`,
        [teamId, feature]
      );
      if (!rows.length || !rows[0].enabled) {
        return res.status(403).json({ error: "This feature is not enabled for your team" });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware that requires the user to be a coach-level role (owner/coach/assistant_coach).
 * Placed after requireTeamRole() so req.teamRole is already set.
 */
function requireCoachRole(req, res, next) {
  if (!COACH_ROLES.includes(req.teamRole)) {
    return res.status(403).json({ error: "Coach access required" });
  }
  next();
}

/**
 * Verifies that a play UUID belongs to the given team.
 * Sends a 400 response and returns false if the check fails.
 * Call only when playId is non-null.
 *
 * @param {string} teamId
 * @param {string} playId
 * @param {import('express').Response} res
 * @returns {Promise<boolean>}
 */
async function verifyPlayOwnership(teamId, playId, res) {
  const { rows } = await pool.query(
    `SELECT id FROM plays WHERE id = $1 AND team_id = $2`,
    [playId, teamId]
  );
  if (!rows.length) {
    res.status(400).json({ error: "Play not found" });
    return false;
  }
  return true;
}

// ── Suite features endpoint ───────────────────────────────────────────────────

/**
 * GET /teams/:teamId/suite/features
 * Returns the enabled state of all suite features for this team.
 */
router.get(
  "/features",
  requireAuth,
  requireTeamRole(),
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const { rows } = await pool.query(
        `SELECT feature, enabled FROM team_suite_features WHERE team_id = $1`,
        [teamId]
      );
      const features = {};
      for (const f of SUITE_FEATURES) features[f] = false;
      for (const row of rows) features[row.feature] = row.enabled;
      res.json({ features });
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// ROSTER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /teams/:teamId/suite/roster
 * Returns all players with their depth chart entries.
 */
router.get(
  "/roster",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("roster"),
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const { rows: players } = await pool.query(
        `SELECT * FROM suite_players WHERE team_id = $1 ORDER BY sort_order, name`,
        [teamId]
      );
      const { rows: depth } = await pool.query(
        `SELECT * FROM suite_depth_chart WHERE team_id = $1 ORDER BY position, depth_slot`,
        [teamId]
      );
      res.json({ players, depthChart: depth });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /teams/:teamId/suite/roster
 * Creates a new player.
 */
router.post(
  "/roster",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("roster"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const name = requireString(req.body?.name, { field: "name", max: LIMITS.NAME });
      const jerseyNumber = optionalString(req.body?.jerseyNumber, { field: "jerseyNumber", max: 10 }) ?? "";
      const position = optionalString(req.body?.position, { field: "position", max: LIMITS.SHORT_TEXT }) ?? "";
      const classYear = optionalString(req.body?.classYear, { field: "classYear", max: 20 }) ?? "";
      const status = optionalEnum(req.body?.status, ["active", "inactive", "injured"], { field: "status" }) ?? "active";
      const notes = optionalString(req.body?.notes, { field: "notes", max: LIMITS.MEDIUM_TEXT }) ?? "";
      const sortOrder = optionalInt(req.body?.sortOrder, { field: "sortOrder", min: 0, max: 9999 }) ?? 0;

      const { rows } = await pool.query(
        `INSERT INTO suite_players
           (team_id, name, jersey_number, position, class_year, status, notes, sort_order, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [teamId, name, jerseyNumber, position, classYear, status, notes, sortOrder, req.userId]
      );
      res.status(201).json({ player: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /teams/:teamId/suite/roster/:playerId
 * Updates an existing player.
 */
router.patch(
  "/roster/:playerId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("roster"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, playerId } = req.params;
      const { rows: existing } = await pool.query(
        `SELECT id FROM suite_players WHERE id = $1 AND team_id = $2`,
        [playerId, teamId]
      );
      if (!existing.length) return res.status(404).json({ error: "Player not found" });

      const name = optionalString(req.body?.name, { field: "name", max: LIMITS.NAME });
      const jerseyNumber = optionalString(req.body?.jerseyNumber, { field: "jerseyNumber", max: 10 });
      const position = optionalString(req.body?.position, { field: "position", max: LIMITS.SHORT_TEXT });
      const classYear = optionalString(req.body?.classYear, { field: "classYear", max: 20 });
      const status = optionalEnum(req.body?.status, ["active", "inactive", "injured"], { field: "status" });
      const notes = optionalString(req.body?.notes, { field: "notes", max: LIMITS.MEDIUM_TEXT });
      const sortOrder = optionalInt(req.body?.sortOrder, { field: "sortOrder", min: 0, max: 9999 });
      const tags = Array.isArray(req.body?.tags) ? req.body.tags.filter((t) => typeof t === "string").map((t) => t.trim()).filter(Boolean) : undefined;

      const setClauses = ["updated_at = now()"];
      const values = [];
      let idx = 1;
      if (name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(name); }
      if (jerseyNumber !== undefined) { setClauses.push(`jersey_number = $${idx++}`); values.push(jerseyNumber); }
      if (position !== undefined) { setClauses.push(`position = $${idx++}`); values.push(position); }
      if (classYear !== undefined) { setClauses.push(`class_year = $${idx++}`); values.push(classYear); }
      if (status !== undefined) { setClauses.push(`status = $${idx++}`); values.push(status); }
      if (notes !== undefined) { setClauses.push(`notes = $${idx++}`); values.push(notes); }
      if (sortOrder !== undefined) { setClauses.push(`sort_order = $${idx++}`); values.push(sortOrder); }
      if (tags !== undefined) { setClauses.push(`tags = $${idx++}`); values.push(tags); }

      values.push(playerId, teamId);
      const { rows } = await pool.query(
        `UPDATE suite_players SET ${setClauses.join(", ")}
          WHERE id = $${idx++} AND team_id = $${idx}
          RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: "Player not found" });
      res.json({ player: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /teams/:teamId/suite/roster/:playerId
 * Deletes a player and their depth chart entries.
 */
router.delete(
  "/roster/:playerId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("roster"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, playerId } = req.params;
      const { rowCount } = await pool.query(
        `DELETE FROM suite_players WHERE id = $1 AND team_id = $2`,
        [playerId, teamId]
      );
      if (!rowCount) return res.status(404).json({ error: "Player not found" });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /teams/:teamId/suite/roster/depth-chart
 * Upserts depth chart entries for a position. Body: { position, slots: [{playerId, depthSlot}] }
 */
router.put(
  "/roster/depth-chart",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("roster"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const position = requireString(req.body?.position, { field: "position", max: LIMITS.SHORT_TEXT });
      const slots = Array.isArray(req.body?.slots) ? req.body.slots : [];

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Remove existing entries for this position
        await client.query(
          `DELETE FROM suite_depth_chart WHERE team_id = $1 AND position = $2`,
          [teamId, position]
        );
        // Insert new entries
        for (const slot of slots) {
          const playerId = requireUuid(slot.playerId, { field: "playerId" });
          const depthSlot = Math.max(1, parseInt(slot.depthSlot, 10) || 1);
          await client.query(
            `INSERT INTO suite_depth_chart (team_id, player_id, position, depth_slot)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (team_id, player_id, position)
             DO UPDATE SET depth_slot = EXCLUDED.depth_slot, updated_at = now()`,
            [teamId, playerId, position, depthSlot]
          );
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }

      const { rows } = await pool.query(
        `SELECT * FROM suite_depth_chart WHERE team_id = $1 AND position = $2 ORDER BY depth_slot`,
        [teamId, position]
      );
      res.json({ depthChart: rows });
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// PRACTICE PLANS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /teams/:teamId/suite/practice-plans
 * Returns all practice plans (without blocks for list view).
 */
router.get(
  "/practice-plans",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("practice_plans"),
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const { rows } = await pool.query(
        `SELECT * FROM suite_practice_plans WHERE team_id = $1 ORDER BY plan_date DESC`,
        [teamId]
      );
      res.json({ plans: rows });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /teams/:teamId/suite/practice-plans/:planId
 * Returns a single plan with its blocks.
 */
router.get(
  "/practice-plans/:planId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("practice_plans"),
  async (req, res, next) => {
    try {
      const { teamId, planId } = req.params;
      const { rows: plans } = await pool.query(
        `SELECT * FROM suite_practice_plans WHERE id = $1 AND team_id = $2`,
        [planId, teamId]
      );
      if (!plans.length) return res.status(404).json({ error: "Practice plan not found" });
      const { rows: blocks } = await pool.query(
        `SELECT pb.*, p.title AS play_title
           FROM suite_practice_blocks pb
           LEFT JOIN plays p ON p.id = pb.play_id
          WHERE pb.plan_id = $1
          ORDER BY pb.sort_order`,
        [planId]
      );
      res.json({ plan: plans[0], blocks });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /teams/:teamId/suite/practice-plans
 * Creates a new practice plan.
 */
router.post(
  "/practice-plans",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("practice_plans"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const title = requireString(req.body?.title, { field: "title", max: LIMITS.TITLE });
      const planDate = requireDate(req.body?.planDate, { field: "planDate" });
      const notes = optionalString(req.body?.notes, { field: "notes", max: LIMITS.MEDIUM_TEXT }) ?? "";

      const { rows } = await pool.query(
        `INSERT INTO suite_practice_plans (team_id, title, plan_date, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [teamId, title, planDate, notes, req.userId]
      );
      res.status(201).json({ plan: rows[0], blocks: [] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /teams/:teamId/suite/practice-plans/:planId
 * Updates a practice plan's header fields.
 */
router.patch(
  "/practice-plans/:planId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("practice_plans"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, planId } = req.params;
      const { rows: existing } = await pool.query(
        `SELECT id FROM suite_practice_plans WHERE id = $1 AND team_id = $2`,
        [planId, teamId]
      );
      if (!existing.length) return res.status(404).json({ error: "Practice plan not found" });

      const title = optionalString(req.body?.title, { field: "title", max: LIMITS.TITLE });
      const planDate = optionalDate(req.body?.planDate, { field: "planDate" });
      const notes = optionalString(req.body?.notes, { field: "notes", max: LIMITS.MEDIUM_TEXT });

      const setClauses = ["updated_at = now()"];
      const values = [];
      let idx = 1;
      if (title !== undefined) { setClauses.push(`title = $${idx++}`); values.push(title); }
      if (planDate !== undefined) { setClauses.push(`plan_date = $${idx++}`); values.push(planDate); }
      if (notes !== undefined) { setClauses.push(`notes = $${idx++}`); values.push(notes); }

      values.push(planId, teamId);
      const { rows } = await pool.query(
        `UPDATE suite_practice_plans SET ${setClauses.join(", ")}
          WHERE id = $${idx++} AND team_id = $${idx}
          RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: "Practice plan not found" });
      res.json({ plan: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /teams/:teamId/suite/practice-plans/:planId
 * Deletes a plan and its blocks.
 */
router.delete(
  "/practice-plans/:planId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("practice_plans"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, planId } = req.params;
      const { rowCount } = await pool.query(
        `DELETE FROM suite_practice_plans WHERE id = $1 AND team_id = $2`,
        [planId, teamId]
      );
      if (!rowCount) return res.status(404).json({ error: "Practice plan not found" });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /teams/:teamId/suite/practice-plans/:planId/blocks
 * Adds a block to a practice plan.
 */
router.post(
  "/practice-plans/:planId/blocks",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("practice_plans"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, planId } = req.params;
      const { rows: plan } = await pool.query(
        `SELECT id FROM suite_practice_plans WHERE id = $1 AND team_id = $2`,
        [planId, teamId]
      );
      if (!plan.length) return res.status(404).json({ error: "Practice plan not found" });

      const blockType = optionalEnum(req.body?.blockType, ["warmup", "drill", "install", "team_period", "conditioning", "notes", "other"], { field: "blockType" }) ?? "drill";
      const title = requireString(req.body?.title, { field: "title", max: LIMITS.TITLE });
      const durationMinutes = optionalInt(req.body?.durationMinutes, { field: "durationMinutes", min: 0, max: 480 });
      const startTime = optionalString(req.body?.startTime, { field: "startTime", max: 20 }) ?? "";
      const description = optionalString(req.body?.description, { field: "description", max: LIMITS.MEDIUM_TEXT }) ?? "";
      const playId = optionalUuid(req.body?.playId, { field: "playId" });
      const sortOrder = optionalInt(req.body?.sortOrder, { field: "sortOrder", min: 0, max: 9999 }) ?? 0;

      if (playId && !(await verifyPlayOwnership(teamId, playId, res))) return;

      const { rows } = await pool.query(
        `INSERT INTO suite_practice_blocks
           (plan_id, team_id, block_type, title, duration_minutes, start_time, description, play_id, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [planId, teamId, blockType, title, durationMinutes ?? null, startTime, description, playId ?? null, sortOrder]
      );
      res.status(201).json({ block: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /teams/:teamId/suite/practice-plans/:planId/blocks/:blockId
 * Updates a single practice block.
 */
router.patch(
  "/practice-plans/:planId/blocks/:blockId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("practice_plans"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, planId, blockId } = req.params;
      const { rows: existing } = await pool.query(
        `SELECT id FROM suite_practice_blocks WHERE id = $1 AND plan_id = $2 AND team_id = $3`,
        [blockId, planId, teamId]
      );
      if (!existing.length) return res.status(404).json({ error: "Block not found" });

      const blockType = optionalEnum(req.body?.blockType, ["warmup", "drill", "install", "team_period", "conditioning", "notes", "other"], { field: "blockType" });
      const title = optionalString(req.body?.title, { field: "title", max: LIMITS.TITLE });
      const durationMinutes = req.body?.durationMinutes !== undefined ? optionalInt(req.body.durationMinutes, { field: "durationMinutes", min: 0, max: 480 }) : undefined;
      const startTime = optionalString(req.body?.startTime, { field: "startTime", max: 20 });
      const description = optionalString(req.body?.description, { field: "description", max: LIMITS.MEDIUM_TEXT });
      const playId = req.body?.playId !== undefined ? optionalUuid(req.body.playId, { field: "playId" }) : undefined;
      const sortOrder = optionalInt(req.body?.sortOrder, { field: "sortOrder", min: 0, max: 9999 });

      if (playId && !(await verifyPlayOwnership(teamId, playId, res))) return;

      const setClauses = ["updated_at = now()"];
      const values = [];
      let idx = 1;
      if (blockType !== undefined) { setClauses.push(`block_type = $${idx++}`); values.push(blockType); }
      if (title !== undefined) { setClauses.push(`title = $${idx++}`); values.push(title); }
      if (durationMinutes !== undefined) { setClauses.push(`duration_minutes = $${idx++}`); values.push(durationMinutes ?? null); }
      if (startTime !== undefined) { setClauses.push(`start_time = $${idx++}`); values.push(startTime); }
      if (description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(description); }
      if (playId !== undefined) { setClauses.push(`play_id = $${idx++}`); values.push(playId ?? null); }
      if (sortOrder !== undefined) { setClauses.push(`sort_order = $${idx++}`); values.push(sortOrder); }

      values.push(blockId, planId, teamId);
      const { rows } = await pool.query(
        `UPDATE suite_practice_blocks SET ${setClauses.join(", ")}
          WHERE id = $${idx++} AND plan_id = $${idx++} AND team_id = $${idx}
          RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: "Block not found" });
      res.json({ block: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /teams/:teamId/suite/practice-plans/:planId/blocks/:blockId
 * Removes a single practice block.
 */
router.delete(
  "/practice-plans/:planId/blocks/:blockId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("practice_plans"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, planId, blockId } = req.params;
      const { rowCount } = await pool.query(
        `DELETE FROM suite_practice_blocks WHERE id = $1 AND plan_id = $2 AND team_id = $3`,
        [blockId, planId, teamId]
      );
      if (!rowCount) return res.status(404).json({ error: "Block not found" });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// INSTALL CALENDAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /teams/:teamId/suite/install
 * Returns all install calendar items, ordered by date.
 */
router.get(
  "/install",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("install_calendar"),
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const { rows } = await pool.query(
        `SELECT ii.*, p.title AS play_title
           FROM suite_install_items ii
           LEFT JOIN plays p ON p.id = ii.play_id
          WHERE ii.team_id = $1
          ORDER BY ii.install_date, ii.created_at`,
        [teamId]
      );
      res.json({ items: rows });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /teams/:teamId/suite/install
 * Creates a new install calendar item.
 */
router.post(
  "/install",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("install_calendar"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const installDate = requireDate(req.body?.installDate, { field: "installDate" });
      const title = requireString(req.body?.title, { field: "title", max: LIMITS.TITLE });
      const description = optionalString(req.body?.description, { field: "description", max: LIMITS.MEDIUM_TEXT }) ?? "";
      const category = optionalEnum(req.body?.category, ["concept", "play", "drill", "focus", "other"], { field: "category" }) ?? "concept";
      const playId = optionalUuid(req.body?.playId, { field: "playId" });
      const youtubeUrl = optionalString(req.body?.youtubeUrl, { field: "youtubeUrl", max: 500 }) ?? null;

      if (playId && !(await verifyPlayOwnership(teamId, playId, res))) return;

      const { rows } = await pool.query(
        `INSERT INTO suite_install_items
           (team_id, install_date, title, description, category, play_id, youtube_url, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [teamId, installDate, title, description, category, playId ?? null, youtubeUrl, req.userId]
      );
      res.status(201).json({ item: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /teams/:teamId/suite/install/:itemId
 * Updates an install item.
 */
router.patch(
  "/install/:itemId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("install_calendar"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, itemId } = req.params;
      const { rows: existing } = await pool.query(
        `SELECT id FROM suite_install_items WHERE id = $1 AND team_id = $2`,
        [itemId, teamId]
      );
      if (!existing.length) return res.status(404).json({ error: "Install item not found" });

      const installDate = optionalDate(req.body?.installDate, { field: "installDate" });
      const title = optionalString(req.body?.title, { field: "title", max: LIMITS.TITLE });
      const description = optionalString(req.body?.description, { field: "description", max: LIMITS.MEDIUM_TEXT });
      const category = optionalEnum(req.body?.category, ["concept", "play", "drill", "focus", "other"], { field: "category" });
      const playId = req.body?.playId !== undefined ? optionalUuid(req.body.playId, { field: "playId" }) : undefined;
      const youtubeUrl = req.body?.youtubeUrl !== undefined ? optionalString(req.body.youtubeUrl, { field: "youtubeUrl", max: 500 }) : undefined;

      if (playId && !(await verifyPlayOwnership(teamId, playId, res))) return;

      const setClauses = ["updated_at = now()"];
      const values = [];
      let idx = 1;
      if (installDate !== undefined) { setClauses.push(`install_date = $${idx++}`); values.push(installDate); }
      if (title !== undefined) { setClauses.push(`title = $${idx++}`); values.push(title); }
      if (description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(description); }
      if (category !== undefined) { setClauses.push(`category = $${idx++}`); values.push(category); }
      if (playId !== undefined) { setClauses.push(`play_id = $${idx++}`); values.push(playId ?? null); }
      if (youtubeUrl !== undefined) { setClauses.push(`youtube_url = $${idx++}`); values.push(youtubeUrl ?? null); }

      values.push(itemId, teamId);
      const { rows } = await pool.query(
        `UPDATE suite_install_items SET ${setClauses.join(", ")}
          WHERE id = $${idx++} AND team_id = $${idx}
          RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: "Install item not found" });
      res.json({ item: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /teams/:teamId/suite/install/:itemId
 * Deletes an install item.
 */
router.delete(
  "/install/:itemId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("install_calendar"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, itemId } = req.params;
      const { rowCount } = await pool.query(
        `DELETE FROM suite_install_items WHERE id = $1 AND team_id = $2`,
        [itemId, teamId]
      );
      if (!rowCount) return res.status(404).json({ error: "Install item not found" });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GAME PLANS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /teams/:teamId/suite/game-plans
 * Returns all game plans (list view).
 */
router.get(
  "/game-plans",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("game_plans"),
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const { rows } = await pool.query(
        `SELECT * FROM suite_game_plans WHERE team_id = $1 ORDER BY game_date DESC NULLS LAST, created_at DESC`,
        [teamId]
      );
      res.json({ plans: rows });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /teams/:teamId/suite/game-plans/members
 * Returns team members for @ tagging in game plan plays.
 * Must be defined BEFORE /:planId to avoid route collision.
 */
router.get(
  "/game-plans/members",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("game_plans"),
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const { rows } = await pool.query(
        `SELECT tm.user_id, tm.role, u.name
           FROM team_memberships tm
           JOIN users u ON u.id = tm.user_id
          WHERE tm.team_id = $1
          ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'coach' THEN 1 WHEN 'assistant_coach' THEN 2 ELSE 3 END, u.name`,
        [teamId]
      );
      res.json({ members: rows.map((r) => ({ userId: r.user_id, name: r.name, role: r.role })) });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /teams/:teamId/suite/game-plans/:planId
 * Returns a single game plan with its attached play entries (suite_game_plan_plays).
 */
router.get(
  "/game-plans/:planId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("game_plans"),
  async (req, res, next) => {
    try {
      const { teamId, planId } = req.params;
      const { rows } = await pool.query(
        `SELECT * FROM suite_game_plans WHERE id = $1 AND team_id = $2`,
        [planId, teamId]
      );
      if (!rows.length) return res.status(404).json({ error: "Game plan not found" });
      const plan = rows[0];

      // Fetch structured play entries
      const { rows: gpPlays } = await pool.query(
        `SELECT gpp.*, p.title AS play_title, p.play_data AS play_data
           FROM suite_game_plan_plays gpp
           LEFT JOIN plays p ON p.id = gpp.play_id
          WHERE gpp.game_plan_id = $1
          ORDER BY gpp.sort_order, gpp.created_at`,
        [planId]
      );

      res.json({ plan, plays: gpPlays });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /teams/:teamId/suite/game-plans
 * Creates a new game plan.
 */
router.post(
  "/game-plans",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("game_plans"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const opponent = requireString(req.body?.opponent, { field: "opponent", max: LIMITS.NAME });
      const gameDate = optionalDate(req.body?.gameDate, { field: "gameDate" });
      const goals = optionalString(req.body?.goals, { field: "goals", max: LIMITS.LONG_TEXT }) ?? "";
      const keyNotes = optionalString(req.body?.keyNotes, { field: "keyNotes", max: LIMITS.LONG_TEXT }) ?? "";
      const personnelNotes = optionalString(req.body?.personnelNotes, { field: "personnelNotes", max: LIMITS.LONG_TEXT }) ?? "";
      const opponentTendencies = optionalString(req.body?.opponentTendencies, { field: "opponentTendencies", max: LIMITS.LONG_TEXT }) ?? "";
      const reminders = optionalString(req.body?.reminders, { field: "reminders", max: LIMITS.MEDIUM_TEXT }) ?? "";
      const selectedPlayIds = requireUuidArray(req.body?.selectedPlayIds ?? [], { field: "selectedPlayIds", max: 200 });

      const { rows } = await pool.query(
        `INSERT INTO suite_game_plans
           (team_id, opponent, game_date, goals, key_notes, personnel_notes, opponent_tendencies, reminders, selected_play_ids, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [teamId, opponent, gameDate ?? null, goals, keyNotes, personnelNotes, opponentTendencies, reminders, selectedPlayIds, req.userId]
      );
      res.status(201).json({ plan: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /teams/:teamId/suite/game-plans/:planId
 * Updates a game plan's fields.
 */
router.patch(
  "/game-plans/:planId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("game_plans"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, planId } = req.params;
      const { rows: existing } = await pool.query(
        `SELECT id FROM suite_game_plans WHERE id = $1 AND team_id = $2`,
        [planId, teamId]
      );
      if (!existing.length) return res.status(404).json({ error: "Game plan not found" });

      const opponent = optionalString(req.body?.opponent, { field: "opponent", max: LIMITS.NAME });
      const gameDate = req.body?.gameDate !== undefined ? optionalDate(req.body.gameDate, { field: "gameDate" }) : undefined;
      const goals = optionalString(req.body?.goals, { field: "goals", max: LIMITS.LONG_TEXT });
      const keyNotes = optionalString(req.body?.keyNotes, { field: "keyNotes", max: LIMITS.LONG_TEXT });
      const personnelNotes = optionalString(req.body?.personnelNotes, { field: "personnelNotes", max: LIMITS.LONG_TEXT });
      const opponentTendencies = optionalString(req.body?.opponentTendencies, { field: "opponentTendencies", max: LIMITS.LONG_TEXT });
      const reminders = optionalString(req.body?.reminders, { field: "reminders", max: LIMITS.MEDIUM_TEXT });
      const selectedPlayIds = req.body?.selectedPlayIds !== undefined
        ? requireUuidArray(req.body.selectedPlayIds, { field: "selectedPlayIds", max: 200 })
        : undefined;

      const setClauses = ["updated_at = now()"];
      const values = [];
      let idx = 1;
      if (opponent !== undefined) { setClauses.push(`opponent = $${idx++}`); values.push(opponent); }
      if (gameDate !== undefined) { setClauses.push(`game_date = $${idx++}`); values.push(gameDate ?? null); }
      if (goals !== undefined) { setClauses.push(`goals = $${idx++}`); values.push(goals); }
      if (keyNotes !== undefined) { setClauses.push(`key_notes = $${idx++}`); values.push(keyNotes); }
      if (personnelNotes !== undefined) { setClauses.push(`personnel_notes = $${idx++}`); values.push(personnelNotes); }
      if (opponentTendencies !== undefined) { setClauses.push(`opponent_tendencies = $${idx++}`); values.push(opponentTendencies); }
      if (reminders !== undefined) { setClauses.push(`reminders = $${idx++}`); values.push(reminders); }
      if (selectedPlayIds !== undefined) { setClauses.push(`selected_play_ids = $${idx++}`); values.push(selectedPlayIds); }

      values.push(planId, teamId);
      const { rows } = await pool.query(
        `UPDATE suite_game_plans SET ${setClauses.join(", ")}
          WHERE id = $${idx++} AND team_id = $${idx}
          RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: "Game plan not found" });
      res.json({ plan: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /teams/:teamId/suite/game-plans/:planId
 * Deletes a game plan.
 */
router.delete(
  "/game-plans/:planId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("game_plans"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, planId } = req.params;
      const { rowCount } = await pool.query(
        `DELETE FROM suite_game_plans WHERE id = $1 AND team_id = $2`,
        [planId, teamId]
      );
      if (!rowCount) return res.status(404).json({ error: "Game plan not found" });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GAME PLAN PLAYS (per-play blocks within a game plan)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /teams/:teamId/suite/game-plans/:planId/plays
 * Adds a play entry to a game plan.
 */
router.post(
  "/game-plans/:planId/plays",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("game_plans"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, planId } = req.params;
      const { rows: plan } = await pool.query(
        `SELECT id FROM suite_game_plans WHERE id = $1 AND team_id = $2`,
        [planId, teamId]
      );
      if (!plan.length) return res.status(404).json({ error: "Game plan not found" });

      const playId = optionalUuid(req.body?.playId, { field: "playId" });
      const description = optionalString(req.body?.description, { field: "description", max: LIMITS.LONG_TEXT }) ?? "";
      const bodyText = optionalString(req.body?.bodyText, { field: "bodyText", max: LIMITS.LONG_TEXT }) ?? "";
      const bulletPoints = Array.isArray(req.body?.bulletPoints) ? req.body.bulletPoints.filter((b) => typeof b === "string") : [];
      const taggedUserIds = Array.isArray(req.body?.taggedUserIds) ? req.body.taggedUserIds.filter((id) => typeof id === "string") : [];

      if (playId && !(await verifyPlayOwnership(teamId, playId, res))) return;
      const youtubeUrl = optionalString(req.body?.youtubeUrl, { field: "youtubeUrl", max: 500 }) ?? null;
      const sortOrder = optionalInt(req.body?.sortOrder, { field: "sortOrder", min: 0, max: 9999 }) ?? 0;

      const { rows } = await pool.query(
        `INSERT INTO suite_game_plan_plays
           (game_plan_id, team_id, play_id, description, body_text, bullet_points, tagged_user_ids, youtube_url, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [planId, teamId, playId ?? null, description, bodyText, bulletPoints, taggedUserIds, youtubeUrl, sortOrder]
      );

      // Fetch play details to return with the new entry
      let playTitle = null, playData = null;
      if (playId) {
        const { rows: playRows } = await pool.query(`SELECT title, play_data FROM plays WHERE id = $1 AND team_id = $2`, [playId, teamId]);
        if (playRows.length) { playTitle = playRows[0].title; playData = playRows[0].play_data; }
      }
      res.status(201).json({ play: { ...rows[0], play_title: playTitle, play_data: playData } });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /teams/:teamId/suite/game-plans/:planId/plays/:gpPlayId
 * Updates a game plan play entry.
 */
router.patch(
  "/game-plans/:planId/plays/:gpPlayId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("game_plans"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, planId, gpPlayId } = req.params;
      const { rows: existing } = await pool.query(
        `SELECT id FROM suite_game_plan_plays WHERE id = $1 AND game_plan_id = $2 AND team_id = $3`,
        [gpPlayId, planId, teamId]
      );
      if (!existing.length) return res.status(404).json({ error: "Game plan play not found" });

      const playId = req.body?.playId !== undefined ? optionalUuid(req.body.playId, { field: "playId" }) : undefined;
      const description = optionalString(req.body?.description, { field: "description", max: LIMITS.LONG_TEXT });
      const bodyText = optionalString(req.body?.bodyText, { field: "bodyText", max: LIMITS.LONG_TEXT });
      const bulletPoints = Array.isArray(req.body?.bulletPoints) ? req.body.bulletPoints.filter((b) => typeof b === "string") : undefined;
      const taggedUserIds = Array.isArray(req.body?.taggedUserIds) ? req.body.taggedUserIds.filter((id) => typeof id === "string") : undefined;
      const youtubeUrl = req.body?.youtubeUrl !== undefined ? optionalString(req.body.youtubeUrl, { field: "youtubeUrl", max: 500 }) : undefined;
      const sortOrder = optionalInt(req.body?.sortOrder, { field: "sortOrder", min: 0, max: 9999 });

      if (playId && !(await verifyPlayOwnership(teamId, playId, res))) return;

      const setClauses = ["updated_at = now()"];
      const values = [];
      let idx = 1;
      if (playId !== undefined) { setClauses.push(`play_id = $${idx++}`); values.push(playId ?? null); }
      if (description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(description); }
      if (bodyText !== undefined) { setClauses.push(`body_text = $${idx++}`); values.push(bodyText); }
      if (bulletPoints !== undefined) { setClauses.push(`bullet_points = $${idx++}`); values.push(bulletPoints); }
      if (taggedUserIds !== undefined) { setClauses.push(`tagged_user_ids = $${idx++}`); values.push(taggedUserIds); }
      if (youtubeUrl !== undefined) { setClauses.push(`youtube_url = $${idx++}`); values.push(youtubeUrl ?? null); }
      if (sortOrder !== undefined) { setClauses.push(`sort_order = $${idx++}`); values.push(sortOrder); }

      values.push(gpPlayId, planId, teamId);
      const { rows } = await pool.query(
        `UPDATE suite_game_plan_plays SET ${setClauses.join(", ")}
          WHERE id = $${idx++} AND game_plan_id = $${idx++} AND team_id = $${idx}
          RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: "Game plan play not found" });

      // Re-fetch play details
      const updated = rows[0];
      let playTitle = null, playData = null;
      if (updated.play_id) {
        const { rows: playRows } = await pool.query(`SELECT title, play_data FROM plays WHERE id = $1 AND team_id = $2`, [updated.play_id, teamId]);
        if (playRows.length) { playTitle = playRows[0].title; playData = playRows[0].play_data; }
      }
      res.json({ play: { ...updated, play_title: playTitle, play_data: playData } });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /teams/:teamId/suite/game-plans/:planId/plays/:gpPlayId
 * Removes a play entry from a game plan.
 */
router.delete(
  "/game-plans/:planId/plays/:gpPlayId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("game_plans"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, planId, gpPlayId } = req.params;
      const { rowCount } = await pool.query(
        `DELETE FROM suite_game_plan_plays WHERE id = $1 AND game_plan_id = $2 AND team_id = $3`,
        [gpPlayId, planId, teamId]
      );
      if (!rowCount) return res.status(404).json({ error: "Game plan play not found" });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /teams/:teamId/suite/assignments
 * Returns all assignments with progress summary.
 */
router.get(
  "/assignments",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("assignments"),
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const { rows: assignments } = await pool.query(
        `SELECT a.*, p.title AS play_title
           FROM suite_assignments a
           LEFT JOIN plays p ON p.id = a.play_id
          WHERE a.team_id = $1
          ORDER BY a.created_at DESC`,
        [teamId]
      );
      const { rows: progress } = await pool.query(
        `SELECT ap.*, sp.name AS player_name
           FROM suite_assignment_progress ap
           LEFT JOIN suite_players sp ON sp.id = ap.player_id
          WHERE ap.team_id = $1`,
        [teamId]
      );
      res.json({ assignments, progress });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /teams/:teamId/suite/assignments
 * Creates a new assignment.
 */
router.post(
  "/assignments",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("assignments"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const title = requireString(req.body?.title, { field: "title", max: LIMITS.TITLE });
      const description = optionalString(req.body?.description, { field: "description", max: LIMITS.MEDIUM_TEXT }) ?? "";
      const assignmentType = optionalEnum(req.body?.assignmentType, ["play", "install", "practice", "general"], { field: "assignmentType" }) ?? "general";
      const playId = optionalUuid(req.body?.playId, { field: "playId" });

      if (playId && !(await verifyPlayOwnership(teamId, playId, res))) return;

      const { rows } = await pool.query(
        `INSERT INTO suite_assignments (team_id, title, description, assignment_type, play_id, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [teamId, title, description, assignmentType, playId ?? null, req.userId]
      );
      res.status(201).json({ assignment: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /teams/:teamId/suite/assignments/:assignmentId
 * Updates an assignment.
 */
router.patch(
  "/assignments/:assignmentId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("assignments"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, assignmentId } = req.params;
      const { rows: existing } = await pool.query(
        `SELECT id FROM suite_assignments WHERE id = $1 AND team_id = $2`,
        [assignmentId, teamId]
      );
      if (!existing.length) return res.status(404).json({ error: "Assignment not found" });

      const title = optionalString(req.body?.title, { field: "title", max: LIMITS.TITLE });
      const description = optionalString(req.body?.description, { field: "description", max: LIMITS.MEDIUM_TEXT });
      const assignmentType = optionalEnum(req.body?.assignmentType, ["play", "install", "practice", "general"], { field: "assignmentType" });
      const playId = req.body?.playId !== undefined ? optionalUuid(req.body.playId, { field: "playId" }) : undefined;

      if (playId && !(await verifyPlayOwnership(teamId, playId, res))) return;

      const setClauses = ["updated_at = now()"];
      const values = [];
      let idx = 1;
      if (title !== undefined) { setClauses.push(`title = $${idx++}`); values.push(title); }
      if (description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(description); }
      if (assignmentType !== undefined) { setClauses.push(`assignment_type = $${idx++}`); values.push(assignmentType); }
      if (playId !== undefined) { setClauses.push(`play_id = $${idx++}`); values.push(playId ?? null); }

      values.push(assignmentId, teamId);
      const { rows } = await pool.query(
        `UPDATE suite_assignments SET ${setClauses.join(", ")}
          WHERE id = $${idx++} AND team_id = $${idx}
          RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: "Assignment not found" });
      res.json({ assignment: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /teams/:teamId/suite/assignments/:assignmentId
 * Deletes an assignment and its progress records.
 */
router.delete(
  "/assignments/:assignmentId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("assignments"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, assignmentId } = req.params;
      const { rowCount } = await pool.query(
        `DELETE FROM suite_assignments WHERE id = $1 AND team_id = $2`,
        [assignmentId, teamId]
      );
      if (!rowCount) return res.status(404).json({ error: "Assignment not found" });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /teams/:teamId/suite/assignments/:assignmentId/progress
 * Upserts progress for a player or position group.
 * Body: { playerId?, positionGroup?, status, notes? }
 */
router.put(
  "/assignments/:assignmentId/progress",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("assignments"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, assignmentId } = req.params;
      const { rows: assignment } = await pool.query(
        `SELECT id FROM suite_assignments WHERE id = $1 AND team_id = $2`,
        [assignmentId, teamId]
      );
      if (!assignment.length) return res.status(404).json({ error: "Assignment not found" });

      const playerId = optionalUuid(req.body?.playerId, { field: "playerId" });
      const positionGroup = optionalString(req.body?.positionGroup, { field: "positionGroup", max: LIMITS.SHORT_TEXT }) ?? "";
      const status = requireEnum(req.body?.status, ["not_started", "learning", "ready", "mastered"], { field: "status" });
      const notes = optionalString(req.body?.notes, { field: "notes", max: LIMITS.MEDIUM_TEXT }) ?? "";

      const { rows } = await pool.query(
        `INSERT INTO suite_assignment_progress
           (assignment_id, team_id, player_id, position_group, status, notes, updated_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (assignment_id, team_id, player_id) WHERE player_id IS NOT NULL
         DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, updated_by_user_id = EXCLUDED.updated_by_user_id, updated_at = now()
         RETURNING *`,
        [assignmentId, teamId, playerId ?? null, positionGroup, status, notes, req.userId]
      );
      res.json({ progress: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// PLAY PICKER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /teams/:teamId/suite/plays
 * Lightweight play list for suite feature pickers (schedule installs, assignments).
 * Returns non-archived plays with id, title, and thumbnail_url only.
 */
router.get(
  "/plays",
  requireAuth,
  requireTeamRole(),
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const isPlayer = req.teamRole === "player";
      const { rows } = await pool.query(
        `SELECT id, title, play_data AS "playData" FROM plays
          WHERE team_id = $1 AND archived_at IS NULL
          ${isPlayer ? "AND hidden_from_players = false" : ""}
          ORDER BY updated_at DESC`,
        [teamId]
      );
      res.json({ plays: rows });
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE (combined practice plans + install calendar)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /teams/:teamId/suite/schedule
 * Returns practice plans and install items merged by date.
 * Respects per-feature entitlement — includes practice data only if practice_plans is
 * enabled, install data only if install_calendar is enabled.
 *
 * Query params:
 *   start — YYYY-MM-DD (default: 30 days before today)
 *   end   — YYYY-MM-DD (default: 90 days after today)
 */
router.get(
  "/schedule",
  requireAuth,
  requireTeamRole(),
  async (req, res, next) => {
    try {
      const { teamId } = req.params;

      // Determine which sub-features are enabled
      const { rows: featureRows } = await pool.query(
        `SELECT feature, enabled FROM team_suite_features
          WHERE team_id = $1 AND feature IN ('practice_plans', 'install_calendar')`,
        [teamId]
      );
      const practiceEnabled = featureRows.some((f) => f.feature === "practice_plans" && f.enabled);
      const installEnabled = featureRows.some((f) => f.feature === "install_calendar" && f.enabled);

      if (!practiceEnabled && !installEnabled) {
        return res.status(403).json({ error: "Schedule feature not enabled for this team" });
      }

      // Default date range
      const today = new Date();
      const defaultStart = new Date(today); defaultStart.setDate(today.getDate() - 30);
      const defaultEnd = new Date(today); defaultEnd.setDate(today.getDate() + 90);
      const startParam = req.query.start || defaultStart.toISOString().split("T")[0];
      const endParam = req.query.end || defaultEnd.toISOString().split("T")[0];

      // Build an ordered list of all unique dates in range that have any content
      const dayMap = {};

      if (practiceEnabled) {
        const { rows: plans } = await pool.query(
          `SELECT * FROM suite_practice_plans
            WHERE team_id = $1 AND plan_date BETWEEN $2 AND $3
            ORDER BY plan_date`,
          [teamId, startParam, endParam]
        );
        const planIds = plans.map((p) => p.id);
        let blocksByPlan = {};
        if (planIds.length) {
          const { rows: blocks } = await pool.query(
            `SELECT pb.*, p.title AS play_title, p.play_data AS play_data
               FROM suite_practice_blocks pb
               LEFT JOIN plays p ON p.id = pb.play_id
              WHERE pb.plan_id = ANY($1)
              ORDER BY pb.sort_order`,
            [planIds]
          );
          for (const b of blocks) {
            (blocksByPlan[b.plan_id] ||= []).push(b);
          }
        }
        for (const plan of plans) {
          const dateKey = plan.plan_date.toISOString ? plan.plan_date.toISOString().split("T")[0] : String(plan.plan_date);
          if (!dayMap[dateKey]) dayMap[dateKey] = { date: dateKey, practice: null, installs: [] };
          dayMap[dateKey].practice = { ...plan, blocks: blocksByPlan[plan.id] || [] };
        }
      }

      if (installEnabled) {
        const { rows: installs } = await pool.query(
          `SELECT ii.*, p.title AS play_title, p.play_data AS play_data
             FROM suite_install_items ii
             LEFT JOIN plays p ON p.id = ii.play_id
            WHERE ii.team_id = $1 AND ii.install_date BETWEEN $2 AND $3
            ORDER BY ii.install_date, ii.created_at`,
          [teamId, startParam, endParam]
        );
        for (const item of installs) {
          const dateKey = item.install_date.toISOString ? item.install_date.toISOString().split("T")[0] : String(item.install_date);
          if (!dayMap[dateKey]) dayMap[dateKey] = { date: dateKey, practice: null, installs: [] };
          dayMap[dateKey].installs.push(item);
        }
      }

      const days = Object.values(dayMap).sort((a, b) => (a.date > b.date ? 1 : -1));
      res.json({ days, practiceEnabled, installEnabled });
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// ROSTER — MEMBER-BACKED PROFILES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /teams/:teamId/suite/roster/members
 * Returns all team members with their optional suite_player profile data,
 * plus unlisted players (suite_players with no user_id link).
 */
router.get(
  "/roster/members",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("roster"),
  async (req, res, next) => {
    try {
      const { teamId } = req.params;

      // All real team members
      const { rows: memberRows } = await pool.query(
        `SELECT tm.user_id, tm.role, u.name, u.email
           FROM team_memberships tm
           JOIN users u ON u.id = tm.user_id
          WHERE tm.team_id = $1
          ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'coach' THEN 1 WHEN 'assistant_coach' THEN 2 ELSE 3 END, u.name`,
        [teamId]
      );

      // Existing suite_player profiles for this team that are linked to users
      const { rows: profileRows } = await pool.query(
        `SELECT * FROM suite_players WHERE team_id = $1 AND user_id IS NOT NULL ORDER BY name`,
        [teamId]
      );
      const profileByUserId = {};
      for (const p of profileRows) profileByUserId[p.user_id] = p;

      const members = memberRows.map((m) => ({
        userId: m.user_id,
        name: m.name,
        email: m.email,
        role: m.role,
        suitePlayer: profileByUserId[m.user_id] || null,
      }));

      // Unlisted players (manual entries with no user link)
      const { rows: unlisted } = await pool.query(
        `SELECT * FROM suite_players WHERE team_id = $1 AND user_id IS NULL ORDER BY sort_order, name`,
        [teamId]
      );

      res.json({ members, unlisted });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /teams/:teamId/suite/roster/member/:userId
 * Upserts a suite_player profile linked to a real team member.
 * Creates if not exists, updates if exists.
 * Coach-only. Cannot target a user from a different team.
 */
router.patch(
  "/roster/member/:userId",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("roster"),
  requireCoachRole,
  async (req, res, next) => {
    try {
      const { teamId, userId } = req.params;

      // Verify the target user is on this team
      const { rows: membership } = await pool.query(
        `SELECT user_id FROM team_memberships WHERE team_id = $1 AND user_id = $2`,
        [teamId, userId]
      );
      if (!membership.length) return res.status(404).json({ error: "User is not on this team" });

      const jerseyNumber = optionalString(req.body?.jerseyNumber, { field: "jerseyNumber", max: 10 }) ?? "";
      const position = optionalString(req.body?.position, { field: "position", max: LIMITS.SHORT_TEXT }) ?? "";
      const classYear = optionalString(req.body?.classYear, { field: "classYear", max: 20 }) ?? "";
      const status = optionalEnum(req.body?.status, ["active", "inactive", "injured"], { field: "status" }) ?? "active";
      const notes = optionalString(req.body?.notes, { field: "notes", max: LIMITS.MEDIUM_TEXT }) ?? "";
      const tags = Array.isArray(req.body?.tags) ? req.body.tags.filter((t) => typeof t === "string").map((t) => t.trim()).filter(Boolean) : [];

      // Look up the user's display name to store on the suite_player
      const { rows: userRows } = await pool.query(`SELECT name FROM users WHERE id = $1`, [userId]);
      const name = userRows[0]?.name || "";

      const { rows } = await pool.query(
        `INSERT INTO suite_players
           (team_id, user_id, name, jersey_number, position, class_year, status, notes, tags, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (team_id, user_id) WHERE user_id IS NOT NULL
         DO UPDATE SET
           jersey_number = EXCLUDED.jersey_number,
           position = EXCLUDED.position,
           class_year = EXCLUDED.class_year,
           status = EXCLUDED.status,
           notes = EXCLUDED.notes,
           tags = EXCLUDED.tags,
           updated_at = now()
         RETURNING *`,
        [teamId, userId, name, jerseyNumber, position, classYear, status, notes, tags, req.userId]
      );
      res.json({ suitePlayer: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// ASSIGNMENTS — MEMBER STATUS & VIEW TRACKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /teams/:teamId/suite/assignments/members
 * Returns all team members for the assignment tracker (id, name, role).
 */
router.get(
  "/assignments/members",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("assignments"),
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const { rows } = await pool.query(
        `SELECT tm.user_id, tm.role, u.name
           FROM team_memberships tm
           JOIN users u ON u.id = tm.user_id
          WHERE tm.team_id = $1
          ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'coach' THEN 1 WHEN 'assistant_coach' THEN 2 ELSE 3 END, u.name`,
        [teamId]
      );
      res.json({ members: rows.map((r) => ({ userId: r.user_id, name: r.name, role: r.role })) });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /teams/:teamId/suite/assignments/member-statuses
 * Returns all member statuses for the team's assignments.
 */
router.get(
  "/assignments/member-statuses",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("assignments"),
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const { rows } = await pool.query(
        `SELECT * FROM suite_assignment_member_status WHERE team_id = $1`,
        [teamId]
      );
      res.json({ statuses: rows });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /teams/:teamId/suite/assignments/:assignmentId/view
 * Records that the current user has viewed this assignment.
 * Upserts viewed_at (never overwrites an existing view timestamp).
 */
router.post(
  "/assignments/:assignmentId/view",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("assignments"),
  async (req, res, next) => {
    try {
      const { teamId, assignmentId } = req.params;

      // Verify assignment belongs to this team
      const { rows: asgn } = await pool.query(
        `SELECT id FROM suite_assignments WHERE id = $1 AND team_id = $2`,
        [assignmentId, teamId]
      );
      if (!asgn.length) return res.status(404).json({ error: "Assignment not found" });

      await pool.query(
        `INSERT INTO suite_assignment_member_status
           (assignment_id, team_id, user_id, viewed_at, updated_at)
         VALUES ($1, $2, $3, now(), now())
         ON CONFLICT (assignment_id, user_id)
         DO UPDATE SET viewed_at = COALESCE(suite_assignment_member_status.viewed_at, now()), updated_at = now()`,
        [assignmentId, teamId, req.userId]
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /teams/:teamId/suite/assignments/:assignmentId/member-status
 * Sets mastery status for a team member on an assignment.
 * Coaches can set status for any member (body: { userId, status }).
 * Players can only update their own status (body: { status }).
 */
router.put(
  "/assignments/:assignmentId/member-status",
  requireAuth,
  requireTeamRole(),
  requireSuiteFeature("assignments"),
  async (req, res, next) => {
    try {
      const { teamId, assignmentId } = req.params;
      const isCoach = COACH_ROLES.includes(req.teamRole);

      // Determine target user
      let targetUserId;
      if (isCoach && req.body?.userId) {
        targetUserId = requireUuid(req.body.userId, { field: "userId" });
        // Verify target is on this team
        const { rows: mem } = await pool.query(
          `SELECT user_id FROM team_memberships WHERE team_id = $1 AND user_id = $2`,
          [teamId, targetUserId]
        );
        if (!mem.length) return res.status(404).json({ error: "User is not on this team" });
      } else {
        targetUserId = req.userId;
      }

      const status = requireEnum(req.body?.status, ["not_started", "learning", "ready", "mastered"], { field: "status" });

      const { rows: asgn } = await pool.query(
        `SELECT id FROM suite_assignments WHERE id = $1 AND team_id = $2`,
        [assignmentId, teamId]
      );
      if (!asgn.length) return res.status(404).json({ error: "Assignment not found" });

      const { rows } = await pool.query(
        `INSERT INTO suite_assignment_member_status
           (assignment_id, team_id, user_id, status, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (assignment_id, user_id)
         DO UPDATE SET status = EXCLUDED.status, updated_at = now()
         RETURNING *`,
        [assignmentId, teamId, targetUserId, status]
      );
      res.json({ status: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
