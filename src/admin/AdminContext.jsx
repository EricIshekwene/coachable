import { createContext, useContext, useEffect, useState } from "react";
import { adminApi } from "./adminTransport";

const THEME_KEY = "coachable_admin_theme";

/**
 * @typedef {Object} AdminContextValue
 * @property {"dark"|"light"} theme
 * @property {(t: "dark"|"light") => void} setTheme
 * @property {string} basePath - "/admin" or "/staff"
 * @property {"legacy_admin"|"owner_jwt"|"staff"|"unknown"} authMode
 * @property {boolean} isOwner
 * @property {object|null} permissions - null = owner (implicit all)
 * @property {(path: string) => boolean} hasPerm
 * @property {(permPath: string, sport: string) => boolean} hasSportScope
 * @property {boolean} canDangerMode
 * @property {boolean} sessionLoaded - has the /staff/session probe finished?
 */

const AdminContext = createContext({
  theme: "dark",
  setTheme: () => {},
  basePath: "/admin",
  authMode: "unknown",
  isOwner: false,
  permissions: null,
  hasPerm: () => false,
  hasSportScope: () => false,
  canDangerMode: false,
  sessionLoaded: true,
});

/** Walk a dotted path through a permissions object. */
function getPermAtPath(perms, path) {
  if (!perms || typeof perms !== "object") return undefined;
  const segs = path.split(".");
  let cur = perms;
  for (const s of segs) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[s];
  }
  return cur;
}

/**
 * Provides admin theme, basePath, and (when running in staff mode) the
 * caller's permissions snapshot. The legacy `/admin` flow has basePath
 * "/admin" and (until proven otherwise) is treated as owner. The new
 * `/staff` flow probes `/staff/session` to load the staff actor.
 *
 * @param {{ children: React.ReactNode, basePath?: string, mode?: "admin"|"staff" }} props
 */
export function AdminProvider({ children, basePath = "/admin", mode = "admin" }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) return stored === "light" ? "light" : "dark";
      const now = new Date();
      return now.getHours() < 17 ? "light" : "dark";
    } catch {
      return new Date().getHours() < 17 ? "light" : "dark";
    }
  });

  // Staff session state: only meaningful when mode === "staff"
  const [staffSession, setStaffSession] = useState(null);
  const [sessionLoaded, setSessionLoaded] = useState(mode !== "staff");

  useEffect(() => {
    if (mode !== "staff") return;
    let cancelled = false;
    setSessionLoaded(false);
    adminApi("/staff/session")
      .then((data) => {
        if (!cancelled) {
          setStaffSession(data);
          setSessionLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStaffSession(null);
          setSessionLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [mode]);

  /** @param {"dark"|"light"} t */
  function setTheme(t) {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
  }

  // Derive auth model
  const isStaffMode = mode === "staff";
  const authMode = isStaffMode
    ? staffSession?.authMode || "unknown"
    : "legacy_admin"; // /admin is always legacy (admin password) for now
  const isOwner = isStaffMode
    ? Boolean(staffSession?.isOwner)
    : true; // /admin login is owner-equivalent
  const permissions = isStaffMode ? (staffSession?.permissions ?? null) : null;
  // Danger Mode only via legacy /admin
  const canDangerMode = !isStaffMode;

  function hasPerm(path) {
    if (isOwner) return true;
    return getPermAtPath(permissions, path) === true;
  }

  function hasSportScope(permPath, sport) {
    if (isOwner) return true;
    const scope = getPermAtPath(permissions, permPath);
    if (scope === "*") return true;
    if (!Array.isArray(scope)) return false;
    // Case-insensitive: scope is stored lowercase from the invite UI but
    // resources surface capitalized sport names ("Rugby"). Normalize both.
    const target = String(sport ?? "").trim().toLowerCase();
    if (!target) return false;
    return scope.some((s) => String(s ?? "").trim().toLowerCase() === target);
  }

  return (
    <AdminContext.Provider
      value={{
        theme,
        setTheme,
        basePath,
        authMode,
        isOwner,
        permissions,
        hasPerm,
        hasSportScope,
        canDangerMode,
        sessionLoaded,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

/** @returns {AdminContextValue} */
export function useAdmin() {
  return useContext(AdminContext);
}
