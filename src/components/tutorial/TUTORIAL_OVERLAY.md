# Onboarding Product Tour

An animated, full-screen spotlight tour that walks a newly onboarded coach
through the two most important first actions: creating a play and inviting
assistant coaches / team members.

## Why this design

The tour overlays the **real** `/app` UI rather than lookalike screens, so
the buttons it highlights are the actual product and can never drift out of
date. The trade-off is that the tour must be resilient to the real app's
async navigation and modal transitions, handled by route-gating each step
(see below) and a "waiting" state in the overlay while the next screen
mounts.

**Current rollout stage: admin-preview only, fully mocked.** The tour is not
wired to real coach accounts at all. It runs exclusively behind the admin
"Preview Onboarding Tutorial" button, on an in-memory fake session (see
`src/utils/tutorialPreview.js`): every `apiFetch` call is intercepted
client-side, so the real pages render against a fake coach/team and nothing
— no account, no play, no invite, no DB row — is ever created or persisted.
When the tour later ships to real coaches, the same overlay runs on their
real session and their clicks become real actions.

## Files

- `src/context/tutorialSteps.js` — pure step data (`getTutorialSteps(user)`)
  and a small reducer (`tutorialReducer`). No DOM/React here, so it's unit
  tested directly in `admin/test/tutorialSteps.test.js`.
- `src/utils/tutorialPreview.js` — the admin-preview mock backend. Exposes
  the sessionStorage flag helpers (`isTutorialPreviewActive`,
  `activateTutorialPreview`, `endTutorialPreviewAndReturn`) and
  `mockApiFetch`, an in-memory stand-in for every endpoint the tour and the
  pages it visits can hit (fake coach + team from `/auth/me`, plays CRUD,
  invite codes/sends, fail-closed flags and suite features). Unknown
  endpoints resolve to `{}` so obscure UI corners fail soft. Unit tested in
  `admin/test/tutorialPreviewApi.test.js`.
- `src/context/TutorialContext.jsx` — `TutorialProvider` / `useTutorial()`.
  Owns the reducer state, a single capture-phase `document` click listener
  that auto-advances "click" steps, and reacts to the tour transitioning
  from active to inactive (finishing normally or exiting early): in preview
  mode it tears the fake session down and returns to `/admin`; for real
  users it will call `AuthContext.markTutorialComplete?.()`, which is
  currently absent (persistence was deliberately not rebuilt yet), so the
  call is a safe no-op.
  Mounted in `App.jsx` above `<AppRoutes>` (not inside `AppLayout`) so tour
  state survives navigation into the standalone `/app/plays/:playId/edit`
  route, which renders outside the app shell.
- `src/components/tutorial/TutorialOverlay.jsx` — the visual piece. Portals
  to `document.body` at `z-[10050]` (above Slate's loading screen `z-[9999]`
  and `MobileViewOnlyGate`'s `z-[10000]`). Tracks the current step's target
  element every animation frame and draws a spotlight ring around it using a
  `box-shadow: 0 0 0 9999px` cutout — the ring itself is `pointer-events:
  none`, so the highlighted click passes straight through to the real button
  underneath. A top-left **Exit tutorial** button is always rendered and
  calls `exitTutorial()` from any step.

## Step model

Each step in `tutorialSteps.js` has:
- `route` — a string (exact match) or RegExp the current pathname must
  satisfy before the step's selector is considered "live". Used to gate both
  the click listener and the spotlight polling in the overlay.
- `selector` — a CSS selector for the element to spotlight, or `null` for a
  centered narrative/interstitial card (no target).
- `advanceSelector` — optional; when clicks anywhere within a broader
  container should count (e.g. any preset tile in the grid), this differs
  from the narrower `selector` used just to position the highlight.
- `advanceOn` — `"click"` (auto-advances via the document listener) or
  `"manual"` (the overlay renders a CTA button — "Continue"/"Finish" — that
  calls `advance()` directly, optionally after `navigateTo`).

Two flows are chained: **Flow A** (create your first play, steps `new-play`
through `confirm-save`) always runs. **Flow B** (invite assistant coaches)
is appended only for team accounts — `getTutorialSteps` drops it entirely
for `user.isPersonalTeam`, ending instead on a solo-specific finish step.

## Selectors added to real UI

A handful of `data-testid` attributes were added purely as tour anchors (no
behavior change): `tutorial-new-play`, `tutorial-preset-grid` /
`tutorial-preset-blank`, `tutorial-create-play`, `tutorial-add-player`,
`tutorial-draw-tool`, `tutorial-save-to-playbook`, `tutorial-confirm-save`,
`tutorial-invite-card-coach` / `tutorial-invite-email-coach` /
`tutorial-invite-send-coach`. The canvas itself reuses the pre-existing
`[data-slate-root]` wrapper — no edit needed there.

## How the admin preview works

The "Preview Onboarding Tutorial" button on the `/admin` dashboard
(`src/pages/Admin.jsx`) sets the `coachable_tutorial_preview` sessionStorage
flag and hard-navigates to `/app/plays?startTutorial=1`. From that moment,
for this tab only:

- `apiFetch` (`src/utils/api.js`) routes **every** request to
  `mockApiFetch` — no request reaches the server, no login is needed, and
  the flow works even with no coach account in the browser.
- `AuthContext` receives the fake "Tutorial Preview Coach" / "Tutorial
  Preview Team" session from the mocked `/auth/me`, so `RequireAuth` and
  `RequireOnboarded` pass and the real pages render normally.
- `AppLayoutInner` consumes `?startTutorial=1` and force-starts the tour
  (then strips the param so refresh/back doesn't relaunch it).
- `errorReporter` is muted (nothing from the fake session is written to the
  real `error_reports` table).
- Exiting (X button) or finishing the tour clears the flag, drops the fake
  editor's localStorage crash-recovery cache, and hard-navigates back to
  `/admin` — discarding all in-memory state.

## Rollout status — not wired to real users yet

`AppLayout.jsx` has an auto-start effect for real first-time coaches, hard
**disabled** via `TUTORIAL_AUTO_LAUNCH_FOR_NEW_USERS = false`. Note that
flipping that flag alone is NOT enough to go live: completion persistence
(the `user_preferences.tutorial_completed_at` column, the `PATCH
/users/me/preferences` support, and the `AuthContext`
`markTutorialComplete`/`resetTutorial` callbacks — all reverted with PR #3)
must be rebuilt first, or the tour would re-launch on every visit to
`/app/plays`. A Settings → Replay Tutorial entry should be re-added at the
same time.

## Known limitation

The two "interact with the canvas" steps (place a player, draw a route)
verify that a click/drag happened inside `[data-slate-root]`, not that a
player or route was actually created — the Konva canvas isn't a queryable
DOM tree, so the tour can guide real clicks but can't verify canvas content.
This is an accepted trade-off given the goal of guiding real interactions
rather than faking/mocking canvas state.
