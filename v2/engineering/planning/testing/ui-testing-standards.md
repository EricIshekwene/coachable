# ✅ Done — Coachable UI Testing Standards

**Scope:** Role-based UI tests — verifying what each user role sees and can do on a given page or section.  
**Layer:** Layer 3 in the test suite plan (`test-suite-plan.md`). This doc covers *how* to write these tests. What to test and CI wiring are in that doc.  
**Tools:** Vitest · React Testing Library · `@testing-library/user-event` · `vi.mock` (Vitest built-in)

---

## Core principle

Test UI at the point of use, not on the component itself. A `Button` component does not get a test. A page that renders that button to some roles but not others does.

Tests assert both what a role **can** see and what it **cannot** — coverage runs in both directions for every gated element.

---

## The role helper — `renderAs`

`renderAs` is the single entry point for all role-based UI tests. It wraps RTL's `render` with a mocked auth context so you can specify who is using the page without standing up a real session.

**Location:** `src/tests/renderAs.js`  
**Status:** Does not exist yet — must be created as part of Phase 3 infrastructure setup.

**Signature:**
```js
renderAs(role, component, overrides = {})
```

| Argument | Purpose |
|---|---|
| `role` | String token for the user identity (`'owner'`, `'coach'`, `'assistant_coach'`, `'player'`) |
| `component` | The JSX to render |
| `overrides` | Optional — merges over the role's base context fixture for that test only |

Returns the standard RTL render result. RTL's global `screen` is populated.

```js
renderAs('coach', <Plays />)
renderAs('player', <Plays />)
renderAs('coach', <Plays />, { playerViewMode: true })
renderAs('assistant_coach', <Plays />, { assistantPermissions: { canRenamePlay: true } })
renderAs('coach', <Plays />, { featureFlags: { canRolePostToCommunity: true } })
```

### Fixture contract

Each role token maps to a base context fixture in `src/tests/fixtures/`. The `overrides` object is shallowly merged on top of that fixture. This means you never construct a full user object in a test — only the values that differ from the base fixture.

Each fixture provides the minimum auth context shape that `usePermissions()` and page-level logic need:

```js
// src/tests/fixtures/coach.js
export const coach = {
  user: {
    id: 'fixture-coach-id',
    role: 'coach',
    assistantPermissions: null,
  },
  playerViewMode: false,
}
```

The `assistant_coach` fixture ships with `assistantPermissions` pre-populated at all documented defaults from `permissions.md`. You never construct this object in a test — use `overrides` to flip individual flags:

```js
// Default assistant — assistantPermissions at documented defaults
renderAs('assistant_coach', <Plays />)

// Override one flag — all other flags stay at defaults
renderAs('assistant_coach', <Plays />, { assistantPermissions: { canRenamePlay: true } })
```

`assistantPermissions` is `null` for all non-assistant fixtures. Do not set it manually for `owner`, `coach`, or `player` tests.

---

## Async data and API mocking

Pages that fetch data on mount must have their API calls mocked before rendering. Role tests use `vi.mock` on the API utility module — not MSW. MSW is better suited for integration and E2E tests; `vi.mock` is sufficient and simpler for co-located unit-style role tests.

### Mock placement

Mock at the top of the test file, before any test blocks. Reset return values in `beforeEach` so each test gets a clean slate:

```js
import { getPlays } from '@/utils/api/plays'

vi.mock('@/utils/api/plays', () => ({
  getPlays: vi.fn(),
}))

beforeEach(() => {
  getPlays.mockResolvedValue([
    { id: '1', name: 'Summer Offense', createdByUserId: 'fixture-coach-id' },
  ])
})
```

### Awaiting loaded state

Role tests never assert on loading skeletons. Loading state is identical across all roles — it carries no role signal and testing it adds noise without coverage. Always await the loaded state before making assertions.

Use `findBy*` queries (async, returns a Promise) in selector functions for elements that only appear after data loads:

```js
const playCard = (name) => screen.findByText(name)

test('player sees the play', async () => {
  renderAs('player', <Plays />)
  assertVisible(await playCard('Summer Offense'))
})
```

Use `queryBy*` for elements expected to be absent — they resolve immediately without awaiting. But first anchor on a loaded-state indicator so the assertion does not pass trivially while data is still loading:

