# Coachable — File Structure & Component Consolidation Master Plan

This is the single source of truth for two parallel workstreams:

1. **Component Consolidation (Part A)** — kill all `Admin*` aliases, backfill raw JSX with DS
   components, build 13 new components, and unify the two navigation sidebars into shared primitives.
2. **Directory Restructuring (Part B)** — reorganize `src/pages/`, `src/utils/`, `src/admin/`,
   `src/layouts/`, and related directories into a coherent, navigable tree.

Both workstreams are pure frontend changes. No server routes, no DB schema, no Railway redeploy.

---

## Open Decisions (answer before executing Part B)

### Q1 — Page file naming convention
> **Recommendation: keep PascalCase** — the codebase is consistent today and switching every import is high risk for zero user value.

### Q2 — Auth and public page subfolders
> **Recommendation: A** — clear ownership, easier for new developers to find login/signup flows.

### Q3 — Slate editor components
> A) Move to `src/features/slate/components/` (all slate code in one feature folder)
> **Recommendation: A** — slate is already a self-contained feature; collocating its components with its hooks and utils is the cleaner model.

### Q4 — Design-system folder name
> A) Keep as `src/design-system/components/` (current)
> **Decision: A — keep as-is.** The Q4 sessions below reference this path. Renaming is a distraction; the barrel import path is what matters, not the directory name.

### Q5 — Inline micro-helpers in pages
> Zero tolerance (every JSX-returning function to components/) or allow < 5-line local helpers?
> **Recommendation: zero tolerance** — the whole point of this plan is that pages contain no component definitions.

### Q6 — `src/components/index.js` barrel
> Expand (add all ~20 reusable web components) or delete (import directly from file paths)?
> **Recommendation: delete it.** It currently exports only 2 of ~20 components. Expanding it requires ongoing maintenance for no discoverability benefit now that the DS barrel covers primitives. Import directly from file paths for domain components.

---

# PART A — Component Consolidation

## A.0 — Design System Location

| What | Where |
|---|---|
| Canonical primitive barrel | `src/design-system/components/index.js` |
| Admin compat barrel (temporary) | `src/admin/components/index.js` |
| All new Q4 components | `src/design-system/components/` |
| Domain cards (PlayCard, FolderCard, PlayPickerCard) | `src/components/` |

**Placement rule:** if a component is used in ANY `src/pages/app/` file → shared DS barrel. Doubt → shared.

---

## A.1 — Cross-Cutting Rules (apply to every session)

### `data-component` attribute
Every new component's outermost DOM element must carry `data-component="ComponentName"`. This is what Ctrl+Shift+D reads. No exceptions.

### Token rule
Shared DS components use ONLY `var(--ui-*)` tokens. No raw hex. No Tailwind `Brand*` color classes inside design-system files.

| Semantic role | Token |
|---|---|
| Page/body background | `var(--ui-bg)` |
| Card / elevated surface | `var(--ui-surface)` |
| Inset / muted surface | `var(--ui-surface-2)` |
| Hairline border | `var(--ui-border)` |
| Emphasis border | `var(--ui-border-strong)` |
| Primary text | `var(--ui-text)` |
| Secondary text | `var(--ui-text-muted)` |
| Placeholder / disabled text | `var(--ui-text-subtle)` |
| Brand accent | `var(--ui-accent)` |
| Accent dim background | `var(--ui-accent-muted)` |
| Status tones | `var(--ui-success)`, `var(--ui-danger)`, `var(--ui-warning)`, `var(--ui-info)` |

### JSDoc
All exported components must have JSDoc with `@param` for every prop.

### Tests
- Logic / class-resolution tests → `admin/test/`
- RTL / keyboard / aria / interaction tests → `src/test/`

### Build gate
Every session ends with `npx vitest run` passing and `npm run build` succeeding before commit.

### CRAWLER_MAP.md
Update in the same commit as any new file, rename, or directory creation.

---

## A.2 — Complete Alias Kill List

All of these must become direct DS imports. Delete alias barrel entries after zero grep hits remain.

| Kill the alias | Canonical DS component | Notes |
|---|---|---|
| `AdminBtn` | `Button` | |
| `AdminInput` | `Input` | |
| `AdminTextarea` | `Textarea` | |
| `AdminSelect` | `Select` | |
| `AdminCheckbox` | `Checkbox` | |
| `AdminRadioGroup` | `RadioGroup` | |
| `AdminToggle` | `Toggle` | |
| `AdminCard` | `Card` | |
| `AdminSection` | `Section` | |
| `AdminModal` | `Modal` | |
| `AdminAlert` | `Alert` | |
| `AdminSpinner` | `Spinner` | |
| `AdminSkeleton` | `Skeleton` | |
| `AdminProgress` | `Progress` | |
| `AdminEmptyState` | `EmptyState` | |
| `AdminBadge` | `Badge` | |
| `AdminChip` | `Chip` | |
| `AdminAvatar` | `Avatar` | |
| `AdminTabs` | `Tabs` | |
| `AdminBreadcrumbs` | `Breadcrumbs` | |
| `AdminPagination` | `Pagination` | |
| `AdminTooltip` | `Tooltip` | |
| `AdminDataTable` | `DataTable` | |
| `AppCard` | `Card` | re-export from `src/components/layout/` |
| `AppSection` | `Section` | same |
| `ConfirmModal` | `ConfirmDialog` | any compat wrapper |
| `MessagePopup` | `Toast` | `src/components/MessagePopup/MessagePopup.jsx` |
| `KpiCard` | `StatCard` | `src/admin/analytics/KpiCard.jsx` → re-export |

---

## A.3 — New Component Specifications

### `IconBubble`

**File:** `src/design-system/components/IconBubble.jsx`

```jsx
/**
 * Rounded icon container with tinted background. Not for user avatars — use Avatar.
 * @param {ReactNode} icon - Icon or text node (FiMail, FiFlag, "1", etc.)
 * @param {"orange"|"purple"|"green"|"red"|"blue"|"gray"} [tone="orange"]
 * @param {"sm"|"md"|"lg"} [size="md"] - sm=h-8 w-8 rounded-lg, md=h-10 w-10 rounded-xl, lg=h-12 w-12 rounded-2xl
 * @param {string} [className]
 */
```

Tone → background + icon color:
- `orange` → `bg-[color:var(--ui-accent-muted)]` + `color: var(--ui-accent)`
- `purple` → `bg-purple-500/15` + `color: rgb(192 132 252)`
- `green` → `bg-[color:var(--ui-success)]/15` + `color: var(--ui-success)`
- `red` → `bg-[color:var(--ui-danger)]/15` + `color: var(--ui-danger)`
- `blue` → `bg-blue-500/15` + `color: rgb(96 165 250)`
- `gray` → `bg-[color:var(--ui-surface-2)]` + `color: var(--ui-text-muted)`

**7 migration targets:**
1. `src/pages/app/ReportIssue.jsx:78` — purple FiFlag bubble
2. `src/pages/app/Profile.jsx:214` — role icon bubble
3. `src/pages/app/Team.jsx:220` — team name icon bubble
4. `src/pages/app/PlayNew.jsx:327` — checkmark circle
5. `src/pages/app/ProfileEmailVerification.jsx:128` — mail icon circle
6. `src/pages/app/Notifications.jsx:252` — handled by QuestionCard (skip here)
7. Any icon bubbles in `src/pages/designSystem/sections/`

**Test:** `admin/test/iconBubble.test.js` — tone classes render, size classes render

---

### `AccordionItem`

**File:** `src/design-system/components/AccordionItem.jsx`

```jsx
/**
 * Collapsible content section with animated height and chevron toggle.
 * @param {string} title
 * @param {boolean} [defaultOpen=false]
 * @param {ReactNode} [actions] - Optional buttons inside body
 * @param {ReactNode} children
 * @param {string} [className]
 */
```

- Outer: `border-b border-[color:var(--ui-border)] last:border-b-0`
- Trigger: `<Button variant="ghost">` full width, `flex w-full items-start justify-between gap-4 py-4 text-left`
- `<FiChevronDown>` rotates 180° when open
- Body: `overflow-hidden transition-all duration-200 ${open ? "max-h-[72rem] pb-4" : "max-h-0"}` — use large value, NOT hardcoded 72px

