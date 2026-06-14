# Design System Q3 — Component Extraction Plan

## Goal

Every pattern documented in `/admin/design-rules` becomes a single shared React component.
That component is imported by both the design-rules section file (as a live demo) and every
real page that uses the pattern. No copy-pasted HTML. No `{ROW}` / `{LABEL}` shorthand
constants. No raw `<table>` in page files. When you press Ctrl+Shift+D, every meaningful
UI surface shows a component name.

---

## Current State

The Q2 sessions (Sessions 1–4) built the primitive token layer and low-level controls:
Button, Input, Field, Card, Modal, Toast, Menu, Badge, Spinner, etc. These cover the
atoms. What was not built: the molecules and organisms — the patterns that compose those
atoms into real UI surfaces: tables, list rows, settings rows, search bars, filter bars,
stat cards, notification items, sidebar nav items.

Those patterns are documented in `src/pages/designSystem/sections/` as static mockups.
The mockup JSX and the real-page JSX are separate copies that drift apart over time.

### Known regression: light mode color breakage in the user-facing app

Codex's Q2 work introduced a consistent visual bug in the user-facing app when
light mode is active. Affected surfaces: search inputs, dropdown buttons, card sections
with washed-out gray backgrounds, and the notifications page.

**Root cause:** App pages and components still use raw Tailwind `Brand*` classes for
surfaces, borders, and muted text — e.g. `bg-BrandBlack2/50`, `border-BrandGray2/20`,
`text-BrandGray2`. In dark mode these resolve correctly. In light mode the CSS token
overrides remap `--color-BrandBlack2` to `#fafbfc` (near-white), so:

- `bg-BrandBlack2/50` → `rgba(250,251,252,0.5)` — invisible card/input background on white
- `border-BrandGray2/20` → `rgba(156,163,175,0.20)` — invisible border on white
- `text-BrandGray2` → `#9ca3af` at near-zero contrast on white backgrounds

The `--ui-*` token layer built in Session 1 was designed to solve exactly this. It has
correct light-mode values already defined. The pages were never migrated to use them.

**This must be fixed before Session 5.** A broken light mode in the user app is a
regression that blocks the Q3 component work.

---

## Engineering Decisions

### 1. Placement rule

| Pattern used by | Lives in |
|---|---|
| Both admin AND app pages | `src/design-system/components/` (shared barrel) |
| Admin only | `src/admin/components/` (admin barrel) |

If a pattern appears in any `src/pages/app/` file it goes in the shared barrel. Doubt → shared.

### 2. Token rule

Shared-barrel components use only `var(--ui-*)` tokens. Admin-barrel components may use
`var(--adm-*)`. No raw hex. No Tailwind color classes (`text-BrandOrange`, `bg-BrandBlack`)
inside design-system components — those belong only to page-level one-off styles.

### 3. Table API — two layers

A high-level `DataTable` (columns config + data array) covers 90% of real usage and
eliminates all structural table HTML from page files. Low-level `Th` / `Td` primitives
exist for the rare custom table. Pages should never write raw `<table><thead><tr>`.

### 4. ListItem — one component, slots not variants

`ListItem` has named slots (`leading`, `title`, `subtitle`, `badge`, `trailing`). Every
media-list row in the codebase follows the same anatomy. No sub-variants — the slots
handle all cases.

### 5. Migration is atomic per component

Build → update section file to use real component → migrate all real-page usages →
add guard test. All four steps land in the same commit. A component that exists but
is not used everywhere is not done.

### 6. Design-rules reconciliation rule

A section is "done" when:
- It imports the real component from the barrel (not inline JSX)
- `Ctrl+Shift+D` hovering the section's demo shows `data-component="ComponentName"`
- Sections that are legitimately doc-only (Color, Brand, Values, Copy, Documentation,
  Overview, Accessibility) have a `{/* doc-only */}` comment so nobody extracts them later

### 7. data-component on every new component

Every new component's outermost DOM element carries `data-component="ComponentName"`.
Required. Non-negotiable. This is what makes the DevOverlay useful.

### 8. JSDoc on every exported function

All exported components and their props are documented with JSDoc. Required by CLAUDE.md.

---

