import { DSPageHeading, DSGroup, DSChecklist, DSTile } from "../dsPrimitives";

const STATES = [
  "Default", "Hover", "Active / pressed", "Focus", "Focus visible", "Selected", "Checked",
  "Expanded", "Collapsed", "Disabled", "Loading", "Success", "Warning", "Error",
  "Empty", "Read-only", "Dragging", "Dropped", "Reordering", "Offline", "Pending", "Saved", "Unsaved",
];

/**
 * Interaction states: the canonical list of states every interactive component
 * must define, with a small interactive demo of the core ones.
 *
 * @returns {JSX.Element}
 */
export default function InteractionStatesSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Cross-cutting rules"
        title="Interaction states"
        lead="Every interactive component must define these states explicitly. They are the contract a component is reviewed against — a button or input is not done until default, hover, active, focus-visible, disabled, and loading are all handled."
      />

      <DSGroup title="The core five" status="live" description="Hover and focus the controls below to see the standard treatment.">
        <DSTile>
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-[var(--adm-radius-md)] px-3.5 py-2 text-sm font-semibold transition-all hover:-translate-y-px focus:outline-none focus-visible:ring-4"
              style={{ background: "linear-gradient(135deg, #ff8d3d, #FF7A18)", color: "#fff" }}>Default → hover → focus</button>
            <button className="rounded-[var(--adm-radius-md)] px-3.5 py-2 text-sm font-semibold active:scale-[0.97]" style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text)", border: "1px solid var(--adm-border2)" }}>Press me (active)</button>
            <button disabled className="rounded-[var(--adm-radius-md)] px-3.5 py-2 text-sm font-semibold opacity-45" style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text)", border: "1px solid var(--adm-border2)" }}>Disabled</button>
            <span className="inline-flex items-center gap-2 rounded-[var(--adm-radius-md)] px-3.5 py-2 text-sm font-semibold" style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text3)", border: "1px solid var(--adm-border2)" }}>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full" style={{ border: "2px solid var(--adm-border2)", borderTopColor: "var(--adm-accent)" }} /> Loading
            </span>
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Full state checklist" description="Define every applicable state per component.">
        <DSChecklist columns={3} items={STATES.map((label) => ({ label, status: "spec" }))} />
      </DSGroup>
    </div>
  );
}
