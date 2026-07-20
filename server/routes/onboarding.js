import { Router } from "express";
import crypto from "crypto";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { seedDemoPlay } from "../lib/userTeams.js";
import { requireString, optionalString, LIMITS } from "../lib/validate.js";

const router = Router();

const SUPPORTED_SPORTS = new Set([
  "rugby",
  "soccer",
  "football",
  "lacrosse",
  "womens lacrosse",
  "women's lacrosse",
  "basketball",
  "field hockey",
  "ice hockey",
  "blank",
]);

/**
 * Converts URL/form sport variants into the canonical keys stored on teams.
 * Returns null for blank or unsupported values so onboarding stays tolerant.
 */
function normalizeSportKey(value) {
  const sport = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
  if (!sport) return null;
  if (sport === "women's lacrosse") return "womens lacrosse";
  return SUPPORTED_SPORTS.has(sport) ? sport : null;
}

/**
 * POST /onboarding/create-team
 * Creates a new team, generates invite codes, and seeds the sport's demo play
 * (from page_sections) into the team's playbook if one is assigned.
 */
router.post("/create-team", requireAuth, async (req, res, next) => {
  try {
    const teamName = requireString(req.body?.teamName, { field: "teamName", max: LIMITS.NAME });
    const rawSport = optionalString(req.body?.sport, { field: "sport", max: LIMITS.ENUM_KEY });
    const sport = normalizeSportKey(rawSport);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create team
      const teamRes = await client.query(
        `INSERT INTO teams (name, sport, owner_user_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, sport, season_year, owner_user_id, created_at`,
        [teamName, sport ?? null, req.userId]
      );
      const team = teamRes.rows[0];

      // Create team settings defaults
      await client.query(
        "INSERT INTO team_settings (team_id) VALUES ($1)",
        [team.id]
      );

      // Create membership as owner
      await client.query(
        `INSERT INTO team_memberships (team_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [team.id, req.userId]
      );

      // Generate invite codes (one for players, one for coaches)
      const playerCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      const coachCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      await client.query(
        `INSERT INTO team_invite_codes (team_id, role, code, created_by_user_id)
         VALUES ($1, 'player', $2, $3), ($1, 'coach', $4, $3)`,
        [team.id, playerCode, req.userId, coachCode]
      );

      // Seed the sport's demo play (from page_sections) into the new team's playbook
      await seedDemoPlay(client, team.id, team.sport, req.userId);

      // Mark user onboarded
      await client.query(
        "UPDATE users SET onboarded_at = now(), updated_at = now() WHERE id = $1",
        [req.userId]
      );

      await client.query("COMMIT");

      res.status(201).json({
        team: {
          id: team.id,
          name: team.name,
          sport: team.sport,
          seasonYear: team.season_year,
          ownerId: team.owner_user_id,
        },
        role: "owner",
        inviteCodes: { player: playerCode, coach: coachCode },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// POST /onboarding/join-team
router.post("/join-team", requireAuth, async (req, res, next) => {
  try {
    const inviteCode = requireString(req.body?.inviteCode, { field: "inviteCode", max: LIMITS.CODE });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Find team and role by invite code
      const codeRes = await client.query(
        "SELECT team_id, role FROM team_invite_codes WHERE code = $1",
        [inviteCode.toUpperCase()]
      );
      if (!codeRes.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Invalid invite code" });
      }

      const teamId = codeRes.rows[0].team_id;
      const requestedRole = codeRes.rows[0].role; // role determined by the code

      // Check not already a member
      const existingRes = await client.query(
        "SELECT id FROM team_memberships WHERE team_id = $1 AND user_id = $2",
        [teamId, req.userId]
      );
      if (existingRes.rows.length) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Already a member of this team" });
      }

      // Create membership
      await client.query(
        `INSERT INTO team_memberships (team_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [teamId, req.userId, requestedRole]
      );

      // Mark user onboarded
      await client.query(
        "UPDATE users SET onboarded_at = now(), updated_at = now() WHERE id = $1",
        [req.userId]
      );

      // Get team info
      const teamRes = await client.query(
        "SELECT id, name, sport, season_year, owner_user_id FROM teams WHERE id = $1",
        [teamId]
      );
      const team = teamRes.rows[0];

      await client.query("COMMIT");

      res.json({
        team: {
          id: team.id,
          name: team.name,
          sport: team.sport,
          seasonYear: team.season_year,
          ownerId: team.owner_user_id,
        },
        role: requestedRole,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// POST /onboarding/solo — skip team, create personal workspace
router.post("/solo", requireAuth, async (req, res, next) => {
  try {
    const rawSport = optionalString(req.body?.sport, { field: "sport", max: LIMITS.ENUM_KEY });
    const sport = normalizeSportKey(rawSport);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get user name for the personal workspace
      const userRes = await client.query(
        "SELECT name FROM users WHERE id = $1",
        [req.userId]
      );
      const userName = userRes.rows[0]?.name || "My";

      // Create a personal team (hidden workspace)
      const teamRes = await client.query(
        `INSERT INTO teams (name, sport, owner_user_id, is_personal)
         VALUES ($1, $2, $3, true)
         RETURNING id, name, sport, season_year, owner_user_id, created_at`,
        [`${userName}'s Plays`, sport ?? null, req.userId]
      );
      const team = teamRes.rows[0];

      // Create team settings defaults
      await client.query(
        "INSERT INTO team_settings (team_id) VALUES ($1)",
        [team.id]
      );

      // Create membership as owner
      await client.query(
        `INSERT INTO team_memberships (team_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [team.id, req.userId]
      );

      // Seed the selected sport's demo play into the personal workspace.
      await seedDemoPlay(client, team.id, team.sport, req.userId);

      // Mark user onboarded
      await client.query(
        "UPDATE users SET onboarded_at = now(), updated_at = now() WHERE id = $1",
        [req.userId]
      );

      await client.query("COMMIT");

      res.status(201).json({
        team: {
          id: team.id,
          name: team.name,
          sport: team.sport,
          seasonYear: team.season_year,
          ownerId: team.owner_user_id,
          isPersonal: true,
        },
        role: "owner",
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

export default router;
