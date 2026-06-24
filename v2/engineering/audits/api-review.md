# Coachable Server — API Review

**Reviewed:** June 2026
**Scope:** All 46 non-node_modules server files — routes, middleware, lib, utils, db schema, config
**Method:** Four parallel deep reads across auth/identity, core product, admin/platform, and infrastructure layers
**Purpose:** Understand what we have, grill the problems, and inform v2 decisions

---

## Server File Map

```
server/
├── index.js                         — Express app entry, route mounting, background jobs, auto-migration
├── config/
│   └── sports.js                    — Sport list (source of truth for sport names)
├── db/
│   ├── schema.sql                   — Idempotent PostgreSQL schema (all tables + migrations)
│   ├── pool.js                      — pg Pool instance
│   └── migrate.js                   — Runs schema.sql on startup
├── middleware/
│   ├── auth.js                      — requireAuth, requireTeamRole, signToken, JWT helpers
│   ├── staffAuth.js                 — Staff JWT auth, permission resolution, redactByPerm, writeAudit
│   ├── bodyBounds.js                — Request body size guard (with per-path exemptions)
│   └── rateLimit.js                 — express-rate-limit setup (in-memory store)
├── lib/
│   ├── email.js                     — Transactional email via Resend (7 inline HTML functions)
│   ├── broadcastEmailTemplate.js    — HTML template renderer for broadcast campaigns
│   ├── userTeams.js                 — getUserTeams, resolveActiveTeam, ensurePersonalWorkspace, seedDemoPlay
│   ├── validate.js                  — Input validation helpers, LIMITS constants, ValidationError
│   ├── featureFlags.js              — resolveFlags, buildUserContext, resolveFlag
│   ├── notificationAudience.js      — Pure audience-matching functions (no DB)
│   ├── signupBlocklist.js           — Hardcoded in-memory domain/name blocklist
│   ├── gifAssetStore.js             — In-memory GIF blob store (process-local)
│   ├── r2Upload.js                  — Cloudflare R2 upload helper
│   └── outreachScraper/             — Sidearm athletic staff scraper (http, parser, normalizer, csv)
├── routes/
│   ├── auth.js                      — Signup, login, logout, /me, forgot/reset password, config
│   ├── onboarding.js                — Create-team, join-team, solo (first-run paths)
│   ├── users.js                     — Profile update, email change flow
│   ├── verification.js              — Account email verification
│   ├── teams.js                     — Team management, join, leave, switch, invite codes, members
│   ├── plays.js                     — Full play CRUD, tags, favorites, folders, sharing, community post
│   ├── folders.js                   — Folder CRUD + folder share links
│   ├── playbookSections.js          — Platform playbook sections (public listing + copy to team)
│   ├── shared.js                    — Public shared play/folder token resolution + copy
│   ├── platformPlays.js             — Platform play library (public browse + auth copy)
│   ├── pageSections.js              — Landing page featured play sections (public)
│   ├── notifications.js             — User-facing notification read/respond
│   ├── flags.js                     — Feature flag resolution (user) + admin CRUD
│   ├── admin.js                     — 3,608-line admin monolith (session, users, content, analytics, email, staff)
│   ├── staff.js                     — Staff invite acceptance + session resolution
│   ├── prefabs.js                   — User personal prefabs CRUD
│   ├── sportPresets.js              — Public sport canvas presets
│   ├── sportPrefabPresets.js        — Auth-gated sport prefab presets
│   ├── demoVideos.js                — Demo video management
│   ├── errorReports.js              — Client error report submission + admin view
│   ├── userIssues.js                — Beta tester issue submission
│   └── outreach.js                  — Admin outreach scraper trigger
└── utils/
    ├── syncSports.js                — Upserts page_sections rows per sport on startup
    ├── syncPlaybookDefaults.js      — Upserts community playbook sections per sport on startup
    └── computeNextSendAt.js         — Next fire time calculation for recurring campaigns
```

---

## Layer 1 — Auth & Identity

### What Each Route Does

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /auth/signup | authLimiter + emailLimiter | Create user, hash password, issue JWT cookie, optionally send verification code |
| POST | /auth/login | authLimiter | Verify password, resolve active team, issue JWT cookie |
| POST | /auth/logout | — | Clear session cookie (no server-side token invalidation) |
| GET | /auth/me | requireAuth | Full user bootstrap: profile + preferences + active team + all teams |
| POST | /auth/forgot-password | authLimiter + emailLimiter | Send 6-digit reset code; returns ok:true even for unknown emails |
| POST | /auth/reset-password | authLimiter | Validate code, update password hash, mark code used |
| GET | /auth/config | — | Public: returns { requireEmailVerification } for frontend |
| POST | /onboarding/create-team | requireAuth | Full transaction: create team, owner membership, invite codes, seed demo play, set onboarded_at |
| POST | /onboarding/join-team | requireAuth | Full transaction: resolve invite code → role, create membership, set onboarded_at |
| POST | /onboarding/solo | requireAuth | Full transaction: create personal workspace, owner membership, set onboarded_at |
| PATCH | /users/me | requireAuth | Update display name only |
| PATCH | /users/me/preferences | requireAuth | Upsert user_preferences via COALESCE (any/all fields optional) |
| POST | /users/me/change-email | requireAuth + emailLimiter | Send verification code to new email; enforces 60s rate limit |
| POST | /users/me/confirm-email-change | requireAuth | Validate code, swap email on users row, catch race condition via 23505 |
| POST | /verification/send | requireAuth + emailLimiter | Send/resend account verification code |
| POST | /verification/verify | requireAuth | Validate code, set email_verified_at |
| GET | /verification/status | requireAuth | Returns { verified: bool } |

