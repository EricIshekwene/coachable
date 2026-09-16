/**
 * Where a migrated coach is sent.
 *
 * MUST be the `beta.` host. The bare apex `coachableplays.com` IS this app
 * (V1), so linking there would loop a moved coach straight back into V1.
 */
export const V2_APP_URL = "https://beta.coachableplays.com";
export const V2_LOGIN_RETURN_TO = "/app/plays";
const REDIRECT_MARKER_PREFIX = "coachable_v2_migration_redirect:";

/**
 * V1 only selects routes that are part of V2's normal authenticated app. It
 * never forwards a V1 location or a browser-provided return target to beta.
 */
export function getV2ReturnTo() {
  return V2_LOGIN_RETURN_TO;
}

/** Build the normal, non-authorizing V2 login destination. */
export function getV2LoginDestination() {
  const url = new URL("/login", V2_APP_URL);
  url.searchParams.set("returnTo", getV2ReturnTo());
  return url.toString();
}

/**
 * A status response is suitable for the convenience redirect only when it is
 * the latest successful client response and every known V1 membership is live.
 * Unknown, zero-team, mixed, stale, and loading states intentionally fail open.
 */
export function isTrustedAllLiveStatus(status) {
  const teams = Array.isArray(status?.teams) ? status.teams : [];
  return Boolean(status?.ready && status?.fresh && teams.length > 0 && teams.every(isMovedTeam));
}

/**
 * Keep the one-shot marker in this browser session, scoped to the signed-in
 * user, the server snapshot we observed, and beta's destination origin.
 */
export function migrationRedirectMarkerKey({ userId, snapshotGeneration, destination = V2_APP_URL }) {
  if (!userId || !snapshotGeneration) return null;
  return `${REDIRECT_MARKER_PREFIX}${userId}:${snapshotGeneration}:${new URL(destination).origin}`;
}

export function hasMigrationRedirectMarker(scope, storage = sessionStorage) {
  const key = migrationRedirectMarkerKey(scope);
  return Boolean(key && storage?.getItem(key) === "1");
}

export function markMigrationRedirect(scope, storage = sessionStorage) {
  const key = migrationRedirectMarkerKey(scope);
  if (key) storage?.setItem(key, "1");
}

/** Clear all V1-to-V2 redirect loop guards when the V1 session ends. */
export function clearMigrationRedirectMarkers(storage = sessionStorage) {
  if (!storage) return;
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(REDIRECT_MARKER_PREFIX)) storage.removeItem(key);
  }
}

/**
 * V2 accepts only its server-issued opaque intent here. A standing V1 invite
 * code is deliberately not an input to this function and cannot cross origin.
 */
export function getV2HandoffDestination(handoff) {
  if (!handoff || typeof handoff.intent !== "string" || !handoff.intent.trim()) return null;
  const url = new URL("/login", V2_APP_URL);
  url.searchParams.set("intent", handoff.intent);
  url.searchParams.set("returnTo", getV2ReturnTo());
  return url.toString();
}

export function redirectToV2Handoff(handoff) {
  const destination = getV2HandoffDestination(handoff);
  if (!destination || typeof window === "undefined") return false;
  window.location.replace(destination);
  return true;
}

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
