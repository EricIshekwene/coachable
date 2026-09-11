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
 * Mutually exclusive with `shouldShowMovedInterstitial` in every case. The
 * every-team-moved bail-out below is what makes that true: with no unmoved
 * team left there is nothing to keep working on, so the interstitial owns the
 * screen. Without it, an `activeTeamId` of null (no team selected yet) matched
 * none of the moved teams and the banner fired alongside the interstitial.
 *
 * @param {{ready: boolean, teams: Array<{teamId: string, status: string}>}} status
 * @param {string|null|undefined} activeTeamId
 * @returns {boolean}
 */
export function shouldShowMovedBanner(status, activeTeamId) {
  if (!status?.ready) return false;
  const teams = Array.isArray(status.teams) ? status.teams : [];
  const moved = teams.filter(isMovedTeam);
  if (moved.length === 0) return false;
  if (moved.length === teams.length) return false;
  return !moved.some((t) => t.teamId === activeTeamId);
}
