# Slate Feature

## What `Slate` Owns

`src/features/slate/Slate.jsx` is the scene-level composition component for the play editor. It wires together:
- `WideSidebar` (left tools panel)
- `KonvaCanvasRoot` (Konva canvas)
- `ControlPill` (bottom timeline controller)
- `RightPanel` (right info panel)
- `PlayerEditPanel` (inline player editor)
- `AdvancedSettings` (settings modal)
- Import file input (hidden)

It also owns:
- The `AnimationEngine` instance (RAF-driven playback)
- Import/export orchestration
- Keyboard shortcuts
- Animation data state and keyframe management

Receives `onShowMessage(message, subtitle, type, duration)` from `App` for toast display.

## Hook Split

- **`useAdvancedSettings`**
  - Advanced settings state + modal open/close
  - Per-scope logging flags and `logEvent(scope, action, payload)` helper

- **`useSlateEntities`**
  - Players, ball, selection, editor drawer state
  - Add/edit/delete/select/drag handlers
  - Slate snapshot/apply helpers for history + interpolation

- **`useSlateHistory`**
  - Undo/redo stacks for entity snapshots
  - `pushHistory`, `onUndo`, `onRedo`, `clearSlateHistory`

- **`useFieldViewport`**
  - Camera position/zoom and field rotation
  - Its own undo/redo history for viewport changes
  - Zoom/rotate helper functions

## Animation System

Slate manages animation via the `AnimationEngine` class:

- **Animation data** is immutable JSON (`{ version, durationMs, tracks, meta }`)
- **Tracks** map entity IDs to keyframe arrays (`{ t, x, y, r? }`)
- **Engine** runs a RAF loop, fires tick listeners with current time
- **Rendering** samples poses at current time and pushes them to Konva nodes imperatively

Key animation functions in Slate:
- `renderPoseAtTime(timeMs)` — samples all track poses and pushes to renderer
- `handleAddKeyframe` / `handleDeleteKeyframe` / `handleDeleteAllKeyframes`
- `upsertKeyframesAtCurrentTime` — auto-inserts keyframes after drag

## Important Data Shapes

### `playersById`

```js
{
  "player-1": {
    id: "player-1",
    x: 0, y: 0,
    number: 1,
    name: "John",
    assignment: "Left Wing",
    color: "#ef4444"
  }
}
```

### Animation Data

```js
{
  version: 1,
  durationMs: 30000,
  tracks: {
    "player-1": {
      keyframes: [{ t: 0, x: 0, y: 0 }, { t: 1200, x: 80, y: -20 }]
    }
  },
  meta: { createdAt: "...", updatedAt: "..." }
}
```

## Coordination Notes

- `historyApiRef` is a callback ref that breaks hook-order cycles between entities and history
- `isRestoringRef` prevents history push during slate restore (undo/redo)
- `isItemDraggingRef` prevents interpolation during drag
- Animation renderer ref is populated by `KonvaCanvasRoot` via `onAnimationRendererReady`
