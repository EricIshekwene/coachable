# Component Specs — src/ui/

This document specifies the prop conventions and component APIs for `src/ui/`. It is the single source of truth for how components are built and consumed. Four sessions complete this document:

- **6.1** — Prop conventions + Button, Input, Modal, Toast
- **6.2 (this session)** — Implementation details + Spinner, Textarea, Checkbox, Select, MultiSelect, Tooltip
- **6.3 ✅** — Display and domain components (PlayCard, FolderCard, SectionCard, NotificationItem, BlockRenderer, TeamMemberCard, EmptyState, TagPill, SportBadge, SearchResultItem)
- **6.4** — Layout and shell components (Sidebar, Header, PageShell)

All components reference `design/color-semantics.md` for tokens, `design/general-formatting-standards.md` for spacing, typography, and focus rings, and `design/accessibility-standards.md` for keyboard and ARIA behavior.

---

## Part 1 — Prop Conventions

These rules apply to every component in `src/ui/` without exception.

---

### 1. className — last-resort escape hatch

All `src/ui/` components accept a `className` prop. It merges with the component's internal classes and has full override power — it is not restricted to layout-only changes.

**However:** components are designed to cover every real use case through props. If `className` appears in production code, it signals that the component is missing a variant or prop. Treat it as a prompt to add the missing case to the component and to this spec.

```tsx
// Acceptable only when the component lacks the prop you need
<Button className="w-full" />

// Signals a missing variant — add it to the spec instead
<Button className="bg-blue-500 text-white" />
```

`className` is not a license to restyle components arbitrarily. Its presence in a PR should prompt the question: *why doesn't the component have a prop for this?*

---

### 2. Size scale — sm / md / lg

All size props use the three-value semantic scale. No numeric px values, no Tailwind size names.

| Value | Use |
|---|---|
| `sm` | Compact / dense UI — toolbars, inline controls |
| `md` | Default. Omit this prop and you get `md`. |
| `lg` | Prominent CTAs, touch-target contexts |

Not every component exposes all three sizes. A component only declares the sizes that make meaningful visual sense. A `Toast`, for example, has no size prop — it is always the same size.

---

### 3. Variant naming

Variants are named by semantic role, never by color or visual appearance:

| Variant | Role |
|---|---|
| `primary` | Main call-to-action — one per screen section |
| `secondary` | Secondary action alongside a primary |
| `ghost` | Low-emphasis action, icon-only buttons |
| `destructive` | Irreversible or dangerous actions |

The base set is `primary / secondary / ghost / destructive`. Additional variants are added to this document when a concrete use case cannot be mapped to one of these four. New variants are never added speculatively.

Default variant is always `primary` unless otherwise specified per component.

---

### 4. Loading states

Components that trigger async operations accept a `loading` boolean. When `loading={true}`:

- An animated spinner renders inside the component in place of (or alongside) the primary content
- The component is `aria-disabled="true"` and pointer events are blocked
- The component width is preserved — no layout shift when loading starts or ends
- The spinner animation follows the motion budget: `150–300ms`, `transform` + `opacity` only
- The spinner animation is disabled at `prefers-reduced-motion: reduce`

Loading is not a wrapper — it is an intrinsic state of the component itself.

---

### 5. Disabled states

Components accept a `disabled` boolean. When `disabled={true}`:

- Background and border use `var(--ui-surface-muted)` or the component's idle style at 40% opacity
- Text uses `var(--ui-text-subtle)` or the component's text at 40% opacity
- Cursor is `not-allowed`
- `aria-disabled="true"` is set on the root element
- Pointer events are blocked

`disabled` and `loading` are independent — both can be true simultaneously (the loading spinner shows, all interaction is blocked).

---

### 6. Event handler naming

All event handler props use the `onXxx` prefix with a past-tense or noun qualifier:

| Pattern | Example |
|---|---|
| `onXxx` — user action | `onClick`, `onChange`, `onDismiss` |
| `onXxxChange` — value change | `onValueChange` (preferred over raw `onChange` for non-input components) |
| `onClose` — dismissal | Modals, toasts, drawers |

Handlers always receive the minimum useful payload — not raw DOM events unless there is no alternative.

```tsx
// Preferred — clean payload
onChange: (value: string) => void

// Only when raw event is necessary
onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
```

---

### 7. TypeScript prop interfaces

Every component exports its props interface by name alongside the component:

```ts
export interface ButtonProps { ... }
export function Button(props: ButtonProps) { ... }
```

Prop interfaces are named `ComponentNameProps`. They are exported so consumers can type their own wrappers without duplicating the shape.

`children` is typed as `React.ReactNode` when the component accepts arbitrary content. Components that accept only specific child types (e.g., a list that only accepts `<ListItem>`) type `children` restrictively.

---

### 8. General rules

- **Named exports only** — never `export default`. See `frontend-code-standards.md` §06.
- **No magic numbers in component implementations** — use `--radius-*`, `--icon-*`, and `--ui-*` tokens directly. Never hardcode `#FF7A18` or `8px` inline.
- **One component per file.** File name matches component name in PascalCase: `Button.tsx`.
- **Barrel export** — every component is re-exported from `src/ui/index.ts`.
- **Catalogue** — every component is registered in `src/admin/pages/AdminDesignSystem.jsx` when created. See `frontend-code-standards.md` §11.
- **Focus ring** — every interactive element shows `outline: 2px solid var(--ui-accent); outline-offset: 2px` on `:focus-visible`. Never suppress focus rings without a replacement.

---

### 9. Z-index stack

All components that render above the page surface use CSS custom properties defined on `:root`. Never use ad-hoc z-index values in component implementations.

| Token | Value | Components |
|---|---|---|
| `--z-dropdown` | 100 | Select, MultiSelect dropdown panel |
| `--z-tooltip` | 200 | Tooltip |
| `--z-modal-backdrop` | 300 | Modal backdrop overlay |
| `--z-modal` | 301 | Modal panel |
| `--z-toast` | 400 | ToastContainer |

Toast sits above Modal so feedback triggered by an action inside a modal remains visible. Tooltip sits below the modal backdrop so it does not bleed through when a modal opens.

---

## Part 2 — Primitives

---

### Button

The fundamental interactive trigger. Buttons perform actions. If the element navigates somewhere, use `<a>` or React Router's `<Link>` — not `Button`.

#### Props

```ts
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}
```

Default: `variant="primary"`, `size="md"`, `type="button"`.

#### Variant table

| Variant | Background | Text | Border | Hover bg |
|---|---|---|---|---|
| `primary` | `var(--ui-accent)` | `#FFFFFF` | none | `var(--ui-accent-hover)` |
| `secondary` | transparent | `var(--ui-text)` | 1px `var(--ui-border-strong)` | `var(--ui-surface-muted)` |
| `ghost` | transparent | `var(--ui-text-muted)` | none | `var(--ui-surface-muted)` |
| `destructive` | `var(--ui-error)` | `#FFFFFF` | none | `var(--ui-error)` at 85% |

Pressed state (`:active`) for `primary`: `var(--ui-accent-pressed)`. For `destructive`: `var(--ui-error)` at 70%.

#### Size table

All values on the 4px grid. Typography is always `label` (13px DmSans 600) regardless of size.

| Size | Height | Horizontal padding | Vertical padding | Border radius |
|---|---|---|---|---|
| `sm` | 28px | 12px | 4px | `--radius-md` (8px) |
| `md` | 36px | 16px | 8px | `--radius-md` (8px) |
| `lg` | 44px | 20px | 12px | `--radius-md` (8px) |

On mobile, all button sizes extend their hit target to 48px minimum via padding or `min-height` — the visual height can stay smaller, but the tap area must meet the 48px touch target requirement from `mobile-formatting-standards.md`.

#### Loading behavior

When `loading={true}`:
- The label is hidden (opacity 0, not removed from DOM — preserves width)
- An animated `<Spinner />` renders centered in the button
- `aria-disabled="true"` is set
- Pointer events are blocked with `pointer-events: none`

The button does not change size when loading starts. Width is fixed to its pre-loading dimensions.

