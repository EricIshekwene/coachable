# Coachable UI Testing Standards

**Scope:** Role-based UI tests — verifying what each user role sees and can do on a given page or section.  
**Layer:** Layer 3 in the test suite plan (`test-suite-plan.md`). This doc covers *how* to write these tests. What to test and CI wiring are in that doc.  
**Tools:** Vitest · React Testing Library · `@testing-library/user-event`

---

## Core principle

Test UI at the point of use, not on the component itself. A `Button` component does not get a test. A page that renders that button to some roles but not others does.

Tests assert both what a role **can** see and what it **cannot** — coverage runs in both directions for every gated element.

---

## The role helper — `renderAs`

`renderAs` is the single entry point for all role-based UI tests. It wraps RTL's `render` with a mocked auth context so you can specify who is using the page without standing up a real session.

**Location:** `src/tests/renderAs.js`

**Signature:**
```js
renderAs(role, component, overrides = {})
```

| Argument | Purpose |
|---|---|
| `role` | String token for the user identity (`'coach'`, `'player'`, `'admin'`, etc.) |
| `component` | The JSX to render |
| `overrides` | Optional — merges over the role's base context fixture for that test only |

Returns the standard RTL render result. RTL's global `screen` is populated.

```js
renderAs('coach', <PlaysPage />)
renderAs('player', <PlaysPage />)
renderAs('coach', <PlaysPage />, { playerViewMode: true })
renderAs('coach', <PlaysPage />, { featureFlags: { newEditor: true } })
```

Internally, each role token maps to a base context fixture in `src/tests/fixtures/`. The `overrides` object is shallowly merged on top of that fixture. This means you never need to construct a full user object in a test — only the values that differ from the base fixture.

---

## Assertion helpers

**Location:** `src/tests/assertions.js`

```js
export const assertVisible = (element) => expect(element).toBeInTheDocument()
export const assertHidden = (element) => expect(element).not.toBeInTheDocument()
```

These mirror the `@assert` field in the comment block and make assertion intent explicit in the test body.

---

## Selector pattern

Define all element queries as named functions at the top of each test file using RTL's global `screen`. This keeps the test body readable — the *what* is named at the top, the *assertion* is in the test.

```js
import { screen } from '@testing-library/react'

const createButton     = () => screen.queryByRole('button', { name: /create/i })
const bulkModeButton   = () => screen.queryByRole('button', { name: /select/i })
const newFolderButton  = () => screen.queryByRole('button', { name: /new folder/i })
const playCard         = (name) => screen.queryByText(name)
```

**Rules:**
- Always use `queryBy*` in selectors, never `getBy*`. `queryBy*` returns `null` on miss instead of throwing — so both `assertVisible` and `assertHidden` work on the same selector without needing two different query functions.
- Name selectors after the element, not the role. `createButton()` not `coachCreateButton()`.
- Selectors are file-scoped. Redefine per test file — do not share across files.

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
| `@when` | Always | Page state or precondition at the time of the assertion |
| `@timing` | Flow tests only | Performance budget — omit on visibility tests |

`@timing` is only required on flow tests because they are async and multi-step, making a budget meaningful. Visibility tests are synchronous and fast by nature — no budget needed.

**Visibility test:**
```js
/**
 * @test     Plays page — Create button visibility
 * @role     coach
 * @assert   positive
 * @expect   Create button is present in the toolbar
 * @when     Page first loads, no special state
 */
test('coach sees the create button', () => {
  renderAs('coach', <PlaysPage />)
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
 * @when     At least one play exists in the list
 * @timing   <200ms
 */
test('coach can hide a play from players', async () => {
  renderAs('coach', <PlaysPage />)
  await userEvent.click(playContextMenu('Summer Offense'))
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
  renderAs.js           ← role helper
  assertions.js         ← assertVisible / assertHidden
  fixtures/
    coach.js            ← base auth context for coach role
    player.js
    admin.js
```

---

## Example file structure — current Coachable codebase

If this standard were applied to the codebase today, the test layout would be:

```
src/
  tests/
    renderAs.js
    assertions.js
    fixtures/
      coach.js
      player.js
      admin.js

  pages/
    app/
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

    AdminUsersPage.jsx
    tests/
      admin-users/
        roles.test.js    ← user list visible, delete button, danger mode indicator
        flow.test.js     ← delete user confirmation and cascade flow

    AdminFeatureFlagsPage.jsx
    tests/
      admin-flags/
        roles.test.js    ← flag list visible, toggle controls present
        flow.test.js     ← enable flag → disable flag → verify state

    AdminNotificationsPage.jsx
    tests/
      admin-notifications/
        roles.test.js    ← notification composer visible
        flow.test.js     ← compose and send notification flow
```

---

## See also

- `test-suite-plan.md` — what to test, tool selection, CI wiring, phase order
- `src/tests/renderAs.js` — role helper implementation
- `src/tests/assertions.js` — assertVisible / assertHidden

---

## Cross-Reference Notes

**References:** `engineering/planning/testing/test-suite-plan.md`. **Referenced by:** `engineering/frontend-code-standards.md`, `engineering/planning/architecture/proposed-file-structure.md`.

**Inconsistencies to resolve:**

1. **Example file structure — admin page paths.** The example shows `AdminUsersPage.jsx` and `AdminFeatureFlagsPage.jsx` at the top level of `src/pages/`. Per `engineering/planning/architecture/proposed-file-structure.md` (done ✅), these files live at `src/admin/pages/AdminUsers.jsx` and `src/admin/pages/AdminFeatureFlags.jsx`. Update the example file structure to use the proposed paths.

2. **`PlaysPage` vs `Plays`.** The example uses `PlaysPage` as a component name in comments. The proposed file structure uses `Plays.jsx`. Confirm naming convention and align.
