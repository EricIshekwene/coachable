/**
 * Admin Team Suite routes.
 *
 * Allows platform admins (owner/legacy admin) to enable or disable
 * individual Team Suite features per team.
 *
 * Routes:
 *   GET  /admin/team-suite            — list all teams with their suite feature states
 *   GET  /admin/team-suite/:teamId    — get suite features for one team
 *   PUT  /admin/team-suite/:teamId    — set all suite features for a team at once
 *   PATCH /admin/team-suite/:teamId/:feature — toggle a single feature
 */

import { Router } from "express";
import pool from "../db/pool.js";
import { requireOwnerOrLegacyAdmin } from "../middleware/staffAuth.js";
import { requireEnum, requireBoolean } from "../lib/validate.js";

const router = Router();

const SUITE_FEATURES = ["roster", "practice_plans", "install_calendar", "game_plans", "assignments", "printing"];

/**
 * Build a features map from a list of DB rows.
 * @param {Array<{feature: string, enabled: boolean}>} rows
 * @returns {Record<string, boolean>}
 */
function buildFeaturesMap(rows) {
  const map = {};
  for (const f of SUITE_FEATURES) map[f] = false;
  for (const row of rows) {
    if (SUITE_FEATURES.includes(row.feature)) map[row.feature] = row.enabled;
  }
  return map;
}

/**
 * GET /admin/team-suite
 * Returns all non-deleted teams with their suite feature states.
 * Includes basic team info for the UI (id, name, sport, owner email).
 */
router.get("/", requireOwnerOrLegacyAdmin, async (_req, res, next) => {
  try {
    const { rows: teams } = await pool.query(
      `SELECT t.id, t.name, t.sport, t.season_year, t.is_personal, t.created_at,
              u.email AS owner_email, u.name AS owner_name
         FROM teams t
         JOIN users u ON u.id = t.owner_user_id
        WHERE t.deleted_at IS NULL
        ORDER BY t.name`
    );

    const { rows: featureRows } = await pool.query(
      `SELECT team_id, feature, enabled FROM team_suite_features`
    );

    // Group feature rows by team_id
    const featuresByTeam = {};
    for (const row of featureRows) {
      if (!featuresByTeam[row.team_id]) featuresByTeam[row.team_id] = [];
      featuresByTeam[row.team_id].push(row);
    }

    const result = teams.map((team) => ({
      ...team,
      suiteFeatures: buildFeaturesMap(featuresByTeam[team.id] || []),
    }));

    res.json({ teams: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/team-suite/:teamId
 * Returns suite feature states for a single team.
 */
router.get("/:teamId", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { rows: teams } = await pool.query(
      `SELECT t.id, t.name, t.sport FROM teams t WHERE t.id = $1 AND t.deleted_at IS NULL`,
      [teamId]
    );
    if (!teams.length) return res.status(404).json({ error: "Team not found" });

    const { rows: featureRows } = await pool.query(
      `SELECT feature, enabled FROM team_suite_features WHERE team_id = $1`,
      [teamId]
    );
    res.json({ team: teams[0], suiteFeatures: buildFeaturesMap(featureRows) });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/team-suite/:teamId/:feature
 * Toggles a single suite feature for a team.
 * Body: { enabled: boolean }
 */
router.patch("/:teamId/:feature", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { teamId, feature } = req.params;
    requireEnum(feature, SUITE_FEATURES, { field: "feature" });
    const enabled = requireBoolean(req.body?.enabled, { field: "enabled" });

    // Verify team exists
    const { rows: teams } = await pool.query(
      `SELECT id FROM teams WHERE id = $1 AND deleted_at IS NULL`,
      [teamId]
    );
    if (!teams.length) return res.status(404).json({ error: "Team not found" });

    await pool.query(
      `INSERT INTO team_suite_features (team_id, feature, enabled, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (team_id, feature)
       DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()`,
      [teamId, feature, enabled]
    );

    const { rows: featureRows } = await pool.query(
      `SELECT feature, enabled FROM team_suite_features WHERE team_id = $1`,
      [teamId]
    );
    res.json({ suiteFeatures: buildFeaturesMap(featureRows) });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /admin/team-suite/:teamId
 * Sets all suite features for a team in one call.
 * Body: { features: { roster: boolean, practice_plans: boolean, ... } }
 */
router.put("/:teamId", requireOwnerOrLegacyAdmin, async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { rows: teams } = await pool.query(
      `SELECT id FROM teams WHERE id = $1 AND deleted_at IS NULL`,
      [teamId]
    );
    if (!teams.length) return res.status(404).json({ error: "Team not found" });

    const incomingFeatures = req.body?.features;
    if (!incomingFeatures || typeof incomingFeatures !== "object") {
      return res.status(400).json({ error: "features object is required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const feature of SUITE_FEATURES) {
        if (feature in incomingFeatures) {
          const enabled = Boolean(incomingFeatures[feature]);
          await client.query(
            `INSERT INTO team_suite_features (team_id, feature, enabled, updated_at)
             VALUES ($1, $2, $3, now())
             ON CONFLICT (team_id, feature)
             DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()`,
            [teamId, feature, enabled]
          );
        }
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    const { rows: featureRows } = await pool.query(
      `SELECT feature, enabled FROM team_suite_features WHERE team_id = $1`,
      [teamId]
    );
    res.json({ suiteFeatures: buildFeaturesMap(featureRows) });
  } catch (err) {
    next(err);
  }
});

export default router;
