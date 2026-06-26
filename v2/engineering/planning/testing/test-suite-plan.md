# ✅ Done — v2 Test Suite Plan

This is a full inventory of what Coachable needs tested, how we should do it, and how to move from the current state (manual in-browser suites) to automated runs that validate every push.

---

## Current state

**v1 repo:** Six browser-based test suites live in `src/testing/suites/`. They run via `/admin/tests` in a live browser session with a mocked fetch — no CLI runner, no CI integration. These do not carry over to the v2 repo.

**v2 repo (new):** No existing test suites. The v2 build starts from scratch with proper Vitest infrastructure from the first commit. The six v1 suite subjects (animation schema, drawing geometry, import/export, interpolation, route guards, API contracts) are re-covered by the appropriate test layer in the plan below.

Both server and frontend have zero test coverage in v1 — a complete test suite is a primary v2 deliverable.

---

## Tool recommendation

**Use Vitest.** Already installed in the repo. Vitest is Jest-compatible in API and faster. Two environments running from the same repo:

```
vitest.config.js        ← JSDOM environment (frontend/component tests)
vitest.server.config.js ← Node environment (server integration tests)
```

Add **Supertest** for hitting the actual Express app without a live server port. Supertest wraps your Express app and gives you `.get()`, `.post()`, `.expect()` — you import the app, not `http.Server`, so no port conflicts and no network noise.

No E2E in v2. Playwright or Cypress is a Phase 3 decision once the product is stable enough that the browser UI does not change every week.

---

## ✅ Vitest setup

All decisions below were resolved before the first test infrastructure commit. A developer can write every file listed here without follow-up questions.

---

### `vitest.config.js` — frontend config

```js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    clearMocks: true,
    setupFiles: ['src/tests/setup.js'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    coverage: { provider: 'v8' },
  },
})
```

**Decision notes:**

- **`jsdom` not `happy-dom`** — RTL is built and documented against jsdom. `happy-dom` is faster but has known gaps in `MutationObserver`, `ResizeObserver`, and form behavior. Switch only if test suite startup becomes a measurable bottleneck.
- **`globals: true`** — `test`, `expect`, `describe`, `vi` are available without an import in every test file. TypeScript projects add `"types": ["vitest/globals"]` to `tsconfig`.
- **`clearMocks: true`** — clears call counts and instances after each test but keeps mock implementations. The global context stubs stay active; only their history resets. No `afterEach(() => vi.clearAllMocks())` boilerplate needed in test files.
- **`@vitejs/plugin-react` included directly** — does not `mergeConfig` from `vite.config.js`. Self-contained; the test infrastructure commit can land before `vite.config.js` is finalized. No risk of Vite-specific plugins (e.g. HMR, build optimizations) leaking into the test runner.
- **`@` → `src/` alias defined here, not inherited from Vite** — mirrors what `vite.config.js` will define. Every `@/utils/api/plays` import in test files and the components they import resolves correctly. No other aliases in v2 — add only if a new surface emerges.
- **Coverage provider: `v8`** — no extra packages, built into Node, faster than istanbul. Switch to istanbul if branch-level ignore comments become necessary.

---

### `vitest.server.config.js` — server config

See the **Test DB setup** section below for the complete file. No additional decisions needed — that section fully specifies it.

---

### `src/tests/setup.js` — global test setup

This file runs before every frontend test via `setupFiles`. It does three things:

1. **Extends expect with jest-dom matchers** — so `toBeInTheDocument()`, `toHaveTextContent()`, etc. work in every test without an import.
2. **Mocks all four React contexts globally** — every page component that imports a context gets the mock, not the real implementation. The real `AuthProvider` would call `GET /auth/me` on mount; `FeatureFlagContext` would call `GET /flags`; `NotificationsContext` would start a polling interval. None of that should happen in a test.
3. **Does not set return values** — `renderAs` sets the per-call return value via `vi.mocked(useAuth).mockReturnValue(fixture)`. `setup.js` only registers the mock.

