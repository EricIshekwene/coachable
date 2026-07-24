import pool from "../db/pool.js";

/**
 * Looks up a specific team membership for a user, or null if they don't
 * belong to that team.
 * @param {string} userId
 * @param {string} teamId
 * @returns {Promise<{team_id: string, role: string}|null>}
 */
export async function findMembership(userId, teamId) {
  const { rows } = await pool.query(
    `SELECT tm.team_id, tm.role FROM team_memberships tm WHERE tm.user_id = $1 AND tm.team_id = $2`,
    [userId, teamId]
  );
  return rows[0] || null;
}

/**
 * Resolves the user's default copy target: their currently active team (the
 * one shown in the app sidebar), falling back to their earliest membership.
 * @param {string} userId
 * @returns {Promise<{team_id: string, role: string}|null>}
 */
export async function resolveDefaultMembership(userId) {
  const { rows: userRows } = await pool.query(
    "SELECT active_team_id FROM users WHERE id = $1",
    [userId]
  );
  const activeTeamId = userRows[0]?.active_team_id || null;
  if (activeTeamId) {
    const membership = await findMembership(userId, activeTeamId);
    if (membership) return membership;
  }
  const { rows } = await pool.query(
    `SELECT tm.team_id, tm.role FROM team_memberships tm WHERE tm.user_id = $1 ORDER BY tm.joined_at ASC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

/**
 * Resolves the coach-level membership to copy a play/folder into.
 * Honors an explicit `teamId` from the client (always verified server-side —
 * never trusted blindly) or falls back to the user's default team.
 * @param {string} userId
 * @param {string|null} requestedTeamId
 * @returns {Promise<{ok: true, membership: object}|{ok: false, status: number, error: string}>}
 */
export async function resolveTargetMembership(userId, requestedTeamId) {
  const membership = requestedTeamId
    ? await findMembership(userId, requestedTeamId)
    : await resolveDefaultMembership(userId);

  if (!membership) {
    return requestedTeamId
      ? { ok: false, status: 403, error: "You don't have access to that team" }
      : { ok: false, status: 400, error: "You are not a member of any team" };
  }
  if (!["owner", "coach", "assistant_coach"].includes(membership.role)) {
    return { ok: false, status: 403, error: "Only coaches can add plays to the playbook" };
  }
  return { ok: true, membership };
}
