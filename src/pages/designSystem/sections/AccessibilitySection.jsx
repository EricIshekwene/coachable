import { DSPageHeading, DSGroup, DSChecklist, DSDoDont } from "../dsPrimitives";

/**
 * Accessibility standards and interaction accessibility requirements.
 *
 * @returns {JSX.Element}
 */
export default function AccessibilitySection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Cross-cutting rules"
        title="Accessibility"
        lead="Target WCAG AA. Every interactive element is reachable and operable by keyboard, has a visible focus state, an accessible name, and meets contrast minimums. Color is never the only signal for state, and motion respects reduced-motion."
      />

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
            { label: "Modal focus trap + Escape", note: "AdminModal closes on Escape.", status: "live" },
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