```js
test('player cannot see create button', async () => {
  renderAs('player', <Plays />)
  await playCard('Summer Offense')  // anchor: confirms data has loaded
  assertHidden(createButton())
})
```

**Rule:** Never call `assertHidden` on a data-dependent page without first awaiting a loaded-state indicator. An `assertHidden` that runs before data resolves passes trivially — it proves nothing.

---

## Assertion helpers

**Location:** `src/tests/assertions.js`

```js
export const assertVisible = (element) => expect(element).toBeInTheDocument()
export const assertHidden = (element) => expect(element).not.toBeInTheDocument()
```

These mirror the `@assert` field in the comment block and make assertion intent explicit in the test body.

**There is no `assertDisabled` helper.** Permission-gated UI is always hidden from unauthorized roles — never rendered-but-disabled (`frontend-code-standards.md §14`: hide, don't disable). If you reach for `assertDisabled` on a permission gate, the component is wrong: fix the component, not the test.

---

## Selector pattern

Define all element queries as named functions at the top of each test file using RTL's global `screen`. This keeps the test body readable — the *what* is named at the top, the *assertion* is in the test.

```js
import { screen } from '@testing-library/react'

const createButton    = () => screen.queryByRole('button', { name: /create/i })
const bulkModeButton  = () => screen.queryByRole('button', { name: /select/i })
const newFolderButton = () => screen.queryByRole('button', { name: /new folder/i })
const playCard        = (name) => screen.findByText(name)   // findBy* — data-dependent
```

**Rules:**
- Use `queryBy*` for elements that are statically present or absent. Returns `null` on miss — works with both `assertVisible` and `assertHidden`.
- Use `findBy*` for elements that only appear after async data loads. Returns a Promise — callers must `await`.
- Name selectors after the element, not the role. `createButton()` not `coachCreateButton()`.
- Selectors are file-scoped. Redefine per test file — do not share across files.

---

## `assistant_coach` tests — canonical cases

`assistantPermissions` has 11 gatable flags. Writing one test per combination is intractable. Every gated element for `assistant_coach` must cover exactly three canonical cases:

| Case | Setup | What it proves |
|---|---|---|
| Default assistant | `renderAs('assistant_coach', ...)` — no overrides | Restricted baseline — flags at defaults |
| Fully-unlocked | `overrides: { assistantPermissions: { <flag>: true } }` | Unlocking the flag shows the gated UI |
| Own-play exception | Flag off in overrides, `isCreatedByViewer={true}` passed to component | Component's own-play override works even when the flag is off |

```js
// Case 1 — default assistant cannot rename others' plays
test('assistant cannot rename a play they did not create (default)', () => {
  renderAs('assistant_coach', <PlayCard isCreatedByViewer={false} />)
  assertHidden(renameOption())
})

// Case 2 — unlocked assistant can rename any play
test('assistant can rename any play when flag is on', () => {
  renderAs('assistant_coach', <PlayCard isCreatedByViewer={false} />, {
    assistantPermissions: { canRenamePlay: true },
  })
  assertVisible(renameOption())
})

// Case 3 — own-play exception overrides the flag
test('assistant can always rename their own play', () => {
  renderAs('assistant_coach', <PlayCard isCreatedByViewer={true} />)
  assertVisible(renameOption())
})
```

For flags with no own-play exception (e.g. `canCreatePlay`, `canBulkEdit`), only cases 1 and 2 apply.

---

## `playerViewMode` testing

`playerViewMode` is a UI overlay that makes a coach see player-level permissions. It is not a real role — it is a coach toggling a preview state. `usePermissions()` treats it the same as `player` for all permission resolution.

For any page with player-gated UI, add a `playerViewMode` test block as a **fifth case** alongside the four role blocks. It must produce the same assertions as the `player` block:

```js
test('coach in playerViewMode cannot see the create button', async () => {
  renderAs('coach', <Plays />, { playerViewMode: true })
  await playCard('Summer Offense')  // anchor: confirm data loaded
  assertHidden(createButton())
})
```

A `playerViewMode` test that disagrees with its corresponding `player` test is a bug in the component — `usePermissions()` guarantees they resolve identically.

---

## Multi-condition gates

Some UI elements require multiple independent conditions to all be true before they render. For each condition that can independently block rendering, write one test where only that condition is false and all others are true.

**Canonical example: `canPostToCommunity`**

This requires: (1) role/`assistantPermissions` permits it, (2) `isCreatedByViewer === true`, (3) `canRolePostToCommunity` feature flag is on. Each condition independently hides the element:

```js
// All three true → visible
test('coach sees post-to-community on their own play with flag on', () => {
  renderAs('coach', <PlayCard isCreatedByViewer={true} />, {
    featureFlags: { canRolePostToCommunity: true },
  })
  assertVisible(postToCommunityOption())
})

// Condition 1 fails — role blocks it
test('player never sees post-to-community', () => {
  renderAs('player', <PlayCard isCreatedByViewer={true} />, {
    featureFlags: { canRolePostToCommunity: true },
  })
  assertHidden(postToCommunityOption())
})

// Condition 2 fails — not their play
test('coach cannot post a play they did not create', () => {
  renderAs('coach', <PlayCard isCreatedByViewer={false} />, {
    featureFlags: { canRolePostToCommunity: true },
  })
  assertHidden(postToCommunityOption())
})

// Condition 3 fails — feature flag off
test('coach cannot post to community when flag is off', () => {
  renderAs('coach', <PlayCard isCreatedByViewer={true} />, {
    featureFlags: { canRolePostToCommunity: false },
  })
  assertHidden(postToCommunityOption())
})
```

---

## Flow test conventions

### Scope: primary role only

`flow.test.js` covers the primary role that performs the flow (usually `coach`). Role visibility for each step is already covered in `roles.test.js` — duplicating the full flow for every eligible role adds test count without adding signal.

Exception: if a role has meaningfully different flow behavior (e.g. an assistant performing a flow on their own play vs. a play they did not create), add a separate flow test for that variant with a `@role` comment explaining why it is distinct.

### Assert each step

Assert the outcome of each step before proceeding to the next. A flow test that only checks the final state is a black box — it cannot tell you which step broke:

```js
test('coach can hide a play from players', async () => {
  renderAs('coach', <Plays />)
  await userEvent.click(playContextMenu('Summer Offense'))
  assertVisible(hideFromPlayersOption())            // step 1 outcome: menu opened
  await userEvent.click(hideFromPlayersOption())
  assertVisible(hiddenBadge('Summer Offense'))     // step 2 outcome: badge applied
})
```

### API calls triggered mid-flow

Flow tests are UI tests, not API contract tests. When a flow step triggers an API call, mock it to resolve immediately with a success response and assert the resulting DOM change — do not assert that the API was called with specific arguments. API contract testing belongs in server integration tests (`server-testing-standards.md`):

```js
vi.mock('@/utils/api/plays', () => ({
  updatePlay: vi.fn().mockResolvedValue({ ok: true }),
}))

test('coach can hide a play from players', async () => {
  renderAs('coach', <Plays />)
  await userEvent.click(hideFromPlayersOption())
  assertVisible(hiddenBadge('Summer Offense'))  // assert UI outcome, not API call args
})
```

---

## Comment block

Every test function has a structured comment block above it. Fields are consistent so any developer can scan a test file and understand intent without reading the test body.

| Field | Required | Purpose |
|---|---|---|
| `@test` | Always | Full readable name: page + element or flow name |
| `@role` | Always | Which identity is under test |
| `@assert` | Always | `positive` or `negative` |
| `@expect` | Visibility tests | Plain English outcome — one sentence |
| `@steps` | Flow tests | Numbered sequence of the interaction |
| `@when` | Always | Page state or precondition — include `data loaded` when the test awaits async data |
| `@timing` | Flow tests only | Performance budget — omit on visibility tests |

`@timing` is only required on flow tests because they are async and multi-step, making a budget meaningful. Visibility tests are fast by nature — no budget needed.

**Visibility test (async data):**
```js
/**
 * @test     Plays page — Create button visibility
 * @role     coach
 * @assert   positive
 * @expect   Create button is present in the toolbar
 * @when     Data loaded, no special state
 */
test('coach sees the create button', async () => {
  renderAs('coach', <Plays />)
  await playCard('Summer Offense')
  assertVisible(createButton())
})
```

**Flow test:**
```js
/**
 * @test     Plays page — Hide play from players flow
 * @role     coach
 * @assert   positive
 * @steps    1. Open play context menu → 2. Click "Hide from Players" → 3. Hidden badge appears on card
 * @when     Data loaded, at least one play exists in the list
 * @timing   <200ms
 */
test('coach can hide a play from players', async () => {
  renderAs('coach', <Plays />)
  await userEvent.click(playContextMenu('Summer Offense'))
  assertVisible(hideFromPlayersOption())
  await userEvent.click(hideFromPlayersOption())
  assertVisible(hiddenBadge('Summer Offense'))
})
```

---

## File and folder rules

### Simple page — one test file

A page with one distinct user-facing function gets a single test file inside a `tests/` folder co-located with the page file.

```
Notifications.jsx
tests/
  notifications.test.js
```

### Complex page — folder per function

A page with multiple distinct user-facing functions gets a subfolder per function inside `tests/`. Each folder always contains `roles.test.js`. Add `flow.test.js` only when that function has a testable user flow.

```
Plays.jsx
tests/
  plays.browse/
    roles.test.js        ← always present
    flow.test.js         ← only when there is a flow to test
  plays.folders/
    roles.test.js
    flow.test.js
  plays.search/
    roles.test.js        ← search has no multi-step flow → no flow.test.js
```

**The promotion rule:** Visibility assertions only → `roles.test.js` file. Visibility + user flow → promote to a folder containing both `roles.test.js` and `flow.test.js`.

### Shared test infrastructure

```
src/tests/
  renderAs.js             ← role helper (must be created — does not exist yet)
  assertions.js           ← assertVisible / assertHidden
  fixtures/
    owner.js
    coach.js
    assistant_coach.js    ← includes assistantPermissions at documented defaults
    player.js
```

---

## Example file structure — v2 codebase

```
src/
  tests/
    renderAs.js
    assertions.js
    fixtures/
      owner.js
      coach.js
      assistant_coach.js
      player.js

  app/
    pages/
      Plays.jsx
      tests/
        plays.browse/
          roles.test.js    ← create, bulk mode, trash, new folder visibility by role
          flow.test.js     ← hide from players, show to players, bulk select + delete
        plays.folders/
          roles.test.js    ← folder create button, rename option visibility
          flow.test.js     ← create folder → rename → move play in → delete
        plays.search/
          roles.test.js    ← search input present for all roles, no flow

      PlayEdit.jsx
      tests/
        play-edit.toolbar/
          roles.test.js    ← draw tools, record button, settings gear visibility
        play-edit.settings/
          roles.test.js    ← advanced settings access by role
          flow.test.js     ← rename play, add tag, save flow

      Settings.jsx
      tests/
        settings.team/
          roles.test.js    ← team settings section visible to owner/coach only
          flow.test.js     ← update sport default, toggle team preferences
        settings.danger/
          roles.test.js    ← danger zone visible to owner only
          flow.test.js     ← delete team confirmation flow

      Team.jsx
      tests/
        team.members/
          roles.test.js    ← invite button, role dropdown, remove button visibility
          flow.test.js     ← generate invite link → assign role flow
        team.ownership/
          roles.test.js    ← transfer ownership button (owner only)
          flow.test.js     ← ownership transfer confirmation flow

      Notifications.jsx
      tests/
        notifications.test.js    ← single function, one file

      Profile.jsx
      tests/
        profile.test.js          ← single function, one file

      DemoVideos.jsx
      tests/
        demo-videos.test.js      ← single function, one file

  admin/
    pages/
      AdminUsers.jsx
      tests/
        admin-users/
          roles.test.js    ← user list visible, delete button, danger mode indicator
          flow.test.js     ← delete user confirmation and cascade flow

      AdminFeatureFlags.jsx
      tests/
        admin-flags/
          roles.test.js    ← flag list visible, toggle controls present
          flow.test.js     ← enable flag → disable flag → verify state

      AdminNotifications.jsx
      tests/
        admin-notifications/
          roles.test.js    ← notification composer visible
          flow.test.js     ← compose and send notification flow
```

---

## See also

- `test-suite-plan.md` — what to test, tool selection, CI wiring, phase order
- `permissions.md` — permission model, assistantPermissions defaults, own-play exception
- `src/tests/renderAs.js` — role helper implementation (create in Phase 3 setup)
- `src/tests/assertions.js` — assertVisible / assertHidden

---

## Cross-Reference Notes

**References:** `engineering/planning/testing/test-suite-plan.md`, `engineering/planning/permissions.md`. **Referenced by:** `engineering/frontend-code-standards.md`, `engineering/planning/architecture/proposed-file-structure.md`.
