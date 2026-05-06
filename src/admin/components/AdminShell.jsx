import { useEffect, useState } from "react";
import { useAdmin } from "../AdminContext";
import AdminSidebar from "./AdminSidebar";

/**
 * Root admin wrapper. Sets data-admin-theme so CSS tokens activate.
 * When `sidebar` is true (default), renders a two-column layout:
 * a fixed sidebar on the left and a scrollable main column on the right.
 * Pass `sidebar={false}` for full-screen layouts like the login screen.
 *
 * @param {{ children: React.ReactNode, className?: string, sidebar?: boolean }} props
 */
export default function AdminShell({ children, className = "", sidebar = true }) {
  const { theme, setTheme } = useAdmin();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebar || !mobileSidebarOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSidebarOpen, sidebar]);

  if (!sidebar) {
    return (
      <div
        data-admin-theme={theme}
        className={`font-Manrope h-screen overflow-y-auto ${className}`}
        style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)" }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      data-admin-theme={theme}
      className="font-Manrope flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)" }}
    >
      <AdminSidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div
          className="sticky top-0 z-40 flex h-14 items-center gap-3 px-4 lg:hidden"
          style={{
            backgroundColor: "var(--adm-surface-elevated)",
            borderBottom: "1px solid var(--adm-border)",
          }}
        >
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--adm-radius-sm)]"
            style={{ color: "var(--adm-text)" }}
            aria-label="Open admin navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-Manrope text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
              Coachable Admin
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-[var(--adm-radius-sm)] px-2.5 py-1.5 text-xs font-semibold"
            style={{
              backgroundColor: "var(--adm-surface2)",
              border: "1px solid var(--adm-border)",
              color: "var(--adm-text2)",
            }}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
