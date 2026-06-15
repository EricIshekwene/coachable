import { AdminShell, AdminHeader, AdminPage } from "../../admin/components";
import StaffAdminManager from "../../admin/StaffAdminManager";
import RequirePerm from "../../admin/RequirePerm";

/**
 * Owner-only page for managing scoped staff admins. Mounted at /admin/staff.
 * Lives in its own page (rather than as a section on the dashboard) so the
 * owner has a dedicated workspace for invitations + permission editing.
 */
export default function AdminStaff() {
  return (
    <RequirePerm ownerOnly>
      <AdminShell>
        <AdminHeader />
        <AdminPage className="space-y-6">
          <StaffAdminManager />
        </AdminPage>
      </AdminShell>
    </RequirePerm>
  );
}
