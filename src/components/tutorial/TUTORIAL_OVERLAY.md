# Onboarding Product Tour

An animated, full-screen spotlight tour that walks a newly onboarded coach
through the first play: naming it, picking a starting point (and, for
multi-mode sports, an editor mode), placing players and prefabs, drawing a
route, keyframing, previewing the animation, and — for team accounts —
inviting assistant coaches.

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

- `src/context/tutorialSteps.js` — pure step data (`getTutorialSteps(user)`,
  sport-adaptive via `getSportCapabilities(user.sport)`), the outcome
  predicates and auto-action descriptors on each step, and a small reducer
  (`tutorialReducer`). No DOM/React here, so it's unit tested directly in
  `admin/test/tutorialSteps.test.js`.
- `src/context/tutorialBus.js` — a tiny pure event/action bus. The pages and
  the Slate editor **emit outcome events** into it ("player-added",
  "keyframe-added", "invite-sent", ...) and **register auto-perform actions**
  ("place-player", "draw-route", ...). Emitting is a no-op when the tour
  isn't listening. Unit tested in `admin/test/tutorialBus.test.js`.
- `src/utils/tutorialPreview.js` — the admin-preview mock backend. Exposes
  the sessionStorage flag helpers (`isTutorialPreviewActive`,
  `activateTutorialPreview(sport)`, `getTutorialPreviewSport`,
  `endTutorialPreviewAndReturn`) and `mockApiFetch`, an in-memory stand-in
  for every endpoint the tour and the pages it visits can hit (fake coach +
  team from `/auth/me` **under the sport chosen in the admin picker**, plays
  CRUD, invite codes/sends, sample sport prefab presets for every real sport,
  fail-closed flags and suite features). Unknown endpoints resolve to `{}` so
  obscure UI corners fail soft. Unit tested in
  `admin/test/tutorialPreviewApi.test.js`.
- `src/context/TutorialContext.jsx` — `TutorialProvider` / `useTutorial()`.
  Owns the reducer state, collects tutorialBus events per step and evaluates
  the active step's `isComplete` predicate (on every event, route change,
  and a slow safety interval), and exposes `performStepAction()` for the
  card's "Next: do it for me" button. Also reacts to the tour transitioning
  from active to inactive: in preview mode it tears the fake session down and
  returns to `/admin`; for real users it will call
  `AuthContext.markTutorialComplete?.()`, which is currently absent
  (persistence was deliberately not rebuilt yet), so the call is a safe no-op.
  Mounted in `App.jsx` above `<AppRoutes>` (not inside `AppLayout`) so tour
  state survives navigation into the standalone `/app/plays/:playId/edit`
  route, which renders outside the app shell.
