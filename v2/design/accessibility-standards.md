# Coachable Accessibility Standards

**Status:** Authoritative implementation standard for accessibility.  
**Scope:** Applies to every surface — mobile and desktop. Covers behavior and code conventions, not visual formatting.  
**Relationship to other docs:** The general formatting doc covers accessibility as it intersects with visual decisions (contrast ratios, focus ring appearance, motion, semantic HTML). This doc covers everything else — ARIA, keyboard behavior, focus management, screen reader communication, and testing.  
**Target:** WCAG 2.2 Level AA conformance across all user-facing pages.

---

## 01 — Semantic HTML First, ARIA Second

ARIA does not add functionality — it adds meaning. Before reaching for an ARIA attribute, check whether the right HTML element already provides that meaning natively.

**The rule:** If a native HTML element exists for the job, use it. Only use ARIA to fill gaps that semantic HTML cannot cover.

| What you need | Use this | Not this |
|---|---|---|
| Clickable action | `<button>` | `<div onClick>` |
| Navigation link | `<a href>` | `<span onClick>` |
| List of items | `<ul>` / `<ol>` | `<div>` column |
| Form field | `<input>`, `<select>`, `<textarea>` | `<div contenteditable>` |
| Checkbox | `<input type="checkbox">` | custom div + aria-checked |
| Toggle | `<input type="checkbox">` styled | div + role="switch" |
| Modal heading | `<h2>` inside the dialog | `<div aria-level="2">` |

When you use `<button>`, you get keyboard focus, Enter/Space activation, role announcement, and disabled state handling for free. When you use `<div onClick>`, you manually replicate all of that — and usually miss some of it.

**When ARIA is appropriate:**
- Custom widgets with no HTML equivalent (tabs, combobox, tree, disclosure panels)
- Dynamic state changes the DOM cannot express natively (`aria-expanded`, `aria-selected`, `aria-busy`)
- Supplemental descriptions beyond a label (`aria-describedby`)
- Hiding decorative elements from assistive technology (`aria-hidden="true"`)

---

## 02 — Keyboard: Every Interactive Element is Reachable and Operable

Every feature in the app must be fully usable without a mouse.

**Tab order:** All interactive elements participate in the tab sequence in a logical order that follows the visual reading flow (left to right, top to bottom). Never use `tabindex` values greater than 0 — these hijack the natural tab order and create confusion.

| `tabindex` value | When to use |
|---|---|
| Not set | Native interactive elements (`<button>`, `<a>`, `<input>`) — browser handles it |
| `tabindex="0"` | Custom interactive element that must enter the tab sequence |
| `tabindex="-1"` | Element that receives focus programmatically but not via Tab (e.g. first item in a modal) |
| `tabindex="1"` or higher | Never |

**Key behavior by element type:**

| Element | Keys that must work |
|---|---|
| Button | Enter, Space |
| Link | Enter |
| Checkbox | Space to toggle |
| Radio group | Arrow keys to move between options, Space to select |
| Select / dropdown | Enter to open, Arrow keys to move, Enter to select, Escape to close |
| Modal / dialog | Escape to close, Tab cycles inside (focus trap) |
| Bottom sheet | Escape to close, Tab cycles inside |
| Tab panel | Arrow keys to switch tabs, Tab to move into panel content |
| Sidebar nav | Tab to reach, Enter or Space to activate |

**Why:** Keyboard-only users, power users, and users with motor disabilities navigate entirely via keyboard. An app where keyboard access is incomplete is unusable for these users — not just inconvenient.

---

## 03 — Focus Management: Move Focus Intentionally on Dynamic Content

When content appears, disappears, or changes significantly, focus must be moved to the right place. The browser does not do this automatically.

**Opening an overlay (modal, sheet, drawer):**
1. Move focus to the first interactive element inside the overlay — or to the overlay container itself if there is no interactive element at the top
2. Trap Tab and Shift+Tab inside the overlay — focus must not escape to the background content
3. Background content should receive `aria-hidden="true"` while the overlay is open

**Closing an overlay:**
1. Return focus to the element that triggered the overlay
2. Remove `aria-hidden="true"` from background content

**Navigating to a new page (SPA route change):**
- Move focus to the page's `<h1>` or the `<main>` element on route change
- Announce the new page title to screen readers (see principle 07)

**Loading states:**
- When a button triggers an async action, set `aria-busy="true"` on the relevant region while loading
- Disable the button that triggered the action to prevent duplicate submissions (`aria-disabled="true"` or `disabled`)
- When loading completes, move focus back or announce the result via a live region (see principle 06)

**Inline content expansion (accordion, disclosure):**
- Focus stays on the toggle button — do not move it into the expanded content
- Use `aria-expanded="true"/"false"` on the toggle button to announce state

---

