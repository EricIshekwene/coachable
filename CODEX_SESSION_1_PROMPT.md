# Codex Prompt — Design System Q2, Session 1

> **Branch to work on:** `claude/component-system-integration`
> Run `git checkout claude/component-system-integration` before starting.
> Commit all changes to this branch. Do **not** push to `main`.
>
> **Engineering autonomy:** Do not pause to ask clarifying questions. When you hit a
> technical decision — API shape, type checking strategy, implementation detail,
> ambiguous prop name — make the correct engineering call and document your reasoning
> in the commit message. Only stop if a file you must edit does not exist and cannot
> reasonably be inferred from the codebase context.

---

## Goal

Execute **Session 1 only** of `DESIGN_SYSTEM_Q2_PLAN.md`:

- Add `--ui-*` semantic token layer to `src/index.css`
- Create `src/design-system/components/` with 22 shared primitive files
- Re-export the 5 layout components from the barrel under `Page*` names
- Update `src/admin/components/index.js` to alias from the new canonical location
- Keep thin re-export files at existing `src/admin/components/AdminX.jsx` paths
- Create `src/design-system/DESIGN_SYSTEM.md`
- Add a static guard test for the barrel
- Update `CRAWLER_MAP.md`
- Verify `vitest run` and `vite build` both pass before committing

Do **not** start Session 2, 3, or 4. Do not migrate any app pages. Do not edit any
file in `src/features/slate/`, `src/canvas/`, `src/components/controlPill/`,
`src/components/rightPanel/`, or any editor-adjacent file.

---

## Step 1 — `--ui-*` token layer in `src/index.css`

Add the following block to the **`:root`** section of `src/index.css`, alongside the
existing `--radius-*` and `--shadow-*` tokens. Do not add them under `@theme`.

```css
/* ── Shared semantic UI tokens ───────────────────────────────── */

/* Surfaces */
--ui-bg:               var(--color-BrandBlack);
--ui-surface:          color-mix(in srgb, var(--color-BrandBlack) 96%, white 4%);
--ui-surface-2:        color-mix(in srgb, var(--color-BrandBlack) 90%, white 10%);
--ui-surface-3:        color-mix(in srgb, var(--color-BrandBlack) 84%, white 16%);
--ui-surface-elevated: color-mix(in srgb, var(--color-BrandBlack) 78%, white 22%);

/* Borders */
--ui-border:           color-mix(in srgb, white 12%, transparent);
--ui-border-strong:    color-mix(in srgb, white 24%, transparent);

/* Text */
--ui-text:             var(--color-BrandWhite);
--ui-text-muted:       color-mix(in srgb, var(--color-BrandWhite) 70%, transparent);
--ui-text-subtle:      color-mix(in srgb, var(--color-BrandWhite) 45%, transparent);

/* Accent */
--ui-accent:           var(--color-BrandOrange);
--ui-accent-muted:     color-mix(in srgb, var(--color-BrandOrange) 20%, transparent);

/* Semantic status */
--ui-success:          var(--color-BrandGreen);
--ui-success-muted:    color-mix(in srgb, var(--color-BrandGreen) 18%, transparent);
--ui-warning:          #f59e0b;
--ui-warning-muted:    color-mix(in srgb, #f59e0b 18%, transparent);
--ui-danger:           #ef4444;
--ui-danger-muted:     color-mix(in srgb, #ef4444 18%, transparent);
--ui-info:             #3b82f6;
--ui-info-muted:       color-mix(in srgb, #3b82f6 18%, transparent);

/* Overlay */
--ui-overlay:          color-mix(in srgb, var(--color-BrandBlack) 80%, transparent);
```

Also add a light-theme override block matching the existing light-theme pattern:

```css
[data-theme="light"] .app-themed {
  --ui-bg:               var(--color-BrandWhite);
  --ui-surface:          color-mix(in srgb, var(--color-BrandWhite) 96%, black 4%);
  --ui-surface-2:        color-mix(in srgb, var(--color-BrandWhite) 90%, black 10%);
  --ui-surface-3:        color-mix(in srgb, var(--color-BrandWhite) 84%, black 16%);
  --ui-surface-elevated: color-mix(in srgb, var(--color-BrandWhite) 78%, black 22%);
  --ui-border:           color-mix(in srgb, black 12%, transparent);
  --ui-border-strong:    color-mix(in srgb, black 24%, transparent);
  --ui-text:             var(--color-BrandBlack);
  --ui-text-muted:       color-mix(in srgb, var(--color-BrandBlack) 70%, transparent);
  --ui-text-subtle:      color-mix(in srgb, var(--color-BrandBlack) 45%, transparent);
  --ui-overlay:          color-mix(in srgb, var(--color-BrandWhite) 80%, transparent);
}
```

