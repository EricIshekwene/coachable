# Coachable Unified Design System Q2 Plan

## Purpose

This plan consolidates repeated admin and app UI into a shared styling guardrail under
`src/design-system/components/`. It is intentionally limited to general-purpose HTML UI.
It does not change product behavior, routes, data contracts, or the Konva renderer.

Locked decisions from `COMPONENT_SYSTEM_PLAN.md` remain in force:

- Shared components live in `src/design-system/components/`.
- Shared names have no `Admin` prefix.
- Existing imports remain compatible through alias re-exports.
- Tailwind CSS 4 and CSS custom properties remain the only styling mechanisms.
- The existing logic-mirror test style remains the baseline; RTL is added only where
  interaction semantics cannot be covered credibly by pure mirrors.

### Scope exclusions

The following are excluded from component inventory and migration:

- `src/features/slate/**`
- `src/canvas/**`
- `src/components/PlayPreviewCard.jsx`
- `src/components/PlayPreviewPlayer.jsx`
- Canvas-coupled controls under `src/components/controlPill/`,
  `src/components/rightPanel/`, drawing tools, recording controls, and editor-only
  overlays.

Grep hits from excluded paths are retained in the audit evidence and marked
**SLATE - excluded**. No implementation session should edit those files.

### Repository facts that affect the plan

- `src/admin/components/index.js` currently has **30 exports**, not 31:
  27 shell/layout/primitives plus 3 plays-manager composites.
- `src/components/index.js` exports `PlayCard` and `FolderCard`.
- `src/components/layout/index.js` exports five app layout primitives.
- There is no `src/pages/app/TeamSettings.jsx`; the relevant settings surfaces are
  `Settings.jsx` and `Team.jsx`.
- Current MUI usage is `Slider` only, in editor/canvas-adjacent components. No current
  source file imports MUI `Dialog` or `Modal`.

---

## 0. Cross-cutting Implementation Rules

These rules apply to every session. They supplement `CLAUDE.md`/`AGENTS.md` and are
repeated here so the executing agent always has them in scope.

### `data-component` attribute

Every component created in `src/design-system/components/` **must** add
`data-component="ComponentName"` to its outermost DOM element. This is the attribute
the Dev Overlay (Ctrl+Shift+D, `src/components/DevOverlay/`) reads to render component
badges. No exceptions — a component without this attr is invisible to the overlay.

```jsx
// example
export default function Button({ ... }) {
  return (
    <button data-component="Button" ...>
      {children}
    </button>
  );
}
```

### Layout components — re-export only, do not move files

The five layout primitives already exist at `src/components/layout/`:
`AppShell`, `AppPage`, `AppHeader`, `AppSection`, `AppCard`.

Do **not** move those files. Instead, the Session 1 design-system barrel re-exports them
under their canonical shared names:

```js
// src/design-system/components/index.js
export { default as PageShell } from "../../components/layout/AppShell";
export { default as Page }      from "../../components/layout/AppPage";
export { default as PageHeader } from "../../components/layout/AppHeader";
// Section and Card will be the new shared primitives; AppSection/AppCard become aliases.
```

`src/components/layout/index.js` stays intact for the existing callers.

### `--ui-*` token placement

Add `--ui-*` tokens to the **`:root` block** in `src/index.css`, not under `@theme`.
`@theme` generates Tailwind utility classes; `:root` declares runtime CSS custom
properties that components read with `var()`. Keep them beside the existing radius and
shadow tokens.

### Test file location

| Test type | Location |
|---|---|
| Logic-mirror tests (pure class/state/resolver logic — no DOM) | `admin/test/` — new file per group, e.g. `sharedPrimitives.test.js` |
| RTL / interaction tests (keyboard, focus, aria, click) | `src/test/` — one file per component or group |

### CRAWLER_MAP.md

Update `CRAWLER_MAP.md` in the same commit as any new file, rename, or directory
creation. Add new design-system entries under the `Admin shared UI` or a new
`Design system primitives` block — do not let them be undiscoverable.

### Implementation documentation

`src/design-system/DESIGN_SYSTEM.md` must be created in Session 1. It must cover:
directory layout, canonical barrel import path, naming convention, `--ui-*` token
usage rule, `data-component` requirement, alias policy, and how to add a new component.
Update it at the end of each subsequent session.

---

## 1. Audit Results

### 1.1 Requested grep baseline

