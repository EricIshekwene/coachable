# Codex Prompt — Design System Q2, Session 4

> **Prerequisite:** Sessions 1, 2, and 3 must be committed on
> `claude/component-system-integration`. Verify:
> - `src/design-system/components/Card.jsx` has `tone`, `interactive`, `selected` props
> - `src/pages/app/Plays.jsx` imports `Card` and `Section` from the design-system barrel
> - `src/pages/app/Settings.jsx` uses `<Spinner>` and `<Alert>`
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

Session 4 covers overlays and guardrails — the highest-interaction work, scheduled last
because it depends on `Button`, `Card`, and `Section` from earlier sessions.

1. Build 5 new components: `ConfirmDialog`, `Toast`, `Menu`, `MenuItem`, `Popover`
2. Migrate 7 app-page overlay shells to use `<Modal>`
3. Replace 2 duplicate inline toasts in `Plays.jsx` with `<Toast>`
4. Replace context menus in `PlayCard.jsx` and `FolderCard.jsx` with `<Menu>` + `<MenuItem>`
5. Replace 2 app-page popovers with `<Popover>`
6. Add raw-pattern guard tests proving migration completeness
7. Final docs pass

---

## Step 1 — Build `ConfirmDialog.jsx`

Create `src/design-system/components/ConfirmDialog.jsx`. Built on top of `Modal`.

```jsx
/**
 * Confirmation dialog for destructive or irreversible actions.
 * Built on Modal; provides pre-wired confirm/cancel button slots.
 *
 * @param {{
 *   open: boolean,
 *   title: string,
 *   description?: string,
 *   confirmLabel?: string,       // default "Confirm"
 *   cancelLabel?: string,        // default "Cancel"
 *   tone?: "default" | "danger", // default "default"
 *   loading?: boolean,           // disables confirm button, shows spinner
 *   onConfirm: () => void,
 *   onCancel: () => void,
 * }} props
 */
```

`data-component="ConfirmDialog"` on the root (the Modal wrapper).

Implementation: render a `<Modal open={open} onClose={onCancel} title={title} size="sm">`,
with the description and two `<Button>` elements in the footer slot:
- Cancel: `variant="outline"`
- Confirm: `variant={tone === "danger" ? "danger" : "primary"}` with `loading={loading}`

Wrap the existing `src/components/subcomponents/ConfirmModal.jsx` in a compatibility
shim that maps its props to `ConfirmDialog`. The old component file stays at its path
but delegates to the new canonical component.

---

## Step 2 — Build `Toast.jsx`

Create `src/design-system/components/Toast.jsx`. New component; no admin equivalent.

```jsx
/**
 * Transient status message rendered in a fixed corner position.
 * For persistent inline feedback use Alert instead.
 *
 * @param {{
 *   open: boolean,
 *   title: string,
 *   description?: string,
 *   tone?: "default" | "success" | "error" | "warning" | "info",
 *   duration?: number,           // ms before auto-dismiss; 0 = never
 *   position?: "bottom-right" | "bottom-center" | "top-right",
 *   onClose: () => void,
 * }} props
 */
```

`data-component="Toast"` on the root element.

Implementation:
- Fixed position portal (use `ReactDOM.createPortal` into `document.body`)
- `role="status"` for non-error tones; `role="alert"` for `tone="error"`
- `aria-live="polite"` (or `"assertive"` for error)
- Auto-dismiss via `useEffect` that calls `onClose` after `duration` ms; cleared on
  unmount
- Close button (×) that calls `onClose`
- Visual style: `--ui-surface-elevated`, `--ui-border`, `--ui-shadow` via
  `var(--shadow-lg)`, appropriate semantic tone color stripe

**Compatibility:** `src/components/MessagePopup/MessagePopup.jsx` is the existing global
toast. Do **not** replace it or modify its implementation — it is used by many pages
via `useMessagePopup`. `Toast` is a standalone component for page-local uses only.

---

## Step 3 — Build `Menu.jsx` and `MenuItem.jsx`

Create `src/design-system/components/Menu.jsx`:

```jsx
/**
 * Floating context menu anchored to a trigger element.
 *
 * @param {{
 *   open: boolean,
 *   anchorRef: React.RefObject<HTMLElement>,
 *   onClose: () => void,
 *   placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end",
 *   width?: number | string,     // min-width of the panel; default 160px
 *   children: React.ReactNode,  // MenuItem elements
 * }} props
 */
```

`data-component="Menu"` on the panel element.

