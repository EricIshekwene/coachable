# Coachable Server Testing Standards

**Scope:** Role-based server integration tests — verifying that routes enforce authorization, return correct status codes, and produce correct response bodies for each identity.  
**Layer:** Layer 2 in the test suite plan (`test-suite-plan.md`). This doc covers *how* to write these tests. What to test and CI wiring are in that doc.  
**Tools:** Vitest · Supertest · PostgreSQL test database (`coachable_test`)

---

## Core principle

Test at the route level, not the function level. `requireTeamRole` middleware does not get a unit test. A route that uses it does — by hitting the actual Express app with Supertest against a real test database.

Every route test covers at minimum:
- The happy path — correct role, valid data → expected status + body
- The auth failure path — no token → 401
- The role failure path — wrong role → 403 (where applicable)

---

## The request helper — `requestAs`

`requestAs` is the single entry point for all server tests. It seeds a user and team membership into the test database, signs a JWT for that user using the same `signToken` the app uses, and returns a Supertest agent with `Authorization: Bearer <token>` pre-attached.

**Location:** `server/tests/helpers/requestAs.js`

**Signature:**
```js
const { agent, userId, teamId } = await requestAs(role)
```

| Return field | Purpose |
|---|---|
| `agent` | Supertest agent with auth header attached — call `.get()`, `.post()`, `.send()` on it |
| `userId` | ID of the seeded user — use when you need to reference the user in seed data |
| `teamId` | ID of the seeded team — use in route paths and seed calls |

`requestAs` owns the identity. It creates a `users` row, a `teams` row, and a `team_memberships` row with the specified role. It does not create plays, folders, or any other data — the test owns that via `seed.*`.

```js
const { agent, teamId } = await requestAs('coach')
const { agent, teamId } = await requestAs('player')
const { agent }         = await requestAs('unauthenticated')  // no token — triggers 401 paths
const { agent }         = await requestAs('admin')            // attaches x-admin-session header
```

---

## Seeding — `seed`

`seed` is a factory object for inserting test data after `requestAs` has established the identity. Each method takes the parent resource ID as its first argument and an optional overrides object — only pass what differs from the default.

**Location:** `server/tests/helpers/seed.js`

```js
import { seed } from '../helpers/seed.js'

const play   = await seed.play(teamId, { title: 'Press Break', hiddenFromPlayers: false })
const hidden = await seed.play(teamId, { title: 'Zone 2-3', hiddenFromPlayers: true })
const folder = await seed.folder(teamId, { name: 'Defense' })
```

Each method returns the inserted row with all DB-generated fields (`id`, `createdAt`, etc.) so the test can reference them in subsequent requests or assertions.

---

## Assertion helpers

**Location:** `server/tests/helpers/assertions.js`

Named helpers for the status codes that appear in role-based tests:

```js
export const expectOk           = (res) => expect(res.status).toBe(200)
export const expectCreated      = (res) => expect(res.status).toBe(201)
export const expectNoContent    = (res) => expect(res.status).toBe(204)
export const expectUnauthorized = (res) => expect(res.status).toBe(401)
export const expectForbidden    = (res) => expect(res.status).toBe(403)
export const expectNotFound     = (res) => expect(res.status).toBe(404)
```

Body assertions stay raw — Vitest's `toMatchObject`, `toHaveLength`, and `not.toContainEqual` are already readable without wrappers:

```js
const res = await agent.get(`/teams/${teamId}/plays`)
expectOk(res)
expect(res.body).toHaveLength(2)
expect(res.body[0]).toMatchObject({ title: 'Press Break' })
expect(res.body).not.toContainEqual(expect.objectContaining({ hiddenFromPlayers: true }))
```

---

## Test isolation

**One truncate per file in `beforeAll`. Fresh identity per test via `requestAs`.**

```js
beforeAll(async () => {
  await pool.query(`
    TRUNCATE users, teams, team_memberships, plays, folders, play_tags, play_tag_links CASCADE
  `)
})
```

`beforeAll` truncates once for the entire file — not before every test. `requestAs` creates a fresh user + team for every individual test, so tests never share identity state. Data seeded in one test is invisible to another because each test's `teamId` is a new unique ID.

No `afterAll` cleanup is needed — the next test file's `beforeAll` truncates anyway.

The test database is a dedicated local database (`coachable_test`) pointed to by `DATABASE_URL` in the Vitest server config. It never touches the dev database or Railway.

---

## Comment block

Every test function has a structured comment block above it.

| Field | Required | Purpose |
|---|---|---|
| `@test` | Always | Short human label for the scenario |
| `@route` | Always | HTTP method + path pattern |
| `@role` | Always | Identity making the request |
| `@assert` | Always | `positive` or `negative` |
| `@status` | Always | Expected HTTP status code |
| `@expect` | Always | What the response body contains or excludes |
| `@steps` | Flow tests | Numbered sequence of requests |
| `@when` | Always | DB state at the time of the request |
| `@timing` | Flow tests only | Performance budget — omit on single-request tests |

