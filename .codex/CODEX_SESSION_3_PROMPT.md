# Codex Prompt — Design System Q2, Session 3

> **Prerequisite:** Sessions 1 and 2 must be committed on
> `claude/component-system-integration` before starting. Verify:
> `src/design-system/components/Button.jsx` uses `loading`/`fullWidth` props (Session 2
> extension), and `src/pages/app/Plays.jsx` imports `Button` from the design-system barrel.
>
> **Branch:** `claude/component-system-integration`
> Commit all changes here. Do **not** push to `main`.
>
> **Engineering autonomy:** Do not pause to ask clarifying questions. When you hit a
> technical decision — API shape, type checking strategy, implementation detail,
> ambiguous prop name — make the correct engineering call and document your reasoning
> in the commit message. Only stop if a file you must edit does not exist and cannot
> reasonably be inferred from the codebase context.

---

## Goal

Session 3 covers feedback primitives, surfaces, and navigation components.

1. Build `Divider.jsx` — new component (no admin equivalent)
2. Extend `Card.jsx` and `Section.jsx` with the full props surface needed by app pages
3. Migrate all 11 app pages: replace spinner patterns, alert/banner patterns, empty-state
   layouts, badge/status pill patterns, avatar circles, local tab families, the one
   breadcrumb trail, card surfaces, section headings, and dividers

Do **not** touch modal overlay shells (`fixed inset-0 z-50`) — that is Session 4.
Do **not** touch context menus / popovers — Session 4.

---

## Step 1 — Build `Divider.jsx`

Create `src/design-system/components/Divider.jsx`. No admin equivalent exists.

```jsx
/**
 * Horizontal or vertical rule using the shared border token.
 *
 * @param {{
 *   orientation?: "horizontal" | "vertical",
 *   tone?: "default" | "strong",
 *   className?: string,
 * }} props
 */
```

`data-component="Divider"` on the root element.

- Horizontal (default): `<hr>` or `<div role="separator">` with
  `border-top: 1px solid var(--ui-border)` (or `--ui-border-strong` for `tone="strong"`)
- Vertical: `<div role="separator" aria-orientation="vertical">` with `width: 1px`

Export from `src/design-system/components/index.js`:
```js
export { default as Divider } from "./Divider";
```

---

## Step 2 — Extend `Card.jsx`

Extend the existing `src/design-system/components/Card.jsx` (currently an alias for
AdminCard) with the full prop surface defined in the Q2 plan:

| New prop | Type | Behavior |
|---|---|---|
| `padding` | `"none" \| "sm" \| "md" \| "lg"` | Controls inner padding; `"md"` is the default |
| `interactive` | `boolean` | Adds hover lift (`cursor-pointer`, subtle box-shadow on hover) |
| `selected` | `boolean` | Adds accent border (`--ui-accent`) |
| `tone` | `"default" \| "elevated" \| "ghost"` | `elevated` uses `--ui-surface-elevated`; `ghost` is transparent with a dashed border |
| `as` | element type | Polymorphic — defaults to `<div>`, can be `<article>`, `<li>`, etc. |

The `data-component="Card"` attr must remain on the root element.

---

## Step 3 — Extend `Section.jsx`

Extend `src/design-system/components/Section.jsx` with:

| New prop | Type | Behavior |
|---|---|---|
| `subtitle` | `string` | Renders a smaller second line below the title |
| `icon` | `ReactNode` | Icon rendered before the title |
| `actions` | `ReactNode` | Slot rendered flush-right in the section header |
| `variant` | `"default" \| "compact"` | `compact` reduces heading size and spacing |

`data-component="Section"` must remain on the root element.

---

## Step 4 — App page migration

### Import pattern

```js
import {
  Alert, Avatar, Badge, Breadcrumbs, Card, Chip, Divider,
  EmptyState, Section, Skeleton, Spinner, Tabs,
} from "../../design-system/components";
```

Adjust relative path as needed.

### What to replace per pattern

#### Spinner / loader (`animate-spin` div or icon-spin patterns)
Files: `DemoVideos.jsx`, `Notifications.jsx`, `Playbooks.jsx`, `Plays.jsx`, `PlayView.jsx`

Replace `<div className="animate-spin ...">` or `<SomeIcon className="animate-spin">` with:
```jsx
<Spinner size="sm|md|lg" tone="default|accent" label="Loading..." />
```
`label` is for screen readers; set it to describe what is loading.

#### Alert / banner (inline status banners)
Files: `DemoVideos.jsx`, `Notifications.jsx`, `Playbooks.jsx`, `Plays.jsx`, `Profile.jsx`,
`ReportIssue.jsx`, `Settings.jsx`, `Team.jsx`

Replace inline `<div className="...bg-red.../bg-green.../bg-blue... rounded-lg p-3...">` banners with:
```jsx
<Alert tone="error|success|warning|info" title="...">
  optional body text
</Alert>
```

Identify the tone from the existing background color:
- Red/orange → `"error"` or `"warning"`
- Green → `"success"`
- Blue → `"info"`

#### EmptyState (centered nothing-here layouts)
Files: `Notifications.jsx`, `Playbooks.jsx`, `Plays.jsx`, `Settings.jsx`

Replace:
```jsx
<div className="flex flex-col items-center justify-center ...">
  <SomeIcon ... />
  <p>No plays yet.</p>
  <button>Create one</button>
</div>
```
with:
```jsx
<EmptyState
  icon={<SomeIcon />}
  title="No plays yet"
  description="..."
  action={<Button variant="primary" onClick={...}>Create one</Button>}
  contained  {/* if inside a card surface */}
/>
```

