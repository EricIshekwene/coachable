# Database

## Migrations

### Decision

V2 uses **numbered migration files** in `server/db/migrations/`, tracked by a `schema_migrations` table.

V1 used a single idempotent `schema.sql` that accumulated 15+ ALTER TABLE patches appended over time. That approach had three failure modes that ruled it out for v2:

1. **Forward references** — an ALTER at line 254 referenced `platform_plays`, which isn't defined until line 375. On an existing DB this worked; on a fresh DB it throws `undefined_table` and the migration aborts. V1's schema was never successfully applied to a clean database.
2. **Silent failures** — one block used `EXCEPTION WHEN others THEN NULL`, swallowing all errors including real schema failures.
3. **No auditability** — no record of what has been applied or when, so there is no way to know whether a running production DB matches the file.

Numbered files fix all three: each file runs exactly once, failures abort loudly, and the tracking table is a permanent record.

---

### File structure

```
server/db/
├── migrate.js          — Migration runner
├── pool.js             — pg Pool instance
└── migrations/
    ├── 001_initial.sql — Full v2 schema (all tables, indexes, enums — no guards needed)
    ├── 002_*.sql
    └── ...
```

`001_initial.sql` is a clean schema definition — no `IF NOT EXISTS`, no `DO $$ BEGIN` guards, no ALTER patches. It defines exactly what a fresh v2 database looks like.

---

### Tracking table

`migrate.js` creates this before running any migrations:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### migrate.js contract

- Creates `schema_migrations` if it does not exist
- Reads all `.sql` files from `server/db/migrations/` and sorts them lexicographically (numbered prefixes determine order)
- Skips any filename already present in `schema_migrations`
- For each pending file: runs it in a transaction, inserts the filename into `schema_migrations` on success
- If a migration fails: logs the filename and error, exits with code 1 — server startup aborts
- **Headless only** — no stdin, no interactive prompts. CI and Railway both invoke it without a terminal.

---

### How to add a migration

1. Create `server/db/migrations/NNN_descriptive_name.sql` where `NNN` is the next sequential number (zero-padded to three digits).
2. Write plain SQL — no idempotency guards. Each file runs exactly once.
3. Keep it focused: one concern per file. Adding a table and seeding default rows in the same file is fine. Restructuring three unrelated tables in one file is not.
4. Test locally: run `node server/db/migrate.js`. It should apply only your new file and print its name.
5. Commit the file. CI applies it to a fresh test DB on the next push — this is the authoritative check that it runs clean from scratch.

**Never edit an applied migration.** Once a file has been applied to any environment (local, CI, or production), it is frozen. Changes go in a new file.

---

### Running in production

Migrations run automatically on every server startup. Railway restarts the server on every deploy, so deploying automatically applies any pending migrations.

**To verify what has been applied:**

```sql
SELECT filename, applied_at FROM schema_migrations ORDER BY filename;
```

Run this via the Railway dashboard query tool or the psql shell:

```bash
railway run --service resplendent-inspiration psql $DATABASE_URL \
  -c "SELECT filename, applied_at FROM schema_migrations ORDER BY filename;"
```

**If a migration fails on deploy:** The server exits with code 1 and Railway marks the deploy as failed. No partial state is committed (each migration runs in a transaction). Fix the migration file, push again — Railway will retry from the failed migration.

---

### CI

The CI workflow runs `node server/db/migrate.js` against a fresh Postgres instance before any tests. This is the check that V1 never had: migrations must apply cleanly to an empty database.

See `docs/engineering/planning/infrastructure/security-and-code-quality.md` for the full workflow.

---

## Backup and recovery

### Automated backups

Railway Pro includes volume-level backups for PostgreSQL. Daily backups are enabled on **Postgres (prod)** with Railway's default 7-day retention. Postgres (dev) is not backed up — it holds no real user data.

**RPO (recovery point objective):** ~24 hours. A failure at any point during the day means at most one day of data loss. This is acceptable for v2 — coaches losing a day of playbook edits is painful but survivable.

Backups are configured in Railway: **Service → Settings → Volume → Backup schedules**.

---

### Data classification

All user-facing tables are catastrophic — losing them means coaches cannot log in, access their team, or recover their playbooks. This includes (but is not limited to):

- `users`
- `teams` / `team_memberships`
- `plays` / `playbooks`
- Any table that owns rows a coach created

Infrastructure tables (job queues, notification logs, thumbnail caches) are recoverable — they can be regenerated or tolerate gaps.

**When in doubt, treat it as catastrophic.** If a coach would notice it missing, it belongs in the catastrophic bucket.

---

### Recovery process

Railway restores volumes by creating a new volume from a snapshot — it does not overwrite the live volume. The steps:

