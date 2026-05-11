# Keyframe Highlight = Edit Target (2026-05-11)

## Problem

In test variant (the default app), the timeline visually **highlights** the
nearest keyframe whenever the playhead lands within 300ms of it
(`PROXIMITY_TOLERANCE_MS` in `ControlPill.jsx`). Coaches read this highlight as
"this keyframe is active — my edits will update it."

But it didn't actually work that way. Edits only updated a keyframe when:

1. The user had **explicitly clicked** the keyframe (setting `selectedKeyframeMs`), OR
2. The playhead was within 0.5ms of the keyframe's exact time (`KEYFRAME_TIME_TOLERANCE_MS`).

Whenever the playhead was *near* a keyframe (1ms–500ms) without one of those
two conditions, edits were **silently dropped** by `isTooCloseToExistingKeyframe`
inside `upsertKeyframesAtCurrentTime` — the function refuses to create a new
keyframe within `KEYFRAME_MIN_GAP_MS` (500ms) of an existing one.

Concrete failure: pause playback while the playhead overlaps the highlight zone
of a keyframe (say playhead at 4980ms, keyframe at 5000ms), drag a player —
nothing persists.

## Fix

`Slate.jsx#resolveKeyframeWriteTimeMs` now routes writes to the highlighted
keyframe while paused.

Priority (highest first):

1. **Explicit selection** — if `selectedKeyframeMs` is set (user clicked a
   keyframe), write to that time.
2. **Paused + within highlight proximity** — if the engine is paused and an
   existing keyframe is within `KEYFRAME_HIGHLIGHT_PROXIMITY_MS` (300ms,
   matching the visual highlight), write to that keyframe's time.
3. **Otherwise** — write to the current playhead time (existing behavior;
   creates a new keyframe).

While playing, the snap is bypassed entirely — recording-like scenarios where
keyframes are being continuously sampled keep their old behavior.

## Files

- `src/features/slate/Slate.jsx` — adds `KEYFRAME_HIGHLIGHT_PROXIMITY_MS = 300`
  constant; rewrites `resolveKeyframeWriteTimeMs` with the proximity branch.
- `src/components/controlPill/ControlPill.jsx` — documents that
  `PROXIMITY_TOLERANCE_MS` MUST match the Slate constant; no behavior change.
- `admin/test/keyframeStyling.test.js` — adds 8 tests for the new write-time
  resolution (boundary, snap direction, paused-only, etc.).

## Why the constant is duplicated rather than shared

`ControlPill.jsx` is a controlled presentational component with no Slate
imports; pulling Slate's constant in would invert the dependency direction.
The two constants are kept in lockstep by a documented comment on each.
The companion test (`admin/test/keyframeStyling.test.js`) also references
both values, so any drift surfaces immediately.

## Not changed

- `KEYFRAME_MIN_GAP_MS = 500` — still blocks new keyframes 0.5–500ms away from
  an existing one. With the new snap, those near-misses now update the
  existing keyframe instead of being silently dropped, so the block is no
  longer reachable while paused near a keyframe. Outside the 300ms highlight
  zone but still within 500ms, the block remains — matches the user's stated
  mental model: "the highlight is the only indicator I need."
- The `default` (non-test) variant has no proximity highlight, so the snap is
  invisible there but harmless — `selectedKeyframeMs` is still respected
  identically.