After adding the tokens, also update `src/admin/admin.css` to alias `--adm-*` from
`--ui-*` where a direct mapping exists. The admin tokens must derive from `--ui-*`
(which in turn derives from `--color-Brand*`). Example:

```css
--adm-surface:  var(--ui-surface);
--adm-surface2: var(--ui-surface-2);
--adm-border:   var(--ui-border);
--adm-text:     var(--ui-text);
--adm-muted:    var(--ui-text-muted);
--adm-accent:   var(--ui-accent);
/* etc. — match every --adm-* that has a --ui-* equivalent */
```

---

## Step 2 — Shared component files

Create `src/design-system/components/` and one `.jsx` file per primitive below.

### Rules that apply to every component file

1. **`data-component` attr** — every component's outermost DOM element must have
   `data-component="ComponentName"` (e.g. `data-component="Button"`). This is
   mandatory for the DevOverlay (Ctrl+Shift+D) to render component badges.
2. **`--ui-*` tokens** — use `var(--ui-*)` for all color, surface, and border values.
   Do not copy `--adm-*` tokens into shared components.
3. **JSDoc** — every exported function must have a JSDoc comment listing its props.
4. **Forward standard props** — forward native element props and `className` to the
   root element. Use `...rest` spread.
5. **`ref` forwarding** — use `React.forwardRef` on every component that wraps a
   focusable HTML element (button, input, textarea, select, a).

### The 22 primitives to create

Each entry shows: file name → canonical export name → admin alias it replaces.
Use the corresponding `src/admin/components/AdminX.jsx` as the starting point for
the implementation, but replace all `--adm-*` tokens with `--ui-*`, remove the
`Admin` prefix from the export name, and add `data-component`.

| File | Export name | Based on |
|---|---|---|
| `Button.jsx` | `Button` | `AdminBtn` |
| `Input.jsx` | `Input` | `AdminInput` |
| `Textarea.jsx` | `Textarea` | `AdminTextarea` |
| `Select.jsx` | `Select` | `AdminSelect` |
| `Checkbox.jsx` | `Checkbox` | `AdminCheckbox` |
| `Toggle.jsx` | `Toggle` | `AdminToggle` |
| `RadioGroup.jsx` | `RadioGroup` | `AdminRadioGroup` |
| `Card.jsx` | `Card` | `AdminCard` |
| `Section.jsx` | `Section` | `AdminSection` |
| `Modal.jsx` | `Modal` | `AdminModal` |
| `Alert.jsx` | `Alert` | `AdminAlert` |
| `Spinner.jsx` | `Spinner` | `AdminSpinner` |
| `Skeleton.jsx` | `Skeleton` | `AdminSkeleton` |
| `Progress.jsx` | `Progress` | `AdminProgress` |
| `EmptyState.jsx` | `EmptyState` | `AdminEmptyState` |
| `Badge.jsx` | `Badge` | `AdminBadge` |
| `Chip.jsx` | `Chip` | `AdminChip` |
| `Avatar.jsx` | `Avatar` | `AdminAvatar` |
| `Tabs.jsx` | `Tabs` | `AdminTabs` |
| `Breadcrumbs.jsx` | `Breadcrumbs` | `AdminBreadcrumbs` |
| `Pagination.jsx` | `Pagination` | `AdminPagination` |
| `Tooltip.jsx` | `Tooltip` | `AdminTooltip` |

**AdminShell, AdminHeader, AdminNav, AdminSidebar, AdminPage** are surface-specific
layout/navigation components that own auth guards, permissions, or admin-specific
chrome. Do **not** create shared equivalents for them — they stay as-is.

**AdminPlayCard, AdminFolderCard, AdminSectionRow** are domain components. Do **not**
create shared equivalents. They stay as-is.

---

## Step 3 — Canonical barrel

Create `src/design-system/components/index.js`:

