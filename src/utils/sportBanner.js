/**
 * Helpers for the "no sport selected" status banner shown in the app shell.
 *
 * Teams created before sport selection was enforced (or via the solo
 * onboarding bug fixed in 650f422) can have a NULL sport. The banner nudges
 * owners/coaches to pick one via /app/select-sport. Dismissal is
 * session-scoped and per-team (sessionStorage), so it reappears next session
 * until a sport is actually set.
 */

const DISMISS_KEY_PREFIX = "coachable:sportBannerDismissed:";

/**
 * sessionStorage key for a team's banner dismissal.
 * @param {string|null|undefined} teamId
 * @returns {string}
 */
export function sportBannerDismissKey(teamId) {
  return `${DISMISS_KEY_PREFIX}${teamId || "unknown"}`;
}

/**
 * Whether the banner was dismissed this session for the given team.
 * Safe to call in non-browser environments (returns false).
 * @param {string|null|undefined} teamId
 * @returns {boolean}
 */
export function isSportBannerDismissed(teamId) {
  try {
    return sessionStorage.getItem(sportBannerDismissKey(teamId)) === "1";
  } catch {
    return false;
  }
}

/**
 * Dismiss the banner for the given team for the rest of this session.
 * Safe to call in non-browser environments (no-op).
 * @param {string|null|undefined} teamId
 */
export function dismissSportBanner(teamId) {
  try {
    sessionStorage.setItem(sportBannerDismissKey(teamId), "1");
  } catch {
    // sessionStorage unavailable (private mode quota, non-browser) — banner
    // simply stays visible, which is the safe fallback.
  }
}

/**
 * Whether the missing-sport banner should render.
 *
 * Only owners and coaches see it — the PATCH /teams/:teamId/settings endpoint
 * that sets the sport rejects players, so showing them the banner would be a
 * dead end.
 *
 * @param {Object} state
 * @param {string} state.sport - Active team sport ("" when not set)
 * @param {string|null} state.role - User's role on the active team
 * @param {boolean} state.dismissed - Session dismissal flag for this team
 * @returns {boolean}
 */
export function shouldShowSportBanner({ sport, role, dismissed }) {
  if (sport) return false;
  if (dismissed) return false;
  return role === "owner" || role === "coach";
}
