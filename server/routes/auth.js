import { Router } from "express";
import bcrypt from "bcrypt";
import pool from "../db/pool.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();
const SALT_ROUNDS = 10;

// POST /auth/signup
router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, onboarded_at, created_at`,
      [name.trim(), email.trim().toLowerCase(), hash]
    );

    // Create default preferences row
    await pool.query(
      "INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING",
      [rows[0].id]
    );

    const token = signToken(rows[0].id);
    res.status(201).json({ token, user: rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
    next(err);
  }
});

// POST /auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const { rows } = await pool.query(
      "SELECT id, name, email, password_hash, onboarded_at FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );
    if (!rows.length) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Fetch team context if onboarded
    let team = null;
    let membership = null;
    if (user.onboarded_at) {
      const memberRes = await pool.query(
        `SELECT tm.role, tm.team_id, t.name AS team_name, t.sport, t.season_year, t.logo_url, t.owner_user_id
         FROM team_memberships tm
         JOIN teams t ON t.id = tm.team_id
         WHERE tm.user_id = $1
         LIMIT 1`,
        [user.id]
      );
      if (memberRes.rows.length) {
        const m = memberRes.rows[0];
        team = {
          id: m.team_id,
          name: m.team_name,
          sport: m.sport,
          seasonYear: m.season_year,
          teamLogo: m.logo_url || "",
          ownerId: m.owner_user_id,
        };
        membership = { role: m.role };
      }
    }

    const token = signToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        onboarded: Boolean(user.onboarded_at),
        role: membership?.role || null,
        teamId: team?.id || null,
        teamName: team?.name || null,
        sport: team?.sport || "",
        seasonYear: team?.seasonYear || String(new Date().getFullYear()),
        teamLogo: team?.teamLogo || "",
        ownerId: team?.ownerId || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout  (stateless JWT — client just discards token)
router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

// GET /auth/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, onboarded_at FROM users WHERE id = $1",
      [req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });

    const user = rows[0];

    // Fetch team context
    let team = null;
    let membership = null;
    if (user.onboarded_at) {
      const memberRes = await pool.query(
        `SELECT tm.role, tm.team_id, t.name AS team_name, t.sport, t.season_year, t.logo_url, t.owner_user_id
         FROM team_memberships tm
         JOIN teams t ON t.id = tm.team_id
         WHERE tm.user_id = $1
         LIMIT 1`,
        [user.id]
      );
      if (memberRes.rows.length) {
        const m = memberRes.rows[0];
        team = {
          id: m.team_id,
          name: m.team_name,
          sport: m.sport,
          seasonYear: m.season_year,
          teamLogo: m.logo_url || "",
          ownerId: m.owner_user_id,
        };
        membership = { role: m.role };
      }
    }

    // Fetch preferences
    const prefRes = await pool.query(
      "SELECT * FROM user_preferences WHERE user_id = $1",
      [user.id]
    );
    const prefs = prefRes.rows[0] || {};

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        onboarded: Boolean(user.onboarded_at),
        role: membership?.role || null,
        teamId: team?.id || null,
        teamName: team?.name || null,
        sport: team?.sport || "",
        seasonYear: team?.seasonYear || String(new Date().getFullYear()),
        teamLogo: team?.teamLogo || "",
        ownerId: team?.ownerId || null,
        notifications: {
          playersJoinTeam: prefs.notify_players_join_team ?? true,
          coachesMakeChanges: prefs.notify_coaches_make_changes ?? true,
          inviteAccepted: prefs.notify_invite_accepted ?? true,
        },
        assistantPermissions: {
          canCreateEditDeletePlays: true,
          canManageRoster: true,
          canSendInvites: false,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
