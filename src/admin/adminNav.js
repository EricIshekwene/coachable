/**
 * Build an admin-scoped URL using the current basePath.
 * Use this everywhere instead of hardcoding "/admin/...".
 *
 * @param {string} basePath - e.g. "/admin" or "/admin2"
 * @param {string} path - e.g. "/users/123" or "" for dashboard root
 * @returns {string}
 */
export function adminPath(basePath, path) {
  return `${basePath}${path}`;
}
