import { Router } from "express";
import crypto from "crypto";
import pool from "../db/pool.js";
import { requireAuth, requireTeamRole } from "../middleware/auth.js";
import { sendTeamInviteEmail, sendMemberRemovedEmail } from "../lib/email.js";
import { resolveActiveTeam, ensurePersonalWorkspace, getUserTeams } from "../lib/userTeams.js";

const router = Router();

// ============================================================
// Post-onboarding team management routes (no :teamId param)
// ============================================================

// POST /teams/join — join a team via invite code (works when already onboarded)
router.post("/join", requireAuth, async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode?.trim()) {
      return res.status(400).json({ error: "inviteCode is required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Look up invite code
      const codeRes = await client.query(
        "SELECT team_id, role FROM team_invite_codes WHERE code = $1",
        [inviteCode.trim().toUpperCase()]
      );
      if (!codeRes.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Invalid invite code" });
      }

      const { team_id: teamId, role } = codeRes.rows[0];

      // Prevent duplicate membership
      const existing = await client.query(
        "SELECT id FROM team_memberships WHERE team_id = $1 AND user_id = $2",
        [teamId, req.userId]
      );
      if (existing.rows.length) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "You are already a member of this team" });
      }

      await client.query(
        "INSERT INTO team_memberships (team_id, user_id, role) VALUES ($1, $2, $3)",
        [teamId, req.userId, role]
      );

      // Switch active team to the newly joined one
      await client.query(
        "UPDATE users SET active_team_id = $1, updated_at = now() WHERE id = $2",
        [teamId, req.userId]
      );

      await client.query("COMMIT");

      const { activeTeam, allTeams } = await resolveActiveTeam(req.userId, teamId);
      res.json({ newActiveTeam: activeTeam, allTeams });
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

