import { Router } from "express";
import crypto from "crypto";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /onboarding/create-team
router.post("/create-team", requireAuth, async (req, res, next) => {
  try {
    const { teamName, sport } = req.body;
    if (!teamName?.trim()) {
      return res.status(400).json({ error: "teamName is required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create team
      const teamRes = await client.query(
        `INSERT INTO teams (name, sport, owner_user_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, sport, season_year, owner_user_id, created_at`,
        [teamName.trim(), sport?.trim() || null, req.userId]
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
    const { inviteCode } = req.body;
    if (!inviteCode?.trim()) {
      return res.status(400).json({ error: "inviteCode is required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Find team and role by invite code
      const codeRes = await client.query(
        "SELECT team_id, role FROM team_invite_codes WHERE code = $1",
        [inviteCode.trim().toUpperCase()]
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

export default router;