## Components to Build (14)

### Tier 1 — Eliminate the most HTML slop (Session 5)

#### `DataTable` — shared barrel

The single replacement for every raw `<table>` in admin pages.

```
Props:
  columns   Array<{ key, label, width?, align?: "left"|"right"|"center", render?(row, i) }>
  data      Array<Record<string, any>>
  keyField  string                         // which field is the unique row key
  search?   { value, onChange }            // renders TableSearchHeader when provided
  loading?  boolean                        // shows Spinner overlay
  empty?    ReactNode                      // custom empty state (defaults to EmptyState)
  onRowClick?(row) => void                 // makes rows hoverable + clickable
  stickyHeader? boolean

Renders:
  - TableSearchHeader (search input left, count right) when search prop provided
  - <table> with thead: uppercase 10px tracking-wide th row, 1px border-bottom
  - tbody: tr rows, 1px row dividers, hover state when onRowClick provided
  - Numeric values auto-wrapped in accent pill when column.align === "right"
  - Empty row spanning all columns when data is empty
  - Spinner overlay when loading

data-component="DataTable"
```

#### `Th` — shared barrel (DataTable internal + escape hatch for custom tables)

```
Props: align?, width?, children
Renders: <th> with canonical header styles (10px uppercase tracking-[0.18em] --ui-text-muted)
data-component="Th"
```

#### `Td` — shared barrel

```
Props: align?, children
Renders: <td> with canonical cell styles (px-5 py-4, 1px bottom border --ui-border)
data-component="Td"
```

#### `TableSearchHeader` — shared barrel

```
Props: value, onChange, onClear?, count?, countLabel? ("users"|"plays"|etc), actions?
Renders: flex row — SearchInput on left, "N label" on right, optional action buttons far right
Separated from the table by a 1px border-bottom
data-component="TableSearchHeader"
```

#### `ListItem` — shared barrel

The single replacement for every "avatar + title + subtitle + trailing action" row.

```
Props:
  leading?   ReactNode   // Avatar, icon, checkbox, file glyph
  title      string | ReactNode
  subtitle?  string | ReactNode
  badge?     ReactNode   // Badge component
  trailing?  ReactNode   // Button, Menu trigger, chevron
  onClick?   () => void  // makes row interactive (hover bg)
  divider?   boolean     // default true — 1px bottom border
  selected?  boolean     // accent-dim background

Renders:
  flex items-center gap-3 py-3 with conditional hover/selected states
  leading slot (shrink-0) / text block (min-w-0 flex-1) / badge / trailing (shrink-0)

data-component="ListItem"
```

---

### Tier 2 — Settings + Search + Filter patterns (Session 6)

#### `SettingsRow` — shared barrel

Replaces every `{ROW}` / `{LABEL}` constant and inline settings-row div.

```
Props:
  label        string
  description? string
  control      ReactNode   // Toggle, Button, Select, etc — rendered on the right
  divider?     boolean     // default true
  danger?      boolean     // tints label --ui-danger

Renders:
  flex items-center justify-between gap-4 py-4
  left: label (font-semibold text-sm) + description (text-xs --ui-text-muted)
  right: control slot

data-component="SettingsRow"
```

#### `SearchInput` — shared barrel

Replaces every "relative div + absolute FiSearch icon + input + optional clear button".

```
Props:
  value        string
  onChange     (e) => void
  onClear?     () => void     // shows × button when provided and value non-empty
  placeholder? string
  shortcut?    string         // e.g. "⌘K" — renders kbd hint on the right
  autoFocus?   boolean
  className?   string

Renders:
  relative div — FiSearch pinned left, Input (no inner border), × button (when clearable),
  optional kbd shortcut hint

data-component="SearchInput"
```

#### `FilterBar` — shared barrel

Replaces the inline search + active-chip + actions row in Plays.jsx and DashboardSection.

```
Props:
  search?   { value, onChange, placeholder? }   // renders SearchInput when provided
  chips?    Array<{ label, onRemove }>           // active filter chips
  actions?  ReactNode                            // right-side buttons (Filter, New, etc)

Renders:
  flex-wrap gap-2 row:
  SearchInput (flex-1, max-w-sm) / Chip stack (active filters) / actions (ml-auto)

data-component="FilterBar"
```

