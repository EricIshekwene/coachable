import { FiSmartphone, FiTablet, FiMonitor } from "react-icons/fi";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSTokenTable, DSMeta } from "../dsPrimitives";

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

      <DSGroup title="Breakpoints" status="live" description="Tailwind defaults — the values every responsive rule keys off.">
        <DSTokenTable rows={[
          { token: "sm", value: "640px", note: "Large phones / small tablets." },
          { token: "md", value: "768px", note: "Tablets — grids go 2-up." },
          { token: "lg", value: "1024px", note: "Sidebar becomes persistent; 3-up grids." },
          { token: "xl", value: "1280px", note: "Wide desktop." },
          { token: "2xl", value: "1536px", note: "Max content width caps here." },
        ]} />
      </DSGroup>

      <DSGroup title="Usage">
        <DSMeta rows={[
          { label: "Strategy", value: "Mobile-first: author base styles for small screens, then layer sm:/md:/lg: enhancements." },
          { label: "Sidebar", value: "Off-canvas drawer below lg; persistent rail at lg and up." },
          { label: "Tables", value: "Horizontal scroll on small screens; never shrink cell text below 12px." },
          { label: "Modals", value: "Full-screen sheet on phones; centered dialog from sm up." },
          { label: "Touch targets", value: "Interactive controls stay ≥ 44×44px on touch — see Accessibility." },
        ]} />
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