**Migration:** `src/pages/app/DemoVideos.jsx:115–148` — FAQ section

**Test:** `admin/test/accordionItem.test.js` — starts closed, opens on click, closes again

---

### `InlineEdit`

**File:** `src/design-system/components/InlineEdit.jsx`

```jsx
/**
 * Transparent inline text field for rename flows.
 * Commits on Enter or blur. Cancels on Escape.
 * @param {string} value
 * @param {(v: string) => void} onCommit
 * @param {() => void} onCancel
 * @param {string} [placeholder]
 * @param {string} [className]
 */
```

- Raw `<input>` (NOT DS `Input` — needs transparent bg + no visible border)
- `className`: `w-full rounded bg-transparent px-1 font-semibold outline-none ring-1 ring-[color:var(--ui-accent)]`
- `autoFocus` on mount
- Enter → `onCommit(localValue)`, Escape → `onCancel()`, blur → `onCommit(localValue)`
- `data-component="InlineEdit"` on the `<input>` directly

**Migration:**
- `src/components/PlayCard.jsx:152` — rename input
- `src/components/FolderCard.jsx:87` — rename input (identical pattern)

**Test:** `admin/test/inlineEdit.test.js` — Enter commits, Escape cancels, blur commits

---

### `TimestampChip`

**File:** `src/design-system/components/TimestampChip.jsx`

```jsx
/**
 * Read-only pill with clock icon and relative time. Renders as <span>, not interactive.
 * @param {string} children - Formatted time string (e.g. "2 days ago")
 * @param {string} [className]
 */
```

```jsx
<span
  data-component="TimestampChip"
  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${className}`}
  style={{ borderColor: "var(--ui-border)", backgroundColor: "rgba(0,0,0,0.2)", color: "var(--ui-text-subtle)" }}
>
  <FiClock className="shrink-0 text-[10px]" />
  {children}
</span>
```

**Migration:** `src/components/PlayCard.jsx:226` — raw `<span>` clock + time pill

**Test:** `admin/test/timestampChip.test.js` — renders children, renders clock icon

---

### `TokenBox`

**File:** `src/design-system/components/TokenBox.jsx`

```jsx
/**
 * Monospace read-only display for invite codes, API keys, tokens.
 * @param {string} value
 * @param {boolean} [copyable=false] - Shows copy-to-clipboard button
 * @param {string} [label]
 * @param {string} [className]
 */
```

- Box: `flex-1 rounded-lg border px-3.5 py-2.5 font-mono text-sm tracking-wider`
  - `style={{ borderColor: "var(--ui-border)", backgroundColor: "var(--ui-bg)", color: "var(--ui-accent)" }}`
- Copy button: `<Button variant="ghost" size="icon">` with `FiCopy`; shows `FiCheck` for 2s via `navigator.clipboard.writeText(value)` + local timeout

**Migration:** `src/pages/app/Team.jsx:36` — invite code display div

**Test:** `admin/test/tokenBox.test.js` — renders value, copy button present when copyable

---

### `AuthCard`

**File:** `src/design-system/components/AuthCard.jsx`

```jsx
/**
 * Shared surface shell for all auth forms: login, signup, reset, forgot password.
 * @param {string} title
 * @param {string} [subtitle]
 * @param {ReactNode} children - Form fields and primary action
 * @param {ReactNode} [footer] - e.g. "New here? Create account"
 * @param {string} [className]
 */
```

- Outer: `mx-auto w-full max-w-sm`
- Uses `<Card padding="lg">` — no raw surface div
- Title: `text-lg font-semibold font-Manrope` + `color: var(--ui-text)`
- Subtitle: `mt-1 text-xs` + `color: var(--ui-text-muted)`
- Children: `mt-5 space-y-3`
- Footer: `mt-4 text-center text-xs` + `color: var(--ui-text-subtle)`

**Migration:** `src/pages/designSystem/sections/AuthSection.jsx`
- Replace raw `<div className="mx-auto max-w-sm rounded-[var(--adm-radius-lg)] p-6">` with `<AuthCard>`
- Migrate all `AdminX` → DS names inside that file
- The raw `<button>` "Forgot password?" → `<Button variant="text" size="sm">`
- Remove `{/* doc-only */}` comment — AuthSection now uses a real component

**Test:** `admin/test/authCard.test.js` — renders title, subtitle, children, footer

---

### `VideoCard`

**File:** `src/design-system/components/VideoCard.jsx`

```jsx
/**
 * Media card with aspect-ratio thumbnail, hover play overlay, and metadata footer.
 * @param {string} [thumbnailUrl]
 * @param {string} title
 * @param {string} [duration] - e.g. "4:32"
 * @param {ReactNode} [badge] - overlay badge on thumbnail
 * @param {boolean} [isReady=true] - false renders placeholder, disables click
 * @param {() => void} [onClick]
 * @param {string} [className]
 */
```

- `<Card as={onClick && isReady ? "button" : "div"} padding="none" interactive={isReady && !!onClick} className="group overflow-hidden">`
- Thumbnail: `relative aspect-video w-full overflow-hidden bg-[color:var(--ui-surface-2)]`
  - If ready + url: `<img className="h-full w-full object-cover transition group-hover:scale-105 duration-300" />`
  - Hover play overlay: `absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity`
    - Circle: `h-12 w-12 rounded-full flex items-center justify-center bg-[color:var(--ui-accent)]` + white `FiPlay`
  - Badge slot: `absolute top-2 right-2`
- Footer: `px-3 py-2.5` — title `text-sm font-medium`, duration `text-xs mt-0.5`

**Migration:** `src/pages/app/DemoVideos.jsx:156–202`

**Test:** `admin/test/videoCard.test.js` — renders title, img when url + ready, no overlay when not ready

---

### `BrowseTile`

**File:** `src/design-system/components/BrowseTile.jsx`

```jsx
/**
 * Section/collection preview card: colored icon header strip + title + description + count.
 * @param {string} color - CSS color for header bg (intentional brand color, not a token)
 * @param {ReactNode} icon
 * @param {string} title
 * @param {string} [description]
 * @param {number} [count]
 * @param {string} [countLabel="plays"]
 * @param {() => void} [onClick]
 * @param {string} [className]
 */
```

- `<Card as="button" padding="none" interactive className="group flex flex-col overflow-hidden text-left">`
- Header: `flex h-28 items-center justify-center transition group-hover:brightness-110` with `style={{ backgroundColor: color }}`
- Icon: `text-white text-3xl`
- Body: `p-4 flex flex-col gap-1` — title, description, count

**Migration:** `src/pages/app/Playbooks.jsx:468–494`

**Test:** `admin/test/browseTile.test.js` — renders title, description, count, header color

---

### `TagInput`

**File:** `src/design-system/components/TagInput.jsx`

```jsx
/**
 * Multi-value tag field with removable Chip items, inline input, and optional suggestions.
 * @param {string[]} value
 * @param {(tags: string[]) => void} onChange
 * @param {string[]} [suggestions=[]]
 * @param {string} [placeholder="Add a tag..."]
 * @param {number} [maxTags]
 * @param {string} [className]
 */
```

- Container: `flex min-h-[2.625rem] flex-wrap items-center gap-1.5 rounded-lg border px-2.5 py-2 transition focus-within:border-[color:var(--ui-accent)]` with surface/border tokens
- Each tag: `<Chip onRemove={() => remove(tag)}>{tag}</Chip>`
- Inline raw `<input>` (no DS Input — must be borderless inline)
- Keyboard: Enter/comma → add; Backspace on empty → remove last
- Suggestions: filter by input text, render as `<Menu>` + `<MenuItem>`

**Migration:**
- `src/pages/app/PlayNew.jsx:390–451`
- `src/pages/app/Plays.jsx:671–676` (bulk tag modal)

**Test:** `admin/test/tagInput.test.js` — adds on Enter, removes on ×, filters suggestions

---

### `StarRating`

**File:** `src/design-system/components/StarRating.jsx`

```jsx
/**
 * Clickable star rating input with hover preview.
 * @param {number} value - 0 = nothing selected
 * @param {(v: number) => void} onChange
 * @param {number} [max=5]
 * @param {boolean} [disabled=false]
 * @param {string} [label] - visually hidden accessible label
 * @param {string} [className]
 */
