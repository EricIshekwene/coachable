/**
 * designSystemNav.js
 *
 * Pure navigation metadata for the design system: groups, section slugs,
 * labels, and the prev/next + lookup helpers. This module imports no React
 * components, so it is safe to unit-test in a plain Node environment. The
 * component map lives separately in designSystemSections.js, keyed by the same
 * ids.
 */

/**
 * @typedef {Object} DSSectionMeta
 * @property {string} id        URL slug (e.g. "color")
 * @property {string} label     Sub-nav label
 * @property {string} summary   One-line description
 */

/** @type {Array<{ group: string, sections: DSSectionMeta[] }>} */
export const DESIGN_SYSTEM_NAV = [
  {
    group: "Get started",
    sections: [
      { id: "overview", label: "Overview", summary: "Purpose, principles, and how to read this reference." },
      { id: "brand", label: "Brand", summary: "Logo system, voice, tone, and personality." },
    ],
  },
  {
    group: "Foundations",
    sections: [
      { id: "color", label: "Color", summary: "Brand & admin palettes, semantic and data-viz colors." },
      { id: "typography", label: "Typography", summary: "Fonts, the type scale, and value formatting." },
      { id: "spacing", label: "Spacing & elevation", summary: "Spacing, radius, shadow, z-index, motion, breakpoints." },
      { id: "iconography", label: "Iconography", summary: "Icon library, sizes, and illustration." },
      { id: "layout", label: "Layout & grid", summary: "Shell anatomy, grid, page structure, page states." },
    ],
  },
  {
    group: "Components",
    sections: [
      { id: "buttons", label: "Buttons", summary: "Variants, sizes, and states." },
      { id: "forms", label: "Forms & inputs", summary: "Inputs, selects, check controls, form patterns." },
      { id: "cards", label: "Cards", summary: "Types, anatomy, and states." },
      { id: "navigation", label: "Navigation", summary: "Sidebar, tabs, breadcrumbs, pagination." },
      { id: "overlays", label: "Overlays", summary: "Modals, drawers, popovers, tooltips." },
      { id: "tables", label: "Tables", summary: "Tables and data display." },
      { id: "feedback", label: "Status & feedback", summary: "Alerts, toasts, badges, loading, empty, error." },
      { id: "data-viz", label: "Data visualization", summary: "KPI cards and dashboard charts." },
      { id: "lists", label: "Lists & chips", summary: "List types, item anatomy, chips & tags." },
      { id: "menus", label: "Menus & actions", summary: "Dropdowns, menu items, action vocabulary." },
    ],
  },
  {
    group: "Patterns & templates",
    sections: [
      { id: "dashboard", label: "Dashboard", summary: "App layout, filters, search, bulk actions." },
      { id: "settings", label: "Settings", summary: "Settings structure and domains." },
      { id: "auth", label: "Authentication", summary: "Auth card, components, screens." },
      { id: "marketing", label: "Marketing", summary: "Hero, pricing, sections, footer." },
      { id: "notifications", label: "Notifications", summary: "Bell, inbox, messaging." },
      { id: "onboarding", label: "Onboarding", summary: "Setup checklist and education." },
      { id: "commerce", label: "Commerce & billing", summary: "Pricing, checkout, billing." },
      { id: "files", label: "Files & uploads", summary: "Drop zones, progress, file cards." },
      { id: "search", label: "Search", summary: "Search input and command palette." },
      { id: "selection", label: "Selection", summary: "Selected states and signals." },
      { id: "values", label: "Values & data", summary: "Value states and sensitive values." },
      { id: "templates", label: "Page templates", summary: "The set of page skeletons." },
    ],
  },
  {
    group: "Cross-cutting rules",
    sections: [
      { id: "interaction-states", label: "Interaction states", summary: "The state contract every component meets." },
      { id: "motion", label: "Motion", summary: "Patterns, timing, and reduced motion." },
      { id: "dark-mode", label: "Dark mode", summary: "Theme adaptation rules." },
      { id: "accessibility", label: "Accessibility", summary: "WCAG AA and interaction a11y." },
      { id: "responsive", label: "Responsive", summary: "Breakpoint behavior." },
      { id: "copy", label: "UI copy", summary: "Voice, format, and copy standards." },
      { id: "edge-cases", label: "Edge cases", summary: "How the UI behaves under stress." },
    ],
  },
  {
    group: "Editor & meta",
    sections: [
      { id: "slate", label: "Slate editor UI", summary: "Editor-specific control language." },
      { id: "documentation", label: "Documentation", summary: "Doc template, deliverables, contribution." },
    ],
  },
];

/** Flat, ordered list of all section metadata. */
export const ALL_SECTIONS = DESIGN_SYSTEM_NAV.flatMap((g) => g.sections);

/** The default section shown at /admin/design-rules. */
export const DEFAULT_SECTION_ID = "overview";

/**
 * Resolve a section's metadata by id, falling back to the default.
 * @param {string | undefined} id
 * @returns {DSSectionMeta}
 */
export function getSection(id) {
  return ALL_SECTIONS.find((s) => s.id === id) ?? ALL_SECTIONS[0];
}

/**
 * Get the previous and next sections relative to the given id, for footer nav.
 * @param {string} id
 * @returns {{ prev: DSSectionMeta | null, next: DSSectionMeta | null }}
 */
export function getAdjacentSections(id) {
  const index = ALL_SECTIONS.findIndex((s) => s.id === id);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? ALL_SECTIONS[index - 1] : null,
    next: index < ALL_SECTIONS.length - 1 ? ALL_SECTIONS[index + 1] : null,
  };
}