1. Go to Railway dashboard → `coachable-v2` project → `Postgres (prod)` service
2. Navigate to **Settings → Volume → Backup schedules → View backups**
3. Select the most recent daily snapshot before the incident
4. Click **Restore** — Railway creates a new volume from the snapshot
5. Update the volume mount on `Postgres (prod)` to point at the restored volume
6. Redeploy `coachable-v2-prod` to reconnect

**RTO (recovery time objective):** Estimated 30–60 minutes end-to-end depending on DB size.

---

### Restore testing

A restore has never been tested. Before v2 goes live with real user data, do a full restore drill:

1. Take note of current row counts on key tables: `SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM plays;`
2. Follow the recovery process above against the dev DB (`Postgres (dev)`)
3. Verify the restored DB matches the expected row counts
4. Document any steps that were missing or confusing and update this section

**This must be completed before v2 launch.** Finding out the restore process is broken during an actual incident is worse than the incident itself.

---

### Corruption detection

PostgreSQL corruption is rare but silent. The practical detection signal is a failed `pg_dump` — if a dump can't complete cleanly, something is wrong.

Set up a Railway cron service that runs nightly:

```bash
pg_dump $DATABASE_URL --schema-only --no-password -f /dev/null
```

If the command exits non-zero, alert via email or Slack. A schema-only dump is fast and exercises the catalog without producing a large output file.

A full dump (without `--schema-only`) doubles as a second backup copy and catches data-level corruption, but is heavier. Evaluate after v2 launch once you know DB size.

---

## Schema

V2 has **43 tables** across 11 domains. This section documents what each table stores, what it references, and which constraints are DB-enforced vs application-enforced. Use this as the source of truth when writing `001_initial.sql`.

**V2 changes from v1:**
- Dropped: `team_join_requests` (existed in schema, never used in any route)
- Dropped columns: `teams.owner_user_id` (dual source of truth; `team_memberships` is now the sole authority on all roles including owner), `platform_plays.previous_play_data` (one-step rollback hack; versioning belongs in `play_canvas`), `platform_plays.tags TEXT[]` (replaced by junction table)
- Added: `play_canvas`, `platform_play_tags`, `platform_play_tag_links`, `schema_migrations`

---

### Application-enforced invariants

These constraints are NOT enforced by the DB. Any code writing to these tables must uphold them, and they must be documented here so they aren't accidentally broken.

| Invariant | Where enforced |
|---|---|
| A team has exactly one owner (`role = 'owner'` in `team_memberships`) | `teams.js` ownership transfer, `team_memberships` upserts |
| Folder depth max 4 levels | `POST /folders` parent-chain walk |
| Text length limits (name 80, title 200, tag 40, etc.) | `server/lib/validate.js` LIMITS constants — no VARCHAR constraints in DB |
| `notifications.recipient_count` matches actual rows in `notification_recipients` | Set at fan-out time in admin send route |
| A platform play can appear in multiple `playbook_sections` simultaneously | By design — no constraint prevents it |
| `team_invite_codes` has exactly one player code and one coach code per team | Seeded at team creation; gaps patched on-demand by invite codes route |
| `playbook_sections` community designation matched by `is_community` flag | App-enforced — do not use name string matching |
| At most one active (non-revoked) share link per play | UNIQUE partial index on `play_share_links(play_id) WHERE revoked_at IS NULL` — DB-enforced in v2 |

---

### Auth & Identity

#### `schema_migrations`
Tracks which migration files have been applied. Created by `migrate.js` before any migrations run.

| Column | Type | Notes |
|---|---|---|
| `filename` | TEXT PK | e.g. `001_initial.sql` |
| `applied_at` | TIMESTAMPTZ | Set on successful apply |

---

#### `users`
Core identity record. One row per registered account.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `email` | TEXT UNIQUE NOT NULL | |
| `password_hash` | TEXT NOT NULL | bcrypt |
| `name` | TEXT NOT NULL | Display name |
| `email_verified_at` | TIMESTAMPTZ | NULL = unverified |
| `onboarded_at` | TIMESTAMPTZ | NULL = hasn't completed onboarding |
| `onboarding_path` | TEXT | `create_team \| join_team \| solo` — set at onboarding completion |
| `active_team_id` | UUID FK → `teams` ON DELETE SET NULL | Currently selected team. NULL = use first membership |
| `is_beta_tester` | BOOLEAN DEFAULT false | |

**Constraints:** `email` has implicit index from UNIQUE. `active_team_id` may be NULL even for onboarded users (e.g. if the active team was deleted).

---

#### `email_verification_codes`
Stores short-lived codes for two distinct flows: account email verification and email address changes. Both flows share this table — `purpose` distinguishes them.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `users` ON DELETE CASCADE | |
| `email` | TEXT NOT NULL | The address being verified |
| `code` | TEXT NOT NULL | 6-digit numeric string |
| `purpose` | TEXT NOT NULL | `verify_account \| change_email` |
| `expires_at` | TIMESTAMPTZ NOT NULL | |
| `used_at` | TIMESTAMPTZ | NULL = not yet used |

