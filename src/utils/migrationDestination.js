/**
 * Where a migrated coach is sent.
 *
 * MUST be the `beta.` host. The bare apex `coachableplays.com` IS this app
 * (V1), so linking there would loop a moved coach straight back into V1.
 */
export const V2_APP_URL = "https://beta.coachableplays.com";

/**
 * Whether a team's migration status means "this team now lives in V2".
 *
 * 'migrating' is deliberately NOT treated as moved: a team mid-move still
 * works in V1 and must not be shown the moved-account message.
 *
 * @param {{status?: string}|null|undefined} team
 * @returns {boolean}
 */
export function isMovedTeam(team) {
  return team?.status === "v2_live";
}

/**
 * Whether the full "your account has moved" interstitial should replace the
 * app. Pure so it can be asserted on directly.
 *
 * Rules:
 *  - No trustworthy data (`ready` false, no teams) → false. FAIL OPEN.
 *  - No moved team → false.
 *  - Every team moved → true.
 *  - Mixed → true only while the moved team is the active one, so a coach can
 *    still work in V1 on the team that has not moved.
 *
 * @param {{ready: boolean, teams: Array<{teamId: string, status: string}>}} status
 * @param {string|null|undefined} activeTeamId
 * @returns {boolean}
 */
export function shouldShowMovedInterstitial(status, activeTeamId) {
  if (!status?.ready) return false;
  const teams = Array.isArray(status.teams) ? status.teams : [];
  if (teams.length === 0) return false;
  const moved = teams.filter(isMovedTeam);
  if (moved.length === 0) return false;
  if (moved.length === teams.length) return true;
  return moved.some((t) => t.teamId === activeTeamId);
}

/**
 * Whether the non-blocking moved-team banner should show: the coach has a
 * moved team, but the team they are working in is not it.
 *
 * @param {{ready: boolean, teams: Array<{teamId: string, status: string}>}} status
 * @param {string|null|undefined} activeTeamId
 * @returns {boolean}
 */
export function shouldShowMovedBanner(status, activeTeamId) {
  if (!status?.ready) return false;
  const moved = (Array.isArray(status.teams) ? status.teams : []).filter(isMovedTeam);
  if (moved.length === 0) return false;
  return !moved.some((t) => t.teamId === activeTeamId);
}