Counts below are literal match counts from the requested regexes. They are useful
regression baselines, but they are not all semantic component counts. For example,
`className=.*rounded-lg border border-BrandGray` matches buttons and cards as well as
inputs.

| Requested search | Matches | Files | Notes |
|---|---:|---|---|
| Raw input pattern | 62 | `NoTeam.jsx`, `PlatformPlayView.jsx`, `SharedPlay.jsx`, `SharedFolder.jsx`, app: `Team.jsx`, `Settings.jsx`, `PlayNew.jsx`, `PlayView.jsx`, `PlayEdit.jsx`, `Profile.jsx`, `Plays.jsx`, `Notifications.jsx` | Broad prefix search; includes non-input elements. |
| `bg-BrandOrange` in app pages | 58 | `DemoVideos.jsx`, `Notifications.jsx`, `Playbooks.jsx`, `PlayEdit.jsx`, `PlayNew.jsx`, `Plays.jsx`, `PlayView.jsx`, `Profile.jsx`, `ProfileEmailVerification.jsx`, `ReportIssue.jsx`, `Settings.jsx`, `Team.jsx` | Includes buttons, selected states, icons, dots, and decorative surfaces. |
| Secondary/ghost pattern | 49 | `Team.jsx`, `Plays.jsx`, `PlayEdit.jsx`, `Profile.jsx`, `Settings.jsx`, `PlayNew.jsx`, `PlayView.jsx`, `Notifications.jsx` | Mostly buttons and fields, with some bordered rows. |
| Modal overlay | 15 | `StaffAdminManager.jsx`, `AdminPlaysPage.jsx`, `AdminRecurringEmailPage.jsx`, `AdminModal.jsx`, `PlayPickerModal.jsx`, `Resources.jsx`, app: `DemoVideos.jsx`, `Plays.jsx`, `Team.jsx` | Seven app-page overlays; one hit is the `AdminModal` documentation comment. |
| Badge/pill | 12 | App: `Settings.jsx`, `DemoVideos.jsx`, `Playbooks.jsx`, `Notifications.jsx` | Three hits are spinner circles rather than badges. |
| Spinner | 41 | `App.jsx`, `RequirePerm.jsx`, `AdminPlayEditPage.jsx`, `AdminPresetEditPage.jsx`, `AdminPrefabPresetEditPage.jsx`, `AdminSectionRow.jsx`, `AdminPlayCard.jsx`, `AdminSpinner.jsx`, `StaffDashboard.jsx`, `PlatformPlayView.jsx`, `SharedPlayView.jsx`, `Onboarding.jsx`, `Landing.jsx`, `SharedPlay.jsx`, `PublicPlaybooksPage.jsx`, `SharedFolder.jsx`, `PlayViewOnlyPage.jsx`, `PlayEditPage.jsx`, app: `DemoVideos.jsx`, `Notifications.jsx`, `Playbooks.jsx`, `PlayView.jsx`, `Plays.jsx`, design-system `InteractionStatesSection.jsx`, plus `Slate.jsx` and `SlateRecord.jsx` | The two Slate hits are **SLATE - excluded**. |
| Empty state | 7 | App: `Plays.jsx`, `Playbooks.jsx`, `Notifications.jsx`, `Settings.jsx` | Seven actual centered state layouts. |
| Context-menu shape | 2 | `src/components/FolderCard.jsx`, `src/components/PlayCard.jsx` | Both are existing app card menus. Similar `z-20` popovers in app pages are missed by this exact regex. |

### 1.2 Semantic app-page counts

All 12 files under `src/pages/app/*.jsx` were included. Counts are native JSX element
or repeated-shape counts, independent of class ordering.

