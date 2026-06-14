# Codex Prompt — Design System Q2, Session 2

## Correction and Execution Instruction

Session 1 is complete in commits:
- `af2284a`: design-system primitives and aliases
- `cacd21d`: forwardRef initialization fix

Migrate all 12 files under `src/pages/app/`, including `PlayEdit.jsx`. The existing
prompt incorrectly says 11 pages and omits `PlayEdit.jsx` from its page table.

Do not ask for clarification. Make technically correct decisions and document them in
the commit body.

Preserve the user's existing uncommitted `DESIGN_SYSTEM_Q2_PLAN.md` change. Do not
commit prompt files, `AGENTS.md`, or `.codex/`.

The accepted test baseline is:
- 1,121 passing
- 12 pre-existing failures:
  - `gifEncoder`: 8
  - `playPreviewPlayer`: 3
  - `syncSports`: 1

No new failures are acceptable.

Read and execute `CODEX_SESSION_2_PROMPT.md` with the corrections above. Complete
Session 2 only, verify tests and build, and commit the result on
`claude/component-system-integration`. Do not push or begin Session 3.

---

> **Prerequisite:** Session 1 must be committed on `claude/component-system-integration`
> before starting. Verify: `src/design-system/components/index.js` exists and
> `src/design-system/components/Button.jsx` exists.
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

Session 2 covers buttons and form controls.

1. Build `Field.jsx` — new shared label/hint/error wrapper used internally by fields
2. Extend `Button.jsx`, `Input.jsx`, `Textarea.jsx`, `Select.jsx` with the additional
   prop surface needed by app pages (Session 1 copies were API-equivalent to admin)
3. Migrate all 11 app pages (`src/pages/app/*.jsx`) to replace raw `<button>`,
   `<input>`, `<textarea>`, `<select>`, local toggle rows, and local checkbox patterns
   with the shared components from the design-system barrel

Do **not** touch spinner/alert/badge/avatar/tabs/card/section/divider patterns —
those are Session 3. Do **not** touch modal overlay shells (`fixed inset-0 z-50`
overlays) — those are Session 4. You may replace `<Button>` elements *inside* existing
modal bodies, but leave the overlay shell structure intact.

---

## Step 1 — Build `Field.jsx`

Create `src/design-system/components/Field.jsx`. This is a **new** component (no admin
equivalent). It wraps a form control with a consistent label, required indicator, char
count, hint text, and error message.

```jsx
/**
 * Field wrapper providing label, hint, error message, and character count
 * for form controls.
 *
 * @param {{
 *   label?: string,
 *   hint?: string,
 *   error?: string,
 *   required?: boolean,
 *   count?: { current: number, max: number },
 *   htmlFor?: string,
 *   children: React.ReactNode,
 *   className?: string,
 * }} props
 */
```

`data-component="Field"` on the root element.

Rendered structure (rough):
```
<div data-component="Field">
  {label && <label htmlFor={htmlFor}>{label}{required && " *"}</label>}
  {children}
  <div> {/* hint / error / count row */}
    {error ? <span role="alert">{error}</span> : hint && <span>{hint}</span>}
    {count && <span>{count.current}/{count.max}</span>}
  </div>
</div>
```

Use `--ui-text`, `--ui-text-muted`, `--ui-danger`, `--ui-text-subtle` for text colors.

Export from `src/design-system/components/index.js`:
```js
export { default as Field } from "./Field";
```

---

## Step 2 — Extend shared form components

Extend these **existing** files in `src/design-system/components/`:

### `Button.jsx`

Add these props to the existing Session 1 base:

| Prop | Type | Behavior |
|---|---|---|
| `loading` | `boolean` | Shows a spinner, disables interaction; keeps button width stable |
| `fullWidth` | `boolean` | `width: 100%` |
| `startIcon` | `ReactNode` | Renders before `children` with consistent gap |
| `endIcon` | `ReactNode` | Renders after `children` |
| `as` | element type or component | Polymorphic — renders as `<a>`, `<Link>`, or `<button>` (default) |

When `loading={true}`, show an inline 16px spinner using CSS border animation (not
`animate-spin` on an icon). Keep `aria-disabled={loading || disabled}`.

Also add `danger-outline` to the `variant` union (red border, red text, transparent
background) alongside the existing `danger` (red fill).

### `Input.jsx`

Add:
| Prop | Type | Behavior |
|---|---|---|
| `startIcon` | `ReactNode` | Icon displayed inside the left edge; input padded to avoid overlap |
| `endAction` | `ReactNode` | Action rendered inside the right edge (clear button, show/hide) |
| `appearance` | `"default" \| "search" \| "code"` | `search` uses rounded-full; `code` uses monospace font |
| `label` | `string` | If provided, wraps self in `<Field>` |
| `hint` | `string` | Forwarded to `<Field>` |
| `error` | `string` | Forwarded to `<Field>`; adds `aria-invalid` to `<input>` |
| `required` | `boolean` | Forwarded to `<Field>` |

When `label` is provided, `Input` renders its own `<Field>` wrapper. When `label` is
absent, it renders the bare `<input>` (for use inside an explicit `<Field>`).

### `Textarea.jsx`

Add `label`, `hint`, `error`, `required`, `resize` (`"none"|"vertical"|"both"`)
props with the same `<Field>` self-wrapping pattern as `Input`.

### `Select.jsx`