```

- `role="radiogroup"` outer div
- Each star: `<button type="button" role="radio" aria-checked={value >= n}>`
- `FiStar` fill uses `hovered ?? value` for hover preview
- Fill color: `var(--ui-accent)`, empty: `var(--ui-text-muted)`

**Migration:** `src/pages/app/Notifications.jsx:143–166`

**Test:** `admin/test/starRating.test.js` — renders max stars, click sets value, aria-checked

---

### `QuestionCard`

**File:** `src/design-system/components/QuestionCard.jsx`
**Depends on:** `IconBubble` (Session A3 must complete first)

```jsx
/**
 * Numbered question block for surveys and notification forms.
 * @param {number} number
 * @param {string} label
 * @param {boolean} [required=false]
 * @param {ReactNode} children - The answer field
 * @param {string} [className]
 */
```

- `<Card padding="sm" style={{ backgroundColor: "var(--ui-surface-2)" }}>`
- Number: `<IconBubble icon={<span className="text-xs font-bold leading-none">{number}</span>} tone="orange" size="sm" />`
- Label with optional `<span style={{ color: "var(--ui-accent)" }}>*</span>`
- Children: `<div className="pl-8">` (indented past bubble width)

**Migration:** `src/pages/app/Notifications.jsx:246–268`

**Test:** `admin/test/questionCard.test.js` — number, label, required asterisk, children slot

---

### `CodeInput`

**File:** `src/design-system/components/CodeInput.jsx`

```jsx
/**
 * Multi-box OTP / verification code input. Auto-advances focus. Handles paste.
 * @param {number} [length=6]
 * @param {string} value - Full code string
 * @param {(v: string) => void} onChange
 * @param {boolean} [autoFocus=false]
 * @param {boolean} [disabled=false]
 * @param {string} [className]
 */
```

- Array of `length` individual `<input maxLength={1}>` elements with refs
- onKeyDown: Backspace on empty → focus prev; ArrowLeft/Right → move focus
- onChange: single char → focus next; reconstruct full string
- onPaste on first box: split across all boxes, focus last filled
- Each box: `h-12 w-10 rounded-lg border text-center text-lg font-mono` + focus ring via `var(--ui-accent)`

**Migration:** `src/pages/app/ProfileEmailVerification.jsx:140–157`

**Test:** `admin/test/codeInput.test.js` — N boxes, paste fills all, backspace moves focus

---

### `RecentlyEditedChip`

**File:** `src/design-system/components/RecentlyEditedChip.jsx`

```jsx
/**
 * Compact horizontal chip for recently-edited carousels. Clock icon + title + time.
 * @param {string} title
 * @param {string} time - Relative time string (e.g. "2 days ago")
 * @param {() => void} onClick
 * @param {string} [className]
 */
```

```jsx
<button
  data-component="RecentlyEditedChip"
  type="button"
  onClick={onClick}
  className={`flex shrink-0 items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left transition hover:border-[color:var(--ui-accent)]/30`}
  style={{ borderColor: "var(--ui-border)", backgroundColor: "var(--ui-surface-2)" }}
>
  <FiClock className="shrink-0 text-xs" style={{ color: "var(--ui-text-subtle)" }} />
  <div className="flex min-w-0 flex-col">
    <span className="max-w-[10rem] truncate text-sm font-semibold" style={{ color: "var(--ui-text)" }}>{title}</span>
    <span className="text-[10px]" style={{ color: "var(--ui-text-subtle)" }}>{time}</span>
  </div>
</button>
```

**Migration:** `src/pages/app/Plays.jsx:496–507` — each chip in the horizontal scroll section

**Test:** `admin/test/recentlyEditedChip.test.js` — renders title, time, onClick fires

---

---

### `SidebarNavItem` ← move from admin barrel to shared DS barrel

**File:** `src/design-system/components/SidebarNavItem.jsx`
**data-component:** `"SidebarNavItem"`

The Q3 plan placed this in `src/admin/components/` (admin-only). That was wrong — the app
navigation sidebar uses the exact same nav-item shape. It belongs in the shared DS barrel.

```jsx
/**
 * Single navigation link inside a sidebar. Handles active state, icon, and optional badge.
 * Used by both the admin sidebar (AdminSidebar.jsx) and the app sidebar (AppLayout.jsx).
 * @param {string} label - Display text
 * @param {ReactNode} [icon] - Leading icon (any react-icons or inline SVG)
 * @param {string} [href] - Route path; renders as NavLink when provided
 * @param {boolean} [active=false] - Highlights item with accent background + inset ring
 * @param {string|number} [badge] - Notification count shown on trailing edge
 * @param {() => void} [onClick] - Called on click (used for mobile close + navigate)
 * @param {string} [className]
 */
```

Implementation:
- Renders as `<NavLink>` when `href` is provided, `<button>` otherwise
- `rounded-md px-3 py-2 text-xs font-semibold transition-colors w-full flex items-center gap-2.5`
- Active state:
  ```js
  style={{
    backgroundColor: "var(--ui-accent-muted)",
    color: "var(--ui-accent)",
    boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--ui-accent) 22%, transparent)",
  }}
  ```
- Inactive state: `color: var(--ui-text-muted)` + `hover:background: var(--ui-surface-2)`
- Icon: `shrink-0` wrapper, size `h-4 w-4`
- Badge: `<Badge size="xs" tone="accent">` trailing when badge prop provided

**Migration targets:**
- Every nav item `<NavLink>` or `<Link>` inside `src/admin/components/AdminSidebar.jsx`
- Every nav item inside the desktop sidebar section of `src/layouts/AppLayout.jsx`

**Test:** `admin/test/sidebarNavItem.test.js` — active state styling, badge render, onClick fires
*(This test may already exist from Q3; update it to import from the shared barrel instead of admin barrel.)*

---

### `Sidebar` (structural shell — shared DS barrel)

**File:** `src/design-system/components/Sidebar.jsx`
**data-component:** `"Sidebar"`

The structural wrapper shared by both navigation sidebars. Handles fixed positioning, responsive
width, overflow, border, and the three-zone layout (header / scrollable nav / footer). Neither
the admin nav config nor the app nav config lives here — those stay in their respective shells.

```jsx
/**
 * Structural sidebar shell used by both admin and app navigation.
 * Provides the three-zone layout: header (logo), scrollable nav area, and footer.
 * Does NOT know about routes, permissions, or specific nav items — those are provided by callers.
 *
 * @param {ReactNode} header - Logo area, top of sidebar (shrink-0, border-bottom)
 * @param {ReactNode} children - Scrollable navigation content (flex-1, overflow-y-auto)
 * @param {ReactNode} [footer] - Footer content: theme toggle (admin) or profile strip (app)
 * @param {"sm"|"md"|"lg"} [width="md"] - sm=w-52, md=w-60, lg=w-72
 * @param {"left"|"right"|"none"} [border="right"] - Which edge gets the 1px border
 * @param {string} [className]
 */
```

Implementation:
```jsx
<div
  data-component="Sidebar"
  className={`flex h-full flex-col overflow-hidden ${widthClass} ${className}`}
  style={{ backgroundColor: "var(--ui-bg)", borderColor: "var(--ui-border)" }}
>
  {/* Header zone — logo, wordmark, mobile close button */}
  <div className="flex h-14 shrink-0 items-center px-4" style={{ borderBottom: "1px solid var(--ui-border)" }}>
    {header}
  </div>

  {/* Nav zone — scrollable, hides scrollbar */}
  <div className="hide-scroll flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
    {children}
  </div>

  {/* Footer zone — theme toggle or profile strip */}
  {footer && (
    <div className="shrink-0 px-4 py-3" style={{ borderTop: "1px solid var(--ui-border)" }}>
      {footer}
    </div>
  )}
