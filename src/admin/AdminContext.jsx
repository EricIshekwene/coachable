import { createContext, useContext, useState } from "react";

const THEME_KEY = "coachable_admin_theme";

/**
 * @typedef {Object} AdminContextValue
 * @property {"dark"|"light"} theme
 * @property {(t: "dark"|"light") => void} setTheme
 * @property {string} basePath
 */

const AdminContext = createContext({
  theme: "dark",
  setTheme: () => {},
  basePath: "/admin",
});

/**
 * Provides admin theme (persisted to localStorage) and basePath to all
 * descendant admin components.
 * @param {{ children: React.ReactNode }} props
 */
export function AdminProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) return stored === "light" ? "light" : "dark";

      // Default based on time: light until 5pm, then dark
      const now = new Date();
      return now.getHours() < 17 ? "light" : "dark";
    } catch {
      return new Date().getHours() < 17 ? "light" : "dark";
    }
  });

  /** @param {"dark"|"light"} t */
  function setTheme(t) {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
  }

  return (
    <AdminContext.Provider value={{ theme, setTheme, basePath: "/admin" }}>
      {children}
    </AdminContext.Provider>
  );
}

/** @returns {AdminContextValue} */
export function useAdmin() {
  return useContext(AdminContext);
}
