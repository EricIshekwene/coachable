# Query Performance Audit

**Reviewed:** June 2026
**Scope:** V1 query patterns, index coverage, and v2 index decisions
**Method:** Schema and route analysis. No `EXPLAIN ANALYZE` output — v1 is pre-release and has no query monitoring. Expected plans are inferred from index definitions.
**Purpose:** Identify the highest-impact queries and ensure v2's `001_initial.sql` has the right indexes from day one.

---

## How This Was Derived

All findings come from reading `server/db/schema.sql` and the route files directly. The three query patterns below were chosen by frequency: how many times per user session each query fires, multiplied by how many DB rows it touches.

---

## Pattern 1 — Plays List (Highest Impact)

**Route:** `GET /api/teams/:teamId/plays`
**Frequency:** Every time a coach or player opens the plays page — the core product screen.

### V1 Query

```sql
SELECT * FROM plays
WHERE team_id = $1 AND archived_at IS NULL
ORDER BY updated_at DESC
```

### V1 Index Coverage

Three separate indexes exist on `plays`:

```sql
CREATE INDEX plays_team_idx       ON plays(team_id);
CREATE INDEX plays_folder_idx     ON plays(folder_id);
CREATE INDEX plays_updated_at_idx ON plays(updated_at DESC);
```

**What Postgres does:** Uses `plays_team_idx` to find all plays for the team, then filters `archived_at IS NULL` as a post-scan predicate, then sorts by `updated_at` in memory. The sort cannot use `plays_updated_at_idx` because the index scan already narrowed to one team — the optimizer loads the qualifying rows and sorts them, which is fine at small row counts but degrades linearly as archived plays accumulate.

**The bigger problem:** `SELECT *` pulls the full `play_data` JSONB column for every play. A single animated play's canvas state is 50–200 KB. A team with 100 plays returns 5–20 MB of JSONB per list request — data the list UI never uses (it only needs title, folder, thumbnail, tags, updated_at).

### V2 Decisions

**Index:** Partial compound index covering the filter and sort together:

```sql
CREATE INDEX plays_active_team_updated_idx
  ON plays(team_id, updated_at DESC)
  WHERE archived_at IS NULL;
```

This index covers both the `WHERE` and `ORDER BY` clauses in one scan, with no post-scan sort and no archived rows in the index at all. The partial condition (`WHERE archived_at IS NULL`) keeps the index small as plays accumulate in the trash.

**Schema:** Introduce a `play_canvas` table (1:1 with `plays`) that holds only `play_data` and `play_data_version`. The `plays` table holds metadata only. List queries hit `plays` exclusively. The editor and viewer JOIN to `play_canvas`. This makes it structurally impossible for a list query to accidentally fetch canvas state.

```
plays (metadata only)          play_canvas
─────────────────────          ────────────────────
id                             play_id  ← FK to plays
team_id                        play_data_version
folder_id                      play_data
title
thumbnail_url
notes
hidden_from_players
archived_at
updated_at
```

**Trash query** (`WHERE archived_at IS NOT NULL`) needs its own index:

```sql
CREATE INDEX plays_archived_team_idx
  ON plays(team_id, archived_at DESC)
  WHERE archived_at IS NOT NULL;
```

---

## Pattern 2 — Auth Bootstrap (Highest Frequency)

**Route:** `GET /api/auth/me`
**Frequency:** Once on every page load — `AuthContext` calls it on mount. Every tab open, every refresh, every cold session.

### V1 Query Sequence

Three sequential queries, one after another:

```sql
-- Query 1: user row
SELECT id, name, email, email_verified_at, onboarded_at, is_beta_tester, active_team_id
FROM users
WHERE id = $1;

-- Query 2: all team memberships (via resolveActiveTeam → getUserTeams)
SELECT tm.team_id, t.name, t.sport, t.season_year, t.owner_user_id, t.is_personal, tm.role
FROM team_memberships tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.user_id = $1 AND t.deleted_at IS NULL
ORDER BY tm.joined_at;

-- Query 3: preferences
SELECT * FROM user_preferences WHERE user_id = $1;
```

### V1 Index Coverage

- `users.id` — PK, always indexed. Fast.
- `team_memberships` — `(user_id)` index exists (`team_memberships_user_idx`). The JOIN to `teams` uses `teams.id` (PK). `deleted_at IS NULL` filter has no index but `teams` is small.
- `user_preferences.user_id` — PK, always indexed. Fast.

The sequential nature is the problem, not the indexes. Three round-trips on every page load adds latency that compounds at scale.

### V2 Decisions

Run queries 2 and 3 in parallel (Promise.all), not sequentially. Better: collapse all three into one query:

