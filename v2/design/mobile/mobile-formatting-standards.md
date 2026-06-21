# Coachable Mobile Formatting Standards

**Status:** Mobile-exclusive formatting rules.  
**Scope:** Everything below the `md` breakpoint (768px). Rules here are in addition to — not a replacement for — the general standards in `../general-formatting-standards.md`.  
**HTML Reference:** None — `mobile-standards.html` has been removed. Visual examples will be added as part of the component library work (Group 6).

---

## 01 — Touch Targets: 48×48px minimum

The tap zone — not the visual size of the element — must be at least 48×48px.

A small icon can still meet this rule through padding. A 20px icon with 14px padding on each side has a 48px tap zone. The visual and the interactive layer are separate concerns.

**Why:** Satisfies WCAG 2.2 AA SC 2.5.8 (48×48dp minimum), Apple HIG (44pt), and Material Design 3 (48dp). Applies to every tappable element: buttons, icon buttons, list rows, nav items, checkboxes, toggles, chips, and dropdown triggers.

→ See **p-touch** in the HTML reference.

---

## 02 — Layout: Single column, 16px margin, no horizontal scroll below 320px

- Horizontal page margin: **16px** on mobile
- All content — including lists — sits inside that margin. Lists do not go edge-to-edge.
- No two-column or side-by-side layouts below 768px. Everything stacks vertically.
- Every page must work without horizontal scroll at **320px viewport width** (WCAG 2.2 AA SC 1.4.10 — Reflow).

**Why:** At 375px with 16px margins, the usable column is 343px. At 320px it is 288px. Side-by-side columns at mobile widths force content into columns too narrow to read.

→ See **p-layout** in the HTML reference.

---

## 03 — Navigation: Bottom bar, color-only active state

Primary navigation on mobile lives in a bottom tab bar.

- Maximum 5 items — more than 5 destroys label readability and tap precision
- Each item: icon + `label`-level text (13px DmSans 600), stacked vertically
- Active item: BrandOrange icon + label. Inactive: BrandGray. No pills, no filled backgrounds, no animation.
- Bottom bar height: 56px + `env(safe-area-inset-bottom)` to clear the iOS home indicator
- Tab bar is part of the app shell — pages do not render their own bottom nav

**Why:** Bottom navigation is within thumb reach. The active state (principle 08 of general standards) applies here — BrandOrange color change, nothing else. Adding a filled background pill behind the active item conflicts with the dark surface and adds complexity for zero clarity gain.

→ See **p-nav** in the HTML reference.

---

## 04 — Bottom Sheets: Content-driven height, drag handle, always dismissible

- Height is driven by content. The sheet grows to fit, up to a cap of **85dvh**, then content scrolls inside.
- Always show a drag handle pill (36×4px, BrandGray2 color) at the top of the sheet.
- Close on backdrop tap or downward drag.
- Top corner radius: 20px. The sheet bottom has no radius — it meets the screen edge.
- On desktop (`md`+): the same content presents as a centered dialog (`max-w-md`) with full border radius. See desktop doc.

**Why:** A fixed-height sheet wastes space for short content and clips long content. The 85dvh cap keeps the page partially visible so the user stays oriented. The drag handle is a native iOS/Android convention — users expect it and know what it means. Without it, dismissal feels ambiguous.

→ See **p-sheet** in the HTML reference.

---

## Quick Reference (mobile-exclusive values)

| Decision | Mobile rule |
|---|---|
| Page margin | 16px horizontal |
| Min touch target | 48×48px (zone, not visual size) |
| Layout | Single column — no two-column below 768px |
| Reflow breakpoint | Must work at 320px with no horizontal scroll |
| Nav position | Bottom tab bar |
| Nav item count | 5 maximum |
| Nav item height | 56px + safe-area-inset-bottom |
| Active state | BrandOrange color only — no pills or backgrounds |
| Sheet max height | 85dvh |
| Sheet dismiss | Drag down or tap backdrop |
| Sheet top radius | 20px (top corners only) |
| Drag handle | 36×4px pill, BrandGray2 |
| Height unit | 100dvh not 100vh (see general standards) |

For all other decisions — spacing grid, typography, contrast, borders, radius, shadow, focus, motion, icons, form states — see `../general-formatting-standards.md`.

---

## Cross-Reference Notes

**This doc extends `general-formatting-standards.md`. It is authoritative for mobile-exclusive rules. `color-semantics.md` is newer and takes priority on token usage.**

**Stale references:**
- All `→ See p-* in the HTML reference` anchors are dead — `mobile-standards.html` was removed. Delete these lines when updating.

**Inconsistencies to resolve:**

1. **§03 Active state** — Says "No pills, no filled backgrounds, no animation." `color-semantics.md` (newer) allows `--ui-accent-muted` background tint on active nav items as the sole exception. **Add this exception to §03 or explicitly note it does not apply to mobile bottom nav.** If mobile bottom nav active state is intentionally pill-free (color only), document that explicitly as diverging from desktop sidebar behavior.

2. **§03 Token names** — Uses `BrandOrange` and `BrandGray` for active/inactive states. Per `color-semantics.md` (newer), implementations should use `--ui-accent` and `--ui-text-muted`. These are equivalent in light mode but diverge in dark mode (`--ui-accent` dark = `#F97316`, `BrandOrange` = `#FF7A18`).

3. **§04 Drag handle** — "BrandGray2 color." Per `color-semantics.md`, border elements should use `--ui-border` (`#343A40` dark). `BrandGray2` = `#4b5157`; `--ui-border` = `#343A40`. These are different values — confirm which is correct and update.

4. **`mobile-ui-standards.md` in the same folder** — That file says minimum touch target is **44px**. This doc says **48×48px** (WCAG 2.2 AA SC 2.5.8). **This doc takes priority — 48px is the standard.**
