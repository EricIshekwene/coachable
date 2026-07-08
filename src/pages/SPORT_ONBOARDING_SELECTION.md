# Sport Onboarding Selection

## Problem

When coaches signed up for Coachable and created their first team through onboarding, sport selection was either optional (dropdown) or embedded inline on a white background — visually disconnected from the `/slate` sport picker coaches see when they open the play editor.

## What Was Implemented

The onboarding flow is a **three-step wizard** for "Create Team", two steps for "Join Team", and two steps for "Just Make Plays":

| Action        | Steps                                    |
|---------------|------------------------------------------|
| Create Team   | 1 — Choose action → 2 — Team name → 3 — Sport selection |
| Join Team     | 1 — Choose action → 2 — Invite code → Submit |
| Just Make Plays | 1 — Choose action → 2 — Sport selection (click-to-submit) |

### Sport Selection Step

The sport step uses the **identical card design as `SportPickerPage.jsx`** (`/slate`):
- Left panel background transitions from white to `BrandBlack` (#0A0A0A) as the panel slides in
- Real field image thumbnails, same `aspect-square` cards, same gradient overlay, same hover/selection ring
- "Blank Canvas" is included last as a deliberate opt-out

**Create flow:** sport selection is required — the "Finish Setup" button is disabled until a card is chosen.

**Solo flow:** clicking any sport card immediately calls `completeOnboarding` and navigates to `/slate/:sport`, exactly matching the one-click UX of `SportPickerPage`.

## Key Decisions

### Dark panel on sport step
The sport step transitions the left panel background from white to `BrandBlack` with a CSS `transition: background-color 0.3s ease`. This makes the sport selection feel like stepping into the editor, not like filling in a form field.

### Solo uses field images, not text buttons
The previous implementation gave solo users a plain text-button grid. Solo users are the most likely to go straight to the play editor, so they get the same visual sport picker as the dedicated `/slate` entry point.

### Scrollview only on left panel
The outer container uses `md:overflow-hidden` + `height: var(--app-viewport-height)` (locked on desktop, natural on mobile). Each step panel is `position: absolute; inset: 0; overflow-y: auto` — only the individual step content scrolls, not the whole page.

**Important:** because every step panel is absolutely positioned, the left panel has no in-flow children and therefore no intrinsic height. It must carry an unconditional `h-full` (not just `md:h-full`) so the panels have a box to fill on mobile — otherwise the panel collapses to 0px and the whole flow renders blank (this was a live incident on mobile in July 2026).

### Step transitions
Steps slide in/out using `opacity` + `translateX` with `pointerEvents: none` on hidden steps — matching `SportPickerPage`'s step transition pattern.

### State model
- `step: "choose" | "details" | "sport"` — which panel is visible
- `teamAction: "create" | "join" | "solo"` — set when clicking an action card
- `sportChosen: boolean` — distinguishes "blank canvas chosen" (`sport=""`, `sportChosen=true`) from "not chosen yet" (`sport=""`, `sportChosen=false`)
- Navigating back resets `sport` and `sportChosen` so cards don't appear pre-selected

### Join flow skips sport
Sport is inherited from the team being joined; no selection is needed or shown.

## Files Changed

| File | Change |
|---|---|
| `src/pages/Onboarding.jsx` | Full rewrite: 3-step flow, dark sport panel, field image cards, scrollview fix |
| `admin/test/sportOnboarding.test.js` | Updated tests: new step model, solo flow, `canAdvanceDetails`, `canFinishSport` |
| `src/pages/SPORT_ONBOARDING_SELECTION.md` | This document |
| `CRAWLER_MAP.md` | Updated Onboarding.jsx entry |
