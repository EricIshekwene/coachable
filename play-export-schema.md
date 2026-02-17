# Play Export Schema (`1.0.0`)

This file documents the JSON produced by `Download` in the right panel.

## Root

```json
{
  "schemaVersion": "1.0.0",
  "exportedAt": "2026-02-17T12:34:56.789Z",
  "app": {
    "name": "Coachable",
    "build": "optional"
  },
  "play": {
    "id": "optional",
    "name": "string",
    "sport": "optional",
    "createdAt": "optional ISO timestamp",
    "updatedAt": "optional ISO timestamp"
  },
  "fieldRotation": 0,
  "camera": { "x": 0, "y": 0, "zoom": 1 },
  "field": {
    "id": "field identifier",
    "pitchSize": "optional",
    "showMarkings": true,
    "pitchColor": "#hex"
  },
  "advancedSettings": {},
  "display": {
    "allPlayers": {},
    "currentPlayerColor": "#hex"
  },
  "items": [],
  "timeline": {},
  "tracks": {}
}
```

## Items

`items` is a stable, deterministic array sorted by `id`.

Each item includes:
- `id`
- `type` (`player`, `ball`, or future types)
- base render fields (`number`, `name`, `color`, etc. when present)
- initial/rest position: `x`, `y`
- flags: `draggable`, `locked`, `hidden`, optional `zIndex`

## Timeline

```json
{
  "durationMs": 30000,
  "easingDefault": "linear",
  "snap": { "enabled": false },
  "controlPill": {
    "speedMultiplier": 50,
    "autoplayEnabled": true,
    "keyframeTolerance": 4
  }
}
```

## Tracks

`tracks` is keyed by `item.id` and each track is:

```json
{
  "type": "position2d",
  "keyframes": [
    { "t": 0, "x": 0, "y": 0, "easing": "linear" }
  ]
}
```

Rules:
- `t` is integer milliseconds.
- keyframes are sorted by `t`.
- each item always has at least one keyframe at `t=0`.
