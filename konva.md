# Konva Migration Notes: Current Core Mechanics

This document summarizes how the app works today (canvas + control pill + timeline + data model) so you can map each part to Konva. It is based on the current implementation in `src/App.jsx` and `src/canvas/*`.

## 1. High-Level Architecture

The app is a React SPA with three big areas:

1. Canvas (field + players + ball) driven by a camera transform.
2. Control pill (timeline + keyframes + playback).
3. Side panels (tools, player list, zoom/rotate, settings, import/export).

The canvas uses pure DOM + CSS transforms today (no `<canvas>`). Interactions are pointer-based.

## 2. Core Data Model (App State)

Central state lives in `src/App.jsx` and is passed down:

- `playersById`: `{ [id]: { id, x, y, number, name, assignment, color } }`
- `representedPlayerIds`: list of IDs that are considered active/represented
- `ball`: `{ id, x, y }`
- `camera`: `{ x, y, zoom }`
- `fieldRotation`: degrees (0, 90, 180, -90)
- `selectedPlayerIds` and `selectedItemIds`
- `allPlayersDisplay`: `{ sizePercent, color, showNumber, showName }`
- `currentPlayerColor`: default color for new players
- `keyframes`: array of numbers in [0, 100]
- `keyframeSnapshots`: `{ [keyframeNumber]: { playersById, representedPlayerIds, ball } }`
- `timePercent`: current timeline position in [0, 100]
- Playback: `speedMultiplier`, `isPlaying`, `autoplayEnabled`, `loopSeconds`

The renderable canvas items are derived each render:

- `items = playersById -> [{ id, type: "player", x, y, ... }]` + `ball -> { id, type: "ball", x, y }`

## 3. Coordinate System

World coordinates are centered. (0,0) is the visual center of the board.

- +x: right
- +y: down
- Units: pixels
- Camera transform applied to all world content.

Mapping:

- World to screen: `(screenX, screenY) = center + camera.{x,y} + world * camera.zoom`
- Screen to world (used for add-player): `world = (screen - center - camera.{x,y}) / camera.zoom`

Field image is centered via CSS (`left: 50%`, `top: 50%`, translate(-50%, -50%)).

## 4. Canvas Rendering Pipeline (DOM Today)

Files:

- `src/canvas/CanvasRoot.jsx`
- `src/canvas/BoardViewport.jsx`
- `src/canvas/PanHandler.jsx`
- `src/canvas/WorldLayer.jsx`
- `src/canvas/FieldLayer.jsx`
- `src/canvas/ItemsLayer.jsx`
- `src/canvas/DraggableItem.jsx`
- `src/canvas/ItemVisual.jsx`

Pipeline:

1. `BoardViewport` is a clipped viewport (`position: relative`, `overflow: hidden`).
2. `PanHandler` captures pointer events for panning, marquee select, or add-player.
3. `WorldLayer` applies camera transform: `translate(camera.x, camera.y) scale(camera.zoom)` with origin center.
4. `FieldLayer` renders the field image (centered, rotated, pointer-events disabled).
5. `ItemsLayer` renders draggable items at world coordinates inside a center-origin wrapper.
6. `DraggableItem` updates world coordinates on drag, uses pointer deltas / zoom.
7. `ItemVisual` draws players (colored circles with text) and ball (image).

## 5. Canvas Interaction Behavior

### Tools

`canvasTool` is in `App.jsx` and can be:

- `hand`: pan the camera
- `select`: select/drag items or marquee-select
- `addPlayer` or `color`: click-to-add a player at pointer

### Panning (PanHandler)

- Active when tool is `hand` or middle mouse.
- Updates `camera.x` and `camera.y` with raw pointer delta (screen pixels).
- Calls `onPanStart` (which pushes camera history in App).

### Add Player (PanHandler)

- When tool is `addPlayer` or `color`, a left click on empty space adds a player.
- Screen -> world conversion uses camera/zoom (see Coordinate System above).

### Marquee Select (PanHandler)

- When tool is `select`, drag on empty space creates a selection box.
- On release, each item is projected to screen and checked against the marquee rectangle.

### Drag Item (DraggableItem)

