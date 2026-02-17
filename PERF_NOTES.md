# PERF NOTES

## What changed

- Moved drag motion updates from React state to imperative Konva node updates in `src/canvas/KonvaCanvasRoot.jsx`.
- Added `id -> Konva.Group` refs and `id -> position` cache so drag moves update node `x/y` directly.
- Drag move now applies a delta to all selected dragged ids and calls batched layer draw (`batchDraw` via `requestAnimationFrame`).
- React state is committed once on drag end through `onItemDragEnd(..., { ids, positions })`.
- Prevented click-selection toggles after drag via a short-lived click suppression set.
- Added snapping gate rule: snapping math runs only when dragged selection size is `<= 8`; disabled when `> 8`.
- Split field rendering into a non-interactive background layer (`listening={false}`, `hitGraphEnabled={false}`).
- Kept guides/marquee as non-interactive layers.
- Disabled `perfectDrawEnabled` on heavy shapes (`Circle`, `Text`, `KonvaImage`) to reduce draw overhead.
- Playback/scrub visual updates are applied imperatively from `liveSnapshotRef` to Konva node refs, avoiding per-frame React position commits.
- App now commits live playback positions back to canonical React state when playback transitions from playing to paused, and before drag edits begin.

## Why this helps

- Removes per-frame `setPlayersById` / `setBall` churn during drag and playback.
- Keeps React as canonical state but avoids using it as the per-frame transport for animation.
- Uses Konva's fast imperative path (`node.position`, layer `batchDraw`) for high-frequency updates.
- Preserves existing timeline ownership (`timePercent` remains app-level) and keyframe/control behavior.

## Manual tests

1. Drag 1 player:
- Pause playback.
- Drag one player around.
- Verify motion is smooth and selection does not toggle on drag end.
- Verify position persists after releasing.

2. Drag 10 selected items:
- Multi-select at least 10 players.
- Drag as a group.
- Verify smooth motion and that snapping is disabled for this drag.
- Repeat with 8 selected and verify snapping still works.

3. Play animation:
- Import a play with many keyframes/tracks.
- Press Play.
- Verify smooth movement without jitter.

4. Scrub timeline:
- While paused, scrub across the ControlPill timeline.
- Verify positions update smoothly.
- Start a drag after scrubbing and confirm edited positions are correct.

5. Import play:
- Import `test4.json` (or equivalent v1.0.0 file).
- Verify markers, playback, and scrubbing still function.

6. Export play:
- Export current play.
- Re-import exported JSON.
- Verify timeline and movement behavior are unchanged.
