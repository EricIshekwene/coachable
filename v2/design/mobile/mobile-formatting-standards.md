# Coachable Mobile Formatting Standards

**Status:** Mobile-exclusive formatting rules.  
**Scope:** Everything below the `md` breakpoint (768px). Rules here are in addition to — not a replacement for — the general standards in `../general-formatting-standards.md`.  
**HTML Reference:** Open `mobile-standards.html` alongside this doc — every principle has a live visual example.

> **Note — HTML page needs a redo after the design system is finalized.**  
> Once the v2 token rename, component library, and color system are locked in, regenerate the HTML so all examples use the final names and values. Update the rules in this doc at the same time.

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
