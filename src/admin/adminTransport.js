/**
 * adminTransport.js
 *
 * Shared transport for admin and staff API calls. Lives at /admin/* on the
 * server; the same routes accept either the legacy admin session header or
 * a regular user JWT (with an active staff_admins row, enforced server-side).
 *
 * The transport sends BOTH credentials whenever they're available:
 *   - `x-admin-session` header from sessionStorage (legacy admin path)
 *   - `Authorization: Bearer …` from localStorage + `credentials: "include"`
 *     so the HttpOnly session cookie tags along (staff path)
 *
 * The server picks the strongest match. Pages don't need to know which
 * mode they're in.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const ADMIN_SESSION_KEY = "coachable_admin_session";
const JWT_KEY = "coachable_token";

/**
 * Return the legacy admin session string from sessionStorage, or null.
 *
 * Important: when the UI is currently on a /staff/* route, we deliberately
 * ignore the admin session header. The same browser may hold both an admin
 * session (from a previous /admin login) and a staff JWT — without this
 * guard, the server would always pick the admin session and treat the
 * staff user as the owner. /staff UI must use JWT only.
 *
 * @returns {string | null}
 */
export function readAdminSession() {
  if (typeof sessionStorage === "undefined") return null;
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/staff")) {
    return null;
  }
  return sessionStorage.getItem(ADMIN_SESSION_KEY);
}

/**
 * Compose fetch options with whichever auth credentials are available.
 * Existing pages that already build a URL can swap their inline options
 * for `adminFetchOptions(extra)` and get correct behavior under both
 * `/admin` (legacy session) and `/staff` (JWT cookie + bearer).
 *
 * @param {RequestInit} [extra]
 * @returns {RequestInit}
 */
export function adminFetchOptions(extra = {}) {
  const headers = { ...(extra.headers || {}) };
  const adminSession = readAdminSession();
  if (adminSession) headers["x-admin-session"] = adminSession;
  if (typeof localStorage !== "undefined") {
    const jwt = localStorage.getItem(JWT_KEY);
    if (jwt && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${jwt}`;
    }
  }
  if (extra.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return {
    ...extra,
    headers,
    credentials: "include",
  };
}

/**
 * High-level helper: full URL + options + parse JSON + throw on !ok.
 * For pages that don't need granular response handling.
 *
 * @param {string} path - e.g. "/admin/users" or "/admin/plays/123"
 * @param {RequestInit} [opts]
 * @returns {Promise<any>}
 */
export async function adminApi(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(url, adminFetchOptions(opts));
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON OK for some endpoints */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Build a full URL to the API (some pages still construct raw fetch calls).
 * @param {string} path
 * @returns {string}
 */
export function adminUrl(path) {
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}

export { API_URL, ADMIN_SESSION_KEY, JWT_KEY };
