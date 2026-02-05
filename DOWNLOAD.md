# Download Export (Play JSON)

This project’s **Download** button exports a single JSON file that fully describes the current play so it can be re-imported later. The export is created client‑side (no server) and includes only **play state**, not transient UI state.

## Filename

The filename is derived from the current play name shown in the Right Panel:

- Lowercased
- Spaces replaced with `-`
- Illegal filename characters removed
- If empty, falls back to `play`

Example: `My Play 1` → `my-play-1.json`

## Schema Overview

All exports use a versioned schema:

```json
{
  "schemaVersion": "play-export-v1",
  "exportedAt": "2026-02-05T12:34:56.789Z",
  "play": {
    "name": "My Play",
    "id": null,
    "settings": { ... },
    "canvas": { ... },
    "entities": { ... },
    "timeline": { ... },
    "meta": { "appVersion": null }
  }
}
```

## Where Each Section Comes From

- `schemaVersion`, `exportedAt`
  - Built in `src/utils/exportPlay.js` (`buildPlayExportV1`)

- `play.name`
  - Right Panel play name from `src/App.jsx` state: `playName`

- `play.settings`
  - `advancedSettings` from `src/App.jsx` (pitch color, markings, player size, etc.)
  - `allPlayersDisplay` from `src/App.jsx` (global player size, number/name visibility, color)
  - `currentPlayerColor` from `src/App.jsx`

- `play.canvas`
  - `camera` and `fieldRotation` from `src/App.jsx`
  - `coordinateSystem` is documented in `README.md` and enforced in `src/canvas/ItemsLayer.jsx` and `src/canvas/FieldLayer.jsx`

- `play.entities`
  - `playersById`, `representedPlayerIds`, and `ball` from `src/App.jsx`
  - These are the full properties required to render the items on the canvas

- `play.timeline`
  - `keyframes` and `keyframeSnapshots` from ControlPill state in `src/App.jsx`
  - `playback` includes `loopSeconds`, `keyframeTolerance`, `speedMultiplier`, and `autoplayEnabled`

- `play.meta.appVersion`
  - `import.meta.env.VITE_APP_VERSION` if provided at build time, otherwise `null`

## What Is Intentionally Excluded

UI-only or transient state is not exported, including:

- Current selection (`selectedPlayerIds`, `selectedItemIds`)
- Hover state
- Dragging state
- In-progress edits or tooltips
- Current playhead position (`timePercent`) and `isPlaying` flag

These can be re-derived or set during import.

## Example Structure (Short)

```json
{
  "schemaVersion": "play-export-v1",
  "exportedAt": "2026-02-05T12:34:56.789Z",
  "play": {
    "name": "my-play",
    "settings": {
      "advancedSettings": { "pitch": { "showMarkings": true } },
      "allPlayersDisplay": { "sizePercent": 100 }
    },
    "canvas": {
      "camera": { "x": 0, "y": 0, "zoom": 1 },
      "fieldRotation": 0
    },
    "entities": {
      "playersById": { "player-1": { "id": "player-1", "x": 0, "y": 0 } },
      "representedPlayerIds": ["player-1"],
      "ball": { "id": "ball-1", "x": 40, "y": 0 }
    },
    "timeline": {
      "keyframes": [0, 50, 100],
      "keyframeSnapshots": { "0": { "playersById": { } } }
    }
  }
}
```

## Implementation Notes

- Export building: `src/utils/exportPlay.js`
- Download wiring: `src/App.jsx` → `onDownload` → `downloadPlayExport(...)`
- Right Panel button: `src/components/rightPanel/ExportActions.jsx`
