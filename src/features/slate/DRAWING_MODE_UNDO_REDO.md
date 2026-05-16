# Drawing-mode undo / redo coverage

## Problem
The existing undo stack pushed one entry per mutation. In drawing mode several
flows fire many mutations per logical user action, so each action produced
multiple history entries:

| User action | Mutations per action | Result before fix |
| --- | --- | --- |
| Drag a step block on the timeline (StepTrack) | One `updateDrawing` per `pointermove` event | 10–50 undo entries per drag |
| New coaching-draw stroke that replaces an existing one (Slate.`addDrawingTagged`) | `removeDrawing` per old step + (optional) `updateDrawing` to split parent + `addDrawing` for the new step | 2–4 undo entries per draw |
| Delete a player who has a coaching-draw attached (Slate.`handleDeletePlayer`) | `removeDrawing` + `entities.handleDeletePlayer` (each pushes) | 2 undo entries per delete |

Each entry captured intermediate state, so the user had to press Ctrl+Z many
times to back out a single visual edit.

## Fix — history-group API
[`useSlateHistory`](hooks/useSlateHistory.js) gained a depth-counter group API:

```js
const slateHistory = useSlateHistory({ snapshotSlate, applySlate, isRestoringRef, logEvent });

slateHistory.beginGroup();        // snapshots state ONCE on the outermost call
slateHistory.pushHistory();       // suppressed while depth > 0
slateHistory.endGroup();          // decrement

// Or, exception-safe wrapper:
slateHistory.withGroup(() => { /* nested mutations */ });
```

Nested `beginGroup` calls just bump the depth — the snapshot is only taken on
the outermost open. `withGroup` always closes the group in a `finally` block
so a thrown error inside the callback can't leave the undo stack permanently
suppressed.

The full API is also exposed on `historyApiRef.current` for downstream hooks
(`useDrawings`, etc.) that can't access the hook return value directly.

## Fix — drawing-side adjustments

### `useDrawings.updateDrawingNoHistory(id, patch)`
New sibling of `updateDrawing` that mutates without pushing history. Pair with
an explicit `beginGroup`/`endGroup` at gesture boundaries — used by
StepTrack drag.

### `StepTrack` drag handlers
StepTrack now accepts `onUpdateDrawingNoHistory`, `onBeginHistoryGroup`,
`onEndHistoryGroup`. On the first actual update of a drag (left-edge,
right-edge, or body), it opens a history group; every subsequent move during
the gesture uses the no-history update. Pointer up / cancel closes the group.
Click-without-move (body-press converted to a seek) never opens the group.

### `Slate.addDrawingTagged`
The replace / continuation / split / add sequence is wrapped in
`historyApiRef.current.withGroup(...)`. Single undo restores the state from
before the user drew.

### `Slate.handleDeletePlayer` (drawing mode)
Wrapped in `withGroup`. `removeMultipleDrawings` is used when more than one
coaching-draw is attached, to avoid even more nested pushes.

## Already-correct paths (verified)
- Chain-erase in `useCanvasDrawing.handlePointerUp` already calls
  `onRemoveMultipleDrawings(chainIds)` once — single history entry. ✓
- Selection drag / resize / rotate in `useDrawingSelection` already pushes
  history once at gesture start and uses `updateMultipleDrawingsNoHistory`
  during the gesture. ✓
- `entities.handleItemDragStart` pushes once for player drag in drawing
  mode; the React state setter inside `handleItemChange` doesn't push. ✓

## Files touched
- `src/features/slate/hooks/useSlateHistory.js` — `beginGroup`/`endGroup`/`withGroup`.
- `src/features/slate/hooks/useDrawings.js` — `updateDrawingNoHistory`.
- `src/features/slate/Slate.jsx` — `historyApiRef` exposes group API; `addDrawingTagged` and `handleDeletePlayer` wrap in `withGroup`; ControlPill receives the new props.
- `src/components/controlPill/ControlPill.jsx` — forwards new props to StepTrack.
- `src/components/controlPill/StepTrack.jsx` — opens a history group on first drag-move and closes on pointer-up.

## Tests
`admin/test/drawingModeUndoRedo.test.js` covers:
- pushHistory suppression while in group, ungrouped passes through
- withGroup snapshots once even with many nested mutations
- nested begin/end groups behave as a single outer group
- withGroup closes group on throw (subsequent push not suppressed)
- StepTrack drag of 50 pointer-moves → 1 undo entry
- two sequential drags → two undo entries
- addDrawingTagged replace (one or many existing) → 1 undo entry
- addDrawingTagged continuation that splits parent → 1 undo entry
- handleDeletePlayer in drawing mode → 1 undo entry

14 tests; all passing.
