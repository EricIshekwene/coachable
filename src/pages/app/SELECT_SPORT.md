# Missing-Sport Banner + Select Sport Page

## Problem

Teams can end up with `teams.sport = NULL` — most commonly solo workspaces
created while the onboarding bug (fixed in `650f422`) hardcoded `sport: ""`,
plus any team whose creator deliberately or accidentally skipped sport
selection. Without a sport, the play editor, playbook filtering, and presets
fall back to blank-canvas defaults, and nothing in the app told the user why
or how to fix it.

## What Was Implemented

### 1. Status banner in the app shell (`src/layouts/AppLayout.jsx`)

A dismissible banner renders at the top of `/app/*` (below the Player View
banner, same visual family: `border-BrandOrange/30 bg-BrandOrange/10`) when
the active team has no sport:

- **"No sport selected — pick your team's/workspace's sport to get the right
  field and defaults"**, with a **Select Sport** button and an **X** dismiss.
- **Owners and coaches only** — `PATCH /teams/:teamId/settings` (the endpoint
  that sets sport) rejects players via `requireTeamRole("owner", "coach")`,
  so showing players the banner would be a dead end.
- Hidden in Player View mode.
- Copy adapts to personal workspaces ("workspace's") vs teams ("team's").

### 2. Sport selector page (`src/pages/app/SelectSport.jsx`, route `/app/select-sport`)

Full-screen page following the established sport-selection pattern
(`SportPickerPage.jsx` / onboarding sport step): dark `BrandBlack` left panel,
identical `aspect-square` field-image cards, right-side brand panel.

- **Click-to-submit**: one click on a sport card saves it via
  `AuthContext.updateTeamDefaults({ sport })` (which PATCHes the settings
  endpoint and updates `user.sport` + `allTeams` locally) and navigates back.
- **Return path**: the banner passes `location.state.from`; the page navigates
  back there (default `/app/plays`). "Back to app" link does the same.
- **Blank Canvas** is included last as the deliberate opt-out (matching
  onboarding): no PATCH is made, the banner is dismissed for the session,
  and the user is returned to the app.
- Non-owner/coach visitors are redirected straight back.
- Route lives outside `AppLayout` (like `PlayEditPage`) so it renders without
  the nav chrome, gated by `RequireAuth` + `RequireOnboarded`.

### 3. Banner visibility logic (`src/utils/sportBanner.js`)

Pure helpers shared by the banner and the page, unit-testable without JSX:

- `shouldShowSportBanner({ sport, role, dismissed })` — the render predicate.
- `dismissSportBanner(teamId)` / `isSportBannerDismissed(teamId)` — session
  dismissal in `sessionStorage`, **keyed per team** so switching to another
  sportless team shows the banner again. Storage access is guarded so
  non-browser environments (tests) and blocked storage fail safe (banner
  stays visible).

### 4. Retroactive demo-play seeding (`server/routes/teams.js`, `server/lib/userTeams.js`)

Teams created without a sport skipped `seedDemoPlay` at creation (it returns
early on NULL sport), so bug-affected solo workspaces have empty playbooks.
`PATCH /teams/:teamId/settings` now seeds the sport's demo play when **all**
of the following hold (predicate: `shouldSeedDemoPlayOnSportSet` in
`server/lib/userTeams.js`):

1. The request sets a real sport,
2. the team previously had no sport (NULL/empty — i.e. this is the first
   sport ever set), and
3. the team has **zero plays** (any existing play, archived included, means
   the user has history and gets no surprise seeded play).

This fires no matter which UI sets the first sport (the select-sport flow or
the team settings page) and applies to any team type — the zero-plays check
is the guard against noise. The response reports `{ seededDemoPlay: boolean }`.
The Plays page refetches on mount, so the seeded play appears as soon as the
user lands back in the app.

## Key Decisions

- **Dismissible per session, not permanently** — the banner nudges toward a
  one-click permanent fix; per-session dismissal keeps it from nagging within
  a session while ensuring NULL-sport teams eventually get fixed.
- **sessionStorage over React state** for dismissal so it survives the
  banner → selector → back navigation (AppLayout unmounts during it) and the
  Blank Canvas opt-out can dismiss from the selector page.
- **Seeding lives in the settings endpoint, not the page** — so a NULL-sport
  team fixed via team settings gets its demo play too, and the seed happens
  in the same request that sets the sport (no client round-trip race).

## Files Changed

| File | Change |
|---|---|
| `src/utils/sportBanner.js` | New — visibility predicate + session dismissal helpers |
| `src/pages/app/SelectSport.jsx` | New — full-screen sport selector at `/app/select-sport` |
| `src/layouts/AppLayout.jsx` | Missing-sport banner in the app shell |
| `src/App.jsx` | Route for `/app/select-sport` |
| `server/routes/teams.js` | Settings PATCH seeds demo play on first sport set (zero-plays teams) |
| `server/lib/userTeams.js` | `shouldSeedDemoPlayOnSportSet` predicate |
| `admin/test/selectSportBanner.test.js` | Tests: visibility logic, dismissal, PATCH payload, blank-canvas opt-out |
| `admin/test/seedDemoPlayOnSportSet.test.js` | Tests: seeding predicate + settings PATCH contract |
| `src/pages/app/SELECT_SPORT.md` | This document |
| `CRAWLER_MAP.md` | New route + feature entries |