</div>
```

Width classes: `sm` → `w-52`, `md` → `w-60`, `lg` → `w-72`
Border: `right` → `border-r`, `left` → `border-l`, `none` → none (applied via className)

**Important — what this component does NOT handle:**
- Responsive mobile behavior (admin uses a slide-in drawer; app uses a bottom nav bar — these
  are parent-shell concerns, not sidebar concerns)
- Z-index stacking and fixed positioning (owned by `AdminShell` and `AppLayout`)
- Permission filtering (stays in the caller)
- Theme toggling or user profile logic (in footer slot)

**Migration targets:**
- `src/admin/components/AdminSidebar.jsx` — replace the outer `div` structure with `<Sidebar>`
  - `header` slot: logo image + mobile close button
  - `children`: mapped `<SidebarNavItem>` components
  - `footer`: theme toggle button (keep as local component inside AdminSidebar)
- `src/layouts/AppLayout.jsx` — replace the desktop sidebar `<div className="w-60 ...">` with `<Sidebar>`
  - `header` slot: logo + `<TeamSwitcher>`
  - `children`: mapped `<SidebarNavItem>` components
  - `footer`: user profile card + logout button (keep as local component inside AppLayout)

**Token migration for AppLayout sidebar:**
The desktop sidebar in `AppLayout.jsx` currently uses raw Brand* Tailwind classes. When
migrating to `<Sidebar>`, replace:
- `bg-BrandBlack` → `var(--ui-bg)` (handled by Sidebar)
- `border-BrandGray2/20` → `var(--ui-border)` (handled by Sidebar)
- `text-BrandGray hover:bg-BrandBlack2` on nav items → handled by `SidebarNavItem` inactive state
- `bg-BrandOrange/10 text-BrandOrange` on active items → handled by `SidebarNavItem` active state

**Test:** `admin/test/sidebar.test.js`
- renders header, children, footer slots
- footer absent when footer prop is not provided
- width class applied per `width` prop
- `data-component="Sidebar"` on root element

---

### `PlayPickerCard` (domain component — lives in `src/components/`, NOT DS barrel)

**File:** `src/components/PlayPickerCard.jsx`

```jsx
/**
 * Play card for browse / add-to-playbook contexts.
 * Distinct from PlayCard (owned play management) — different info hierarchy and no edit actions.
 * @param {{ id, title, description?, tags?, thumbnailUrl? }} play
 * @param {boolean} added
 * @param {boolean} [addLoading=false]
 * @param {boolean} [addSuccess=false]
 * @param {() => void} onAdd
 * @param {() => void} [onClick]
 */
