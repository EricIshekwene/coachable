import { AdminInput, AdminBadge } from "../../../admin/components";
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

/**
 * Tables & data display: the real user-directory table pattern plus the table
 * anatomy and data-component catalog.
 *
 * @returns {JSX.Element}
 */
export default function TablesSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Components"
        title="Tables & data display"
        lead="Admin tables are dense and utilitarian: search in the header, a count on the right, then a fixed-column table with a muted uppercase header row and 1px row dividers. Numeric cells use accent-tinted pills; status uses badges."
      />

      <DSGroup title="Directory table" status="live" description="The production user-directory pattern.">
        <DSTile padding={false} className="overflow-hidden p-0">
          <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: "1px solid var(--adm-border)" }}>
            <div className="relative min-w-0 flex-1 sm:max-w-md"><AdminInput placeholder="Search by name, email, or team" className="w-full" /></div>
            <div className="flex items-center gap-1 text-xs" style={{ color: "var(--adm-muted)" }}><span>{ROWS.length}</span><span>users</span></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  {["User", "Email", "Team", "Plays", "Joined", "Status"].map((h) => (
                    <th key={h} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)", borderBottom: "1px solid var(--adm-border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-4" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}>{initials(u.name).toUpperCase()}</div>
                        <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: "var(--adm-text2)", borderBottom: "1px solid var(--adm-border)" }}>{u.email}</td>
                    <td className="px-5 py-4 text-xs" style={{ color: "var(--adm-text2)", borderBottom: "1px solid var(--adm-border)" }}>{u.team}</td>
                    <td className="px-5 py-4" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                      <span className="inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}>{u.plays}</span>
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: "var(--adm-text2)", borderBottom: "1px solid var(--adm-border)" }}>{u.joined}</td>
                    <td className="px-5 py-4" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                      <AdminBadge status={u.verified ? "resolved" : "warning"}>{u.verified ? "Verified" : "Unverified"}</AdminBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