```js
import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }) => children,
}))

vi.mock('@/context/FeatureFlagContext', () => ({
  useFeatureFlags: vi.fn(() => ({})),
  FeatureFlagProvider: ({ children }) => children,
}))

vi.mock('@/context/AppMessageContext', () => ({
  useAppMessage: vi.fn(() => ({ showMessage: vi.fn() })),
  AppMessageProvider: ({ children }) => children,
}))

vi.mock('@/context/NotificationsContext', () => ({
  useNotifications: vi.fn(() => ({
    unreadCount: 0,
    notifications: [],
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    respond: vi.fn(),
  })),
  NotificationsProvider: ({ children }) => children,
}))
```

**`FeatureFlagContext` default: all flags off** (`{}`). Tests that need a flag enabled pass it via `renderAs` overrides: `renderAs('coach', <Component />, { featureFlags: { newEditor: true } })` — `renderAs` merges this into the `useFeatureFlags` mock return value for that call.

---

### `src/tests/renderAs.js` — role helper

**Signature:**

```js
renderAs(role, component, overrides = {})
```

**What it does:**

1. Looks up the base fixture for `role` from `src/tests/fixtures/[role].js`
2. Shallow-merges `overrides` onto the base fixture
3. Sets `vi.mocked(useAuth).mockReturnValue(mergedFixture)` for this call
4. If `overrides.featureFlags` is present, sets `vi.mocked(useFeatureFlags).mockReturnValue(overrides.featureFlags)` for this call
5. Renders the component wrapped in:
   - `MemoryRouter` with `initialEntries={[overrides.initialPath ?? '/']}` — routing context for `useNavigate`, `Link`, route params
   - `QueryClientProvider` with a **fresh `QueryClient` per call** — isolated cache, no bleed between tests
6. Returns the standard RTL render result — `screen`, `userEvent`, all RTL utilities work exactly as documented

**`QueryClient` settings for tests:**

```js
new QueryClient({
  defaultOptions: {
    queries: { staleTime: 0, retry: false, gcTime: 0 },
    mutations: { retry: false },
  },
})
```

No caching, no retries, no background refetches. The api module is mocked via `vi.mock`, so `queryFn` resolves instantly to mock data.

**No navigate spy.** Flow tests assert on what renders after navigation, not on the URL or the `navigate` function. If login redirects to `/plays`, assert that plays page content appears — that tests the outcome.

**Routing context is always provided.** `renderAs` never requires the caller to wrap the component in `MemoryRouter`. All page-level components use routing; wrapping it in every test would be boilerplate.

---

### Mock strategy for API calls

**Use `vi.mock` on the api module. Do not use MSW.**

The app's API calls live in `src/utils/api/` (one file per resource, mirroring `server/routes/`). In Layer 3 UI tests, mock at the module level:

```js
vi.mock('@/utils/api/plays', () => ({
  getPlays: vi.fn().mockResolvedValue([{ id: '1', name: 'Summer Offense' }]),
  createPlay: vi.fn().mockResolvedValue({ id: '2', name: 'New Play' }),
}))
```

**Why not MSW:** API correctness is fully covered by Layer 2 server integration tests (Supertest + real DB). Layer 3 tests are about UI behavior — what a role sees and can do. Intercepting at the network level adds infrastructure overhead without testing anything Layer 2 doesn't already cover. `vi.mock` is explicit, fast, and scoped to the file that needs it.

Mock only the functions a given test file actually calls. Do not mock an entire api file if only one function is exercised.

---

### Fixtures — `src/tests/fixtures/`

One file per role. Five files total:

```
src/tests/fixtures/
  owner.js
  coach.js
  assistant_coach.js
  player.js
  admin.js
```

**What every fixture contains:**

