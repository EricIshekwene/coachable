# Coachable General Formatting Standards

**Status:** Authoritative source for all shared formatting decisions.  
**Scope:** Everything in this doc applies to every surface — mobile, tablet, and desktop. The mobile and desktop docs extend this doc with surface-exclusive rules only.  
**HTML Reference:** None — rules are canonical here. Visual examples live in the platform-specific HTML files.  
**Accessibility:** This doc covers accessibility where it intersects with visual formatting (contrast, focus ring appearance, motion, semantic HTML). For ARIA usage, keyboard patterns, focus management, live regions, and testing see `accessibility-standards.md`.

> **Note — Platform HTML pages need a redo after the design system is finalized.**  
> Once the v2 token rename, component library, and color system are locked in, regenerate `mobile-standards.html` and `desktop-standards.html` so all examples use the final names and values.

---

## 01 — Spacing: Everything snaps to the 4px grid

All padding, gap, and margin values must be multiples of 4px. No exceptions.

Allowed values: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.

**Why:** A 4px grid creates consistent visual rhythm at every breakpoint. 4px is the atom — inner component padding uses 4–12px, structural gaps between components use 16–24px. "14px feels right" is not a reason — use 12px or 16px.

---

## 02 — Typography: Six named levels, no ad-hoc sizes

Every text element maps to one of six defined levels. Inventing intermediate sizes is not allowed.

| Level | Size | Font | Weight | Line-height | Use |
|---|---|---|---|---|---|
| `heading` | 22px | Manrope | 600 | 1.2 | Page-level title. One per screen. |
| `subheading` | 17px | Manrope | 600 | 1.3 | Section header, card title |
| `body` | 15px | DmSans | 400 | 1.5 | Default reading text |
| `body-strong` | 15px | DmSans | 600 | 1.5 | Primary label for an item (name, title) |
| `label` | 13px | DmSans | 600 | 1.4 | Buttons, nav labels, chips, badges |
| `caption` | 11px | DmSans | 400 | 1.4 | Timestamps, secondary metadata |

- Minimum body text is 15px. Never use a smaller size for primary reading text.
- Manrope is for headings. DmSans is for everything else.
- Line-heights meet WCAG 2.2 SC 1.4.12 — body at 1.5× minimum.
- If you're unsure which level to pick, ask whether this text is a heading or a label — then use that level. Do not split the difference with a custom size.

---

## 03 — Color & Contrast: Text must pass 4.5:1. BrandGray2 is a border color, not a text color.

All text must meet WCAG 2.2 AA contrast ratios (SC 1.4.3):
- Normal text: 4.5:1 minimum against its background
- Large text (18px+ regular or 14px+ bold): 3:1 minimum
- Non-text UI components (borders, icons, input outlines): 3:1 minimum (SC 1.4.11)

**Token summary:**

| Token | Hex | Contrast vs BrandBlack | Valid as text? |
|---|---|---|---|
| BrandText | #f5f7fa | 15.5:1 | ✓ Yes |
| BrandGray | #9AA0A6 | 5.8:1 | ✓ Yes — muted text |
| BrandOrange | #FF7A18 | 5.7:1 | ✓ Yes — active labels |
| BrandGreen | #4FA85D | 4.9:1 | ✓ Yes — success state |
| BrandGray2 | #4b5157 | 2.1:1 | ✗ No — borders only |

BrandGray2 fails WCAG AA. Use it for subtle borders and dividers only. For muted text, use BrandGray.

---

## 04 — Borders: 1px only

All borders are 1px. No exceptions.

**Why:** On retina displays, 1px is crisp. 2px borders add visual weight that competes with content. Surface distinction comes from background color contrast and shadow — not border weight.

---

## 05 — Border Radius: Use the scale, not a gut-feel value

