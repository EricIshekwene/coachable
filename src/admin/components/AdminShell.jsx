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
  const { theme } = useAdmin();

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
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