- Only draggable when tool is `select`.
- Pointer delta in screen space converted to world delta by dividing by `camera.zoom`.
- Calls `onChange(id, next, meta)` with `meta.delta` for grouped movement.

### Multi-Select Movement (App)

If you drag a selected item and multiple items are selected:

- The delta is applied to all selected players.
- If the ball is selected, it moves too.

## 6. Control Pill (Timeline + Keyframes)

Files:

- `src/components/controlPill/ControlPill.jsx`
- `src/components/controlPill/TimePill.jsx`
- `src/components/controlPill/KeyframeDisplay.jsx`
- `src/components/controlPill/KeyframeManager.jsx`
- `src/components/controlPill/PlaybackControls.jsx`
- `src/components/controlPill/SpeedSlider.jsx`
- `src/components/controlPill/DropdownMenu.jsx`

Key behaviors:

- Timeline is 0-100 percent.
- Keyframes are numeric positions in 0-100.
- ControlPill is mostly controlled by App via callbacks (external time, speed, play state, etc.).
- Max keyframes = 30, minimum distance between keyframes = 2.

Interactions:

- Clicking the pill sets timePercent.
- Dragging the thumb updates timePercent.
- Clicking a keyframe selects it (and moves time).
- Add keyframe button creates a keyframe at current time (or selects nearby).
- Undo/redo in ControlPill only affects keyframes list (not full slate).

## 7. Keyframe Snapshots + Playback

The timeline links to actual positions via snapshots in `App.jsx`:

- `keyframes`: array of numbers
- `keyframeSnapshots`: object keyed by keyframe number (string)

When a keyframe is added, a snapshot of current slate is stored.

### Editing at a Keyframe

- When dragging items or editing players, `markKeyframeSnapshotPending` runs.
- After state change, the snapshot for the nearest keyframe is updated.

### Interpolation

When timePercent changes and nothing is actively being dragged:

- Find two bounding keyframes.
- Linearly interpolate `x, y` for all players and ball.
- For `representedPlayerIds`, pick previous snapshot if `t <= 0.5`, otherwise next snapshot.
- Apply interpolated state to the slate (`applySlate`).

### Playback

- `requestAnimationFrame` loops while `isPlaying` is true.
- `timePercent` increments based on `loopSeconds` and `speedMultiplier`.
- If `autoplayEnabled` is false, playback stops at 100.

## 8. Undo/Redo

There are two independent history stacks in `App.jsx`:

- Slate history (players + ball) via `historyPast/historyFuture`.
- Field history (camera + fieldRotation) via `fieldHistoryPast/fieldHistoryFuture`.

Item movement and player edits push slate history.
Camera changes push field history.

## 9. Import/Export Schema

See `src/utils/exportPlay.js` and `src/utils/importPlay.js`.

Export shape:

- `schemaVersion: "play-export-v1"`
- `play.settings`: advanced settings + display controls
- `play.canvas`: camera + fieldRotation + coordinate system
- `play.entities`: playersById + representedPlayerIds + ball
- `play.timeline`: keyframes + keyframeSnapshots + playback

Import validates schema and rebuilds internal state.

## 10. What to Preserve When Moving to Konva

If the rendering is moved to Konva, the following behaviors must be preserved:

- Center-origin world coordinates.
- Camera transform applied as translate + scale from viewport center.
- Field image centered and rotated separately from camera.
- Tool modes (hand / select / addPlayer / color).
- Dragging uses screen delta / zoom for world delta.
- Marquee selection based on projected screen positions.
- Multi-select movement applies a shared delta to all selected items.
- Keyframe snapshots and interpolation exactly as now.
- Timeline keyframe constraints (max 30, min distance 2).

## 11. File Pointers for Konva Refactor

Core logic sources to read or port:

- `src/App.jsx` (all state + keyframe logic + input handlers)
- `src/canvas/CanvasRoot.jsx`
- `src/canvas/PanHandler.jsx`
- `src/canvas/DraggableItem.jsx`
- `src/components/controlPill/ControlPill.jsx`
- `src/components/controlPill/TimePill.jsx`
- `src/utils/exportPlay.js`
- `src/utils/importPlay.js`
