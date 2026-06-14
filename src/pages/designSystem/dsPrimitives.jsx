/**
 * dsPrimitives.jsx
 *
 * Shared building blocks for the Coachable Design System reference section.
 *
 * Every design-system section is assembled from these primitives so that
 * spacing, headings, status language, and documentation layout stay identical
 * across all ~35 pages. They are intentionally admin-themed (they read the
 * `--adm-*` tokens) because the design system lives inside the admin shell.
 *
 * Status vocabulary used throughout the design system:
 *  - "live"      → a real component is rendered live on this page
 *  - "inApp"     → the component/pattern exists in the product (linked, not embedded)
 *  - "spec"      → documented standard only; no shared component yet
 *  - "planned"   → from the company-wide checklist but not built in this repo yet
 */

import { Badge } from "../../design-system/components";

/* ────────────────────────────────────────────────────────────────────────── *
 * Status tag
 * ────────────────────────────────────────────────────────────────────────── */

const STATUS_META = {
  live:    { label: "Live",    status: "resolved" },
  inApp:   { label: "In app",  status: "info" },
  spec:    { label: "Spec",    status: "warning" },
  planned: { label: "Planned", status: "open" },
};

/**
 * Small status chip that classifies how "real" a documented item is.
 *
 * @param {{ status?: "live"|"inApp"|"spec"|"planned", children?: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export function DSStatus({ status = "spec", children }) {
  const meta = STATUS_META[status] ?? STATUS_META.spec;
  return <Badge status={meta.status}>{children ?? meta.label}</Badge>;
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Section heading / intro
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Page-level heading for a design-system section, with an eyebrow, title, and
 * supporting lead paragraph.
 *
 * @param {{ eyebrow?: string, title: string, lead?: React.ReactNode, meta?: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export function DSPageHeading({ eyebrow, title, lead, meta }) {
  return (
    <header className="flex flex-col gap-4 border-b pb-6" style={{ borderColor: "var(--adm-border)" }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--adm-text3)" }}>
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 font-Manrope text-2xl font-semibold tracking-tight sm:text-[1.9rem]" style={{ color: "var(--adm-text)" }}>
            {title}
          </h1>
          {lead ? (
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--adm-text2)" }}>
              {lead}
            </p>
          ) : null}
        </div>
        {meta ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{meta}</div> : null}
      </div>
    </header>
  );
}

/**
 * A grouped block within a section: a titled, optionally described region that
 * holds either live demos or documentation grids.
 *
 * @param {{ title: string, description?: React.ReactNode, status?: string, children: React.ReactNode, className?: string }} props
 * @returns {JSX.Element}
 */
export function DSGroup({ title, description, status, children, className = "" }) {
  return (
    <section className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-Manrope text-lg font-semibold" style={{ color: "var(--adm-text)" }}>
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-6" style={{ color: "var(--adm-text3)" }}>
              {description}
            </p>
          ) : null}
        </div>
        {status ? <DSStatus status={status} /> : null}
      </div>
      {children}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Cards / tiles
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * A self-contained demo / documentation tile with a heading and supporting
 * caption. Mirrors the admin card treatment.
 *
 * @param {{ title?: string, caption?: React.ReactNode, status?: string, children: React.ReactNode, className?: string }} props
 * @returns {JSX.Element}
 */