#### Disabled state

When `disabled={true}`, all variants render at 40% opacity. Cursor is `not-allowed`. `aria-disabled="true"` is set.

#### Accessibility

- `type="button"` is always explicit to prevent accidental form submission.
- Icon-only buttons must receive `aria-label` — the prop is required in that case (enforced by the consumer; the component passes it through).
- Focus ring: `outline: 2px solid var(--ui-accent); outline-offset: 2px` on `:focus-visible`.

#### Usage

```tsx
// Default CTA
<Button onClick={handleSave}>Save Play</Button>

// Secondary action
<Button variant="secondary" onClick={handleCancel}>Cancel</Button>

// Async operation
<Button loading={isSaving} onClick={handleSave}>Save</Button>

// Destructive — always confirm first via Modal
<Button variant="destructive" onClick={handleDelete}>Delete Team</Button>

// Icon-only — aria-label required
<Button variant="ghost" aria-label="Close" onClick={onClose}>
  <CloseIcon />
</Button>
```

---

### Input

Single-line text input. Handles all text-entry types. Does not manage its own state — fully controlled.

For multi-line text, use `Textarea`. For select dropdowns, use `Select` or `MultiSelect`.

#### Props

```ts
export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search' | 'number';
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  autoComplete?: string;
  className?: string;
}
```

Default: `type="text"`, `size="md"`.

`onChange` receives the string value directly — not the DOM event.

`id` is used to wire the `<label>` to the `<input>` via `htmlFor`. If `id` is omitted and `label` is provided, the component generates a stable internal id. Providing `id` explicitly is preferred when the input is part of a form.

#### Size table

| Size | Height | Horizontal padding | Vertical padding | Border radius | Font |
|---|---|---|---|---|---|
| `sm` | 32px | 12px | 4px | `--radius-md` (8px) | `body` (15px DmSans 400) |
| `md` | 40px | 12px | 8px | `--radius-md` (8px) | `body` (15px DmSans 400) |
| `lg` | 48px | 16px | 12px | `--radius-md` (8px) | `body` (15px DmSans 400) |

#### State table

States are mutually exclusive. Error overrides focused styling when both would apply.

| State | Border | Background | Outline |
|---|---|---|---|
| Idle | 1px `var(--ui-border)` | `var(--ui-surface)` | none |
| Focused | 1px `var(--ui-border-strong)` | `var(--ui-surface)` | `2px solid var(--ui-accent)`, offset 2px |
| Error | 1px `var(--ui-error)` | `var(--ui-surface)` | none |
| Disabled | 1px `var(--ui-border)` at 40% | `var(--ui-surface-muted)` | none |

Input text color is always `var(--ui-text)`. Placeholder text is `var(--ui-text-subtle)`.

#### Error display

When `error` is a non-empty string:
- The input border changes to `var(--ui-error)`
- The error string renders below the input in `caption` typography (11px DmSans 400) using `var(--ui-error-text)`
- An `aria-describedby` attribute connects the input to the error message element
- An `aria-invalid="true"` attribute is set on the `<input>`

The error message is always text — never color alone (WCAG SC 1.4.1).

#### Label

When `label` is provided, it renders above the input as a `<label>` element in `label` typography (13px DmSans 600) using `var(--ui-text)`. The `<label>` is wired to the `<input>` via `htmlFor`/`id`.

Required fields set `aria-required="true"` on the `<input>`. An asterisk may render in the label as a visual supplement but is never the sole indicator.

#### Validation timing

Validation is the consumer's responsibility — `Input` renders what it is given. The `error` prop appears when the consumer has determined an error exists. Per `general-formatting-standards.md` §13, validation fires on blur, not on keystroke, unless the field has already been submitted once.

#### Usage

```tsx
// Controlled with label
<Input
  id="team-name"
  label="Team name"
  value={name}
  onChange={setName}
  placeholder="e.g. Varsity Blue"
/>

// With error state
<Input
  id="email"
  label="Email"
  type="email"
  value={email}
  onChange={setEmail}
  error={emailError}
/>

// Disabled
<Input
  label="Sport"
  value={sport}
  onChange={() => {}}
  disabled
/>
```

---

### Modal

Floating dialog that interrupts the current flow. Renders in a React portal above all page content. Used for confirmations, forms, and content that requires the user's full attention before proceeding.

For non-blocking contextual content, use a Popover or Drawer (specified in 6.3).

#### Props

```ts
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

Default: `size="md"`.

`open` controls visibility. The modal is always mounted in the DOM when `open` changes — the component manages its own enter/exit animation. The consumer never conditionally renders `<Modal>` based on `open` to avoid losing exit animation.

```tsx
// Correct — always rendered, open controls visibility
<Modal open={isOpen} onClose={() => setIsOpen(false)}>...</Modal>

// Incorrect — exit animation is lost
{isOpen && <Modal open onClose={...}>...</Modal>}
```

#### Size table

`size` controls the maximum width of the modal panel.

| Size | Max width | Use |
|---|---|---|
| `sm` | 400px | Short confirmations, single-action dialogs |
| `md` | 560px | Forms, multi-field dialogs |
| `lg` | 720px | Content-heavy dialogs, previews |

On mobile (below `md` breakpoint), all sizes expand to fill the screen width minus 32px (16px margin each side), and switch to a bottom sheet presentation with 20px radius on the top corners only and no radius on the bottom.

#### Visual style

- Panel background: `var(--ui-surface-raised)`
- Shadow: `var(--shadow-lg)`
- Border radius: `--radius-xl` (18px) on desktop; bottom-sheet corners on mobile
- Backdrop: `rgba(0, 0, 0, 0.6)` covering the full viewport

#### Implementation

- **Portal:** `createPortal` into `document.body`. Backdrop z-index: `var(--z-modal-backdrop)`. Panel z-index: `var(--z-modal)`.
- **Focus trap:** `focus-trap-react`. On open: initial focus moves to the close (×) button — the first focusable element in the header. On close: focus returns to the element that triggered the modal. Tab and Shift+Tab are contained inside the modal while open.
- **Background:** `aria-hidden="true"` applied to all background content while open. `focus-trap-react` handles this automatically.
- **Scroll lock:** `overflow: hidden` on `<body>` while open.
- **Keyboard:** `Escape` closes the modal and calls `onClose`.
- **Backdrop click:** Clicking the backdrop overlay calls `onClose`.

#### Header

Every modal renders a formal header region regardless of whether `title` is provided.

- Height: 56px
- Padding: `16px 24px`
- Border-bottom: `1px solid var(--ui-border)`
- Layout: `display: flex; align-items: center; justify-content: space-between`

When `title` is provided, it renders as an `<h2>` left-aligned in `subheading` typography (17px Manrope 600, `var(--ui-text)`). The modal root has `role="dialog"` and `aria-labelledby` pointing to the title element's id.

When `title` is omitted, the header renders with only the × button. The consumer must provide `aria-label` on the `<Modal>` root.

#### Close button

Always rendered. Never conditional. Right-aligned in the header.

- `ghost` `sm` `Button` with a close icon (×)
- `aria-label="Close dialog"`
- First focusable element in the focus trap — `focus-trap-react`'s `initialFocus` targets it
- Calls `onClose` on click

#### Content and footer areas

- Content area padding: `24px`
- Footer (action buttons): consumer's responsibility. Recommended: `padding: 0 24px 24px`, `display: flex`, `gap: 8px`, `justify-content: flex-end`

#### Animation

Enter: fade in + scale from 95% → 100%, `200ms ease-out`, `opacity` + `transform` only.
Exit: fade out + scale from 100% → 95%, `150ms ease-in`.
Both disabled at `prefers-reduced-motion: reduce`.

Backdrop fades in/out at `200ms` / `150ms` matching the panel.

#### ARIA

- Modal root: `role="dialog"`, `aria-modal="true"`
- When `title` provided: `aria-labelledby` pointing to the `<h2>` id
- When `title` omitted: consumer provides `aria-label` on `<Modal>`

#### Usage

```tsx
<Modal
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  title="Delete play?"
  size="sm"