**Constraints:** All queries must filter on `purpose`. Mixing the two flows without this filter causes cross-contamination (a pending verification is silently invalidated by requesting an email change).

Index: `(user_id)`.

---

#### `password_reset_codes`
Short-lived codes sent via forgot-password email.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `users` ON DELETE CASCADE | |
| `email` | TEXT NOT NULL | Snapshot of email at time of request |
| `code` | TEXT NOT NULL | 6-digit numeric string |
| `expires_at` | TIMESTAMPTZ NOT NULL | |
| `used_at` | TIMESTAMPTZ | NULL = not yet used |

Indexes: `(user_id)`, `(email)`.

---

#### `user_preferences`
Per-user settings. 1:1 with `users` — the PK is the FK.

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID PK FK → `users` ON DELETE CASCADE | |
| `theme` | TEXT DEFAULT `'dark'` | `dark \| light \| system` CHECK constraint |
| `player_view_mode` | BOOLEAN DEFAULT false | Coach sees app as a player would |
| `notify_players_join_team` | BOOLEAN DEFAULT true | Coach preference |
| `notify_coaches_make_changes` | BOOLEAN DEFAULT true | Coach preference |
| `notify_invite_accepted` | BOOLEAN DEFAULT true | Coach preference |
| `notify_new_plays` | BOOLEAN DEFAULT true | Player preference |
| `notify_play_updates` | BOOLEAN DEFAULT true | Player preference |
| `notify_team_announcements` | BOOLEAN DEFAULT true | Player preference |

**Constraints:** PK enforces 1:1 with users. Row is created on first preference save (upsert pattern).

---

### Teams

#### `teams`
A team or personal workspace. Soft-deleted via `deleted_at`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `sport` | TEXT | Free text — no FK to a sports table. Validated against known sport keys in app code |
| `season_year` | TEXT | e.g. `'2025-26'` |
| `is_personal` | BOOLEAN DEFAULT false | Personal workspaces created via the solo onboarding path |
| `deleted_at` | TIMESTAMPTZ | NULL = active. Soft-deleted teams are purged by a background job after 30 days |

**Note:** `owner_user_id` from v1 is dropped. `team_memberships` with `role = 'owner'` is the single source of truth for ownership. A user can have multiple personal workspaces — there is no DB constraint enforcing one per user.

Index: partial on `(deleted_at) WHERE deleted_at IS NOT NULL`.

---

#### `team_settings`
Per-team assistant coach permission overrides. 1:1 with `teams`.

| Column | Type | Notes |
|---|---|---|
| `team_id` | UUID PK FK → `teams` ON DELETE CASCADE | |
| `assistant_can_create_edit_delete_plays` | BOOLEAN DEFAULT true | |
| `assistant_can_manage_roster` | BOOLEAN DEFAULT true | |
| `assistant_can_send_invites` | BOOLEAN DEFAULT false | |

---

#### `team_memberships`
Maps users to teams with a role. The single source of truth for all roles including owner.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `team_id` | UUID FK → `teams` ON DELETE CASCADE | |
| `user_id` | UUID FK → `users` ON DELETE CASCADE | |
| `role` | `team_role` ENUM NOT NULL | `owner \| coach \| assistant_coach \| player` |
| `joined_at` | TIMESTAMPTZ DEFAULT now() | |

**Constraints:** UNIQUE `(team_id, user_id)` — one membership per user per team. A team should have exactly one `role = 'owner'` row; this is application-enforced, not DB-enforced.

Indexes: `(user_id)`, `(team_id, role)`, UNIQUE `(team_id, user_id)`.

---

#### `team_invite_codes`
Standing reusable join codes — one per (team, role). These are NOT one-time tokens; they rotate when the coach rotates them.

| Column | Type | Notes |
|---|---|---|
| `team_id` | UUID FK → `teams` ON DELETE CASCADE | |
| `role` | TEXT NOT NULL | `player \| coach` CHECK constraint |
| `code` | TEXT UNIQUE NOT NULL | 8-char uppercase hex |
| `created_by_user_id` | UUID FK → `users` | |
| `rotated_at` | TIMESTAMPTZ | Last rotation timestamp |

**Constraints:** PK `(team_id, role)` — at most one code per (team, role). Both codes are seeded at team creation. Do not confuse with `team_invites`, which tracks individual email invite records.

---

#### `team_invites`
Per-invite email tracking records. Stores metadata about each invitation email sent.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `team_id` | UUID FK → `teams` ON DELETE CASCADE | |
| `invited_by_user_id` | UUID FK → `users` | |
| `contact_email` | TEXT | Recipient address |
| `requested_role` | `team_role` ENUM DEFAULT `'player'` | |
| `status` | `invite_status` ENUM DEFAULT `'pending'` | `pending \| accepted \| revoked \| expired` |
| `token` | TEXT UNIQUE | One-time token — should be used for join resolution in v2 (was never wired in v1) |
| `expires_at` | TIMESTAMPTZ | |
| `accepted_by_user_id` | UUID FK → `users` | |
| `accepted_at` | TIMESTAMPTZ | |

