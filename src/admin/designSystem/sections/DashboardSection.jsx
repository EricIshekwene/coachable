import { FiFilter, FiUsers, FiBarChart2, FiAlertCircle } from "react-icons/fi";
import { Button, FilterBar, BulkBar, StatCard } from "../../../design-system/components";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSRef } from "../dsPrimitives";

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

      <DSGroup title="Stat cards" status="live" description="StatCard: label, value, delta percentage, and tone variants for at-a-glance KPIs.">
        <DSTile>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total users" value="1,284" delta={{ value: 12, label: "vs last month" }} icon={<FiUsers />} />
            <StatCard label="Active plays" value="847" delta={{ value: 5, label: "vs last month" }} tone="success" icon={<FiBarChart2 />} />
            <StatCard label="Churn rate" value="3.2%" delta={{ value: -1, label: "vs last month" }} tone="warning" />
            <StatCard label="Errors" value="14" delta={{ value: 8, label: "vs last month" }} tone="danger" icon={<FiAlertCircle />} />
          </div>
        </DSTile>
        <DSTile title="Loading state">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total users" value={0} loading />
            <StatCard label="Active plays" value={0} loading tone="success" />
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Filter bar" status="live" description="Search left, filter button + active filter chips, sort/view toggles right.">
        <DSTile>
          <FilterBar
            search={{ value: "", onChange: () => {}, placeholder: "Search plays…" }}
            chips={[
              { label: "Football", onRemove: () => {} },
              { label: "Published", onRemove: () => {} },
            ]}
            actions={
              <>
                <Button variant="outline" size="sm"><FiFilter /> Filters</Button>
              </>
            }
          />
        </DSTile>
      </DSGroup>

      <DSGroup title="Bulk action bar" status="live" description="Appears when rows are selected.">
        <DSTile>
          <BulkBar
            count={3}
            onClearSelect={() => {}}
            actions={
              <>
                <Button variant="ghost" size="sm">Archive</Button>
                <Button variant="ghost" size="sm">Export</Button>
                <Button variant="danger" size="sm">Delete</Button>
              </>
            }
          />
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
            { label: "Filter button + chips", note: "Chip.", status: "live" },
            { label: "Active / clear filters", status: "live" },
            { label: "Saved filters", status: "planned" },
            { label: "Sort dropdown / view toggle", status: "spec" },
            { label: "Date / status / user filters", status: "spec" },
            { label: "Select all / row selection", status: "spec" },
            { label: "Bulk delete / archive / export", status: "live" },
            { label: "Bulk confirmation modal", status: "spec" },
          ]}
        />
        <p className="text-xs" style={{ color: "var(--adm-text3)" }}>Real dashboards: <DSRef>src/admin/analytics/AnalyticsDashboard</DSRef> <DSRef>src/pages/app/Plays.jsx</DSRef> <DSRef>src/pages/AdminUsersPage.jsx</DSRef></p>
      </DSGroup>
    </div>
  );
}