### Problems

**1. `email_verification_codes` shared between two flows with no purpose column**
`verification.js` (account verification) and `users.js` (email change) both write to `email_verification_codes`. Both invalidation queries run `WHERE user_id = $1 AND used_at IS NULL` with no other filter. Requesting an email change while a verification code is pending silently kills the pending verification and vice versa. Needs a `purpose` column (`verify_account | change_email`) and all queries must filter on it.

**2. No password re-confirmation before email change**
`POST /users/me/change-email` requires only a valid session cookie. A stolen session can change the account email without knowing the password. This is a standard security expectation that's missing.

**3. No authenticated password change endpoint**
Changing your password while logged in requires triggering the forgot-password email flow. There is no `POST /users/me/change-password` endpoint that accepts `{ currentPassword, newPassword }`. This is a real missing endpoint.

**4. `assistantPermissions` is hardcoded and wrong**
`GET /auth/me` returns `assistantPermissions: { canCreateEditDeletePlays: true, canManageRoster: true, canSendInvites: false }` for every user regardless of role. A player receives `canCreateEditDeletePlays: true` in their auth payload. The actual restriction only exists in the frontend. The field should be derived from `team_settings` for the active team membership.

**5. Logout has no `requireAuth` guard**
Any unauthenticated request to `POST /auth/logout` returns 200. Harmless in practice but semantically wrong and confusing to debug.

**6. Invite codes are hex strings validated as 6-digit numeric codes**
Invite codes are generated as `crypto.randomBytes(4).toString("hex").toUpperCase()` — 8-character hex strings (e.g. `A3F72B1C`). `requireCode` in validate.js enforces `^\d+$` (digits only, 6 chars). The onboarding join route uses `requireString(code, { max: LIMITS.CODE })` instead, meaning invite codes get no format validation — any ≤12-character string passes through to the DB lookup.

**7. `signupBlocklist` requires a deploy to update**
A hardcoded in-memory array of ~30 domains and name substrings. No admin interface. No wildcard support. New spam variants need a code change and Railway redeploy.

**8. Onboarding path not recorded**
`onboarded_at` is a single timestamp. There is no record of which path the user took (create-team, join-team, solo). No onboarding funnel data.

### Efficiency

- `GET /auth/me` makes 3 sequential DB queries on every page load. This is the most-called endpoint in the app. Could be one JOIN.
- `resolveActiveTeam` runs on both login and every `/me` call — re-derives the active team even though it's stored in `users.active_team_id`.
- `requireTeamRole` makes one DB query per protected route call. The implicit index needed is `(team_id, user_id)` on `team_memberships`.
- Three separate routes enforce the 60-second code rate limit via a `SELECT ... WHERE created_at > now() - interval '60 seconds'` DB read. These should use a dedicated rate-limit store, not a DB read.
- `PATCH /users/me/preferences` passes 8 nullable COALESCE parameters even for single-field updates. A JSONB preferences column would let this be a single merge operation.

---

## Layer 2 — Core Product (Plays, Teams, Folders, Sharing)

### What Each Route Does

**Plays** (all under `/teams/:teamId`)

| Method | Path | Role Required | Description |
|---|---|---|---|
| GET | /:teamId/plays | any member | All plays; filters hidden_from_players for players |
| POST | /:teamId/plays | coach+ | Create play; upserts tags in per-tag loop, no transaction |
| GET | /:teamId/plays/:id | any member | Single play + tags + favorites |
| PATCH | /:teamId/plays/:id | coach+ | Dynamic SET update; playData accepted with zero validation |
| DELETE | /:teamId/plays/:id | coach+ | Soft delete (archived_at); silent no-op if play not found |
| GET | /:teamId/plays-trash | coach+ | List archived plays |
| POST | /:teamId/plays/:id/restore | coach+ | Clear archived_at |
| DELETE | /:teamId/plays/:id/permanent | coach+ | Hard delete; no 404 check |
| PATCH | /:teamId/plays/:id/tags | coach+ | Full tag replace: delete all + re-insert per-tag, no transaction |
| PUT | /:teamId/plays/:id/favorite | any member | Toggle favorite |
| PATCH | /:teamId/plays/:id/notes | coach+ | Update notes; COALESCE prevents clearing to empty |
| PATCH | /:teamId/plays/:id/folder | coach+ | Move play to folder |
| POST | /:teamId/plays/:id/duplicate | coach+ | Copy play + tags; no transaction |
| POST | /:teamId/plays/bulk/delete | coach+ | Bulk soft delete; playIds not validated as UUIDs |
| POST | /:teamId/plays/bulk/move | coach+ | Bulk move to folder |
| POST | /:teamId/plays/bulk/tags | coach+ | Add tags to up to 500 plays; nested loop, individual INSERTs |
| POST | /:teamId/plays/:id/share | coach+ | Create play_share_links token |
| POST | /:teamId/plays/:id/post-to-community | coach+ | Copy play to platform_plays; looks up community section by constructed name |