```sql
SELECT
  u.id, u.name, u.email, u.email_verified_at, u.onboarded_at,
  u.is_beta_tester, u.active_team_id,
  up.theme, up.player_view_mode,
  up.notify_players_join_team, up.notify_coaches_make_changes,
  up.notify_invite_accepted, up.notify_new_plays,
  up.notify_play_updates, up.notify_team_announcements,
  json_agg(json_build_object(
    'teamId', tm.team_id,
    'teamName', t.name,
    'sport', t.sport,
    'seasonYear', t.season_year,
    'ownerId', t.owner_user_id,
    'isPersonal', t.is_personal,
    'role', tm.role
  ) ORDER BY tm.joined_at) FILTER (WHERE tm.team_id IS NOT NULL) AS teams
FROM users u
LEFT JOIN user_preferences up ON up.user_id = u.id
LEFT JOIN team_memberships tm ON tm.user_id = u.id
LEFT JOIN teams t ON t.id = tm.team_id AND t.deleted_at IS NULL
WHERE u.id = $1
GROUP BY u.id, up.user_id;
```

One round-trip. The existing indexes (`team_memberships_user_idx` on `user_id`, both PKs) cover this query without any new indexes needed.

**Carry forward:** No new indexes required for this pattern. The fix is query structure, not schema.

---

## Pattern 3 — Notification List

**Route:** `GET /api/notifications`
**Frequency:** On every app load when the feature flag is enabled — the notification bell is always visible in the nav.

### V1 Query

```sql
SELECT n.id, n.title, n.subject, n.priority, n.blocks, n.created_at,
       r.read_at, r.responded_at
FROM notification_recipients r
JOIN notifications n ON n.id = r.notification_id
WHERE r.user_id = $1
ORDER BY n.created_at DESC
LIMIT 100;
```

Plus a separate unread count query on every load:

```sql
SELECT count(*)::int AS count
FROM notification_recipients
WHERE user_id = $1 AND read_at IS NULL;
```

### V1 Index Coverage

```sql
CREATE INDEX notification_recipients_user_idx
  ON notification_recipients(user_id, read_at);
```

**This is already correct.** The compound `(user_id, read_at)` index covers both queries:
- List query: index scan on `user_id = $1`, JOIN to `notifications` via its PK.
- Unread count: index scan on `user_id = $1 AND read_at IS NULL` — Postgres can use the index to skip already-read rows.

### V2 Decision

Carry the `(user_id, read_at)` compound index forward exactly as-is. No changes needed.

---

## Missing Indexes to Add in V2

These are not covered by the three main patterns above but appear in the api-review audit as full-table scans:

| Table | Missing Index | Query Pattern |
|---|---|---|
| `play_tag_links` | `(tag_id)` | Tag-based play filtering — junction scan today |
| `play_favorites` | `(user_id)` | Batch favorites fetch on plays list |
| `platform_plays` | GIN on `tags TEXT[]` | Tag filtering on platform play browse |

```sql
CREATE INDEX play_tag_links_tag_idx ON play_tag_links(tag_id);
CREATE INDEX play_favorites_user_idx ON play_favorites(user_id);
CREATE INDEX platform_plays_tags_gin ON platform_plays USING GIN(tags);
```

---

## What Goes Into `001_initial.sql`

These indexes must be in the initial migration — not added later:

```sql
-- Plays: active-only compound (replaces three separate v1 indexes)
CREATE INDEX plays_active_team_updated_idx
  ON plays(team_id, updated_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX plays_archived_team_idx
  ON plays(team_id, archived_at DESC)
  WHERE archived_at IS NOT NULL;

-- Notifications: carry forward unchanged
CREATE INDEX notification_recipients_user_idx
  ON notification_recipients(user_id, read_at);

-- Tag and favorites gaps
CREATE INDEX play_tag_links_tag_idx ON play_tag_links(tag_id);
CREATE INDEX play_favorites_user_idx ON play_favorites(user_id);
CREATE INDEX platform_plays_tags_gin ON platform_plays USING GIN(tags);

-- team_memberships: both are already in v1 and should be kept
CREATE INDEX team_memberships_user_idx ON team_memberships(user_id);
CREATE UNIQUE INDEX team_memberships_team_user_unique ON team_memberships(team_id, user_id);
```

Note: if the `play_canvas` table is adopted (recommended), `plays_active_team_updated_idx` and `plays_archived_team_idx` are defined on `plays`; the canvas JOIN only happens for editor/viewer queries, which look up by PK.

---

## Baseline Task for V2

Once the v2 schema is live and seeded with test data, run `EXPLAIN ANALYZE` on these three queries against a realistic dataset to confirm the expected plans hold:

```sql
EXPLAIN ANALYZE
SELECT id, title, folder_id, thumbnail_url, updated_at
FROM plays
WHERE team_id = '<uuid>' AND archived_at IS NULL
ORDER BY updated_at DESC;

EXPLAIN ANALYZE
SELECT u.id, up.theme, tm.team_id, t.name
FROM users u
LEFT JOIN user_preferences up ON up.user_id = u.id
LEFT JOIN team_memberships tm ON tm.user_id = u.id
LEFT JOIN teams t ON t.id = tm.team_id AND t.deleted_at IS NULL
WHERE u.id = '<uuid>'
GROUP BY u.id, up.user_id;

EXPLAIN ANALYZE
SELECT count(*)::int
FROM notification_recipients
WHERE user_id = '<uuid>' AND read_at IS NULL;
```

---

## Cross-References

- `v2/engineering/audits/api-review.md` — source of query patterns and efficiency problems flagged per layer
- `v2/engineering/database.md` — migration conventions; indexes belong in `001_initial.sql`
