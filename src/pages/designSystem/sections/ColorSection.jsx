import { DSPageHeading, DSGroup, DSTile, DSSwatch, DSChecklist } from "../dsPrimitives";

const BRAND_TOKENS = [
  { label: "Brand Orange", fill: "var(--color-BrandOrange)", caption: "#FF7A18" },
  { label: "Brand Orange 2", fill: "var(--color-BrandOrange2)", caption: "#75492a" },
  { label: "Brand Green", fill: "var(--color-BrandGreen)", caption: "#4FA85D" },
  { label: "Brand Black", fill: "var(--color-BrandBlack)", caption: "#121212" },
  { label: "Brand Black 2", fill: "var(--color-BrandBlack2)", caption: "#2a2e34" },
  { label: "Brand Gray", fill: "var(--color-BrandGray)", caption: "#9AA0A6" },
  { label: "Brand Gray 2", fill: "var(--color-BrandGray2)", caption: "#4b5157" },
  { label: "Brand Text", fill: "var(--color-BrandText)", caption: "#f5f7fa" },
];

const ADMIN_SURFACES = [
  { label: "Background", fill: "var(--adm-bg)", caption: "--adm-bg" },
  { label: "Surface", fill: "var(--adm-surface)", caption: "--adm-surface" },
  { label: "Surface 2", fill: "var(--adm-surface2)", caption: "--adm-surface2" },
  { label: "Surface 3", fill: "var(--adm-surface3)", caption: "--adm-surface3" },
  { label: "Elevated", fill: "var(--adm-surface-elevated)", caption: "--adm-surface-elevated" },
  { label: "Tint", fill: "var(--adm-surface-tint)", caption: "--adm-surface-tint" },
];

const ADMIN_TEXT = [
  { label: "Text", fill: "var(--adm-text)", caption: "--adm-text" },
  { label: "Text 2", fill: "var(--adm-text2)", caption: "--adm-text2" },
  { label: "Text 3 / muted", fill: "var(--adm-text3)", caption: "--adm-text3" },
  { label: "Border", fill: "var(--adm-border)", caption: "--adm-border" },
  { label: "Border 2", fill: "var(--adm-border2)", caption: "--adm-border2" },
  { label: "Overlay / scrim", fill: "var(--adm-overlay)", caption: "--adm-overlay" },
];

const SEMANTIC = [
  { label: "Accent", fill: "var(--adm-accent)", caption: "--adm-accent" },
  { label: "Accent subtle", fill: "var(--adm-accent-dim)", caption: "--adm-accent-dim" },
  { label: "Success", fill: "var(--adm-success)", caption: "--adm-success" },
  { label: "Success subtle", fill: "var(--adm-success-dim)", caption: "--adm-success-dim" },
  { label: "Warning", fill: "var(--adm-warning)", caption: "--adm-warning" },
  { label: "Warning subtle", fill: "var(--adm-warning-dim)", caption: "--adm-warning-dim" },
  { label: "Danger", fill: "var(--adm-danger)", caption: "--adm-danger" },
  { label: "Danger subtle", fill: "var(--adm-danger-dim)", caption: "--adm-danger-dim" },
  { label: "Info", fill: "var(--adm-info)", caption: "--adm-info" },
  { label: "Info subtle", fill: "var(--adm-info-dim)", caption: "--adm-info-dim" },
];

const DATAVIZ = [
  { label: "Purple", fill: "var(--adm-color-purple)", caption: "--adm-color-purple" },
  { label: "Blue", fill: "var(--adm-color-blue)", caption: "--adm-color-blue" },
  { label: "Cyan", fill: "var(--adm-color-cyan)", caption: "--adm-color-cyan" },
  { label: "Pink", fill: "var(--adm-color-pink)", caption: "--adm-color-pink" },
  { label: "Red soft", fill: "var(--adm-color-red-soft)", caption: "--adm-color-red-soft" },
];

/**
 * Color system: brand palette, admin surfaces/text, semantic colors, data-viz
 * palette, gradients, and status-color tokens. Swatches read live CSS variables
 * so they reflect the active theme.
 *
 * @returns {JSX.Element}
 */
export default function ColorSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Design tokens"
        title="Color"
        lead="Coachable runs two color systems: the product Brand* palette (Tailwind @theme) and the admin --adm-* palette (light/dark). Accent orange is shared across both and always signals primary intent. Every swatch below reads a live token, so toggle the theme to see dark-mode equivalents."
      />

      <DSGroup title="Brand palette" description="Tailwind @theme tokens used across the marketing site, app shell, and Slate editor.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BRAND_TOKENS.map((s) => <DSSwatch key={s.label} {...s} />)}
        </div>
      </DSGroup>

      <DSGroup title="Admin surfaces" description="Layered backgrounds for the admin shell and this design system. Depth comes from stacking these, not from heavy borders.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ADMIN_SURFACES.map((s) => <DSSwatch key={s.label} {...s} />)}
        </div>
      </DSGroup>

      <DSGroup title="Text, borders & overlay">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ADMIN_TEXT.map((s) => <DSSwatch key={s.label} {...s} />)}
        </div>
      </DSGroup>

      <DSGroup title="Semantic colors" description="Each state ships as a solid color plus a subtle background tint for fills.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {SEMANTIC.map((s) => <DSSwatch key={s.label} {...s} />)}
        </div>
      </DSGroup>

      <DSGroup title="Data visualization palette" description="Reserved hues for charts so series stay consistent across the analytics dashboard.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {DATAVIZ.map((s) => <DSSwatch key={s.label} {...s} />)}
        </div>
      </DSGroup>

      <DSGroup title="Brand gradients">
        <div className="grid gap-3 sm:grid-cols-2">
          <DSTile title="Primary action gradient" status="live">
            <div className="h-16 rounded-[var(--adm-radius)]" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--adm-accent) 96%, white 4%) 0%, var(--adm-accent) 100%)" }} />
            <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--adm-text3)" }}>used by AdminBtn / primary CTAs</p>
          </DSTile>
          <DSTile title="Scrollbar / accent gradient" status="live">
            <div className="h-16 rounded-[var(--adm-radius)]" style={{ background: "linear-gradient(180deg, #FF7A18 0%, #ff8d3d 100%)" }} />
            <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--adm-text3)" }}>--scrollbar-thumb</p>
          </DSTile>
        </div>
      </DSGroup>

      <DSGroup title="Tokens still to define" description="From the company-wide checklist — not yet expressed as tokens.">
        <DSChecklist
          columns={2}
          items={[
            { label: "Link / link-hover / visited", note: "App uses accent for links inline; no dedicated visited token.", status: "spec" },
            { label: "Focus ring color", note: "Currently a per-component accent ring; promote to one token.", status: "spec" },
            { label: "Skeleton loading color", note: "Uses --adm-surface3 today; fine, but undocumented.", status: "spec" },
            { label: "High-contrast mode palette", note: "No high-contrast variant yet.", status: "planned" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