**Teams**

| Method | Path | Role Required | Description |
|---|---|---|---|
| POST | /teams/join | requireAuth | Join by invite code in transaction; auto-switch active team |
| POST | /teams/create | requireAuth | Create team + settings + membership + invite codes + seed play in transaction |
| POST | /teams/create-personal | requireAuth | Create personal workspace; auto-number name |
| POST | /teams/:id/switch | any member | Set active team |
| POST | /teams/:id/leave | any member | Role-aware leave; auto-create personal workspace if no teams left |
| GET | /teams/:id/members | any member | All members with name/email/role |
| GET | /teams/:id/invite-codes | coach+ | Read codes; generate missing ones on the fly |
| POST | /teams/:id/invite-codes/rotate | coach+ | Rotate one code by role |
| PATCH | /teams/:id/settings | coach+ | Update name/sport/seasonYear/assistant permissions |
| POST | /teams/:id/ownership-transfer | owner | Transfer ownership in transaction; demote old owner to coach |
| POST | /teams/:id/invites | coach+ | Send invite email with standing invite code (not a one-time token) |
| DELETE | /teams/:id/members/:userId | any member | Kick member or self-leave; sends removal email fire-and-forget |

**Folders**

| Method | Path | Role Required | Description |
|---|---|---|---|
| GET | /:teamId/folders | any member | All folders flat (no tree) |
| POST | /:teamId/folders | coach+ | Create folder; max depth 4 via iterative DB walk (N queries) |
| PATCH | /:teamId/folders/:id | coach+ | Rename or reorder |
| DELETE | /:teamId/folders/:id | coach+ | Hard delete; plays move to root via FK cascade |
| POST | /:teamId/folders/:id/share | coach+ | Create folder_share_links token |

**Shared / Playbook**

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /shared/plays/:token | public | Resolve token → full play including play_data |
| POST | /shared/plays/:token/copy | requireAuth | Copy to user's **first** team membership, not active team |
| GET | /shared/folders/:token | public | Folder + all plays with full play_data, no pagination |
| POST | /shared/folders/:token/copy | requireAuth | Create folder + per-play INSERT loop |
| GET | /playbook-sections | public | Published sections with play counts |
| GET | /playbook-sections/sport/:sport/plays | public | First N plays for sport; separate count query |
| GET | /playbook-sections/:id | requireAuth | Full section + all plays with full play_data |
| POST | /playbook-sections/:id/copy | requireAuth | Copy all plays to active team; inline role check (not middleware) |

### Problems

**1. `POST /shared/plays/:token/copy` copies to first membership, not active team**
`memberRows[0]` takes the first team by DB order (join date). A user with multiple teams always gets the copy dropped into their oldest team, silently, with no indication of which team received it. `POST /playbook-sections/:id/copy` has the same bug. Both should use `users.active_team_id` consistently.

**2. Soft-delete silent no-op**
`DELETE /:teamId/plays/:id` runs `UPDATE plays SET archived_at = now() WHERE id = $1 AND team_id = $2` and always returns `{ ok: true }` regardless of whether any row matched. If the play ID is wrong or belongs to another team, the caller gets a success response. The restore route correctly checks `RETURNING *` — delete should too.

**3. `playData` written with zero validation**
`PATCH /:teamId/plays/:id` accepts `req.body?.playData` with no null check, no schema validation, no semantic size check beyond the body parser limit. Arbitrary JSON goes straight into the JSONB column. A malformed canvas object can corrupt a play with no error response.

**4. Notes cannot be cleared to empty**
`PATCH /:teamId/plays/:id/notes` uses `COALESCE($1, notes)`. Sending `{ notes: null }` leaves the existing value intact. The frontend works around this by sending `""`, but it's a silent trap for any future client or tool.

**5. `POST /:teamId/plays/bulk/*` — no UUID validation on playIds**
`requireArray` checks array length but not element format. Non-UUID strings flow through to the DB query and fail with a PostgreSQL error instead of a clean 400.

**6. Tag operations have no transactions**
`PATCH /:teamId/plays/:id/tags` does delete-all then re-insert in a loop with no wrapping transaction. Mid-loop failure leaves the play with a partial tag set. `POST /plays` and `POST /plays/:id/duplicate` also do tag inserts without transactions.

