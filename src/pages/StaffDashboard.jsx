import { Link, Navigate } from "react-router-dom";
import { useAdmin } from "../admin/AdminContext";
import AnalyticsDashboard from "../admin/analytics/AnalyticsDashboard";
import { AdminShell, AdminHeader, AdminPage } from "../admin/components";
import { EmptyState } from "../design-system/components";

/**
 * Dashboard page rendered at /staff (and shown to owners testing the
 * staff shell). If the user has analytics access, shows the analytics
 * dashboard; otherwise routes to the first section the user CAN see, or
 * shows an empty state.
 */
export default function StaffDashboard() {
  const { hasPerm, isOwner, basePath, sessionLoaded } = useAdmin();
  const canSeeContent = isOwner || [
    "plays.viewFolders",
    "pageSections.manage",
    "playbooks.view",
    "presets.create",
    "presets.edit",
    "prefabs.manage",
  ].some((perm) => hasPerm(perm));

  if (!sessionLoaded) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "var(--adm-bg)" }}>
        <div className="h-10 w-10 rounded-full border-[3px] border-BrandOrange/30 border-t-BrandOrange animate-spin" />
      </div>
    );
  }

  const accessible = [
    ...(canSeeContent ? [{ label: "Plays", path: "/app" }] : []),
    { label: "Users", path: "/users", perm: "users.viewTable" },
    { label: "Errors", path: "/errors", perm: "errors.viewReports" },
    { label: "Issues", path: "/user-issues", perm: "issues.view" },
    { label: "Videos", path: "/demo-videos", perm: "videos.addDemo" },
    { label: "Page Sections", path: "/one-page", perm: "pageSections.manage" },
    { label: "Tests", path: "/tests", perm: "tests.run" },
  ].filter((item) => !item.perm || hasPerm(item.perm));

  if (hasPerm("dashboard.viewAnalytics") || isOwner) {
    return (
      <AdminShell>
        <AdminHeader />
        <AdminPage>
          <AnalyticsDashboard />
        </AdminPage>
      </AdminShell>
    );
  }

  if (accessible.length === 0) {
    return (
      <AdminShell>
        <AdminHeader />
        <AdminPage>
          <EmptyState
            title="No permissions granted"
            message="The workspace owner hasn't granted you any access yet. Contact them to request the sections you need."
          />
        </AdminPage>
      </AdminShell>
    );
  }

  return <Navigate to={`${basePath}${accessible[0].path}`} replace />;
}