```

Internally uses: `Card`, `Badge`, `Button`, `Spinner` from DS barrel.

**Migration:** `src/pages/app/Playbooks.jsx:107–187` — extract the entire inline play card JSX

**Test:** `admin/test/playPickerCard.test.js` — renders title, tags, add button, check when added

---

## A.4 — Raw Pattern Backfill (existing DS components not being used)

These are NOT new components — these are places where DS components already exist but pages use raw JSX. Fix in Session A2.

**`src/components/PlayCard.jsx`**
- `~172` raw `<button>` menu trigger → `<Button variant="ghost" size="icon">`
- `~208` `<div style={{ height: 1 }}>` → `<Divider />`
- `~215` raw `<span>` tag pills → `<Chip readonly leadingIcon={<FiTag />}>`
- `~232` raw `<button>` edit → `<Button variant="outline" size="sm" startIcon={<FiEdit2 />}>`

**`src/components/FolderCard.jsx`**
- `~109` raw `<button>` menu trigger → `<Button variant="ghost" size="icon">`
- `~125` `<div style={{ height: 1 }}>` → `<Divider />`
- `~134` `<span>` label chip → `<Badge>Folder</Badge>`
- `~137` `<span>` drag chip → `<Badge tone="accent">Drop Here</Badge>`

**`src/pages/app/Notifications.jsx:282`** — raw search div → `<SearchInput>`
**`src/pages/app/Playbooks.jsx:328`** — raw search div → `<SearchInput>`
**`src/pages/Admin.jsx`**
- `~1069` raw initials div → `<Avatar name={...} size="md" />`
- `~1119` raw role `<span>` → `<Badge>`
- `~1142` play count `<span>` → `<Badge tone="accent">`
- `~1420` raw search div → `<SearchInput>`
- `~1442` filter count `<span>` → `<Badge>`

**`src/pages/app/DemoVideos.jsx:334`** — raw empty state div → `<EmptyState>`

**`src/pages/app/PlayEdit.jsx:73`** — raw `fixed inset-0` exit confirmation →
```jsx
<ConfirmDialog open={showExitConfirm} title="Discard changes?" tone="danger" onConfirm={...} onCancel={...} />
```

**`src/pages/app/Settings.jsx:489`** — inline red confirmation div → `<ConfirmDialog>` triggered by state flag

**`src/pages/app/Plays.jsx:671`** — `<Button variant="ghost">` suggested tags → `<Chip onClick={...}>`

---

## A.5 — Session Breakdown

### Session A1 — Alias Purge

**Goal:** Zero `AdminX` / compat alias imports anywhere in the codebase.

1. Run: `grep -rln "AdminBtn\|AdminInput\|AdminTextarea\|AdminSelect\|AdminCheckbox\|AdminRadioGroup\|AdminToggle\|AdminCard\|AdminSection\|AdminModal\|AdminAlert\|AdminSpinner\|AdminSkeleton\|AdminProgress\|AdminEmptyState\|AdminBadge\|AdminChip\|AdminAvatar\|AdminTabs\|AdminBreadcrumbs\|AdminPagination\|AdminTooltip\|AdminDataTable\|KpiCard\|ConfirmModal\|MessagePopup" src/ --include="*.jsx"` to get the file list.
2. For each file: rewrite import to canonical DS name, update import path to `src/design-system/components/`.
3. `src/admin/components/index.js` — remove ALL `export { X as AdminX }` re-exports. Admin barrel only exports genuinely admin-specific components (AdminShell, AdminNav, AdminSidebar, AdminPlayCard, AdminFolderCard, AdminSectionRow).
4. `src/admin/analytics/KpiCard.jsx` → replace with: `export { default } from "../../design-system/components/StatCard";`
5. `src/components/layout/AppCard.jsx` and `AppSection.jsx` — if wrapper-only, replace content: `export { default } from "../../design-system/components/Card";`
6. `MessagePopup` / `useMessagePopup` callers → switch to `Toast` from DS barrel.
7. `ConfirmModal` callers → switch to `ConfirmDialog` from DS barrel.

**New test:** `admin/test/aliasPurge.test.js` — static source scan asserting no alias imports in any `.jsx` file outside `src/admin/components/index.js`.

**Guards (must return zero):**
```bash
grep -rn "AdminBtn\|AdminInput\|AdminTextarea\|AdminSelect\|AdminCheckbox\|AdminRadioGroup\|AdminToggle\|AdminCard\|AdminSection\|AdminModal\|AdminAlert\|AdminSpinner\|AdminSkeleton\|AdminProgress\|AdminEmptyState\|AdminBadge\|AdminChip\|AdminAvatar\|AdminTabs\|AdminBreadcrumbs\|AdminPagination\|AdminTooltip\|AdminDataTable" src/ --include="*.jsx"
grep -rn "KpiCard\|ConfirmModal" src/ --include="*.jsx"
```

**Commit:** `Design system Q4 Session 1: alias purge — kill all Admin* and compat aliases`

---

### Session A2 — Raw Pattern Backfill

**Goal:** Every DS component that exists gets used everywhere it applies.

Apply all changes listed in A.4 above.

**New test:** `admin/test/rawPatternGuard.test.js` — static scan:
- `PlayCard.jsx` contains zero `style={{ height: 1 }}`
- `FolderCard.jsx` contains zero `style={{ height: 1 }}`
- `PlayEdit.jsx` contains zero `fixed inset-0 z-50`
- `DemoVideos.jsx` contains zero `py-12 text-center` (raw empty state)

**Commit:** `Design system Q4 Session 2: backfill existing DS components into raw-JSX locations`

---

### Session A3 — Atomic Components I

**Build:** `IconBubble`, `AccordionItem`, `InlineEdit`, `TimestampChip`, `TokenBox`, `AuthCard`

**Barrel additions:**
```js
export { default as IconBubble }    from "./IconBubble";
export { default as AccordionItem } from "./AccordionItem";
export { default as InlineEdit }    from "./InlineEdit";
export { default as TimestampChip } from "./TimestampChip";
export { default as TokenBox }      from "./TokenBox";
export { default as AuthCard }      from "./AuthCard";
```

**Migration order (build each, then immediately migrate its usages):**
1. `IconBubble` → 5 app pages (ReportIssue, Profile, Team, PlayNew, ProfileEmailVerification)
2. `AccordionItem` → DemoVideos FAQ section
3. `InlineEdit` → PlayCard.jsx + FolderCard.jsx rename inputs
4. `TimestampChip` → PlayCard.jsx timestamp pill
5. `TokenBox` → Team.jsx invite code
6. `AuthCard` → AuthSection.jsx (design-rules) + migrate AdminX → DS inside that file

**Tests:** one file per component in `admin/test/`. Update `designSystemBarrel.test.js`.

**Commit:** `Design system Q4 Session 3: IconBubble, AccordionItem, InlineEdit, TimestampChip, TokenBox, AuthCard`

---

### Session A4 — Media and Display Components

**Build:** `VideoCard`, `BrowseTile`

**Barrel additions:**
```js
export { default as VideoCard }  from "./VideoCard";
export { default as BrowseTile } from "./BrowseTile";
```

**Migration:**
- `DemoVideos.jsx:156–202` → `<VideoCard thumbnailUrl={...} title={...} badge={...} isReady={...} onClick={...} />`
- `Playbooks.jsx:468–494` → `<BrowseTile color={...} icon={<FiBookOpen />} title={...} description={...} count={...} onClick={...} />`

**Tests:** `admin/test/videoCard.test.js`, `admin/test/browseTile.test.js`. Update barrel test.

**Commit:** `Design system Q4 Session 4: VideoCard, BrowseTile`

---

### Session A5 — Composite Input Components

**Depends on:** Session A3 complete (QuestionCard needs IconBubble)

**Build:** `TagInput`, `StarRating`, `QuestionCard`, `CodeInput`

**Barrel additions:**
```js
export { default as TagInput }     from "./TagInput";
export { default as StarRating }   from "./StarRating";
export { default as QuestionCard } from "./QuestionCard";
export { default as CodeInput }    from "./CodeInput";
```

**Migration:**
- `PlayNew.jsx:390–451` → `<TagInput value={tags} onChange={setTags} suggestions={allTags} />`
- `Plays.jsx:671–676` → `<TagInput value={bulkTags} onChange={setBulkTags} />`
- `Notifications.jsx:143–166` → `<StarRating value={Number(value)} onChange={onChange} />`
- `Notifications.jsx:246–268` → `<QuestionCard number={idx+1} label={block.label} required={block.required}>...</QuestionCard>`
- `ProfileEmailVerification.jsx:140–157` → `<CodeInput length={6} value={code} onChange={setCode} autoFocus />`

**Tests:** one file per component. Update barrel test.

**Commit:** `Design system Q4 Session 5: TagInput, StarRating, QuestionCard, CodeInput`

---

### Session A6 — PlayPickerCard

**Build:** `src/components/PlayPickerCard.jsx` (domain component — NOT in DS barrel)

**Export from:** `src/components/` (alongside PlayCard, FolderCard)

**Migration:** `Playbooks.jsx:107–187` → extract inline play card JSX → import `<PlayPickerCard>`

**Test:** `admin/test/playPickerCard.test.js`

**Commit:** `Design system Q4 Session 6: extract PlayPickerCard, formalize play card distinction`

---

### Session A7 — RecentlyEditedChip

**Build:** `RecentlyEditedChip`

**Barrel addition:**
```js
export { default as RecentlyEditedChip } from "./RecentlyEditedChip";
```

**Migration:** `Plays.jsx:496–507` — each chip in the horizontal scroll section. The outer `div.hide-scroll.flex.gap-2.overflow-x-auto` stays inline (single use).

**Test:** `admin/test/recentlyEditedChip.test.js`. Update barrel test.

**Commit:** `Design system Q4 Session 7: RecentlyEditedChip`

---

### Session A8 — Design-Rules Reconciliation

**Goal:** Every non-doc-only design-rules section imports and renders a real DS component.

For each section in `src/pages/designSystem/sections/`:
- Sections that are now implemented (AuthSection, any Video/Accordion/TagInput/etc. sections): remove `{/* doc-only */}` comment, import and render the real component.
- Sections still legitimately doc-only (Color, Brand, Values, Copy, Documentation, Overview, Accessibility, TypographySection, SpacingSection, DataVizSection, SlateSection, MarketingSection, AuthSection-previously, CommerceSection, FilesSection, EdgeCasesSection, OnboardingSection): ensure they have `{/* doc-only */}` comment.

**Guard test update:** `admin/test/designSystemSectionReconciliation.test.js` — add all Q4 sections to assertion list.

**Final guards (all must return zero after this session):**
```bash
grep -rn "AdminBtn\|AdminInput\|AdminModal\|AdminCard\|AdminSection\|AdminAlert\|AdminSpinner\|AdminSkeleton\|AdminProgress\|AdminEmptyState\|AdminBadge\|AdminChip\|AdminAvatar\|AdminTabs\|AdminBreadcrumbs\|AdminPagination\|AdminTooltip\|AdminDataTable\|AdminCheckbox\|AdminRadioGroup\|AdminToggle\|AdminTextarea\|AdminSelect\|KpiCard\|ConfirmModal" src/ --include="*.jsx"
grep -rn "fixed inset-0 z-50" src/pages --include="*.jsx"
grep -rn "style={{ height: 1 }}" src/ --include="*.jsx"
grep -rn "<table" src/pages --include="*.jsx"
```

**Commit:** `Design system Q4 Session 8: design-rules reconciliation, Q4 section guard tests`

---

### Session A9 — Shared Navigation Sidebar

**Goal:** Replace the two completely separate raw navigation sidebar implementations with shared
`Sidebar` + `SidebarNavItem` primitives from the DS barrel. After this session, both admin and
app draw their nav structure from the same components — only the nav config, footer content, and
mobile behavior differ.

**Critical distinction:** `WideSidebarRoot` (the drawing tool palette in `src/components/wideSidebar/`) is
NOT a navigation sidebar. It is Slate-editor-specific and moves to `src/features/slate/components/`
in Part B Phase B5. Do not touch it in this session.

**Files to create:**
- `src/design-system/components/Sidebar.jsx`
- `src/design-system/components/SidebarNavItem.jsx`

**Barrel additions:**
```js
export { default as Sidebar }        from "./Sidebar";
export { default as SidebarNavItem } from "./SidebarNavItem";
```

**Files to migrate:**

**`src/admin/components/AdminSidebar.jsx`**

Before (current structure):
```jsx
<div className="flex h-full w-52 flex-col ..." style={{ background: "var(--adm-bg)" }}>
  {/* logo row */}
  <div className="flex h-14 ..."><img src={logo} /></div>
  {/* nav items */}
  <nav className="flex-1 overflow-y-auto ...">
    {visibleItems.map(item => (
      <NavLink key={item.label} to={basePath + item.path} className={...} style={...}>
        {item.icon}
        <span>{item.label}</span>
      </NavLink>
    ))}
  </nav>
  {/* footer */}
  <div className="..." style={{ borderTop: "1px solid var(--adm-border)" }}>
    <ThemeToggleButton />
  </div>
</div>
```

After:
```jsx
<Sidebar
  width="sm"
  header={
    <>
      <img src={logo} alt="Coachable" className="h-7 object-contain" />
      <button className="lg:hidden ml-auto" onClick={onClose}><FiX /></button>
    </>
  }
  footer={<ThemeToggleButton />}
