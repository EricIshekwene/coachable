import { NavLink } from "react-router-dom";
import { useAdmin } from "../AdminContext";
import { adminPath } from "../adminNav";

const NAV_ITEMS = [
  { label: "Dashboard", path: "", perm: "dashboard.viewAnalytics" },
  { label: "Plays", path: "/app", anyOf: ["plays.viewFolders", "pageSections.manage", "playbooks.view", "presets.create", "presets.edit", "prefabs.manage"] },
  { label: "Users", path: "/users", perm: "users.viewTable" },
  { label: "One Page", path: "/one-page", perm: "pageSections.manage" },
  { label: "Errors", path: "/errors", perm: "errors.viewReports" },
  { label: "Issues", path: "/user-issues", perm: "issues.view" },
  { label: "Videos", path: "/demo-videos", perm: "videos.addDemo" },
  { label: "Tests", path: "/tests", perm: "tests.run" },
  { label: "Staff", path: "/staff", ownerOnly: true },
];

/**
 * Horizontal pill-style navigation bar for admin pages.
 * Rendered below AdminHeader on the main dashboard.
 *
 * Items are filtered by permission. While a staff session is still
 * loading (mode="staff"), all items are hidden to avoid a flash of
 * forbidden links.
 */
export default function AdminNav() {
  const { basePath, hasPerm, isOwner, sessionLoaded } = useAdmin();
  const visibleItems = sessionLoaded
    ? NAV_ITEMS.filter((item) => {
        if (item.ownerOnly) return isOwner;
        if (isOwner) return true;
        if (item.perm) return hasPerm(item.perm);
        if (Array.isArray(item.anyOf)) return item.anyOf.some((path) => hasPerm(path));
        return true;
      })
    : [];

  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6"
      style={{ borderBottom: "1px solid var(--adm-border)" }}
    >
      {visibleItems.map(({ label, path }) => (
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
