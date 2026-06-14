import { useState } from "react";
import { FiGrid, FiUsers, FiBarChart2, FiSliders, FiAlertCircle } from "react-icons/fi";
import { Badge, Tabs, Pagination, Breadcrumbs } from "../../../design-system/components";
import { AdminSidebarNavItem } from "../../../admin/components";
import { DSPageHeading, DSGroup, DSTile, DSChecklist } from "../dsPrimitives";

/**
 * Navigation patterns: sidebar, tabs, breadcrumbs, pagination, and the wider
 * navigation catalog from the checklist. Tabs, pagination, and breadcrumbs now
 * use the shared Tabs / Pagination / Breadcrumbs primitives.
 *
 * @returns {JSX.Element}
 */
export default function NavigationSection() {
  const [tab, setTab] = useState("overview");
  const [page, setPage] = useState(2);

  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Components"
        title="Navigation"
        lead="The admin shell sidebar is the backbone of in-product navigation. Tabs, breadcrumbs, and pagination handle local movement and are now shared components. Active items use the accent-dim fill + inset accent ring treatment consistently."
      />

      <DSGroup title="Sidebar (active item treatment)" status="live" description="The real AdminSidebar pattern: accent-dim fill + accent text + inset ring for the active route.">
        <DSTile>
          <div className="grid min-h-[220px] overflow-hidden rounded-[var(--adm-radius-lg)] md:grid-cols-[200px_minmax(0,1fr)]" style={{ border: "1px solid var(--adm-border)" }}>
            <aside className="flex flex-col gap-1 p-3" style={{ backgroundColor: "var(--adm-surface)", borderRight: "1px solid var(--adm-border)" }}>
              <div className="mb-1 flex items-center gap-2 rounded-[var(--adm-radius)] px-3 py-2.5" style={{ backgroundColor: "var(--adm-surface2)" }}>
                <FiGrid className="text-sm" style={{ color: "var(--adm-accent)" }} />
                <span className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>Coachable Admin</span>
              </div>
              <AdminSidebarNavItem label="Dashboard" icon={<FiBarChart2 />} active={false} />
              <AdminSidebarNavItem label="Plays" icon={<FiGrid />} active={false} badge={<Badge status="info">3</Badge>} />
              <AdminSidebarNavItem label="Users" icon={<FiUsers />} active={false} />
              <AdminSidebarNavItem label="Design System" icon={<FiSliders />} active={true} />
              <AdminSidebarNavItem label="Errors" icon={<FiAlertCircle />} active={false} />
            </aside>
            <div className="flex flex-col gap-3 p-4" style={{ backgroundColor: "var(--adm-bg)" }}>
              <Breadcrumbs items={[{ label: "Admin" }, { label: "Design System" }, { label: "Navigation" }]} />
              <p className="text-sm" style={{ color: "var(--adm-text2)" }}>Breadcrumbs sit above the page title; the back link is the compact variant.</p>
            </div>
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Tabs" status="live" description="Shared Tabs — controlled, accent fill on the active tab.">
        <DSTile>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[{ value: "overview", label: "Overview" }, { value: "activity", label: "Activity" }, { value: "sharing", label: "Sharing" }]}
          />
        </DSTile>
      </DSGroup>

      <DSGroup title="Breadcrumbs" status="live" description="Shared Breadcrumbs — last item is the current page.">
        <DSTile>
          <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Users", to: "/admin/users" }, { label: "Maya Jordan" }]} />
        </DSTile>
      </DSGroup>

      <DSGroup title="Pagination" status="live" description="Shared Pagination — first/last anchoring with ellipses for long ranges.">
        <div className="grid gap-4 md:grid-cols-2">
          <DSTile title="Short range">
            <Pagination page={page} pageCount={5} onChange={setPage} />
          </DSTile>
          <DSTile title="Long range (ellipses)">
            <Pagination page={page} pageCount={24} onChange={setPage} />
          </DSTile>
        </div>
      </DSGroup>

      <DSGroup title="Navigation catalog" description="The fuller set from the checklist.">
        <DSChecklist
          columns={3}
          items={[
            { label: "Expanded / collapsed sidebar", status: "live" },
            { label: "Nested items & section labels", status: "spec" },
            { label: "Badge / count on item", status: "live" },
            { label: "Team / workspace switcher", note: "TeamSwitcher.", status: "inApp" },
            { label: "Breadcrumbs", note: "Breadcrumbs.", status: "live" },
            { label: "Tabs / pills / segmented", note: "Tabs.", status: "live" },
            { label: "Stepper", status: "planned" },
            { label: "Pagination", note: "Pagination.", status: "live" },
            { label: "Cursor / infinite scroll", note: "Infinite scroll in lists.", status: "spec" },
            { label: "Command menu / quick switcher", status: "planned" },
            { label: "Table of contents / anchor links", status: "spec" },
            { label: "Mobile drawer / hamburger", status: "live" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
