# Color Semantics — `--ui-*` Token Reference

**Status:** Authoritative. Dark defaults live in `:root` in `src/index.css`. Light overrides live in `[data-theme="light"] .app-themed, [data-admin-theme="light"]`.

**Scope:** Every app and admin surface. Tokens are referenced via `var(--ui-accent)` etc. — not as Tailwind utilities (the `--ui-*` layer is not registered in `@theme`).

---

## Architecture note

The `--ui-*` tokens are a semantic layer on top of the Brand primitives defined in `@theme`. Brand primitives are raw values (e.g. `BrandOrange: #FF7A18`); semantic tokens carry meaning and may intentionally diverge. The one known divergence: dark `--ui-accent` is `#F97316` (not `#FF7A18`) — slightly deeper for better vibrancy on near-black surfaces.

Light mode is triggered by data attribute, not `prefers-color-scheme`. The selector is:
```css
[data-theme="light"] .app-themed,
[data-admin-theme="light"]
```

---

## Background tokens

| Token | Dark | Light | Role |
|---|---|---|---|
| `--ui-bg` | `#0D0D0D` | `#FBFBFC` | Page/canvas background. Also used on `html` and `body`. |
| `--ui-surface` | `#141516` | `#FFFFFF` | Card and panel background. In light mode, cards lift off the page bg with a visible white surface. |
| `--ui-surface-raised` | `#181A1D` | `#FFFFFF` | Floating elements only: modals, dropdowns, popovers. |
| `--ui-surface-muted` | `#202328` | `#F4F5F7` | Disabled backgrounds, skeleton loaders, inactive inputs. Not for elevation. |

**Usage rules:**
- Cards in a list: `--ui-surface` background + 1px `--ui-border`. No shadow in dark mode.
- Floating elements (modal, dropdown): `--ui-surface-raised` + `--shadow-lg`.
- Never use `--ui-surface-muted` for a card that is merely secondary or lower-priority — it is for disabled/inactive state only.

---

## Border tokens

| Token | Dark | Light | Role | Contrast vs bg |
|---|---|---|---|---|
| `--ui-border` | `#343A40` | `#E1E4EA` | Default border for cards, inputs, dividers | Dark: 2.2:1 (non-text, 3:1 required for UI components) — used at 1px only where the context provides additional visual cues |
| `--ui-border-strong` | `#4B5563` | `#7C8794` | Emphasized borders: focused inputs, active outlines | Dark: 3.1:1 ✓ |

**Usage rules:**
- All borders are 1px. No exceptions (see `general-formatting-standards.md` §04).
- Focus ring: `outline: 2px solid var(--ui-accent); outline-offset: 2px` — not `--ui-border-strong`.
- `--ui-border-strong` is for input hover borders and section separators that need more weight.

---

## Text tokens

| Token | Dark | Light | Role | WCAG on bg |
|---|---|---|---|---|
| `--ui-text` | `#F5F7FA` | `#1A1A1A` | Primary text — body, headings, labels | Dark: ~15:1 ✓✓ · Light: ~18:1 ✓✓ |
| `--ui-text-muted` | `#A3AAB3` | `#4B5563` | Secondary text — descriptions, subtitles, placeholder | Dark: 8.3:1 ✓✓ · Light: 7.0:1 ✓✓ |
| `--ui-text-subtle` | `#747C87` | `#6B7280` | Tertiary text — timestamps, metadata, captions | Dark: 5.0:1 ✓ · Light: 4.6:1 ✓ |

**Usage rules:**
- `--ui-text-subtle` passes AA at all sizes (≥4.5:1) but has no margin. Do not use it for any text that must also pass AAA.
- Map to typography levels: headings and body-strong → `--ui-text`; secondary labels → `--ui-text-muted`; captions and timestamps → `--ui-text-subtle`.

---

## Accent tokens (orange)