**V2 note:** In v1 the `token` was written but never resolved — join always went through `team_invite_codes`. In v2, wire the join flow to resolve `team_invites.token` so email invites are one-time and invalidated after use.

---

### Playbook

#### `play_folders`
Team-scoped folder hierarchy. Self-referential for nesting.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `team_id` | UUID FK → `teams` ON DELETE CASCADE | |
| `parent_id` | UUID FK → `play_folders` ON DELETE SET NULL | NULL = root folder |
| `name` | TEXT NOT NULL | |
| `sort_order` | INT DEFAULT 0 | Coach-controlled ordering |
| `created_by_user_id` | UUID FK → `users` | |

**Constraints:** UNIQUE `(team_id, parent_id, name)` — folder names are unique within the same parent. Max nesting depth of 4 is application-enforced only (use a single recursive CTE, not a loop).

Index: `(team_id)`.

---

#### `plays`
Play metadata. Canvas state lives in `play_canvas` — this table holds everything a list query needs and nothing more.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `team_id` | UUID FK → `teams` ON DELETE CASCADE | |
| `folder_id` | UUID FK → `play_folders` ON DELETE SET NULL | NULL = root (unfiled) |
| `title` | TEXT NOT NULL | |
| `thumbnail_url` | TEXT | R2 URL. NULL until first render |
| `notes` | TEXT DEFAULT `''` | Coach notes |
| `notes_author_name` | TEXT DEFAULT `''` | Denormalized display name at time of last edit |
| `notes_updated_at` | TIMESTAMPTZ | |
| `sort_order` | INT DEFAULT 0 | Explicit coach-controlled ordering (replaces updated_at sort from v1) |
| `hidden_from_players` | BOOLEAN DEFAULT false | |
| `archived_at` | TIMESTAMPTZ | NULL = active. Non-null = in trash |
| `is_seeded` | BOOLEAN DEFAULT false | True for the demo play created during onboarding |
| `copied_from_platform_play_id` | UUID FK → `platform_plays` ON DELETE SET NULL | Lineage tracking. NULL = user-created |
| `created_by_user_id` | UUID FK → `users` | |
| `updated_by_user_id` | UUID FK → `users` | |

Indexes: partial compound `(team_id, updated_at DESC) WHERE archived_at IS NULL` (active plays list), partial `(team_id, archived_at DESC) WHERE archived_at IS NOT NULL` (trash).

---

#### `play_canvas`
Canvas state for a play. 1:1 with `plays`. Only fetched when opening the editor or viewer — never on list queries.

| Column | Type | Notes |
|---|---|---|
| `play_id` | UUID PK FK → `plays` ON DELETE CASCADE | |
| `play_data` | JSONB | Full canvas + animation state |
| `play_data_version` | INT NOT NULL DEFAULT 1 | Schema version of `play_data`. Increment when the canvas format changes. Migration layer upgrades on read/save |

**Constraint:** PK enforces 1:1. Any query that SELECTs from `plays` without a JOIN to `play_canvas` structurally cannot fetch canvas data. This is the primary motivation for the split.

---

#### `play_tags`
Tag dictionary, scoped per team. Stores both the display label and a normalized version for case-insensitive deduplication.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `team_id` | UUID FK → `teams` ON DELETE CASCADE | |
| `label` | TEXT NOT NULL | Display form, e.g. `"Red Zone"` |
| `normalized_label` | TEXT NOT NULL | Lowercased, e.g. `"red zone"` — used for dedup |

**Constraint:** UNIQUE `(team_id, normalized_label)` — prevents duplicate tags per team regardless of case.

---

#### `play_tag_links`
Junction table linking plays to their tags.

| Column | Type | Notes |
|---|---|---|
| `play_id` | UUID FK → `plays` ON DELETE CASCADE | |
| `tag_id` | UUID FK → `play_tags` ON DELETE CASCADE | |

**Constraint:** PK `(play_id, tag_id)`.

Indexes: PK covers `play_id` lookups. Add `(tag_id)` index for tag-based filtering.

---

#### `play_favorites`
Records which plays each user has favorited.

| Column | Type | Notes |
|---|---|---|
| `play_id` | UUID FK → `plays` ON DELETE CASCADE | |
| `user_id` | UUID FK → `users` ON DELETE CASCADE | |
| `created_at` | TIMESTAMPTZ DEFAULT now() | |

**Constraint:** PK `(play_id, user_id)`.

Index: `(user_id)` for fetching all favorites by user.

---

