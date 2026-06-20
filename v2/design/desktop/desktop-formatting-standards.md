# Coachable Desktop Formatting Standards

**Status:** Desktop-exclusive formatting rules.  
**Scope:** Everything at the `md` breakpoint (768px) and above. Rules here are in addition to — not a replacement for — the general standards in `../general-formatting-standards.md`.  
**HTML Reference:** Open `desktop-standards.html` alongside this doc — every principle has a live visual example.

> **Note — HTML page needs a redo after the design system is finalized.**  
> Once the v2 token rename, component library, and color system are locked in, regenerate the HTML so all examples use the final names and values. Update the rules in this doc at the same time.

---

## 01 — Breakpoints: Four thresholds, always mobile-first

| Name | Min-width | Purpose |
|---|---|---|
| (default) | 0px | Mobile — single column, 16px margin |
| `md` | 768px | Desktop entry — sidebar becomes available |
| `lg` | 1024px | Full persistent sidebar + content column |
| `xl` | 1280px | Wide content, optional right panel |
| `2xl` | 1536px | Container capped — content does not stretch beyond 1440px |

Always write base styles for the mobile default, then layer on `md:`, `lg:`, `xl:` overrides. Never write desktop-first and undo at small sizes — the cascade works against you.

**Why:** Mobile-first means the base layer is the most constrained. Expanding outward is additive. Collapsing inward requires overriding every property added — a maintenance cost that compounds with every new component.

→ See **d-breakpoints** in the HTML reference.

---

## 02 — Layout: Sidebar + content column at lg, contained at 2xl

| Zone | Width | Appears at |
|---|---|---|
| Left sidebar | 240px (collapsed: 64px icon-only) | `md` (toggle or partial) |
| Content column | flexible, max 800px for reading | always |
| Right panel | 360–480px (optional) | `xl` only |

- Content column max-width: **800px** for reading-heavy views. Canvas and dashboard views may use full available width.
- At `2xl`: wrap in `max-w-[1440px] mx-auto` so content does not stretch across ultra-wide monitors. Reading lines over 80 characters cause fatigue.
- At `md`: sidebar collapses or hides behind a toggle. Content column takes full width minus margin.

→ See **d-layout** in the HTML reference.

---

## 03 — Margins: Scale with the viewport

| Breakpoint | Horizontal margin |
|---|---|
| Default (mobile) | 16px |
| `md` | 24px |
| `lg` | 32px |
| `xl` | 40px |

At `xl`+ with a centered container, the container's padding handles margin automatically. Do not double-add margin inside a centered container.

Vertical section gaps remain 24px at all breakpoints — sections do not stretch apart on wide screens (see general standards, principle 07).

→ See **d-margins** in the HTML reference.

---

## 04 — Hover States: Required on all interactive elements

Every button, link, list row, nav item, icon button, and interactive control must have a `:hover` style. Desktop has a pointer device — hover is the first affordance signal before click.

**Hover style rules:**
- List rows and sidebar items: subtle background tint (BrandBlack2 at 60% opacity, `rgba(42,46,52,0.6)`)
- Buttons: 8–10% opacity increase on the button's background
- Icon buttons: background tint scoped to the hit area

Never make hover the sole discovery mechanism for a feature. On touch screens, hover never fires.

**Cursor:** Native `<button>` and `<a>` elements apply `cursor: pointer` automatically — do not add it redundantly. Set `cursor` explicitly only on custom interactive elements (a `<div>` wired as a button, a drag handle, etc.).

| Element | Cursor |
|---|---|
| Custom buttons / clickable divs | `pointer` |
| Draggable items | `grab` / `grabbing` while held |
| Resizable handles | `ew-resize`, `ns-resize`, `nwse-resize` |
| Disabled elements | `not-allowed` |

**Why:** Without hover feedback, interactive elements look inert. A list row with no hover state looks like a static label — the user hesitates, and trust erodes.

→ See **d-hover** in the HTML reference.

---

## 05 — Navigation: Left sidebar on desktop, never bottom bar

Bottom navigation is a mobile pattern. On desktop (`md`+), primary navigation lives in a left sidebar.

