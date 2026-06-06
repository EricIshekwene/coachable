# Mobile Editor — Admin Sandbox

## Status: Feature-complete, admin-gated (not mounted for end users)

Two admin entry points, both requiring an admin session from `/admin`:

1. **`/admin/mobile-view`** — a blank touch-first sandbox (`AdminMobileView`) for trying
   the layout in isolation.
2. **`/admin/plays/:playId/edit`** (`AdminPlayEditPage`) — the real admin play editor now
   renders the **same** mobile layout **responsively**: at ≤ 767px it flips
   `mobileLayout` on the *existing* `<Slate>` instance. Open a play on desktop, switch to
   an iPhone viewport, and it is the same play — no remount, no reset, same autosave/flush
   path (see "Data integrity" below).

The real-*user* small-screen path (`/app/plays/:id/edit`) is still **view-only** via
`MobileViewOnlyGate` — this editor is intentionally *not* wired in for end users yet.

### Data integrity (why switching/leaving never breaks the play)
- The viewport breakpoint only toggles the `mobileLayout` **prop** on one persistent
  `<Slate>` element. React updates it in place, so players, ball, keyframes, drawings,
  undo history, and camera all survive a resize — there is no remount.
- Saving is layout-independent: mobile edits mutate the same Slate state, and
  `buildPlayExport` serialises **all** of it (not just what the mobile UI shows), so the
  saved `playData` is structurally identical to a desktop save — nothing is dropped.
- The mobile **Back** button (top-left, shown only when the host passes `onNavigateHome`)
  calls the editor's flush-then-navigate handler, so leaving always persists first. The
  existing `beforeunload` / `visibilitychange` flush still covers browser-back and tab
  close.

---

## What it is

The full Slate play editor rendered in a touch-first layout. `AdminMobileView`
mounts `<Slate mobileLayout adminMode testVariant />`; when `mobileLayout` is true,
Slate:

- hides the desktop left sidebar (`WideSidebar`) and right panel (`RightPanel`),
- swaps `ControlPill` for `MobileEditorBar`,
- suppresses the floating annotation `DrawToolsPill` (the mobile Draw sheet replaces it),
- shows a single floating **context pill** for placement/selection states,
- never forces view-only regardless of screen width.

The desktop editor is untouched — every `mobileLayout` branch defaults to `false`.

---

## Layout

```
┌───────────────────────────────────────────────┐
│ Tools  Add  Players  Draw  Prefabs  Export  More│ ← top tab bar (fixed, scrolls)
├───────────────────────────────────────────────┤
│            (a tab opens a drop-down sheet)      │
│                                                 │
│                    CANVAS                       │
│         (full-bleed; chrome floats over it)     │
│                                                 │
├───────────────────────────────────────────────┤
│  ▶  0:05  ━━━●━━━━━━━━━━━━━  ◆ ◆ ◆      + / ✕ │ ← bottom timeline (fixed)
└───────────────────────────────────────────────┘
```

### Tabs → sheets ([MobileEditorBar.jsx](../components/MobileEditorBar.jsx))

| Tab | Contents |
|---|---|
| **Tools** | Tool picker (Select / Pan / Draw), Undo/Redo/Reset, Zoom ±, **Field** (rotate L / straighten / rotate R, flip X / flip Y) |
| **Add** | Add Player / Add Ball / Add Cone (arms tap-to-place) |
| **Players** | Player-size slider, **Position** editor for the single selected item (X/Y + align), player list with select / rename / number / **colour** / hide / delete |
| **Draw** | Arms the pen tool + sub-tool picker (Pen / Arrow / Text / Shape / Erase / Select) and style (colour swatches + custom, stroke width, opacity) |
| **Prefabs** | Published presets + your prefabs; tap to arm placement |
| **Export** | Play name, Save to Playbook, Export Image (PNG), Export Video, Download JSON, Import Play |
| **More** | Advanced settings (pitch / players / ball / animation), Autoplay, Playback speed, Reset to default |

A selected single item also surfaces the **context pill** (number/name, quick colours,
delete; "Save Group" when 2+ are selected) just below the tab bar.

### Bottom timeline ([MobileTimeline in MobileEditorBar.jsx](../components/MobileEditorBar.jsx))
Play/pause, touch scrubber (RAF-driven for 60 fps without per-frame React renders),
draggable keyframe diamonds (tap to select, drag to move — the first keyframe is locked),
and an add/delete-keyframe button that swaps based on whether the playhead is on a keyframe.

---

## Touch model (1 finger = manipulate, 2 fingers = navigate)

Implemented in [KonvaCanvasRoot.jsx](../canvas/KonvaCanvasRoot.jsx), gesture math
extracted to the pure, unit-tested [touchGestures.js](../canvas/touchGestures.js):

- **One finger on an object** → drag it (Konva draggable).
- **One finger on empty canvas** → marquee-select. A near-zero marquee on release is
  treated as a tap → deselect all (so there is no separate tap-to-deselect path).
- **Two fingers** → pan (camera follows the two-finger midpoint) **and** pinch-zoom,
  simultaneously. The second finger cancels any single-finger marquee/pan the first
  finger began.
- The explicit **Pan tool** still gives one-finger panning as an escape hatch.

This is a deliberate change from the previous "one finger pans, hold to marquee" model
(the old ambiguity where one finger both panned and dragged). It matches the
1-finger-drag / 2-finger-pan convention of design/whiteboard apps.

---

## Safe areas & keyboard

- Top bar, bottom timeline, and sheets all use `env(safe-area-inset-*)`.
- The context pill is offset by `calc(env(safe-area-inset-top) + 4.25rem)` so it clears
  the notch + the fixed tab bar.
- Sheets cap their height against `--app-viewport-height` (kept current by
  `installMobileViewportFixes`, which also scrolls focused inputs into view when the
  on-screen keyboard appears).

---

## Feature parity with the desktop Slate

Reachable on mobile: add/select/move players, ball, cones; keyframes + timeline; play/
pause/scrub/speed; prefabs (place, save group, delete); annotation drawing (pen/arrow/
text/shape/erase) with colour/width/opacity; field rotate + flip; selected-item
position/align; per-player colour/rename/number/hide; player size; advanced settings
(incl. sport/field type); play name; Save to Playbook; Import/Download JSON; Export
Image/Video; zoom; pan; undo/redo/reset.

### Known gaps / deferred
- **GIF export** is intentionally absent — it is not a user-facing export on desktop
  either (only the `/admin/gif-test` page uses the GIF encoder). Image + Video match the
  desktop `ExportModal`.
- **Recording mode** is skipped on mobile (`MobileEditorBar` is gated on
  `!recording.recordingModeEnabled`); it is still in progress on desktop.
- **Motion-drawing mode** (`/admin/drawing` scope) and **fine-grained drawing styles**
  (font size, arrow-head type, shape type, eraser size, smoothing) use desktop defaults
  on mobile; only the high-traffic style controls are exposed.
- The canvas is **full-bleed** under the floating chrome rather than inset between the
  bars; the field is reachable via pan/zoom. Insetting would be the next polish step.

---

## How to test
1. Go to `/admin`, log in with the admin password.
2. Navigate to `/admin/mobile-view`.
3. Chrome DevTools → device toolbar (or a real phone). Verify: tap-to-place from Add,
   one-finger drag of a player, two-finger pan + pinch-zoom, marquee on empty space,
   each tab's sheet, scrubbing + keyframe drag, draw a stroke and change its colour/width,
   rotate/flip the field, edit a player's position, save/export.

Unit tests for the gesture math: [admin/test/mobileTouchGestures.test.js](../../admin/test/mobileTouchGestures.test.js).
