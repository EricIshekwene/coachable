import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSDoDont, DSTokenTable } from "../dsPrimitives";

/**
 * Motion & animation: motion patterns, the timing/easing rules, and the
 * reduced-motion contract.
 *
 * @returns {JSX.Element}
 */
export default function MotionSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Cross-cutting rules"
        title="Motion & animation"
        lead="Motion is quick and functional: it confirms an action or guides attention, never decorates. Hover/press are ~150ms; overlays and drawers ~200ms; nothing meaningful runs longer than ~300ms. All motion has a reduced-motion fallback."
      />

      <DSGroup title="Live micro-interactions" status="live" description="Hover the tiles to feel the standard transitions.">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Hover lift", cls: "hover:-translate-y-1" },
            { label: "Hover scale", cls: "hover:scale-[1.03]" },
            { label: "Hover brighten", cls: "hover:brightness-110" },
          ].map((t) => (
            <DSTile key={t.label}>
              <div className={`flex h-20 cursor-pointer items-center justify-center rounded-[var(--adm-radius)] text-sm font-semibold transition-all duration-150 ${t.cls}`}
                style={{ background: "linear-gradient(135deg, #ff8d3d, #FF7A18)", color: "#fff" }}>
                {t.label}
              </div>
            </DSTile>
          ))}
        </div>
      </DSGroup>

      <DSGroup title="Timing & easing">
        <DSTokenTable rows={[
          { token: "fast · 150ms", value: "hover, press, button state, tab switch" },
          { token: "medium · 200ms", value: "dropdown, drawer/sidebar slide, toast" },
          { token: "slow · 300ms+", value: "page transition, bottom sheet" },
          { token: "easing", value: "ease-out for enter, ease-in for exit" },
        ]} />
      </DSGroup>

      <DSGroup title="Motion patterns">
        <DSChecklist
          columns={3}
          items={[
            { label: "Button / card hover", status: "live" },
            { label: "Dropdown open/close", status: "live" },
            { label: "Modal open/close", status: "live" },
            { label: "Drawer / sheet slide", status: "inApp" },
            { label: "Toast enter/exit", status: "inApp" },
            { label: "Accordion expand/collapse", status: "spec" },
            { label: "Skeleton shimmer", status: "live" },
            { label: "Loading spinner", status: "live" },
            { label: "Success check / error shake", status: "spec" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Motion rules">
        <DSDoDont
          dos={[
            "Respect prefers-reduced-motion: swap transforms for instant or opacity-only changes",
            "Animate transform and opacity (cheap) over layout properties",
            "Keep durations short — motion should never make the UI feel slow",
          ]}
          donts={[
            "Animate width/height/top/left on interaction-critical paths",
            "Add looping or decorative motion to the product UI",
            "Block input while a non-essential animation finishes",
          ]}
        />
      </DSGroup>
    </div>
  );
}