| Pattern | Count | Files | Existing admin coverage | Variation and consolidation decision |
|---|---:|---|---|---|
| Button/action | 89 raw `<button>` plus 4 styled `<Link>` actions | All 12 app pages | `AdminBtn` | At least primary, secondary, outline, danger, ghost, icon, selected, and full-width variants; radii vary `md/lg/xl/full`. Consolidate as `Button`; use `size="icon"` rather than a separate icon-button primitive. |
| Primary action | 17 action elements | `Notifications.jsx`, `Playbooks.jsx`, `PlayEdit.jsx`, `PlayNew.jsx`, `Plays.jsx`, `PlayView.jsx`, `Profile.jsx`, `ReportIssue.jsx`, `Settings.jsx`, `Team.jsx` | `AdminBtn variant="primary"` | Mostly orange fill, but padding, radius, active scale, text color, and disabled order differ. |
| Danger action | 6 action elements | `PlayEdit.jsx`, `Plays.jsx`, `Profile.jsx`, `Settings.jsx`, `Team.jsx` | `AdminBtn variant="danger"` | Red fill versus red outline is meaningful; support `danger` and `danger-outline`. |
| Input | 23 | All app pages except `PlayEdit.jsx` and `PlayView.jsx` | `AdminInput` | Standard, search-with-icon, monospace code, OTP, and transparent tag-entry variants. Use `Input` plus `startIcon`, `endAction`, and `appearance`; keep OTP as page composition. |
| Textarea | 4 | `Notifications.jsx`, `Plays.jsx`, `PlayView.jsx`, `ReportIssue.jsx` | `AdminTextarea` | Two radii and two resize policies. |
| Select | 4 | `Notifications.jsx`, `Plays.jsx`, `Profile.jsx`, `Settings.jsx` | `AdminSelect` | Same visual field with inconsistent chevron handling. |
| Field label/helper/error | 17 labels; repeated helper/error text across 8 files | `PlayNew.jsx`, `Plays.jsx`, `PlayView.jsx`, `Profile.jsx`, `ReportIssue.jsx`, `Settings.jsx`, plus inline form components | Embedded in admin field components | Extract `Field`/`FieldMessage` composition so labels, counts, hints, and errors do not require page-local class strings. |
| Checkbox | 1 native checkbox plus custom multi-select/radio-like controls | `Playbooks.jsx`, `Notifications.jsx` | `AdminCheckbox`, `AdminRadioGroup` | Native checkbox is straightforward. Notification question choices need `CheckboxGroup`/`RadioGroup` composition, not bespoke circles. |
| Toggle/switch | 1 repeated local `ToggleRow`, used multiple times | `Settings.jsx` | `AdminToggle` | Existing app switch lacks `role="switch"` and `aria-checked`; replace with shared `Toggle`. |
| Modal/dialog | 7 app-page overlays | `DemoVideos.jsx` (1), `Plays.jsx` (5), `Team.jsx` (1) | `AdminModal`; separate `ConfirmModal`; `PlayPickerModal` hand-rolls shell | Overlay opacity, blur, width, close rules, padding, and z-index vary. Build `Modal` shell and `ConfirmDialog`; retain feature body composition. |
| Toast/notification popup | 2 duplicate page-local toasts plus existing global `MessagePopup` | `Plays.jsx`; `MessagePopup` used elsewhere | No admin primitive | Standardize on `Toast` plus existing `useMessagePopup` compatibility adapter. Do not create a second notification state system. |
| Alert/banner | 12 semantic surfaces | `DemoVideos.jsx`, `Notifications.jsx`, `Playbooks.jsx`, `Plays.jsx`, `Profile.jsx`, `ReportIssue.jsx`, `Settings.jsx`, `Team.jsx` | `AdminAlert` | Error, success, warning, info, and accent-info patterns vary in border presence and padding. |
| Spinner/loader | 8 app-page hits; 41 repository hits | App: `DemoVideos.jsx`, `Notifications.jsx`, `Playbooks.jsx`, `Plays.jsx`, `PlayView.jsx`; repo-wide list in grep baseline | `AdminSpinner` | Icon rotation and CSS border spinners use 3 sizes and 3 border widths. Shared `Spinner` supports `size` and `tone`. Two repo hits are **SLATE - excluded**. |
| Skeleton | 0 app-page hits | None | `AdminSkeleton` | Move/alias for completeness, but do not invent app adoption work. |
| Empty state | 7 | `Notifications.jsx`, `Playbooks.jsx`, `Plays.jsx`, `Settings.jsx` | `AdminEmptyState` | Icon containers range from none to 64px and borders range from none to full cards. Support `contained` and `compact`. |
| Card/panel | 43 bordered rounded `xl/2xl/3xl` surfaces | All except `Profile.jsx` uses shared `AppCard` for its main sections | `AdminCard`; `AppCard` | Surface fills, radius, padding, hover, and elevation vary. Consolidate general surfaces; leave domain preview tiles as composites. |
| Section + heading | 23 uppercase tracking labels | All major content pages | `AdminSection`; `AppSection` | Existing app section primitive already matches the dominant micro-heading pattern. Move to shared `Section`, alias both surface names where compatible. |
| Divider | 8 explicit BrandGray2 top/bottom dividers | `DemoVideos.jsx`, `Playbooks.jsx`, `PlayEdit.jsx`, `PlayNew.jsx`, `Profile.jsx` | None | Add `Divider` to eliminate opacity/rule drift. |
| Badge/status pill | 16 pill/chip shapes after excluding spinner circles | `DemoVideos.jsx`, `Notifications.jsx`, `Playbooks.jsx`, `PlayView.jsx`, `Settings.jsx` | `AdminBadge`, `AdminChip` | Badge, selectable filter chip, count bubble, duration badge, and status badge are distinct. Keep `Badge` and `Chip`; count bubbles use `Badge size="xs"`. |
| Avatar | Repeated initials/image circles in profile, team members, notifications | `Profile.jsx`, `Team.jsx`, `Notifications.jsx` | `AdminAvatar` | Sizes and backgrounds differ. Shared `Avatar` handles image, initials, status, and size. |
| Tabs/segmented navigation | 3 local tab families | `Playbooks.jsx`, `Team.jsx`, `Settings.jsx` appearance selector | `AdminTabs` | Underline tabs and segmented tabs are both valid variants: `variant="underline"|"segmented"`. Appearance cards remain selection cards, not tabs. |
| Breadcrumb | 1 page-local trail | `Plays.jsx` | `AdminBreadcrumbs` | Migrate to shared component; low count but removes fragile inline route mapping. |
| Pagination | 0 app-page instances | None | `AdminPagination` | Move/alias only; no app migration required. |
| Tooltip | No explicit app-page tooltip component; native titles are inconsistent | Primarily component-level controls | `AdminTooltip` | Move/alias. Do not mass-add tooltips during this phase. |
| Progress bar | No app-page progress bar | None | `AdminProgress` | Move/alias only. Canvas/export progress remains excluded where coupled. |
| Dropdown/context menu/popover | 2 exact context-menu hits plus 2 app-page `z-20` popovers | `PlayCard.jsx`, `FolderCard.jsx`, `PlayNew.jsx`, `Playbooks.jsx` | `AdminTooltip` only; no menu primitive | Add `Menu` and `Popover` shells. Keep menu item content and feature state in callers. |
| Repeated list row | Trash rows, member rows, notification rows, play-picker rows | `Plays.jsx`, `Team.jsx`, `Notifications.jsx`, `Playbooks.jsx` | No generic primitive | Do not create an over-general `ListItem` in Q2. Normalize each with `Card`, `Avatar`, `Badge`, and `Button`; extract a named domain row only after two consumers share behavior. |
| Domain cards | Existing `PlayCard`, `FolderCard`; `BrowseTile`, video card, notification row | `Plays.jsx`, `Playbooks.jsx`, `DemoVideos.jsx`, `Notifications.jsx` | `AdminPlayCard`, `AdminFolderCard`, `AdminSectionRow` | Keep domain components separate from primitives. Existing admin/app play cards have materially different permissions and behavior; do not force one mega-component. |