## 04 — ARIA Labels: Every Interactive Element Has an Accessible Name

Every interactive element must have an accessible name — the text a screen reader announces when the user focuses it.

**How accessible names are resolved (in priority order):**
1. `aria-labelledby` — points to another element's text
2. `aria-label` — inline string label
3. `<label>` element linked via `htmlFor` / `id`
4. Element's own visible text content (`<button>Save</button>`)

**Rules:**

- **Visible text is always preferred.** If a button has a visible label, that label is already its accessible name — don't add an `aria-label` that duplicates or contradicts it.
- **Icon-only buttons must have `aria-label`.** `<button aria-label="Delete play">` with an icon inside and `aria-hidden="true"` on the icon.
- **Form inputs must have `<label>`.** Link them via `htmlFor` + `id`. `aria-label` is acceptable when a visible label would be redundant (e.g. a search input with a visible search icon and placeholder) — but a visible label is always preferred.
- **Images that convey meaning must have `alt` text.** Decorative images get `alt=""`. Never omit `alt` entirely — that causes screen readers to announce the file path.
- **Do not use `aria-label` to rename an element to something different from its visible text.** If the button says "Save" and `aria-label` says "Submit form", screen reader and voice control users get conflicting information.

---

## 05 — Live Regions: Announce Dynamic Changes to Screen Readers

When content changes without a page load or focus move, screen readers do not announce it unless you explicitly tell them to.

Use `aria-live` regions for:
- Toast notifications and success/error banners
- Form submission results ("Play saved" / "Error saving play")
- Loading completion ("Team loaded")
- Search result count updates ("12 plays found")

**Three levels:**

| Attribute | Behaviour | Use for |
|---|---|---|
| `aria-live="polite"` | Announces after the user finishes their current action | Success messages, status updates, search results |
| `aria-live="assertive"` | Interrupts immediately | Critical errors only — destructive failures |
| `aria-live="off"` | Never announces | Default — no live region |

**Implementation pattern:**

```jsx
// Place a single live region in the app shell — do not create one per component
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"  // visually hidden, not display:none
>
  {statusMessage}
</div>
```

- `aria-atomic="true"` — announces the full content of the region each time it changes, not just the diff
- Use `role="status"` for polite, `role="alert"` for assertive
- **Never use `display: none` or `visibility: hidden` on a live region** — screen readers ignore hidden elements. Use a visually-hidden class instead (position absolute, clip, 1px × 1px)
- Update the content by changing the text inside the region — do not unmount and remount the element

---

## 06 — Forms: Labels, Errors, and Required Fields

Forms are the highest-friction accessibility surface. Every field needs a label, every error needs a description, every required field needs to be marked.

**Labels:**
- Every input has a `<label>` linked via `htmlFor` + `id`
- Placeholder text is not a label substitute — it disappears on focus and has low contrast
- Label text describes what goes in the field, not how to fill it ("Team name" not "Enter your team name here")

**Required fields:**
- Mark required inputs with `aria-required="true"`
- An asterisk (*) may supplement but must not be the only indicator — include "Required" in the label or via `aria-describedby` pointing to a legend
- Do not mark every field required if the whole form is required — state it once at the form level

**Error messages:**
```jsx
// Link the error message to the field via aria-describedby
<input
  id="team-name"
  aria-describedby="team-name-error"
  aria-invalid="true"
/>
<span id="team-name-error" role="alert">
  Team name is required
</span>
```

- `aria-invalid="true"` marks the field as in an error state
- `role="alert"` on the error message causes it to be announced immediately when it appears
- The error must be text — color alone is not sufficient (WCAG SC 1.4.1)
- Error messages appear below the field, not in a tooltip that disappears

**Validation timing:** Fire on blur, not on keystroke (see general standards). Announce errors after the user leaves the field, not while they are typing.

---

## 07 — SPA Navigation: Announce Route Changes

React Router does not announce page changes to screen readers. After a route change, a screen reader user on a native site would hear the new page title read automatically. In an SPA, they hear nothing.

**Fix:** On every route change, update `document.title` and move focus to the page `<h1>` or `<main>`.

```jsx
// In a route change effect or layout component
useEffect(() => {
  document.title = `${pageTitle} — Coachable`;
  // Move focus to main content area
  const main = document.querySelector('main');
  if (main) {
    main.setAttribute('tabindex', '-1');
    main.focus();
    // Remove tabindex after focus so main doesn't appear in tab order
    main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
  }
}, [pageTitle]);
```

Also provide a **skip navigation link** — a visually hidden link that becomes visible on focus, pointing to `#main-content`:

```jsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

// CSS
.skip-link {
  position: absolute;
  top: -100%;
  left: 16px;
  background: var(--orange);
  color: #fff;
  padding: 8px 16px;
  border-radius: 0 0 8px 8px;
  font-weight: 600;
  z-index: 9999;
}
.skip-link:focus {
  top: 0;
}
```

