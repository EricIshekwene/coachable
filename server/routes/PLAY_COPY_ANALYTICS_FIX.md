# Play Copy Analytics Fix (2026-05-11)

## Problem

Plays copied from the platform playbook were being counted as "plays created"
in admin analytics. This inflated per-user play counts significantly — for
example, a coach who bulk-copied a playbook section with 100+ plays would
appear to have created 100+ plays.

The root cause: both copy routes (`POST /platform-plays/:id/copy` and
`POST /playbook-sections/:id/copy-plays`) inserted rows into the `plays` table
with `created_by_user_id = user` and `is_seeded = false` (the default).
This made them indistinguishable from plays the user actually created.

## Fix

### Schema (`server/db/schema.sql`)

Added a nullable foreign key column via safe migration:

```sql
ALTER TABLE plays ADD COLUMN copied_from_platform_play_id UUID
  REFERENCES platform_plays(id) ON DELETE SET NULL;
```

`NULL` means the play was user-created. A non-null value identifies the
platform play it was copied from.

### Copy routes

- `server/routes/platformPlays.js` — `POST /:id/copy` sets
  `copied_from_platform_play_id = platformPlay.id`
- `server/routes/playbookSections.js` — `POST /:id/copy-plays` sets
  `copied_from_platform_play_id = play.id` for each play inserted

### Admin analytics (`server/routes/admin.js`)

Added `AND copied_from_platform_play_id IS NULL` to every per-user plays
filter:

| Query | Location |
|-------|----------|
| `plays_created` count in user list | `GET /admin/users` line ~284 |
| `plays_created` count in user detail | `GET /admin/users/:userId` |
| `plays_updated` count in user detail | `GET /admin/users/:userId` |
| Recent plays list | `GET /admin/users/:userId` |
| `play_created` activity log entries | `GET /admin/users/:userId` |
| `play_updated` activity log entries | `GET /admin/users/:userId` |

Platform-wide aggregate stats (`total_plays`, `new_plays`, `has_plays`)
are intentionally NOT filtered — those measure team library size regardless
of origin.

## Tests

`admin/test/playCopyAnalytics.test.js` — 11 tests covering:
- `plays_created` count excludes copies and seeded plays
- `plays_updated` count excludes copied plays
- Activity log `play_created` entries exclude copies
- Edge cases: all copies, all seeded, empty sets