>
  {visibleItems.map(item => (
    <SidebarNavItem
      key={item.label}
      label={item.label}
      icon={item.icon}
      href={basePath + item.path}
      active={isActive(item)}
      onClick={onClose}  {/* closes mobile drawer after navigation */}
    />
  ))}
</Sidebar>
```

Note: `ThemeToggleButton` stays as a local component inside `AdminSidebar.jsx` — it is
admin-specific and does not need to be in the DS barrel.

**`src/layouts/AppLayout.jsx`** — desktop sidebar section only

Before (current structure — inside the `lg:flex` sidebar div):
```jsx
<div className="hidden lg:flex w-60 flex-col bg-BrandBlack border-r border-BrandGray2/20 ...">
  <div className="h-14 ..."><img src={logo} /><TeamSwitcher /></div>
  <nav className="flex-1 overflow-y-auto ...">
    {navItems.map(item => (
      <NavLink key={item.label} to={item.path}
        className={({ isActive }) =>
          isActive
            ? "bg-BrandOrange/10 text-BrandOrange font-semibold ..."
            : "text-BrandGray hover:bg-BrandBlack2 ..."
        }
      >
        {item.icon}
        {item.label}
      </NavLink>
    ))}
  </nav>
  <div className="...">
    {/* user avatar card + logout */}
  </div>
</div>
```

After:
```jsx
<div className="hidden lg:flex flex-col">
  <Sidebar
    width="md"
    header={
      <>
        <img src={logo} alt="Coachable" className="h-7 object-contain" />
        <TeamSwitcher />
      </>
    }
    footer={<AppSidebarFooter user={user} onLogout={logout} />}
  >
    {navItems.map(item => (
      <SidebarNavItem
        key={item.label}
        label={item.label}
        icon={item.icon}
        href={item.path}
        active={location.pathname.startsWith(item.path)}
      />
    ))}
  </Sidebar>
</div>
```

`AppSidebarFooter` — extract the user avatar card + logout button from `AppLayout.jsx` into a
small local component inside `AppLayout.jsx`. It does not go in the DS barrel (app-specific).

**Mobile behavior — do NOT change:**
- Admin mobile: the slide-in drawer toggled by `AdminShell` stays exactly as-is. `Sidebar` is
  already `h-full`, so it fills the drawer container correctly.
- App mobile: the bottom nav bar in `AppLayout.jsx` is completely separate from the sidebar and
  stays unchanged. `Sidebar` is only used for the desktop sidebar.

**Tests:**
- `admin/test/sidebar.test.js` — slots render, footer optional, width class, data-component attr
- `admin/test/sidebarNavItem.test.js` — active styling, badge renders, onClick fires
  *(If this test already exists from Q3, update the import path from admin barrel to DS barrel)*

**Guard (both must return zero after this session):**
```bash
# No raw nav items in either sidebar file
grep -n "NavLink\|<Link" src/admin/components/AdminSidebar.jsx
grep -n "NavLink\|<Link" src/layouts/AppLayout.jsx
```
Both files should only contain NavLink/Link inside the SidebarNavItem component itself.

**Commit:** `Design system Q4 Session 9: shared Sidebar + SidebarNavItem, migrate admin and app nav sidebars`

---

## A.6 — Part A Dependency Order

```
A1 (Alias Purge)
└─ A2 (Raw Backfill)
   └─ A3 (Atomic I: IconBubble, AccordionItem, InlineEdit, TimestampChip, TokenBox, AuthCard)
      ├─ A4 (Media: VideoCard, BrowseTile)           ← no cross-dep with A5/A6
      ├─ A5 (Composites: TagInput, StarRating, QuestionCard*, CodeInput) * needs IconBubble
      └─ A6 (PlayPickerCard)                         ← no cross-dep with A4/A5
         └─ A7 (RecentlyEditedChip)
            └─ A8 (Reconciliation — needs all prior sessions)
```

A4, A5, A6, and A9 can run in parallel if agents are available (none depend on each other).
Sequential order: A1 → A2 → A3 → [A4 | A5 | A6 | A9] → A7 → A8.

```
A1 (Alias Purge)
└─ A2 (Raw Backfill)
   └─ A3 (Atomic I: IconBubble, AccordionItem, InlineEdit, TimestampChip, TokenBox, AuthCard)
      ├─ A4 (Media: VideoCard, BrowseTile)
      ├─ A5 (Composites: TagInput, StarRating, QuestionCard*, CodeInput)  * needs IconBubble from A3
      ├─ A6 (PlayPickerCard)
      └─ A9 (Sidebar + SidebarNavItem — migrate AdminSidebar + AppLayout)
         └─ A7 (RecentlyEditedChip)
            └─ A8 (Reconciliation — needs all prior sessions)
