/**
 * designSystemNav.js
 *
 * Pure navigation metadata for the design system: groups, section slugs,
 * labels, keyword tags, and the prev/next + lookup helpers. This module imports
 * no React components, so it is safe to unit-test in a plain Node environment.
 * The component map lives separately in designSystemSections.js, keyed by the
 * same ids, and the search ranking lives in designSystemSearch.js (which reads
 * the `keywords` defined here).
 */

/**
 * @typedef {Object} DSSectionMeta
 * @property {string} id        URL slug (e.g. "color")
 * @property {string} label     Sub-nav label
 * @property {string} summary   One-line description
 * @property {string[]} [keywords] Extra terms the search should match on
 */

/** @type {Array<{ group: string, sections: DSSectionMeta[] }>} */
export const DESIGN_SYSTEM_NAV = [
  {
    group: "Get started",
    sections: [
      { id: "overview", label: "Overview", summary: "Purpose, principles, and how to read this reference.", keywords: ["intro", "principles", "getting started", "status legend", "how to read", "tokens worlds"] },
      { id: "brand", label: "Brand", summary: "Logo system, voice, tone, and personality.", keywords: ["logo", "wordmark", "favicon", "voice", "tone", "personality", "watermark", "identity", "clear space"] },
    ],
  },
  {
    group: "Foundations",
    sections: [
      { id: "color", label: "Color", summary: "Brand & admin palettes, semantic and data-viz colors.", keywords: ["palette", "swatch", "semantic", "success", "warning", "danger", "info", "accent", "neutral", "gradient", "chart colors", "hex", "orange"] },
      { id: "typography", label: "Typography", summary: "Fonts, the type scale, and value formatting.", keywords: ["font", "manrope", "dm sans", "type scale", "heading", "body", "caption", "weight", "line height", "letter spacing", "mono"] },
      { id: "spacing", label: "Spacing & elevation", summary: "Spacing, radius, shadow, z-index, motion, breakpoints.", keywords: ["spacing", "padding", "margin", "radius", "shadow", "elevation", "z-index", "layer", "breakpoint", "scale", "gap"] },
      { id: "iconography", label: "Iconography", summary: "Icon library, sizes, and illustration.", keywords: ["icon", "react-icons", "feather", "fi", "stroke", "illustration", "size", "outline"] },
      { id: "layout", label: "Layout & grid", summary: "Shell anatomy, grid, page structure, page states.", keywords: ["grid", "columns", "container", "shell", "header", "footer", "sidebar", "main", "gutter", "page state", "structure"] },
    ],
  },
  {
    group: "Components",
    sections: [
      { id: "buttons", label: "Buttons", summary: "Variants, sizes, and states.", keywords: ["button", "btn", "cta", "primary", "secondary", "ghost", "outline", "danger", "icon button", "split button", "button group", "fab"] },
      { id: "forms", label: "Forms & inputs", summary: "Inputs, selects, check controls, form patterns.", keywords: ["input", "form", "field", "textarea", "select", "dropdown", "checkbox", "radio", "toggle", "switch", "slider", "validation", "label", "helper", "error"] },
      { id: "cards", label: "Cards", summary: "Types, anatomy, and states.", keywords: ["card", "tile", "panel", "surface", "clickable card", "metric card", "stat card", "card anatomy"] },
      { id: "navigation", label: "Navigation", summary: "Sidebar, tabs, breadcrumbs, pagination.", keywords: ["nav", "sidebar", "tabs", "breadcrumbs", "pagination", "menu", "active item", "stepper", "anchor"] },
      { id: "overlays", label: "Overlays", summary: "Modals, drawers, popovers, tooltips.", keywords: ["modal", "dialog", "drawer", "sheet", "popover", "tooltip", "overlay", "scrim", "confirm", "close"] },
      { id: "tables", label: "Tables", summary: "Tables and data display.", keywords: ["table", "row", "column", "cell", "sortable", "sticky header", "bulk action", "data grid", "header row"] },
      { id: "feedback", label: "Status & feedback", summary: "Alerts, toasts, badges, loading, empty, error.", keywords: ["alert", "toast", "snackbar", "badge", "spinner", "skeleton", "progress", "empty state", "error state", "loading"] },
      { id: "data-viz", label: "Data visualization", summary: "KPI cards and dashboard charts.", keywords: ["chart", "kpi", "metric", "graph", "line chart", "bar chart", "donut", "funnel", "sparkline", "legend", "axis", "analytics"] },
      { id: "lists", label: "Lists & chips", summary: "List types, item anatomy, chips & tags.", keywords: ["list", "list item", "chip", "tag", "pill", "removable", "divided list", "activity list"] },
      { id: "menus", label: "Menus & actions", summary: "Dropdowns, menu items, action vocabulary.", keywords: ["menu", "dropdown", "context menu", "overflow", "kebab", "action", "verbs", "shortcut", "separator"] },
    ],
  },
  {
    group: "Patterns & templates",
    sections: [
      { id: "dashboard", label: "Dashboard", summary: "App layout, filters, search, bulk actions.", keywords: ["dashboard", "app layout", "filter", "filter bar", "search bar", "bulk action", "overview", "kpi cards"] },
      { id: "settings", label: "Settings", summary: "Settings structure and domains.", keywords: ["settings", "preferences", "account", "profile", "security", "danger zone", "settings row", "save bar"] },
      { id: "auth", label: "Authentication", summary: "Auth card, components, screens.", keywords: ["auth", "login", "sign up", "signup", "log in", "password", "forgot password", "reset", "verify email", "2fa", "magic link"] },
      { id: "marketing", label: "Marketing", summary: "Hero, pricing, sections, footer.", keywords: ["marketing", "landing", "hero", "pricing", "testimonial", "faq", "footer", "cta section", "logo cloud", "feature grid"] },
      { id: "notifications", label: "Notifications", summary: "Bell, inbox, messaging.", keywords: ["notification", "bell", "inbox", "badge count", "unread", "message", "comment", "mention", "toast"] },
      { id: "onboarding", label: "Onboarding", summary: "Setup checklist and education.", keywords: ["onboarding", "welcome", "checklist", "setup", "tour", "coach mark", "tooltip tour", "first run", "education"] },
      { id: "commerce", label: "Commerce & billing", summary: "Pricing, checkout, billing.", keywords: ["billing", "commerce", "pricing", "plan", "checkout", "payment", "invoice", "subscription", "upgrade", "trial", "coupon"] },
      { id: "files", label: "Files & uploads", summary: "Drop zones, progress, file cards.", keywords: ["file", "upload", "drag and drop", "dropzone", "progress", "file card", "thumbnail", "attachment", "image upload"] },
      { id: "search", label: "Search", summary: "Search input and command palette.", keywords: ["search", "command palette", "cmd k", "quick actions", "autocomplete", "results", "no results", "fuzzy"] },
      { id: "selection", label: "Selection", summary: "Selected states and signals.", keywords: ["selection", "selected", "multi-select", "checkmark", "selected card", "selected row", "focus ring"] },
      { id: "values", label: "Values & data", summary: "Value states and sensitive values.", keywords: ["value", "data", "empty value", "null", "redacted", "sensitive", "api key", "masked", "currency", "percentage", "date format"] },
      { id: "templates", label: "Page templates", summary: "The set of page skeletons.", keywords: ["template", "page skeleton", "404", "500", "maintenance", "detail page", "form page", "empty page"] },
    ],
  },
  {
    group: "Cross-cutting rules",
    sections: [
      { id: "interaction-states", label: "Interaction states", summary: "The state contract every component meets.", keywords: ["state", "hover", "active", "focus", "disabled", "loading", "selected", "pressed", "dragging", "contract"] },
      { id: "motion", label: "Motion", summary: "Patterns, timing, and reduced motion.", keywords: ["motion", "animation", "transition", "easing", "duration", "reduced motion", "shimmer", "spinner", "micro-interaction"] },
      { id: "dark-mode", label: "Dark mode", summary: "Theme adaptation rules.", keywords: ["dark mode", "light mode", "theme", "color scheme", "surface", "contrast", "elevation in dark"] },
      { id: "accessibility", label: "Accessibility", summary: "WCAG AA and interaction a11y.", keywords: ["accessibility", "a11y", "wcag", "contrast", "keyboard", "screen reader", "aria", "focus trap", "skip link", "touch target", "alt text"] },
      { id: "responsive", label: "Responsive", summary: "Breakpoint behavior.", keywords: ["responsive", "mobile", "tablet", "desktop", "breakpoint", "stacked", "collapse", "drawer", "fluid"] },
      { id: "copy", label: "UI copy", summary: "Voice, format, and copy standards.", keywords: ["copy", "writing", "labels", "sentence case", "capitalization", "tone", "microcopy", "error message", "cta text"] },
      { id: "edge-cases", label: "Edge cases", summary: "How the UI behaves under stress.", keywords: ["edge case", "long text", "overflow", "empty", "no permission", "offline", "truncation", "many items", "failure"] },
    ],
  },
  {
    group: "Editor & meta",
    sections: [
      { id: "slate", label: "Slate editor UI", summary: "Editor-specific control language.", keywords: ["slate", "editor", "canvas", "control pill", "konva", "field", "play designer", "timeline", "toolbar"] },
      { id: "documentation", label: "Documentation", summary: "Doc template, deliverables, contribution.", keywords: ["documentation", "doc template", "deliverables", "contribution", "versioning", "changelog", "review checklist"] },
    ],
  },
];

/** Flat, ordered list of all section metadata. */
export const ALL_SECTIONS = DESIGN_SYSTEM_NAV.flatMap((g) =>
  g.sections.map((s) => ({ ...s, group: g.group })),
);

/** The default section shown at /admin/design-rules. */
export const DEFAULT_SECTION_ID = "overview";

/**
 * Resolve a section's metadata by id, falling back to the default.
 * @param {string | undefined} id
 * @returns {DSSectionMeta & { group: string }}
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