#### `play_share_links`
Public share tokens for individual plays. A token grants read access to a play without authentication.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `play_id` | UUID FK → `plays` ON DELETE CASCADE | |
| `created_by_user_id` | UUID FK → `users` | |
| `token` | TEXT UNIQUE NOT NULL | 32-char hex |
| `expires_at` | TIMESTAMPTZ | NULL = no expiry |
| `revoked_at` | TIMESTAMPTZ | NULL = active |

**Constraint:** UNIQUE partial index `(play_id) WHERE revoked_at IS NULL` — enforces at most one active share link per play. (This is new in v2; v1 allowed unbounded active links with no management UI.)

Index: `(play_id)`.

---

#### `folder_share_links`
Public share tokens for folders. Grants read access to a folder and all its plays.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `folder_id` | UUID FK → `play_folders` ON DELETE CASCADE | |
| `created_by_user_id` | UUID FK → `users` | |
| `token` | TEXT UNIQUE NOT NULL | 32-char hex |
| `expires_at` | TIMESTAMPTZ | |
| `revoked_at` | TIMESTAMPTZ | |

Index: `(folder_id)`.

---

### Platform Content

#### `platform_play_folders`
Admin-managed folder hierarchy for platform plays. Not team-scoped.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `parent_id` | UUID FK → `platform_play_folders` ON DELETE SET NULL | NULL = root |
| `name` | TEXT NOT NULL | |
| `sport` | TEXT | Set when `is_sport_folder = true` |
| `is_sport_folder` | BOOLEAN DEFAULT false | Marks the top-level folder for a sport |
| `sort_order` | INT DEFAULT 0 | |

**Constraints:** UNIQUE `(parent_id, name)`. UNIQUE partial index on `(sport) WHERE is_sport_folder = true` — at most one sport root folder per sport.

Index: `(parent_id)`.

---

#### `platform_plays`
Admin-curated plays available to all users. Not team-scoped.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `folder_id` | UUID FK → `platform_play_folders` ON DELETE SET NULL | |
| `title` | TEXT NOT NULL | |
| `description` | TEXT DEFAULT `''` | |
| `sport` | TEXT | Free text — not a FK |
| `play_data` | JSONB | Canvas state (kept in same table for platform plays — no separate canvas table) |
| `play_data_version` | INT NOT NULL DEFAULT 1 | Canvas format version |
| `thumbnail_url` | TEXT | |
| `is_featured` | BOOLEAN DEFAULT false | |
| `is_community_submitted` | BOOLEAN DEFAULT false | True for plays submitted via post-to-community flow |
| `sort_order` | INT DEFAULT 0 | |
| `created_by` | UUID FK → `users` ON DELETE SET NULL | Staff member who created it. NULL = owner-created |

**Note:** `tags TEXT[]` from v1 is dropped. Tags are now managed via `platform_play_tags` and `platform_play_tag_links`. `previous_play_data` from v1 is also dropped — versioning goes through `play_data_version`.

Indexes: `(is_featured, sort_order)`, `(folder_id)`, `(created_by)`.

---

#### `platform_play_tags`
Tag dictionary for platform plays. Not team-scoped.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `label` | TEXT NOT NULL | |
| `normalized_label` | TEXT NOT NULL | |

**Constraint:** UNIQUE `(normalized_label)`.

---

#### `platform_play_tag_links`
Junction table linking platform plays to their tags.

| Column | Type | Notes |
|---|---|---|
| `play_id` | UUID FK → `platform_plays` ON DELETE CASCADE | |
| `tag_id` | UUID FK → `platform_play_tags` ON DELETE CASCADE | |

**Constraint:** PK `(play_id, tag_id)`.

Index: GIN index on tags via this junction replaces the v1 `tags GIN` index on the array column. Add `(tag_id)` index for tag-based filtering.

---

#### `playbook_sections`
Admin-curated collections of platform plays shown to coaches. Each sport has one default section and optionally one community section.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | Display name |
| `description` | TEXT DEFAULT `''` | |
| `sport` | TEXT | |
| `sort_order` | INT DEFAULT 0 | |
| `is_published` | BOOLEAN DEFAULT false | Only published sections are visible to users |
| `is_default` | BOOLEAN DEFAULT false | The curated default collection for this sport |
| `is_community` | BOOLEAN DEFAULT false | Marks the community-submitted plays section for this sport. Replaces the v1 name-string-match hack in the post-to-community route |

**Constraints:** UNIQUE partial index `(sport) WHERE is_default = true AND sport IS NOT NULL` — one default section per sport.

---

#### `playbook_section_plays`
Junction table linking playbook sections to platform plays. **Note:** this links to `platform_plays`, not team `plays`.

| Column | Type | Notes |
|---|---|---|
| `section_id` | UUID FK → `playbook_sections` ON DELETE CASCADE | |
| `play_id` | UUID FK → `platform_plays` ON DELETE CASCADE | |
| `sort_order` | INT DEFAULT 0 | Per-section ordering |
| `added_at` | TIMESTAMPTZ DEFAULT now() | |

