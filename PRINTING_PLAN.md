# Multi-Play Printing — Implementation Plan

> Status: **Planned** (not started) · Created July 11, 2026
> Source: PRD "Multi-Play Printing" + design grilling session.
> Requested by a real coach (Coach Jeremy — first early-access tester).

## Summary

Coaches select multiple plays in the existing bulk-select mode on `/app/plays`
and print them together — 2, 4, or 6 plays per page — via a full-screen print
preview and the browser's print dialog (print or save as PDF). Gated as a new
Team Suite entitlement (`printing`), enabled per team by platform admins.

---

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Diagram render | `PlayPreviewCard` SVG at `controlledTimeMs={0}`, `autoplay="off"` | Pure SVG — crisp at any print size; no Konva capture, no image generation. Same renderer as playbook thumbnails. |
| Entry point | 4th button ("Print") in the bulk action bar in `src/pages/app/Plays.jsx` (next to Move / Tag / Delete) | Coach is already selecting plays there; zero new selection UI. |
| Preview surface | Full-screen portal overlay opened from the bulk bar; `window.print()` | Keeps `bulkSelected` state in `Plays.jsx`; no route/state plumbing; close returns to list with selection intact. |
| Layouts | 2-up (1×2), 4-up (2×2, **default**), 6-up (2×3) | Per PRD. |
| Paper | Letter portrait (`@page { size: letter portrait }`), margins tolerant of A4 | More paper sizes = future consideration. |
| Ordering | Plays-list order (coach's current sort on the Plays page) | Predictable; coach controls order by sorting before selecting. |
| Per-play info | Play name only | Tags/notes are future considerations. |
| Page header | Thin `coachableplays.com` text line at the top of **every** page | Doubles as subtle marketing on handouts. |
| Sports | All 9 sports | Nothing football-specific in the renderer; entitlement gate limits exposure. |
| Gating | New `team_suite_features` key `'printing'`; button **hidden entirely** when not entitled (fail closed, like all suite features) | Matches the premium end-state; reuses admin toggle UI at `/admin/team-suite` and `useSuiteFeature()`. |
| Color | Full color (field PNG + pitch color) — requires `print-color-adjust: exact` | Zero new rendering work for MVP. Ink-saver "diagram mode" is deferred (see below). |
| Selection cap | None; verify performance at ~40 plays | Static renders spin up no RAF loops. |
| Permissions | Automatic — plays are fetched through the viewer's team scope | "Print only what you can view" holds by construction. |

## Key codebase facts (verified)

- `src/components/PlayPreviewCard.jsx` is a pure SVG renderer and supports
  `controlledTimeMs` + `autoplay="off"` (see `PLAY_PREVIEW_PLAYER.md`).
- The plays list already carries `playData` — `Plays.jsx:787` passes
  `play.playData` into cards. **No new data endpoints needed.**
- Bulk mode + action bar: `Plays.jsx` (`bulkMode`, `bulkSelected`,
  bulk bar at ~line 589).
- Entitlement plumbing: `server/db/schema.sql:953` (`team_suite_features`,
  CHECK constraint at line 955), `server/routes/adminTeamSuite.js:21`
  (`SUITE_FEATURES` array), `server/routes/suite.js` (features endpoint),
  `src/context/SuiteContext.jsx` (`useSuiteFeature`, fails closed),
  `src/pages/AdminTeamSuitePage.jsx` (admin toggles).

---

## Phase 0 — Backend entitlement (requires Railway deploy)

1. `server/db/schema.sql` — idempotent migration widening the CHECK
   constraint: `DO $$` block that drops `team_suite_features_feature_check`
   and re-adds it with `'printing'` in the allowed list.
2. `server/routes/adminTeamSuite.js` — add `'printing'` to `SUITE_FEATURES`.
   Check `server/routes/suite.js` for a mirror list on the features endpoint
   and update it too.
3. `src/pages/AdminTeamSuitePage.jsx` — add a "Printing" toggle label
   (verify whether toggles are list-driven or driven by the API response).
4. Deploy per CLAUDE.md checklist:
   `powershell -ExecutionPolicy Bypass -File scripts/deploy-railway.ps1`
   from repo root; verify service `resplendent-inspiration`.

## Phase 1 — Print UI (frontend only; Cloudflare auto-deploys on push)

1. **Bulk bar button** — `Plays.jsx`: show Print when
   `isCoach && useSuiteFeature('printing')`; opens the overlay with selected
   plays resolved from `bulkSelected` in current list order.
2. **New `src/components/printing/PrintPlaysOverlay.jsx`**
   (+ `PrintSheet` / `PrintPlayCell` as needed):
   - Screen-only toolbar: layout picker (2/4/6, default 4), page count,
     Print button (`window.print()`), Close. Escape closes; body scroll locked.
   - Pure helper `paginatePlays(plays, perPage)` chunks plays into pages.
   - Page = header line + CSS grid of cells; cell = static `PlayPreviewCard`
     + truncating play name. Null `playData` → placeholder cell with name.
   - Print CSS: `@media print` hides app + toolbar, shows only the sheet;
     `break-after: page` per page; `print-color-adjust: exact` (and
     `-webkit-print-color-adjust: exact`) on diagram elements.
3. **Perf check** — confirm static cards create no RAF loops; test ~40 plays.

## Phase 2 — Tests + docs (required by CLAUDE.md)

- Tests in `admin/test/printing/`: pagination chunking, layout config,
  gating visibility logic (extract pure helpers for testability).
- Feature doc `docs/printing.md`.
- Update `CRAWLER_MAP.md` in the same change (hard rule).

## Phase 3 — Rollout

- Admin toggles `printing` ON for Coach Jeremy's team at `/admin/team-suite`.
- Success check (from PRD): sheet created in under 2 minutes; readable at
  4-up and 6-up; Jeremy confirms output is useful.

---

## Risks (ranked)

1. **t=0 shows no routes for keyframe-animated plays.** Drawing-mode plays
   print their coaching-draw route strokes; keyframe-animated plays print
   formation only. **Validate against Coach Jeremy's actual plays before he
   tests.** Fast-follow if needed: render keyframe tracks as static
   polylines + arrowheads (~2–3 days).
2. **Browsers strip background colors when printing** — without
   `print-color-adjust: exact` the green field prints white. Verify Safari.
3. **Print CSS cross-browser fiddliness** — margins / page breaks; budget
   polish time.

## Deferred (explicitly out of MVP)

- **Diagram mode** — white field background + dark route colors so printed
  plays look like traditional playbook diagrams (coach feedback: nobody
  wants a green background on paper). Requires a light rendering variant of
  `PlayPreviewCard` (field PNGs are baked images → hide PNG, draw minimal
  field lines).
- Route-arrow rendering for keyframe-animated plays (risk #1 fast-follow).
- QB wristband templates, tags/notes on cells, reorder-in-preview,
  team branding, other paper sizes, server-side PDFs, full playbook printing.

## Estimate

~2.5–3 days: ½ day Phase 0 incl. deploy · 1.5–2 days Phase 1 incl. print
CSS polish · ½ day Phase 2.