>
  <p>This action cannot be undone.</p>
  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
    <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
    <Button variant="destructive" loading={isDeleting} onClick={handleDelete}>Delete</Button>
  </div>
</Modal>
```

---

### Toast (complete system)

The Toast system handles all application-level messaging — success confirmations, errors, warnings, and informational notices. It is a complete, self-contained system that replaces `AppMessageContext` entirely.

**Do not use Modal for transient feedback.** Use Toast. Modal is for decisions; Toast is for outcomes.

#### Architecture

The system has four exports:

| Export | Role |
|---|---|
| `<ToastProvider>` | Wraps the app. Owns the queue, timer state, and live regions. Renders `<ToastContainer>`. |
| `useToast()` | Hook. Returns `showToast` and `dismissToast`. Callable from any component inside `<ToastProvider>`. |
| `<ToastContainer>` | Portaled to `document.body`. Renders the live queue. Not used directly — `<ToastProvider>` renders it. |
| `<Toast>` | Renders a single toast item. Also usable standalone if needed outside the queue. |

`<ToastProvider>` wraps the root of the app — it is a peer of `AuthProvider`, not nested inside a page component.

#### Toast types

| Type | Icon color | Background | Border | Use |
|---|---|---|---|---|
| `success` | `var(--ui-success-text)` | `var(--ui-success-muted)` | 1px `var(--ui-success-text)` at 30% | Operation completed |
| `error` | `var(--ui-error-text)` | `var(--ui-error-muted)` | 1px `var(--ui-error-text)` at 30% | Operation failed |
| `warning` | `var(--ui-warning-text)` | `var(--ui-warning-muted)` | 1px `var(--ui-warning-text)` at 30% | Degraded or partial outcome |
| `info` | `var(--ui-info-text)` | `var(--ui-info-muted)` | 1px `var(--ui-info-text)` at 30% | Neutral status update |

Every type includes a semantic icon (check, x-circle, warning triangle, info-circle) in the appropriate `--ui-*-text` color. The message is always text alongside the icon — never color alone (WCAG SC 1.4.1).

#### ToastItem shape

```ts
export interface ToastItem {
  id: string;           // generated internally by showToast
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;    // ms until auto-dismiss. Default: 4000. Set to 0 for persistent.
}
```

#### useToast()

```ts
export interface UseToastReturn {
  showToast: (options: Omit<ToastItem, 'id'>) => string; // returns the generated id
  dismissToast: (id: string) => void;
}
```

`showToast` adds the item to the queue and starts its timer. It returns the toast's id so the caller can dismiss it early if needed (e.g., on unmount or on a follow-up action).

`dismissToast` removes the item from the queue immediately, triggering the exit animation.

#### Queue behavior

- Maximum 3 toasts visible simultaneously. If a 4th is added, the oldest is dismissed immediately to make room.
- Toasts stack vertically in the container, newest on top.
- Each toast auto-dismisses after its `duration` elapses. The timer pauses on hover.
- `duration: 0` means persistent — the user must dismiss manually via the × button.
- Default `duration` is 4000ms for all types. Pass `duration: 0` explicitly when persistence is required.

#### Position

Fixed position: top-right on desktop (`top: 24px`, `right: 24px`). On mobile (below `md` breakpoint): top-center with 16px horizontal margin.

Top position avoids collision with the mobile bottom nav.

#### Toast props (single item)

```ts
export interface ToastProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}
```

`<Toast>` is a pure display component — it knows its item and can call `onDismiss`, nothing else.

Visual: rounded panel (`--radius-md`, 8px), `var(--shadow-lg)`, max-width 360px, padding 12px 16px, gap 12px between icon and message, dismiss button (×) on the right.

Message typography: `body` (15px DmSans 400) in `var(--ui-text)`.

#### Animation

Enter: slide in from the right + fade, `250ms ease-out`.  
Exit: slide out to the right + fade, `200ms ease-in`.  
Both disabled at `prefers-reduced-motion: reduce` — instant show/hide.

#### Usage

```tsx
// 1. Wrap the app once
export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}

// 2. Call from any component
function SaveButton() {
  const { showToast } = useToast();

  async function handleSave() {
    try {
      await savePlay();
      showToast({ type: 'success', message: 'Play saved.' });
    } catch {
      showToast({ type: 'error', message: 'Failed to save. Try again.', duration: 0 });
    }
  }

  return <Button onClick={handleSave}>Save</Button>;
}

// 3. Dismiss early (e.g. after a follow-up action completes)
const id = showToast({ type: 'info', message: 'Uploading...', duration: 0 });
await upload();
dismissToast(id);
showToast({ type: 'success', message: 'Upload complete.' });
```

#### Live regions

`ToastProvider` renders two visually-hidden live regions alongside `ToastContainer`. Both are always present in the DOM (never unmounted) and always empty until a toast fires.

```tsx
{/* polite — success, info, warning */}
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only" />

{/* assertive — error only */}
<div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only" />
```

When `showToast` is called, the message text is written into the matching region:
- `type: 'error'` → assertive region (interrupts the screen reader immediately)
- All other types → polite region (waits for the current interaction to finish)

The region content is cleared after the toast's exit animation completes.

`sr-only` must be a visually-hidden utility: `position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0`. Never use `display: none` or `visibility: hidden` — screen readers ignore those.

---

### Spinner

Animated loading indicator. Used inside `Button` when `loading={true}` and as a standalone page-level or section-level loader.

#### Props

```ts
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}
```

Default: `size="md"`.

`color` accepts any valid CSS color value. When omitted, the spinner uses `currentColor` — inheriting the text color of its surrounding context. A `Spinner` inside a `primary` Button (white text) renders white automatically; inside a `secondary` Button it renders `var(--ui-text)`.

#### Size table

| Size | Diameter | Border width | Use |
|---|---|---|---|
| `sm` | 12px | 2px | Inside `sm` Button |
| `md` | 16px | 2px | Inside `md` and `lg` Button; default standalone |
| `lg` | 24px | 3px | Page-level and section-level loading |

#### Visual

A single `<span>` rendered as a circle. The ring has two visual parts:

- **Track** — the full circle border at `currentColor` 25% opacity
- **Arc** — one side of the border at `currentColor` 100% opacity, achieved by setting `border-top-color: transparent`

```css
display: inline-block;
border-radius: 50%;
border: {width}px solid currentColor;
border-top-color: transparent;
animation: spin 1s linear infinite;

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

When `color` is provided, set it on the element so `currentColor` resolves to it.

#### Accessibility

Renders with `role="status"` and `aria-label="Loading"`. When used inside `Button`, the button's own `aria-disabled` covers the loading state — the Spinner's label does not conflict.

#### Reduced motion

The spin animation is disabled at `prefers-reduced-motion: reduce`. The ring renders statically so the loading indicator remains visible without motion.

#### Usage

```tsx
// Inside Button — use the loading prop; do not render Spinner directly
<Button loading>Save</Button>

// Standalone page-level loader
<Spinner size="lg" />

// Standalone with explicit color
<Spinner size="md" color="var(--ui-text-subtle)" />
```

---

### Textarea

Multi-line text input. Auto-grows in height as the user types. Fully controlled — does not manage its own state.

#### Props

```ts
export interface TextareaProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  minRows?: number;
  maxRows?: number;
  maxLength?: number;
  className?: string;
}
```

Defaults: `minRows=3`, `maxRows=8`.

`onChange` receives the string value directly — not the DOM event.

`id` wires the `<label>` to the `<textarea>` via `htmlFor`. If omitted and `label` is provided, the component generates a stable internal id via `useId`.

#### Auto-grow behavior

- Height syncs to `scrollHeight` on each `input` event
- Clamped to `minRows` at the low end and `maxRows` at the high end — scrolls internally past the cap
- `resize: none` — drag handle removed
- Uses `height` (not `min-height`) so the field shrinks when content is deleted

#### State table

Identical to `Input`:

