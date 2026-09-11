# Migration write lock (`migrationWriteLock.js`)

V1 → V2 cutover, Task 2. Refuses V1 **writes** for teams that have already moved to V2.

## The problem it solves

During cutover a team's rows are copied from V1 to V2 and V2 becomes the source of truth.
A write that lands in V1 *after* that copy has run is **silently lost** — no error, the coach
believes the change saved, and it never appears in V2. This middleware turns that silent loss
into a loud, recoverable refusal.

## How it works

One global `app.use(migrationWriteLock)` in `server/index.js`, registered immediately after
`bodyBoundsCheck` and before every route mount. V1 has **no `/api` prefix** — mutating paths are
top-level (`/teams`, `/users`, `/admin`, …) and three separate routers (`teams.js`, `plays.js`,
`folders.js`) plus `suite.js` all mount on `/teams` — so a single global registration is the
narrowest layer that covers all 24 mounts without touching a single route file.

It reads migration status from `server/lib/migrationStatus.js` (Task 1) only. It never calls V2,
never writes anything, and needs no schema change.

Order of checks, cheapest first:

| # | Check | Outcome |
|---|---|---|
| 1 | Method is not POST/PUT/PATCH/DELETE | `next()` — reads are never blocked |
| 2 | `hasEverLoaded() === false` | `next()` — **fail open**, see below |
| 3 | Snapshot has zero `v2_live` and zero `migrating` teams | `next()` — pure in-memory, no DB |
| 4 | Path is on `EXEMPT_PATH_PREFIXES` | `next()` |
| 5 | Team id in the path (`/teams/<uuid>/…`) or in `req.body.teamId` | sync `getTeamStatus()` → 409 if locked |
| 6 | Otherwise | membership fallback (one DB read) |

Check 3 is what makes this a true no-op before the cutover: while no team is locked, the
middleware exits on an in-memory read with **no database query, no token verification and no
observable behaviour change whatsoever**.

## Why 409, not 403 and not a redirect

- **403** reads as a permissions bug. Coaches file support tickets instead of going to V2.
- **A redirect** breaks every non-browser API client and turns a failed write into a confusing
  navigation.
- **409 Conflict** is exactly right: the request conflicts with the resource's current state.

Every blocked response carries a stable machine code so the frontend interstitial (Task 3) can
detect it without string-matching the message:

```json
{
  "error": "\"Varsity Hoops\" has moved to the new Coachable. Changes can no longer be saved here — please make them at https://beta.coachableplays.com. You can still view everything on this page.",
  "code": "TEAM_MIGRATED_TO_V2",
  "status": "v2_live",
  "v2Url": "https://beta.coachableplays.com",
  "teamId": "…"
}
```

`code` is **the same for both locked statuses** so the client only ever checks one value;
`status` (`"v2_live"` or `"migrating"`) carries the nuance for wording. When the request could
not be attributed to one team, `teamId` is absent and a `teams: [{teamId, teamName, status}]`
array is included instead.

## Decision: `migrating` **blocks** writes

A team mid-copy is the most dangerous window there is. Once its rows have been copied, any V1
write is lost forever with no signal to anyone. A refused write, by contrast, is fully
recoverable — the coach sees the error and redoes it in V2. **Losing data silently is strictly
worse than refusing a write that might have been safe**, so `migrating` is locked.

Reads stay allowed for `migrating` teams exactly as they do for `v2_live` ones.

## Fail open, always

1. **Cache never loaded.** `hasEverLoaded() === false` means we have genuinely never heard from
   V2 — a failed poll on boot, a missing `V2_MIGRATION_CRON_SECRET`, V2 down. Every write is
   allowed. Locking out the entire paying customer base because one poll failed is far worse
   than the data loss this prevents.
2. **Any exception.** The whole body is wrapped; the async membership branch has its own
   `try/catch` around both the DB call and the response build. Every failure path calls
   `next()`. A bug in this middleware can never 500 a coach's request or cost them a write.
3. **DB hiccup on the membership lookup.** Allowed through.