#### `BulkBar` — shared barrel

Replaces the inline bulk-selection action bar in Plays.jsx.

```
Props:
  count          number
  onClearSelect  () => void
  actions        ReactNode   // action buttons (Delete, Move, Tag, etc)
  visible        boolean     // animates in/out

Renders:
  fixed bottom bar (or positioned relative bar) sliding in when visible=true
  "N selected" count + clear link on left, action buttons on right

data-component="BulkBar"
```

#### `DangerZone` — shared barrel

Replaces inline danger-zone divs in Settings pages.

```
Props:
  title?       string   // default "Danger Zone"
  description? string
  children     ReactNode

Renders:
  rounded-lg p-4 border border-[--ui-danger]/30 bg-[--ui-danger]/5
  title (text-sm font-semibold --ui-danger) + description + children (action buttons)

data-component="DangerZone"
```

---

### Tier 3 — Display / data patterns (Session 7)

#### `StatCard` — shared barrel

Extracts KpiCard from admin analytics into a shared component (app may use it too).

```
Props:
  label      string
  value      string | number
  delta?     { value: number, label?: string }  // e.g. +12% vs last period
  tone?      "default" | "success" | "warning" | "danger"
  icon?      ReactNode
  loading?   boolean

Renders:
  Card with label (text-xs uppercase tracking) / value (text-2xl font-bold) /
  optional delta (arrow + %, green/red) / optional icon (top-right corner)

data-component="StatCard"
```

#### `NotificationItem` — admin barrel

```
Props:
  title     string
  body?     string
  time      string
  read      boolean
  tone?     "default" | "success" | "warning" | "danger"
  onClick?  () => void

Renders:
  flex gap-3 px-4 py-3 with unread accent dot / content block / time
  unread: accent-dim background; read: transparent

data-component="NotificationItem"
```

#### `SidebarNavItem` — admin barrel

```
Props:
  label    string
  icon?    ReactNode
  href?    string
  active?  boolean
  badge?   string | number   // notification count

Renders:
  rounded-md px-3 py-2 text-xs font-semibold
  active: accent-dim bg + inset accent ring (box-shadow: inset 0 0 0 1px var(--adm-accent))
  inactive: transparent + hover surface2

data-component="SidebarNavItem"
```

#### `SelectableCard` — admin barrel

Wraps shared Card with selection state and absolute checkmark.

```
Props:
  selected   boolean
  onChange   (selected: boolean) => void
  disabled?  boolean
  children   ReactNode

Renders:
  relative Card with conditional accent border + glow
  absolute top-right checkmark circle (accent bg when selected, muted border when not)

data-component="SelectableCard"
```

---

---

## Token Migration Reference

When replacing a raw `Brand*` Tailwind class with a `--ui-*` token, use a `style` prop.
The canonical mapping:

| Old Tailwind class (dark-only) | Replacement (`style` prop) | Semantic meaning |
|---|---|---|
| `bg-BrandBlack` | `backgroundColor: "var(--ui-bg)"` | Page background |
| `bg-BrandBlack2` | `backgroundColor: "var(--ui-surface)"` | Elevated surface / card |
| `bg-BrandBlack2/50` | `backgroundColor: "var(--ui-surface-2)"` | Muted / inset surface |
| `bg-BrandBlack2/20` | `backgroundColor: "var(--ui-surface-2)"` | Subtle tint |
| `border-BrandGray2/20` | `borderColor: "var(--ui-border)"` | Hairline border |
| `border-BrandGray2/30` | `borderColor: "var(--ui-border)"` | Standard border |
| `border-BrandGray2/60` | `borderColor: "var(--ui-border-strong)"` | Emphasis border |
| `text-BrandGray` | `color: "var(--ui-text-muted)"` | Secondary text |
| `text-BrandGray2` | `color: "var(--ui-text-subtle)"` | Placeholder / disabled text |
| `text-BrandText` | `color: "var(--ui-text)"` | Primary text |

**Do not** replace accent/brand colors — `text-BrandOrange`, `bg-BrandOrange`,
`text-BrandGreen` are intentional and work in both modes. Only surface, border, and
neutral text classes need to change.

