import { NavLink } from "react-router-dom";
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
  { label: "Dashboard", path: "", icon: <DashboardIcon /> },
  { label: "Plays", path: "/app", icon: <PlaysIcon /> },
  { label: "Errors", path: "/errors", icon: <ErrorsIcon /> },
  { label: "Issues", path: "/user-issues", icon: <IssuesIcon /> },
  { label: "Videos", path: "/demo-videos", icon: <VideosIcon /> },
  { label: "Tests", path: "/tests", icon: <TestsIcon /> },
];

/**
 * Persistent vertical sidebar for the admin panel.
 * Collapses into an off-canvas drawer on smaller screens.
 */
export default function AdminSidebar({ mobileOpen = false, onClose }) {
  const { basePath, theme, setTheme } = useAdmin();

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
          <img src={theme === "dark" ? whiteLogo : darkLogo} alt="Coachable" className="h-6 w-auto" />
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
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV_ITEMS.map(({ label, path, icon }) => (
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