- `src/components/tutorial/TutorialOverlay.jsx` — the visual piece. Portals
  to `document.body` at `z-[10050]` (above Slate's loading screen `z-[9999]`
  and `MobileViewOnlyGate`'s `z-[10000]`). Tracks the current step's target
  element every animation frame and draws a spotlight ring around it using a
  `box-shadow: 0 0 0 9999px` cutout. While the tour runs, the page is
  **click-blocked everywhere except the spotlight hole**, driver.js-style:
  the pure `blockerPanels(rect, pad, vw, vh)` helper computes four
  transparent `pointer-events-auto` panels that tile the viewport above,
  below, left, and right of the padded hole (clamped at viewport edges;
  unit tested in `admin/test/tutorialBlocker.test.js`). The hole itself
  contains no panel, so the highlighted click passes straight through to
  the real button underneath — everything else swallows the click. On
  no-target steps, and while waiting for the next screen's target to
  mount, a full-screen `pointer-events-auto` backdrop blocks everything.
  The tutorial card and the top-left **Exit tutorial** button sit above the
  blocker and stay interactive; the Exit button is always rendered and
  calls `exitTutorial()` from any step. When the tour exits the overlay
  (and its blocker) unmounts, so the page is immediately clickable again.

## Step transitions

Every step change is animated (CSS only, no libraries). The instruction card
**glides** to its next position — `top`/`left` transition over 300ms
ease-out — instead of teleporting, matching the spotlight ring's existing
0.18s slide and the progress bar's animated fill. The card **content
cross-fades**: on a step-id change the old label/title/body/CTA fade out
(~150ms), the content swaps to the new step's, and it fades back in
(`contentFadePhase` decides the phase; a small timeout keyed on the step id
performs the swap, and the buttons are disabled during the brief fade so a
mid-fade click can't act on a stale step). The **"Loading…" waiting state is
softened**: while the next screen's target is mounting, the hint is only
faded in after the wait persists past a ~250ms grace window (`cardBodyMode`),
so fast transitions never flash "Loading…" at all. The **spotlight ring and
the full-screen backdrop fade in on mount** (0.2s `tutorial-fade-in` keyframes
in `src/index.css` — the ring's `box-shadow` dim fades with it), so the dim
never hard-pops when a target appears or disappears between steps. All of
these transitions respect `prefers-reduced-motion: reduce`: card transitions
carry `motion-reduce:transition-none`, and a media query in `index.css`
disables the ring pulse, the fade-ins, and the ring's inline slide transition.
The two pure helpers are unit tested in
`admin/test/tutorialTransitions.test.js`.

## Step model

Each step in `tutorialSteps.js` has:
- `route` — a string (exact match) or RegExp the current pathname must
  satisfy before the step's selector is considered "live". Used to gate the
  spotlight polling in the overlay.
- `selector` — a CSS selector for the element to spotlight, or `null` for a
  centered narrative/interstitial card (no target).
- `advanceOn` — `"auto"` (outcome-verified, see below) or `"manual"` (the
  overlay renders a CTA button — "Continue"/"Finish" — that calls `advance()`
  directly, optionally after `navigateTo`).
- `isComplete({ pathname, events })` — for `"auto"` steps, a pure predicate
  over the current pathname and the tutorialBus events collected since the
  step became active. **A step only advances when its real outcome occurred**
  — the play was actually created (navigation to the editor), the player was
  actually added, the keyframe was actually written — never merely because a
  click landed inside the target area. Events are cleared on every step
  change so an earlier outcome can't satisfy a later step.
- `autoAction` — the "Next: do it for me" button's behavior. One of:
  - `{ kind: "click", selector }` — native `.click()` on the real control;
  - `{ kind: "fill", selector, value, thenClickSelector? }` — sets a
    controlled input through the native value setter + `input` event so
    React state updates for real;
  - `{ kind: "run", action }` — invokes an editor-registered tutorialBus
    action (canvas work: place a player/prefab, draw a sample route, seek +
    add a keyframe, move a pose within a keyframe, start playback).
  In every case the action drives the real page/editor, and the resulting
  outcome advances the step through the same verification path as a manual
  interaction — "Next" never skips verification.

### Back button

A ghost **Back** button (FiArrowLeft icon, subdued `text-BrandGray` style) appears on the left of the card's button row for every step except the first (step index 0) and the two finish steps (`finish`, `finish-solo`). Clicking it calls `handleBack` in the overlay, which: (1) looks up `steps[stepIndex - 1]`; (2) if that step's `route` is a plain string, calls `navigate(route)` to return to the correct page; (3) dispatches `BACK` to the context (which decrements `stepIndex`). RegExp routes (the editor steps) skip the navigate call — the user is typically already on that page. The event buffer is cleared on every step-index change by the existing `useEffect` in `TutorialContext`, so going back always requires the user to re-perform the previous step's action from scratch. The Back button is disabled (and fully transparent) during the content cross-fade (`isFading`), consistent with the primary CTA's fading behaviour. Reducer tests for BACK are in `admin/test/tutorialSteps.test.js`.

### Outcome events and where they're emitted

| Event | Emitted from |
|---|---|
| `title-changed` / `preset-selected` / `mode-selected` / `tag-added` | `src/pages/app/PlayNew.jsx` handlers |
| `player-added` | `useSlateEntities.handleAddPlayer` (covers quick-add, canvas placement) |
| `tool-selected` | `Slate.handleToolChange` (reports the tool that actually ended up active, including `"addPlayer"`) |
| `drawing-added` | `Slate.addDrawingTagged` (either scope, only when a drawing id was created) |
| `prefab-popover-opened` | `WideSidebarRoot.togglePopover` when the "prefabs" key goes from closed to open |
| `prefab-selected` | `Slate.handlePrefabSelect` when a prefab item is clicked or auto-selected |
| `prefab-placed` | `Slate.handleCanvasPlacePrefab` after the entities land |
| `keyframe-added` | `Slate.handleAddKeyframe`, only when a *new* keyframe will genuinely be written (min-gap and exact-time updates don't count) |
| `keyframe-pose-updated` | `Slate.handleItemDragEnd` (paused drag writes the pose into the highlighted keyframe) + the `move-player` auto-action |
| `playback-started` | `Slate` effect on `isPlaying` turning true |
| `invite-sent` | `src/pages/app/Team.jsx` after the invite POST succeeds |

### Flows

**Flow A** (create your first play) always runs and adapts to the user's
sport via `getSportCapabilities`:
`new-play → enter-title → add-tags → pick-preset → [choose-mode] → create-play →
select-add-player → place-player → [open-prefabs → select-prefab → place-prefab] →
draw-tool → draw-route → add-keyframe → move-player-keyframe → play-animation →
back-to-playbook`.
- `choose-mode` appears only for multi-mode sports (currently Football,
  keyframe + drawing) and only completes when **Keyframe** is selected, so
  the keyframe steps that follow always apply (single-mode sports are
  keyframe-only).
- `select-add-player` spotlights the Add Player sidebar row (completes on
  `tool-selected` with `tool === "addPlayer"`); `place-player` spotlights the
  canvas and completes on `player-added`.
- `open-prefabs → select-prefab → place-prefab` appear for every sport that has
  prefabs (all real sports; only the Blank canvas has none). `open-prefabs`
  completes on `prefab-popover-opened` (emitted in `WideSidebarRoot.togglePopover`);
  `select-prefab` spotlights the popover container (`[data-testid="tutorial-prefabs-popover"]`)
  and completes on `prefab-selected` (emitted in `Slate.handlePrefabSelect`);
  `place-prefab` spotlights the canvas and completes on `prefab-placed`.
- `enter-title` and `pick-preset` are deliberately split: the title step
  completes only while the input actually has text, so the tour can no
  longer walk you into the disabled "Create & Open Editor" button.
- `add-tags` sits between them and completes on `tag-added`. The step body
  shows 3 sport-specific examples from `SPORT_TAG_EXAMPLES` (in `tutorialSteps.js`).
  Its undoAction (`run: "clear-tutorial-tags"`) wipes the tag list on back
  so the step can be re-done cleanly.
- There are no save steps: plays auto-save, so the flow ends by guiding the
  user to the editor's top-left Coachable-logo back button
  (`back-to-playbook`, completes on navigation to `/app/plays`).

**Flow B** (invite assistant coaches) is appended only for team accounts —
`getTutorialSteps` drops it entirely for `user.isPersonalTeam`, ending
instead on a solo-specific finish step. Its `invite-send` step completes
only when a coach invite actually POSTed successfully.

## Selectors added to real UI

`data-testid` attributes added purely as tour anchors (no behavior change):
`tutorial-new-play`, `tutorial-title-input`, `tutorial-tags-area` /
`tutorial-tag-input`, `tutorial-preset-grid` /
`tutorial-preset-blank`, `tutorial-mode-picker` / `tutorial-mode-keyframe` /
`tutorial-mode-drawing`, `tutorial-create-play`, `tutorial-add-player`,
`tutorial-prefabs`, `tutorial-prefabs-popover` (on the PrefabsPopover
container), `tutorial-draw-tool`, `tutorial-add-keyframe`,
`tutorial-play-animation`, `tutorial-back-home`,
`tutorial-invite-card-coach` / `tutorial-invite-email-coach` /
`tutorial-invite-send-coach`. The canvas itself reuses the pre-existing
`[data-slate-root]` wrapper — no edit needed there.

## How the admin preview works

The "Preview Onboarding Tutorial" button on the `/admin` dashboard
(`src/pages/Admin.jsx`) opens a sport picker (all 9 sports, mirroring
onboarding). Choosing one sets the `coachable_tutorial_preview` +
`coachable_tutorial_preview_sport` sessionStorage keys and hard-navigates to
`/app/plays?startTutorial=1`. From that moment, for this tab only:

- `apiFetch` (`src/utils/api.js`) routes **every** request to
  `mockApiFetch` — no request reaches the server, no login is needed, and
  the flow works even with no coach account in the browser.
- `AuthContext` receives the fake "Tutorial Preview Coach" / "Tutorial
  Preview Team" session (under the chosen sport) from the mocked `/auth/me`,
  so `RequireAuth` and `RequireOnboarded` pass, the real pages render
  normally, and `getTutorialSteps` builds the sport's step list.
- `AppLayoutInner` consumes `?startTutorial=1` and force-starts the tour
  (then strips the param so refresh/back doesn't relaunch it).
- `errorReporter` is muted (nothing from the fake session is written to the
  real `error_reports` table).
- Exiting (X button) or finishing the tour clears both flags, drops the fake
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