| State | Border | Background | Outline |
|---|---|---|---|
| Idle | 1px `var(--ui-border)` | `var(--ui-surface)` | none |
| Focused | 1px `var(--ui-border-strong)` | `var(--ui-surface)` | `2px solid var(--ui-accent)`, offset 2px |
| Error | 1px `var(--ui-error)` | `var(--ui-surface)` | none |
| Disabled | 1px `var(--ui-border)` at 40% | `var(--ui-surface-muted)` | none |

Padding: `12px` horizontal, `8px` vertical. Border radius: `--radius-md` (8px). Font: `body` (15px DmSans 400, `var(--ui-text)`). Placeholder: `var(--ui-text-subtle)`.

#### Error display

Same as `Input`: error string renders below in `caption` typography (`var(--ui-error-text)`). `aria-describedby` and `aria-invalid="true"` are set on the `<textarea>`.

#### Character counter

When `maxLength` is provided, a counter renders below the right edge of the field:

- Format: `{current} / {maxLength}`, `caption` typography, `var(--ui-text-subtle)`
- Switches to `var(--ui-error-text)` when ≤ 10% of `maxLength` remains
- No hard truncation — the consumer enforces the limit on submit

When both `error` and `maxLength` are active, error message is left-aligned and counter is right-aligned on the same row.

#### Label and required

`label` renders a `<label>` above in `label` typography (13px DmSans 600). `required` sets `aria-required="true"` on the `<textarea>`.

#### Usage

```tsx
<Textarea
  id="play-description"
  label="Description"
  value={description}
  onChange={setDescription}
  placeholder="Describe the play..."
  maxLength={500}
/>
```

---

### Checkbox

Single boolean input with optional visible label. Used for opt-in toggles and as the row indicator inside `MultiSelect`.

Built on `@radix-ui/react-checkbox`. Keyboard behavior (Space to toggle), `aria-checked`, and `indeterminate` state are handled by the library.

#### Props

```ts
export interface CheckboxProps {
  checked: boolean | 'indeterminate';
  onCheckedChange: (checked: boolean | 'indeterminate') => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
}
```

`checked` matches Radix's API: `true`, `false`, or `'indeterminate'`.

`id` wires the `<label>` via `htmlFor`. If omitted and `label` is provided, the component generates a stable id via `useId`.

#### Visual

Box: 16px × 16px, `border-radius: --radius-sm` (6px). No `size` prop. Touch target padded to 48px minimum on the wrapper.

| State | Box border | Box background | Indicator |
|---|---|---|---|
| Unchecked | 1px `var(--ui-border)` | `var(--ui-surface)` | none |
| Checked | none | `var(--ui-accent)` | white checkmark, centered, 10px |
| Indeterminate | none | `var(--ui-accent)` | white horizontal dash, centered, 8px wide |
| Disabled | 1px `var(--ui-border)` at 40% | `var(--ui-surface)` at 40% | — |

Focus ring: `outline: 2px solid var(--ui-accent); outline-offset: 2px` on `:focus-visible`.

When `label` is provided: `display: flex; align-items: center; gap: 8px`. Label text: `body` (15px DmSans 400, `var(--ui-text)`). The `<label>` wraps both elements so clicking the label text toggles the checkbox.

#### Usage

```tsx
<Checkbox
  id="send-notifications"
  checked={sendNotifications}
  onCheckedChange={setSendNotifications}
  label="Send notifications"
/>

// Indeterminate — "select all" pattern
<Checkbox
  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
  onCheckedChange={handleSelectAll}
  label="Select all players"
/>
```

---

### Select

Single-value select input. Trigger matches `Input` in appearance. Built on `@radix-ui/react-select`.

#### Shared option types

```ts
export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type SelectGroup = {
  group: string;
  options: SelectOption[];
};
```

These types are shared with `MultiSelect`.

#### Props

```ts
export interface SelectProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: SelectOption[] | SelectGroup[];
  label?: string;
  placeholder?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  id?: string;
  clearable?: boolean;
  className?: string;
}
```

Defaults: `size="md"`, `clearable=false`.

When `clearable={true}` and a value is selected, an × appears in the trigger. Clicking it calls `onChange(undefined)` and prevents the dropdown from opening.

#### Trigger

Dimensions match `Input`:

| Size | Height | Horizontal padding | Border radius |
|---|---|---|---|
| `sm` | 32px | 12px | `--radius-md` (8px) |
| `md` | 40px | 12px | `--radius-md` (8px) |
| `lg` | 48px | 16px | `--radius-md` (8px) |

State styling identical to `Input` (idle, focused, error, disabled). Selected value: `body` (15px DmSans 400, `var(--ui-text)`). Placeholder: `var(--ui-text-subtle)`.

Right side of trigger (left to right): clear × (only when `clearable` and value set) → chevron-down (`--icon-md`, `var(--ui-text-subtle)`). Chevron rotates 180° when open (`150ms ease-out`).

#### Dropdown panel

- Background: `var(--ui-surface-raised)`, border: `1px solid var(--ui-border)`, border radius: `--radius-md` (8px), shadow: `var(--shadow-lg)`, z-index: `var(--z-dropdown)`
- Max height: 320px — scrollable internally. Min width: matches trigger width.

**Option item:** height 36px, padding `8px 12px`, `body` typography. Hover: `var(--ui-surface-muted)`. Selected: `var(--ui-accent-muted)` background, `var(--ui-accent)` text. Disabled: 40% opacity.

**Group label:** padding `8px 12px 4px`, `caption` typography (`var(--ui-text-subtle)`). Not selectable.

#### Keyboard

`Enter` / `Space` / `ArrowDown` opens. `ArrowUp` / `ArrowDown` navigates. `Enter` selects. `Escape` closes. `Home` / `End` jumps to first/last. Printable characters trigger typeahead.

#### Accessibility

Trigger: `aria-haspopup="listbox"`, `aria-expanded`. Options: `role="option"`, `aria-selected` inside `role="listbox"`. Label and error follow the same pattern as `Input`.

#### Usage

```tsx
<Select
  id="sport"
  label="Sport"
  value={sport}
  onChange={setSport}
  placeholder="Select a sport"
  options={[
    { label: 'Basketball', value: 'basketball' },
    { label: 'Soccer', value: 'soccer' },
  ]}
/>

// Grouped options with clear
<Select
  label="Position"
  value={position}
  onChange={setPosition}
  placeholder="Select a position"
  clearable
  options={[
    {
      group: 'Offense',
      options: [{ label: 'Quarterback', value: 'qb' }, { label: 'Wide Receiver', value: 'wr' }],
    },
    {
      group: 'Defense',
      options: [{ label: 'Linebacker', value: 'lb' }],
    },
  ]}
/>
```

---

### MultiSelect

Multi-value select input. Returns `string[]`. Separate component from `Select`.

Built on `@radix-ui/react-popover` as the trigger/panel container with a custom scrollable listbox inside. Radix's `Select` primitive is single-select only — the Popover + listbox pattern gives full multi-select control.

#### Props

```ts
export interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[] | SelectGroup[];
  label?: string;
  placeholder?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  id?: string;
  clearable?: boolean;
  className?: string;
}
```

`SelectOption` and `SelectGroup` are shared with `Select`. Defaults: `size="md"`, `clearable=false`.

When `clearable={true}` and at least one item is selected, an × appears in the trigger. Clicking it calls `onChange([])`.

#### Trigger display

- Nothing selected: placeholder in `var(--ui-text-subtle)`
- Items selected — hybrid: up to 2 labels shown as plain text comma-separated (`"Basketball, Soccer"`); if more than 2: `"Basketball, Soccer +1 more"` with the overflow in `var(--ui-text-subtle)`. Truncates with ellipsis if labels exceed trigger width.

Trigger dimensions and state styling identical to `Select`.

#### Dropdown panel

Same visual style as `Select` dropdown (background, border, radius, shadow, z-index, 320px max height).

Each option row: `<Checkbox checked={isSelected} onCheckedChange={onToggle} />` (no label prop) + option label in `body` typography. Row height 36px, padding `8px 12px`. Selected row: `var(--ui-accent-muted)` background.

Dropdown stays open during multi-selection. Closes on `Escape`, outside click, or second trigger click.

