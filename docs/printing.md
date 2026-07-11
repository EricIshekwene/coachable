# Multi-Play Printing

Coaches select plays in bulk-select mode on `/app/plays` and print them
together — 2, 4, or 6 plays per page — via a full-screen print preview and the
browser's print dialog (print or save as PDF). Gated as a Team Suite
entitlement (`printing`), enabled per team by platform admins at
`/admin/team-suite`.

Design rationale and phase history: [PRINTING_PLAN.md](../PRINTING_PLAN.md).
Requested by Coach Jeremy (first early-access tester).

## How it works

1. On `/app/plays`, a coach enters bulk-select mode and selects plays.
2. If the viewer is a coach **and** the team has the `printing` suite feature,
   a **Print** button appears in the bulk action bar (next to Move / Tag /
   Delete). The gate is `canShowPrintAction(isCoach, printingEnabled)` — hidden
   entirely otherwise (fail closed, like all suite features).
3. Print opens `PrintPlaysOverlay`, a full-screen portal over the app. The
   selected plays are resolved from `bulkSelected` **in the current list
   order** — the coach controls print order by sorting the list first.
4. The overlay shows letter-portrait sheets with a layout picker (2/4/6 per
   page, 4 default), a **style picker** (Minimal / Sideline / Playcall /
   Gameday, Minimal default), a live page count, Print (`window.print()`),
   and Close. Escape closes; body scroll is locked while open; closing
   returns to the list with the selection intact.
5. Each sheet: a per-style brand header (exactly one Coachable Plays lockup
   per page), then a CSS grid of cells, then a per-style branded footer.
   Each cell is a **static** `PlayPreviewCard` SVG (`controlledTimeMs={0}`,
   `autoplay="off"`) plus a per-style title treatment. Plays with no diagram
   data render a "No diagram" placeholder so the grid stays aligned in every
   style.

## Files

| File | Role |
|---|---|
| [src/components/printing/PrintPlaysOverlay.jsx](../src/components/printing/PrintPlaysOverlay.jsx) | Overlay, toolbar, `PrintSheet` / `PrintPlayCell` / `SheetHeader` / `SheetFooter` / `BrandLockup`, print CSS (`PRINT_CSS`) |
| [src/components/printing/printLayout.js](../src/components/printing/printLayout.js) | Pure helpers: `PRINT_LAYOUTS`, `PRINT_STYLES`, `DEFAULT_PER_PAGE`, `DEFAULT_STYLE_ID`, `getPrintLayout`, `getPrintStyle`, `getPlayNumber`, `paginatePlays`, `canShowPrintAction` |
| [src/pages/app/Plays.jsx](../src/pages/app/Plays.jsx) | Bulk-bar Print button + overlay mount (`printOpen`, `useSuiteFeature("printing")`, passes `teamName`) |
| [admin/test/printing/printLayout.test.js](../admin/test/printing/printLayout.test.js) | Tests: layout config, sheet styles, pagination, numbering, gating, entitlement wiring guard |

## Layouts

| Layout | Grid | Notes |
|---|---|---|
| 2 per page | 1 column (1×2) | Cells capped at 6.2in wide, centered |
| 4 per page | 2 columns (2×2) | **Default** |
| 6 per page | 2 columns (2×3) | |

`getPrintLayout()` falls back to the 4-up default for any unknown per-page
value; `paginatePlays()` clamps invalid page sizes to 1 and returns `[]` for
non-array input.

## Sheet styles

Every style works at all three layouts, keeps **exactly one lockup per page**
(branding is styling, not more logos), and stays ink-conscious — accents and
bands rather than full-bleed pages. Config lives in `PRINT_STYLES`
(`printLayout.js`); the visual differences are pure CSS/JSX per sheet in
`PrintPlaysOverlay.jsx` (no extra data plumbing). `getPrintStyle()` falls back
to Minimal for unknown ids.

