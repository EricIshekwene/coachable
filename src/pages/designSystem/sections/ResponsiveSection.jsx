import { FiSmartphone, FiTablet, FiMonitor } from "react-icons/fi";
import { DSPageHeading, DSGroup, DSTile, DSChecklist } from "../dsPrimitives";

/**
 * Responsive behavior: how layout, navigation, tables, forms, and modals adapt
 * across breakpoints.
 *
 * @returns {JSX.Element}
 */
export default function ResponsiveSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Cross-cutting rules"
        title="Responsive behavior"
        lead="Design mobile-first, then enhance. The admin sidebar collapses to an off-canvas drawer below lg; multi-column grids stack to one column; tables gain horizontal scroll; modals go full-screen on small phones. Type and spacing scale down gently."
      />

      <DSGroup title="Breakpoint behavior" status="live">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { Icon: FiSmartphone, label: "Mobile (<768px)", notes: ["Sidebar → drawer", "1-column stacks", "Modals full-screen", "Editor uses bottom bar"] },
            { Icon: FiTablet, label: "Tablet (768–1024px)", notes: ["2-column grids", "Sidebar still drawer", "Condensed toolbars"] },
            { Icon: FiMonitor, label: "Desktop (≥1024px)", notes: ["Persistent sidebar", "3-column grids", "Full tables", "Hover affordances"] },
          ].map((b) => (
            <DSTile key={b.label} title={b.label}>
              <b.Icon className="mb-3 text-2xl" style={{ color: "var(--adm-accent)" }} />
              <ul className="space-y-1.5">
                {b.notes.map((n) => <li key={n} className="text-xs" style={{ color: "var(--adm-text2)" }}>• {n}</li>)}
              </ul>
            </DSTile>
          ))}
        </div>
      </DSGroup>

      <DSGroup title="Responsive catalog">
        <DSChecklist
          columns={3}
          items={[
            { label: "Desktop / tablet / mobile layout", status: "live" },
            { label: "Stacked cards", status: "live" },
            { label: "Collapsed sidebar / drawer", status: "live" },
            { label: "Mobile bottom nav", note: "Editor only.", status: "inApp" },
            { label: "Responsive tables (h-scroll)", status: "live" },
            { label: "Responsive forms", status: "spec" },
            { label: "Responsive modals (full-screen)", status: "live" },
            { label: "Responsive typography", status: "spec" },
            { label: "Responsive spacing", status: "live" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