**7. `POST /teams/:id/invites` sends the standing team invite code, not a one-time token**
The invite email sends the current rotating `invite_code` for the team. A `team_invites` row with a separate token is created and stored but is never used or sent. Rotating the invite code after sending invalidates all outstanding email invites silently.

**8. `post-to-community` coupled to section name string**
`WHERE LOWER(name) = LOWER('Community ${rawSport} Plays')` — if a community section is renamed in admin, this feature silently 400s for that sport. There is no FK or type flag linking a sport to its community section.

**9. Folder depth check is N serial queries with a race condition**
The `POST /:teamId/folders` parent-chain walk runs one `SELECT parent_id` per ancestor in a `while` loop. Two concurrent requests can both pass the depth check and create a 5th level. Should be a single recursive CTE.

**10. `playbookSections.js` and `shared.js` manually re-implement role checks**
Both files check membership and role inline instead of using `requireTeamRole` middleware. This is a copy of the middleware logic that will drift. Any future permission model change needs to be applied in 3 places.

**11. Share link generation duplicated**
The 32-char hex token + `*_share_links` INSERT pattern is identical in `plays.js` and `folders.js`. Should be a `lib/shareLinks.js` helper.

### Efficiency

- `GET /:teamId/plays` runs `SELECT *` on plays, pulling full `play_data` JSONB for every play even though the list UI only needs metadata. For a team with 200 animated plays this can be hundreds of MB transferred from DB to Node per request.
- Same problem on `GET /shared/folders/:token` — full `play_data` for every play in the folder, on a public endpoint with no auth.
- No pagination anywhere in play list endpoints. A team with 500 plays returns all 500 in one response.
- `POST /plays/bulk/tags` with 500 plays × 10 tags = 5,000 individual INSERT statements. PostgreSQL supports bulk multi-row VALUES inserts.
- `POST /playbook-sections/:id/copy` inserts one play per loop iteration. A section with 50 plays = 50 round-trips.
- `GET /playbook-sections/sport/:sport/plays` runs two separate queries for data and count instead of using a window function.
- Folder depth check: N serial queries per folder creation instead of a single recursive CTE.
- Tag operations: per-tag DB round-trip everywhere instead of a single batch insert.

---

## Layer 3 — Admin & Platform

### What Each Route Does (summary)

`admin.js` is a 3,608-line monolith handling 9 distinct concerns:

**Session/Auth:** Login (bcrypt vs `ADMIN_HASH`), session JWT, OTP elevation, Danger Mode (10-min elevated window), security email management.

**Users:** Full user list with aggregated membership/play counts; typeahead search; activity detail (7-branch UNION ALL); single and bulk user delete (`DELETE /admin/users` — nukes everything); account creation; stale account cleanup; beta tester toggle; deleted team restore.

**Platform Content:** Platform plays CRUD with one-step rollback (`previous_play_data`); platform folder CRUD; page sections (assign featured plays); playbook sections (curated/community collections).

**Presets:** Sport canvas presets CRUD; sport prefab presets CRUD — both with sport-scoped staff permissions and Danger Mode for destructive deletes.

**Staff Management:** Staff role CRUD; invite creation/revocation; active staff list/update/revoke.

**Analytics:** Single endpoint firing 8+ parallel DB queries for the full dashboard — users, plays, teams, errors, issues, funnel, sport mix, growth chart.

**Email:** Broadcast email to up to 2,000 recipients synchronously inside the HTTP request; recurring campaign CRUD + manual fire; in-memory GIF asset store; R2 image asset upload.

**In-App Notifications (authoring):** Audience preview; fan-out send; notification history; notification detail with charts.

Other route files: `staff.js` (invite acceptance + session), `flags.js` (flag resolution + admin CRUD), `notifications.js` (user-facing read/respond), `platformPlays.js` (public browse + copy), `pageSections.js` (public featured section), `demoVideos.js`, `errorReports.js`, `userIssues.js`.

### Problems

**1. `DELETE /admin/users` (bulk) requires no confirmation beyond Danger Mode**
One authenticated request in a 10-minute Danger Mode window deletes every user and team in the database. No `confirm` body field, no dry-run, no secondary confirmation. Danger Mode is specifically designed to allow quick successive actions — this is the worst case for that design.

**2. `POST /error-reports` has no rate limiting and no auth**
Unauthenticated writes go directly to the DB. The char-slice limits payload size but nothing limits volume. A simple loop floods the error_reports table.

**3. `created_by` on admin notifications stores `undefined`**
`POST /admin/notifications/send` uses `req.userId` for `created_by`. Admin session auth does not set `req.userId` — that's populated by user JWT middleware. Every notification sent from the admin panel silently stores `NULL` as `created_by`.

**4. Danger Mode bypass for JWT-authenticated owners on preset/prefab deletes**
The elevation check `req.actor.authMode === "legacy_admin" && !isLegacyAdminElevated(req)` is skipped if the owner is authenticated via JWT staff auth (not the legacy admin password). Deleting sport presets/prefabs as a JWT-auth'd owner bypasses the Danger Mode guard silently.

