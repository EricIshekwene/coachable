import { Router } from "express";
import crypto from "crypto";
import pool from "../db/pool.js";
import { requireAuth, requireTeamRole } from "../middleware/auth.js";

const router = Router();

// GET /teams/:teamId/members
router.get(
  "/:teamId/members",
  requireAuth,
  requireTeamRole(),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT u.id, u.name, u.email, tm.role
         FROM team_memberships tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.team_id = $1
         ORDER BY tm.joined_at`,
        [req.params.teamId]
      );
      res.json({ members: rows });
    } catch (err) {
      next(err);
    }
  }
);

// GET /teams/:teamId/invite-codes
router.get(
  "/:teamId/invite-codes",
  requireAuth,
  requireTeamRole("owner", "coach"),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        "SELECT role, code FROM team_invite_codes WHERE team_id = $1",
        [req.params.teamId]
      );

      const codes = { player: null, coach: null };
      for (const row of rows) codes[row.role] = row.code;

      // Generate any missing codes
      for (const role of ["player", "coach"]) {
        if (!codes[role]) {
          const code = crypto.randomBytes(4).toString("hex").toUpperCase();
          await pool.query(
            `INSERT INTO team_invite_codes (team_id, role, code, created_by_user_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (team_id, role) DO NOTHING`,
            [req.params.teamId, role, code, req.userId]
          );
          codes[role] = code;
        }
      }

      res.json({ codes });
    } catch (err) {
      next(err);
    }
  }
);

// POST /teams/:teamId/invite-codes/rotate
router.post(
  "/:teamId/invite-codes/rotate",
  requireAuth,
  requireTeamRole("owner", "coach"),
  async (req, res, next) => {
    try {
      const { role } = req.body;
      if (!["player", "coach"].includes(role)) {
        return res.status(400).json({ error: "role must be 'player' or 'coach'" });
      }

      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      await pool.query(
        `UPDATE team_invite_codes
         SET code = $1, rotated_at = now()
         WHERE team_id = $2 AND role = $3`,
        [code, req.params.teamId, role]
      );
      res.json({ code, role });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /teams/:teamId/settings
router.patch(
  "/:teamId/settings",
  requireAuth,
  requireTeamRole("owner"),
  async (req, res, next) => {
    try {
      const { teamName, sport, seasonYear } = req.body;

      // Update team table fields
      const setClauses = [];
      const values = [];
      let idx = 1;

      if (teamName?.trim()) {
        setClauses.push(`name = $${idx++}`);
        values.push(teamName.trim());
      }
      if (sport !== undefined) {
        setClauses.push(`sport = $${idx++}`);
        values.push(sport?.trim() || null);
      }
      if (seasonYear !== undefined) {
        setClauses.push(`season_year = $${idx++}`);
        values.push(seasonYear?.trim() || null);
      }

      if (setClauses.length) {
        setClauses.push(`updated_at = now()`);
        values.push(req.params.teamId);
        await pool.query(
          `UPDATE teams SET ${setClauses.join(", ")} WHERE id = $${idx}`,
          values
        );
      }

      // Update team_settings if assistant permissions provided
      const { assistantPermissions } = req.body;
      if (assistantPermissions) {
        const perms = assistantPermissions;
        await pool.query(
          `UPDATE team_settings SET
            assistant_can_create_edit_delete_plays = COALESCE($1, assistant_can_create_edit_delete_plays),
            assistant_can_manage_roster = COALESCE($2, assistant_can_manage_roster),
            assistant_can_send_invites = COALESCE($3, assistant_can_send_invites),
            updated_at = now()
           WHERE team_id = $4`,
          [
            perms.canCreateEditDeletePlays ?? null,
            perms.canManageRoster ?? null,
            perms.canSendInvites ?? null,
            req.params.teamId,
          ]
        );
      }

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// POST /teams/:teamId/ownership-transfer
router.post(
  "/:teamId/ownership-transfer",
  requireAuth,
  requireTeamRole("owner"),
  async (req, res, next) => {
    try {
      const { newOwnerId } = req.body;
      if (!newOwnerId) {
        return res.status(400).json({ error: "newOwnerId is required" });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Verify new owner is a member
        const memberRes = await client.query(
          "SELECT id FROM team_memberships WHERE team_id = $1 AND user_id = $2",
          [req.params.teamId, newOwnerId]
        );
        if (!memberRes.rows.length) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Target user is not a team member" });
        }

        // Transfer ownership on team
        await client.query(
          "UPDATE teams SET owner_user_id = $1, updated_at = now() WHERE id = $2",
          [newOwnerId, req.params.teamId]
        );

        // Update roles
        await client.query(
          "UPDATE team_memberships SET role = 'owner' WHERE team_id = $1 AND user_id = $2",
          [req.params.teamId, newOwnerId]
        );
        await client.query(
          "UPDATE team_memberships SET role = 'coach' WHERE team_id = $1 AND user_id = $2",
          [req.params.teamId, req.userId]
        );

        await client.query("COMMIT");
        res.json({ ok: true });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /teams/:teamId/members/:userId  (leave team or kick member)
router.delete(
  "/:teamId/members/:userId",
  requireAuth,
  requireTeamRole(),
  async (req, res, next) => {
    try {
      const targetUserId = req.params.userId;
      const isOwner = req.teamRole === "owner";
      const isSelf = targetUserId === req.userId;

      // Only owner can remove others; anyone can leave
      if (!isSelf && !isOwner) {
        return res.status(403).json({ error: "Only the owner can remove members" });
      }
      // Owner cannot leave (must transfer ownership first)
      if (isSelf && isOwner) {
        return res.status(400).json({ error: "Transfer ownership before leaving" });
      }

      await pool.query(
        "DELETE FROM team_memberships WHERE team_id = $1 AND user_id = $2",
        [req.params.teamId, targetUserId]
      );

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
