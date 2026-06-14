# Design System Q2 — Session 4: Overlay Components

## Scope

Session 4 introduced 5 new overlay primitives and migrated all applicable raw inline overlays in `src/pages/app/` and card components.

---

## New Components

### ConfirmDialog

Wraps `Modal` (size="sm") with pre-wired confirm/cancel buttons.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `open` | boolean | — | |
| `title` | string | — | Modal heading |
| `description` | string | — | Optional body paragraph |
| `confirmLabel` | string | "Confirm" | |
| `cancelLabel` | string | "Cancel" | |
| `tone` | "default" \| "danger" | "default" | "danger" → variant="danger" on confirm button |
| `loading` | boolean | false | Propagates to confirm button; disables cancel |
| `onConfirm` | () => void | — | |
| `onCancel` | () => void | — | Also wired to Modal onClose |

**ConfirmModal shim**: `src/components/subcomponents/ConfirmModal.jsx` is now a thin compatibility shim over ConfirmDialog, mapping `message → title`, `subtitle → description`, `danger → tone="danger"`. New code should import ConfirmDialog directly.

---

### Toast

Portal-based transient notification. Auto-dismisses via `duration` ms.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `open` | boolean | — | |
| `title` | string | — | |
| `description` | string | — | Optional subtitle |
| `tone` | "default" \| "success" \| "error" \| "warning" \| "info" | "default" | |
| `duration` | number | 3000 | ms until onClose; 0 = no auto-dismiss |
| `position` | "bottom-right" \| "bottom-center" \| "top-right" | "bottom-right" | |
| `onClose` | () => void | — | |

**Accessibility**: `role="alert"` + `aria-live="assertive"` for error tone; `role="status"` + `aria-live="polite"` for all others.

**SSR safety**: `typeof document === "undefined"` guard inside render; no DOM access at module level.

---

### Menu

Portal-based floating context menu. Anchors to a trigger element via `anchorRef`.

| Prop | Type | Default |
|------|------|---------|
| `open` | boolean | — |
| `anchorRef` | React.RefObject | — |
| `onClose` | () => void | — |
| `placement` | "bottom-start" \| "bottom-end" \| "top-start" \| "top-end" | "bottom-start" |
| `width` | number \| string | 160 |
| `children` | ReactNode | — |

**Keyboard contract**: Escape dismissal with focus-restoration to trigger; ArrowDown/ArrowUp navigation; Home/End jumps; initial focus on first non-disabled item.

**Disabled exclusion**: Navigation via `querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')`.

**Outside-pointer**: `pointerdown` capture-phase handler; excluded: anchor element and panel itself.

---

### MenuItem

Child of Menu. `role="menuitem"`, `tabIndex={-1}`.

| Prop | Type | Default |
|------|------|---------|
| `icon` | ReactNode | — |
| `destructive` | boolean | false |
| `disabled` | boolean | false |
| `onSelect` | () => void | — |
| `children` | ReactNode | — |

Disabled items have `aria-disabled="true"` and suppress `onSelect`. Enter/Space activates.

---

### Popover

Portal-based floating content panel for non-menu overlays (suggestions, filter panels).

| Prop | Type | Default |
|------|------|---------|
| `open` | boolean | — |
| `anchorRef` | React.RefObject | — |
| `onClose` | () => void | — |
| `placement` | "bottom-start" \| "bottom-end" \| "top-start" \| "top-end" | "bottom-start" |
| `size` | "sm" (200px) \| "md" (280px) \| "lg" (360px) | — (natural width) |
| `children` | ReactNode | — |

`role="dialog"` `aria-modal="false"` (non-blocking). `z-index: 9998` (below Menu's 9999).

**Repositioning**: Recomputes position on open, window resize, and capture-phase scroll. Viewport-aware: clamps right edge if panel would overflow.

**Dismissal**: outside-pointer (pointerdown capture, excludes anchor) + Escape.

---

## Modal Changes (additive)

Two new props added to `Modal`:
- `size?: "sm" | "md" | "lg" | "xl"` — maps to Tailwind max-width class; used by ConfirmDialog
- `noPadding?: boolean` — removes the default `p-4 sm:p-6`; used by DemoVideos video modal for edge-to-edge iframe

Existing `width` prop still works as an override (backward-compatible).

---

## Migrated Overlays

### DemoVideos.jsx
- Raw `fixed inset-0 z-50` video player overlay → `<Modal width="max-w-3xl" hideClose noPadding>`

### Team.jsx
- Raw `fixed inset-0 z-50` remove-member confirmation → `<ConfirmDialog tone="danger">`

### Plays.jsx
- Two raw `fixed bottom-6 left-1/2 z-50` toast divs → `<Toast position="bottom-center" duration={2500}>`
- Five raw `fixed inset-0 z-50` modals (moveTarget, bulkMove, bulkTag, postTarget, copyFallbackUrl) → `<Modal size="sm">`
- Removed the manual `setTimeout(() => setToast(null), 2500)` auto-dismiss effect (Toast handles internally)

### PlayCard.jsx
- Raw `absolute right-0 bottom-full z-50 mb-1 w-48` menu div + outside-click useEffect → `<Menu placement="top-end" width={192}>` + `<MenuItem>` items
- Card `className` always `overflow-hidden` (removed `z-20 overflow-visible` conditional toggled by menu open state)

### FolderCard.jsx
- Same pattern as PlayCard

### PlayNew.jsx
- Raw `absolute left-0 right-0 top-0 z-20` tag suggestions div → `<Popover placement="bottom-start">` anchored to the tag container div
- Preserved onBlur 150ms delay + onMouseDown preventDefault (keyboard UX) alongside Popover's outside-pointer handling

### Playbooks.jsx
- Raw `absolute right-0 top-[calc(100%+0.75rem)] z-20 w-[280px]` filter panel + outside-click useEffect → `<Popover placement="bottom-end" size="md">` anchored to the filter button

---

## Intentionally Excluded

- **MessagePopup / useMessagePopup**: System-level notification channel; not in scope
- **Editor/canvas overlays**: Not app-page overlays; separate concern
- **Admin pages**: Out of scope for this session
- **ConfirmModal** usages in admin: Left as-is (shim handles compatibility)

---

## Contributor Rules

1. For confirmations: use `<ConfirmDialog>` (or `<ConfirmModal>` in legacy code); never raw fixed-inset divs
2. For toasts: use `<Toast>`; never raw fixed bottom divs with animate-fadeInUp
3. For context menus: use `<Menu>` + `<MenuItem>`; never raw absolute z-50 divs
4. For floating panels (suggestions, filters): use `<Popover>`; never raw absolute z-20 divs
5. New overlays must be portal-based (Menu, Popover, Toast) or use Modal/ConfirmDialog
