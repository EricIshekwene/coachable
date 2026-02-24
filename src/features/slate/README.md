# Slate Feature

## What `Slate` Owns

`src/features/slate/Slate.jsx` is the scene-level composition component for the play editor. It wires together:
- `WideSidebar`
- `KonvaCanvasRoot`
- `ControlPill`
- `RightPanel`
- import file input
- `PlayerEditPanel`
- `AdvancedSettings`

It also owns import/export orchestration and receives `onShowMessage(message, subtitle, type, duration)` from `App` for popup/toast display.

## Hook Split

- `useAdvancedSettings`
  - Advanced settings state + modal open/close
  - Logging flags and `logEvent(scope, action, payload)` helper
- `useSlateEntities`
  - Players, ball, selection, editor drawer state
  - Add/edit/delete/select/drag handlers
  - Slate snapshot/apply helpers for history + interpolation
- `useSlateHistory`
  - Slate undo/redo stacks for entity snapshots
- `useFieldViewport`
  - Camera/zoom/rotation and field-history undo/redo
- `useTimelinePlayback`
  - Time position, play/pause, speed, autoplay, RAF loop
- `useKeyframeSnapshots`
  - Keyframes, selected keyframe, keyframe snapshots
  - Snapshot seeding and pending keyframe updates
  - `addKeyframeSignal` / `requestAddKeyframe` and `timelineResetSignal`

## Important Data Shapes

### `playersById`

```js
{
  "player-1": {
    id: "player-1",
    x: 0,
    y: 0,
    number: 1,
    name: "John",
    assignment: "Left Wing",
    color: "#ef4444"
  }
}
```

### `keyframes`

```js
[number, ...] // timeline percentages from 0-100
```

### `keyframeSnapshots`

```js
{
  [timePercent]: {
    playersById: { ... },
    representedPlayerIds: ["player-1", ...],
    ball: { id: "ball-1", x: 40, y: 0 }
  }
}
```

## Coordination Notes

`Slate.jsx` uses small callback refs (`historyApiRef`, `keyframeApiRef`) to avoid hook-order cycles while keeping entity handlers and history/keyframe logic modularized.
