# PlayPreviewCard — drawing-mode animation

## Problem
Drawing-mode plays attach coaching-draw strokes to players/balls and derive
movement from those paths over time (`stepStartMs`/`stepEndMs`). Because
`animation.tracks` stays empty in drawing mode, `PlayPreviewCard` previously
sampled fallback (static) positions only — previews were frozen on the plays
list, even though the editor animated correctly.

## Fix
`PlayPreviewCard` now mirrors the override block in
`Slate.renderPoseAtTime` (see [`src/features/slate/Slate.jsx`](../features/slate/Slate.jsx) lines 948-977):

1. Walk all drawings; keep `coaching-draw` entries with `attachedPlayerId` and
   non-empty `points`.
2. For each `attachedPlayerId`, pick the drawing whose `stepStartMs` is the
   latest one ≤ `displayTimeMs` (matches Slate's "active step" rule).
3. Sample position along the path with `samplePathAtT(points, t)` where
   `t = clamp((displayTimeMs - stepStartMs) / (stepEndMs - stepStartMs), 0, 1)`.
4. Merge the sampled positions on top of the keyframe-derived poses
   (`effectivePoses = { ...poses, ...drawingPathPoses }`).

For oblong balls (Football, Rugby) attached to a coaching-draw path, ball
rotation is derived from the local path tangent (forward-difference of two
samples) so the ball tip points along the direction of travel — matching the
editor's behavior when no animation track exists.

## Files touched
- `src/components/PlayPreviewCard.jsx` — added `drawingPathPoses`,
  `effectivePoses`, and `drawingPathBallRotation` memos; switched player /
  ball / cone renderers to read from `effectivePoses`.

## Tests
- `admin/test/drawingModePreviewAnimation.test.js` — covers single & multi-
  step paths, multi-player independence, before-step-start, past-step-end
  hold, missing-points guard, and the latest-active-step selection rule.