**Constraint:** PK `(section_id, play_id)`. A platform play can appear in multiple sections simultaneously — this is intentional.

Indexes: `(section_id)`, `(play_id)`.

---

#### `page_sections`
Named slots for featured platform plays on public-facing pages (landing, sport pages, one-pager). Seeded and upserted on server startup.

| Column | Type | Notes |
|---|---|---|
| `section_key` | VARCHAR(100) PK | e.g. `'landing.visualize.football'` |
| `label` | TEXT NOT NULL | Admin display name |
| `page` | TEXT NOT NULL | Which page this slot belongs to |
| `play_id` | UUID FK → `platform_plays` ON DELETE SET NULL | NULL = slot is empty |
| `is_priority` | BOOLEAN DEFAULT false | Influences display ordering |

**Note:** `play_id` always references `platform_plays`, never team `plays`.

---

### Presets & Prefabs

#### `sport_presets`
Admin-managed full starting canvases shown to all users of a sport when creating a new play.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `sport` | TEXT NOT NULL | |
| `name` | TEXT DEFAULT `'Preset'` | |
| `play_data` | JSONB NOT NULL | Full starting canvas state |
| `sort_order` | INT DEFAULT 0 | |
| `is_hidden` | BOOLEAN DEFAULT true | Hidden = admin-only. Visible = shown to all users of that sport |
| `created_by` | UUID FK → `users` ON DELETE SET NULL | Staff creator |

Index: `(sport)`, `(created_by)`.

---

#### `sport_prefab_presets`
Admin-managed reusable player groupings per sport. Appear in the Slate Prefabs panel for all users of that sport when published (`is_hidden = false`).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `sport` | TEXT NOT NULL | |
| `name` | TEXT DEFAULT `'Prefab'` | |
| `prefab_data` | JSONB NOT NULL | Player grouping definition |
| `sort_order` | INT DEFAULT 0 | |
| `is_hidden` | BOOLEAN DEFAULT true | |
| `created_by` | UUID FK → `users` ON DELETE SET NULL | |

Index: `(sport)`, `(created_by)`.

---

#### `user_prefabs`
Personal player groupings saved by individual users. Cross-device (stored in DB, not localStorage).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `users` ON DELETE CASCADE | |
| `label` | TEXT NOT NULL | |
| `prefab_data` | JSONB NOT NULL | |

Index: `(user_id)`.

---

#### `admin_prefabs`
Admin-panel-only prefabs. Managed via `/admin/prefabs`. **Not served to end users** — only accessible in the admin panel. Distinct from `sport_prefab_presets` (which are user-facing) and `user_prefabs` (which are personal).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `label` | TEXT NOT NULL | |
| `prefab_data` | JSONB NOT NULL | |
| `created_by` | UUID FK → `users` ON DELETE SET NULL | |

Index: `(created_by)`.

---

### Staff & Admin

#### `staff_admin_roles`
Named permission sets for staff members. A role defines the base permissions that staff members assigned to it inherit.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `description` | TEXT DEFAULT `''` | |
| `permissions` | JSONB DEFAULT `'{}'` | Nested permission object |

**Constraint:** UNIQUE index on `LOWER(name)`.

---

#### `staff_admins`
Active staff members with admin panel access. Permissions are resolved as a deep merge: `staff_admin_roles.permissions` is the base, `staff_admins.permissions` are per-staff overrides applied on top.

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID PK FK → `users` ON DELETE CASCADE | |
| `role_id` | UUID FK → `staff_admin_roles` ON DELETE SET NULL | Base role. NULL = no role, inline permissions only |
| `permissions` | JSONB DEFAULT `'{}'` | Per-staff overrides on top of role permissions |
| `invited_by` | UUID FK → `users` | |
| `invited_at` | TIMESTAMPTZ DEFAULT now() | |
| `accepted_at` | TIMESTAMPTZ | NULL = invite pending |
| `revoked_at` | TIMESTAMPTZ | NULL = active |

**Important:** Effective permissions = `merge(role.permissions, staff_admins.permissions)`. Neither field alone is the full permission set. The platform owner has `permissions: null` which is a sentinel meaning "skip all permission checks."

Index: `(role_id)`.

---

#### `staff_admin_invites`
Pending staff invitations. Accepted invites create a `staff_admins` row.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `email` | TEXT NOT NULL | |
| `role_id` | UUID FK → `staff_admin_roles` ON DELETE SET NULL | Role to assign on acceptance |
| `permissions` | JSONB DEFAULT `'{}'` | Override permissions to assign on acceptance |
| `token` | TEXT UNIQUE NOT NULL | Sent in the invite email |
| `created_by` | UUID FK → `users` | |
| `expires_at` | TIMESTAMPTZ NOT NULL | |
| `accepted_at` | TIMESTAMPTZ | |
| `accepted_user` | UUID FK → `users` | |