export function DSTile({ title, caption, status, children, className = "" }) {
  return (
    <div
      className={`flex flex-col rounded-[var(--adm-radius-lg)] p-5 ${className}`}
      style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)", boxShadow: "var(--adm-shadow-sm)" }}
    >
      {(title || status) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title ? (
              <h3 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
                {title}
              </h3>
            ) : null}
            {caption ? (
              <p className="mt-1 text-xs leading-5" style={{ color: "var(--adm-text3)" }}>
                {caption}
              </p>
            ) : null}
          </div>
          {status ? <DSStatus status={status} /> : null}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * A neutral surface used to stage a live component preview (light admin
 * background that keeps the component visually separated from the page).
 *
 * @param {{ children: React.ReactNode, className?: string, dark?: boolean }} props
 * @returns {JSX.Element}
 */
export function DSStage({ children, className = "", dark = false }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-[var(--adm-radius)] p-4 ${className}`}
      style={dark
        ? { background: "#111", border: "1px solid rgba(255,255,255,0.08)" }
        : { backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Checklist / spec grid
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Renders a documentation grid of checklist items. Each item shows its name, a
 * short note, and a status chip. This is the workhorse for spec-heavy sections
 * (where the company-wide checklist enumerates dozens of sub-items).
 *
 * @param {{ items: Array<{ label: string, note?: string, status?: string }>, columns?: number }} props
 * @returns {JSX.Element}
 */
export function DSChecklist({ items, columns = 2 }) {
  const colClass = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3" }[columns] ?? "sm:grid-cols-2";
  return (
    <div className={`grid gap-3 ${colClass}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-start justify-between gap-3 rounded-[var(--adm-radius)] px-4 py-3"
          style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
              {item.label}
            </p>
            {item.note ? (
              <p className="mt-1 text-xs leading-5" style={{ color: "var(--adm-text3)" }}>
                {item.note}
              </p>
            ) : null}
          </div>
          <DSStatus status={item.status ?? "spec"} />
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Token table
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Renders a table of design tokens: name, raw value/sample, and an optional
 * usage note.
 *
 * @param {{ rows: Array<{ token: string, value?: string, note?: string, sample?: React.ReactNode }> }} props
 * @returns {JSX.Element}
 */
export function DSTokenTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-[var(--adm-radius)]" style={{ border: "1px solid var(--adm-border)" }}>
      <table className="w-full border-separate border-spacing-0 text-left text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.token}>
              <td
                className="px-4 py-3 font-mono text-xs"
                style={{ color: "var(--adm-text)", borderTop: i === 0 ? "none" : "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
              >
                {row.token}
              </td>
              <td
                className="px-4 py-3 text-xs"
                style={{ color: "var(--adm-text2)", borderTop: i === 0 ? "none" : "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
              >
                {row.sample ?? row.value}
              </td>
              {rows.some((r) => r.note) ? (
                <td
                  className="px-4 py-3 text-xs"
                  style={{ color: "var(--adm-text3)", borderTop: i === 0 ? "none" : "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
                >
                  {row.note}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Color swatch
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * A single color swatch with a fill, label, and token/value caption.
 *
 * @param {{ label: string, fill: string, caption?: string }} props
 * @returns {JSX.Element}
 */
export function DSSwatch({ label, fill, caption }) {
  return (
    <div className="rounded-[var(--adm-radius)] p-3" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
      <div className="h-12 rounded-[var(--adm-radius-md)]" style={{ backgroundColor: fill, border: "1px solid var(--adm-border)" }} />
      <p className="mt-3 text-xs font-semibold" style={{ color: "var(--adm-text)" }}>{label}</p>
      {caption ? <p className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--adm-text3)" }}>{caption}</p> : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Do / Don't
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Side-by-side do / don't guidance lists.
 *
 * @param {{ dos?: string[], donts?: string[] }} props
 * @returns {JSX.Element}
 */
function DoDontColumn({ heading, items, tone }) {
  const accent = tone === "do" ? "var(--adm-success)" : "var(--adm-danger)";
  return (
    <div
      className="rounded-[var(--adm-radius)] p-4"
      style={{
        backgroundColor: tone === "do" ? "var(--adm-success-dim)" : "var(--adm-danger-dim)",
        border: `1px solid color-mix(in srgb, ${accent} 20%, transparent)`,
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>
        {heading}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm" style={{ color: "var(--adm-text2)" }}>
            <span aria-hidden="true" style={{ color: accent }}>{tone === "do" ? "✓" : "✕"}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DSDoDont({ dos = [], donts = [] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {dos.length ? <DoDontColumn heading="Do" items={dos} tone="do" /> : null}
      {donts.length ? <DoDontColumn heading="Don't" items={donts} tone="dont" /> : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Anatomy / labelled parts
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Lists the named parts of a component (its "anatomy"), each with a short
 * description.
 *
 * @param {{ parts: Array<{ name: string, role: string }> }} props
 * @returns {JSX.Element}
 */
export function DSAnatomy({ parts }) {
  return (
    <ol className="flex flex-col gap-2">
      {parts.map((part, index) => (
        <li
          key={part.name}
          className="flex items-start gap-3 rounded-[var(--adm-radius)] px-3 py-2.5"
          style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
            style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}
          >
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{part.name}</p>
            <p className="text-xs leading-5" style={{ color: "var(--adm-text3)" }}>{part.role}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Reference link to a real product file / page
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Inline pill that points to where the real implementation lives in the
 * codebase or product (for "in app" patterns the design system describes but
 * does not embed).
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export function DSRef({ children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px]"
      style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)", border: "1px solid var(--adm-border)" }}
    >
      {children}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Props table
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Documents a component's public props: name, type, default, and description.
 * Used to round out component sections toward the full "documentation inside
 * the design system" template.
 *
 * @param {{ rows: Array<{ name: string, type?: string, default?: string, required?: boolean, description?: React.ReactNode }> }} props
 * @returns {JSX.Element}
 */
export function DSProps({ rows }) {
  return (
    <div className="overflow-x-auto rounded-[var(--adm-radius)]" style={{ border: "1px solid var(--adm-border)" }}>
      <table className="w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {["Prop", "Type", "Default", "Description"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "var(--adm-text3)", backgroundColor: "var(--adm-surface2)", borderBottom: "1px solid var(--adm-border)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.name}>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs" style={{ color: "var(--adm-text)", borderTop: i === 0 ? "none" : "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
                {row.name}{row.required ? <span style={{ color: "var(--adm-danger)" }}> *</span> : null}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px]" style={{ color: "var(--adm-accent)", borderTop: i === 0 ? "none" : "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
                {row.type ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px]" style={{ color: "var(--adm-text3)", borderTop: i === 0 ? "none" : "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
                {row.default ?? "—"}
              </td>
              <td className="px-4 py-3 text-xs leading-5" style={{ color: "var(--adm-text2)", borderTop: i === 0 ? "none" : "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
                {row.description ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Usage / meta block (purpose, when to use, a11y, responsive, dark mode)
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * A compact key/value block capturing the cross-cutting documentation every
 * component should carry: when to use, when not to, accessibility, responsive,
 * and dark-mode behavior. Pass only the fields that apply.
 *
 * @param {{ rows: Array<{ label: string, value: React.ReactNode }> }} props
 * @returns {JSX.Element}
 */
export function DSMeta({ rows }) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-[var(--adm-radius)]" style={{ border: "1px solid var(--adm-border)", backgroundColor: "var(--adm-border)" }}>
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 px-4 py-3" style={{ backgroundColor: "var(--adm-surface)" }}>
          <dt className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--adm-text3)" }}>{row.label}</dt>
          <dd className="text-sm leading-6" style={{ color: "var(--adm-text2)" }}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Callout / note
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * A tinted note used to flag an important rule, caveat, or tip inside a section.
 *
 * @param {{ tone?: "info"|"warning"|"success"|"danger", title?: string, children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export function DSCallout({ tone = "info", title, children }) {
  const map = {
    info: { fg: "var(--adm-accent)", bg: "var(--adm-accent-dim)" },
    warning: { fg: "var(--adm-warning)", bg: "var(--adm-warning-dim)" },
    success: { fg: "var(--adm-success)", bg: "var(--adm-success-dim)" },
    danger: { fg: "var(--adm-danger)", bg: "var(--adm-danger-dim)" },
  };
  const c = map[tone] ?? map.info;
  return (
    <div className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: c.bg, border: `1px solid color-mix(in srgb, ${c.fg} 22%, transparent)` }}>
      {title ? <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: c.fg }}>{title}</p> : null}
      <div className={`text-sm leading-6 ${title ? "mt-1.5" : ""}`} style={{ color: "var(--adm-text2)" }}>{children}</div>
    </div>
  );
}