Radius signals hierarchy. Larger radius = more prominent, more floating. Smaller = tighter, more inline.

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Chips, badges, small tags |
| `--radius-md` | 8px | Buttons, inputs, dropdowns |
| `--radius` | 10px | Default card, panel |
| `--radius-lg` | 14px | Large overlays, floating elements |
| `--radius-xl` | 18px | Prominent containers, dialogs |
| `--radius-pill` | 9999px | Avatars, toggles, drag handles |

Bottom sheets use 20px radius on top corners only. The sheet bottom has no radius — it meets the screen edge.

Do not choose a radius because it looks nice. Choose the one that matches the component's role in the hierarchy.

---

## 06 — Elevation & Shadow: Shadow means "floating." Cards in a list are not floating.

| Context | Dark mode | Light mode |
|---|---|---|
| Card in a list | No shadow | `--shadow-sm` (0 1px 3px rgba(0,0,0,0.08)) |
| Dropdown, popover | `--shadow` | `--shadow` |
| Modal, sheet, toast | `--shadow-lg` | `--shadow-lg` |

Shadow's semantic meaning is "this element is above something." Use it only when that is true. If every surface gets a shadow, the signal is meaningless.

Dark mode cards on `#2a2e34` over `#121212` have enough contrast to read as elevated without a shadow. Adding one wastes GPU on long lists with zero visual benefit.

---

## 07 — Vertical Rhythm: Gap size communicates grouping

Three tiers of vertical gap:
- **8px** — between items within a group (list rows, stacked fields)
- **16px** — between sibling cards on a page
- **24px** — before a new named section with a heading

**Why:** Gestalt proximity — elements that are closer together are perceived as related. A uniform gap across everything makes a page read as an undifferentiated list. The three tiers make grouping legible without divider lines.

Section headings use `subheading` level (17px Manrope 600) in BrandGray — they label a group, not the page.

---

## 08 — Active States: Color change only. No pills, backgrounds, or animation.

Active and selected states are communicated by color alone: BrandOrange on the active item, BrandGray on inactive. No filled background pill, no underline indicator, no animated bubble.

**Why:** Color is the clearest, lowest-cost signal for "this is where you are." Pill backgrounds and animated indicators add visual complexity, need more space, and can look out of place on a dark surface. Every major mobile app (Instagram, YouTube, X) uses icon+label color change with no additional decoration.

---

## 09 — Focus States: Every interactive element has a visible keyboard focus ring

All interactive elements — buttons, links, inputs, selects, checkboxes, radios, toggles — must show a visible focus indicator when reached by keyboard (Tab key).

WCAG 2.2 SC 2.4.11 (AA): The focus indicator must have a contrast ratio of at least 3:1 between focused and unfocused appearance, and at least 3:1 against adjacent colors.

Never use `outline: none` or `outline: 0` without providing a custom `:focus-visible` style.

**Coachable focus style:** `outline: 2px solid #FF7A18; outline-offset: 2px;`

**Why:** Keyboard and assistive-technology users navigate entirely by focus. An invisible focus state makes the interface unusable without a mouse. WCAG AA 2.4.11 is a hard requirement.

---

## 10 — Motion & Animation: Purposeful, under 300ms, always reducible

- UI state transitions: 150–250ms ease-out
- Entrance animations (toast, modal open): 200–300ms
- Animate `transform` and `opacity` only — never `width`, `height`, `top`, `left` (these cause reflow)
- No infinite animations in idle state
- All animation must be disabled at `prefers-reduced-motion: reduce` (WCAG SC 2.3.3)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 11 — Semantic Markup: One H1, roles follow visual structure

- One `<h1>` per page — the page-level title. No heading levels may be skipped (h1→h3 is invalid).
- Use landmark roles: `<main>`, `<nav>`, `<aside>`, `<header>`, `<footer>` — not `<div>` for structural regions.
- Buttons trigger actions. Links navigate somewhere. Never use `<div onClick>` for either.
- Lists of items use `<ul>`/`<ol>`. Never render a list as a column of `<div>` elements.
- Form fields must have associated `<label>` elements (via `htmlFor`/`id` pair, or `aria-label`).

