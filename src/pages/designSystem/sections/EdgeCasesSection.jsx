import { Avatar, Badge } from "../../../design-system/components";
import { DSPageHeading, DSGroup, DSTile, DSChecklist } from "../dsPrimitives";

/**
 * Must-have edge cases: how the UI behaves under stress (long text, missing
 * data, no permission, huge counts, overflow).
 *
 * @returns {JSX.Element}
 */
export default function EdgeCasesSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Cross-cutting rules"
        title="Edge cases"
        lead="A component isn't done until it survives the messy real world: very long text, missing avatars, empty data, huge counts, and overflowing containers. These are the cases reviewers actively try to break."
      />

      <DSGroup title="Live edge cases" status="live">
        <div className="grid gap-4 md:grid-cols-3">
          <DSTile title="Long name + no avatar">
            <div className="flex items-center gap-3">
              <Avatar name="Maximilian Featherstone-Worthington" size="md" />
              <p className="min-w-0 truncate text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Maximilian Featherstone-Worthington III</p>
            </div>
          </DSTile>
          <DSTile title="Huge notification count">
            <div className="relative inline-flex">
              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text)" }}>🔔</span>
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white" style={{ backgroundColor: "var(--adm-danger)" }}>99+</span>
            </div>
          </DSTile>
          <DSTile title="Long title clamp">
            <p className="line-clamp-2 text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Trips Right Flood vs Cover 3 — third-and-long red-zone shot play with motion and a backside dig</p>
          </DSTile>
          <DSTile title="Missing data">
            <div className="flex items-center justify-between text-sm"><span style={{ color: "var(--adm-text3)" }}>Last active</span><span style={{ color: "var(--adm-text3)" }}>—</span></div>
          </DSTile>
          <DSTile title="No permission">
            <div className="flex items-center gap-2"><Badge status="warning">Locked</Badge><span className="text-xs" style={{ color: "var(--adm-text3)" }}>Upgrade required</span></div>
          </DSTile>
          <DSTile title="Overflowing chips">
            <div className="flex max-w-full gap-1.5 overflow-hidden">
              {["red zone", "shot play", "motion", "+4"].map((t) => <span key={t} className="shrink-0 rounded-md px-2 py-0.5 text-[10px]" style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}>{t}</span>)}
            </div>
          </DSTile>
        </div>
      </DSGroup>

      <DSGroup title="Edge-case checklist">
        <DSChecklist
          columns={3}
          items={[
            { label: "Very long text / long name", status: "live" },
            { label: "No avatar / missing data", status: "live" },
            { label: "Data loading / failed to load", status: "live" },
            { label: "No permission / locked", status: "live" },
            { label: "Offline / mobile / dark / reduced motion", status: "spec" },
            { label: "Invalid form / unsaved changes", status: "spec" },
            { label: "Destructive action", status: "live" },
            { label: "Expired trial / usage limit / failed payment", status: "planned" },
            { label: "Empty workspace / too many items", status: "spec" },
            { label: "Hundreds of table rows", status: "spec" },
            { label: "Modal content overflows", status: "live" },
            { label: "Huge notification count / long breadcrumb", status: "live" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
