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

// GET /teams/:teamId/invite-code
router.get(
  "/:teamId/invite-code",
  requireAuth,
  requireTeamRole("owner", "coach"),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        "SELECT code FROM team_invite_codes WHERE team_id = $1",
        [req.params.teamId]
      );
      if (!rows.length) {
        // Generate one if missing
        const code = crypto.randomBytes(4).toString("hex").toUpperCase();
        await pool.query(
          `INSERT INTO team_invite_codes (team_id, code, created_by_user_id)
           VALUES ($1, $2, $3)`,
          [req.params.teamId, code, req.userId]
        );
        return res.json({ code });
      }
      res.json({ code: rows[0].code });
    } catch (err) {
      next(err);
    }
  }
);

// POST /teams/:teamId/invite-code/rotate
router.post(
  "/:teamId/invite-code/rotate",
  requireAuth,
  requireTeamRole("owner", "coach"),
  async (req, res, next) => {
    try {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      await pool.query(
        `UPDATE team_invite_codes
         SET code = $1, rotated_at = now()
         WHERE team_id = $2`,
        [code, req.params.teamId]
      );
      res.json({ code });
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
