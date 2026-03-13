import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

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

export default router;