Implementation:
- Portal into `document.body`
- Position calculated from `anchorRef.current.getBoundingClientRect()` on open
- `z-index: var(--z-modal)` (or the overlay z-level)
- Close on outside click (`pointerdown` on document) and `Escape`
- `role="menu"` on the panel
- Trap focus within the menu when open; restore to anchor on close

Create `src/design-system/components/MenuItem.jsx`:

```jsx
/**
 * Item within a Menu.
 *
 * @param {{
 *   icon?: ReactNode,
 *   destructive?: boolean,   // red text tone
 *   disabled?: boolean,
 *   selected?: boolean,
 *   onSelect: () => void,
 *   children: React.ReactNode,
 * }} props
 */
```

`data-component="MenuItem"` on the root element.
`role="menuitem"`, `tabIndex={-1}`. Handle `Enter`/`Space` to trigger `onSelect`.
`destructive` items use `--ui-danger` text color.

Export both from the barrel:
```js
export { default as Menu }     from "./Menu";
export { default as MenuItem } from "./MenuItem";
```

---

## Step 4 — Build `Popover.jsx`

Create `src/design-system/components/Popover.jsx`:

```jsx
/**
 * Floating content panel anchored to a trigger, for non-menu overlays
 * (tag suggestions, filter panels, date pickers).
 *
 * @param {{
 *   open: boolean,
 *   anchorRef: React.RefObject<HTMLElement>,
 *   onClose: () => void,
 *   placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end",
 *   size?: "sm" | "md" | "lg",
 *   children: React.ReactNode,
 * }} props
 */
```

`data-component="Popover"` on the panel.

