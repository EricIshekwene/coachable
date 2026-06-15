# Design System Consolidation Roadmap

> **Goal:** make `/admin/design-rules` the **single source of truth** for *all* Coachable
> visual design — not just color. Every design decision (color, type, spacing, radius,
> elevation, motion, iconography, z-index) lives as a token derived from one canonical
> source, and every section of the design-rules page renders the **real, shared component**
> it documents — not a static mockup.
>
> Canonical source = the brand palette in [`src/index.css`](../../index.css) (`@theme`).
> Admin tokens (`--adm-*` in [`src/admin/admin.css`](../../admin/admin.css)) alias that source.
>
> This is the master tracker. Each axis below is either ✅ done, 🟡 partial, or 🔴 not started.

---

## Scorecard

| Axis | State | Where it lives | Notes |
|---|---|---|---|
| **Color** | 🟡 partial | `--color-Brand*` → `--adm-*` | Admin + most app chrome fully aliased. Slate canvas remaining. |
| **Typography** | 🟡 partial | `--font-Manrope/DmSans` + type scale docs | Families + scale documented in TypographySection; no `@theme` size tokens yet. |
| **Spacing** | 🟡 partial | SpacingSection documents 8px rhythm | No `--space-*` CSS var tokens; Tailwind spacing classes used throughout. |
| **Radius** | ✅ done | `--radius-*` in index.css `:root`; `--adm-radius*` alias | Canonical scale shared; admin aliases; guard test added. |
| **Elevation / shadow** | ✅ done | `--shadow-*` in index.css `:root`; `--adm-shadow*` alias | Dark/light values in index.css; admin aliases; guard test added. |
| **Motion** | ✅ done | `--duration-*`, `--ease-standard` in `@theme` | Tailwind utilities (duration-fast/base/slow, ease-standard); MotionSection updated. |
| **Z-index** | ✅ done | `--z-*` in `@theme` | z-sticky/overlay/modal/toast Tailwind utilities + SpacingSection docs. |
| **Iconography** | 🟡 partial | react-icons, IconographySection docs | Sizes documented in section; no `--icon-*` CSS tokens yet. |
| **Live components in design-rules** | 🟡 partial | `sections/` | Most sections updated; see §H below for remaining items. |
| **Guard tests** | 🟡 partial | `test-harness/test/designTokenUnification.test.js` | Now covers color, radius, shadow, motion. App hex lint not yet automated. |

---

## ✅ Already done

- `--adm-*` color tokens alias the brand palette via `var(--color-Brand*)` + `color-mix()`.
- Flat-surface rule: `--adm-surface == --adm-bg`; surface2/3 are barely-perceptible lifts.
- Light mode = pure white `#ffffff`, matching the app; sidebar bg == page bg.
- Full admin **color** tokenization pass (all pages + analytics charts).
- **Shared radius scale** (`--radius-sm/md/lg/xl/pill`) added to `src/index.css` `:root`; `--adm-radius*` aliases it.
- **Shared shadow scale** (`--shadow-sm/DEFAULT/lg`) added to `src/index.css` `:root` with dark/light variants; `--adm-shadow*` aliases it.
- **Motion tokens** (`--duration-fast/base/slow`, `--ease-standard`) added to `@theme` → Tailwind utilities.
- **Z-index tokens** (`--z-sticky/overlay/modal/toast`) added to `@theme` → Tailwind utilities.
- **App chrome color migration** — `#FF7A18` / `#4FA85D` replaced with `var(--color-Brand*)` / Tailwind Brand* classes in app pages (PlayEditPage, PlayViewOnlyPage, SharedPlayView, SportPickerPage, Playbooks, Notifications) and components (MobileEditorBar, DrawingStyleSection, ColorPickerPopover, sliderStyles).
- **Guard tests extended** — `designTokenUnification.test.js` now covers radius, shadow, and motion token checks in addition to color aliasing.
- **MotionSection + SpacingSection updated** — token table rows show actual CSS var names (`--duration-*`, `--radius-*/--adm-radius-*`, `--shadow-*/--adm-shadow-*`, `--z-*`).

---

## 🔴 / 🟡 Remaining work, by axis

### A. Color — finish the surfaces that still use raw hex

**1. Main app** (`src/components`, `src/canvas`, `src/features`) — ~0% tokenized,
   43+ literal `#FF7A18`, player/entity colors, Tailwind color classes.
   - Replace hex in `style`/className with `var(--color-Brand*)` (zero-risk, same color).
   - **Konva caveat:** canvas fills/strokes can't read CSS vars at paint time. Create
     `src/theme/canvasColors.js` that resolves tokens once via
     `getComputedStyle(document.documentElement)` and re-reads on theme change. One JS
     source mirroring the CSS tokens.
   - Promote player/entity colors to named tokens (`--entity-red`, `--entity-blue`, …) so
     the design-rules page can document them.
   - Slice it: control pill → sidebars → right panel → modals → canvas.

**2. Slate editor** — flagged out-of-date in `SlateSection.jsx`.
   - Migrate chrome (React/CSS) first, then canvas colors via `canvasColors.js`.
   - QA draw tools, selection overlays, guideline dashes, playback. Then remove the warning.

### B. Typography — build a type scale (does not exist yet)

- Add to `index.css` `@theme`: `--text-xs … --text-3xl` (size + line-height pairs),
  weight tokens (`--font-weight-regular/semibold/bold`), and tracking if used.
- Families already exist (`--font-Manrope`, `--font-DmSans`) — document which is display vs body.
- Make `TypographySection.jsx` render live `<p>/<h*>` styled *only* by these tokens.
- Admin alias: `--adm-text-*` sizes if admin needs its own scale, else use brand directly.