Indexes: `(role_id)`, partial on `LOWER(email) WHERE accepted_at IS NULL`.

---

#### `admin_audit_log`
Append-only log of all admin and staff mutations. Never updated or deleted in normal operation.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `occurred_at` | TIMESTAMPTZ DEFAULT now() | |
| `actor_auth_mode` | TEXT NOT NULL | `legacy_admin \| staff \| owner_jwt` |
| `actor_user_id` | UUID | NULL for unauthenticated legacy admin actions |
| `action` | TEXT NOT NULL | e.g. `play.delete`, `user.bulk_delete` |
| `target_type` | TEXT | e.g. `play`, `user` |
| `target_id` | TEXT | String to accommodate both UUID and non-UUID IDs |
| `metadata` | JSONB DEFAULT `'{}'` | Additional context |

**Note:** This table grows unbounded. Add a TTL cleanup job or range partition by month before data volume becomes a problem.

Indexes: `(actor_user_id, occurred_at DESC)`, `(action, occurred_at DESC)`.

---

### Notifications

#### `notifications`
Admin-authored notification records. A notification is an ordered list of blocks — text and/or question blocks.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `title` | TEXT NOT NULL | Admin display title |
| `subject` | TEXT DEFAULT `''` | User-facing subject line |
| `priority` | TEXT DEFAULT `'normal'` | `normal \| high \| critical` CHECK constraint |
| `blocks` | JSONB DEFAULT `'[]'` | Ordered array of block objects (see block shapes below) |
| `audience` | JSONB DEFAULT `'{}'` | Filter spec — not a FK. Shape: `{ mode, sport, playFilter, signupFrom, signupTo }`. Evaluated at send time by `notificationAudience.js` |
| `audience_label` | TEXT DEFAULT `''` | Denormalized human-readable description of `audience` |
| `is_test` | BOOLEAN DEFAULT false | Test sends go to a single recipient and are excluded from analytics |
| `recipient_count` | INT DEFAULT 0 | Denormalized count set at send time. Not DB-enforced |
| `created_by` | UUID FK → `users` ON DELETE SET NULL | |

**Block shapes:**

```js
// Text block
{ kind: "text", html: "..." }

// Question block
{
  kind: "question",
  id: "uuid",           // keyed into notification_responses.answers
  label: "...",
  type: "multiple" | "checkboxes" | "dropdown" | "yes_no" | "scale" | "rating" | "text",
  options?: [...],      // for choice types
  scaleMax?: number     // for scale type
}
```

Index: `(created_at DESC)`.

---

#### `notification_recipients`
Fan-out table — one row per (notification, user) when a notification is sent.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `notification_id` | UUID FK → `notifications` ON DELETE CASCADE | |
| `user_id` | UUID FK → `users` ON DELETE CASCADE | |
| `read_at` | TIMESTAMPTZ | NULL = unread |
| `responded_at` | TIMESTAMPTZ | NULL = no response submitted |

**Constraint:** UNIQUE `(notification_id, user_id)`.

Indexes: compound `(user_id, read_at)` (covers both list query and unread count), `(notification_id)`.

---

#### `notification_responses`
User answers to question blocks within a notification. One row per (notification, user) — all question answers for that notification are stored together in `answers`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `notification_id` | UUID FK → `notifications` ON DELETE CASCADE | |
| `user_id` | UUID FK → `users` ON DELETE CASCADE | |
| `answers` | JSONB DEFAULT `'{}'` | Object keyed by question block `id`, value is the user's answer |

**Constraint:** UNIQUE `(notification_id, user_id)` — one response record per user per notification (upserted).

Index: `(notification_id)`.

---

### Email Campaigns

#### `recurring_email_campaigns`
Admin-managed recurring broadcast email campaigns.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | Admin display name |
| `subject` | TEXT NOT NULL | |
| `subheader` | TEXT DEFAULT `''` | |
| `body` | TEXT NOT NULL | |
| `youtube_url` | TEXT DEFAULT `''` | |
| `gif_url` | TEXT DEFAULT `''` | R2 URL |
| `play_embed` | JSONB | Embedded play preview |
| `audience_user_type` | TEXT DEFAULT `'onboarded'` | |
| `audience_sport` | TEXT DEFAULT `''` | |
| `audience_roles` | TEXT[] DEFAULT `'{}'` | |
| `frequency_type` | TEXT NOT NULL | `weekly \| monthly \| custom` |
| `frequency_day_of_week` | INT | 0=Sun..6=Sat. Set when `frequency_type = 'weekly'` |
| `frequency_day_of_month` | INT | 1–31. Set when `frequency_type = 'monthly'` |
| `frequency_interval_days` | INT | Set when `frequency_type = 'custom'` |
| `frequency_hour` | INT DEFAULT 9 | UTC hour to send |
| `active` | BOOLEAN DEFAULT true | |
| `next_send_at` | TIMESTAMPTZ | Computed by `computeNextSendAt`. Partial index where `active = true` |
| `last_sent_at` | TIMESTAMPTZ | |
| `send_count` | INT DEFAULT 0 | |