Same portal + outside-click + Escape pattern as `Menu`, but without `role="menu"`.
Use `role="dialog"` with `aria-modal="false"` (it's not a blocking modal).

Export from the barrel:
```js
export { default as Popover } from "./Popover";
```

---

## Step 5 — Migrate 7 app-page overlay shells

These 7 overlays currently use raw `fixed inset-0 z-50` divs for their backdrop and a
centered panel. Replace each with `<Modal>`.

### `src/pages/app/DemoVideos.jsx` (1 modal)

The video-detail overlay. Migrate its shell to `<Modal>` — keep all content inside the
modal body.

### `src/pages/app/Plays.jsx` (5 modals)

Identified from the 5 overlay patterns in the file:
1. Create folder modal
2. Move play to folder modal
3. Share play modal
4. Rename folder modal
5. Play delete confirm — migrate this one to `<ConfirmDialog tone="danger">` instead

Migrate each overlay shell to `<Modal open={...} onClose={...} title="..." size="sm|md">`.
Keep all form content, button handlers, and state as-is inside the modal body.

### `src/pages/app/Team.jsx` (1 modal)

The invite member modal. Migrate shell to `<Modal>`. Keep `<Input>` and `<Button>`
from Session 2 inside the body.

---

## Step 6 — Replace 2 duplicate inline toasts in `Plays.jsx`

There are two page-local toast/notification divs in `Plays.jsx` that duplicate the
global `MessagePopup` pattern. They look like:
```jsx
<div className="fixed bottom-4 right-4 z-50 ...">
  <p>{toastMessage}</p>
  <button onClick={clearToast}>×</button>
</div>
```

Replace each with:
```jsx
<Toast
  open={!!toastMessage}
  title={toastMessage}
  tone="success"
  duration={3000}
  onClose={clearToast}
/>
```

---

## Step 7 — Replace context menus in `PlayCard.jsx` and `FolderCard.jsx`

`src/components/PlayCard.jsx` and `src/components/FolderCard.jsx` each have a
`z-20 absolute` dropdown menu built from raw divs. Replace each with `<Menu>` +
`<MenuItem>`:

```jsx
// Before
<div className="absolute z-20 right-0 top-full rounded-lg border ...">
  <button onClick={onRename}>Rename</button>
  <button onClick={onDelete} className="text-red-400">Delete</button>
</div>

// After
<Menu open={menuOpen} anchorRef={menuBtnRef} onClose={() => setMenuOpen(false)}>
  <MenuItem icon={<EditIcon />} onSelect={onRename}>Rename</MenuItem>
  <MenuItem icon={<TrashIcon />} destructive onSelect={onDelete}>Delete</MenuItem>
</Menu>
```

Keep all existing handler props and state — only replace the menu shell.

---

## Step 8 — Replace 2 app-page popovers

### `src/pages/app/PlayNew.jsx`

Tag suggestion popover. Identify the `z-20 absolute` panel that lists tag suggestions
as the user types. Replace its shell with `<Popover>`, keeping the suggestion list content.

### `src/pages/app/Playbooks.jsx`

Filter popover. Same pattern — the floating filter panel is a `Popover` shell.

---

## Step 9 — Update barrel and guard tests

Add to `src/design-system/components/index.js`:
```js
export { default as ConfirmDialog } from "./ConfirmDialog";
export { default as Toast }         from "./Toast";
export { default as Menu }          from "./Menu";
export { default as MenuItem }      from "./MenuItem";
export { default as Popover }       from "./Popover";
```

Add these new exports to `admin/test/designSystemBarrel.test.js` assertions.

### Raw-pattern guard tests

Add `admin/test/designSystemGuards.test.js`. These are static source-scan tests —
read the migrated files as strings and assert the patterns are absent:

```js
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

function appPageSources() {
  const dir = join(process.cwd(), "src/pages/app");
  return readdirSync(dir)
    .filter(f => f.endsWith(".jsx"))
    .map(f => readFileSync(join(dir, f), "utf8"));
}

describe("raw pattern guards — app pages", () => {
  test("no raw modal overlay shells", () => {
    for (const src of appPageSources()) {
      expect(src).not.toMatch(/fixed inset-0 z-50/);
    }
  });

  test("no raw animate-spin spinners", () => {
    for (const src of appPageSources()) {
      expect(src).not.toMatch(/animate-spin/);
    }
  });

  test("no raw absolute z-20 dropdown divs", () => {
    // Catches unreplaced context-menu dropdowns in app pages
    for (const src of appPageSources()) {
      expect(src).not.toMatch(/absolute.*z-20.*rounded.*border/);
    }
  });
});
```

Also add logic-mirror tests for the new components in `admin/test/sharedOverlays.test.js`:
- `ConfirmDialog` `tone="danger"` resolves confirm button to `variant="danger"`
- `ConfirmDialog` `loading` propagates to confirm button
- `Toast` duration=0 does not auto-dismiss
- `Toast` tone prop maps to correct `role` (`"error"` → `role="alert"`, others → `role="status"`)
- `Menu` is closed by Escape (via RTL in `src/test/Menu.test.jsx`)
- `MenuItem` `destructive` class resolution

Add RTL tests for `Menu` in `src/test/Menu.test.jsx`:
- Renders children when open
- Does not render children when closed
- Calls `onClose` when Escape is pressed
- `MenuItem` calls `onSelect` on click and on Enter key

---

## Step 10 — Verification

```bash
npx vitest run
npx vite build
```

Both must pass. No new failures beyond the pre-existing 12.

Verify these grep patterns return zero across `src/pages/app/*.jsx`:
```bash
grep -rn "fixed inset-0 z-50" src/pages/app --include="*.jsx"
grep -rn "animate-spin" src/pages/app --include="*.jsx"
grep -rn "flex flex-col items-center justify-center" src/pages/app --include="*.jsx"
grep -rn "rounded-lg border border-BrandGray2" src/pages/app --include="*.jsx"
grep -rn "absolute.*z-20.*rounded.*border" src/pages/app --include="*.jsx"
grep -rn "absolute.*z-20.*rounded.*border" src/components/PlayCard.jsx src/components/FolderCard.jsx
```

---

## Step 11 — Final documentation pass

Update `src/design-system/DESIGN_SYSTEM.md`:
- Add all 5 new components with props tables
- Add "Session 4 complete" note
- Add the "contributor rules" from section 8 of `DESIGN_SYSTEM_Q2_PLAN.md`
- Document the `ConfirmModal` → `ConfirmDialog` migration path

Update `CRAWLER_MAP.md`:
- Add `Menu`, `MenuItem`, `Popover`, `Toast`, `ConfirmDialog` to the design-system
  barrel section
- Update the `PlayCard` / `FolderCard` rows to note they now use `<Menu>` + `<MenuItem>`

---

## Commit

Single commit to `claude/component-system-integration`:

```
Design system Q2 Session 4: ConfirmDialog, Toast, Menu, Popover, overlay migration, guard tests
```

Do **not** commit `.codex/` or `AGENTS.md`.
Do **not** push to `main`.

---

## What NOT to do

- Do not replace `MessagePopup` / `useMessagePopup` — it is the global toast system
  and is used by many feature components outside the scope of this plan
- Do not edit canvas/editor files or admin pages
- Do not modify `PlayPickerModal` content (only its shell if it uses a raw overlay)
- Do not merge to `main`