### C. Spacing — build a spacing scale (does not exist yet)

- Add `--space-1 … --space-12` (or a 4px base ramp) to `@theme`.
- Replace ad-hoc `padding: 16`, `gap: 8`, `margin: 24` literals across admin + app.
- `SpacingSection.jsx` renders live swatches driven by the tokens.

### D. Radius & Elevation — promote admin-only tokens to shared

- `--adm-radius*` / `--adm-shadow*` currently live only in `admin.css`.
- Move the canonical scale into `index.css` `@theme` (`--radius-*`, `--shadow-*`); have
  `--adm-radius*`/`--adm-shadow*` alias them. App stops hardcoding `border-radius: 10px`.
- Keep the flat-surface rule: shadows stay subtle (hairline border does the separating).

### E. Motion — build duration/easing tokens (does not exist yet)

- Add `--duration-fast/base/slow` and `--ease-standard/in/out` to `@theme`.
- Replace `transition: 0.2s ease` literals.
- `MotionSection.jsx` shows live animated examples driven by the tokens.

### F. Z-index — define a stacking scale

- Inventory current magic z-index values (modals, popups, control pill, tooltips, toasts).
- Add `--z-base/dropdown/sticky/overlay/modal/toast` tokens; replace literals.
- Document the stacking order in `LayoutSection.jsx` (or a new "Layering" note).

### G. Iconography — sizing/stroke standard

- Define standard icon sizes (`--icon-sm/md/lg`) and a default stroke/weight convention.
- `IconographySection.jsx` documents the set and renders the real react-icons in use.

### H. Live-component reconciliation — kill the 17 static mockups

The design-rules page is only a "source of truth" if its sections render the **actual**
components. These 17 sections currently render hand-built mockups, not imports:

> AccessibilitySection, BrandSection, ColorSection, CopySection, DocumentationSection,
> IconographySection, InteractionStatesSection, MotionSection, NotificationsSection,
> OverviewSection, ResponsiveSection, SearchSection, SelectionSection, SpacingSection,
> TemplatesSection, TypographySection, ValuesSection

- **Legitimately doc-only** (no live component needed — keep as guideline/token pages):
  Overview, Values, Brand, Color, Copy, Documentation, Accessibility.
- **Should render live components / tokens** (reconcile these):
  Typography, Spacing, Motion, Iconography, InteractionStates, Selection, Search,
  Notifications, Templates, Responsive.
- For each: import the real component (from `src/components/**` or `src/admin/**`) into a
  `DSStage`, or — if no shared component exists yet — **extract one** so app and design-rules
  share a single implementation (don't duplicate).

### I. Shared-primitive extraction

Where the app and admin each have their *own* button/input/card/badge/modal, extract a
single shared primitive so there's one implementation the design-rules page can show.
Track candidates here as they're found:
- Buttons (app pill buttons vs admin buttons)
- Inputs / search bars
- Cards / stat cards
- Badges / status chips
- Modals / overlays

### J. Guard tests — extend beyond color

- Extend `designTokenUnification.test.js` (or add siblings) to assert:
  - `--adm-radius*`/`--adm-shadow*` alias the shared scale (once §D lands).
  - No raw brand hex (`#FF7A18`, `#4FA85D`) in `src/` `style`/className (lint-style scan).
  - Each "should-be-live" section imports a real component (static check on `sections/`).

---

## 🚫 Intentionally excluded (do **not** "fix")

- **`AdminOnePage.jsx`** — downloadable PNG one-pager; fixed cream/navy palette is the
  deliverable. Tokenizing would make the export vary with the admin theme.
- **`<meta name="theme-color">` via `useThemeColor(hex)`** — mobile status-bar color must be a
  literal hex (`#121212` dark / `#ffffff` light); a meta tag can't read a CSS var.
- **Email-template colors** — email clients strip CSS custom properties; `var(--adm-accent,
  #f97316)` keeps an intentional literal fallback.
- **Konva canvas draw-call colors** — resolved through the `canvasColors.js` JS module (§A.1)
  rather than raw CSS vars.

Document these on the design-rules page under a "Literal by necessity" note so nobody tries
to tokenize them later.

---

## Recommended order

1. ✅ **DESIGN_SYSTEM.md wording sweep** — dropped "separate palettes" language.
2. ✅ **Promote radius + shadow** to shared `src/index.css` `:root` tokens; alias `--adm-*`.
3. 🟡 **Typography + spacing scales** — families + scale documented; no `--text-*` or `--space-*` CSS var tokens yet.
4. ✅ **Motion + z-index** tokens in `@theme` → Tailwind utilities; sections updated.
5. ✅ **App chrome color migration** — main pages + components migrated.
6. **`canvasColors.js`** + canvas/Slate color migration. *(excluded from this pass)*
7. **Shared-primitive extraction** + reconcile remaining static mockup sections.
8. **Slate** chrome → canvas; remove its "out of date" warning. *(excluded from this pass)*
9. ✅ **Guard tests extended** to cover radius, shadow, motion axes.

## Definition of "fully consolidated"

- Every axis in the scorecard is ✅.
- No hardcoded brand hex / ad-hoc spacing / radius / duration literals in `style`/className across `src/`.
- All canvas colors resolve from one JS constants module mirroring the CSS tokens.
- All 38 design-rules sections either render a live shared component or are explicitly doc-only.
- No "out of date" / "not connected" warnings remain in any section.
- Guard tests fail the build if any axis drifts from the single source of truth.
