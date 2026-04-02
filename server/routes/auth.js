import { Router } from "express";
import bcrypt from "bcrypt";
import pool from "../db/pool.js";
import { signToken, setSessionCookie, clearSessionCookie, requireAuth } from "../middleware/auth.js";
import { generateCode, sendVerificationEmail, sendPasswordResetEmail } from "../lib/email.js";

const router = Router();
const SALT_ROUNDS = 10;

/** Toggle email verification via REQUIRE_EMAIL_VERIFICATION env var (default: false) */
const REQUIRE_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION === "true";

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

    const user = rows[0];
    const token = signToken(user.id);

    // If verification is required, send a code
    let requiresVerification = false;
    if (REQUIRE_VERIFICATION) {
      requiresVerification = true;
      try {
        const code = generateCode();
        await pool.query(
          `INSERT INTO email_verification_codes (user_id, email, code, expires_at)
           VALUES ($1, $2, $3, now() + interval '10 minutes')`,
          [user.id, user.email, code]
        );
        await sendVerificationEmail(user.email, code, user.name);
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr.message);
        // Don't block signup if email fails — they can resend from the verify page
      }
    }

    setSessionCookie(res, token);
    res.status(201).json({ token, user, requiresVerification });
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
      "SELECT id, name, email, password_hash, onboarded_at, is_beta_tester FROM users WHERE email = $1",
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
        `SELECT tm.role, tm.team_id, t.name AS team_name, t.sport, t.season_year, t.owner_user_id, t.is_personal
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
          ownerId: m.owner_user_id,
          isPersonal: m.is_personal || false,
        };
        membership = { role: m.role };
      }
    }

    const token = signToken(user.id);
    setSessionCookie(res, token);
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
        ownerId: team?.ownerId || null,
        isPersonalTeam: team?.isPersonal || false,
        isBetaTester: user.is_beta_tester || false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout — clear session cookie
router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// GET /auth/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, email_verified_at, onboarded_at, is_beta_tester FROM users WHERE id = $1",
      [req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });

    const user = rows[0];

    // Fetch team context
    let team = null;
    let membership = null;
    if (user.onboarded_at) {
      const memberRes = await pool.query(
        `SELECT tm.role, tm.team_id, t.name AS team_name, t.sport, t.season_year, t.owner_user_id, t.is_personal
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
          ownerId: m.owner_user_id,
          isPersonal: m.is_personal || false,
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
        emailVerified: Boolean(user.email_verified_at),
        onboarded: Boolean(user.onboarded_at),
        role: membership?.role || null,
        teamId: team?.id || null,
        teamName: team?.name || null,
        sport: team?.sport || "",
        seasonYear: team?.seasonYear || String(new Date().getFullYear()),
        ownerId: team?.ownerId || null,
        isPersonalTeam: team?.isPersonal || false,
        isBetaTester: user.is_beta_tester || false,
        notifications: {
          playersJoinTeam: prefs.notify_players_join_team ?? true,
          coachesMakeChanges: prefs.notify_coaches_make_changes ?? true,
          inviteAccepted: prefs.notify_invite_accepted ?? true,
          newPlays: prefs.notify_new_plays ?? true,
          playUpdates: prefs.notify_play_updates ?? true,
          teamAnnouncements: prefs.notify_team_announcements ?? true,
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

// POST /auth/forgot-password — send a 6-digit reset code to the user's email
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Always return success to avoid leaking whether the email exists
    const { rows } = await pool.query(
      "SELECT id, name, email FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (!rows.length) {
      // Don't reveal that the email doesn't exist
      return res.json({ ok: true });
    }

    const user = rows[0];

    // Rate limit: check if a code was sent in the last 60 seconds
    const recentCheck = await pool.query(
      `SELECT created_at FROM password_reset_codes
       WHERE user_id = $1 AND created_at > now() - interval '60 seconds'
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );
    if (recentCheck.rows.length) {
      return res.status(429).json({ error: "Please wait 60 seconds before requesting another code" });
    }

    // Invalidate all previous unused codes for this user
    await pool.query(
      `UPDATE password_reset_codes SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );

    // Generate and store new code
    const code = generateCode();
    await pool.query(
      `INSERT INTO password_reset_codes (user_id, email, code, expires_at)
       VALUES ($1, $2, $3, now() + interval '10 minutes')`,
      [user.id, user.email, code]
    );

    // Send email
    try {
      await sendPasswordResetEmail(user.email, code, user.name);
    } catch (emailErr) {
      console.error("Failed to send password reset email:", emailErr.message);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /auth/reset-password — verify code and set new password
router.post("/reset-password", async (req, res, next) => {
  try {
    const { email, code, password } = req.body;
    if (!email?.trim() || !code?.trim() || !password) {
      return res.status(400).json({ error: "Email, code, and new password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find valid, unused code for this email
    const { rows } = await pool.query(
      `SELECT prc.id, prc.user_id FROM password_reset_codes prc
       JOIN users u ON u.id = prc.user_id
       WHERE prc.email = $1
         AND prc.code = $2
         AND prc.used_at IS NULL
         AND prc.expires_at > now()
       ORDER BY prc.created_at DESC
       LIMIT 1`,
      [normalizedEmail, code.trim()]
    );

    if (!rows.length) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const { id: codeId, user_id: userId } = rows[0];

    // Hash new password and update
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2", [hash, userId]);

    // Mark code as used
    await pool.query("UPDATE password_reset_codes SET used_at = now() WHERE id = $1", [codeId]);

    // Invalidate all other unused codes for this user
    await pool.query(
      `UPDATE password_reset_codes SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /auth/config — public endpoint for frontend feature flags
router.get("/config", (_req, res) => {
  res.json({ requireEmailVerification: REQUIRE_VERIFICATION });
});

export default router;
