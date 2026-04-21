# PlayPreviewPlayer

## What was implemented

A new `PlayPreviewPlayer` component wraps `PlayPreviewCard` with a `ViewOnlyControls`-style overlay — a bottom-gradient bar with a scrubber, play/pause button, and time display. It is used on the single-play view pages (`app/plays/:id` and `/shared/:token`) where coaches and players want to interactively preview a play before opening the full Slate editor.

The `PlayPreviewCard` component was also updated to:
- Accept a `controlledTimeMs` prop — when provided, it skips its internal RAF loop and renders at the parent-supplied time
- Use `play.playback.speedMultiplier` (with formula `(0.25 + (mult/100) * 3.75) * 3`) instead of a hardcoded `1.5x` rate for all existing autoplay usages

## How it works

### PlayPreviewPlayer
- Owns a RAF loop + `isPlaying` / `timeMs` state
- Passes `controlledTimeMs={timeMs}` and `autoplay="off"` to `PlayPreviewCard` — the card renders whatever time the player dictates
- Scrubber uses the same custom pointer-capture approach as `ViewOnlyControls`: imperative DOM updates via refs (`fillRef`, `thumbRef`) so the bar updates every animation frame without triggering React re-renders
- Playback rate is read from `playData.play.playback.speedMultiplier`; falls back to 50 (the app-wide default) when absent

### Overlay layout
- `relative` wrapper → `absolute inset-0` overlay with `pointer-events-none` container
- Only the bottom control bar has `pointer-events-auto`
- `rounded-xl overflow-hidden` on the overlay clips the gradient to match the card's border radius

## Key decisions

- **Separate component, not added to PlayPreviewCard** — PlayPreviewCard is used in ~10 places (grid cards, landing page, admin, modals). Adding interactive controls there would bloat all those callsites and introduce unnecessary state. PlayPreviewPlayer is used only where full controls are wanted.
- **Imperative scrubber** — Matches ViewOnlyControls. A native `<input type="range">` would re-render the component on every drag event; the imperative approach keeps the scrubber smooth even on low-end devices.
- **No speed slider in the overlay** — The preview player shows the play at its saved speed (read-only). Speed editing belongs in the Slate editor.

## Files changed

| File | Change |
|---|---|
| `src/components/PlayPreviewCard.jsx` | Added `controlledTimeMs` prop; fixed internal playback rate |
| `src/components/PlayPreviewPlayer.jsx` | New component |
| `src/pages/app/PlayView.jsx` | Uses PlayPreviewPlayer instead of PlayPreviewCard |
| `src/pages/SharedPlay.jsx` | Uses PlayPreviewPlayer instead of PlayPreviewCard |
| `admin/test/playPreviewPlayer.test.js` | Tests for speed formula, time formatting, controlled-time logic |
