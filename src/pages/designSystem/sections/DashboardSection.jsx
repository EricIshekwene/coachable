import { FiFilter, FiSearch, FiX } from "react-icons/fi";
import { AdminBtn } from "../../../admin/components";
import { DSPageHeading, DSGroup, DSTile, DSStage, DSChecklist, DSRef } from "../dsPrimitives";

/**
 * Dashboard / app patterns: page layout, filters & search, and bulk actions.
 *
 * @returns {JSX.Element}
 */
export default function DashboardSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Dashboard & app patterns"
        lead="App pages share a consistent skeleton: page header with title + actions, an optional filter bar, then the content (KPI cards, charts, tables, or feeds). Filters, search, and bulk actions all reuse the same chip and toolbar language."
      />

      <DSGroup title="Filter bar" status="spec" description="Search left, filter button + active filter chips, sort/view toggles right.">
        <DSTile>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--adm-text3)" }} />
              <input placeholder="Search plays" className="rounded-[var(--adm-radius-md)] py-2 pl-9 pr-3 text-sm outline-none" style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border2)", color: "var(--adm-text)" }} />
            </div>
            <AdminBtn variant="outline" size="sm"><FiFilter /> Filters</AdminBtn>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}>Football <FiX className="text-[10px]" /></span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}>Published <FiX className="text-[10px]" /></span>
            <button className="text-xs font-semibold" style={{ color: "var(--adm-text3)" }}>Clear all</button>
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Bulk action bar" status="spec" description="Appears when rows are selected.">
        <DSTile>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--adm-radius)] px-4 py-3" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border2)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>3 selected</span>
            <DSStage className="!border-0 !bg-transparent !p-0">
              <AdminBtn variant="ghost" size="sm">Archive</AdminBtn>
              <AdminBtn variant="ghost" size="sm">Export</AdminBtn>
              <AdminBtn variant="danger" size="sm">Delete</AdminBtn>
            </DSStage>
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Dashboard layout regions">
        <DSChecklist
          columns={3}
          items={[
            { label: "Page header + actions", status: "live" },
            { label: "KPI cards", status: "live" },
            { label: "Charts", status: "live" },
            { label: "Activity feed / recent items", status: "inApp" },
            { label: "Quick actions", status: "spec" },
            { label: "Empty / loading dashboard", status: "live" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Filters, search & bulk actions">
        <DSChecklist
          columns={3}
          items={[
            { label: "Page / global search", status: "inApp" },
            { label: "Filter button + chips", status: "spec" },
            { label: "Active / clear filters", status: "spec" },
            { label: "Saved filters", status: "planned" },
            { label: "Sort dropdown / view toggle", status: "spec" },
            { label: "Date / status / user filters", status: "spec" },
            { label: "Select all / row selection", status: "spec" },
            { label: "Bulk delete / archive / export", status: "spec" },
            { label: "Bulk confirmation modal", status: "spec" },
          ]}
        />
        <p className="text-xs" style={{ color: "var(--adm-text3)" }}>Real dashboards: <DSRef>src/admin/analytics/AnalyticsDashboard</DSRef> <DSRef>src/pages/app/Plays.jsx</DSRef> <DSRef>src/pages/AdminUsersPage.jsx</DSRef></p>
      </DSGroup>
    </div>
  );
}