### 1.3 Variation summary

The primary drift is not color choice; it is repeated combinations of radius, padding,
border opacity, disabled behavior, focus ring, and loading treatment:

- Buttons use at least four radii and six padding combinations.
- Fields use `rounded-lg` and `rounded-xl`, two background opacities, and several
  focus-ring variants.
- App dialogs use three overlay opacities, optional blur, several panel widths, and
  inconsistent Escape handling.
- Pills use `rounded-md` and `rounded-full` for the same tag/status concepts.
- Loading uses both icon rotation and CSS border spinners.
- Cards range from `rounded-lg` through `rounded-3xl` without a semantic reason.

## 2. Component Inventory

All major exported functions must receive JSDoc when implemented. Components should
forward standard element props and refs where practical.

### 2.1 Core primitives

| Component | Props surface | Replaces / aliases | App patterns replaced | Tokens |
|---|---|---|---|---|
| `Button` | `variant`, `size`, `loading`, `disabled`, `fullWidth`, `as`, `startIcon`, `endIcon` | `AdminBtn` -> alias; styled button/Link actions | 89 buttons and 4 action links | `--ui-*`; brand accent via semantic accent token |
| `Input` | `label`, `hint`, `error`, `size`, `appearance`, `startIcon`, `endAction`, native input props | `AdminInput` -> alias | Standard/search/code inputs | `--ui-field-*` derived from `--ui-*` |
| `Textarea` | `label`, `hint`, `error`, `size`, `resize`, native props | `AdminTextarea` -> alias | Four raw textareas | Same field tokens |
| `Select` | `label`, `hint`, `error`, `size`, children, native props | `AdminSelect` -> alias | Four raw selects | Same field tokens |
| `Field` | `label`, `hint`, `error`, `required`, `count`, `htmlFor`, children | New shared composition used internally by fields | 17 labels and helper/error strings | Text/status tokens |
| `Checkbox` | `label`, `description`, `checked`, `disabled`, native props | `AdminCheckbox` -> alias | Playbook filter checkbox | Accent, border, text |
| `RadioGroup` | `label`, `options`, `value`, `onChange`, `orientation`, `disabled` | `AdminRadioGroup` -> alias | Notification single-choice and selection cards | Accent, surface, border |
| `Toggle` | `label`, `description`, `checked`, `onChange`, `disabled`, `size` | `AdminToggle` -> alias | `Settings.jsx` `ToggleRow` | Accent, surface, border |
| `Card` | `as`, `padding`, `interactive`, `selected`, `tone`, `className` | `AdminCard` and `AppCard` compatibility wrappers | 43 general card/panel surfaces | Surface, border, radius, shadow |
| `Section` | `title`, `subtitle`, `icon`, `actions`, `children`, `variant` | `AdminSection`, `AppSection` wrappers | 23 section labels | Text, accent, spacing |
| `Divider` | `orientation`, `tone`, `className` | New | Eight repeated divider rules | Border tokens |

