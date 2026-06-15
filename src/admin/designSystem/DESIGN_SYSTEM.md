# Coachable Design System

A multi-page, sub-navigated internal reference for the whole product — brand
foundations, design tokens, components, patterns, page templates, and the
cross-cutting rules (accessibility, motion, dark mode, copy, edge cases). It
lives inside the admin shell at **`/admin/design-rules`** (and
`/admin/design-rules/:section`) and appears in the admin sidebar as
**"Design System"**.

It replaces the previous single-file `src/pages/AdminDesignRulesPage.jsx`
(~1,950 lines), whose live component demos were migrated into the relevant
sections here.

## Why it exists

The goal is a single source of truth for how Coachable looks, reads, and
behaves, so that we can later build **reusable components** against an agreed
standard. Live examples render real shared components; everything not yet built
is documented as a spec with a status chip. **It documents the design system —
it does not change the live product UI.**

## Structure

```
src/pages/designSystem/
  DesignSystemPage.jsx        Route component: admin shell + sticky sub-nav + search + active section + prev/next
  designSystemNav.js          PURE metadata (groups, slugs, labels, KEYWORDS, helpers) — no component imports, unit-tested
  designSystemSearch.js       PURE ranking helper over the nav metadata — unit-tested
  SearchPalette.jsx           Sidebar search field + ⌘K command palette UI (+ useCommandPalette hook)
  designSystemSections.js     Slug → section component map (getSectionComponent)
  dsPrimitives.jsx            Shared building blocks (see below)
  sections/                   One file per section (38 sections)
```

> **Filename note:** `designSystemSearch.js` (logic) and `SearchPalette.jsx`
> (UI) are intentionally named so they don't collide case-insensitively on
> Windows — never reintroduce a `DesignSystemSearch.jsx` alongside the `.js`.

The nav metadata is deliberately split from the component map so the registry
can be unit-tested in plain Node without importing the heavy Slate/Konva
component tree.

### Routing
- `/admin/design-rules` → defaults to the `overview` section.
- `/admin/design-rules/:section` → renders that section; unknown slugs redirect
  to the default. Wired in `src/App.jsx` (two routes, both `RequireAdminSession`).

### Sub-navigation
Desktop: a sticky left rail grouped by category. Mobile (<lg): a grouped
`<select>`. A prev/next footer links adjacent sections.

### Search
Two surfaces, both ranking with the pure `searchDesignSystem(query)` helper
(`designSystemSearch.js`), which scores each section on label / keyword /
summary / group matches:
- **Sidebar filter** — a search field above the desktop sub-nav; while a query
  is present it replaces the grouped list with ranked results.
- **Command palette** — a global **⌘K / Ctrl-K** (or `/` when not typing)
  overlay that fuzzy-jumps to any section with full keyboard control (↑/↓,
  Enter, Esc). It doubles as the live reference implementation for the command-
  palette pattern documented in the Search section.

Each section in `designSystemNav.js` carries a `keywords: string[]` array so
search finds sections by concept ("toast" → Status & feedback, "cmd k" →
Search) and not just by label.

## Shared primitives (`dsPrimitives.jsx`)

| Primitive | Purpose |
|---|---|
| `DSPageHeading` | Section eyebrow + title + lead + meta |
| `DSGroup` | Titled region within a section |
| `DSTile` / `DSStage` | Demo/doc card; neutral or dark preview stage |
| `DSChecklist` | Data-driven grid of `{label, note, status}` items |
| `DSTokenTable` | Token name / value / note table |
| `DSSwatch` | Color swatch (reads a live CSS var) |
| `DSDoDont` | Side-by-side do / don't lists |
| `DSAnatomy` | Numbered list of a component's named parts |
| `DSStatus` | Status chip (see vocabulary) |
| `DSRef` | Inline pill pointing at a real source file |
| `DSProps` | Props table (name / type / default / description) |
| `DSMeta` | Key–value usage block (when to use, a11y, responsive, dark mode) |
| `DSCallout` | Tinted note (info / warning / success / danger) |

### Status vocabulary
- **Live** — a real component is rendered live on the page.
- **In app** — exists in the product; linked, not embedded.
- **Spec** — documented standard only; no shared component yet.
- **Planned** — from the company-wide checklist; not built in this repo yet.

## Sections (38)