**Why:** Without this, every route change forces keyboard and screen reader users to Tab through the entire navigation before reaching the new page content.

---

## 08 — Images and Media

**Informative images** — images that convey content — must have descriptive `alt` text:
```jsx
<img src="play-thumbnail.png" alt="4-3-3 formation play — forwards spread wide" />
```

**Decorative images** — images that are purely visual, already described by surrounding text — get empty `alt`:
```jsx
<img src="background-pattern.png" alt="" />
```

**Never omit `alt` entirely** — screen readers announce the file path when `alt` is missing.

**Icon images used as buttons:** The icon itself gets `aria-hidden="true"`. The button gets `aria-label`:
```jsx
<button aria-label="Delete play">
  <TrashIcon aria-hidden="true" />
</button>
```

**SVG icons:** Same rule — add `aria-hidden="true"` to decorative SVGs paired with visible text. Add `role="img"` and `<title>` to standalone informative SVGs.

---

## 09 — Disabled vs Unavailable

Two different states. Choose the right one.

| State | Element | Announced as | Keyboard reachable? |
|---|---|---|---|
| `disabled` (HTML attribute) | `<button disabled>` | "dimmed" or "unavailable" | No |
| `aria-disabled="true"` | any element | "dimmed" | Yes — still in tab order |

**Use `disabled`** when the action is completely unavailable and the reason is obvious in context.

**Use `aria-disabled="true"`** (without HTML `disabled`) when:
- The element should remain focusable so the user can discover why it is unavailable
- You want to show a tooltip or message explaining the disabled state on focus

**Never** use visual opacity alone to communicate disabled state without also updating the semantic state (`disabled` or `aria-disabled`). The visual and semantic states must match.

---

## 10 — Testing: How to Verify

Automated tools catch roughly 30% of accessibility issues. The rest require manual checks.

**Keyboard walkthrough (do this on every new screen):**
1. Tab through every interactive element — confirm nothing is unreachable
2. Confirm the focus ring is visible on every focused element (see general standards)
3. Activate every button and link with Enter, every checkbox with Space
4. Open and close every modal/sheet — confirm Escape works and focus returns to the trigger
5. Confirm you cannot Tab out of an open modal into the background

**Screen reader spot-check (do this on flows, not every element):**
- macOS: VoiceOver (Cmd + F5), navigate with arrow keys
- Windows: NVDA (free) or Narrator
- Confirm: form labels are announced, errors are announced, button purposes are clear, page title changes on navigation

**Automated check (run in development):**
- `axe-core` browser extension — flags contrast, missing labels, invalid ARIA, missing alt text
- This catches the mechanical errors. It does not catch logical errors (wrong label, unclear button purpose, bad focus order).

**What counts as done:**
- [ ] Tab reaches every interactive element
- [ ] Every button and link has a clear accessible name
- [ ] Every form field has a linked label
- [ ] Every error message is text and linked to its field
- [ ] Every modal traps focus and restores it on close
- [ ] Skip link present and functional
- [ ] Page title updates on route change
- [ ] No `outline: none` without a custom `:focus-visible` replacement
- [ ] No `aria-label` contradicting visible text

---

## Quick Reference

| Rule | Implementation |
|---|---|
| Semantic HTML first | `<button>` not `<div onClick>`, `<ul>` not `<div>` column |
| tabindex values | 0 or -1 only. Never positive values. |
| Focus on modal open | First interactive element inside the modal |
| Focus on modal close | Back to the trigger element |
| Focus trap | Tab and Shift+Tab must not escape an open overlay |
| aria-hidden on background | Set when modal is open, remove when closed |
| Icon-only button | `aria-label` on button, `aria-hidden="true"` on icon |
| Form label | `<label htmlFor>` always — placeholder is not a label |
| Required field | `aria-required="true"` + text indicator |
| Error message | `aria-invalid="true"` on input + `role="alert"` on message + `aria-describedby` link |
| Validation timing | On blur — not on keystroke |
| Live region | `role="status"` + `aria-live="polite"` in app shell |
| Assertive live region | `role="alert"` — critical errors only |
| Visually hidden | Position absolute + clip — never `display:none` on live regions |
| SPA route change | Update `document.title` + move focus to `<main>` |
| Skip link | First element in DOM, visually hidden until focused |
| Decorative image | `alt=""` |
| Informative image | Descriptive `alt` text |
| Disabled — not reachable | HTML `disabled` attribute |
| Disabled — still reachable | `aria-disabled="true"` (without HTML disabled) |
| Automated testing | axe-core extension — catches ~30% of issues |
| Manual testing | Keyboard walkthrough on every new screen |
