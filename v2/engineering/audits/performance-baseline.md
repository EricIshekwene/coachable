# Frontend Performance Baseline

**Last updated:** June 2026

Two workstreams feed this document:
- **TODO 4.5** — Lighthouse scores and Vite bundle output as the pre-optimization v2 baseline
- **TODO 7.1** — MUI removal gap analysis and confirmation that v2 starts without it

---

## v1 Bundle Reference

Single monolithic JS chunk — no `React.lazy()`, no code splitting. Every page (landing, auth, app, admin, editor) is bundled together. A visitor to the landing page downloads the full Slate editor, all admin pages, and MUI.

| Asset | Raw | Gzipped |
|---|---|---|
| `index.js` (main bundle) | 2,919 kB | 796 kB |
| `index.css` | 148 kB | 22 kB |

Root cause documented in `v2/engineering/audits/landing-performance-diagnosis.md`: 40+ static `import` statements in `App.jsx`, no `React.lazy()` anywhere.

---

## MUI Removal — Gap Analysis (TODO 7.1)

### What MUI was used for in v1

MUI's entire role in v1 was a single component: **`Slider`** from `@mui/material`.

10 files import it — all in the play editor layer (v2: `src/slate/`):

| File | Slider purpose |
|---|---|
| `controlPill/SpeedSlider.jsx` | Animation playback speed |
| `advancedSettings/BallSettingsSection.jsx` | Ball size |
| `advancedSettings/PitchSettingsSection.jsx` | Pitch opacity |
| `advancedSettings/PlayerSettingsSection.jsx` | Default player size |
| `rightPanel/AllPlayersSection.jsx` | Per-player size |
| `rightPanel/DrawingStyleSection.jsx` | Drawing stroke width |
| `rightPanel/RecordingModeToggle.jsx` | Recording duration |
| `ViewOnlyControls.jsx` | Playback speed (view-only mode) |
| `ExportModal.jsx` | Export quality / frame rate |
| `MobileEditorBar.jsx` | Speed control on mobile |

No other MUI components were ever used. No Button, TextField, Modal, DataGrid, DatePicker, Autocomplete, or any other MUI component appears anywhere in v1.

### MUI theming status

None. No `ThemeProvider`, no `createTheme`, no custom theme object. The only styling was a single shared `sx` object (`BRAND_SLIDER_SX`) applying brand orange to the track, thumb, and rail — a direct CSS mapping that translates cleanly to `--ui-accent` tokens in v2.

### Packages excluded with MUI

| Package | Version | Disk size | Status in v2 |
|---|---|---|---|
| `@mui/material` | 7.3.7 | 5,565 KB | Excluded |
| `@mui/system` | 7.3.7 | 659 KB | Excluded |
| `@mui/utils` | 7.3.7 | 284 KB | Excluded |
| `@mui/private-theming` | 7.3.7 | 72 KB | Excluded |
| `@mui/styled-engine` | 7.3.7 | 93 KB | Excluded |
| `@mui/types` | 7.4.10 | 71 KB | Excluded |
| `@emotion/react` | 11.14.0 | 798 KB | Excluded |
| `@emotion/styled` | 11.14.1 | 241 KB | Excluded |
| **Total** | | **7,783 KB** | **All excluded** |

`@emotion/react` and `@emotion/styled` are MUI's peer dependencies. They have no other use in v1 and both leave with MUI.

### Estimated bundle impact

MUI's tree-shaken contribution for a Slider-only import is approximately 400–600 kB raw (130–180 kB gzipped), or roughly 16–22% of the v1 gzipped JS payload. Even with only `Slider` imported, the full MUI theme system is included because MUI's architecture routes everything through `@mui/system` and the emotion runtime regardless of which components are used. The v2 baseline measurement below is the definitive "without MUI" reference.

### What v2 replaces the Slider with

**`src/ui/Slider`** — a shared primitive in the component library, not editor-internal. It lives in `src/ui/` rather than `src/slate/` so non-editor surfaces can use it without a refactor.

**Accessibility the v2 Slider must match** (MUI provides all of these):

| Behavior | Requirement |
|---|---|
| `role` | `role="slider"` on the interactive element |
| Value ARIA | `aria-valuemin`, `aria-valuemax`, `aria-valuenow` updated on every change |
| Orientation | `aria-orientation="horizontal"` by default |
| Label | `aria-label` or `aria-labelledby` passed through from the consumer |
| Arrow keys | `ArrowLeft` / `ArrowRight` / `ArrowUp` / `ArrowDown` — ±1 step |
| Home / End | Jump to minimum / maximum |
| Page Up / Down | ±10% of the full range |
| Focus ring | `outline: 2px solid var(--ui-accent); outline-offset: 2px` on `:focus-visible` |
| Reduced motion | No transition on thumb position at `prefers-reduced-motion: reduce` |