**Sidebar specs:**
- Width: 240px expanded, 64px icon-only collapsed
- Background: BrandBlack2 (#2a2e34)
- Section labels: `caption` level (11px DmSans), BrandGray, uppercase — no interaction
- Nav items: `label` level (13px DmSans 600), left-aligned, 40px height minimum

**Three nav states (both must be defined):**

| State | Icon | Label | Background |
|---|---|---|---|
| Default (inactive) | BrandGray | BrandGray | None |
| Hover | BrandText | BrandText | BrandBlack2 tint |
| Active | BrandOrange | BrandOrange | None |

This is the only context where hover changes text color (to BrandText for legibility against the tint). Everywhere else, hover uses only a background tint.

**Top bar:** Holds page title or breadcrumb + page-level actions. Not the primary nav surface. Keep below 64px tall.

→ See **d-nav** in the HTML reference.

---

## 06 — Dialogs: Centered and dismissible, not bottom sheets

On desktop (`md`+), bottom sheets become centered dialogs.

| Property | Value |
|---|---|
| Width — simple | `max-w-md` (448px) |
| Width — complex forms | `max-w-2xl` (672px) |
| Border radius | `--radius-xl` (18px) all corners |
| Backdrop | `rgba(0,0,0,0.5)` |
| Dismiss | Escape key + X button (always) + backdrop click |
| Vertical position | Centered, slight upward bias |
| Max height | 85dvh — content scrolls inside |

Every dialog requires:
1. X close button — top-right, always visible
2. Escape key dismiss — always, no exceptions
3. Focus trap — Tab cycles only through the dialog while open
4. Focus restore — focus returns to the triggering element on close

**Why:** Dialogs without Escape support force mouse usage on keyboard-only users. Focus traps without restoration disorient screen reader users. These three rules together satisfy WCAG SC 2.1.2 (No Keyboard Trap) and SC 2.4.3 (Focus Order).

→ See **d-dialog** in the HTML reference.

---

## 07 — Panels & Drawers: Right panel for secondary context

When the user selects an item and detail is needed alongside the primary view, use a right panel drawer instead of navigating away.

| Property | Value |
|---|---|
| Width | 360px at `lg`, 480px at `xl` |
| Entry | Slides in from right — `transform` + `opacity`, 200ms |
| Dismiss | X button + Escape key |
| Inner padding | 24px |
| Border | 1px left border (BrandGray2) |

At `md` or on mobile, the same panel becomes a full-screen sheet or bottom sheet depending on content height.

Do not use panels as navigation. They are for detail and context, not page transitions. The primary content behind a non-modal panel stays visible and scrollable.

→ See **d-drawer** in the HTML reference.

---

## 08 — Data Density: Desktop views can be tighter

Desktop users see more at once. Reducing spacing in data-heavy views is correct — it is not a mistake.

| Context | Mobile gap | Desktop gap |
|---|---|---|
| Table / list row padding | 12px top/bottom | 8px top/bottom |
| Form field stack gap | 20px | 16px |
| Sidebar nav item height | 48px (touch target) | 40px |
| Card gap in a grid | 16px | 12px |
| Section gap | 24px | 24px (same — never compress section gaps) |

**Click target minimum on desktop: 24×24px.** The 48×48px touch-target rule (mobile standards, principle 01) does not apply to desktop-only controls. Mixed-input surfaces (touchscreen laptops) should keep 48px because the user may switch between touch and pointer at any time.

→ See **d-density** in the HTML reference.

---

## 09 — Tooltips: Valid on desktop, never the sole source of information

Tooltips are hover-triggered supplemental labels. Valid on desktop because desktop has a pointer device.

**When to use:**
- Icon-only buttons where visual confirmation of the aria-label is helpful
- Truncated text that overflows its container
- Abbreviations and technical terms

**When not to use:**
- As the only place where a feature's purpose is explained
- For information the user needs before interacting (put that inline)
- As an alternative to a proper field label

**Style:**
- Background: BrandBlack2 (#2a2e34)
- Text: BrandText (#f5f7fa), `caption` level (11px)
- Radius: `--radius-sm` (6px)
- Max-width: 200px, wraps
- Delay: **400ms** — prevents tooltip flash while the cursor passes through
- Position: above by default, flips below if not enough space

→ See **d-tooltip** in the HTML reference.

---

## Quick Reference (desktop-exclusive values)

| Decision | Desktop rule |
|---|---|
| Mobile breakpoint | 768px (md) |
| Full layout breakpoint | 1024px (lg) |
| Container max-width | 1440px (2xl) |
| Sidebar — expanded | 240px |
| Sidebar — collapsed | 64px icon-only |
| Content column max-width | 800px (reading) |
| Right panel width | 360px (lg) · 480px (xl) |
| Margin — md | 24px |
| Margin — lg | 32px |
| Margin — xl | 40px |
| Hover | Required on all interactive elements |
| Hover style | Background tint only (except sidebar nav — see principle 06) |
| Cursor | `pointer` on custom interactive elements only — native `<button>` / `<a>` handle it automatically |
| Nav position | Left sidebar — never bottom bar |
| Nav item height | 40px minimum |
| Nav active | BrandOrange color only — no pill |
| Nav hover | BrandText + BrandBlack2 tint |
| Dialog — simple | max-w-md (448px) |
| Dialog — complex | max-w-2xl (672px) |
| Dialog dismiss | Escape + X button + backdrop |
| Right panel dismiss | Escape + X button |
| Click target minimum | 24×24px (pointer) |
| Table row padding | 8px top/bottom |
| Dense list row height | 40px minimum |
| Form field stack gap | 16px |
| Card grid gap | 12px |
| Section gap | 24px (same as mobile) |
| Tooltip delay | 400ms |
| Tooltip max-width | 200px |
| Layout direction | Mobile-first — base for mobile, md/lg/xl layer on top |

For all other decisions — spacing grid, typography, contrast, borders, radius, shadow, focus, motion, icons, form states — see `../general-formatting-standards.md`.
