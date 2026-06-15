import { DSPageHeading, DSGroup, DSChecklist, DSDoDont, DSTile, DSCallout } from "../dsPrimitives";

/**
 * Accessibility standards and interaction accessibility requirements.
 *
 * @returns {JSX.Element}
 */
export default function AccessibilitySection() {
  return (
    <div className="flex flex-col gap-10">
      {/* doc-only */}
      <DSPageHeading
        eyebrow="Cross-cutting rules"
        title="Accessibility"
        lead="Target WCAG AA. Every interactive element is reachable and operable by keyboard, has a visible focus state, an accessible name, and meets contrast minimums. Color is never the only signal for state, and motion respects reduced-motion."
      />

      <DSGroup title="Focus visibility" status="live" description="Tab through these — the focus ring must be obvious on every control.">
        <DSTile>
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-[var(--adm-radius-md)] px-3.5 py-2 text-sm font-semibold outline-none focus-visible:ring-4" style={{ background: "linear-gradient(135deg, #ff8d3d, #FF7A18)", color: "#fff" }}>Focusable button</button>
            <a href="#focus-demo" onClick={(e) => e.preventDefault()} className="rounded-[var(--adm-radius-md)] px-2 py-1 text-sm font-semibold underline outline-none focus-visible:ring-4" style={{ color: "var(--adm-accent)" }}>Focusable link</a>
            <input placeholder="Focusable input" className="rounded-[var(--adm-radius-md)] px-3 py-2 text-sm outline-none focus-visible:ring-4" style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border2)", color: "var(--adm-text)" }} />
          </div>
        </DSTile>
        <DSCallout tone="warning" title="Never remove the ring without a replacement">
          If you set <code>outline: none</code>, you must add a visible <code>:focus-visible</code> style. Keyboard users rely on it to know where they are.
        </DSCallout>
      </DSGroup>

      <DSGroup title="Standards">
        <DSChecklist
          columns={3}
          items={[
            { label: "WCAG AA contrast", note: "≥4.5:1 text, ≥3:1 large/UI.", status: "spec" },
            { label: "Keyboard navigation", status: "spec" },
            { label: "Visible focus states", status: "spec" },
            { label: "Logical focus order", status: "spec" },
            { label: "Screen-reader / ARIA labels", note: "Icon buttons use aria-label.", status: "live" },
            { label: "Form error announcements", status: "spec" },
            { label: "Modal focus trap + Escape", note: "Modal closes on Escape.", status: "live" },
            { label: "Skip-to-content link", status: "planned" },
            { label: "Reduced motion", status: "spec" },
            { label: "High contrast mode", status: "planned" },
            { label: "Touch target ≥44px", note: "Buttons min-h-10/11.", status: "live" },
            { label: "Color-blind-safe states", note: "State = color + icon/shape.", status: "spec" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Interaction accessibility">
        <DSChecklist
          columns={3}
          items={[
            { label: "Button / link roles", status: "live" },
            { label: "Disabled state handling", status: "live" },
            { label: "Loading announcements", status: "spec" },
            { label: "Toast announcements (aria-live)", status: "spec" },
            { label: "Tooltip accessibility", status: "spec" },
            { label: "Dropdown / menu keyboard controls", status: "spec" },
            { label: "Tab keyboard controls", status: "spec" },
            { label: "Date-picker keyboard controls", status: "planned" },
            { label: "Alt text / decorative image rules", status: "spec" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Accessibility rules">
        <DSDoDont
          dos={[
            "Give every icon-only control an aria-label",
            "Pair every state color with an icon, label, or shape",
            "Keep focus visible and trap it inside open modals",
          ]}
          donts={[
            "Convey meaning with color alone",
            "Remove outlines without providing a custom focus-visible style",
            "Ship interactive elements that can't be reached by Tab",
          ]}
        />
      </DSGroup>
    </div>
  );
}