#### Badge / status pill
Files: `DemoVideos.jsx`, `Notifications.jsx`, `Playbooks.jsx`, `PlayView.jsx`, `Settings.jsx`

Identify the semantic pattern:
- Status dot or colored text label (e.g. "Active", "Draft") → `<Badge tone="success|warning|danger|info" dot>`
- Count bubble (e.g. "3") → `<Badge size="xs">{count}</Badge>`
- Duration label (e.g. "2:34") → `<Badge tone="default">{duration}</Badge>`

#### Chip / filter pill
Files: `Playbooks.jsx`, `Notifications.jsx`

Selectable filter buttons that look like rounded pills → `<Chip selected={...} onClick={...}>Label</Chip>`.
Removable tag chips → `<Chip onRemove={...}>Tag</Chip>`.

#### Avatar (initials or image circles)
Files: `Profile.jsx`, `Team.jsx`, `Notifications.jsx`

Replace `<div className="rounded-full ... flex items-center justify-center">{initials}</div>` with:
```jsx
<Avatar name="Full Name" src={photoUrl} size="sm|md|lg" />
```
`Avatar` derives initials from `name` when `src` is absent.

#### Tabs (local tab families)
Files: `Playbooks.jsx` (section tabs), `Team.jsx` (member/invite tabs), `Settings.jsx`
(appearance selector)

Replace local underline-tab patterns with:
```jsx
<Tabs
  variant="underline"
  value={activeTab}
  onChange={setActiveTab}
  items={[
    { value: "plays", label: "Plays" },
    { value: "folders", label: "Folders" },
  ]}
/>
```

The `Settings.jsx` appearance selector uses a segmented/button style — use
`variant="segmented"`.

#### Breadcrumbs (one trail)
File: `Plays.jsx` (folder path breadcrumb)

Replace the inline route-mapping breadcrumb with:
```jsx
<Breadcrumbs
  items={folderPath.map(f => ({ label: f.name, href: `/app/plays?folder=${f.id}` }))}
/>
```

#### Card surfaces (bordered rounded panels)
All 11 app pages have card-like surfaces. Replace:
```jsx
<div className="rounded-xl border border-BrandGray2/20 bg-BrandGray/30 p-4">
```
with `<Card padding="md">` (or `padding="sm"|"lg"` to match existing spacing).

Use `interactive` for cards with click handlers. Use `selected` for selected state.
Leave canvas/editor and modal overlay divs alone.

#### Section headings (uppercase tracking labels)
Files with 23 section-heading patterns. Replace:
```jsx
<div>
  <h2 className="text-xs uppercase tracking-widest text-BrandWhite/60">Members</h2>
  {/* content */}
</div>
```
with:
```jsx
<Section title="Members">
  {/* content */}
</Section>
```

Use `variant="compact"` where the existing heading is small and tight. Use `actions={...}`
where there's a button/link flush-right in the heading row.

#### Dividers (explicit horizontal rules)
Files: `DemoVideos.jsx`, `Playbooks.jsx`, `PlayNew.jsx`, `Profile.jsx`

Replace `<div className="border-t border-BrandGray2/20 ...">` or
`<hr className="border-BrandGray2/20">` with `<Divider />`.

---

## Step 5 — Tests

Add `admin/test/sharedFeedbackComponents.test.js`:

- `Spinner` size prop maps to correct class/style
- `Alert` tone prop resolves to correct color token usage
- `Alert` renders `title` and children
- `EmptyState` renders icon, title, description, action slot
- `Badge` tone, size, dot prop resolution
- `Chip` `selected` class, `onRemove` renders × button
- `Avatar` renders `src` when provided; falls back to initials from `name`
- `Divider` renders with `role="separator"`; `tone="strong"` uses strong border token
- `Card` `interactive` adds pointer style; `selected` adds accent border
- `Tabs` `items` prop renders correct number of tab buttons; active item receives
  `aria-selected`

Add RTL tests for interactive components in `src/test/Tabs.test.jsx`:
- Clicking a tab calls `onChange` with the correct `value`
- Active tab has `aria-selected="true"`

---

## Step 6 — Verification

```bash
npx vitest run
npx vite build
```

Both must pass. No new test failures beyond the pre-existing 12.

Verify these grep patterns return zero in migrated files:
```bash
grep -rn "animate-spin" src/pages/app --include="*.jsx"
grep -rn "flex flex-col items-center justify-center" src/pages/app --include="*.jsx"
grep -rn "border-t border-BrandGray" src/pages/app --include="*.jsx"
```

---

## Step 7 — Documentation updates

Update `src/design-system/DESIGN_SYSTEM.md`:
- Add `Divider` to the component table
- Add Session 3 extended props for `Card` and `Section`
- Add a "When to use each feedback component" note (Spinner vs Skeleton, Alert vs Toast)

Update `CRAWLER_MAP.md` — no new files in tracked feature locations, but add `Divider`
to the design-system primitives barrel entry if it's missing.

---

## Commit

Single commit to `claude/component-system-integration`:

```
Design system Q2 Session 3: Divider, extended Card/Section, feedback + surface migration
```

Do **not** commit `.codex/` or `AGENTS.md`.
Do **not** push to `main`.
Do **not** start Session 4.

---

## What NOT to do

- Do not replace `fixed inset-0` overlay shells — Session 4
- Do not replace context menus (z-20 absolute dropdowns) — Session 4
- Do not replace `PlayPickerModal` or `ConfirmModal` shell logic — Session 4
- Do not edit canvas/editor files or admin pages
- Do not merge to `main`
