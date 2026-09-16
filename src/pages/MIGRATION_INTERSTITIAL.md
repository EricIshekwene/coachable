# Migration interstitial (V1 → V2 cutover)

What a coach whose team has moved to the new Coachable sees when they land on V1.

## What was built

| Piece | File |
| --- | --- |
| Read endpoint | [server/routes/migration.js](../../server/routes/migration.js) — `GET /migration/me` |
| Client status context (fetch + 60s background refresh) | [src/context/MigrationStatusContext.jsx](../context/MigrationStatusContext.jsx) |
| Decision helpers + destination constant | [src/utils/migrationDestination.js](../utils/migrationDestination.js) |
| Full-screen interstitial | [src/pages/AccountMovedPage.jsx](AccountMovedPage.jsx) |
| Non-blocking banner | [src/components/MovedTeamBanner.jsx](../components/MovedTeamBanner.jsx) |
| Route gate `RequireNotMoved` | [src/App.jsx](../App.jsx) |
| Tests | [admin/test/migrationInterstitial.test.js](../../admin/test/migrationInterstitial.test.js) |

## How it works

1. `server/lib/migrationStatus.js` already polls V2 and caches which teams are
   `v1_only` / `migrating` / `v2_live`. `GET /migration/me` (auth required) reads
   **only** that in-memory cache and returns
   `{ hasEverLoaded: boolean, fresh: boolean, teams: [{ teamId, teamName, status }] }`.
   It never calls V2 and never writes. It is a GET on purpose, so the cutover
   write-lock middleware can never block it.
2. `MigrationStatusProvider` fetches it for the logged-in user (the same shape
   as `FeatureFlagProvider`) and exposes `ready`, `teams`, `movedTeams`,
   `stayingTeams`. It then refreshes in the background every 60s — the same
   cadence, the same tab-hidden / offline skips and the same `visibilitychange`
   refresh `NotificationsContext` uses — so a coach whose team flips to
   `v2_live` mid-session finds out without reloading. A background refresh that
   fails, is stale, malformed, or comes back without both `hasEverLoaded: true`
   and `fresh: true`, clears the migration routing signal: V1 remains usable
   rather than trusting a last-known-good cache answer.
3. `RequireNotMoved` wraps the four authed surfaces in `App.jsx` (the `/app`
   shell plus the three full-screen routes outside it: play edit, play view-only,
   select-sport). When the decision says "moved", it renders
   `AccountMovedPage` instead of the app.
4. `MovedTeamBanner` renders at the top of `AppLayout`, above the existing
   Player View / Missing Sport banners.

## Key decisions

- **Destination is a named constant, `V2_APP_URL = "https://beta.coachableplays.com"`.**
  Never the bare apex `coachableplays.com` — that host IS V1, so linking there
  would loop a moved coach straight back here. No deep-linking: V1 knows nothing
  about V2's route shapes, and contorting the app for it was out of scope.
- **No auto-redirect.** The coach clicks. A stale cache plus an automatic
  redirect would be unrecoverable for them.
- **Mixed moved/unmoved coach (26 users belong to more than one team):**
  the interstitial is scoped to the *active* team, never to the session.
  - Every team moved → interstitial replaces the app.
  - Some moved, the active team moved → interstitial, and it lists a
    "Continue with <team>" button per unmoved team that calls `switchTeam`
    and drops them straight back into normal V1.
  - Some moved, the active team has NOT moved → no interstitial at all, just
    the slim banner; V1 works exactly as before.
  The interstitial and the banner are mutually exclusive by construction
  (`shouldShowMovedInterstitial` / `shouldShowMovedBanner`, both pure and tested
  over every combination, including zero teams and a null active team id).
  `shouldShowMovedBanner` bails out when every team has moved — that is the case
  the interstitial owns, and without the bail-out a null active team id matched
  no moved team and fired the banner too.
- **The interstitial has a way out.** A `Log out` button — V1's own
  `AuthContext.logout` plus a redirect to `/`, exactly what the app sidebar does
  — so a fully-moved coach can sign in as somebody else without clearing
  cookies. A failed "Continue with <team>" switch raises the standard
  `MessagePopup` error toast through `AppMessageContext` instead of failing
  silently; no native dialogs anywhere.
- **Fails open, always.** A failed, slow, stale, malformed, or in-flight
  `/migration/me`, or a response without `hasEverLoaded: true` and
  `fresh: true`, collapses to "no information": no
  interstitial, no banner, no spinner, no blank screen. There is deliberately no
  loading gate in the provider — children render immediately. An unmigrated
  coach sees zero change.
- **`migrating` is not moved.** A team mid-move still works in V1 and is shown
  nothing.
- **No new design language.** `AccountMovedPage` is `MaintenancePage`'s markup
  and classes with different copy and an icon swap; the banner is a copy of the
  existing `AppLayout` banner pattern.
