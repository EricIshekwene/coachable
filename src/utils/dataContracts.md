# Data Contracts

This file documents the canonical contracts we should expose to backend endpoints.

## Play Contract (`PlayRecord`)

```json
{
  "id": "string",
  "teamId": "string|null",
  "folderId": "string|null",
  "title": "string",
  "tags": ["string"],
  "playData": "object|null",
  "thumbnail": "data-url|null",
  "notes": "string",
  "notesAuthorName": "string",
  "notesUpdatedAt": "ISO timestamp|null",
  "favorited": "boolean",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

Legacy aliases are still stored during migration:
- `playName` -> `title`
- `savedAt` -> `updatedAt`

## Team Contract (`TeamRecord`)

```json
{
  "id": "string",
  "name": "string",
  "sport": "string|null",
  "seasonYear": "string|null",
  "ownerId": "string|null",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

Legacy alias:
- `teamName` -> `name`

## Implementation

Use `src/utils/dataContracts.js` to normalize local data before storing or sending:
- `normalizePlayRecord(...)`
- `normalizeTeamRecord(...)`
- `toPlayEndpointPayload(...)`
- `toTeamEndpointPayload(...)`