// POST /teams/create — create a new real team (works when already onboarded)
router.post("/create", requireAuth, async (req, res, next) => {
  try {
    const { teamName, sport } = req.body;
    if (!teamName?.trim()) {
      return res.status(400).json({ error: "teamName is required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const teamRes = await client.query(
        `INSERT INTO teams (name, sport, owner_user_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, sport, season_year, owner_user_id`,
        [teamName.trim(), sport?.trim() || null, req.userId]
      );
      const team = teamRes.rows[0];

      await client.query("INSERT INTO team_settings (team_id) VALUES ($1)", [team.id]);
      await client.query(
        "INSERT INTO team_memberships (team_id, user_id, role) VALUES ($1, $2, 'owner')",
        [team.id, req.userId]
      );

      // Generate invite codes
      const playerCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      const coachCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      await client.query(
        `INSERT INTO team_invite_codes (team_id, role, code, created_by_user_id)
         VALUES ($1, 'player', $2, $3), ($1, 'coach', $4, $3)`,
        [team.id, playerCode, req.userId, coachCode]
      );

      // Switch active team
      await client.query(
        "UPDATE users SET active_team_id = $1, updated_at = now() WHERE id = $2",
        [team.id, req.userId]
      );

      await client.query("COMMIT");

      const { activeTeam, allTeams } = await resolveActiveTeam(req.userId, team.id);
      res.status(201).json({ newActiveTeam: activeTeam, allTeams, inviteCodes: { player: playerCode, coach: coachCode } });
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

// POST /teams/create-personal — create a new personal workspace (always creates new, with optional name/sport)
router.post("/create-personal", requireAuth, async (req, res, next) => {
  try {
    const { name: rawName, sport: rawSport } = req.body;
    const sport = rawSport?.trim().toLowerCase() || null;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Resolve workspace name — auto-number if no name provided
      let workspaceName;
      if (rawName?.trim()) {
        workspaceName = rawName.trim();
      } else {
        const { rows: existing } = await client.query(
          `SELECT t.name FROM teams t
           JOIN team_memberships tm ON tm.team_id = t.id
           WHERE tm.user_id = $1 AND t.is_personal = true`,
          [req.userId]
        );
        const takenNames = new Set(existing.map((r) => r.name));
        workspaceName = "Personal Workspace";
        let counter = 1;
        while (takenNames.has(workspaceName)) {
          workspaceName = `Personal Workspace (${counter++})`;
        }
      }

      // Create the workspace
      const teamRes = await client.query(
        `INSERT INTO teams (name, sport, owner_user_id, is_personal)
         VALUES ($1, $2, $3, true)
         RETURNING id, name`,
        [workspaceName, sport, req.userId]
      );
      const team = teamRes.rows[0];

      await client.query("INSERT INTO team_settings (team_id) VALUES ($1)", [team.id]);
      await client.query(
        `INSERT INTO team_memberships (team_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [team.id, req.userId]
      );

      // Switch active team
      await client.query(
        "UPDATE users SET active_team_id = $1, updated_at = now() WHERE id = $2",
        [team.id, req.userId]
      );

      await client.query("COMMIT");

      const { activeTeam, allTeams } = await resolveActiveTeam(req.userId, team.id);
      res.json({ newActiveTeam: activeTeam, allTeams });
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

// ============================================================
// Per-team routes
// ============================================================

// POST /teams/:teamId/switch — switch the user's active team
router.post("/:teamId/switch", requireAuth, requireTeamRole(), async (req, res, next) => {
  try {
    await pool.query(
      "UPDATE users SET active_team_id = $1, updated_at = now() WHERE id = $2",
      [req.params.teamId, req.userId]
    );
    const { activeTeam, allTeams } = await resolveActiveTeam(req.userId, req.params.teamId);
    res.json({ activeTeam, allTeams });
  } catch (err) {
    next(err);
  }
});

// POST /teams/:teamId/leave — leave or delete a team (all roles)
router.post("/:teamId/leave", requireAuth, requireTeamRole(), async (req, res, next) => {
  try {
    const teamId = req.params.teamId;
    const userId = req.userId;
    const userRole = req.teamRole;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let wasTeamDeleted = false;

      if (userRole === "owner") {
        // Count members to decide if owner can leave
        const memberCount = await client.query(
          "SELECT COUNT(*) FROM team_memberships WHERE team_id = $1",
          [teamId]
        );
        const count = parseInt(memberCount.rows[0].count, 10);

        if (count > 1) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: "You must transfer ownership before leaving this team.",
            needsOwnerTransfer: true,
          });
        }

        // Sole owner — soft-delete the team (cached for 30 days; restorable via admin)
        await client.query(
          "UPDATE teams SET deleted_at = now(), updated_at = now() WHERE id = $1",
          [teamId]
        );
        wasTeamDeleted = true;
      } else {
        // player / assistant_coach / coach — free to leave
        await client.query(
          "DELETE FROM team_memberships WHERE team_id = $1 AND user_id = $2",
          [teamId, userId]
        );
      }

      // Determine new active team
      const remainingTeams = await getUserTeams(userId);
      let newActiveTeamId = null;

      if (remainingTeams.length === 0) {
        // No teams left — auto-create personal workspace
        const personal = await ensurePersonalWorkspace(userId, client);
        newActiveTeamId = personal.teamId;
      } else {
        // Use first remaining team that isn't the one just left
        newActiveTeamId = remainingTeams[0].teamId;
      }

      await client.query(
        "UPDATE users SET active_team_id = $1, updated_at = now() WHERE id = $2",
        [newActiveTeamId, userId]
      );

      await client.query("COMMIT");

      const { activeTeam, allTeams } = await resolveActiveTeam(userId, newActiveTeamId);
      res.json({ ok: true, newActiveTeam: activeTeam, allTeams, wasTeamDeleted });
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
  requireTeamRole("owner", "coach"),
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

// POST /teams/:teamId/invites — send invite email
router.post(
  "/:teamId/invites",
  requireAuth,
  requireTeamRole("owner", "coach"),
  async (req, res, next) => {
    try {
      const { email, role } = req.body;
      if (!email?.trim()) {
        return res.status(400).json({ error: "email is required" });
      }
      if (!["player", "coach"].includes(role)) {
        return res.status(400).json({ error: "role must be 'player' or 'coach'" });
      }

      // Get the invite code for this role
      const { rows: codeRows } = await pool.query(
        "SELECT code FROM team_invite_codes WHERE team_id = $1 AND role = $2",
        [req.params.teamId, role]
      );
      if (!codeRows.length) {
        return res.status(404).json({ error: "No invite code found for this role" });
      }

      // Get team name and inviter name
      const { rows: teamRows } = await pool.query(
        "SELECT name FROM teams WHERE id = $1",
        [req.params.teamId]
      );
      const { rows: userRows } = await pool.query(
        "SELECT name FROM users WHERE id = $1",
        [req.userId]
      );

      const inviteCode = codeRows[0].code;
      const teamName = teamRows[0]?.name || "a team";
      const inviterName = userRows[0]?.name || "Your coach";

      // Record the invite
      const token = crypto.randomBytes(16).toString("hex");
      await pool.query(
        `INSERT INTO team_invites (team_id, invited_by_user_id, contact_email, requested_role, token, expires_at)
         VALUES ($1, $2, $3, $4, $5, now() + interval '7 days')`,
        [req.params.teamId, req.userId, email.trim().toLowerCase(), role, token]
      );

      // Send the email
      await sendTeamInviteEmail({
        toEmail: email.trim(),
        inviteCode,
        role,
        teamName,
        inviterName,
      });

      res.json({ ok: true });
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

      // Fetch target user + team info before deleting
      const [targetResult, teamResult, removerResult] = await Promise.all([
        pool.query("SELECT name, email FROM users WHERE id = $1", [targetUserId]),
        pool.query("SELECT name FROM teams WHERE id = $1", [req.params.teamId]),
        pool.query("SELECT name FROM users WHERE id = $1", [req.userId]),
      ]);
      const targetUser = targetResult.rows[0];
      const teamName = teamResult.rows[0]?.name;
      const removerName = removerResult.rows[0]?.name;

      await pool.query(
        "DELETE FROM team_memberships WHERE team_id = $1 AND user_id = $2",
        [req.params.teamId, targetUserId]
      );

      // Send removal notification email (fire and forget)
      if (!isSelf && targetUser?.email) {
        sendMemberRemovedEmail({
          toEmail: targetUser.email,
          memberName: targetUser.name,
          teamName,
          removedByName: removerName,
        }).catch((emailErr) => console.error("Failed to send removal email:", emailErr.message));
      }

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
