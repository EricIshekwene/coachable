# View-Only Playback — Bottom Occlusion + Autoplay Fix

## The problems

On shared/view-only play pages (`/shared/:token/view` via `SharedPlayView.jsx`,
and `/app/plays/:playId/view` via `PlayViewOnlyPage.jsx`), the Slate editor
(`src/features/slate/Slate.jsx`) always renders `ViewOnlyControls.jsx` as the
bottom playback bar in view-only mode (`ControlPill.jsx`, the full editing
timeline, is unreachable there — its render branch requires the view-only
overlay to be off, which never happens once `viewOnly` is true from mount).

1. **Occlusion**: `ViewOnlyControls` renders as an `absolute inset-0` overlay
   on top of the same container the canvas fills. Its bottom section (progress
   bar, time, play/pause, speed, loop toggle) sits directly over the canvas
   with no reserved space, so any play with player/ball movement toward the
   bottom of the field rendered underneath the control bar — exactly where a
   lot of route/motion action tends to end up.
2. **No autoplay-on-load**: `isPlaying` always starts `false` and nothing
   auto-started playback for view-only pages. Looping *was* already wired up
   (`autoplayEnabled` defaults `true`, and `engine.setLoop(autoplayEnabled)`
   makes the animation repeat once it's played once) — but a viewer opening a
   shared link had to notice and press the play button themselves, adding
   friction to the "share a link" flow.

## The fix

### Bottom safe-zone (occlusion)
- `ViewOnlyControls.jsx` now measures its own bottom bar's rendered height via
  a `ResizeObserver` and reports it through a new `onBottomBarHeightChange`
  prop.
- `Slate.jsx` stores that height (`viewOnlyBottomBarHeight`) and passes it to
  `KonvaCanvasRoot` as `viewOnlyBottomInset` (only while the view-only overlay
  is actually showing; `0` otherwise).
- `KonvaCanvasRoot.jsx`'s canvas container (the element the `ResizeObserver`-driven
  `size` state is measured from) now takes an inline `bottom` offset equal to
  that inset, overriding its `inset-0` utility class on just that edge. This
  shrinks the canvas's own rendering box so the field's visible area — and the
  camera's vertical center — automatically shifts up to leave exactly the
  right amount of room, without needing to touch any fit/zoom math. The
  `ViewOnlyControls` overlay itself is untouched and keeps spanning the full
  screen, so the bar still floats at the true bottom edge as before.

### Autoplay-on-load (friction)
- New opt-in `autoplayOnLoad` prop on `Slate`. A dedicated effect starts
  playback exactly once, but only after the imported play data has loaded
  *and* it actually contains motion (at least one track with more than a
  single keyframe) — a static play never auto-starts a no-op timer.
- Wired on in `SharedPlayView.jsx` (the shared-link viewing page) only, since
  that's the specific "remove friction from sharing a link" case. Looping
  needed no change — it was already on by default, so playback repeats once
  it starts.

## Tests

- `admin/test/sharedPlayViewport.test.js` mirrors the pure decision logic that
  can't be exercised without a real layout engine (jsdom has no
  `ResizeObserver` / real box metrics): the `hasMotion` autoplay gate, and the
  `viewOnlyBottomInset` / container `bottom` style branches.
