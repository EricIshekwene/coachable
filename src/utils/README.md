# Utils (`src/utils/`)

Stateless utility functions for play import/export.

## Files

### `exportPlay.js`

Builds and downloads play exports as JSON files.

- `EXPORT_SCHEMA_VERSION` — Current schema version (`"play-export-v2"`)
- `buildPlayExport(params)` — Assembles all play state into a versioned export object
- `downloadPlayExport(playExport, playName)` — Triggers browser file download

### `importPlay.js`

Validates and parses imported play JSON.

- `IMPORT_SCHEMA_VERSION` — Expected schema version for validation
- `IMPORT_FILE_SIZE_LIMIT_BYTES` — Max file size (5 MB)
- `validatePlayImport(input)` — Validates JSON input, supports both full play exports and raw animation JSON. Returns `{ ok, error?, play? }`

## Export Schema (v2)

```json
{
  "schemaVersion": "play-export-v2",
  "exportedAt": "ISO timestamp",
  "play": {
    "name": "string",
    "settings": { "advancedSettings", "allPlayersDisplay", "currentPlayerColor" },
    "canvas": { "camera", "fieldRotation", "coordinateSystem" },
    "entities": { "playersById", "representedPlayerIds", "ball" },
    "animation": { "version", "durationMs", "tracks", "meta" },
    "playback": { "speedMultiplier", "autoplayEnabled" },
    "meta": { "appVersion" }
  }
}
```