The cache's own policy complements this: it fails to *last-known-good*, so a team that is
`v2_live` never flips back to `v1_only` because V2 became unreachable.

## Resolving a request to a team

This middleware runs **before** the route mounts, so `req.params` is empty and `req.userId` is
not set (`requireAuth` is applied per-route inside each router, not globally). Resolution is
therefore done from the raw request:

1. **Path** — `/teams/<uuid>/…`. Covers `teams.js`, `plays.js`, `folders.js` and `suite.js`
   (`/teams/:teamId/suite/*`). The second segment must be a UUID, which is what keeps
   `/teams/join`, `/teams/create` and `/teams/create-personal` out of this branch.
2. **Body** — `req.body.teamId`. Exactly four routes name their target only in the body: the
   copy-into-my-team endpoints in `platformPlays.js`, `playbookSections.js` and `shared.js` (×2).
3. **Membership fallback** — for everything else, the user is read off the JWT with
   `readSessionToken` + `verifySessionToken` (the non-throwing composable pair in `auth.js`) and
   their teams come from `getUserTeamStatuses(userId)`, which resolves membership from V1's own
   `team_memberships` table. The V2 payload deliberately carries no user ids and is never used
   for identity.

   The request is blocked **only if every team the user belongs to is locked**. A partially
   migrated coach keeps full write access through this path, which matters: 26 users belong to
   more than one team. A user with **zero** teams is allowed — "every team is locked" is
   vacuously true for an empty list, and blocking a brand-new account would trap it in
   onboarding.

   Note this branch uses "every team locked" (`v2_live` **or** `migrating`) rather than
   "every team `v2_live`", so it stays consistent with the per-team rule above.

Unauthenticated mutating requests pass straight through — the route's own `requireAuth` will
answer 401, which is the right error for that case.

## Exemptions

`EXEMPT_PATH_PREFIXES` is an explicit, commented allow-list (no scattered conditionals). Prefixes
are matched on whole path **segments**, so `/admin` matches `/admin/plays` but never
`/administrators`.

| Prefix | Why |
|---|---|
| `/auth` | Login, logout, signup, forgot/reset password. Blocking these means a migrated coach cannot even log in to be told where to go. |
| `/verification` | Email verify send/confirm — otherwise an unverified user is stranded at the gate. |
| `/users` | Account/profile level: name, preferences, change-email. Not team data. |
| `/onboarding/create-team`, `/onboarding/solo` | Creates a brand-new team, which by definition cannot have been migrated. `/onboarding/join-team` is **not** exempt — joining a team that already moved is exactly the write we want to refuse. |
| `/error-reports`, `/user-issues` | Telemetry and user-submitted issues. V1 must keep collecting errors through the cutover, and "I can't get in" must be reportable. |
| `/notifications` | Read-marking only. No team content, and blocking it leaves a permanently un-clearable bell. |
| `/admin` | The whole staff console, including `/admin/outreach` and `/admin/team-suite`. Staff must keep operating V1 through the cutover — **including the lever that rolls a team back off V2**. Blocking this would remove the rollback path. |
| `/staff` | Staff invite acceptance. Staff onboarding, not coach team data. |
| `/flags` | Feature-flag kill-switch surface; must stay operable at all times. |
| `/health` | Liveness probe. GET-only today, exempt so it can never be gated. |

V1 has no inbound webhook route today, so none is listed. If one is ever added it belongs here.

## Tests

`admin/test/migrationWriteLock.test.js` — direct middleware invocation with stub req/res (no
Express, no network). The real migration-status cache is driven through
`ingestMigrationStatusPayload` / `resetMigrationStatusCache`; only `server/lib/userTeams.js` is
stubbed, because it is the one thing that would touch Postgres. Covers: reads never blocked on
all three safe verbs, 409 + stable code on all four mutating verbs, the `migrating` wording,
unmigrated teams completely unaffected, `/teams/:teamId/suite` paths, body-`teamId` copy routes,
the full exemption list, the membership fallback (all-locked blocks / partially migrated allows /
zero teams allows / unauthenticated passes), and the three fail-open paths.