| Style | Header | Cells | Footer |
|---|---|---|---|
| **Minimal** (default) | Black lockup + gray rule (the original sheet) | Diagram + centered title | none |
| **Sideline** | Lockup + team name; two-tone rule (orange stub → gray hairline) | Orange corner ticks on the diagram; left-aligned Manrope title with an orange tick bar | Hairline; team-name slot · `coachableplays.com` · page X of Y |
| **Playcall** | Lockup + "PLAY CALL SHEET" eyebrow + team name; full orange rule | Numbered orange chip + Manrope title **above** each diagram, hairline under the title block | Centered team · site · page line with orange bullets |
| **Gameday** (bolder) | Black band with **white** lockup + team name, 3px orange bottom edge | Diagram + black title band with orange number square | 2px black rule; team name + site/page in black |

Play numbers (Playcall/Gameday chips) run 1..N across the whole job in
plays-list order via the pure `getPlayNumber(pageIndex, perPage, cellIndex)`.
Sheet colors are hardcoded hex (`#121212`, `#FF7A18`) rather than `Brand*`
Tailwind tokens because the brand tokens flip in light mode while paper is
always white. The team name comes from `user.teamName` (Sideline prints a
blank write-in slot when missing).

## Print CSS (the fiddly part)

Mounted as a `<style>` tag inside the overlay (`PRINT_CSS` in
`PrintPlaysOverlay.jsx`):

- `@page { size: letter portrait; margin: 0.45in }` — margins tolerant of A4.
- `@media print` hides `#root` and the screen-only toolbar, flattens the
  overlay to static positioning, and gives each `.print-sheet`
  `break-after: page` (plus legacy `page-break-after`), suppressed on the
  last sheet.
- `print-color-adjust: exact` + `-webkit-print-color-adjust: exact` on every
  sheet element — **without this, browsers strip the green field background
  when printing.** Applied outside the `@media print` block so it also
  affects the print-dialog preview.
- Sheets are fixed at 7.3in × min 10.1in on screen so the preview matches the
  printed page; in print the min-height drops to **9.8in** — just under the
  10.1in letter content height so `mt-auto` footers sit near the page bottom
  without spilling onto blank pages (A4 is taller, so it fits there too).

## Entitlement (`printing`)

Standard Team Suite feature — the wiring spans five places, guarded by the
"entitlement wiring" tests in
[admin/test/printing/printLayout.test.js](../admin/test/printing/printLayout.test.js):

- `server/db/schema.sql` — `'printing'` in the `team_suite_features` CHECK
  constraint (idempotent widening migration included).
- `server/routes/adminTeamSuite.js` + `server/routes/suite.js` — `'printing'`
  in both `SUITE_FEATURES` lists.
- `src/pages/AdminTeamSuitePage.jsx` — "Printing" toggle per team.
- `src/pages/app/Plays.jsx` — `useSuiteFeature("printing")` +
  `canShowPrintAction()` hide the button when not entitled.

See [docs/team-suite.md](team-suite.md) for the entitlement system itself.

## Key decisions

- **Pure SVG, no capture** — cells reuse the `PlayPreviewCard` renderer
  (same as playbook thumbnails), so diagrams are crisp at any print size with
  zero image-generation work. Static cards spin up no RAF loops, so large
  selections (~40 plays) are cheap.
- **Overlay, not a route** — keeps `bulkSelected` state in `Plays.jsx`; no
  state plumbing, and Close returns to the list with the selection intact.
- **Play name only per cell**; plays-list ordering; all 9 sports supported.
- **Permissions are automatic** — plays are fetched through the viewer's team
  scope, so "print only what you can view" holds by construction.

## Known limitations / deferred

- **Keyframe-animated plays print formation only** at t=0 — route strokes
  only appear for drawing-mode plays. Fast-follow if coaches need it: render
  keyframe tracks as static polylines + arrowheads.
- Diagram/ink-saver mode (white field), tags/notes on cells,
  reorder-in-preview, other paper sizes, team branding, server-side PDFs —
  all explicitly out of MVP (see PRINTING_PLAN.md "Deferred").