**Approach:** Move the color portion to a `style` prop and keep layout classes in
`className`. This avoids a full JSX rewrite of every element.

```jsx
// Before (dark-mode only):
<div className="rounded-lg border border-BrandGray2/20 bg-BrandBlack2/50 px-4 py-3">

// After (light + dark correct):
<div className="rounded-lg border px-4 py-3"
     style={{ borderColor: "var(--ui-border)", backgroundColor: "var(--ui-surface-2)" }}>
```

---

## Session Plan

### Session 4.5 — Light Mode Color Fix (run BEFORE Session 5)

**Scope:** Audit and repair every `Brand*` neutral class used for surfaces, borders, and
muted text in the user-facing app and its shared components. No layout changes. No
redesign. Only swap the color source from `Brand*` Tailwind classes to `--ui-*` tokens.

**Files to fix (primary — known breakage):**
- `src/pages/app/Notifications.jsx` — search input, notification item borders/backgrounds
- `src/pages/app/Plays.jsx` — card backgrounds, search input, dropdown borders
- `src/pages/app/PlayNew.jsx` — tag input container, form field backgrounds
- `src/pages/app/Playbooks.jsx` — filter panel, play card borders
- `src/pages/app/DemoVideos.jsx` — search input, video card backgrounds, FAQ borders
- `src/components/PlayCard.jsx` — card surface, border, time chip, tag chips
- `src/components/FolderCard.jsx` — card surface, border

**Files to audit (secondary — verify and fix if affected):**
- `src/pages/app/Settings.jsx`
- `src/pages/app/Profile.jsx`
- `src/pages/app/Team.jsx`
- `src/pages/app/Community.jsx`
- `src/components/RightPanel.jsx` and `src/components/rightPanel/` sections
- `src/components/WideSidebar.jsx` and `src/components/wideSidebar/` sections
- `src/components/controlPill/ControlPill.jsx`

**Design-system component audit (verify Sessions 1–4 used --ui-* correctly):**
Run `grep -rn "BrandBlack\|BrandGray\b\|BrandGray2" src/design-system/components/`.
If any hits appear in surface/border/text roles, fix those first — they propagate to
every page that uses the component.

**Fix process per file:**
1. Grep for `bg-BrandBlack`, `border-BrandGray2`, `text-BrandGray\b`, `text-BrandGray2`
2. For each hit: identify the semantic role (background? border? muted text?)
3. Replace with the `--ui-*` token from the Token Migration Reference
4. Leave layout classes (`px-`, `py-`, `rounded-`, `flex`, `gap-`) untouched
5. Leave accent colors (`BrandOrange`, `BrandGreen`, `BrandText`, `BrandWhite`) untouched

**Tests:**
- `admin/test/lightModeColorGuard.test.js` — static source scan asserting that
  `src/pages/app/*.jsx`, `src/components/PlayCard.jsx`, `src/components/FolderCard.jsx`
  contain zero instances of `bg-BrandBlack2`, `border-BrandGray2/`, `text-BrandGray\b`
  used as surface/border/muted-text classes. Narrow scope only — does not guard
  `BrandOrange`, `BrandGreen`, `BrandText`, or `BrandWhite`.

**Manual verification:** After the fix, toggle light mode in the running app and
visually confirm: search inputs have visible borders, card surfaces are distinct from
the page background, dropdown/button borders are legible, notification items are
separated by visible dividers.

**Commit subject:**
`Fix light mode color regression: migrate Brand* surface/border/text to --ui-* tokens`

---

### Session 5 — Table + ListItem

**Scope:** Build DataTable, Th, Td, TableSearchHeader, EmptyRow, ListItem. Migrate every
raw table and every media-list row in admin pages. Update TablesSection and ListsSection
to import the real components.

**Files to build:**
- `src/design-system/components/DataTable.jsx`
- `src/design-system/components/Th.jsx`
- `src/design-system/components/Td.jsx`
- `src/design-system/components/TableSearchHeader.jsx`
- `src/design-system/components/ListItem.jsx`
- Update `src/design-system/components/index.js`

