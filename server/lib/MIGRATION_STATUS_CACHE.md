# Migration Status Cache

`server/lib/migrationStatus.js` — V1's in-memory view of "which teams have moved to V2".

Part of the V1 → V2 cutover. This is Wave 1, Task 1: the cache + read API. The
write-lock middleware and the redirect interstitial both consume the read API
below; they do not talk to V2 themselves.

## What it does

A `setInterval` started at boot polls V2's internal endpoint and keeps the last
successful answer in module memory. Every read is synchronous memory (or a local
Postgres membership lookup). **No user request path ever makes an HTTP call to
V2**, so V2 being slow or dead can never make V1 slow.

## The V2 contract

```
GET {V2_BASE_URL}/api/internal/migration-status
Header: x-cron-secret: <V2's CRON_SECRET>
```

```jsonc
{
  "contractVersion": 1,
  "generatedAt": "2026-09-10T12:00:00.000Z",
  "summary": { "v1_only": 0, "migrating": 0, "v2_live": 0, "total": 0 },
  "teams": [
    { "teamId": "...", "teamName": "...", "status": "v1_only",
      "previousStatus": null, "rolledBackAt": null, "updatedAt": "..." }
  ]
}
```

- `contractVersion` is read **first**. Any value other than `1` is refused
  outright — the shape below it may have changed, so guessing is not safe.
- `status` ∈ `v1_only` | `migrating` | `v2_live`.
- Soft-deleted teams are already excluded by V2. Rows arrive ordered by team name.
- `summary` is zero-filled across every state, so no key is ever missing.
- **The payload carries no member user ids, by design** — V2 staff identity must
  never leak into V1. User → team resolution happens locally against V1's own
  `team_memberships` table via `getUserTeams()` (`server/lib/userTeams.js`).

## Failure policy: fail to last-known-good, never to open

| Situation | Result |
|---|---|
| Poll succeeds | Snapshot replaced, `lastSuccessAt` updated |
| Network error / timeout / non-200 | Previous snapshot kept **unchanged**, loud `console.error` |
| Bad shape or unknown `contractVersion` | Previous snapshot kept **unchanged**, loud `console.error` |
| 401 / 403 from V2 | Kept unchanged, logged **distinctly** as `AUTH FAILURE` (wrong secret, not an outage) |
| `V2_MIGRATION_CRON_SECRET` unset | Polling skipped entirely, loud `MISCONFIGURED` error, cache stays "never loaded". **The server does NOT crash** |
| No successful fetch has ever happened | Every team reads `v1_only`, and `hasEverLoaded()` returns `false` |

A `v2_live` team can never flip back to `v1_only` because V2 was unreachable.

`hasEverLoaded()` exists precisely so the write-lock middleware can tell
"V2 says this team is still on V1" apart from "we have never managed to ask V2".

### Staleness

`STALENESS_THRESHOLD_MS` (15 min). Once the snapshot is older than that, each
poll logs a loud `console.error` prefixed `[migration-status] STALE:` (throttled
to once per 10 min so it cannot flood Railway logs). A cache that quietly stopped
updating is the failure mode that loses coach data, so this is `error`, not `warn`.

## Read API

```js
import {
  getTeamStatus, userHasV2LiveTeam, getUserTeamStatuses,
  hasEverLoaded, getSnapshotMeta,
  startMigrationStatusPolling, stopMigrationStatusPolling,
} from "../lib/migrationStatus.js";

getTeamStatus(teamId)          // sync -> 'v1_only' | 'migrating' | 'v2_live'
await userHasV2LiveTeam(userId)   // -> boolean
await getUserTeamStatuses(userId) // -> [{ teamId, teamName, status }]
hasEverLoaded()                // sync -> boolean
getSnapshotMeta()              // sync -> { hasEverLoaded, lastSuccessAt, ageMs, isStale, summary, contractVersion }
```

`getSnapshotMeta()` contains no secret and no user ids — safe to log or expose on
an admin surface.

## Env vars (a human must set these; this code never sets them)

| Name | Required | Default | Notes |
|---|---|---|---|
| `V2_MIGRATION_CRON_SECRET` | yes | none | V2's `CRON_SECRET`. **Never logged, never included in an error message.** Missing ⇒ loud error + polling skipped, server still boots. |
| `V2_BASE_URL` | no | `https://beta.coachableplays.com` | Lets a rehearsal point at a stub. Never defaults to the bare apex — that is V1 itself. |

## Key decisions

- **Plain `setInterval`, no `node-cron`.** Matches the three existing interval
  jobs in `server/index.js`. The timer is `unref()`d so it can't hold the process
  open.
- **Explicit `AbortController` timeout (10 s).** A hung V2 can never let polls
  pile up. Same shape as `server/lib/outreachScraper/http.js`.
- **Importing the module starts nothing.** `startMigrationStatusPolling()` is an
  explicit call from `server/index.js`, so tests can import freely.
- **`userTeams.js` is imported lazily** inside the async readers, so importing
  this module does not pull in the `pg` pool (same pattern as
  `requireTeamRole` in `server/middleware/auth.js`).
- **Missing secret does not throw**, unlike `JWT_SECRET` in
  `server/middleware/auth.js`. Crashing live V1 over a brand-new env var would
  take production down; a loud error plus a defensible `v1_only` default is the
  safer failure.
- **No schema change, no migration, no DB write.** Reads only.