- `user` object: `{ id, name, email, role, teamId }` — minimal shape that satisfies `AuthContext`
- `role` string matching the filename (e.g. `'coach'`)
- `teamId` string — a stable test value (e.g. `'team-test-123'`)
- `playerViewMode: false` — overridable per test via `renderAs('coach', <C />, { playerViewMode: true })`
- `vi.fn()` stubs for all `AuthContext` mutations: `login`, `logout`, `switchTeam`, `joinTeam`, `leaveTeam`

**`assistant_coach.js` specifically** includes an `assistantPermissions` field. The exact shape is determined by task 7.4 (`usePermissions()` hook). Until 7.4 is complete, stub it as `assistantPermissions: {}` — update the fixture when the permission shape is defined.

**`admin.js`** represents the internal staff/admin identity, not a team role. Its `role` is `'admin'`; it has no `teamId`.

**Overrides are shallow-merged.** `renderAs('coach', <C />, { playerViewMode: true })` replaces only `playerViewMode` — all other fixture values remain. This means you never construct a full user object in a test; you only specify what differs.

---

## Test layers

### Layer 1 — Unit tests (pure functions)
Run in Node. No React, no Express, no DB. Tests for logic you can import and call directly.

### Layer 2 — Server integration tests
Run in Node with Supertest. Import the Express app, hit actual route handlers with a real (test) database. These replace the current admin manual flow where you check if routes work by loading pages.

### Layer 3 — Frontend flow tests
Run in JSDOM with React Testing Library. Render components with mocked fetch, simulate user interaction, assert navigation and state. Co-located with pages as they are built.

---

## What needs to be tested

### Server routes (currently zero coverage)

Every server route should have integration tests that hit the Express app with Supertest and a real test database. The test DB is a separate PostgreSQL DB (or a seeded in-memory compatible layer) that resets between test runs.

**Auth (`server/routes/auth.js`)**
- `POST /auth/signup` — creates user, hashes password, returns token
- `POST /auth/login` — returns JWT on valid credentials, 401 on bad credentials
- `GET /auth/me` — returns user from valid JWT, 401 on expired/missing
- `POST /auth/logout` — clears cookie
- `POST /auth/forgot-password` — sends email, returns 200 even if email not found (security)
- `POST /auth/reset-password` — accepts code + new password, invalidates code after use
- `PATCH /auth/change-email` — requires current password, sends OTP to new address

**Teams (`server/routes/teams.js`)**
- `POST /teams/create` — creates team, sets user as owner, returns invite codes
- `POST /teams/create-personal` — creates personal workspace, seeds demo play from sport
- `GET /teams/:teamId/members` — returns members for authorized user only
- `PATCH /teams/:teamId/settings` — updates defaults, owner/coach only
- `POST /teams/:teamId/leave` — soft-deletes team if sole owner, removes member otherwise
- `POST /teams/:teamId/join` — joins via invite code, assigns role

**Plays (`server/routes/plays.js`)**
- `GET /teams/:teamId/plays` — returns team plays, respects hiddenFromPlayers for player role
- `POST /teams/:teamId/plays` — creates play, validates playData shape
- `PUT /teams/:teamId/plays/:playId` — updates play data
- `DELETE /teams/:teamId/plays/:playId` — deletes, coach/owner only
- `POST /teams/:teamId/plays/:playId/post-to-community` — creates platform play entry
- `GET /teams/:teamId/tags` — returns deduplicated tag list from team plays

**Folders (`server/routes/folders.js`)**
- `GET /teams/:teamId/folders` — returns folders, respects player visibility
- `POST /teams/:teamId/folders` — creates folder
- `PATCH /teams/:teamId/folders/:folderId` — renames, reorders plays
- `DELETE /teams/:teamId/folders/:folderId` — deletes, does not delete plays