```

---

## A.7 — Part A Definition of Done

1. All 9 sessions committed, build passing, vitest passing.
2. `grep -rn "AdminBtn\|Admin[A-Z]" src/ --include="*.jsx"` → zero (outside `src/admin/components/index.js`).
3. `grep -rn "fixed inset-0 z-50" src/pages --include="*.jsx"` → zero.
4. `grep -rn "style={{ height: 1 }}" src/ --include="*.jsx"` → zero.
5. `grep -rn "<table" src/pages --include="*.jsx"` → zero.
6. Ctrl+Shift+D shows a component name over every meaningful surface — including both sidebars.
7. Every non-doc-only design-rules section imports a real DS component.
8. `src/admin/components/index.js` exports zero `Admin*` aliases.
9. `AdminSidebar.jsx` and `AppLayout.jsx` sidebar section both use `<Sidebar>` + `<SidebarNavItem>` from the DS barrel.
10. `WideSidebarRoot` (tool palette) is untouched — it moves in Part B Phase B5, not here.
11. `npx vitest run` passes at or above Q3 baseline.
12. `npm run build` stays within Cloudflare Pages 25 MiB per-asset limit.

---

---

# PART B — Directory Restructuring

These are pure file moves + import path updates. No component logic changes.

---

## B.1 — Target Directory Structure

```
src/
│
├── admin/                          (unchanged — admin-only non-page code)
│   ├── AdminContext.jsx
│   ├── AdminFlagGate.jsx
│   ├── RequirePerm.jsx
│   ├── StaffAdminManager.jsx
│   ├── admin.css
│   ├── adminNav.js
│   ├── adminTransport.js
│   ├── analytics/
│   ├── components/                 (admin barrel — Q4 Part A removes Admin* aliases)
│   └── designSystem/              ← MOVED from src/pages/designSystem/
│       ├── DesignSystemPage.jsx
│       ├── SearchPalette.jsx
│       ├── designSystemNav.js
│       ├── designSystemSearch.js
│       ├── designSystemSections.js
│       ├── dsPrimitives.jsx
│       └── sections/              (all section files)
│
├── api/                           ← NEW — extracted from src/utils/
│   ├── api.js
│   ├── apiFolders.js
│   ├── apiPlays.js
│   ├── playbookSectionsApi.js
│   ├── notificationsApi.js
│   ├── prefabsApi.js
│   └── adminElevation.js
│
├── canvas/                        (unchanged)
│   └── debug/                     ← NEW — moved from canvas/ root
│       └── drawDebugLogger.js
│
├── components/
│   ├── layout/                    (unchanged + AppLayout.jsx MOVED here from src/layouts/)
│   │   ├── AppLayout.jsx          ← MOVED from src/layouts/AppLayout.jsx
│   │   ├── AppShell.jsx
│   │   ├── AppPage.jsx
│   │   ├── AppHeader.jsx
│   │   ├── AppSection.jsx
│   │   └── AppCard.jsx
│   ├── MessagePopup/              ← useMessagePopup.js MERGED in from messaging/
│   │   ├── MessagePopup.jsx
│   │   ├── useMessagePopup.js     ← MOVED from src/components/messaging/
│   │   └── index.js               ← NEW barrel
│   ├── DevOverlay/                (unchanged)
│   ├── FolderCard.jsx
│   ├── PlayCard.jsx
│   ├── PlayPickerCard.jsx         ← NEW (from Part A Session A6)
│   ├── PlayPreviewCard.jsx
│   ├── PlayPreviewPlayer.jsx
│   ├── PlayPickerModal.jsx
│   ├── AuthPromptModal.jsx
│   ├── NotificationBell.jsx
│   ├── RecipientPicker.jsx
│   ├── SaveToPlaybookModal.jsx
│   ├── SportAwarePublicNav.jsx
│   └── TeamSwitcher.jsx
│   (NOTE: src/components/index.js deleted per Q6 decision)
│
├── data/                          ← NEW
│   ├── football-presets-all-formations.json  ← MOVED from project root
│   └── soccer-presets-all-formations.json   ← MOVED from project root
│
├── design-system/                 (unchanged — stays as-is per Q4=A decision)
│   └── components/
│       └── index.js               (canonical barrel)
│
├── features/
│   └── slate/
│       ├── Slate.jsx
│       ├── SlateRecord.jsx
│       ├── hooks/
│       ├── utils/
│       ├── debug/                 ← NEW — moved from slate/ root
│       │   ├── placeBallDebugLogger.js
│       │   ├── prefabDebugLogger.js
│       │   ├── recordingDebugLogger.js
│       │   └── rotationDebugLogger.js
│       └── components/            ← NEW — MOVED from src/components/ (Q3=A decision)
│           ├── controlPill/
│           ├── sidebar/
│           ├── rightPanel/
│           ├── wideSidebar/
│           ├── advancedSettings/
│           ├── subcomponents/
│           ├── toolPills/
│           ├── RightPanel.jsx
│           ├── WideSidebar.jsx
│           ├── AdvancedSettings.jsx
│           ├── AnimationDrawingTools.jsx
│           ├── DrawToolsPill.jsx
│           ├── ExportModal.jsx
│           ├── ExportOverlay.jsx
│           ├── MobileEditorBar.jsx
│           ├── MobileViewOnlyGate.jsx
│           ├── RecordingControlBar.jsx
│           ├── RecordingCountdown.jsx
│           ├── RecordingTimelinePill.jsx
│           ├── SavePrefabModal.jsx
│           ├── ScreenshotConfirmBar.jsx
│           └── ViewOnlyControls.jsx
│
├── hooks/                         ← NEW — extracted from src/utils/
│   ├── useThemeColor.js
│   └── usePageMeta.js
│
├── pages/
│   ├── admin/                     ← NEW subfolder
│   │   ├── Admin.jsx
│   │   ├── AdminUsersPage.jsx
│   │   ├── AdminPlaysPage.jsx
│   │   ├── AdminNotificationsPage.jsx
│   │   ├── AdminOutreachScraperPage.jsx
│   │   ├── AdminEmailPage.jsx
│   │   ├── AdminRecurringEmailPage.jsx
│   │   ├── AdminFeatureFlagsPage.jsx
│   │   ├── AdminSportPresetsPage.jsx
│   │   ├── AdminSportPrefabPresetsPage.jsx
│   │   ├── AdminPresetEditPage.jsx
│   │   ├── AdminPrefabPresetEditPage.jsx
│   │   ├── AdminPlayEditPage.jsx
│   │   ├── AdminDemoVideos.jsx
│   │   ├── AdminErrors.jsx
│   │   ├── AdminGIFTest.jsx
│   │   ├── AdminMobileView.jsx
│   │   ├── AdminOnePage.jsx
│   │   ├── AdminStaff.jsx
│   │   ├── AdminTestSlate.jsx
│   │   ├── AdminTests.jsx
│   │   ├── AdminUserActivity.jsx
│   │   └── AdminUserIssues.jsx
│   │
│   ├── app/                       (unchanged)
│   │   ├── DemoVideos.jsx
│   │   ├── Notifications.jsx
│   │   ├── PlayEdit.jsx
│   │   ├── PlayNew.jsx
│   │   ├── PlayView.jsx
│   │   ├── Playbooks.jsx
│   │   ├── Plays.jsx
│   │   ├── Profile.jsx
│   │   ├── ProfileEmailVerification.jsx
│   │   ├── ReportIssue.jsx
│   │   ├── Settings.jsx
│   │   └── Team.jsx
│   │
│   ├── auth/                      ← NEW (Q2=A)
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── ForgotPassword.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── VerifyEmail.jsx
│   │   └── StaffLogin.jsx
│   │
│   ├── public/                    ← NEW (Q2=A)
│   │   ├── Landing.jsx
│   │   ├── Enterprise.jsx
│   │   ├── Resources.jsx
│   │   ├── PlatformPlayView.jsx
│   │   ├── PublicPlaybooksPage.jsx
│   │   ├── SharedPlay.jsx
│   │   ├── SharedFolder.jsx
│   │   └── SharedPlayView.jsx
│   │
│   ├── NotFound.jsx               (stays at root)
│   ├── MaintenancePage.jsx        (stays at root)
│   ├── NoTeam.jsx                 (stays at root)
│   ├── Onboarding.jsx             (stays at root)
│   ├── SportPickerPage.jsx        (stays at root)
│   ├── StaffDashboard.jsx         (stays at root)
│   └── StaffAcceptInvite.jsx      (stays at root)
│
├── test-harness/                  ← RENAMED from root admin/
│   └── test/                      (all 89 test files stay as-is)
│
└── utils/                         (SLIMMED — pure stateless functions only)
    ├── rotatePoint.js
    ├── smoothTrack.js
    ├── stepColor.js
    ├── mobileViewport.js
    ├── inputValidation.js
    ├── dataContracts.js
    ├── errorReporter.js
    ├── exportPlay.js
    ├── importPlay.js
    ├── appPlaysStorage.js
    ├── playbookStorage.js
    ├── sportPrefabPresets.js
    ├── sportPresetBundles.js
    ├── sportSeo.js
    ├── customPrefabs.js
    ├── gifEncoder.js
    ├── videoEncoder.js
    ├── gifExportDebugLogger.js
    ├── playPersistenceDebugLogger.js
    └── videoExportDebugLogger.js