#### Keyboard

`Enter` / `Space` / `ArrowDown` opens. `ArrowUp` / `ArrowDown` navigates. `Space` toggles focused option. `Escape` closes.

#### Accessibility

Trigger: `aria-haspopup="listbox"`, `aria-expanded`, `aria-multiselectable="true"`. Options: `role="option"`, `aria-selected` inside `role="listbox"`. Label and error follow the same pattern as `Select`.

#### Usage

```tsx
<MultiSelect
  id="sports"
  label="Sports"
  value={sports}
  onChange={setSports}
  placeholder="Select sports"
  clearable
  options={[
    { label: 'Basketball', value: 'basketball' },
    { label: 'Soccer', value: 'soccer' },
    { label: 'Football', value: 'football' },
  ]}
/>
```

---

### Tooltip

Short label that appears on hover and keyboard focus. Used to label icon-only buttons and controls where visible text is absent or truncated.

Built on `@radix-ui/react-tooltip`. Wraps an interactive child element — tooltip triggers when the child is hovered or focused.

**Tooltips are for short plain-text labels only.** For rich content (links, icons, multi-line text), use a Popover (specified in 6.3).

#### Props

```ts
export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}
```

Default: `side="top"`. `children` must be a single focusable element.

#### Behavior

- **Show delay:** 400ms — prevents flicker when the mouse passes over controls
- **Hide delay:** 0ms — dismisses immediately on mouse-out or blur
- **Escape:** Dismisses the tooltip without closing any parent modal or dropdown
- **Positioning:** `side` is the preferred side. Radix auto-flips if the preferred side overflows the viewport.
- **Caret:** Triangular caret in the same background color as the panel, pointing toward the trigger

#### Visual style

- Background: `var(--ui-text)` (inverted — near-black in light mode, near-white in dark mode)
- Text color: `var(--ui-surface)`
- Typography: `caption` (11px DmSans 400)
- Border radius: `--radius-sm` (6px), shadow: `var(--shadow-lg)`, no border
- Padding: `6px 10px`, max width: 240px

#### Animation

Enter: fade in + scale 95% → 100%, `150ms ease-out`. Exit: fade out, `100ms ease-in`. Both disabled at `prefers-reduced-motion: reduce`.

#### Accessibility

Radix wires `role="tooltip"` on the panel and `aria-describedby` on the trigger automatically.

**Do not use `Tooltip` as a substitute for `aria-label` on icon-only buttons.** The button must have `aria-label` for screen readers. `Tooltip` provides the visual label for mouse users; `aria-label` provides the accessible name for all users.

#### Usage

```tsx
// Icon-only button — aria-label on the button, Tooltip for visual users
<Tooltip content="Delete play">
  <Button variant="ghost" aria-label="Delete play" onClick={onDelete}>
    <TrashIcon aria-hidden="true" />
  </Button>
</Tooltip>
```

---

## Part 3 — Display and Domain Components

Display components are the domain-specific layer above primitives. Every component in this section is used across two or more pages. Prop APIs here are final — changes require updates in every consumer.

All display components follow the prop conventions in Part 1. Typography, spacing, radius, shadow, and focus ring rules follow `general-formatting-standards.md` and `color-semantics.md`. Interactive display components (cards with action menus) follow `accessibility-standards.md` for keyboard and ARIA behavior.

---

### PlayCard

The primary card for rendering an individual play. Used on the team plays list, trash view, shared folder pages, and the platform browse surface.

#### Props

```ts
export type PlayCardContext = 'team' | 'platform' | 'shared';
export type PlayCardRole = 'owner' | 'coach' | 'assistant_coach' | 'player';
export type PlayCardAction =
  | 'open' | 'favorite' | 'share' | 'duplicate'
  | 'rename' | 'move' | 'hide' | 'archive'
  | 'post-to-community' | 'delete';

export interface AssistantPermissions {
  canCreateEditDeletePlays: boolean;
  canSendInvites: boolean;
}

export interface PlayCardProps {
  id: string;
  title: string;
  sport: string;
  thumbnailUrl: string | null;
  tags: string[];
  updatedAt: string;
  isFavorited: boolean;
  isHiddenFromPlayers: boolean;
  archivedAt: string | null;
  createdByName: string | null;
  isCreatedByViewer: boolean;
  context: PlayCardContext;
  role?: PlayCardRole;
  assistantPermissions?: AssistantPermissions;
  bulkMode?: boolean;
  isSelected?: boolean;
  onClick: () => void;
  onAction?: (action: PlayCardAction, id: string) => void;
  className?: string;
}
```

`isFavorited` is always pre-resolved server-side — the list endpoint joins `play_favorites` per user before responding. Never compute it client-side.

`isCreatedByViewer` determines whether an `assistant_coach` gets the full mutation set. Pass `createdByUserId === viewer.id` at the call site; do not pass IDs into the card.

`assistantPermissions` comes from `team_settings`. When omitted, the defaults apply: assistants get the full coach set on their own plays, and Open/Favorite/Share/Duplicate on others' plays.

`archivedAt` is only non-null in the trash view. Archived cards never appear mixed with active plays.

#### Action menu — by role and context

The action menu is triggered by an always-visible kebab (⋯) button (`ghost` variant, `--icon-md`, top-right corner of the card). Always visible — never hover-reveal — because hover is unavailable on touch devices.

