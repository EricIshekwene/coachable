import { NavLink } from "react-router-dom";
import { useAdmin } from "../AdminContext";
import { adminPath } from "../adminNav";

const NAV_ITEMS = [
  { label: "Dashboard", path: "" },
  { label: "Plays", path: "/app" },
  { label: "Errors", path: "/errors" },
  { label: "Issues", path: "/user-issues" },
  { label: "Videos", path: "/demo-videos" },
  { label: "Tests", path: "/tests" },
];

/**
 * Horizontal pill-style navigation bar for admin pages.
 * Rendered below AdminHeader on the main dashboard.
 */
export default function AdminNav() {
  const { basePath } = useAdmin();

  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6"
      style={{ borderBottom: "1px solid var(--adm-border)" }}
    >
      {NAV_ITEMS.map(({ label, path }) => (
        <NavLink
          key={path}
          to={adminPath(basePath, path)}
          end={path === ""}
          className={({ isActive }) =>
            [
              "font-Manrope flex-shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
              isActive
                ? "text-white"
                : "hover:opacity-80",
            ].join(" ")
          }
          style={({ isActive }) =>
            isActive
              ? { backgroundColor: "var(--adm-accent)", color: "#fff" }
              : { color: "var(--adm-text2)", backgroundColor: "transparent" }
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
