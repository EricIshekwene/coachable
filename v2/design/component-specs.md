# Component Specs — src/ui/

This document specifies the prop conventions and component APIs for `src/ui/`. It is the single source of truth for how components are built and consumed. Four sessions complete this document:

- **6.1 (this session)** — Prop conventions + Button, Input, Modal, Toast
- **6.2** — Implementation details (portals, focus traps, animation)
- **6.3** — Display and domain components (PlayCard, NotificationItem, StatCard)
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

For multi-line text, a `Textarea` component will be specified in 6.2. For select dropdowns, a `Select` will be specified in 6.2.

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

For non-blocking contextual content, use a Popover or Drawer (specified in 6.2).

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

#### Behavior

- **Portal:** Renders via `createPortal` into `document.body` to escape z-index stacking contexts.
- **Focus trap:** When opened, focus moves to the first focusable element inside the modal. Tab cycles within the modal. Focus returns to the trigger element on close.
- **Keyboard:** `Escape` closes the modal and calls `onClose`.
- **Backdrop click:** Clicking the backdrop calls `onClose`.
- **Scroll lock:** `overflow: hidden` is applied to `<body>` while the modal is open.

Full focus trap implementation follows `accessibility-standards.md`.

#### Animation

Enter: fade in + scale from 95% → 100%, `200ms ease-out`, `opacity` + `transform` only.  
Exit: fade out + scale from 100% → 95%, `150ms ease-in`.  
Both disabled at `prefers-reduced-motion: reduce`.

Backdrop fades in/out at `200ms` / `150ms` matching the panel.

#### Title

When `title` is provided, it renders as an `<h2>` inside the modal in `subheading` typography (17px Manrope 600) using `var(--ui-text)`. The modal root has `role="dialog"` and `aria-labelledby` pointing to the title element.

When `title` is omitted, `aria-label` must be provided by the consumer.

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
| `<ToastProvider>` | Wraps the app. Owns the queue and timer state. Renders `<ToastContainer>`. |
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
- `duration: 0` means persistent — the user must dismiss manually.

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

---

## Cross-Reference Notes

**This is the authoritative prop API spec for `src/ui/`. All component implementations must match it.**

**References:**
- `design/color-semantics.md` — all `--ui-*` token values
- `design/general-formatting-standards.md` — 4px grid, typography scale, focus ring, motion budget, touch targets
- `design/accessibility-standards.md` — focus trap behavior for Modal, ARIA patterns for all components
- `engineering/frontend-code-standards.md` — file naming, export conventions, catalogue requirement

**Sessions that extend this document:**
- 6.2 adds implementation details (portals, animation specifics, additional primitives: Checkbox, Select, Spinner, Textarea)
- 6.3 adds display component specs (PlayCard, NotificationItem, StatCard, and others)
- 6.4 adds layout/shell specs (Sidebar, Header, PageShell)

**Inconsistencies to watch:**
1. `general-formatting-standards.md` §09 still references `#FF7A18` for the focus ring. All components in `src/ui/` use `var(--ui-accent)` per `color-semantics.md`. Do not hardcode the hex.
2. `general-formatting-standards.md` §08 says "no filled backgrounds on active state." `color-semantics.md` (newer) allows `--ui-accent-muted` on active nav items only. This affects nav components in 6.4, not the primitives here.
