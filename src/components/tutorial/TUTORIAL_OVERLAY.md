# Onboarding Product Tour

An animated, full-screen spotlight tour that walks a newly onboarded coach
through the two most important first actions: creating a play and inviting
assistant coaches / team members.

## Why this design

The tour overlays the **real** `/app` UI rather than a mock/fake screen. The
coach's clicks are real — finishing the tour leaves them with an actual first
play saved to their playbook and (optionally) a real invite sent to an
assistant coach. The trade-off is that the tour must be resilient to the real
app's async navigation and modal transitions, handled by route-gating each
step (see below) and a "waiting" state in the overlay while the next screen
mounts.

## Files

- `src/context/tutorialSteps.js` — pure step data (`getTutorialSteps(user)`)
  and a small reducer (`tutorialReducer`). No DOM/React here, so it's unit
  tested directly in `admin/test/tutorialSteps.test.js`.
- `src/context/TutorialContext.jsx` — `TutorialProvider` / `useTutorial()`.
  Owns the reducer state, a single capture-phase `document` click listener
  that auto-advances "click" steps, and calls
  `AuthContext.markTutorialComplete()` whenever the tour transitions from
  active to inactive (covers both finishing normally and exiting early).
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

## Persistence

`user_preferences.tutorial_completed_at` (nullable `TIMESTAMPTZ`, same table
as `theme`/`player_view_mode`) tracks completion. `PATCH
/users/me/preferences` accepts `tutorialCompleted: true|false` (`true` sets
`now()`, `false` clears it for a replay). `GET /auth/me` folds it into
`user.tutorialCompleted`. `AppLayout.jsx` auto-starts the tour once per app
mount when a user with `tutorialCompleted === false` lands on `/app/plays`.
Settings → **Replay Tutorial** clears the flag and restarts the tour.

## Known limitation

The two "interact with the canvas" steps (place a player, draw a route)
verify that a click/drag happened inside `[data-slate-root]`, not that a
player or route was actually created — the Konva canvas isn't a queryable
DOM tree, so the tour can guide real clicks but can't verify canvas content.
This is an accepted trade-off given the goal of guiding real interactions
rather than faking/mocking canvas state.