### 2.2 Feedback and overlays

| Component | Props surface | Replaces / aliases | App patterns replaced | Tokens |
|---|---|---|---|---|
| `Modal` | `open`, `onClose`, `title`, `description`, `size`, `hideClose`, `closeOnBackdrop`, `closeOnEscape`, `footer`, `initialFocusRef` | `AdminModal` -> alias; shell of `PlayPickerModal` | Seven app overlays | Overlay, elevated surface, strong border, shadow |
| `ConfirmDialog` | `open`, `title/message`, `description`, `confirmLabel`, `cancelLabel`, `tone`, `loading`, callbacks | Existing `ConfirmModal` -> compatibility wrapper | Team/remove, play/delete, danger confirmations | Modal + Button tokens |
| `Toast` | `open`, `title`, `description`, `tone`, `duration`, `onClose`, `position` | `MessagePopup` compatibility wrapper | Two duplicate `Plays.jsx` toasts | Elevated surface and semantic status tokens |
| `Alert` | `tone`, `title`, `icon`, `actions`, children | `AdminAlert` -> alias | 12 inline banners | Semantic status tokens |
| `Spinner` | `size`, `tone`, `label`, `className` | `AdminSpinner` -> alias | Eight app loaders; non-excluded repository loaders later | Accent/current-color and border |
| `Skeleton` | `variant`, `width`, `height`, `lines` | `AdminSkeleton` -> alias | No current app raw instances | Surface tokens |
| `Progress` | `value`, `tone`, `label`, `showValue`, `indeterminate`, `size` | `AdminProgress` -> alias | Future non-canvas progress only | Surface/status tokens |
| `EmptyState` | `icon`, `title`, `description`, `action`, `contained`, `compact` | `AdminEmptyState` -> alias | Seven app empty states | Surface, border, text |

### 2.3 Navigation, data display, and overlays

| Component | Props surface | Replaces / aliases | App patterns replaced | Tokens |
|---|---|---|---|---|
| `Badge` | `tone/status`, `size`, `dot`, children | `AdminBadge` -> alias | Status, count, duration pills | Semantic badge tokens |
| `Chip` | `tone`, `selected`, `disabled`, `leadingIcon`, `onClick`, `onRemove` | `AdminChip` -> alias | Tag and filter pills | Accent/status tokens |
| `Avatar` | `src`, `name`, `size`, `status`, `alt` | `AdminAvatar` -> alias | Profile/member/notification circles | Accent, surface, border |
| `Tabs` | `items`, `value`, `onChange`, `variant`, `size`, `ariaLabel` | `AdminTabs` -> alias | Underline and segmented tab families | Accent, surface, border |
| `Breadcrumbs` | `items`, `separator`, `className` | `AdminBreadcrumbs` -> alias | Plays folder path | Text/border |
| `Pagination` | Existing props plus `size` | `AdminPagination` -> alias | No app migration | Accent, surface, border |
| `Tooltip` | `content`, `placement`, `delay`, children | `AdminTooltip` -> alias | Future replacement for inconsistent native titles | Elevated surface, text, shadow |
| `Menu` | `open`, `anchorRef`, `onClose`, `placement`, `children`, `width` | New shell | Play/Folder card context menus | Elevated surface, border, shadow, z-index |
| `MenuItem` | `icon`, `destructive`, `disabled`, `selected`, `onSelect`, children | New | Repeated context-menu rows | Text/status/surface |
| `Popover` | `open`, `anchorRef`, `onClose`, `placement`, `children`, `size` | New | Tag suggestions and playbook filter popover | Same overlay tokens |

