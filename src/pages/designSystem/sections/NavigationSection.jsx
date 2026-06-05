import { useState } from "react";
import { FiChevronRight, FiGrid } from "react-icons/fi";
import { AdminBadge } from "../../../admin/components";
import { DSPageHeading, DSGroup, DSTile, DSChecklist } from "../dsPrimitives";

/**
 * Navigation patterns: sidebar, tabs, breadcrumbs, pagination, and the wider
 * navigation catalog from the checklist.
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
        lead="The admin shell sidebar is the backbone of in-product navigation. Tabs, breadcrumbs, and pagination handle local movement. Active items use the accent-dim fill + inset accent ring treatment consistently."
      />

      <DSGroup title="Sidebar (active item treatment)" status="live" description="The real AdminSidebar pattern: accent-dim fill + accent text + inset ring for the active route.">
        <DSTile>
          <div className="grid min-h-[220px] overflow-hidden rounded-[var(--adm-radius-lg)] md:grid-cols-[200px_minmax(0,1fr)]" style={{ border: "1px solid var(--adm-border)" }}>
            <aside className="flex flex-col gap-1.5 p-3" style={{ backgroundColor: "var(--adm-surface)", borderRight: "1px solid var(--adm-border)" }}>
              <div className="mb-1 flex items-center gap-2 rounded-[var(--adm-radius)] px-3 py-2.5" style={{ backgroundColor: "var(--adm-surface2)" }}>
                <FiGrid className="text-sm" style={{ color: "var(--adm-accent)" }} />
                <span className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>Coachable Admin</span>
              </div>
              {["Dashboard", "Plays", "Users", "Design System", "Errors"].map((label, i) => {
                const active = i === 3;
                return (
                  <div key={label} className="flex items-center justify-between gap-2 rounded-[var(--adm-radius-md)] px-3 py-2 text-xs font-semibold"
                    style={active
                      ? { backgroundColor: "color-mix(in srgb, var(--adm-accent-dim) 85%, var(--adm-surface2))", color: "var(--adm-accent)", boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--adm-accent) 22%, transparent)" }
                      : { color: "var(--adm-text2)" }}>
                    <span>{label}</span>
                    {i === 1 ? <AdminBadge status="info">3</AdminBadge> : null}
                  </div>
                );
              })}
            </aside>
            <div className="flex flex-col gap-3 p-4" style={{ backgroundColor: "var(--adm-bg)" }}>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--adm-text3)" }}>
                <span>Admin</span><FiChevronRight className="text-[10px]" /><span>Design System</span><FiChevronRight className="text-[10px]" /><span style={{ color: "var(--adm-text)" }}>Navigation</span>
              </div>
              <p className="text-sm" style={{ color: "var(--adm-text2)" }}>Breadcrumbs sit above the page title; the back link is the compact variant.</p>
            </div>
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Tabs" status="live">
        <DSTile>
          <div className="inline-flex items-center gap-0.5 rounded-[var(--adm-radius-sm)] p-0.5" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
            {[{ key: "overview", label: "Overview" }, { key: "activity", label: "Activity" }, { key: "sharing", label: "Sharing" }].map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} className="rounded px-3 py-1.5 text-xs font-semibold transition"
                style={tab === t.key ? { backgroundColor: "var(--adm-accent)", color: "#fff" } : { color: "var(--adm-muted)" }}>
                {t.label}
              </button>
            ))}
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Pagination" status="live">
        <DSTile>
          <div className="flex items-center gap-1.5">
            <button className="rounded-[var(--adm-radius-md)] px-3 py-1.5 text-xs font-semibold" style={{ border: "1px solid var(--adm-border2)", color: "var(--adm-text2)" }} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setPage(n)} className="h-8 w-8 rounded-[var(--adm-radius-md)] text-xs font-semibold"
                style={n === page ? { backgroundColor: "var(--adm-accent)", color: "#fff" } : { color: "var(--adm-text2)", border: "1px solid var(--adm-border)" }}>{n}</button>
            ))}
            <button className="rounded-[var(--adm-radius-md)] px-3 py-1.5 text-xs font-semibold" style={{ border: "1px solid var(--adm-border2)", color: "var(--adm-text2)" }} onClick={() => setPage((p) => Math.min(5, p + 1))}>Next</button>
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Navigation catalog" description="The fuller set from the checklist.">
        <DSChecklist
          columns={3}
          items={[
            { label: "Expanded / collapsed sidebar", status: "live" },
            { label: "Nested items & section labels", status: "spec" },
            { label: "Badge / count on item", status: "live" },
            { label: "Team / workspace switcher", note: "TeamSwitcher.", status: "inApp" },
            { label: "Breadcrumbs", note: "Back link today; full trail spec.", status: "spec" },
            { label: "Tabs / pills / segmented", status: "live" },
            { label: "Stepper", status: "planned" },
            { label: "Pagination / cursor / infinite", note: "Infinite scroll in lists.", status: "spec" },
            { label: "Command menu / quick switcher", status: "planned" },
            { label: "Table of contents / anchor links", status: "spec" },
            { label: "Mobile drawer / hamburger", status: "live" },
            { label: "Mobile bottom nav", status: "spec" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