**Why:** Screen readers navigate by landmarks and headings, not visual layout. Semantic HTML costs nothing extra to write and unlocks accessibility for free.

---

## 12 — Icons: Size from the token scale, always labeled

Icon sizes come from three tokens only:

| Token | Size | Use |
|---|---|---|
| `--icon-sm` | 14px | Inline with caption text |
| `--icon-md` | 16px | Default — buttons and labels |
| `--icon-lg` | 20px | Standalone icon buttons, nav items |

- Never set an ad-hoc icon size.
- Icon-only buttons must have `aria-label="Description"`.
- Icons paired with visible text are decorative: `aria-hidden="true"`.
- Icon color follows the text color of its context unless it carries semantic meaning (error = destructive red, success = BrandGreen).

---

## 13 — Form Field States: Four named states for every input

Every input — text field, select, textarea, checkbox, radio, toggle — defines all four states:

| State | Border | Notes |
|---|---|---|
| Idle | 1px BrandGray2 | Normal resting state |
| Focused | 1px BrandOrange | Plus focus ring from principle 09 |
| Error | 1px destructive red | Error message text below field — color alone is insufficient (WCAG SC 1.4.1) |
| Disabled | 1px BrandGray2 at 40% opacity | `aria-disabled="true"`, `not-allowed` cursor |

- Validation fires on blur, not on keystroke. Live keystroke validation causes error flicker.
- Required fields are marked `aria-required="true"`. An asterisk (*) may supplement but must not be the sole indicator.

---

## 14 — Height Units: dvh not vh

All viewport-height references use `dvh` (dynamic viewport height), not `vh`.

On mobile Safari, `100vh` includes the retracted browser toolbar and sizes content incorrectly. `100dvh` dynamically tracks the visible viewport.

- Use `100dvh` for full-screen layouts
- Prefer `min-h-[100dvh]` over `min-h-screen` (Tailwind's `h-screen` maps to `vh`)
- The app shell's `<main>` is the scroll container. Pages are content-driven in height — never set `overflow-y: auto` on a page component. Only on intentional inner scroll containers.

---

## Quick Reference

| Decision | Rule |
|---|---|
| Spacing unit | 4px grid (4, 8, 12, 16, 20, 24, 32, 48, 64) |
| Heading | 22px Manrope 600 · lh 1.2 |
| Subheading | 17px Manrope 600 · lh 1.3 |
| Body | 15px DmSans 400 · lh 1.5 |
| Body strong | 15px DmSans 600 · lh 1.5 |
| Label | 13px DmSans 600 · lh 1.4 |
| Caption | 11px DmSans 400 · lh 1.4 |
| Contrast — normal text | 4.5:1 AA minimum |
| Contrast — large text | 3:1 AA minimum |
| Contrast — UI components | 3:1 AA minimum |
| BrandGray2 as text | Never — borders only |
| Border width | 1px only |
| Card radius | `--radius` (10px) |
| Button / input radius | `--radius-md` (8px) |
| Sheet top radius | 20px top corners only |
| Card shadow — dark mode | None |
| Card shadow — light mode | `--shadow-sm` |
| Overlay shadow | `--shadow-lg` always |
| Gap — items in a group | 8px |
| Gap — sibling cards | 16px |
| Gap — between sections | 24px |
| Active state | BrandOrange color only — no pills or backgrounds |
| Focus ring | 2px solid BrandOrange, 2px offset |
| Motion duration | 150–300ms, transform + opacity only |
| Reduced motion | Disable all at prefers-reduced-motion: reduce |
| H1 per page | Exactly one |
| Heading levels | Never skip levels |
| Button vs link | Button = action. Link = navigation. |
| Icon sizes | 14px / 16px / 20px — tokens only |
| Icon-only button | Must have aria-label |
| Form validation | On blur, not on keystroke |
| Error signal | Text message + color (never color alone) |
| Height unit | 100dvh not 100vh |
| Scroll container | App shell `<main>` only |
| Mobile breakpoint | 768px (md) |
