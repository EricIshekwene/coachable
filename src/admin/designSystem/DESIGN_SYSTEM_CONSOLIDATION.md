# Design System Consolidation — Implementation Notes

## What was implemented

This pass completed all non-canvas/non-Slate axes of the design system consolidation roadmap. The goal: make `/admin/design-rules` the single source of truth for every design decision, with every token derived from one canonical source in `src/index.css`.

## Shared design tokens added to `src/index.css`

### `:root` block (not in `@theme` — avoids overriding Tailwind's built-in utilities)

```css
/* Radius scale */
--radius-sm:   6px;
--radius-md:   8px;
--radius:     10px;
--radius-lg:  14px;
--radius-xl:  18px;
--radius-pill: 9999px;

/* Shadow scale — dark defaults, light overrides in the light-mode block */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
--shadow:    0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.25);
--shadow-lg: 0 20px 48px rgba(0,0,0,0.34), 0 8px 20px rgba(0,0,0,0.24);

/* Icon sizes */
--icon-sm: 14px;   --icon-md: 16px;   --icon-lg: 20px;
```

### `@theme` block (creates Tailwind utilities)

```css
--duration-fast: 150ms;   /* → duration-fast Tailwind class */
--duration-base: 200ms;   /* → duration-base */
--duration-slow: 300ms;   /* → duration-slow */
--ease-standard: ease-out;
--z-sticky:  40;           /* → z-sticky Tailwind class */
--z-overlay: 30;
--z-modal:   50;
--z-toast:   99;
```

### Light-mode shadow overrides

Added to the existing `[data-theme="light"] .app-themed, [data-admin-theme="light"]` block so `var(--shadow)` automatically resolves to the right values for each theme.

## `src/admin/admin.css` changes

All `--adm-radius*` and `--adm-shadow*` tokens now alias the shared scale:

```css
--adm-radius:    var(--radius);
--adm-radius-sm: var(--radius-sm);
/* ... etc. */
--adm-shadow:    var(--shadow);
--adm-shadow-sm: var(--shadow-sm);
--adm-shadow-lg: var(--shadow-lg);
```

Both dark and light admin theme blocks were updated. The light shadow values cascade correctly because `[data-admin-theme="light"]` in `index.css` overrides `--shadow*` before admin.css aliases them.

## App chrome color migration

Replaced hardcoded `#FF7A18` / `#4FA85D` / `#121212` / `#9AA0A6` with CSS vars or Tailwind Brand* classes in:

| File | Change |
|---|---|
| `pages/PlayEditPage.jsx` | Spinner, bg, text → BrandOrange, BrandBlack, BrandGray |
| `pages/PlayViewOnlyPage.jsx` | Same |
| `pages/SharedPlayView.jsx` | Same + `bg-[#FF7A18]` button → `bg-BrandOrange` |
| `pages/SportPickerPage.jsx` | Selection colors → `var(--color-BrandOrange)` + `color-mix()` |
| `pages/app/Playbooks.jsx` | Active tab color → `var(--color-BrandOrange)` |
| `pages/app/Notifications.jsx` | Star rating fill → `var(--color-BrandOrange)` |
| `components/MobileEditorBar.jsx` | Active swatch ring → `var(--color-BrandOrange)` |
| `components/rightPanel/DrawingStyleSection.jsx` | Active selection ring, SVG arrow colors |
| `components/subcomponents/ColorPickerPopover.jsx` | Inline CSS label/bg colors |
| `components/subcomponents/sliderStyles.js` | MUI slider sx colors |

**Intentionally left as-is** (data defaults feeding into Konva canvas — canvas migration is excluded):
- `AdvancedSettings.jsx` — `#4FA85D` pitch color default
- `MobileEditorBar.jsx` — `#4FA85D` pitch color default  
- `PitchSettingsSection.jsx` — `#4FA85D` preset color
- `PlayPreviewCard.jsx` — `#4FA85D` pitch default
- `StepTrack.jsx` — `#FF7A18` player color default
- `RecordingTimelinePill.jsx` — entity color fallback
- `DrawingObjectsList.jsx` — entity color fallback

Also left: `Landing.jsx` marketing SVG paths, `AdminOnePage.jsx` (intentional exclusion per roadmap).

## Design system sections updated

- **SpacingSection.jsx** — token table rows show actual CSS var names (`--radius-*/--adm-radius-*`, `--shadow-*/--adm-shadow-*`, `--z-*`, `--duration-*`); Motion section note explains Tailwind integration.
- **MotionSection.jsx** — timing table references `--duration-*` token names; live tiles now use `duration-fast` Tailwind class and `var(--color-BrandOrange)` instead of hex.

## Guard tests extended

`admin/test/designTokenUnification.test.js` now also asserts:
- `index.css` defines the canonical radius scale (`--radius-sm/md/lg/xl`)
- `index.css` defines the canonical shadow scale
- `index.css` defines motion tokens in `@theme`
- Every `--adm-radius*` and `--adm-shadow*` in admin.css matches `var(--radius*/--shadow*)`

All 22 tests pass.

## What's still remaining (see CONSOLIDATION_ROADMAP.md)

- **Typography tokens** — no `--text-*` CSS var scale yet; sections document sizes via Tailwind classes
- **Spacing tokens** — no `--space-*` CSS vars; Tailwind spacing classes used throughout
- **Canvas/Slate color migration** — requires `canvasColors.js` JS module; explicitly excluded from this pass
- **Shared-primitive extraction** — app and admin buttons/inputs not yet unified
- **App hex lint guard** — no automated test scanning `src/` for raw brand hex in non-excluded files yet