**Visual spec** (from `BRAND_SLIDER_SX` in v1, mapped to v2 tokens):

| Element | v1 value | v2 token |
|---|---|---|
| Track color | `var(--color-BrandOrange)` | `var(--ui-accent)` |
| Thumb color | `var(--color-BrandOrange)` | `var(--ui-accent)` |
| Rail color | `rgba(75, 81, 87, 0.3)` | `var(--ui-border)` at 30% opacity |
| Track height | 3px | 3px |
| Thumb size | 14 × 14px | 14 × 14px |
| Thumb hover ring | BrandOrange 15% opacity, 6px spread | `var(--ui-accent)` 15% opacity, 6px spread |
| Thumb active ring | BrandOrange 20% opacity, 8px spread | `var(--ui-accent)` 20% opacity, 8px spread |

**component-specs.md gap:** Sessions 6.1 and 6.2 specify Button, Input, Modal, and Toast. No Slider entry exists. A Slider section must be added to `v2/design/component-specs.md` before `src/ui/Slider` is built.

### Done criteria for TODO 7.1

- [ ] `@mui/material` absent from `package.json`
- [ ] `@emotion/react` absent from `package.json`
- [ ] `@emotion/styled` absent from `package.json`
- [ ] No `@mui` imports anywhere in `src/`
- [ ] `src/ui/Slider` exists and is registered in `src/admin/pages/AdminDesignSystem.jsx`
- [ ] Slider spec added to `v2/design/component-specs.md`
- [ ] v2 bundle size recorded in the section below

---

## v2 Bundle Baseline (TODO 4.5) — To Be Measured

Record these values once the v2 repo has a working build. Run `npm run build` in the v2 root.

### Targets

- No monolithic chunk. Every route is lazy-loaded per `v2/engineering/planning/routing.md`.
- `@ffmpeg/core` must not appear in the initial bundle — lazy-loaded only when the GIF export modal opens.
- `@mui` and `@emotion` packages must not appear in `package.json`.

### Measurements

| Metric | v1 actual | v2 target | v2 actual |
|---|---|---|---|
| Main JS chunk (raw) | 2,919 kB | < 500 kB | — |
| Main JS chunk (gzip) | 796 kB | < 150 kB | — |
| CSS (gzip) | 22 kB | < 25 kB | — |
| Largest single chunk | 2,919 kB | < 500 kB | — |
| `@mui` in bundle | Yes | No | — |
| `@emotion` in bundle | Yes | No | — |
| `@ffmpeg/core` in initial load | Yes (eager) | No (lazy only) | — |

**How to measure:** Run `npm run build` and record the Vite output. For a visual breakdown, add `rollup-plugin-visualizer` temporarily as a dev dependency:

```js
// vite.config.js (remove after measuring)
import { visualizer } from 'rollup-plugin-visualizer';
plugins: [react(), visualizer({ open: true })]
```

---

## Lighthouse Baseline (TODO 4.5) — To Be Measured

Run against the `coachable-v2-dev` Railway deployment once the app is live. Use Chrome DevTools Lighthouse — Mobile preset, Fast 3G throttling, 4× CPU slowdown.

Run against two routes:
- Landing page (`/`) — unauthenticated cold load
- Plays list (`/plays`) — authenticated, after login

### Targets

From `v2/engineering/audits/landing-performance-diagnosis.md`:

| Metric | Target | v2 actual (landing) | v2 actual (app) |
|---|---|---|---|
| LCP | < 2.5 s | — | — |
| CLS | < 0.1 | — | — |
| TBT | < 200 ms | — | — |
| FCP | < 1.8 s | — | — |

### v1 landing page context

LCP not formally measured. Known root causes: ~19.5 MB of PNG images loaded on first paint, no lazy loading, no `fetchpriority` on the LCP element, no code splitting, video element buffering on load. Full analysis in `v2/engineering/audits/landing-performance-diagnosis.md`.

---

## Cross-Reference Notes

**Feeds into:**
- `v2/design/component-specs.md` — Slider spec must be added before `src/ui/Slider` is built
- `v2/engineering/planning/routing.md` — lazy-loading architecture determines how chunks split in the v2 bundle

**References:**
- `v2/engineering/audits/landing-performance-diagnosis.md` — v1 root cause analysis and fix plan
- `v2/engineering/audits/design-system-unification-attempt.md` — prior attempt at MUI removal; token vocabulary from that branch is carried forward