**Platform Plays (`server/routes/platformPlays.js`)**
- `GET /platform-plays` — public list, no auth required
- `GET /platform-plays/folders` — returns admin-curated folder list
- `GET /platform-plays/folders/:id` — returns folder + plays with playData
- `POST /platform-plays/:id/copy` — copies to user's active team, stamps `copied_from_platform_play_id`

**Onboarding (`server/routes/onboarding.js`)**
- `POST /onboarding/create-team` — creates team + seeds sport demo play, marks user onboarded

**Notifications (`server/routes/notifications.js`)**
- `GET /notifications` — returns unread/all for auth user
- `PATCH /notifications/:id/read` — marks read
- `DELETE /notifications` — clears all for user

**Shared (`server/routes/shared.js`)**
- `GET /shared/plays/:token` — public, no auth, returns play or 404
- `GET /shared/folders/:token` — public, returns folder + plays or 404

**Verification (`server/routes/verification.js`)**
- `POST /verification/verify` — accepts code, marks email verified, invalidates code

**Admin routes (`server/routes/admin.js`)**
- All admin routes require `x-admin-session` header — verify 403 when missing
- Danger Mode routes require elevated session — verify 403 without it
- `POST /admin/login` — hashes/validates admin password
- `GET /admin/users` — returns paginated users
- `DELETE /admin/users/:id` — cascades to teams, plays, folders
- `DELETE /admin/users` — wipes all users, requires elevated session
- `GET /admin/analytics` — returns period-scoped metrics

**Feature Flags (`server/routes/flags.js`)**
- `GET /flags` — returns flags for authenticated user
- Admin CRUD for flag values

**Middleware**
- `auth.js` — rejects missing/expired/malformed JWTs with 401
- `staffAuth.js` — rejects requests without staff session
- `rateLimit.js` — verify limit triggers on repeated auth attempts
- `bodyBounds.js` — rejects payloads over size limit

---

### Animation engine (partial coverage exists)

The interpolation and schema suites exist but do not cover everything.

- Keyframe timeline: given a set of player tracks and a `t` value, verify the correct positions are returned at boundary, mid-point, and beyond-end conditions
- Serialize → deserialize → serialize round-trip: the output of `serialize()` fed back into `deserialize()` must produce identical state
- Drawing step timing: `drawingTiming.js` — advancing through a drawing sequence returns the correct visible segments at each frame
- Duration mutation: changing animation duration scales all keyframe timestamps proportionally
- Empty animation: engine does not crash on zero-track, zero-player play data
- Max entities: engine handles the maximum reasonable player/drawing count without timing drift

---

### Canvas geometry (partial coverage exists)

- Arrow endpoint snapping: given a player position and a draw endpoint near it, snap returns the player's center within tolerance
- Line-to-curve conversion: converting a straight line segment to a bezier preserves endpoint positions
- Marquee selection: given a selection rectangle and a set of entity positions, returns the correct subset
- Rotation: `rotatePoint(point, center, angle)` is correct at 0°, 90°, 180°, 270°, and arbitrary angles
- Collision with field bounds: entities dragged outside field boundaries are clamped correctly

---

### Play data serialization (some coverage exists in importExport)

The existing `importExport.suite.js` covers basic round-trips but not edge cases.

- Legacy format upgrade: old play data formats (pre-v0.3 schema) are upgraded to current schema on import without data loss
- Missing field defaults: play data with missing optional fields deserializes with correct defaults, not undefined errors
- Max-size play: importing a play with 22 players, 30 drawings, and a 300-frame animation completes without timeout
- Tag normalization: tags are trimmed and deduplicated on save
- Notes field: notes with special characters, newlines, and emoji round-trip correctly

---

### Auth flows (covered by `routes.suite.js`, needs expansion)

Already covered:
- Login success / wrong password / network failure
- Signup success / duplicate email / invalid email
- Forgot password → reset password (valid code, invalid code, expired code)
- Verify email (success, invalid code)
- Onboarding create-team
- Route guards (protected routes, admin session gate, no-team redirect)
- Logout