- **Get started:** Overview, Brand
- **Foundations:** Color, Typography, Spacing & elevation, Iconography, Layout & grid
- **Components:** Buttons, Forms, Cards, Navigation, Overlays, Tables, Status & feedback, Data visualization, Lists & chips, Menus & actions
- **Patterns & templates:** Dashboard, Settings, Authentication, Marketing, Notifications, Onboarding, Commerce & billing, Files & uploads, Search, Selection, Values & data, Page templates
- **Cross-cutting rules:** Interaction states, Motion, Dark mode, Accessibility, Responsive, UI copy, Edge cases
- **Editor & meta:** Slate editor UI, Documentation & contribution

## Token worlds documented
The design system documents a **single-source** token hierarchy (not separate palettes):
- **Canonical brand palette:** Tailwind `@theme` `--color-Brand*` tokens in `src/index.css` — one change ripples through app, admin, and design system.
- **Shared primitives:** `--radius-*`, `--shadow-*`, `--duration-*`, `--z-*` defined in `src/index.css` `:root` / `@theme`.
- **Admin aliases:** `--adm-*` tokens in `src/admin/admin.css` derive from the canonical layer via `var()` — they never hold independent hex values.
- **Slate editor:** a separate near-black canvas language (its own section, rendering the real editor components in preview mode). Canvas draw-call colors route through `src/theme/canvasColors.js` (planned) rather than raw CSS vars.

## Live component sources reused
Migrated/embedded real components include: `AdminBtn`, `AdminInput`/`Select`/
`Textarea`/`Checkbox`/`Toggle`/`RadioGroup`, `AdminBadge`/`Alert`/`EmptyState`/
`Spinner`/`Avatar`/`Modal`, `PlayPreviewCard`, the analytics charts
(`KpiStrip`, `UserGrowthChart`, `PlayActivityChart`, `SportMixChart`,
`OnboardingFunnel`), the Slate sidebar sections, `DrawToolsPill`,
`AnimationDrawingTools`, `ControlPill`, and `MobileEditorBar` (in `previewMode`).

## Reusable primitives extracted from the spec

As the design system flagged gaps (patterns documented as `spec` but with no
shared component), the obvious ones were pulled into real `Admin*` primitives in
`src/admin/components/` and the corresponding sections were upgraded to render
them **live**:

| Component | Replaces inline markup in | Notes |
|---|---|---|
| `AdminTabs` | Navigation | Controlled segmented tabs |
| `AdminBreadcrumbs` | Navigation | `Link`-aware trail; last item = current |
| `AdminPagination` | Navigation | First/last anchoring + ellipses; pure `getPaginationRange` in `paginationRange.js` (unit-tested) |
| `AdminChip` | Lists, Dashboard filters | Tones, selected ring, removable |
| `AdminTooltip` | Overlays | Admin-themed hover/focus tooltip (vs the Slate dark variant) |
| `AdminSkeleton` | Status & feedback | `text` / `circle` / `block` variants |
| `AdminProgress` | Onboarding, Files | Linear bar, optional label/value, indeterminate |

These are exported from `src/admin/components/index.js` and available for reuse
across admin/app pages. They are only *used* in the design system so far — no
existing product UI was changed.

## Key decisions
- **Multi-page over one mega-file** — each section is its own file so the page
  stays editable and loads section-by-section.
- **Catalog existing + spec the rest** — unbuilt checklist items are documented
  with a `planned`/`spec` status rather than omitted, so the system reads as a
  complete target.
- **Pure nav module** for testability and to avoid pulling Konva into Node tests.
- **Route slug kept as `design-rules`** for link stability; only the label and
  content changed.

## Tests
- `test-harness/test/designSystem.test.js` validates the pure nav registry: unique
  url-safe slugs, group/section integrity, the default section, `getSection`
  fallback, and `getAdjacentSections` prev/next adjacency.
- `test-harness/test/designSystemSearch.test.js` validates the pure search ranking:
  blank-query handling, label/keyword/summary matching, case/punctuation
  insensitivity, descending scores, the result limit, and that every result
  maps to a real section.
- `test-harness/test/designTokenUnification.test.js` guards the single-source-of-truth
  rule: asserts that admin color tokens alias `--color-Brand*`, that admin
  `--adm-radius*` / `--adm-shadow*` alias the shared `--radius-*` / `--shadow-*`
  scale, and that motion tokens exist in `@theme`. Fails the build if any axis
  drifts back to raw hex or ad-hoc values.

## Extending it
1. Add a section file under `sections/`.
2. Register its slug/label/summary in `designSystemNav.js` (ordering + group).
3. Map the slug to the component in `designSystemSections.js`.
4. Update the section count in this doc and in `CRAWLER_MAP.md`.

New reusable UI should be documented here (with its full state set and edge
cases) before it spreads across multiple pages.