### 2.4 Layout and domain components

The existing app layout components remain first-class exports, but their canonical files
move under the design-system tree:

- `PageShell` (compatibility alias: `AppShell`)
- `Page`
- `PageHeader`
- `Section`
- `Card`

`AdminShell`, `AdminNav`, `AdminSidebar`, and the route-level `AppLayout` remain outside
the primitive library because they own surface-specific navigation, auth, and permissions.
Their barrels may re-export shared `Page`, `Section`, and `Card` names where useful.

Domain components remain domain components:

- `PlayCard`, `FolderCard`
- `AdminPlayCard`, `AdminFolderCard`, `AdminSectionRow`
- `BrowseTile`, video cards, notification rows

Do not merge admin and app play cards in Q2. Their permission models and interactions are
different enough that a shared mega-component would increase complexity.

## 3. Migration Order

Execute in four focused sessions. Every session ends with the existing Vitest suite and
`npm run build` passing.

1. **Token layer, barrel, and low-risk aliases**
   - Add `--ui-*` semantic tokens to the `:root` block of `src/index.css` (see §5).
   - Create `src/design-system/components/` directory and `index.js` barrel.
   - Copy/adapt the 22 existing admin primitives to canonical shared files under
     `src/design-system/components/`. Each file replaces `--adm-*` with `--ui-*`
     tokens and adds `data-component="Name"` on its root element.
   - Re-export the five layout components from the barrel under their `Page*` canonical
     names (do not move the files — see §0).
   - Update `src/admin/components/index.js` to re-export canonical names as `AdminX`
     aliases. Keep thin files at existing `AdminX.jsx` paths for direct-file imports.
   - Create `src/design-system/DESIGN_SYSTEM.md`.
   - Add a static guard test proving the barrel exports all canonical names.
   - Update `CRAWLER_MAP.md`.
   - Scope: token CSS, barrel, ~22 component files, layout re-exports, guard test,
     docs — no app page migration yet.

2. **Buttons and form controls**
   - Build/finalize `Button`, `Field`, `Input`, `Textarea`, `Select`, `Checkbox`,
     `RadioGroup`, and `Toggle`.
   - Migrate app pages in descending duplication: `Plays`, `Settings`, `Profile`,
     `Team`, `PlayNew`, then the smaller forms.
   - Priority rationale: 93 action elements and 31 native form controls are the largest,
     lowest-risk source of drift.
   - Scope: all 12 app pages, but only action/form markup.

3. **Feedback, surfaces, and navigation**
   - Migrate `Spinner`, `Alert`, `EmptyState`, `Badge`, `Chip`, `Avatar`, `Tabs`,
     `Breadcrumbs`, `Card`, `Section`, and `Divider`.
   - Start with `Playbooks`, `Notifications`, `Settings`, and `Plays`.
   - Scope: repeated presentational blocks; no API/state redesign.

4. **Overlays and guardrails**
   - Build/migrate `Modal`, `ConfirmDialog`, `Toast`, `Menu`, `MenuItem`, and `Popover`.
   - Replace seven app overlays, two duplicate toasts, the two card context menus, and
     the two app-page popovers.
   - Add raw-pattern guard tests, final documentation, and remove obsolete duplicate
     implementations only after all imports are migrated.
   - Highest interaction risk; scheduled after Button and field dependencies exist.

## 4. Barrel and Import Strategy

### Canonical barrel

`src/design-system/components/index.js` exports canonical names:

```js
export { default as Button } from "./Button";
export { default as Input } from "./Input";
export { default as Modal } from "./Modal";
export { default as Card } from "./Card";
// ...all inventory items
```