**5. `demoVideos.js` imports `requireElevated` from `routes/admin.js`**
A route file importing from another route file. `requireElevated` is middleware and belongs in `middleware/`. This creates a hidden coupling that will break if `admin.js` is ever split.

**6. `GET /flags/me` fires 2 DB queries on every authenticated request**
One for all flags, one for user context (memberships + user row). Neither is cached. Flag data changes almost never.

**7. `resolveFlag` (single flag) fetches all flags**
`resolveFlag` wraps `resolveFlags` which always loads the full flag list. A single-flag check costs the same as loading all flags.

**8. `GET /admin/notifications` hard-caps at 200 rows with no pagination**
Old notifications become invisible in the admin panel without any indication of truncation.

**9. `GET /platform-plays/:id` and `GET /page-sections/:key` return full `play_data` to unauthenticated callers**
This appears to be intentional (reference plays) but is not documented as an explicit decision. If plays should be gated to authenticated users, these endpoints are an accidental leak.

**10. GIF assets are in-memory and served through a public route in `admin.js`**
`GET /admin/gif-asset/:id` has no auth guard — the UUID is the only access control. GIF blobs are stored in `gifAssetStore` (process-local memory) and are lost on every Railway redeploy or restart. The R2 upload path already exists right next to this.

**11. Broadcast email is synchronous inside the HTTP request**
`POST /admin/email/send` calls `sendBroadcastEmails` synchronously. 2,000 recipients = potential 30+ second HTTP request. If Railway's request timeout fires first, sends are partially completed with no retry mechanism.

### Efficiency

- `GET /admin/analytics` fires 8+ parallel DB queries including a FULL OUTER JOIN and multi-subquery onboarding funnel against growing full tables on every dashboard page load. No caching, no materialized view.
- `GET /admin/users` fetches every user with JSON-aggregated memberships and play counts — no pagination. Will be slow at a few thousand users, broken at tens of thousands.
- `deleteUserCascade` issues 9+ sequential UPDATE/DELETE statements, including broad updates on `plays` and `team_invites` by `created_by_user_id`. Without confirmed indexes on those FK columns, each is a full table scan.
- `GET /admin/users/:id/activity` fires 4 queries in parallel, one a 7-branch UNION ALL joining plays, folders, share links, invites, and issues — on every individual user detail page open.
- Recurring campaign loop runs campaigns serially. One slow Resend response delays every subsequent campaign in the same timer tick.

---

## Layer 4 — Infrastructure

### How the Server Is Wired

`index.js` mounts 20 route modules in this order: CORS → `express.json` (10 MB limit) → `cookieParser` → global `methodAwareLimiter` → `bodyBoundsCheck` → routes → static file fallback → error handler.

Three background loops start after bind: stale account cleanup (every 6h), team hard-delete (every 24h), recurring email campaigns (every 15 min). All run as `setInterval` inside the Node process — no external scheduler, no crash recovery.

Auto-migration runs `schema.sql` synchronously on every startup via `fs.readFileSync` + `pool.query`. Blocking I/O before the server binds.

### Database Schema — Key Tables

| Table | Notes |
|---|---|
| users | UUID PK. `active_team_id FK ON DELETE SET NULL`. Columns added piecemeal via ALTER TABLE. No index on email beyond the UNIQUE constraint. |
| team_memberships | Composite UNIQUE `(team_id, user_id)`. Indexed on `user_id` and `(team_id, role)`. Clean. |
| teams | Has both `owner_user_id FK` and `role = 'owner'` in `team_memberships` — two sources of truth for ownership. |
| plays | `play_data JSONB` — full canvas + animation state, unversioned. Indexed on `team_id`, `folder_id`, `updated_at DESC`. No partial index for active (non-archived) plays. No index on `created_by_user_id`. |
| play_tag_links | No index on `tag_id`. Querying all plays with a given tag is a full junction table scan. |
| play_favorites | No index on `user_id`. Full scan to find a user's favorites. |
| platform_plays | `tags TEXT[]` — GIN index missing. Tag filtering is a sequential scan. `previous_play_data JSONB` — one-step rollback hack. |
| email_verification_codes | No `purpose` column. Indexed on `user_id` only; no composite index on `(user_id, code)`. |
| admin_audit_log | BIGSERIAL PK. No TTL, no partition. Grows unbounded. |
| recurring_email_campaigns | Frequency stored in 5 conditional columns; `next_send_at` indexed with partial index on `active = true`. |
| outreach_scraped_staff | `role_tags TEXT[]` with no GIN index. `sport TEXT` with no FK. |
| feature_flags | `rules JSONB` with no DB-level validation. |
| page_sections / playbook_sections | Seeded/upserted on every startup via `syncSports` and `syncPlaybookDefaults`. |

### Middleware Problems

