import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { generateCode, sendEmailChangeVerification } from "../lib/email.js";

const router = Router();
const CODE_EXPIRY_MINUTES = 10;

// PATCH /users/me
router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    const { rows } = await pool.query(
      `UPDATE users SET name = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, name, email`,
      [name.trim(), req.userId]
    );

    if (!rows.length) return res.status(404).json({ error: "User not found" });

    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /users/me/preferences
router.patch("/me/preferences", requireAuth, async (req, res, next) => {
  try {
    const {
      theme,
      playerViewMode,
      playersJoinTeam,
      coachesMakeChanges,
      inviteAccepted,
      newPlays,
      playUpdates,
      teamAnnouncements,
    } = req.body;

    // Upsert preferences
    const { rows } = await pool.query(
      `INSERT INTO user_preferences (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET
         theme = COALESCE($2, user_preferences.theme),
         player_view_mode = COALESCE($3, user_preferences.player_view_mode),
         notify_players_join_team = COALESCE($4, user_preferences.notify_players_join_team),
         notify_coaches_make_changes = COALESCE($5, user_preferences.notify_coaches_make_changes),
         notify_invite_accepted = COALESCE($6, user_preferences.notify_invite_accepted),
         notify_new_plays = COALESCE($7, user_preferences.notify_new_plays),
         notify_play_updates = COALESCE($8, user_preferences.notify_play_updates),
         notify_team_announcements = COALESCE($9, user_preferences.notify_team_announcements),
         updated_at = now()
       RETURNING *`,
      [
        req.userId,
        theme ?? null,
        playerViewMode ?? null,
        playersJoinTeam ?? null,
        coachesMakeChanges ?? null,
        inviteAccepted ?? null,
        newPlays ?? null,
        playUpdates ?? null,
        teamAnnouncements ?? null,
      ]
    );

    const prefs = rows[0];
    res.json({
      preferences: {
        theme: prefs.theme,
        playerViewMode: prefs.player_view_mode,
        notifications: {
          playersJoinTeam: prefs.notify_players_join_team,
          coachesMakeChanges: prefs.notify_coaches_make_changes,
          inviteAccepted: prefs.notify_invite_accepted,
          newPlays: prefs.notify_new_plays,
          playUpdates: prefs.notify_play_updates,
          teamAnnouncements: prefs.notify_team_announcements,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /users/me/change-email — send verification code to the new email
router.post("/me/change-email", requireAuth, async (req, res, next) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail?.trim()) {
      return res.status(400).json({ error: "newEmail is required" });
    }

    const trimmedEmail = newEmail.trim().toLowerCase();

    // Get current user
    const { rows: userRows } = await pool.query(
      "SELECT id, name, email FROM users WHERE id = $1",
      [req.userId]
    );
    if (!userRows.length) return res.status(404).json({ error: "User not found" });
    const user = userRows[0];

    if (trimmedEmail === user.email) {
      return res.status(400).json({ error: "New email is the same as current email" });
    }

    // Check if email is already taken
    const { rows: existing } = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [trimmedEmail]
    );
    if (existing.length) {
      return res.status(409).json({ error: "Email already in use" });
    }

    // Rate-limit: max 1 code per 60 seconds
    const recent = await pool.query(
      `SELECT id FROM email_verification_codes
       WHERE user_id = $1 AND created_at > now() - interval '60 seconds'
       LIMIT 1`,
      [req.userId]
    );
    if (recent.rows.length) {
      return res.status(429).json({ error: "Please wait before requesting a new code" });
    }

    const code = generateCode();

    // Invalidate old unused codes
    await pool.query(
      `UPDATE email_verification_codes SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL`,
      [req.userId]
    );

    // Insert new code — store the NEW email so we know what to change to
    await pool.query(
      `INSERT INTO email_verification_codes (user_id, email, code, expires_at)
       VALUES ($1, $2, $3, now() + interval '${CODE_EXPIRY_MINUTES} minutes')`,
      [req.userId, trimmedEmail, code]
    );

    await sendEmailChangeVerification(trimmedEmail, code, user.name);

    res.json({ ok: true, message: "Verification code sent to new email" });
  } catch (err) {
    next(err);
  }
});

// POST /users/me/confirm-email-change — verify code and update email
router.post("/me/confirm-email-change", requireAuth, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code?.trim()) {
      return res.status(400).json({ error: "Verification code is required" });
    }

    // Find valid, unused code for this user
    const { rows } = await pool.query(
      `SELECT id, email FROM email_verification_codes
       WHERE user_id = $1 AND code = $2 AND used_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.userId, code.trim()]
    );

    if (!rows.length) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const newEmail = rows[0].email;

    // Double-check email not taken (race condition guard)
    const { rows: existing } = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND id != $2",
      [newEmail, req.userId]
    );
    if (existing.length) {
      return res.status(409).json({ error: "Email already in use" });
    }

    // Mark code as used
    await pool.query(
      "UPDATE email_verification_codes SET used_at = now() WHERE id = $1",
      [rows[0].id]
    );

    // Update user email
    await pool.query(
      "UPDATE users SET email = $1, updated_at = now() WHERE id = $2",
      [newEmail, req.userId]
    );

    res.json({ ok: true, email: newEmail });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already in use" });
    }
    next(err);
  }
});

export default router;