**Files to migrate:**
- `src/pages/AdminUsersPage.jsx`
- `src/pages/AdminPlaysPage.jsx`
- Every admin page with a raw `<table>`
- All list-row patterns (divide-y + flex gap-3 + avatar) in admin and app pages
- `src/pages/designSystem/sections/TablesSection.jsx`
- `src/pages/designSystem/sections/ListsSection.jsx`

**Tests:**
- `admin/test/dataTable.test.js` — columns render, data renders, empty state, search filter
- `admin/test/listItem.test.js` — slots render, onClick hover, divider prop
- Update `admin/test/designSystemBarrel.test.js` — add DataTable, ListItem, Th, Td, TableSearchHeader

**Guard:** No raw `<table>` outside of `DataTable.jsx` in `src/pages/`. No inline
`divide-y` + `flex gap-3` + `Avatar` pattern outside `ListItem.jsx` and `src/test/`.

**Commit subject:**
`Design system Q3 Session 5: DataTable, ListItem, table + list migration`

---

### Session 6 — Settings + Search + Filter

**Scope:** Build SettingsRow, SearchInput, FilterBar, BulkBar, DangerZone. Eliminate
all `{ROW}` / `{LABEL}` constants and inline settings divs. Migrate Plays.jsx filter
and bulk bars. Update SettingsSection and DashboardSection.

**Files to build:**
- `src/design-system/components/SettingsRow.jsx`
- `src/design-system/components/SearchInput.jsx`
- `src/design-system/components/FilterBar.jsx`
- `src/design-system/components/BulkBar.jsx`
- `src/design-system/components/DangerZone.jsx`
- Update `src/design-system/components/index.js`

**Files to migrate:**
- `src/pages/app/Settings.jsx`
- `src/pages/app/Plays.jsx` (filter bar + bulk action bar)
- Every admin page using `{ROW}` / `{LABEL}` constants or inline settings rows
- `src/pages/designSystem/sections/SettingsSection.jsx`
- `src/pages/designSystem/sections/DashboardSection.jsx`
- `src/pages/designSystem/sections/SearchSection.jsx`

**Tests:**
- `admin/test/settingsRow.test.js` — label, description, control slot, danger tint
- `admin/test/searchInput.test.js` — renders, clears, shortcut hint
- `admin/test/filterBar.test.js` — search slot, chip removal, actions slot

**Guard:** No `const ROW =` / `const LABEL =` / `const LABEL_CLASS =` string constants
in page files. No inline settings-row div pattern in Settings.jsx.

**Commit subject:**
`Design system Q3 Session 6: SettingsRow, SearchInput, FilterBar, BulkBar, DangerZone`

---

### Session 7 — StatCard + Notifications + Nav

**Scope:** Build StatCard (extracted from KpiCard), NotificationItem, SidebarNavItem,
SelectableCard. Migrate analytics dashboard, notifications panel, admin sidebar nav items.
Update DashboardSection, NotificationsSection, NavigationSection, SelectionSection.

**Files to build:**
- `src/design-system/components/StatCard.jsx`
- `src/admin/components/NotificationItem.jsx`
- `src/admin/components/SidebarNavItem.jsx`
- `src/admin/components/SelectableCard.jsx`
- Update both barrels

**Files to migrate:**
- `src/admin/analytics/KpiCard.jsx` → becomes a re-export of StatCard
- `src/admin/analytics/AnalyticsDashboard.jsx`
- Notifications panel / AdminNotificationsPage
- `src/admin/components/AdminSidebar.jsx` (nav items)
- `src/pages/designSystem/sections/DashboardSection.jsx`
- `src/pages/designSystem/sections/NotificationsSection.jsx`
- `src/pages/designSystem/sections/NavigationSection.jsx`
- `src/pages/designSystem/sections/SelectionSection.jsx`

**Tests:**
- `admin/test/statCard.test.js` — label/value render, delta direction, tone variants, loading
- `admin/test/notificationItem.test.js` — read/unread state, onClick
- `admin/test/sidebarNavItem.test.js` — active state, badge render

**Commit subject:**
`Design system Q3 Session 7: StatCard, NotificationItem, SidebarNavItem, SelectableCard`

---

### Session 8 — Design-rules reconciliation

