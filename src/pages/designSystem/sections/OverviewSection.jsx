import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSStatus } from "../dsPrimitives";

const PRINCIPLES = [
  { title: "One scale, everywhere", body: "Buttons, inputs, cards, and overlays share a single radius, spacing, and elevation scale so screens feel cut from the same system." },
  { title: "Accent with intent", body: "Coachable orange leads primary actions, active selection, and important counts — never decoration." },
  { title: "Flat surfaces, hairline borders", body: "Components share the page background — separation comes from a 1px border and subtle shadow, not a lighter fill. Any elevation lift stays barely perceptible, matching the app." },
  { title: "Dense but calm", body: "Admin and editor UI is information-dense; marketing UI breathes. Both stay quiet and legible." },
];

const STATUS_LEGEND = [
  { label: "Live", note: "A real component is rendered live on the page.", status: "live" },
  { label: "In app", note: "Exists in the product; linked rather than embedded here.", status: "inApp" },
  { label: "Spec", note: "Documented standard only — no shared component yet.", status: "spec" },
  { label: "Planned", note: "From the company-wide checklist; not built in this repo yet.", status: "planned" },
];

const TWO_WORLDS = [
  { label: "Product / app / marketing", note: "The source of truth: Tailwind @theme Brand* tokens (BrandOrange, BrandBlack, BrandGreen), Manrope + DmSans, #121212 base, app-shell light mode via [data-theme]." },
  { label: "Admin & design system", note: "The --adm-* tokens, light/dark via [data-admin-theme]. These now alias & derive from the Brand* palette, so admin stays in lockstep with the product. This reference page lives here." },
  { label: "Slate editor", note: "A separate near-black canvas language for the play editor (floating pills, control bars, tool rails). NOT yet wired to the shared tokens — see the Slate section." },
];

/**
 * Landing section for the design system: purpose, principles, the two token
 * worlds, and the status legend used across every other page.
 *
 * @returns {JSX.Element}
 */
export default function OverviewSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Coachable Design System"
        title="A single source of truth for how Coachable looks, reads, and behaves."
        lead="This is the internal reference that defines brand foundations, design tokens, components, patterns, page templates, and the cross-cutting rules (accessibility, motion, dark mode, copy, edge cases) for the whole product. Live examples use real shared components; everything else is documented as a standard so we can build reusable components against it."
        meta={<DSStatus status="live">Internal reference</DSStatus>}
      />

      <DSGroup title="Design principles" description="The four rules every component and screen should inherit.">
        <div className="grid gap-4 md:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <DSTile key={p.title} title={p.title}>
              <p className="text-sm leading-6" style={{ color: "var(--adm-text2)" }}>{p.body}</p>
            </DSTile>
          ))}
        </div>
      </DSGroup>

      <DSGroup
        title="Three visual worlds, one palette"
        description="Coachable runs three related visual languages. The product Brand* palette is the single source of truth; admin & this design system derive from it. Only the Slate editor still keeps its own color values (migration pending)."
      >
        <DSChecklist items={TWO_WORLDS} columns={1} />
      </DSGroup>

      <DSGroup
        title="How to read this reference"
        description="Each documented item carries a status chip so you can tell what is real today versus what is an agreed standard waiting to be built."
      >
        <DSChecklist items={STATUS_LEGEND} columns={2} />
      </DSGroup>

      <DSGroup title="What this design system covers">
        <DSChecklist
          columns={3}
          items={[
            { label: "Brand foundations", note: "Identity, logos, voice, tone.", status: "spec" },
            { label: "Design tokens", note: "Color, type, spacing, radius, shadow, motion, z-index.", status: "live" },
            { label: "Layout & grid", note: "Page structure and responsive behavior.", status: "spec" },
            { label: "Components", note: "Buttons, forms, cards, tables, overlays, nav…", status: "live" },
            { label: "Patterns & templates", note: "Settings, auth, marketing, dashboard, billing.", status: "spec" },
            { label: "Data visualization", note: "Charts, KPI cards, trends.", status: "live" },
            { label: "Status & feedback", note: "Alerts, toasts, badges, empty/loading/error.", status: "live" },
            { label: "Cross-cutting rules", note: "A11y, motion, dark mode, copy, edge cases.", status: "spec" },
            { label: "Slate editor UI", note: "Editor-specific control language.", status: "live" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