```

---

## B.2 — Phase Breakdown

Execute in this order. Each phase ends with `npm run build` passing.

### Phase B1 — Tiny wins (no blast radius)

**B1a — Merge `src/layouts/` into `src/components/layout/`**
1. Move `src/layouts/AppLayout.jsx` → `src/components/layout/AppLayout.jsx`
2. Update the single import in `App.jsx`
3. Delete `src/layouts/`

**B1b — Merge `messaging/` into `MessagePopup/`**
1. Move `src/components/messaging/useMessagePopup.js` → `src/components/MessagePopup/useMessagePopup.js`
2. Create `src/components/MessagePopup/index.js` barrel re-exporting both
3. Delete `src/components/messaging/`
4. Update consumers of `useMessagePopup` import path

**B1c — Move root JSON data files**
1. Create `src/data/`
2. Move `football-presets-all-formations.json` and `soccer-presets-all-formations.json` → `src/data/`
3. Update imports in `src/utils/sportPresetBundles.js`

**B1d — Delete `src/components/index.js` barrel** (Q6=delete decision)
1. Search for any file importing from `src/components/index.js` or `"../components"` + (PlayCard|FolderCard)
2. Update each to import directly from `"../components/PlayCard"` / `"../components/FolderCard"`
3. Delete `src/components/index.js`

**B1e — Archive dead reference material**
1. Move `konvaContext/` → `.codex/konvaContext/` (or delete if confirmed unused)
2. Move planning MDs to `.codex/`: `CODEX_SESSION_1–4_PROMPT.md`, `DESIGN_SYSTEM_Q2_PLAN.md`, `DESIGN_SYSTEM_Q3_PLAN.md`, `DESIGN_SYSTEM_Q4_PLAN.md`, `COMPONENT_SYSTEM_PLAN.md`, `OUTREACH_SCRAPER_PLAN.md`, `STAFF_ADMIN_PLAN.md`, `STAFF_ADMIN_HANDOFF.md`
3. Keep at root: `README.md`, `CLAUDE.md`, `CRAWLER_MAP.md`, `NEXT_STEPS.md`, `FILE_STRUCTURE_PLAN.md` (this file)

**Commit:** `Restructure B1: layouts merge, messaging merge, data dir, component barrel cleanup`

---

### Phase B2 — Extract API layer and hooks

**B2a — Create `src/api/` and move API files**
1. Create `src/api/`
2. Move from `src/utils/`:
   - `api.js`, `apiFolders.js`, `apiPlays.js`, `playbookSectionsApi.js`, `notificationsApi.js`, `prefabsApi.js`, `adminElevation.js`
3. Grep for all imports of these files across the project and update paths

**B2b — Create `src/hooks/` and move React hooks**
1. Create `src/hooks/`
2. Move `src/utils/useThemeColor.js` → `src/hooks/useThemeColor.js`
3. Move `src/utils/usePageMeta.js` → `src/hooks/usePageMeta.js`
4. Update consumers (primarily `AppLayout.jsx` and any page using `usePageMeta`)

**Commit:** `Restructure B2: extract src/api/ and src/hooks/ from src/utils/`

---

### Phase B3 — Reorganize `src/pages/admin/`

1. Create `src/pages/admin/`
2. Move every `src/pages/Admin*.jsx` into `src/pages/admin/`
3. Update all router imports in `App.jsx`
4. Update any cross-imports between admin pages

~20 file moves + ~20 import updates. No logic changes.

**Commit:** `Restructure B3: move Admin*.jsx into pages/admin/`

---

### Phase B4 — Reorganize auth and public pages (Q2=A)

1. Create `src/pages/auth/` and `src/pages/public/`
2. Move auth pages (Login, Signup, ForgotPassword, ResetPassword, VerifyEmail, StaffLogin) → `src/pages/auth/`
3. Move public pages (Landing, Enterprise, Resources, PlatformPlayView, PublicPlaybooksPage, SharedPlay, SharedFolder, SharedPlayView) → `src/pages/public/`
4. Update `App.jsx` router imports

**Commit:** `Restructure B4: pages/auth/ and pages/public/ subfolders`

---

### Phase B5 — Move slate components into feature folder (Q3=A)

1. Create `src/features/slate/components/`
2. Move all slate-only component folders and root files from `src/components/`:
   - `controlPill/`, `sidebar/`, `rightPanel/`, `wideSidebar/`, `advancedSettings/`, `subcomponents/`, `toolPills/`
   - `RightPanel.jsx`, `WideSidebar.jsx`, `AdvancedSettings.jsx`, `AnimationDrawingTools.jsx`, `DrawToolsPill.jsx`, `ExportModal.jsx`, `ExportOverlay.jsx`, `MobileEditorBar.jsx`, `MobileViewOnlyGate.jsx`, `RecordingControlBar.jsx`, `RecordingCountdown.jsx`, `RecordingTimelinePill.jsx`, `SavePrefabModal.jsx`, `ScreenshotConfirmBar.jsx`, `ViewOnlyControls.jsx`
3. Update all imports — primarily `Slate.jsx` and `KonvaCanvasRoot.jsx`

**High-risk step** — the slate feature tree is large. Before executing:
- Run `grep -rn "from.*components/controlPill\|from.*components/sidebar\|from.*components/rightPanel\|from.*components/wideSidebar\|from.*components/advancedSettings" src/ --include="*.jsx"` to get the complete import list
- Update every hit

**Commit:** `Restructure B5: move slate-only components to features/slate/components/`

---

### Phase B6 — Move design system visualizer (low risk)

1. Move `src/pages/designSystem/` → `src/admin/designSystem/`
2. Update the router import in `App.jsx` for the `/design-rules` route
3. Update all internal cross-imports inside the designSystem folder

**Commit:** `Restructure B6: move designSystem visualizer to src/admin/designSystem/`

---

### Phase B7 — Rename root `admin/` → `test-harness/`

**Before starting:** Check if root `admin/` has its own `package.json`. If it does, the `name` field and scripts may reference `admin/` — update those too.

1. Rename `admin/` → `test-harness/`
2. Update `vitest.config.js` — test file include paths
3. Update any `package.json` scripts referencing `admin/test/`
4. Update internal test file imports using relative paths back to `src/`
5. Update `CLAUDE.md` references to `admin/test/`

**Risk note:** This touches the test harness directly. Run `npx vitest run` before and after to confirm zero change in test results.

**Commit:** `Restructure B7: rename root admin/ test harness to test-harness/`

---

### Phase B8 — Move debug loggers to debug/ subdirectories

1. Create `src/features/slate/debug/` and move: `placeBallDebugLogger.js`, `prefabDebugLogger.js`, `recordingDebugLogger.js`, `rotationDebugLogger.js`
2. Create `src/canvas/debug/` and move: `drawDebugLogger.js`
3. Update imports in their consumers

**Commit:** `Restructure B8: move debug loggers to feature debug/ subdirectories`

---

### Phase B9 — Clarify test directories

Two options — pick one:

**Option 1 (recommended):** Rename `src/testing/` → `src/test-runner/` to make the distinction obvious.
- `src/test/` = component render tests (Vitest)
- `src/test-runner/` = standalone runner scripts (manually invoked, not Vitest)

**Option 2:** Merge `src/test/*.test.jsx` into `test-harness/test/` so all test files live in one harness. Requires updating `vitest.config.js` include paths and any relative imports in moved files.

**Commit:** `Restructure B9: clarify src/test/ vs src/testing/ distinction`

---

## B.3 — Pages Folder Rule (going forward)

After Part B:
1. **No component definitions in pages** — any function returning JSX lives in `src/components/` or the relevant feature's `components/` folder.
2. **Imports only** — pages import from `components/`, `admin/`, `design-system/`, `api/`, `features/`, `hooks/`, `utils/`. Pages define no reusable UI.
3. **One file per route** — no sub-files inside a page that aren't themselves routed pages.

---

## B.4 — Part B Priority Order

| Priority | Phase | Impact | Effort |
|---|---|---|---|
| 1 | B1a — merge src/layouts/ | High | Tiny |
| 2 | B2b — extract src/hooks/ | High | Low |
| 3 | B2a — extract src/api/ | High | Medium |
| 4 | B3 — pages/admin/ subfolder | High | Medium |
| 5 | B7 — rename root admin/ → test-harness/ | High | Medium |
| 6 | B1b — merge messaging/ | Medium | Tiny |
| 7 | B4 — pages/auth/ + pages/public/ | Medium | Medium |
| 8 | B5 — slate components to feature | Medium | Large |
| 9 | B6 — designSystem to admin/ | Medium | Low |
| 10 | B1d — delete components/index.js | Medium | Low |
| 11 | B8 — debug subdirectories | Low | Trivial |
| 12 | B9 — clarify test dirs | Low | Medium |
| 13 | B1c — root JSON to src/data/ | Low | Trivial |
| 14 | B1e — archive planning MDs | Low | Trivial |

---

## B.5 — What Does NOT Change

- No component logic, props, or API changes in Part B
- `src/canvas/` internals (except debug loggers)
- `src/features/slate/hooks/` and `src/features/slate/utils/`
- `App.jsx` routing logic — only import paths update, not route strings
- All test assertions and test logic
- `src/design-system/` directory name and structure (Q4=A decision)

---

# Combined Execution Order

Run Part A first (component work) on the current branch, then Part B (structural work) on a separate branch from main after Part A merges. This avoids path conflicts during restructuring — Part B moves files that Part A has already finished editing.

```
Part A Sessions (current branch: claude/component-system-integration)
  A1 → A2 → A3 → [A4, A5, A6, A9 in parallel or sequence] → A7 → A8
  ↓
Merge to main
  ↓
Part B Phases (new branch: claude/file-structure-reorganization)
  B1 (all sub-phases) → B2 → B3 → B4 → B5 → B6 → B7 → B8 → B9
  ↓
Merge to main
```

Do NOT interleave Part A and Part B work. In particular:
- `AdminSidebar.jsx` is migrated to use `<Sidebar>` in Part A Session A9
- `AppLayout.jsx` sidebar section is migrated in Part A Session A9
- The slate tool palette (`WideSidebarRoot`) is moved to `src/features/slate/components/` in Part B Phase B5
- These are three different components with three different owners — treat them independently
