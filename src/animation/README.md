# Animation Core

This folder contains the rebuilt animation system used by the slate timeline.

## Design

- Persisted animation is plain JSON data.
- Playback is handled by a runtime engine (`AnimationEngine`) with `requestAnimationFrame`.
- Rendering is separate and driven by sampled poses, not by persisted Konva node references.

## Schema

```js
{
  version: 1,
  durationMs: 30000,
  tracks: {
    "player-1": {
      keyframes: [
        { t: 0, x: 0, y: 0 },
        { t: 1200, x: 80, y: -20, r: 30 }
      ]
    }
  },
  meta: {
    createdAt: "...",
    updatedAt: "..."
  }
}
```

`Keyframe` values are serializable numbers only: `{ t, x, y, r? }`.

## Files

- `schema.js`: schema normalization and immutable keyframe helpers.
- `interpolate.js`: deterministic interpolation (`getPoseAtTime`, `samplePosesAtTime`).
- `engine.js`: playback engine (`play`, `pause`, `toggle`, `seek`, `setDuration`).
- `serialize.js`: import/export helpers (`serializeAnimation`, `deserializeAnimation`).
- `index.js`: public exports.

## Extending

- Rotation: already supported by optional `r`; add UI for editing and keep it numeric.
- Extra animated objects: add a new track id (for example `ball-1`) and include it in `samplePosesAtTime`.
- Markers/events: keep marker lists in JSON next to `tracks`; engine remains unchanged.
