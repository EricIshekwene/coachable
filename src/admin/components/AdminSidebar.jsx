import { NavLink, Link } from "react-router-dom";
import { useAdmin } from "../AdminContext";
import { adminPath } from "../adminNav";
import darkLogo from "../../assets/logos/full_Coachable_logo.png";
import whiteLogo from "../../assets/logos/White_Full_Coachable.png";

function DashboardIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" rx="1" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1" strokeLinejoin="round" />
    </svg>
  );
}

function PlaysIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653Z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function OnePageIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h6.879c.398 0 .779.158 1.06.44l4.371 4.37c.281.282.44.663.44 1.061V19.5A1.5 1.5 0 0118.75 21h-11.5a1.5 1.5 0 01-1.5-1.5v-14a1.5 1.5 0 011.5-1.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3.75V8.25h4.5M9 12h6M9 15.75h6" />
    </svg>
  );
}

function DesignRulesIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.5h9A1.5 1.5 0 0118 6v12a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 18V6A1.5 1.5 0 017.5 4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25h6M9 12h6M9 15.75h3.75" />
    </svg>
  );
}

function ErrorsIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

function IssuesIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0Zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0Zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  );
}

function VideosIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function TestsIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.548 2.798H6.346c-1.578 0-2.548-1.798-1.548-2.798L5 14.5" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function NotificationsIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function StaffIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function FeatureFlagsIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6a1 1 0 010 0H3m0 0V5m0 2v2m18-2a9 9 0 11-18 0" />
      <circle cx="17" cy="7" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17h10m0 0a3 3 0 106 0 3 3 0 00-6 0z" />
    </svg>
  );
}

function OutreachIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 11-5.8-1.6" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { label: "Dashboard", path: "", icon: <DashboardIcon />, perm: "dashboard.viewAnalytics" },
  { label: "Plays", path: "/app", icon: <PlaysIcon />, anyOf: ["plays.viewFolders", "pageSections.manage", "playbooks.view", "presets.create", "presets.edit", "prefabs.manage"] },
  { label: "Users", path: "/users", icon: <UsersIcon />, perm: "users.viewTable" },
  { label: "One Page", path: "/one-page", icon: <OnePageIcon />, perm: "pageSections.manage" },
  { label: "Design System", path: "/design-rules", icon: <DesignRulesIcon />, adminOnly: true },
  { label: "Errors", path: "/errors", icon: <ErrorsIcon />, perm: "errors.viewReports" },
  { label: "Issues", path: "/user-issues", icon: <IssuesIcon />, perm: "issues.view" },
  { label: "Videos", path: "/demo-videos", icon: <VideosIcon />, perm: "videos.addDemo" },
  { label: "Tests", path: "/tests", icon: <TestsIcon />, perm: "tests.run" },
  { label: "Email", path: "/email", icon: <EmailIcon />, ownerOnly: true },
  { label: "Recurring", path: "/email/recurring", icon: <EmailIcon />, ownerOnly: true },
  { label: "Notifications", path: "/notifications", icon: <NotificationsIcon />, ownerOnly: true },
  { label: "Feature Flags", path: "/feature-flags", icon: <FeatureFlagsIcon />, ownerOnly: true },
  { label: "Outreach", path: "/outreach-scraper", icon: <OutreachIcon />, ownerOnly: true },
  { label: "Staff", path: "/staff", icon: <StaffIcon />, ownerOnly: true },
];

/**
 * Persistent vertical sidebar for the admin panel.
 * Collapses into an off-canvas drawer on smaller screens.
 *
 * Items are filtered by the caller's permissions. While the staff session
 * is still loading (mode="staff"), nav items are hidden to avoid flashing
 * forbidden links.
 */
export default function AdminSidebar({ mobileOpen = false, onClose }) {
  const { basePath, theme, setTheme, hasPerm, isOwner, sessionLoaded } = useAdmin();
  const visibleItems = sessionLoaded
    ? NAV_ITEMS.filter((item) => {
        if (item.adminOnly && basePath !== "/admin") return false;
        if (item.ownerOnly) return isOwner;
        if (isOwner) return true;
        if (item.perm) return hasPerm(item.perm);
        if (Array.isArray(item.anyOf)) return item.anyOf.some((path) => hasPerm(path));
        return true;
      })
    : [];

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/45 transition-opacity duration-200 lg:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-[min(18rem,85vw)] shrink-0 flex-col transition-transform duration-200 lg:static lg:z-auto lg:w-52 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{
          backgroundColor: "var(--adm-surface)",
          borderRight: "1px solid var(--adm-border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex h-14 shrink-0 items-center gap-3 px-5"
          style={{ borderBottom: "1px solid var(--adm-border)" }}
        >
          <Link to={basePath} className="flex-1 min-w-0">
            <img src={theme === "dark" ? whiteLogo : darkLogo} alt="Coachable" className="h-6 w-auto" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-[var(--adm-radius-sm)] lg:hidden"
            style={{ color: "var(--adm-text2)" }}
            aria-label="Close admin navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="hide-scroll flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {visibleItems.map(({ label, path, icon }) => (
            <NavLink
              key={path}
              to={adminPath(basePath, path)}
              end={path === ""}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  "font-Manrope flex items-center gap-3 rounded-[var(--adm-radius-sm)] px-3 py-3 text-sm font-semibold transition-colors",
                  isActive ? "" : "hover:opacity-80",
                ].join(" ")
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: "color-mix(in srgb, var(--adm-accent-dim) 85%, var(--adm-surface2))",
                      color: "var(--adm-accent)",
                      boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--adm-accent) 22%, transparent)",
                    }
                  : { color: "var(--adm-text2)", backgroundColor: "transparent" }
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle */}
        <div
          className="shrink-0 p-3"
          style={{ borderTop: "1px solid var(--adm-border)" }}
        >
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="font-Manrope flex w-full items-center gap-2.5 rounded-[var(--adm-radius-sm)] px-3 py-2.5 text-sm font-semibold transition-colors hover:opacity-80"
            style={{ color: "var(--adm-text2)" }}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>
    </>
  );
}
