import pool from "../db/pool.js";

/**
 * Seeds the demo play assigned to the sport's landing-page section into a new team's playbook.
 * Looks up page_sections where section_key = 'landing.visualize.<normalized_sport>'
 * (sport lowercased and spaces replaced with underscores, matching schema seed keys).
 * Silently skips if sport is null or the section has no play_id assigned.
 * @param {import('pg').PoolClient} client - Active transaction client
 * @param {string} teamId
 * @param {string|null} sport
 * @param {string} userId - Used as created_by_user_id on the new play
 */
export async function seedDemoPlay(client, teamId, sport, userId) {
  if (!sport) return;
  const sectionKey = `landing.visualize.${sport.trim().toLowerCase().replace(/\s+/g, "_")}`;
  const { rows } = await client.query(
    `SELECT pp.title, pp.play_data, pp.thumbnail_url
     FROM page_sections ps
     JOIN platform_plays pp ON pp.id = ps.play_id
     WHERE ps.section_key = $1
     LIMIT 1`,
    [sectionKey]
  );
  if (!rows.length) return;
  const seed = rows[0];
  await client.query(
    `INSERT INTO plays (team_id, title, play_data, thumbnail_url, created_by_user_id, updated_by_user_id, is_seeded)
     VALUES ($1, $2, $3, $4, $5, $5, true)`,
    [teamId, seed.title, seed.play_data, seed.thumbnail_url || null, userId]
  );
}

/**
 * Whether setting a team's sport should retroactively seed the demo play.
 *
 * Teams created without a sport (e.g. solo workspaces from the onboarding
 * bug fixed in 650f422) skipped seedDemoPlay at creation. When the sport is
 * set for the first time and the team still has no plays at all, the sport's
 * demo play is seeded as if the team had been created with it.
 *
 * @param {Object} state
 * @param {string|null} state.previousSport - Team sport before this change
 * @param {string|null} state.newSport - Sport being set (falsy = not changing)
 * @param {boolean} state.hasPlays - Whether the team has any plays (incl. archived)
 * @returns {boolean}
 */
export function shouldSeedDemoPlayOnSportSet({ previousSport, newSport, hasPlays }) {
  return Boolean(newSport) && !previousSport && !hasPlays;
}

/**
 * Returns all team memberships for a user, ordered by join date.
 * @param {string} userId
 * @returns {Promise<Array<{teamId, teamName, sport, seasonYear, ownerId, isPersonal, role}>>}
 */
export async function getUserTeams(userId) {
  const { rows } = await pool.query(
    `SELECT tm.team_id, t.name, t.sport, t.season_year, t.owner_user_id, t.is_personal, tm.role
     FROM team_memberships tm
     JOIN teams t ON t.id = tm.team_id
     WHERE tm.user_id = $1 AND t.deleted_at IS NULL
     ORDER BY tm.joined_at`,
    [userId]
  );
  return rows.map((r) => ({
    teamId: r.team_id,
    teamName: r.name,
    sport: r.sport || "",
    seasonYear: r.season_year || String(new Date().getFullYear()),
    ownerId: r.owner_user_id,
    isPersonal: r.is_personal || false,
    role: r.role,
  }));
}

/**
 * Resolves the active team for a user given a preferred team ID.
 * Falls back to the first membership if preferred team is not found.
 * @param {string} userId
 * @param {string|null} preferredTeamId - The user's active_team_id from DB
 * @returns {Promise<{activeTeam: object|null, allTeams: Array}>}
 */
export async function resolveActiveTeam(userId, preferredTeamId) {
  const allTeams = await getUserTeams(userId);
  if (!allTeams.length) return { activeTeam: null, allTeams: [] };
  const active =
    (preferredTeamId && allTeams.find((t) => t.teamId === preferredTeamId)) ||
    allTeams[0];
  return { activeTeam: active, allTeams };
}

/**
 * Creates a personal workspace for a user if they don't already have one.
 * Returns the existing one if found.
 * @param {string} userId
 * @param {import('pg').PoolClient} client - Optional transaction client
 * @returns {Promise<{teamId, teamName, sport, seasonYear, ownerId, isPersonal, role}>}
 */
export async function ensurePersonalWorkspace(userId, client) {
  const db = client || pool;

  // Check for existing personal workspace
  const existing = await db.query(
    `SELECT t.id, t.name FROM teams t
     JOIN team_memberships tm ON tm.team_id = t.id
     WHERE tm.user_id = $1 AND t.is_personal = true AND t.deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );
  if (existing.rows.length) {
    const t = existing.rows[0];
    return {
      teamId: t.id,
      teamName: t.name,
      sport: "",
      seasonYear: String(new Date().getFullYear()),
      ownerId: userId,
      isPersonal: true,
      role: "owner",
    };
  }

  // Create one
  const userRes = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
  const userName = userRes.rows[0]?.name || "My";

  const teamRes = await db.query(
    `INSERT INTO teams (name, sport, owner_user_id, is_personal)
     VALUES ($1, NULL, $2, true)
     RETURNING id, name`,
    [`${userName}'s Plays`, userId]
  );
  const team = teamRes.rows[0];

  await db.query("INSERT INTO team_settings (team_id) VALUES ($1)", [team.id]);
  await db.query(
    `INSERT INTO team_memberships (team_id, user_id, role) VALUES ($1, $2, 'owner')`,
    [team.id, userId]
  );

  return {
    teamId: team.id,
    teamName: team.name,
    sport: "",
    seasonYear: String(new Date().getFullYear()),
    ownerId: userId,
    isPersonal: true,
    role: "owner",
  };
}