- `bodyBoundsCheck` exempts 12 path prefixes including all of `/teams/`, `/admin/`, `/sport-presets/`, `/prefabs/`. Most write paths in the app are exempt. The 10 MB `express.json` limit is the only size guard on most mutation routes.
- Rate limiting uses an in-memory store. Every Railway restart resets all counters. During crash-under-load, the limit resets at the worst time.
- No request ID / correlation ID injected into requests. Error logs have no trace ID.
- No structured logging — all `console.log` / `console.error`. Log search in Railway is regex-only.
- Auth is per-route, not default-deny. A route that accidentally omits `requireAuth` is wide open.
- Routes have no `/api/` prefix. Every backend path (`/auth`, `/teams`, `/admin`) is also a potential SPA client-side route. A typo'd route returns Express's 404 HTML instead of a JSON error.

### Specific Infrastructure Problems

1. **Dual ownership tracking** — `teams.owner_user_id` and `team_memberships.role = 'owner'` are two sources of truth. An incomplete ownership transfer update only one and they diverge silently.

2. **Missing indexes** — `play_tag_links(tag_id)`, `play_favorites(user_id)`, `platform_plays tags GIN`, `outreach_scraped_staff role_tags GIN`. All of these represent query patterns that will full-scan as data grows.

3. **DB pool is default sizing** — No explicit `max`, `idleTimeoutMillis`, or `connectionTimeoutMillis` in `pool.js`. Default max is 10 connections. Background jobs + migration + request handlers share the same pool.

4. **`plays` migration references `platform_plays(id)` before `platform_plays` is defined in the file** — Works because schema.sql runs as one batch, but the ordering is implicit and fragile.

5. **`EXCEPTION WHEN others THEN NULL` in team_invite_codes migration** — Catches all exceptions silently. Non-idempotency failures are swallowed.

6. **`gifAssetStore` is process-local** — Lost on restart. Invisible to any second Railway replica. A silent failure mode if deployment ever scales.

7. **`scrapeMany` has no per-request HTTP timeout** — A slow upstream server holds an open HTTP request indefinitely with no timeout on the `fetchHtml` call.

8. **`computeNextSendAt` month-end overflow** — `new Date(Date.UTC(year, month, 31))` on a 30-day month rolls into the next month. A campaign set to fire on the 31st silently fires on the 1st or 2nd of the following month.

9. **Background jobs not recoverable** — `setInterval` loops for cleanup, team hard-delete, and email campaigns don't survive process crashes. A crash mid-campaign means partial sends with no retry.

10. **`prefabs.js` error handling bypasses the global error handler** — All three routes do `console.error + res.status(500)` instead of `next(err)`. These errors never reach the centralized handler.

11. **`reset-password.js` at server root** — Appears to be a one-off manual script with no clear home.

### Efficiency

- `syncSports` and `syncPlaybookDefaults` each run N queries per sport (8 sports = 16+ queries) on every cold start. A single batch upsert would be faster.
- `broadcastEmailTemplate.js` runs regex replacements per recipient inside the send loop. For 1,000+ recipients this is O(n × template_size).
- `play_data JSONB` is fetched in full on every list query. This is covered in Layer 2 but originates in the schema choice to put canvas state in the same row as metadata.
- DB pool default of 10 connections shared across all background jobs + request handlers. Under load, pool exhaustion causes queued waits.

---

## Cross-Cutting Problems (appear across multiple layers)

These problems were independently flagged by multiple reviewers:

### 1. `play_data` JSONB is unversioned
Flagged in: core product layer and infrastructure layer.

The full canvas + animation state is stored in `play_data` JSONB with no schema version field. As the canvas format evolves (new animation properties, changed coordinate systems, new entity types), there is no way to know which version a stored play uses without reading the data itself. Existing plays can silently break when the canvas format changes. This is the single highest-priority schema issue for v2.

### 2. Full `play_data` JSONB fetched on list queries
Flagged in: core product layer and infrastructure layer.

`GET /:teamId/plays`, `GET /shared/folders/:token`, `GET /playbook-sections/:id`, `GET /platform-plays/folders/:id` all return full `play_data` JSONB for multiple plays simultaneously. The list UI needs metadata only. The canvas state (which can be 50–200KB per play for animated plays) should only be fetched when opening the editor or viewer.

### 3. No `/api/` prefix on routes
Flagged in: infrastructure layer and admin layer.

Every backend route (`/auth`, `/teams`, `/admin`, `/plays`) shares the namespace with SPA client-side routes. Path collisions, CDN rules, and proxying all become harder to reason about. Adding a prefix in v2 before the API surface is large is the right time.

### 4. Sport is free text everywhere, not a FK
Flagged in: core product layer and infrastructure layer.

`sport TEXT` appears in `plays`, `platform_plays`, `sport_presets`, `sport_prefab_presets`, `playbook_sections`, `outreach_scraped_staff`, `teams`, and more. If a sport name changes, every one of these tables needs an UPDATE. No referential integrity enforces that a play's sport is a valid sport. A `sports` table with UUID PK and FK references would fix this.

### 5. Dual ownership source of truth
Flagged in: infrastructure layer and core product layer.