| Action | coach / owner | asst (own play) | asst (others' play) | player | platform / shared |
|---|---|---|---|---|---|
| Open | ✓ | ✓ | ✓ | ✓ | — |
| Favorite | ✓ | ✓ | ✓ | ✓ | — |
| Share (copy link) | ✓ | ✓ | ✓ | — | — |
| Duplicate | ✓ | ✓ | ✓ | — | — |
| Hide / Show from players | ✓ | ✓ | — | — | — |
| Rename | ✓ | ✓ | — | — | — |
| Move to folder | ✓ | ✓ | — | — | — |
| Archive | ✓ | ✓ | — | — | — |
| Post to Community | ✓ | ✓ | — | — | — |
| Delete (trash view only) | ✓ | ✓ | — | — | — |
| Copy to team | — | — | — | — | ✓ |

"Post to Community" has an additional gate: `isCreatedByViewer` must be true and the user must have a `canRolePostToCommunity` feature flag. Neither condition alone is sufficient.

The `asst (others' play)` column is the default. The full set of overridable columns is defined in `assistantPermissions` on `team_settings`.

#### Visual states

| State | Treatment |
|---|---|
| Default | Resting card — `--radius` (10px), 1px `var(--ui-border)`, no shadow dark / `--shadow-sm` light |
| Hover | Subtle border highlight — 1px `var(--ui-border-strong)` |
| Selected (bulk) | Accent border — 1px `var(--ui-accent)` + filled checkbox top-left |
| Favorited | Filled star icon overlaid on the thumbnail corner |
| Hidden from players | Eye-off badge on the card, visible to coaches only — players never see hidden plays |
| Archived | Reduced opacity (60%) + "Archived" label badge. Trash view only. |

#### Bulk selection

`bulkMode` and `isSelected` are driven by the parent page — PlayCard does not own selection state. When `bulkMode={true}`, a checkbox renders in the top-left corner (`aria-label="Select [title]"`). Clicking the card body in bulk mode calls `onAction('favorite', id)` is replaced — `onClick` toggles selection instead of navigating.

#### Null thumbnail

When `thumbnailUrl` is null, the thumbnail slot renders the sport's field pitch color as a solid background — the same blank canvas treatment as the sport picker (`SportPickerPage`). No skeleton, no icon, no generic gray. The color is derived from the sport name via the sports config color map.

#### Accessibility

- The card root is a `<button>` or `<a>` (if `onClick` navigates). Never `<div onClick>`.
- The kebab trigger: `aria-label="More actions for [title]"`, `aria-haspopup="menu"`, `aria-expanded` reflects open state.
- The selection checkbox: `aria-label="Select [title]"`.
- The action menu: `role="menu"`, each item `role="menuitem"`, Escape closes and returns focus to the trigger.

---

### FolderCard

Represents a team folder — a named container that organises plays. Used on the plays page and playbooks page.

#### Props

```ts
export interface FolderCardProps {
  id: string;
  name: string;
  playCount: number;
  subfolderCount: number;
  context: 'team' | 'shared';
  role?: PlayCardRole;
  onClick: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  className?: string;
}
```

`playCount` and `subfolderCount` must be joined server-side on `GET /:teamId/folders`. See `engineering/audits/api-review.md` — V2 Considerations, Core Product.

All folder cards render identically regardless of nesting depth. There is no indented or small variant for subfolders.

#### Visual

Folder icon (`--icon-lg`), name in `body-strong`, play count + subfolder count in `caption` (`var(--ui-text-subtle)`). Card radius `--radius` (10px).

Action menu trigger: always-visible kebab, top-right corner, same treatment as PlayCard.

#### Actions by context and role

| Action | coach / owner (team) | player (team) | shared |
|---|---|---|---|
| Open (navigate) | ✓ | ✓ | ✓ |
| Rename | ✓ | — | — |
| Move | ✓ | — | — |
| Delete | ✓ | — | — |
| Share | ✓ | — | — |

In `shared` context there is no action menu — click navigates only.

#### Accessibility

Action menu: same ARIA pattern as PlayCard (`role="menu"`, `role="menuitem"`, Escape closes). Delete action opens a confirmation Modal before calling `onDelete`.

---

### SectionCard

Represents a platform playbook section — a named collection of curated or community plays. Used on the authenticated Playbooks page and the public playbooks page. Not editable by users.

#### Props

```ts
export interface SectionCardProps {
  id: string;
  name: string;
  description?: string;
  playCount: number;
  onClick: () => void;
  className?: string;
}
```

No role prop — SectionCard has no action menu. It is always click-to-navigate only.

#### Visual

Book icon (`--icon-lg`, `var(--ui-accent)` at 40% opacity) in a tinted header band (`var(--ui-accent)` at 5% opacity), name in `body-strong`, optional description in `body` (2-line clamp), play count in `caption`. Card radius `--radius` (10px).

Hover: accent border highlight (1px `var(--ui-accent)` at 40%).

#### Accessibility

The card root is a `<button>` with `aria-label="[name] — [playCount] plays"`.

---

### NotificationItem

A single row in the notifications list. Shows title, priority, read state, and responded state. Detail content renders in the adjacent panel via `onClick`, not inside the row.

#### Props

```ts
export interface NotificationItemProps {
  id: string;
  title: string;
  subject?: string;
  priority: 'critical' | 'high' | 'normal';
  sentAt: string;
  readAt: string | null;
  respondedAt: string | null;
  hasQuestions: boolean;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}
```

`blocks` is not a prop on `NotificationItem` — blocks render inside `BlockRenderer` in the detail panel, not in the list row.

#### Visual states

| State | Treatment |
|---|---|
| Unread (`readAt === null`) | Left 3px `var(--ui-accent)` border + `var(--ui-surface-raised)` background |
| Read | Neutral `var(--ui-surface)` background, no left border |
| Selected | Accent border + `var(--ui-accent-muted)` background |
| Responded (`respondedAt` set, `hasQuestions`) | Small "Responded" badge — checkmark icon + `caption` label |

#### Priority indicators

`critical` → red alert icon (`var(--ui-error-text)`) left of title.
`high` → amber alert icon (`var(--ui-warning-text)`) left of title.
`normal` → no icon.

#### Typography

Title: `body-strong`. Subject (when present): `body`, `var(--ui-text-subtle)`. Timestamp: `caption`, `var(--ui-text-subtle)`.

#### Accessibility

The row is a `<button>` with `aria-pressed={isSelected}`. Unread state is communicated via `aria-label` suffix "— unread" so it is not color-only. Responded badge has `aria-label="Responded"`.

---

### BlockRenderer

Renders a notification's block array. Used in two contexts: the notification detail panel (interactive, shows response form) and as a preview in the list row (read-only, first text block only, truncated).

#### Props

```ts
export type BlockKind = 'text' | 'question';

export type QuestionType =
  | 'paragraph' | 'short' | 'file' | 'date'
  | 'dropdown' | 'multiple' | 'yes_no'
  | 'checkboxes' | 'scale' | 'rating';

export interface NotificationBlock {
  id: string;
  kind: BlockKind;
  // text blocks
  html?: string;
  // question blocks
  type?: QuestionType;
  label?: string;
  required?: boolean;
  options?: string[];
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
}

export interface BlockRendererProps {
  blocks: NotificationBlock[];
  interactive?: boolean;
  answers?: Record<string, unknown>;
  onAnswerChange?: (blockId: string, value: unknown) => void;
  disabled?: boolean;
  className?: string;
}
```

Default: `interactive={false}`.

When `interactive={false}`: renders the first `text` block only, truncated to 2 lines. Question blocks are hidden in preview mode.

When `interactive={true}`: renders all blocks in order — text blocks as HTML, question blocks as interactive fields. The response form (submit button, error, success state) is the consumer's responsibility — `BlockRenderer` renders fields only, not the submit action.

`disabled={true}` renders all question fields in read-only state (post-response view).

---

### TeamMemberCard

A single member row on the team roster page.

#### Props

```ts
export interface TeamMemberCardProps {
  id: string;
  name: string;
  email: string;
  role: PlayCardRole;
  avatarUrl?: string | null;
  isCurrentUser: boolean;
  viewerRole: PlayCardRole;
  onRemove?: () => void;
  loading?: boolean;
  className?: string;
}
```

#### Visual

Initials avatar (or `avatarUrl` if provided) at 36×36px, `--radius-pill`. Name in `body-strong`. Email in `caption`, `var(--ui-text-subtle)`. Role badge: `label` typography, `--radius-sm`, role-specific background tint. Owner gets an additional "Owner" badge in `var(--ui-success-text)`.

Remove button (trash icon, `ghost` variant, `destructive` hover) renders only when `viewerRole === 'owner' && !isCurrentUser`. When `loading={true}`, the remove button shows a spinner and is `aria-disabled`.

#### Accessibility

Remove button: `aria-label="Remove [name]"`. Confirm removal via a `Modal` (size="sm") before calling `onRemove` — the card does not call `onRemove` directly.

---

### EmptyState

Shared empty state used across plays list, trash, search, notifications, and any other surface with no content.

#### Props

```ts
export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  heading: string;
  body?: string;
  action?: EmptyStateAction;
  className?: string;
}
```

`action` is optional. "No search results" does not get a CTA. "No plays yet" gets "Create your first play."

The `icon` slot accepts any React node — typically a Feather icon at `--icon-lg` (20px) in `var(--ui-text-subtle)`. EmptyState does not own an illustration set; each consumer passes the appropriate icon.

#### Visual

Centered layout. Icon at top, `heading` in `subheading` typography, `body` in `body` typography (`var(--ui-text-subtle)`), `action` as a `secondary` Button. Vertical gap: 12px between icon and heading, 8px between heading and body, 16px between body and action.

---

### TagPill

A small labeled chip used for play tags. Appears in read-only display on PlayCard and as interactive filter chips on the plays list filter bar.

#### Props

```ts
export interface TagPillProps {
  label: string;
  variant?: 'display' | 'filter';
  selected?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}
```

Default: `variant="display"`.

#### Variant behavior

**`display`** — read-only. No `onClick`, no `onRemove`. Renders as a non-interactive `<span>`. Used on PlayCard.

**`filter`** — clickable. `onClick` toggles `selected`. When `selected={true}`: `var(--ui-accent)` border + `var(--ui-accent-muted)` background + `var(--ui-accent)` text. When `onRemove` is provided, a × button renders to the right of the label.

#### Visual

`--radius-sm` (6px), `label` typography (13px DmSans 600). Background: `var(--ui-surface-muted)`. Text: `var(--ui-text-subtle)` (display) or `var(--ui-accent)` (filter, selected).

#### Accessibility

`display` variant: non-interactive, `aria-hidden` if purely decorative alongside visible text. `filter` variant: `<button>` root, `aria-pressed={selected}`. Remove button: `aria-label="Remove [label] filter"`.

---

### SportBadge

A small read-only chip displaying a sport name. Used on PlayCard, SectionCard, and single-play detail pages (`PlatformPlayView`, `SharedPlay`).

#### Props

```ts
export interface SportBadgeProps {
  sport: string;
  size?: 'sm' | 'md';
  className?: string;
}
```

Default: `size="sm"`.

#### Visual

`size="sm"`: `--radius-sm` (6px), `caption` typography (11px DmSans 400), 4px vertical padding, 8px horizontal padding. Used inside cards.

`size="md"`: `--radius-sm` (6px), `label` typography (13px DmSans 600), 6px vertical padding, 12px horizontal padding. Used in page-level context (play detail pages).

Color is derived from the sport name via the sports config color map (the same `color` values used in `SportPickerPage`). Background: sport color at 12% opacity. Text: sport color.

No interaction — always a `<span>`, never a `<button>`.

#### Accessibility

`aria-label="Sport: [sport]"` when used standalone. When paired with a visible label, `aria-hidden="true"`.

---

### SearchResultItem

A single row in the global search results panel. Supports play, folder, and member result types with a unified layout.

#### Props

```ts
export type SearchResultType = 'play' | 'folder' | 'member';

export interface SearchResultItemProps {
  type: SearchResultType;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string | null;
  onClick: () => void;
  className?: string;
}
```

`subtitle` is type-specific: sport name for `play`, play count ("12 plays") for `folder`, role label for `member`.

`thumbnailUrl` applies to `play` only. When null, falls back to the sport-colored background (same as PlayCard null thumbnail treatment).

#### Visual

Fixed-height row. Left slot (40×40px, `--radius-md`): play → thumbnail or sport-color fallback; folder → folder icon; member → initials avatar. Right: title in `body-strong`, subtitle in `caption` (`var(--ui-text-subtle)`). Full-width hover: `var(--ui-surface-muted)` background.

Type group headers ("Plays", "Folders", "People") are the consumer's responsibility — `SearchResultItem` renders a single row only.

#### Accessibility

The row root is a `<button>`. `aria-label="[title] — [type]"`.

---

## Part 4 — Layout and Shell Components

These components define the structural chrome that wraps every authenticated page. `PageShell` is the single consumer-facing component — `Sidebar`, `BottomNav`, and `Header` are its internal parts, each exported individually for the design system catalogue.

---

### NavItem (type)

The typed shape for every navigation entry passed to `PageShell`.

```ts
export interface SubNavItem {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: SubNavItem[];
}
```

- `href` is omitted when the item is a parent group that only contains `children` and has no destination of its own.
- `badge` renders as a numeric count chip. Values above 99 display as "99+". Used for notification counts and similar unread indicators.
- `children` supports **one level of nesting only** — no recursive nesting. Sub-items have no icon of their own.
- A `NavItem` with `children` but no `href` is a parent group. It is not valid in `BottomNav` (which requires a destination) and will be excluded there.

---

### Sidebar

Left-side navigation panel. Renders at `md+`. Internal to `PageShell` — page consumers never compose it directly. Exported for the design system catalogue.

#### Props

```ts
export interface SidebarProps {
  navItems: NavItem[];
  team: { name: string; logoUrl?: string };
  onSwitchTeam?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}
```

- `collapsed` toggles between expanded (240px) and icon-only (64px) mode. State is owned by `PageShell` and persisted to `localStorage` under `sidebar_collapsed`.
- `team` renders at the top of the sidebar above nav items. `logoUrl` displays a team avatar; when omitted, team initials render as a fallback.
- `onSwitchTeam` renders a chevron affordance next to the team name when provided. Clicking it calls the handler — the switcher UI is the consumer's responsibility.

#### Layout

- Width: 240px expanded · 64px collapsed.
- Height: 100dvh, fixed to the left edge.
- Background: `--ui-surface`.
- Internal stack (top to bottom): team slot → nav items (scrollable) → collapse toggle (bottom).

#### Nav item states

Active state is derived internally by comparing `item.href` to the current route via `useLocation()`. Prefix matching is used — `/app/plays/123` matches a nav item with `href="/app/plays"`.

| State | Background | Icon + label color |
|---|---|---|
| Default | none | `--ui-text-muted` |
| Hover | `--ui-surface-muted` | `--ui-text` |
| Active | `--ui-accent-muted` | `--ui-accent-text` |

The active background (`--ui-accent-muted`) is the sole exception to the "no filled backgrounds on active state" rule in `general-formatting-standards.md` §08. `color-semantics.md` grants this exception for nav items only.

#### Nav item sizing (desktop)

| Mode | Item height | Padding |
|---|---|---|
| Expanded | 40px min | 12px horizontal |
| Collapsed (icon-only) | 40px min | icon centered |

#### Sub-items (nested groups)

Parent items with `children` render a disclosure chevron on the right. Clicking expands the group to reveal sub-items indented beneath the parent. Only one group can be expanded at a time (accordion). Sub-items are label-only — no icon — indented 16px from the parent icon column.

Sub-item active state follows the same rules as top-level items.

#### Collapsed mode (64px)

- Labels are hidden. Icons only, centered.
- Badge renders as an 8px dot (not numeric) when `badge > 0`.
- Parent groups (with `children`) show a flyout panel on hover containing the sub-items — sub-items are inaccessible via keyboard in collapsed mode.
- Team name is replaced by the team logo avatar (or initials).
- The collapse toggle at the bottom flips the chevron direction.

#### Badge

When `badge > 0`:
- Expanded: numeric chip to the right of the label. Style: `--ui-accent` background, `#FFFFFF` text, `caption` typography (11px DmSans 600), min-width 18px, height 18px, `--radius-full`. Values > 99 show "99+".
- Collapsed: 8px filled dot (`--ui-accent`) positioned top-right on the icon. No number.

#### Accessibility

- `<nav role="navigation" aria-label="Main navigation">` wrapper.
- Active item: `aria-current="page"`.
- Collapsed/expanded toggle: `aria-label="Collapse sidebar"` / `"Expand sidebar"`, `aria-expanded` on the button.
- Parent group trigger: `aria-expanded` reflects open/closed state.
- Keyboard: `Tab` moves through items. `Enter` / `Space` activates or toggles groups. `Escape` collapses an open group.

---

### BottomNav

Mobile primary navigation. Fixed at the bottom of the viewport. Renders below `md` only. Internal to `PageShell` — not exported for consumer use.

```ts
interface BottomNavProps {
  navItems: NavItem[];
}
```

Only leaf items (items with `href`) are used. Parent-only items (no `href`) are excluded. **Maximum 5 items** — if the filtered leaf list exceeds 5, the first 5 are used and a console warning is issued in development.

#### Layout

- Height: 56px + `env(safe-area-inset-bottom)`.
- Background: `--ui-surface`.
- Border: 1px top, `--ui-border`.
- `position: fixed; bottom: 0; left: 0; right: 0; z-index: [shell layer]`.
- Items distributed evenly with `justify-content: space-around`. Each item: icon (24px) + label (`label` typography, 13px DmSans 600), stacked vertically and centered.

#### Item states

| State | Icon + label color |
|---|---|
| Default | `--ui-text-muted` |
| Active | `--ui-accent` |

No background tint on active state in `BottomNav` — color change only. This intentionally diverges from the desktop sidebar active state. `mobile-formatting-standards.md` §03 is authoritative: "No pills, no filled backgrounds."

Active state is derived the same way as `Sidebar` — prefix match of `item.href` against the current route.

#### Tap targets

Each item's tap zone is minimum 48×48px per `mobile-formatting-standards.md` §01. The visual height is 56px (the full bar height per item), which meets this requirement.

#### Badge

Renders as an 8px dot (`--ui-accent`) positioned top-right on the icon. Numeric count is not shown in `BottomNav`. Full count is set on `aria-label` (e.g., `aria-label="Notifications, 4 unread"`).

#### Accessibility

- `<nav role="navigation" aria-label="Main navigation">` wrapper.
- Active item: `aria-current="page"`.

---

### Header

Top bar present on every authenticated page. Left slot holds the page title or breadcrumb trail. Right slot holds page-level actions.

#### Props

```ts
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface HeaderProps {
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}
```

- `title` and `breadcrumbs` are mutually exclusive. If both are provided, `breadcrumbs` takes precedence and `title` is ignored.
- The last item in `breadcrumbs` is the current page — it renders without a link and in `--ui-text`. All preceding items render as `<a>` links in `--ui-text-muted` with underline on hover.
- `actions` is a `ReactNode` slot. Right-aligned. No constraint on content — the consumer decides what page-level controls appear here.
- When neither `title` nor `breadcrumbs` is provided, the left slot is empty and the header shows only `actions` (or is an empty bar if neither is provided).

#### Layout

- Height: max 64px. Content is vertically centered.
- Background: `--ui-surface`.
- Border: 1px bottom, `--ui-border`.
- Internal layout: left slot + right slot, `justify-content: space-between`.
- Horizontal padding scales with breakpoint: 24px at `md` · 32px at `lg` · 40px at `xl` — matches the content column margin from `desktop-formatting-standards.md` §03.

#### Typography

| Element | Scale | Color |
|---|---|---|
| `title` | `subheading` (17px Manrope 600) | `--ui-text` |
| Breadcrumb — ancestor | `body` (15px DmSans 400) | `--ui-text-muted` |
| Breadcrumb — current | `body` (15px DmSans 400) | `--ui-text` |
| Breadcrumb separator | `body` | `--ui-text-subtle` |

Breadcrumb separator is `/`, with 6px horizontal margin on each side.

`Header` renders breadcrumbs internally using `<Breadcrumbs>` from `src/ui/`. The `BreadcrumbItem` type defined here is the shared contract between `Header` and `PageShell`.

---

### PageShell

The root layout wrapper for every authenticated page — app and admin alike. Owns the sidebar, header, and responsive nav switch. Page consumers only ever compose this component; `Sidebar`, `BottomNav`, and `Header` are implementation details.

#### Props

```ts
export interface PageShellProps {
  navItems: NavItem[];
  team: { name: string; logoUrl?: string };
  onSwitchTeam?: () => void;
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  sidebar?: boolean;
  header?: boolean;
  children: React.ReactNode;
  className?: string;
}
```

Defaults: `sidebar={true}`, `header={true}`.

| Prop | Passes to |
|---|---|
| `navItems` | `Sidebar` (desktop) + `BottomNav` (mobile) |
| `team`, `onSwitchTeam` | `Sidebar` |
| `title`, `breadcrumbs`, `actions` | `Header` |
| `sidebar={false}` | Suppresses `Sidebar` on desktop and `BottomNav` on mobile — content fills full width |
| `header={false}` | Suppresses `Header` entirely |

#### Layout model

**Desktop (`md+`, sidebar visible):**

```
┌──────────────────────────────────────────────────────┐
│ Sidebar (240px fixed left) │ Header (64px, sticky)   │
│                            ├─────────────────────────│
│ [team slot]                │ [content area]           │
│ [nav items]                │ overflow-y: auto         │
│                            │                          │
└────────────────────────────┴──────────────────────────┘
```

**Mobile (below `md`):**

```
┌──────────────────┐
│ Header (sticky)  │
├──────────────────┤
│ Content area     │
│ overflow-y: auto │
├──────────────────┤
│ BottomNav (fixed)│
└──────────────────┘
```

#### Responsive behavior

The mobile/desktop switch is CSS-only — no JavaScript breakpoint detection.

- Below `md`: `Sidebar` has `display: none`. `BottomNav` renders `position: fixed` at the bottom.
- At `md+`: `BottomNav` has `display: none`. `Sidebar` renders as a fixed left column.

#### Content area

- Fills the space to the right of `Sidebar` (desktop) or full width (mobile).
- `overflow-y: auto` — the content area scrolls; the sidebar and header stay fixed.
- Mobile: `padding-bottom: calc(56px + env(safe-area-inset-bottom))` to clear `BottomNav`.
- Desktop: no bottom padding from the shell — pages add their own.
- Min height: `100dvh` (not `100vh`).

#### Sidebar collapsed state

`PageShell` owns the collapsed boolean via `useState`. Initial value is read from `localStorage` key `sidebar_collapsed` (default: `false`). Changes are written back on toggle. This means the sidebar remembers its state across navigations and sessions.

#### Usage

```tsx
// Standard authenticated page
export function PlaysPage() {
  return (
    <PageShell
      navItems={APP_NAV_ITEMS}
      team={{ name: team.name, logoUrl: team.logoUrl }}
      onSwitchTeam={handleSwitchTeam}
      title="Plays"
      actions={<Button onClick={handleNew}>New Play</Button>}
    >
      <PlaysList />
    </PageShell>
  );
}

// Admin page — same shell, different nav
export function AdminDashboard() {
  return (
    <PageShell
      navItems={ADMIN_NAV_ITEMS}
      team={{ name: 'Coachable Admin' }}
      title="Dashboard"
    >
      <AnalyticsDashboard />
    </PageShell>
  );
}

// Header only, no sidebar (e.g. a wide settings page)
export function SettingsPage() {
  return (
    <PageShell
      navItems={APP_NAV_ITEMS}
      team={{ name: team.name }}
      title="Settings"
      sidebar={false}
    >
      <SettingsForm />
    </PageShell>
  );
}

// Breadcrumb instead of title
export function FolderPage() {
  return (
    <PageShell
      navItems={APP_NAV_ITEMS}
      team={{ name: team.name }}
      breadcrumbs={[
        { label: 'Playbooks', href: '/app/playbooks' },
        { label: 'Run Plays' },
      ]}
      actions={<Button onClick={handleAdd}>Add Play</Button>}
    >
      <FolderContents />
    </PageShell>
  );
}
```

#### Play editor and other full-screen routes

The play editor (`/app/plays/:id/edit`) does **not** use `PageShell`. It mounts as a sibling to the `AppShell` layout in the route tree — a full-DOM swap that intentionally has no persistent chrome. This is not a `sidebar={false}` case; it is a separate layout class entirely. See `engineering/audits/routing-and-flash-diagnosis.md` Decision 5.

---

## Cross-Reference Notes

**This is the authoritative prop API spec for `src/ui/`. All component implementations must match it.**

**References:**
- `design/color-semantics.md` — all `--ui-*` token values
- `design/general-formatting-standards.md` — 4px grid, typography scale, focus ring, motion budget, touch targets
- `design/accessibility-standards.md` — focus trap behavior for Modal, ARIA patterns for all components
- `engineering/frontend-code-standards.md` — file naming, export conventions, catalogue requirement

**Sessions complete:**
- 6.2 ✅ — Implementation details + Spinner, Textarea, Checkbox, Select, MultiSelect, Tooltip
- 6.3 ✅ — Display component specs: PlayCard, FolderCard, SectionCard, NotificationItem, BlockRenderer, TeamMemberCard, EmptyState, TagPill, SportBadge, SearchResultItem

**Inconsistencies to watch:**
1. `general-formatting-standards.md` §09 still references `#FF7A18` for the focus ring. All components in `src/ui/` use `var(--ui-accent)` per `color-semantics.md`. Do not hardcode the hex.
2. `general-formatting-standards.md` §08 says "no filled backgrounds on active state." `color-semantics.md` (newer) allows `--ui-accent-muted` on active nav items only. `Sidebar` uses this exception; `BottomNav` intentionally does not (color-only active state per `mobile-formatting-standards.md` §03).
3. `desktop-formatting-standards.md` §05 nav table shows Active background = "None." This is superseded by `color-semantics.md` which grants `--ui-accent-muted` on active sidebar items. The desktop doc's nav table needs updating.
4. `mobile-formatting-standards.md` §03 cross-reference note raises a conflict about whether `--ui-accent-muted` applies to mobile bottom nav. It does not — mobile bottom nav is color-only. This spec is authoritative.