**Scope:** Every design-rules section file either imports a real component or has a
`{/* doc-only */}` marker. After this session, Ctrl+Shift+D works everywhere it should.
Add a guard test that fails if a non-doc-only section contains zero component imports.

**Section file audit:**

| Section | Action |
|---|---|
| ButtonsSection | Already uses real AdminBtn — verify, add data-component check |
| FormsSection | Already uses real form components — verify |
| CardsSection | Uses AdminCard — verify |
| FeedbackSection | Uses AdminBadge, AdminAlert, etc — verify |
| OverlaysSection | Uses AdminModal — verify |
| NavigationSection | Migrate to SidebarNavItem (Session 7) |
| TablesSection | Migrate to DataTable (Session 5) |
| ListsSection | Migrate to ListItem (Session 5) |
| SettingsSection | Migrate to SettingsRow (Session 6) |
| DashboardSection | Migrate to FilterBar + BulkBar (Session 6) |
| SearchSection | Migrate to SearchInput (Session 6) |
| MenusSection | Already has Menu/MenuItem from Session 4 — wire up |
| NotificationsSection | Migrate to NotificationItem (Session 7) |
| SelectionSection | Migrate to SelectableCard (Session 7) |
| InteractionStatesSection | Already handled by Button variants — add DSStage demo |
| LayoutSection | Documents shell layout — mark doc-only, add grid token demo |
| AccessibilitySection | doc-only |
| BrandSection | doc-only |
| ColorSection | doc-only |
| CopySection | doc-only |
| DocumentationSection | doc-only |
| OverviewSection | doc-only |
| ValuesSection | doc-only |
| TypographySection | Token docs — doc-only until type scale tokens exist |
| SpacingSection | Token docs — doc-only until spacing tokens exist |
| MotionSection | Already uses live token demos — verify |
| ResponsiveSection | doc-only |
| TemplatesSection | doc-only |
| IconographySection | doc-only |
| DataVizSection | Chart components are their own system — doc-only |
| SlateSection | Canvas — explicitly excluded |
| MarketingSection | Landing page — explicitly excluded |
| AuthSection | Auth forms — explicitly excluded |
| CommerceSection | Placeholder — doc-only |
| FilesSection | Placeholder — doc-only |
| EdgeCasesSection | Placeholder — doc-only |
| OnboardingSection | Onboarding specific — doc-only |

**Guard test (`admin/test/designSystemSectionReconciliation.test.js`):**
For every non-doc-only section, assert the file contains at least one `data-component`
import or JSX usage. Fails the build if a section regresses to a pure mockup.

**Commit subject:**
`Design system Q3 Session 8: design-rules reconciliation, section guard tests`

---

## Definition of Done

After Session 4.5 + all four sessions:

0. Light mode is visually correct throughout the user-facing app. Search inputs, card
   surfaces, dropdown borders, and notification items all render legibly in both modes.
   `grep -rn "bg-BrandBlack2\|border-BrandGray2/" src/pages/app/` returns zero matches.

1. `Ctrl+Shift+D` — hover any table row, list item, settings row, stat card, search bar,
   filter bar, bulk bar, notification, or nav item and see a component name.

2. `grep -r "<table" src/` — matches only `DataTable.jsx` internals. Zero page files.

3. `grep -r "divide-y" src/` — matches only `ListItem.jsx`. Zero page files.

4. `grep -rn "const ROW\|const LABEL" src/` — zero matches.

5. Every non-doc-only design-rules section imports a real component. Guard test enforces this.

6. `npx vitest run` — passes at ≥ the Q3 baseline, zero new failures introduced.

---

## Explicitly Out of Scope

- Canvas / Konva draw calls (separate rendering pipeline, use `canvasColors.js`)
- Email templates (email clients strip CSS vars — literals are intentional)
- Admin one-pager PDF (fixed cream/navy palette by design)
- Typography token scale (no `--text-*` CSS vars exist yet — separate axis)
- Spacing token scale (no `--space-*` CSS vars exist yet — separate axis)
- Slate editor chrome migration (blocked on canvas color strategy)
- The `DataVizSection` chart components (KpiStrip, charts — their own subsystem)
