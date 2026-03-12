# Utils (`src/utils/`)

Stateless utility functions for play import/export and storage contracts.

## Files

### `exportPlay.js`

Builds and downloads play exports as JSON files.

- `EXPORT_SCHEMA_VERSION`: current schema version (`"play-export-v2"`)
- `buildPlayExport(params)`: assembles all play state into a versioned export object
- `downloadPlayExport(playExport, playName)`: triggers browser file download

### `importPlay.js`

Validates and parses imported play JSON.

- `IMPORT_SCHEMA_VERSION`: expected schema version for validation
- `IMPORT_FILE_SIZE_LIMIT_BYTES`: max file size (5 MB)
- `validatePlayImport(input)`: validates JSON input and returns `{ ok, error?, play? }`

### `dataContracts.js`

Canonical normalization for storage and backend payloads.

- `normalizePlayRecord(input, options)`: normalizes play data into one `PlayRecord`
- `normalizeTeamRecord(input, options)`: normalizes team data into one `TeamRecord`
- `toPlayEndpointPayload(record)`: backend-safe play payload (no legacy aliases)
- `toTeamEndpointPayload(record)`: backend-safe team payload (no legacy aliases)

See `dataContracts.md` for schema details and examples.

## Export Schema (v2)

```json
{
  "schemaVersion": "play-export-v2",
  "exportedAt": "ISO timestamp",
  "play": {
    "name": "string",
    "settings": { "advancedSettings": {}, "allPlayersDisplay": {}, "currentPlayerColor": "#fff" },
    "canvas": { "camera": {}, "fieldRotation": 0, "coordinateSystem": "centered" },
    "entities": { "playersById": {}, "representedPlayerIds": [], "ball": {} },
    "animation": { "version": "v1", "durationMs": 30000, "tracks": {}, "meta": {} },
    "playback": { "speedMultiplier": 50, "autoplayEnabled": true },
    "meta": { "appVersion": "string|null" }
  }
}
```
