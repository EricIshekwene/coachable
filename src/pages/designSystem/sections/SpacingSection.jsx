import { DSPageHeading, DSGroup, DSTile, DSTokenTable, DSChecklist } from "../dsPrimitives";

const SPACING = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96];

const RADIUS = [
  { token: "--radius-sm / --adm-radius-sm", value: "6px", note: "chips, small controls, tabs" },
  { token: "--radius-md / --adm-radius-md", value: "8px", note: "buttons, inputs" },
  { token: "--radius / --adm-radius",       value: "10px", note: "default cards, tiles" },
  { token: "--radius-lg / --adm-radius-lg", value: "14px", note: "large cards, panels" },
  { token: "--radius-xl / --adm-radius-xl", value: "18px", note: "modals, hero surfaces" },
  { token: "--radius-pill",                 value: "9999px", note: "badges, avatars, toggles" },
];

const SHADOW = [
  { token: "--shadow-sm / --adm-shadow-sm", value: "subtle resting elevation", note: "cards, secondary buttons" },
  { token: "--shadow / --adm-shadow",       value: "standard card / dropdown", note: "menus, popovers" },
  { token: "--shadow-lg / --adm-shadow-lg", value: "modal / overlay", note: "dialogs, command menu" },
];

const ZINDEX = [
  { token: "base", value: "0", note: "page content" },
  { token: "--z-overlay",   value: "30",  note: "modal backdrop scrim" },
  { token: "--z-sticky",    value: "40",  note: "AdminShell mobile bar, off-canvas nav" },
  { token: "--z-modal",     value: "50",  note: "dialogs, menus, tooltips" },
  { token: "--z-toast",     value: "99",  note: "MessagePopup / critical alerts" },
];

const MOTION = [
  { token: "--duration-fast · 150ms", value: "hover, button press (active:scale .985)" },
  { token: "--duration-base · 200ms", value: "drawer / sidebar slide, dropdowns" },
  { token: "--duration-slow · 300ms", value: "page / sheet transitions" },
  { token: "--ease-standard",         value: "ease-out — enter; ease-in — exit" },
];

const BREAKPOINTS = [
  { token: "sm", value: "640px", note: "large phone / small tablet" },
  { token: "md", value: "768px", note: "tablet" },
  { token: "lg", value: "1024px", note: "laptop — admin sidebar becomes persistent" },
  { token: "xl", value: "1280px", note: "desktop" },
  { token: "2xl", value: "1536px", note: "wide desktop" },
  { token: "max content", value: "max-w-6xl / 7xl", note: "AdminPage default / wide" },
];

/**
 * Spacing, radius, shadow/elevation, border, z-index layering, motion, and
 * breakpoint tokens.
 *
 * @returns {JSX.Element}
 */
export default function SpacingSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Design tokens"
        title="Spacing, radius, elevation & motion"
        lead="An 8px base rhythm with 16 / 24 / 32 jumps governs layout. Radius, shadow, z-index, motion, and breakpoints are tokenized so every component sits on the same grid."
      />

      <DSGroup title="Spacing scale" description="8px base. Most gaps land on 8 / 12 / 16 / 24 / 32; the larger steps are for section rhythm.">
        <DSTile>
          <div className="space-y-2">
            {SPACING.map((n) => (
              <div key={n} className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-right font-mono text-xs" style={{ color: "var(--adm-text3)" }}>{n}</span>
                <div className="rounded-full" style={{ width: `${Math.max(n * 2, 2)}px`, height: 10, backgroundColor: "var(--adm-accent)" }} />
              </div>
            ))}
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Radius">
        <DSTokenTable rows={RADIUS} />
        <div className="flex flex-wrap gap-3">
          {RADIUS.slice(0, 5).map((r) => (
            <div key={r.token} className="flex h-16 w-16 items-center justify-center text-[10px] font-semibold"
              style={{ borderRadius: r.value, backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)", color: "var(--adm-text3)" }}>
              {r.value}
            </div>
          ))}
        </div>
      </DSGroup>

      <DSGroup title="Shadow / elevation">
        <DSTokenTable rows={SHADOW} />
        <div className="grid gap-4 sm:grid-cols-3">
          {SHADOW.map((s) => (
            <div key={s.token} className="flex h-20 items-center justify-center rounded-[var(--adm-radius)] text-xs"
              style={{ backgroundColor: "var(--adm-surface)", boxShadow: `var(${s.token})`, color: "var(--adm-text3)" }}>
              {s.token}
            </div>
          ))}
        </div>
      </DSGroup>

      <DSGroup title="Borders">
        <DSChecklist
          columns={2}
          items={[
            { label: "Default border", note: "1px var(--adm-border) — soft, low-contrast.", status: "live" },
            { label: "Strong / interactive border", note: "1px var(--adm-border2) on hover/active controls.", status: "live" },
            { label: "Focus ring", note: "4px accent-dim ring + accent border on focus.", status: "live" },
            { label: "Dashed / placeholder", note: "1px dashed for drop zones and empty content areas.", status: "spec" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Z-index layers">
        <DSTokenTable rows={ZINDEX} />
      </DSGroup>

      <DSGroup title="Motion tokens" description="Defined in src/index.css @theme — available as Tailwind utilities (duration-fast, duration-base, duration-slow, ease-standard).">
        <DSTokenTable rows={MOTION} />
      </DSGroup>

      <DSGroup title="Breakpoints & max widths">
        <DSTokenTable rows={BREAKPOINTS} />
      </DSGroup>
    </div>
  );
}