App pages import directly from the canonical barrel:

```js
import { Button, Input, Modal, EmptyState } from "../../design-system/components";
```

Layout imports should also be available from that barrel. A secondary
`src/design-system/layout/index.js` is acceptable internally, but page authors should
need one obvious public import path.

### Admin compatibility barrel

During transition, `src/admin/components/index.js` keeps every current export name:

```js
export { Button as AdminBtn } from "../../design-system/components";
export { Input as AdminInput } from "../../design-system/components";
export { Modal as AdminModal } from "../../design-system/components";
```

Direct-file imports such as `../components/AdminSpinner` also exist today. Keep thin
files at those paths that re-export the canonical component until a later cleanup:

```js
export { default } from "../../design-system/components/Spinner";
```

This preserves all admin pages, staff routes, and tests throughout migration.

### Existing app barrels

- `src/components/index.js` continues exporting `PlayCard` and `FolderCard`, and may
  temporarily re-export shared primitives for compatibility.
- `src/components/layout/index.js` becomes a compatibility barrel pointing to
  `PageShell`, `PageHeader`, `Page`, `Section`, and `Card`.
- New code must import primitives from `src/design-system/components`, not from the
  compatibility barrels.

### Alias policy

- Keep `AdminX` aliases for the full Q2 migration and at least one subsequent release.
- Do not rename all admin call sites in the same change as the canonical move.
- Remove an alias only after repository search proves there are no imports and a
  dedicated cleanup commit updates tests/docs.

## 5. Token Alignment Decision

### Decision: promote a neutral semantic `--ui-*` layer

Shared components must not depend on admin-named variables, and they should not encode
long Tailwind class recipes for every semantic state. Add a shared semantic layer to
the **`:root` block** in `src/index.css` (not under `@theme` — these are runtime CSS
custom properties, not Tailwind utility generators):

- `--ui-bg`
- `--ui-surface`, `--ui-surface-2`, `--ui-surface-3`, `--ui-surface-elevated`
- `--ui-border`, `--ui-border-strong`
- `--ui-text`, `--ui-text-muted`, `--ui-text-subtle`
- `--ui-accent`, `--ui-accent-muted`
- `--ui-success`, `--ui-warning`, `--ui-danger`, `--ui-info` and muted variants
- `--ui-overlay`
- Existing shared `--radius-*`, `--shadow-*`, motion, icon, and z-index tokens remain
  unchanged.

The values derive from `--color-Brand*` and use the existing light-theme selectors.
Then `src/admin/admin.css` preserves its public contract by aliasing:

```css
--adm-surface: var(--ui-surface);
--adm-border: var(--ui-border);
--adm-accent: var(--ui-accent);
```

This preserves the correct brand-to-admin mapping while making the shared layer
surface-agnostic.

### Usage rule

- Shared component structure, surfaces, text, borders, status, radius, shadow, motion,
  and z-index use `--ui-*`/shared CSS variables.
- Tailwind utilities remain responsible for layout, spacing, responsive behavior, and
  typography.
- Direct Brand Tailwind classes are allowed only for intentionally fixed brand
  expression, such as a Coachable-orange logo mark. They are not used for generic
  component state.
- `--adm-*` is compatibility API for existing admin code, not a dependency of new
  shared components.

Add a static test proving every core `--ui-*` token derives from a Brand/shared token
and every core `--adm-*` token aliases `--ui-*`.

## 6. MUI Modal Decision

Use **coexistence**, not wrapping or replacement:

- The shared `Modal` is a custom React/Tailwind component and does not import MUI.
- No current code uses MUI `Dialog`/`Modal`; MUI imports are `Slider` controls in
  editor/canvas-adjacent files, most of which are excluded from this project.
- Do not introduce MUI into app pages or convert MUI sliders as part of Q2.
- If a future non-canvas MUI dialog appears, migrate its content into shared `Modal`
  when touched; do not create an adapter around MUI solely for theoretical use.

## 7. Test Strategy

Create tests in `admin/test/` to satisfy the current project convention. Keep pure
resolver/state-machine helpers exported from adjacent `.js` modules when that avoids
duplicating implementation logic in tests.