Missing:
- `returnTo` preservation through the full signup → verify → onboarding → destination chain
- Session expiry while the app is open (token expires mid-session, next fetch returns 401, user is redirected to login with `returnTo` set)
- Concurrent team member: user A is removed from a team while user A has the app open — next route transition redirects to `/no-team`
- Player view mode: coach enables player view mode, certain routes and UI elements become hidden
- Admin session expiry: admin session times out, next admin page load redirects to admin login

---

### Feature flags

- `FeatureFlagContext` returns correct flag values for a given user
- App UI elements gated by a flag do not render when the flag is off
- Admin toggle updates the flag and the change is reflected without a page reload
- Flags are not accessible by non-admin, non-staff users via the API

---

### Notifications

- Notification badge count updates when a new notification arrives
- Marking a notification read removes it from unread count
- Clearing all notifications empties the list
- Player-only notifications (e.g. "new play added") are not delivered to owners

---

### Email (server-side, mocked Resend)

These tests mock the Resend client and verify that:
- Signup triggers a verification email with the correct OTP
- Forgot password triggers a reset email with the correct code
- Invitation email is sent when a coach generates an invite link
- Broadcast email (admin) sends to all users with the correct template
- Email change OTP is sent to the new address, not the old one

---

### Sport presets and prefab presets

- `GET /sport-presets/:sport` returns only `is_hidden=false` rows for non-admin users
- Hidden presets are visible in admin but not in the app-facing fetch
- Reorder updates the `sort_order` column for all affected rows
- Multi-word sport names (e.g. "Field Hockey", "Womens Lacrosse") are URL-encoded correctly by the client fetch helpers — this is already in `apiRoutes.suite.js` but should also be covered at the server integration level

---

## The manual admin test page

The admin Tests page (`/admin/tests`) should stay as a **debug tool**, not the primary test runner. In v2 it is useful for running a subset of tests in a live dev environment to see exactly what fails with full UI context. It is not a replacement for the CLI runner.

---

## Test DB setup

The server integration tests run against a dedicated local PostgreSQL database (`coachable_test`). It never touches the dev database or Railway.

### One-time local setup

```bash
createdb coachable_test
```

That's it. No manual migration step — `globalSetup.js` applies the schema automatically on every test run (see below).

### Why not import `migrate.js` directly

`server/db/migrate.js` is a standalone CLI script. It calls `pool.end()` in its `finally` block, which closes the connection pool. Importing it inside Vitest's `globalSetup` would close the pool before any tests run, breaking every query. Do not import it in test infrastructure.

### `globalSetup.js` — schema applied on every run

`server/tests/globalSetup.js` runs once before the Vitest worker pool starts. It opens its own short-lived `pg.Pool`, reads `server/db/schema.sql`, executes it against `coachable_test`, and closes that pool. The test workers then open their own pool via `server/db/pool.js`.

```js
// server/tests/globalSetup.js
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function setup() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const sql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8')
  await pool.query(sql)
  await pool.end()
}
```

This means schema changes are always in sync — no manual re-migration step on the dev machine or in CI. If `schema.sql` is idempotent (uses `CREATE TABLE IF NOT EXISTS`), re-runs are safe. If it uses `CREATE TABLE` without `IF NOT EXISTS`, add that guard to `schema.sql`.

### `vitest.server.config.js`

Does not exist yet. Create it at the project root alongside `vite.config.js`:

```js
// vitest.server.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/tests/**/*.test.js'],
    globalSetup: './server/tests/globalSetup.js',
    env: {
      DATABASE_URL: 'postgresql://localhost/coachable_test',
    },
  },
})
```

### Install supertest

`supertest` is not in any `package.json` yet. Install it in the root devDependencies alongside vitest:

```bash
npm install --save-dev supertest
```

---

## CI setup

Wire both Vitest configs into a single CI step:

```json
// package.json
"scripts": {
  "test:frontend": "vitest run --config vitest.config.js",
  "test:server": "vitest run --config vitest.server.config.js",
  "test": "npm run test:frontend && npm run test:server"
}
```

On every push to `main` (and every PR against `main`):

1. Create the test database: `createdb coachable_test` (CI environment step, before `npm test`)
2. Run `npm test` — both configs in sequence
3. If either fails, block the merge
4. On pass, Railway auto-deploy proceeds

`globalSetup.js` applies the schema on every run, so CI never needs a separate migration step — only the `createdb` call to ensure the database exists.

---

## Phase order

**Phase 1 — Establish Vitest infrastructure and write first server tests**

The v2 repo has partial infrastructure: `server/tests/routes/plays/plays.list.test.js` exists and is well-written, but the helper files it imports from (`requestAs.js`, `seed.js`, `assertions.js`) have not been created yet. Complete Phase 1 in this order:

1. **One-time local setup** — `createdb coachable_test`
2. **Install supertest** — `npm install --save-dev supertest` at the project root
3. **Create `vitest.server.config.js`** at the project root (see "Test DB setup" section above)
4. **Create `server/tests/globalSetup.js`** (see above)
5. **Create `server/tests/helpers/requestAs.js`** — seeds user + team membership, signs JWT, returns Supertest agent
6. **Create `server/tests/helpers/seed.js`** — data factory for plays, folders, and future resources
7. **Create `server/tests/helpers/assertions.js`** — `expectOk`, `expectCreated`, `expectUnauthorized`, `expectForbidden`, `expectNotFound`, `expectNoContent`
8. **Verify `plays.list.test.js` passes** — it already exists; confirm it runs green once helpers are in place
9. **Write auth route tests** — `server/tests/routes/auth.test.js`: signup, login, logout, `/auth/me`, forgot-password, reset-password
10. **Write team route tests** — `server/tests/routes/teams/`: create, join, members, settings, leave
11. **Add `test:server` to root `package.json` scripts** (see CI setup section)

**Phase 2 — Server integration test suite (full coverage)**
All routes listed in the "Server routes" section above. Work top-down from auth through admin. Priority order: auth → plays → teams → folders → notifications → admin → platform.

**Phase 3 — Frontend role-based tests and unit tests**
Write co-located `tests/` folders alongside pages as they are built. Animation engine edge cases, canvas geometry, play data serialization, feature flags — write as unit tests in Layer 1.

**Phase 4 — E2E (future)**
Playwright for the three most critical coach flows: sign up → onboard → create play, invite a player → player views play, create a folder → share folder link → public viewer loads it.

---

## Cross-Reference Notes

**Referenced by:** `engineering/planning/testing/ui-testing-standards.md`, `engineering/planning/testing/server-testing-standards.md`, `v2/TODO.md` items 3.1 and 8.1.

**Notes:**

1. **No `src/testing/suites/` on stage.** The v1 browser-run suites at `src/testing/suites/` do not exist on the `stage` branch. The v1 suites are reference material only — their test subjects (animation schema, drawing geometry, import/export, interpolation, route guards, API contracts) are covered by Layer 1 and Layer 2 tests in the new infrastructure.

2. **Use `server/tests/` consistently.** No double underscores — `server/tests/routes/` everywhere.

3. **Admin route test paths** — Use subfolder structure per `server-testing-standards.md`: `server/tests/routes/admin/admin.users.test.js`, not a flat `admin.users.test.js`.

4. **`vitest.server.config.js` does not exist yet.** The plan describes it but it was not created when the plan was written. Create it as the first infrastructure step in Phase 1.

5. **`supertest` is not installed yet.** Neither root nor `server/package.json` list it as a dependency. Install at root alongside vitest before writing any server integration tests.

6. **`schema.sql` idempotency.** If `globalSetup.js` re-runs `schema.sql` on every test run, the schema must be idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc.). Verify this before relying on globalSetup to stay in sync.