| Token | Dark | Light | Brand primitive | Role |
|---|---|---|---|---|
| `--ui-accent` | `#F97316` | `#FF7A18` | Diverges from `BrandOrange` in dark | Interactive fills: buttons, active nav, toggles, progress |
| `--ui-accent-hover` | `#FF8F3D` | `#E85D04` | — | Hover state on accent-filled elements |
| `--ui-accent-pressed` | `#E85D04` | `#C2410C` | — | Pressed / active state |
| `--ui-accent-muted` | `#2B1A10` | `#FFE4CC` | — | Tint background: selected nav item, tag fill |
| `--ui-accent-muted-hover` | `#3A2417` | `#FFD2A8` | — | Hover on accent-muted backgrounds |
| `--ui-accent-border` | `#7A3A0A` | `#FFB071` | — | Border on accent-muted surfaces |
| `--ui-accent-text` | `#FF9F50` | `#B84700` | — | Accent-colored text on neutral backgrounds |

**WCAG — key pairs:**
- Dark `--ui-accent-text` (#FF9F50) on `--ui-bg` (#0D0D0D): 7.7:1 ✓✓
- Light `--ui-accent-text` (#B84700) on `--ui-bg` (#FFFFFF): 4.9:1 ✓ (confirmed)
- `--ui-accent` itself is NOT for text — it is a fill color. In light mode it is ~2.9:1 on white, which fails AA for text. Always use `--ui-accent-text` when you need orange text.

**Usage rules:**
- Active nav items: `--ui-accent-muted` background tint + `--ui-accent-text` label. This is the only place a background tint is allowed on active state.
- Ghost/icon-only buttons: color change to `--ui-accent` on hover.
- Dark mode `--ui-accent` (#F97316) intentionally differs from `BrandOrange` (#FF7A18). This is documented — do not normalize them.

---

## Success tokens

| Token | Dark | Light | Role | WCAG on bg |
|---|---|---|---|---|
| `--ui-success` | `#22C55E` | `#16A34A` | Success fill: icon color, progress bar | Decorative fill — not used as text |
| `--ui-success-muted` | `#0F2A1A` | `#DCFCE7` | Success tint background | — |
| `--ui-success-text` | `#4ADE80` | `#166534` | Success text and icon on neutral bg | Dark: 11.5:1 ✓✓ · Light: 7.2:1 ✓✓ (confirmed) |

**Usage rules:**
- `--ui-success` is for icons and fills. Use `--ui-success-text` for any text that conveys success state.
- Always pair success color with a text label or icon — do not rely on color alone (WCAG SC 1.4.1).

---

## Error tokens

| Token | Dark | Light | Role | WCAG on bg |
|---|---|---|---|---|
| `--ui-error` | `#F04438` | `#DC2626` | Error fill: destructive button, alert icon | Decorative fill — not used as text directly |
| `--ui-error-muted` | `#2A1212` | `#FEE2E2` | Error tint background | — |
| `--ui-error-text` | `#F87171` | `#DC2626` | Error text: inline validation messages, error labels | Dark: 7.7:1 ✓✓ · Light: 5.25:1 ✓ |

**Usage rules:**
- `--ui-error-text` is safe for inline error text directly on `--ui-bg` in both modes — not restricted to `--ui-error-muted` backgrounds.
- Inline field error: red border (`--ui-error`) + error message text (`--ui-error-text`) below the field. Color alone is insufficient — text is required (WCAG SC 1.4.1).

---

## Warning tokens

| Token | Dark | Light | Role | WCAG on bg |
|---|---|---|---|---|
| `--ui-warning` | `#FBBF24` | `#D97706` | Warning fill: alert icon, badge background | Dark: 5.3:1 on `--ui-bg` — passes AA |
| `--ui-warning-muted` | `#2A1D08` | `#FEF3C7` | Warning tint background | — |
| `--ui-warning-text` | `#FCD34D` | `#B45309` | Warning text on neutral backgrounds | Dark: ~5.8:1 ✓ · Light: ~5.8:1 ✓ |

**Usage rules:**
- Dark `--ui-warning` (#FBBF24) technically passes AA (5.3:1 ≥ 4.5:1), but use `--ui-warning-text` (#FCD34D) for text — it is the semantic role for that purpose.
- `--ui-warning` is the icon and fill color. Keep roles consistent even when contrast permits crossing them.

---

## Info tokens

| Token | Dark | Light | Role | WCAG on bg |
|---|---|---|---|---|
| `--ui-info` | `#3B82F6` | `#3B82F6` | Info fill: icon, badge | Decorative fill — not for text |
| `--ui-info-muted` | `#101E35` | `#DBEAFE` | Info tint background | — |
| `--ui-info-text` | `#93C5FD` | `#1D4ED8` | Info text on neutral backgrounds | Dark: 10.8:1 ✓✓ · Light: 7.5:1 ✓✓ |

---

## Admin coverage

`--ui-*` tokens are in `:root` and apply globally, including admin surfaces. `[data-admin-theme="light"]` is included in the light override selector so admin light mode resolves the same semantic tokens. `admin.css` may alias `--ui-*` values into admin-specific names if needed, but must not redefine the base tokens.

---

## Quick reference — when to use which text token

| Scenario | Token |
|---|---|
| Primary body text, headings, button labels | `--ui-text` |
| Descriptions, subtitles, secondary labels | `--ui-text-muted` |
| Timestamps, metadata, captions | `--ui-text-subtle` |
| Orange/accent-colored text | `--ui-accent-text` |
| Success message text | `--ui-success-text` |
| Inline error message | `--ui-error-text` |
| Warning label | `--ui-warning-text` |
| Info label | `--ui-info-text` |

## Never do

- Use `--ui-accent` (fill color) as a text color — it fails AA in light mode.
- Use `--ui-surface-muted` for cards that are merely secondary — muted is disabled/inactive only.
- Use `--ui-warning` as text when you could use `--ui-warning-text`.
- Set shadow on dark-mode cards — shadow is reserved for floating elements.
- Reference these tokens as Tailwind utilities (e.g. `bg-ui-bg`) — they are not registered in `@theme`.

---

## Related docs

| Doc | What it covers |
|---|---|
| `design/color-palette.html` | Visual swatch reference for all `--ui-*` tokens — open in browser, toggle dark/light |
| `design/general-formatting-standards.md` | Spacing grid, typography scale, border rules, shadow, focus ring, motion — applies to every surface |
| `design/desktop/desktop-formatting-standards.md` | Desktop-exclusive layout rules (md breakpoint and above) |
| `design/mobile/mobile-formatting-standards.md` | Mobile-exclusive layout rules (below md breakpoint) |
| `design/accessibility-standards.md` | ARIA usage, keyboard patterns, focus management, live regions, testing |
| `src/index.css` | Source of truth for all token values — Brand primitives in `@theme`, semantic tokens in `:root` |

---

## Cross-Reference Notes

**This doc is the newest authoritative design token doc. It takes priority over older Brand-token references in the formatting docs.**

**Inconsistencies in other docs that need updating to match this doc:**

1. **`design/general-formatting-standards.md` §09 & Quick Reference** — Uses hex `#FF7A18` for focus ring. Update to `var(--ui-accent)` to match this doc's pattern. (Dark mode `--ui-accent` = `#F97316`, not `#FF7A18` — these differ in dark mode.)

2. **`design/general-formatting-standards.md` §08 (Active states)** — Says "no filled backgrounds." This doc (newer) says active nav items use `--ui-accent-muted` background tint. Add an explicit nav item exception to the general doc.

3. **`design/desktop/desktop-formatting-standards.md` §05 (Nav table)** — Active state row shows Background = "None". Update to `--ui-accent-muted` tint per this doc's accent usage rules.

4. **`design/mobile/mobile-formatting-standards.md` §03** — Says "No pills, no filled backgrounds." Update to allow `--ui-accent-muted` tint on active nav items per this doc.

5. **`design/desktop/desktop-formatting-standards.md` throughout** — Uses `BrandBlack2`, `BrandGray2`, `BrandText`, `BrandGray` as implementation values. Replace with `--ui-surface`, `--ui-border`, `--ui-text`, `--ui-text-muted` etc. when building components.

6. **`engineering/audits/design-system-unification-attempt.md`** — Branch used `--ui-danger` (error) and `--ui-surface-2` (raised). This doc uses `--ui-error` and `--ui-surface-raised`. Any code from that branch using old names must be updated.