**Note:** The frequency is spread across 5 conditional columns — only the columns matching `frequency_type` are populated. `frequency_day_of_month = 31` on a 30-day month overflows to the next month; this is a known bug to fix in v2.

Index: partial `(active, next_send_at) WHERE active = true`.

---

### Feature Flags

#### `feature_flags`
Controls which features are enabled for which users. Rules are evaluated client-side using `featureFlags.js`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT UNIQUE NOT NULL | Stable identifier referenced in code |
| `description` | TEXT DEFAULT `''` | |
| `enabled` | BOOLEAN DEFAULT true | Global kill-switch |
| `rules` | JSONB DEFAULT `'[]'` | Array of rule objects. Empty array = everyone. All rules must match (AND logic) |

**Rule shapes:**

```js
{ type: "sport",              values: ["football", "rugby"] }
{ type: "team_role",          roles: ["owner", "coach"] }
{ type: "user_type",          values: ["onboarded"] }
{ type: "rollout_percentage", value: 50 }   // sticky per user via hash
{ type: "geolocation",        countries: ["US"], states: ["OH"] }
```

**Note:** `rules` JSONB has no DB-level schema validation. Invalid rule shapes fail silently at evaluation time.

---

### Outreach

#### `outreach_schools`
Known college athletic programs targeted for outreach. Seeded with Ohio schools on startup.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `canonical_name` | TEXT NOT NULL | |
| `short_name` | TEXT | |
| `athletic_domain` | TEXT UNIQUE NOT NULL | Used as the stable dedup key |
| `platform` | TEXT DEFAULT `'unknown'` | `sidearm_legacy \| sidearm_nextgen \| prestosports \| wordpress \| custom \| unknown` CHECK constraint |
| `staff_directory_url` | TEXT | |
| `division` | TEXT | |
| `scrapeable` | BOOLEAN DEFAULT false | Whether the scraper can extract staff from this school |
| `last_scraped_at` | TIMESTAMPTZ | |
| `last_scrape_error` | TEXT | Last error message if scrape failed |

---

#### `outreach_scraped_staff`
Staff records extracted from athletic department websites.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `school_id` | UUID FK → `outreach_schools` ON DELETE CASCADE | |
| `name` | TEXT | |
| `title` | TEXT | |
| `sport` | TEXT | Free text — no FK |
| `role_tags` | TEXT[] DEFAULT `'{}'` | Inferred role categories (e.g. `['head_coach', 'football']`) |
| `email` | TEXT | |
| `phone` | TEXT | |
| `source` | TEXT DEFAULT `'scrape'` | `scrape \| manual` CHECK constraint |
| `scraped_at` | TIMESTAMPTZ DEFAULT now() | |

Indexes: `(school_id)`, `(sport)`. Add GIN on `role_tags` for role-based filtering.

---

### Feedback & Errors

#### `error_reports`
Client-submitted JavaScript error reports. No authentication required to write.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `error_message` | TEXT NOT NULL | |
| `error_stack` | TEXT | |
| `component` | TEXT | React component name where error occurred |
| `action` | TEXT | User action that triggered the error |
| `page_url` | TEXT | |
| `user_agent` | TEXT | |
| `device_info` | JSONB | |
| `extra` | JSONB | Arbitrary additional context |
| `user_id` | UUID FK → `users` ON DELETE SET NULL | NULL for unauthenticated reporters |
| `session_id` | TEXT | |

**Note:** This endpoint is unauthenticated — add rate limiting in v2 to prevent table flooding.

Indexes: `(created_at DESC)`, `(component)`.

---

#### `user_issues`
Beta tester feedback submissions.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `users` ON DELETE SET NULL | |
| `user_name` | TEXT | Denormalized snapshot |
| `user_email` | TEXT | Denormalized snapshot |
| `title` | TEXT NOT NULL | |
| `description` | TEXT NOT NULL | |
| `status` | TEXT DEFAULT `'open'` | `open \| closed` — no CHECK constraint in v1, add one in v2 |

Indexes: `(created_at DESC)`, `(user_id)`.

---

#### `demo_videos`
Admin-managed tutorial video list shown to users.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `title` | TEXT NOT NULL | |
| `youtube_url` | TEXT | |
| `keywords` | TEXT DEFAULT `''` | Space-separated search keywords |
| `done` | BOOLEAN DEFAULT false | Whether the video has been produced |
| `sort_order` | INT DEFAULT 0 | |

Index: `(sort_order ASC, created_at ASC)`.

---

## Connection pooling

_To be written._