**Single-request test:**
```js
/**
 * @test     Player sees only visible plays
 * @route    GET /teams/:teamId/plays
 * @role     player
 * @assert   positive
 * @status   200
 * @expect   Response excludes plays where hiddenFromPlayers is true
 * @when     Team has 2 plays, 1 with hiddenFromPlayers true
 */
```

**Auth/role failure test:**
```js
/**
 * @test     Unauthenticated request is rejected
 * @route    GET /teams/:teamId/plays
 * @role     unauthenticated
 * @assert   negative
 * @status   401
 * @expect   Error body, no play data
 * @when     Any DB state
 */
```

**Flow test:**
```js
/**
 * @test     Coach creates then deletes a play
 * @route    POST /teams/:teamId/plays → DELETE /teams/:teamId/plays/:playId
 * @role     coach
 * @assert   positive
 * @steps    1. POST creates play → 201  2. DELETE removes it → 204  3. GET confirms empty list → 200
 * @when     Team exists, no plays seeded
 * @timing   <500ms
 */
```

---

## File and folder rules

Mirrors the UI testing standard exactly.

### Simple route — one test file

A route file with few endpoints and minimal role branching gets a single test file.

```
server/tests/routes/
  auth.test.js              ← login, logout, me, forgot/reset — no team role branching
  verification.test.js
  notifications.test.js
  shared.test.js
```

### Complex route — folder per endpoint

A route file with multiple endpoints that each have meaningful role behavior or different DB preconditions gets a subfolder with one file per endpoint.

```
server/tests/routes/
  plays/
    plays.list.test.js
    plays.create.test.js
    plays.update.test.js
    plays.delete.test.js
  teams/
    teams.create.test.js
    teams.join.test.js
    teams.members.test.js
    teams.settings.test.js
```

**The promotion rule:** Single file when all endpoints share the same role behavior. Folder when endpoints have different role gates, different required DB state, or meaningfully different response shapes.

### Middleware tests

```
server/tests/middleware/
  auth.test.js          ← requireAuth: valid token, expired, missing, malformed
  rateLimit.test.js     ← repeated attempts trigger the limit
  bodyBounds.test.js    ← oversized payload rejected
```

### Shared test infrastructure

```
server/tests/
  helpers/
    requestAs.js        ← identity helper
    seed.js             ← data factory
    assertions.js       ← expectOk, expectCreated, expectForbidden, etc.
```

---

## Example file structure — current Coachable codebase

```
server/
  tests/
    helpers/
      requestAs.js
      seed.js
      assertions.js

    middleware/
      auth.test.js              ← requireAuth valid/expired/missing/malformed token
      rateLimit.test.js         ← auth rate limit triggers on repeated failures
      bodyBounds.test.js        ← oversized payloads rejected with 413

    routes/
      auth.test.js              ← signup, login, logout, me, forgot-password, reset-password
      verification.test.js      ← verify email: valid code, invalid code, already verified
      onboarding.test.js        ← create-team seeds sport preset, marks user onboarded
      shared.test.js            ← public token routes: valid token → play data, invalid → 404
      flags.test.js             ← returns correct flags per user, non-admin cannot write flags

      plays/
        plays.list.test.js      ← coach sees all, player sees filtered, unauthed gets 401
        plays.create.test.js    ← coach creates, player gets 403, invalid body gets 400
        plays.update.test.js    ← coach updates own play, player gets 403
        plays.delete.test.js    ← soft-delete by coach, player gets 403, verified in DB

      teams/
        teams.create.test.js    ← creates team, sets owner, seeds invite codes for both roles
        teams.join.test.js      ← valid code joins with correct role, wrong code gets 404
        teams.members.test.js   ← returns members list for team members only
        teams.settings.test.js  ← owner updates settings, coach gets 403

      folders/
        folders.list.test.js    ← coach sees all folders, player sees visible only
        folders.create.test.js  ← coach creates, player gets 403
        folders.update.test.js  ← rename and reorder plays, coach only
        folders.delete.test.js  ← deletes folder, plays remain in team root

      notifications/
        notifications.test.js   ← list unread, mark read, clear all

      platformPlays/
        platformPlays.list.test.js   ← public endpoint, no auth required, returns visible entries
        platformPlays.copy.test.js   ← authenticated copy stamps copied_from_platform_play_id

      admin/
        admin.users.test.js     ← requires admin session, paginated list, delete cascades to team data
        admin.flags.test.js     ← full flag CRUD, non-admin gets 403 on all write routes
```

---

## See also

- `test-suite-plan.md` — what to test, tool selection, CI wiring, phase order
- `ui-testing-standards.md` — frontend role-based test standard
- `server/tests/helpers/requestAs.js` — identity helper implementation
- `server/tests/helpers/seed.js` — data factory implementation

---

## Cross-Reference Notes

**References:** `engineering/planning/testing/test-suite-plan.md`, `engineering/planning/testing/ui-testing-standards.md`. **Referenced by:** `engineering/backend-code-standards.md`, `engineering/planning/architecture/proposed-file-structure.md`.

No inconsistencies found. File paths and patterns are consistent with `proposed-file-structure.md` and `test-suite-plan.md`.
