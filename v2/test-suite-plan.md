# v2 Test Suite Plan

This is a full inventory of what Coachable needs tested, how we should do it, and how to move from the current state (manual in-browser suites) to automated runs that validate every push.

---

## Current state

There are six test suites that live in `src/testing/suites/`:

| Suite | What it covers |
|---|---|
| `routes.suite.js` | Route guards (auth, onboarding, no-team, admin), critical flows (login, signup, verify email, reset password, onboarding, save-to-playbook, logout) |
| `apiRoutes.suite.js` | API fetch contract tests — URL shape, method, headers, body for every route the client calls |
| `animationSchema.suite.js` | Animation data schema validation |
| `drawingGeometry.suite.js` | Canvas drawing geometry math |
| `importExport.suite.js` | Play import/export round-trips |
| `interpolate.suite.js` | Animation interpolation math |

The problem: all six suites run inside the browser against a custom `testRunner.js` with a mocked fetch. You have to navigate to `/admin/tests` in a running dev server and click "Run Tests" manually. There is no command you can run from the terminal, no output you can pipe to CI, and no way to validate a code push automatically. The server (Express routes, DB queries, middleware) has zero test coverage.

---

## Tool recommendation

**Keep Vitest.** It is already installed and the existing suites depend on it. Switching to Jest would require rewriting the runner scaffolding for no real gain — Vitest is Jest-compatible in API and is faster. The issue is not the runner, it is the test environments and the missing server coverage.

The v2 setup is two Vitest environments running from the same repo:

```
vitest.config.js        ← browser/JSDOM environment (existing frontend suites)
vitest.server.config.js ← Node environment (new server/API tests)
```

Add **Supertest** for hitting the actual Express app without a live server port. Supertest wraps your Express app and gives you `.get()`, `.post()`, `.expect()` — you import the app, not `http.Server`, so no port conflicts and no network noise.

No E2E in v2. Playwright or Cypress is a Phase 3 decision once the product is stable enough that the browser UI does not change every week.

---

## Test layers

### Layer 1 — Unit tests (pure functions)
Run in Node. No React, no Express, no DB. Tests for logic you can import and call directly.

### Layer 2 — Server integration tests
Run in Node with Supertest. Import the Express app, hit actual route handlers with a real (test) database. These replace the current admin manual flow where you check if routes work by loading pages.

### Layer 3 — Frontend flow tests
Run in JSDOM with React Testing Library. This is what the existing suites already do — render components with mocked fetch, simulate user interaction, assert navigation and state. These stay as-is and get wired into the CLI.

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

1. Run `npm test` — both configs in sequence
2. If either fails, block the merge
3. On pass, Railway deploy proceeds

This gives you the "validate new code pushes" guarantee without needing a separate CI service — GitHub Actions with a single workflow file runs both test configs, and the Railway deploy is gated behind the test step.

---

## Phase order

**Phase 1 — Wire the existing suites into the CLI (quick win)**
The existing six suites already work in Vitest. The only reason they run in the browser is because they were built as in-browser test pages before Vitest was fully configured. Move them to run via `vitest run` from the terminal. This unlocks CI validation for everything that is already tested.

**Phase 2 — Server integration tests**
Set up `vitest.server.config.js` with a Node environment, add Supertest, and write tests for the highest-blast-radius routes first: auth (login, signup, reset password), plays CRUD, team create/leave/join, admin user delete. These are the routes that, when broken, cause the most visible production failures.

**Phase 3 — Fill in the gaps**
Animation engine edge cases, canvas geometry edge cases, play data edge cases, feature flags, notifications, email mocks.

**Phase 4 — E2E (future)**
Playwright for the three most critical coach flows: sign up → onboard → create play, invite a player → player views play, create a folder → share folder link → public viewer loads it.