`teams.owner_user_id` and `team_memberships.role = 'owner'` both track who owns a team. An incomplete update to one makes them disagree. `teams.owner_user_id` should be dropped; `team_memberships` should be the single source of truth for all roles.

### 6. GIF asset store is in-memory and ephemeral
Flagged in: admin layer and infrastructure layer.

`gifAssetStore.js` stores GIF blobs in process memory. Every Railway deploy or restart loses all stored GIFs. The R2 upload path already exists in `lib/r2Upload.js` and is used for image assets — GIFs should use the same path.

### 7. Background jobs are not durable
Flagged in: admin layer and infrastructure layer.

`setInterval`-based background jobs (stale account cleanup, team hard-delete, recurring email campaigns) don't survive process crashes. Mid-campaign crashes produce partial sends with no recovery. These need to move to a durable external scheduler or job queue.

### 8. Broadcast email is synchronous inside an HTTP request
Flagged in: admin layer and infrastructure layer.

2,000-recipient email sends run synchronously in the request handler. Railway's request timeout can fire mid-send with no retry. Needs to enqueue and return a job ID, not block the response.

---

## V2 Considerations

These are design-level decisions to make before rebuilding, not feature requests.

### Schema

**Play data versioning** — Add `play_data_version INT` to `plays` and `platform_plays`. Inside `play_data`, include a `v` field. Add a migration layer that upgrades plays on read or save. Without this, every canvas format change is a silent breaking change for existing plays.

**Separate play metadata from canvas state** — Consider a `play_canvas` table with a 1:1 relationship to `plays`, containing only `play_data` and `play_data_version`. The `plays` table then holds only metadata (title, folder, tags, notes, thumbnail, timestamps, hidden, sport). List queries hit only `plays`. Editor/viewer queries JOIN to `play_canvas`. This makes it structurally impossible to accidentally fetch canvas data in a list query.

**Drop `teams.owner_user_id`** — Use `team_memberships` exclusively as the source of truth for all roles including owner.

**Sports as a proper FK** — Add a `sports` table. Replace all `sport TEXT` columns with `sport_id UUID REFERENCES sports(id)`. Or at minimum a DB enum for consistent values.

**Add missing indexes** — `play_tag_links(tag_id)`, `play_favorites(user_id)`, `platform_plays` tags GIN, `outreach_scraped_staff` role_tags GIN, partial index on `plays(team_id) WHERE archived_at IS NULL` for active play queries.

**Add `purpose` column to `email_verification_codes`** — Values: `verify_account | change_email`. All queries must filter on purpose. This prevents cross-contamination between the two verification flows.

**Partition or TTL `admin_audit_log`** — Range partition by month or add a cleanup job. The table currently grows unbounded.

**`platform_plays.tags TEXT[]` → junction table** — Match the pattern used for team plays.

### Auth & Identity

**Short-lived access tokens + refresh tokens** — Replace the single 7-day JWT with a short-lived access token (15-30 min) and a httpOnly refresh token. This enables real logout (refuse to refresh), forced session revocation, and per-device session management.

**Replace `OWNER_USER_ID` env var with a DB flag** — `is_platform_owner BOOL` on the `users` table or a `platform_roles` table. The current env var is a silent single point of failure.

**Add `POST /users/me/change-password`** — A logged-in user should be able to change their password with `{ currentPassword, newPassword }` without going through the email reset flow.

**Record onboarding path** — Add `onboarding_path TEXT` (`create_team | join_team | solo`) and use `onboarded_at` only as the timestamp. Enables real funnel analytics.

**DB-backed signup blocklist** — `signup_blocklist` table with `type` (domain | name_substring), `pattern`, `created_at`. Admin UI manages it. Short in-process cache TTL. No more redeploys to block a new spam domain.

### Core Product

**Explicit play `sort_order` column** — Plays are currently ordered by `updated_at DESC`. Saving a play moves it to the top of the list. Add `sort_order` to `plays` with explicit coach-controlled reordering. Use `updated_at` as a secondary sort only.

**Play sharing model** — One canonical share link per play (upsert, not always-insert). Explicit expiry. Coach-facing revocation UI. Currently multiple live share links can exist per play with no way to list or manage them.

**Tag operations as batch inserts** — Tag upsert + link operations should be a single `lib/tags.js` helper using multi-row VALUES inserts. Used in play create, tag update, bulk tag, and duplicate.

**Folder depth check as recursive CTE** — Replace the iterative N-query parent walk with a single `WITH RECURSIVE` CTE. Eliminates the N+1 and the depth-check race condition.

**`GET /:teamId/folders` must return play count and subfolder count** — The current response returns only folder metadata (`id`, `name`, `parent_id`, `sort_order`). `FolderCard` in v2 displays both `playCount` (plays with `folder_id = folder.id` and `archived_at IS NULL`) and `subfolderCount` (folders with `parent_id = folder.id`). Both should be included as joined counts in the list response rather than computed client-side.