```js
// ── Primitives ────────────────────────────────────────────────
export { default as Button }      from "./Button";
export { default as Input }       from "./Input";
export { default as Textarea }    from "./Textarea";
export { default as Select }      from "./Select";
export { default as Checkbox }    from "./Checkbox";
export { default as Toggle }      from "./Toggle";
export { default as RadioGroup }  from "./RadioGroup";
export { default as Card }        from "./Card";
export { default as Section }     from "./Section";
export { default as Modal }       from "./Modal";
export { default as Alert }       from "./Alert";
export { default as Spinner }     from "./Spinner";
export { default as Skeleton }    from "./Skeleton";
export { default as Progress }    from "./Progress";
export { default as EmptyState }  from "./EmptyState";
export { default as Badge }       from "./Badge";
export { default as Chip }        from "./Chip";
export { default as Avatar }      from "./Avatar";
export { default as Tabs }        from "./Tabs";
export { default as Breadcrumbs } from "./Breadcrumbs";
export { default as Pagination }  from "./Pagination";
export { default as Tooltip }     from "./Tooltip";

// ── Layout (re-export only; files stay at src/components/layout/) ──
export { default as PageShell }   from "../../components/layout/AppShell";
export { default as Page }        from "../../components/layout/AppPage";
export { default as PageHeader }  from "../../components/layout/AppHeader";
// AppSection and AppCard already share the same visual contract as Section and Card;
// alias them here for callers who import from this barrel:
export { default as AppSection }  from "../../components/layout/AppSection";
export { default as AppCard }     from "../../components/layout/AppCard";
```

---

## Step 4 — Admin compatibility barrel

Update `src/admin/components/index.js` so every `AdminX` export now comes from the
canonical design-system location. The existing export names must not change — all
admin pages continue to work without any other edits.

```js
// ── Shared primitives (aliased from design-system) ────────────
export { Button      as AdminBtn }         from "../../design-system/components";
export { Input       as AdminInput }       from "../../design-system/components";
export { Textarea    as AdminTextarea }    from "../../design-system/components";
export { Select      as AdminSelect }      from "../../design-system/components";
export { Checkbox    as AdminCheckbox }    from "../../design-system/components";
export { Toggle      as AdminToggle }      from "../../design-system/components";
export { RadioGroup  as AdminRadioGroup }  from "../../design-system/components";
export { Card        as AdminCard }        from "../../design-system/components";
export { Section     as AdminSection }     from "../../design-system/components";
export { Modal       as AdminModal }       from "../../design-system/components";
export { Alert       as AdminAlert }       from "../../design-system/components";
export { Spinner     as AdminSpinner }     from "../../design-system/components";
export { Skeleton    as AdminSkeleton }    from "../../design-system/components";
export { Progress    as AdminProgress }    from "../../design-system/components";
export { EmptyState  as AdminEmptyState }  from "../../design-system/components";
export { Badge       as AdminBadge }       from "../../design-system/components";
export { Chip        as AdminChip }        from "../../design-system/components";
export { Avatar      as AdminAvatar }      from "../../design-system/components";
export { Tabs        as AdminTabs }        from "../../design-system/components";
export { Breadcrumbs as AdminBreadcrumbs } from "../../design-system/components";
export { Pagination  as AdminPagination }  from "../../design-system/components";
export { Tooltip     as AdminTooltip }     from "../../design-system/components";

// ── Admin-only shell/layout/nav (not shared primitives) ───────
export { default as AdminShell }   from "./AdminShell";
export { default as AdminHeader }  from "./AdminHeader";
export { default as AdminNav }     from "./AdminNav";
export { default as AdminSidebar } from "./AdminSidebar";
export { default as AdminPage }    from "./AdminPage";

// ── Domain components ─────────────────────────────────────────
export { default as AdminPlayCard }   from "./AdminPlayCard";
export { default as AdminFolderCard } from "./AdminFolderCard";
export { default as AdminSectionRow } from "./AdminSectionRow";
```

### Thin compatibility files

For any file in `src/admin/components/` that some module imports **directly** (e.g.
`import AdminSpinner from "../components/AdminSpinner"`), keep a thin re-export file
at that path. Check for direct-file imports with:

```bash
grep -rn "from.*admin/components/Admin" src --include="*.jsx" --include="*.js"
```

For each AdminX.jsx file that is directly imported somewhere, replace its content with
a one-line re-export:

```js
export { default } from "../../design-system/components/ComponentName";
```

For AdminX.jsx files used only through the barrel (i.e. `from "…/admin/components"`),
you may leave the existing file in place or replace it with the thin re-export — either
is fine, but do not delete any file that tests reference.

---

## Step 5 — Guard tests

Create `admin/test/designSystemBarrel.test.js`.

**Important:** `React.forwardRef(...)` returns `{ $$typeof: Symbol(react.forward_ref), render: fn }` — `typeof === "object"`, not `"function"`. `React.memo(...)` is the same. The test must accept both. Use this helper:

