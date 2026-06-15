# Timeline Track Snapping

CapCut/VN-style snapping for the timeline bars that represent **motion steps**
(`StepTrack`) and **annotation visibility windows** (`AnnotationVisibilityTrack`).
When the user drags an edge handle or the body of a track bar near another
bar's edge — within ~6px — the dragged value snaps onto that edge.

This snapping is purely cosmetic / UX. It does not change any data model:
the same `stepStartMs` / `stepEndMs` and `visibleStartMs` / `visibleEndMs`
fields are written, just with values nudged onto a neighbour's edge.

## Where it lives

- Pure math: [trackSnap.js](trackSnap.js)
- Targets computed and shared from the parent: [ControlPill.jsx](ControlPill.jsx)
- Applied in drag handlers: [StepTrack.jsx](StepTrack.jsx), [AnnotationVisibilityTrack.jsx](AnnotationVisibilityTrack.jsx)
- Tests: [admin/test/trackSnap.test.js](../../../admin/test/trackSnap.test.js)

## Snap targets

`ControlPill` builds a single de-duplicated list and passes the same list to
both track components, so motion bars snap to annotation edges and vice versa:

- `0` and `durationMs` — timeline boundaries
- `currentTimeMs` — the playhead
- Every `stepStartMs` / `stepEndMs` across every motion lane currently rendered
- Every `visibleStartMs` / `visibleEndMs` across every annotation lane currently rendered

Drawings not currently displayed on the timeline (e.g. motion drawings whose
player isn't selected) are intentionally excluded — the user can't see them,
so snapping to them would be invisible magic.

## Snap math

Threshold is **pixel-based** (`TRACK_SNAP_THRESHOLD_PX = 6`) and converted to
ms per-lane from the lane's current width × `TRACK_VISUAL_SPAN_PERCENT`. This
keeps the feel constant across timeline widths (mobile vs. desktop).

- **Left-edge drag** → snap the candidate ms to nearest target, then clamp to
  `[prevEnd | 0, edgeMs - MIN]`.
- **Right-edge drag** → mirror of left-edge.
- **Body drag** → both edges are snap candidates. Whichever moved *closer* to
  a target wins; ties favour the leading edge. Final start is then clamped
  into the legal range (collision bounds for `StepTrack`, `[0, duration-span]`
  for `AnnotationVisibilityTrack`).

### Deadband (why own edges stay in the target list)

The dragged bar's *own* edge values are deliberately **not** filtered out of
the target list. Keeping them in produces a stable deadband: tiny mouse
motion at the current edge re-snaps to the current value, which is a no-op.

An earlier version filtered own edges to avoid "stickiness," which caused
visible **jitter** whenever a neighbour bar shared an edge value with the
dragged bar. Each frame the snap would engage (writing the neighbour's
value into the bar), then next frame the now-equal own-edge would be
filtered out — taking the neighbour's identical value with it — and the
snap would disengage, releasing the bar back. The bar ping-pongs across
the boundary. Leaving own edges in fixes this with no downside: the
deadband is exactly one snap-threshold wide and breaking out of it just
takes the same mouse motion as escaping any other snap target.

## Per-track guarantees preserved

- `StepTrack` still enforces `MIN_STEP_MS` and per-player collision bounds
  (`prevEnd`, `nextStart`). Snap runs first, then clamps — so a snap that
  would push a bar into a neighbour is clipped back.
- `AnnotationVisibilityTrack` still enforces `MIN_DRAWING_WINDOW_MS` and
  `[0, durationMs]`. Annotation bars may overlap freely.
- History grouping (`onBeginHistoryGroup` / `onEndHistoryGroup`) is unchanged
  — the whole drag still collapses into a single undo entry.

## Why not a visual snap line

CapCut draws a vertical line at the snap position. We deliberately didn't
add this in the first cut because the bars are already narrow (18px) and a
vertical line at the snapped edge would visually clash with the bar's
border. If users ask for it later, the obvious place is a sibling
`<div>` inside the `containerRef` element, positioned with the same
`TRACK_VISUAL_START_PERCENT + ms/durationMs × TRACK_VISUAL_SPAN_PERCENT`
formula already used to position the bars.
