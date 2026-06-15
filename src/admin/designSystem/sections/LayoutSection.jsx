import { FiGrid } from "react-icons/fi";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSRef } from "../dsPrimitives";
import { Badge } from "../../../design-system/components";

/**
 * Layout & grid system: page structure, container widths, responsive behavior,
 * and page-level states.
 *
 * @returns {JSX.Element}
 */
export default function LayoutSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Foundations"
        title="Layout & grid"
        lead="Most product surfaces use a sidebar + main-content shell; marketing uses centered, max-width sections. Content stays within a centered container, gutters collapse on mobile, and the admin sidebar becomes persistent at the lg breakpoint."
      />

      <DSGroup title="Admin shell anatomy" description="The two-column shell every admin & design-system page sits in.">
        <DSTile>
          <div className="grid min-h-[240px] overflow-hidden rounded-[var(--adm-radius-lg)] md:grid-cols-[180px_minmax(0,1fr)]" style={{ border: "1px solid var(--adm-border)" }}>
            <aside className="flex flex-col gap-2 p-3" style={{ backgroundColor: "var(--adm-surface)", borderRight: "1px solid var(--adm-border)" }}>
              <div className="flex items-center gap-2 rounded-[var(--adm-radius)] px-3 py-2.5" style={{ backgroundColor: "var(--adm-surface2)" }}>
                <FiGrid className="text-sm" style={{ color: "var(--adm-accent)" }} />
                <span className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>Sidebar</span>
              </div>
              {["Nav item", "Nav item", "Active", "Nav item"].map((label, i) => (
                <div key={i} className="rounded-[var(--adm-radius-md)] px-3 py-2 text-xs font-semibold"
                  style={i === 2
                    ? { backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }
                    : { color: "var(--adm-text3)" }}>
                  {label}
                </div>
              ))}
            </aside>
            <div className="flex flex-col gap-3 p-4" style={{ backgroundColor: "var(--adm-bg)" }}>
              <div className="rounded-[var(--adm-radius)] px-4 py-3" style={{ backgroundColor: "var(--adm-surface-elevated)", border: "1px solid var(--adm-border)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-text3)" }}>Header / page title + actions</p>
              </div>
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--adm-radius)]" style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)", minHeight: 80 }} />
                <div className="rounded-[var(--adm-radius)]" style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)", minHeight: 80 }} />
              </div>
            </div>
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Grid & containers">
        <DSChecklist
          columns={2}
          items={[
            { label: "12-column desktop grid", note: "Tailwind grid utilities; cards span 1–3 columns at xl.", status: "live" },
            { label: "Container widths", note: "AdminPage = max-w-6xl, wide = max-w-7xl, centered with px gutters.", status: "live" },
            { label: "Sidebar layout", note: "Persistent lg+, off-canvas drawer below lg.", status: "live" },
            { label: "Marketing max width", note: "Centered sections; hero is full-bleed background, content constrained.", status: "inApp" },
            { label: "Form max width", note: "Forms cap around max-w-lg/xl for readability.", status: "spec" },
            { label: "Modal max width", note: "max-w-md/lg/xl passed per modal.", status: "live" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Page structure regions">
        <DSChecklist
          columns={3}
          items={[
            { label: "Header / page title", note: "AdminHeader: title, back link, actions.", status: "live" },
            { label: "Sidebar", note: "AdminSidebar nav.", status: "live" },
            { label: "Main content", note: "AdminPage scroll region.", status: "live" },
            { label: "Action bar", note: "Header actions cluster.", status: "live" },
            { label: "Breadcrumb area", note: "Back link today; full breadcrumbs planned.", status: "spec" },
            { label: "Right rail", note: "Editor right panel; not a general pattern.", status: "inApp" },
            { label: "Sticky subnav", note: "This design system's section rail.", status: "live" },
            { label: "Footer", note: "Marketing footer only.", status: "inApp" },
            { label: "Mobile bottom nav", note: "Editor mobile bar; app has none.", status: "spec" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Page-level states" description="Every page should define its loading, empty, and error appearance.">
        <div className="grid gap-3 sm:grid-cols-3">
          <DSTile title="Loading page"><Badge status="in_progress">Skeleton + spinner</Badge></DSTile>
          <DSTile title="Empty page"><Badge status="info">Empty state + CTA</Badge></DSTile>
          <DSTile title="Error page"><Badge status="fail">Recovery action</Badge></DSTile>
        </div>
        <p className="text-xs" style={{ color: "var(--adm-text3)" }}>
          Real implementations: <DSRef>src/pages/NotFound.jsx</DSRef> <DSRef>src/pages/MaintenancePage.jsx</DSRef>
        </p>
      </DSGroup>
    </div>
  );
}