**Community section FK** — Add `community_section_id` to sports config or a `section_type = 'community'` flag on `playbook_sections`. Decouple `post-to-community` from the string-match `LOWER(name) = LOWER('Community ${sport} Plays')` hack.

**Pagination on all list endpoints** — Cursor-based or offset. `GET /:teamId/plays`, `GET /admin/users`, `GET /admin/notifications`, `GET /error-reports` are all unbounded today.

**Optimistic concurrency on play saves** — `PATCH /:teamId/plays/:id` is last-write-wins. Two coaches editing the same play silently overwrite each other. At minimum, add `WHERE updated_at = $lastKnownAt` and return 409 on conflict.

### Admin & Platform

**Split `admin.js` into dedicated route files**
At 3,608 lines it is unmaintainable as a single file. Suggested structure:
```
server/routes/admin/
  session.js        — login, logout, elevate, Danger Mode, security email
  users.js          — user list, search, detail, delete, create, cleanup
  platform.js       — platform plays + folders + page/playbook sections
  presets.js        — sport presets + sport prefab presets
  staff.js          — staff roles, invites, active staff management
  analytics.js      — dashboard analytics queries
  email.js          — broadcast, recurring campaigns, assets
  notifications.js  — in-app notification authoring
```

**Move `requireElevated` to `middleware/adminAuth.js`** — `demoVideos.js` importing from `routes/admin.js` is a route-imports-route smell that will create circular imports when `admin.js` is split.

**Cache feature flags** — Flags change almost never. In-process cache with 60-second TTL eliminates 2 DB queries per authenticated request. Invalidate on any flag write.

**Materialized analytics** — Replace the 8-query dashboard endpoint with a scheduled job writing to `analytics_snapshots`. Dashboard reads the snapshot. Eliminates the FULL OUTER JOIN on every admin page load.

**`DELETE /admin/users` (bulk) needs a per-action confirmation body** — Require `{ confirm: "DELETE_ALL" }` in the request body, separate from Danger Mode elevation. Danger Mode is a time window; this is a per-destructive-action intent signal.

### Infrastructure

**Add `/api/` prefix to all routes** — Mount everything under `/api/` in v2. Eliminates SPA path collisions, makes CDN/proxy rules trivial, and is the standard expectation for any HTTP client.

**Separate migration from startup** — Auto-migration in `index.js` runs schema DDL synchronously before accepting traffic on every deploy. Use a dedicated migration runner (separate Railway pre-deploy command or `node-pg-migrate`) with explicit version tracking. Idempotent DDL is not a substitute for versioned migrations.

**Move background jobs out of the Node process** — Replace `setInterval` cleanup, team hard-delete, and email campaign loops with Railway cron jobs or a lightweight job queue (BullMQ + Redis). Process-based intervals don't survive restarts and can't be monitored or retried independently.

**Email fan-out as async jobs** — `POST /admin/email/send` and recurring campaign sends should enqueue and return a job ID immediately. The actual fan-out runs with retry in a background worker.

**GIF assets → R2** — `gifAssetStore` should be replaced with the same R2 upload path used for image assets. Remove the in-memory store entirely.

**Structured logging** — Replace `console.log/error` with a structured logger (pino). Inject a request ID per request. Every log line then has a trace ID, enabling Railway log search by request.

**Explicit pool config** — Set `max`, `idleTimeoutMillis`, and `connectionTimeoutMillis` in `pool.js`. Comment in `rateLimit.js` already acknowledges the in-memory store needs to move to Redis before horizontal scaling.

**All transactional email → template files** — Move the 7 inline HTML strings in `lib/email.js` to `.html` template files loaded once at startup. `broadcastEmailTemplate.js` already demonstrates the right pattern — extend it to all transactional emails.

---

## Cross-Reference Notes

**Referenced by:** `v2/TODO.md` (various items in Groups 2–4). **References:** current `server/` file structure.

**Inconsistencies to resolve:**

1. **Admin split proposal vs `proposed-file-structure.md`.** This doc proposes splitting `admin.js` into `server/routes/admin/session.js`, `users.js`, `platform.js`, `presets.js`, `staff.js`, `analytics.js`, `email.js`, `notifications.js`. `proposed-file-structure.md` (done ✅) only shows `server/routes/admin.js` (single file). **The split proposed here is correct and should be incorporated into `proposed-file-structure.md`.** Add the `server/routes/admin/` subfolder to that doc.

2. **`play_canvas` table proposal.** The V2 Considerations schema section proposes a separate `play_canvas` table for canvas state. This schema change is not referenced in `TODO.md` or any other v2 doc. If adopted, add it as a task under Group 2 (Database) in `TODO.md`.

3. **`/api/` prefix proposal.** Recommends adding `/api/` prefix to all routes. Not currently in `TODO.md` as an explicit task. If accepted, add to Group 3 (Backend) or Group 1 (Foundation) in `TODO.md`.

4. **File paths in Server File Map** — All paths reflect current `server/` structure (no `docs/` migration). Consistent with current state. Will need updating after TODO 1.2 runs.
