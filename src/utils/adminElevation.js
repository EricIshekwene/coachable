/**
 * adminElevation.js
 *
 * Shared utility for Danger Mode (elevated admin permissions).
 * Stores the expiry timestamp in sessionStorage so both Admin.jsx and
 * AdminPlaysPage.jsx can read/write it consistently.
 *
 * The server independently enforces elevation via requireElevated middleware,
 * so this is purely for driving the client-side UI (badge, gating modals).
 */

const ELEVATED_KEY = "coachable_admin_elevated_until";
let fallbackElevatedUntil = null;

function getElevationStorage() {
  if (typeof sessionStorage !== "undefined") {
    return sessionStorage;
  }
  return {
    getItem(key) {
      return key === ELEVATED_KEY ? fallbackElevatedUntil : null;
    },
    setItem(key, value) {
      if (key === ELEVATED_KEY) fallbackElevatedUntil = String(value);
    },
    removeItem(key) {
      if (key === ELEVATED_KEY) fallbackElevatedUntil = null;
    },
  };
}

/** Duration the server grants after a successful /admin/elevate call (ms). */
export const ELEVATED_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Returns true if Danger Mode is currently active (not expired).
 * @returns {boolean}
 */
export function isAdminElevated() {
  const val = getElevationStorage().getItem(ELEVATED_KEY);
  if (!val) return false;
  return Date.now() < Number(val);
}

/**
 * Returns the timestamp (ms since epoch) when Danger Mode expires, or 0.
 * @returns {number}
 */
export function getAdminElevatedUntil() {
  return Number(getElevationStorage().getItem(ELEVATED_KEY) || 0);
}

/**
 * Stores the elevated-until timestamp in sessionStorage.
 * @param {number} elevatedUntil - Expiry timestamp in ms (from server response)
 */
export function setAdminElevated(elevatedUntil) {
  getElevationStorage().setItem(ELEVATED_KEY, String(elevatedUntil));
}

/**
 * Clears Danger Mode (e.g. on logout).
 */
export function clearAdminElevated() {
  getElevationStorage().removeItem(ELEVATED_KEY);
}