Add `label`, `hint`, `error`, `required` with the same `<Field>` self-wrapping pattern.

---

## Step 3 — App page migration

### Import pattern for every migrated page

```js
import { Button, Input, Textarea, Select, Checkbox, Toggle, RadioGroup }
  from "../../design-system/components";
```

Adjust the relative path as needed.

### Migration rules

**Buttons:** Replace every `<button` in `src/pages/app/` that has inline className
styling with `<Button variant="..." size="...">`. Use:
- `variant="primary"` for orange-fill actions
- `variant="secondary"` for the default (dark/muted fill)
- `variant="outline"` for bordered transparent
- `variant="ghost"` for transparent hover-only
- `variant="danger"` for red-fill destructive
- `variant="danger-outline"` for red-border destructive (e.g. confirm-cancel row)
- `size="icon"` for square icon-only buttons (set `title` prop for accessibility)

Styled `<Link>` action elements that look like buttons → use `<Button as={Link} variant="..." to="...">`.

**Inputs:** Replace raw `<input type="text|email|password|...">` with `<Input>`.
Pass `label` if there is an adjacent `<label>` element (consolidate into the prop).
Pass `error` if there is inline error state logic.

**Textarea:** Replace `<textarea>` with `<Textarea>`. Same label/error consolidation.

**Select:** Replace `<select>` with `<Select>`. Same pattern.

**Toggle rows in `Settings.jsx`:** There is a local `ToggleRow` component or pattern.
Replace each occurrence with `<Toggle label="..." description="..." checked=...
onChange=... />`.

**Checkboxes in `Notifications.jsx` and `Playbooks.jsx`:** Replace custom
checkbox/radio patterns with `<Checkbox>` or `<RadioGroup>`.

### Pages and button counts (work through in this order)

| Page | Raw `<button>` count | Priority reason |
|---|---|---|
| `src/pages/app/Plays.jsx` | 24 | Largest; most drift |
| `src/pages/app/Settings.jsx` | 8 | Toggle patterns |
| `src/pages/app/Profile.jsx` | 8 | Danger zone, form |
| `src/pages/app/Team.jsx` | 7 | Member actions |
| `src/pages/app/Notifications.jsx` | 7 | Form controls |
| `src/pages/app/PlayNew.jsx` | 7 | New play form |
| `src/pages/app/PlayView.jsx` | — | Action buttons |
| `src/pages/app/Playbooks.jsx` | — | Filter controls |
| `src/pages/app/DemoVideos.jsx` | — | Minimal |
| `src/pages/app/ReportIssue.jsx` | — | Form |
| `src/pages/app/ProfileEmailVerification.jsx` | — | Minimal |

### What NOT to replace in this session

- Leave `<div className="fixed inset-0 ...">` overlay shells intact — Session 4
- Leave inline spinner (`animate-spin`) patterns intact — Session 3
- Leave alert/banner patterns intact — Session 3
- Leave badge/chip/avatar/card/section patterns intact — Session 3
- Do not touch `src/pages/AdminPlaysPage.jsx` or any admin page — admin imports from
  the barrel via `AdminX` aliases and needs no changes

---

## Step 4 — Update barrel and add to guard tests

Add `Field` to the barrel guard test in `admin/test/designSystemBarrel.test.js`:
- Assert `Field` is exported from the canonical barrel
- Assert no `AdminField` alias exists (Field has no admin equivalent to alias)

Add a new `admin/test/sharedFormControls.test.js` testing:
- `Button` variant/size class resolution
- `Button` `loading` prop disables interaction and renders spinner content
- `Button` `as` prop renders correct element type
- `Input` `error` prop adds `aria-invalid`
- `Input` `label` prop renders `<Field>` wrapper
- `Field` renders label, hint, error, count independently
- `Toggle` `checked`/`disabled` state class resolution
- `Select` and `Textarea` label/error propagation

---

## Step 5 — Verification

Before committing, run:
```bash
npx vitest run
npx vite build
```

Both must pass. The pre-existing 12 test failures (gifEncoder×8, playPreviewPlayer×3,
syncSports×1) are acceptable. No new failures.

Also manually verify these greps return zero hits across migrated files:
```bash
grep -rn "className.*bg-BrandOrange.*rounded.*<button\|<button.*className.*bg-BrandOrange" src/pages/app --include="*.jsx"
grep -rn "^import.*<input\b\|  <input " src/pages/app --include="*.jsx"
```

---

## Step 6 — CRAWLER_MAP.md and DESIGN_SYSTEM.md

Update `src/design-system/DESIGN_SYSTEM.md` with the new `Field` component entry and
the extended props for `Button`, `Input`, `Textarea`, `Select`.

No CRAWLER_MAP changes needed (no new files in tracked feature locations).

---

## Commit

Single commit to `claude/component-system-integration`:

```
Design system Q2 Session 2: Field component, extended Button/Input, app page form migration
```

Do **not** commit `.codex/` or `AGENTS.md`.
Do **not** push to `main`.
Do **not** start Session 3.

---

## What NOT to do

- Do not edit `src/features/slate/`, `src/canvas/`, `src/components/controlPill/`,
  `src/components/rightPanel/`, or any editor-adjacent file
- Do not replace modal overlay shells — leave `fixed inset-0 z-50` divs alone
- Do not replace spinner/alert/badge/card/section patterns — Session 3
- Do not change admin pages or admin components
- Do not merge to `main`
