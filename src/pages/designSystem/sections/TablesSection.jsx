import { useState } from "react";
import { AdminBadge, AdminDataTable, AdminAvatar } from "../../../admin/components";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSAnatomy } from "../dsPrimitives";

const ROWS = [
  { id: "u1", name: "Maya Jordan", email: "maya@austinarrows.com", team: "Austin Arrows", role: "owner", plays: 42, joined: "May 04, 2026", verified: true },
  { id: "u2", name: "Nick Porter", email: "nick@bostonblaze.com", team: "Boston Blaze", role: "assistant", plays: 17, joined: "Apr 19, 2026", verified: true },
  { id: "u3", name: "Lena Cho", email: "lena@seattletide.com", team: "—", role: "—", plays: 6, joined: "Mar 28, 2026", verified: false },
];

/** @param {string} name @returns {string} */
function initials(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
}

const TABLE_COLUMNS = [
  {
    key: "name",
    label: "User",
    render: (row) => (
      <div className="flex items-center gap-3">
        <AdminAvatar name={row.name} size="sm" />
        <span className="text-sm font-semibold" style={{ color: "var(--ui-text)" }}>{row.name}</span>
      </div>
    ),
  },
  { key: "email", label: "Email", render: (row) => <span className="text-xs" style={{ color: "var(--ui-text-muted)" }}>{row.email}</span> },
  { key: "team",  label: "Team",  render: (row) => <span className="text-xs" style={{ color: "var(--ui-text-muted)" }}>{row.team}</span> },
  {
    key: "plays",
    label: "Plays",
    align: "center",
    render: (row) => (
      <span className="inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: "var(--ui-accent-muted)", color: "var(--ui-accent)" }}>
        {row.plays}
      </span>
    ),
  },
  { key: "joined", label: "Joined", render: (row) => <span className="text-xs" style={{ color: "var(--ui-text-muted)" }}>{row.joined}</span> },
  {
    key: "verified",
    label: "Status",
    render: (row) => <AdminBadge status={row.verified ? "resolved" : "warning"}>{row.verified ? "Verified" : "Unverified"}</AdminBadge>,
  },
];

/**
 * Tables & data display: the DataTable component demonstrated with the canonical
 * directory table pattern.
 *
 * @returns {JSX.Element}
 */
export default function TablesSection() {
  const [search, setSearch] = useState("");

  const filteredRows = search.trim()
    ? ROWS.filter((r) => [r.name, r.email, r.team].some((v) => v.toLowerCase().includes(search.toLowerCase())))
    : ROWS;

  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Components"
        title="Tables & data display"
        lead="Admin tables are dense and utilitarian: search in the header, a count on the right, then a fixed-column table with a muted uppercase header row and 1px row dividers. Numeric cells use accent-tinted pills; status uses badges."
      />

      <DSGroup title="Directory table" status="live" description="DataTable with search, avatar cells, numeric pill, and status badge.">
        <DSTile padding={false} className="overflow-hidden p-0">
          <AdminDataTable
            columns={TABLE_COLUMNS}
            data={filteredRows}
            keyField="id"
            search={{
              value: search,
              onChange: (e) => setSearch(e.target.value),
              onClear: () => setSearch(""),
              placeholder: "Search by name, email, or team",
              countLabel: "users",
            }}
            onRowClick={(row) => {}}
            stickyHeader
            minWidth="720px"
          />
        </DSTile>
      </DSGroup>

      <DSGroup title="Table anatomy">
        <DSAnatomy parts={[
          { name: "Toolbar", role: "Search left, count + filters right." },
          { name: "Header row", role: "Muted, uppercase, letter-spaced column labels." },
          { name: "Row", role: "1px divider, generous vertical padding." },
          { name: "Cell types", role: "Avatar, text, numeric pill, status badge, action." },
          { name: "Bulk action bar", role: "Appears on row selection (spec)." },
        ]} />
      </DSGroup>

      <DSGroup title="Table & data-component catalog">
        <DSChecklist
          columns={3}
          items={[
            { label: "Dense / spacious table", status: "live" },
            { label: "Sortable / filterable / searchable", note: "Search live; sort spec.", status: "spec" },
            { label: "Selectable rows + bulk bar", status: "spec" },
            { label: "Expandable / editable rows", status: "spec" },
            { label: "Sticky header / column", status: "spec" },
            { label: "Empty / loading / error table", status: "live" },
            { label: "Paginated / infinite table", status: "spec" },
            { label: "Stat block / KPI card", status: "live" },
            { label: "Metric delta / trend", status: "live" },
            { label: "Progress bar / circular", status: "spec" },
            { label: "Sparkline", status: "spec" },
            { label: "Charts (see Data viz)", status: "live" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