| Primitive group | Logic-mirror coverage | RTL coverage warranted |
|---|---|---|
| Button | variant/size/loading class and disabled resolution; polymorphic element choice | Loading disables activation; keyboard/click forwarding |
| Fields | tone, size, `aria-invalid`, hint/error precedence | Label association, focus/blur, end action, controlled input |
| Checkbox/Radio/Toggle | checked/disabled state transitions and option resolution | Keyboard operation, roles, `aria-checked`, focus |
| Card/Section/Divider | padding, interactive/selected/tone resolution | Not required unless clickable Card remains supported |
| Badge/Chip/Avatar | tone/size/initials/status resolution | Chip remove propagation and keyboard activation |
| Alert/EmptyState/Spinner/Skeleton/Progress | tone, size, clamping, conditional regions | Progress/alert roles and accessible labels |
| Tabs/Breadcrumbs/Pagination | active item, range, route/item resolution | Tab keyboard behavior and pagination activation |
| Modal/ConfirmDialog | open/close, Escape, backdrop, confirm-loading state machine | Focus trap/restore, initial focus, portal semantics, keyboard close |
| Toast | duration resolution, tone, visibility state | `aria-live`, dismiss, timer reset |
| Tooltip | placement/open state | Hover, focus, blur, Escape |
| Menu/Popover | placement and open/close state | Focus movement, outside click, Escape, item selection |

Additional safeguards:

- Preserve all existing admin tests unchanged while aliases are introduced.
- Add a barrel test that imports every canonical and compatibility export.
- Add static source tests that reject new raw patterns in migrated app files.
- Do not require RTL for purely visual components with no interactive state.
- Keep canvas/Slate tests untouched.

## 8. Success Criteria

### Functional completion

- All existing admin/staff imports still resolve.
- All current tests pass after every phase.
- `npm run build` passes after every phase.
- Admin dark/light rendering and app dark/light rendering retain their current token
  behavior.
- No route, database, or server route changes are required; therefore no Railway
  redeploy is part of this work.
- Build output remains within Cloudflare Pages' 25 MiB per-asset limit. The shared
  primitives must not add a new runtime dependency.

### Grep completion

For migrated, non-excluded files, these searches should return zero page-local matches:

```bash
grep -rn "fixed inset-0 z-50" src/pages/app --include="*.jsx"
grep -rn "animate-spin" src/pages/app --include="*.jsx"
grep -rn "flex flex-col items-center" src/pages/app --include="*.jsx"
grep -rn "rounded-lg border border-BrandGray2" src/pages/app --include="*.jsx"
grep -rn "absolute.*z-50.*rounded-lg border" src/ --include="*.jsx"
```

`bg-BrandOrange` is too broad to require global zero because it includes intentional
brand decoration and selected states. The enforceable action check should instead flag
raw `<button>`/styled `<Link>` opening tags containing `bg-BrandOrange` in app pages.
Likewise, raw `<input>`, `<textarea>`, and `<select>` are allowed only inside shared
component implementation files or documented exceptional composites such as OTP entry.

Slate/canvas and the two play-preview renderer files are excluded from all zero-result
guards.

### New-page shape

A normal new page should resemble:

```jsx
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  PageShell,
  Section,
} from "../../design-system/components";
```

It should not define page-local button recipes, field recipes, modal overlays, loaders,
or empty-state layout.

### Contributor rules

- If you need an action, import `Button`.
- If you need a text field, import `Input`, `Textarea`, or `Select`; do not restyle a
  native field in a page.
- If you need boolean or choice input, import `Checkbox`, `RadioGroup`, or `Toggle`.
- If you need feedback, import `Alert`, `Toast`, `Spinner`, `Progress`, or `EmptyState`.
- If you need an overlay, import `Modal`, `ConfirmDialog`, `Menu`, or `Popover`.
- If you need a surface, import `Card`/`Section`; do not invent a new radius/border pair.
- If a component does not support a legitimate use case, extend its documented props
  and tests rather than bypassing it with a new inline recipe.
- Domain behavior stays in domain components; primitives own visual and accessibility
  contracts.

## 9. Explicitly Deferred

To keep execution within two to four focused sessions:

- Do not consolidate Slate/canvas/editor UI.
- Do not merge `AdminPlayCard` and app `PlayCard`.
- Do not create a universal list-row abstraction.
- Do not migrate public marketing/auth/sharing pages in Q2, except when a shared alias is
  needed to prevent breakage.
- Do not replace MUI sliders.
- Do not add Storybook, a CSS-in-JS library, or another styling system.
- Do not remove compatibility aliases in the same phase.

These are conscious scope limits, not omissions from the audit.