```js
/** Returns true for function components, class components, forwardRef, and memo wrappers. */
function isReactComponentType(x) {
  if (typeof x === "function") return true;      // function / class component
  if (x === null || typeof x !== "object") return false;
  return typeof x.$$typeof === "symbol";         // forwardRef, memo, lazy, etc.
}
```

Then the test body:

```js
import * as DS from "../../src/design-system/components";
import * as Admin from "../../src/admin/components";
import { Button, Input, /* ... all 22 ... */ } from "../../src/design-system/components";
import { AdminBtn, AdminInput, /* ... all 22 aliases ... */ } from "../../src/admin/components";

describe("design-system barrel — every export is a React component type", () => {
  const CANONICAL = [
    "Button", "Input", "Textarea", "Select", "Checkbox", "Toggle", "RadioGroup",
    "Card", "Section", "Modal", "Alert", "Spinner", "Skeleton", "Progress",
    "EmptyState", "Badge", "Chip", "Avatar", "Tabs", "Breadcrumbs", "Pagination",
    "Tooltip", "PageShell", "Page", "PageHeader",
  ];

  test.each(CANONICAL)("%s is exported from the canonical barrel", (name) => {
    expect(DS[name]).toBeDefined();
    expect(isReactComponentType(DS[name])).toBe(true);
  });
});

describe("admin barrel — AdminX aliases point to the same reference", () => {
  const ALIASES = [
    ["AdminBtn", Button], ["AdminInput", Input], ["AdminTextarea", Textarea],
    // ... complete the list for all 22
  ];

  test.each(ALIASES)("%s is the same reference as its canonical", (name, canonical) => {
    expect(Admin[name]).toBe(canonical);
  });
});
```

This test will fail loudly if the barrel is missing an export, if a component is not
a valid React component type, or if an alias points to the wrong reference.

Also add a check to `admin/test/designTokenUnification.test.js` (or a new adjacent
file) asserting that the `src/index.css` `:root` block contains every expected
`--ui-*` token name.

---

## Step 6 — Documentation

Create `src/design-system/DESIGN_SYSTEM.md` covering:

- Directory layout (`components/`, `index.js`)
- How to import (`import { Button, Card } from "../../design-system/components"`)
- Naming convention (no prefix, PascalCase)
- `--ui-*` token usage rule (use `var(--ui-*)`, never `--adm-*`)
- `data-component` requirement (every component, on root element)
- Admin alias policy (`AdminX` exports remain for backward compat)
- How to add a new component (create file → add to barrel → add to admin alias →
  add guard test entry → update CRAWLER_MAP)

---

## Step 7 — Update CRAWLER_MAP.md

Add a new row in the **Admin shared UI** section for the design-system barrel:

```
| "design-system primitives", "Button", "Input", "Modal", "Card", etc. | [src/design-system/components/](src/design-system/components/) (barrel: [index.js](src/design-system/components/index.js)) | Canonical shared components; AdminX names are barrel aliases |
```

---

## Step 8 — Verification

Run both of these before committing. Both must pass (existing 12 test failures are
pre-existing and acceptable; no new failures are acceptable):

```bash
npx vitest run
npx vite build
```

If either fails, fix the issue before committing.

---

## Commit

Commit all Session 1 changes in a single commit to `claude/component-system-integration`:

```
Design system Q2 Session 1: --ui-* token layer, shared barrel, 22 admin aliases
```

Include `src/design-system/`, updated `src/index.css`, updated `src/admin/admin.css`,
updated `src/admin/components/index.js`, thin compatibility files, guard tests,
`src/design-system/DESIGN_SYSTEM.md`, and `CRAWLER_MAP.md`.

Do **not** commit `.codex/` or `AGENTS.md`.
Do **not** push to `main`.
Do **not** start Session 2.

---

## What NOT to do

- Do not edit any file in `src/features/slate/`, `src/canvas/`,
  `src/components/controlPill/`, `src/components/rightPanel/`,
  `src/components/PlayPreviewCard.jsx`, or `src/components/PlayPreviewPlayer.jsx`.
- Do not migrate any app page (`src/pages/app/*.jsx`) to use the new barrel yet —
  that is Session 2.
- Do not move `src/components/layout/` files — re-export them, do not relocate them.
- Do not create `Field`, `Divider`, `Menu`, `MenuItem`, `Popover`, `ConfirmDialog`,
  or `Toast` — those are new components scheduled for Session 4.
- Do not change any test in `admin/test/` that was already passing.
- Do not merge any branch into `main`.
