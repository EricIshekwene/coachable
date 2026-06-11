# Sport Onboarding Selection

## Problem

When coaches signed up for Coachable and created their first squad through onboarding, the sport selection was optional and easy to skip. This caused issues because the sport drives the field type displayed when a coach first opens the play editor (Slate). A missing sport meant coaches landed on a blank field with no context.

## What Was Implemented

The "Create Team" onboarding flow was converted from a single-step form (team name + optional sport dropdown) to a **two-step wizard**:

1. **Step 1 — Team Name:** Coach enters the team name and clicks "Continue".
2. **Step 2 — Sport Selection (required):** A visual grid of sport cards (with real field image thumbnails) is shown. The coach must select one before the "Finish setup" button becomes active. "Blank Canvas" is included as a last-resort option so the flow is never a dead end, but it is positioned last to discourage accidental use.

The sport picker is reused from the same visual language as the `/slate` sport picker (`SportPickerPage.jsx`) — each card shows the actual field image with a dark gradient overlay and the sport name at the bottom.

## Key Decisions

### Required, not optional
The original dropdown was labeled "Sport (optional)" and was easy to ignore. Moving to a mandatory step ensures every new team has a sport recorded in the database, which flows through to the Slate field type.

### Blank Canvas is still allowed
Per product requirements, coaches must be able to choose "no sport" without being blocked. "Blank Canvas" is the last entry in the grid with a neutral gray background and a grid pattern, clearly distinct from real sport cards. Choosing it stores `null` in `teams.sport`.

### Two-step instead of in-page required field
A required field inside the existing single-page form could be missed or confusing. A dedicated step breaks the cognitive load and mirrors the `/slate` experience coaches already encounter when they test play creation before onboarding.

### State model
- `createStep: "name" | "sport"` — controls which step is visible.
- `sportChosen: boolean` — tracks whether the user has explicitly clicked a sport card. This correctly distinguishes between "blank canvas selected" (`sport = ""`, `sportChosen = true`) and "hasn't chosen yet" (`sport = ""`, `sportChosen = false`), keeping the button disabled in the latter case.
- Switching team action (Create / Join / Solo) resets both `createStep` and `sportChosen` so state never leaks between flows.

### Solo and Join flows unchanged
- **Solo:** Already had an optional sport picker; left as-is since solo users navigate directly to `/slate/:sport` and the field is not tied to a team.
- **Join:** Sport is inherited from the team being joined; no selection needed.

## Files Changed

| File | Change |
|---|---|
| `src/pages/Onboarding.jsx` | Rewrote create-team section to two-step wizard; added `SportSelectionGrid` component; added field image imports |
| `admin/test/sportOnboarding.test.js` | New tests for `canAdvance` logic, sport payload, and `SPORTS_FOR_CREATE` shape |
| `src/pages/SPORT_ONBOARDING_SELECTION.md` | This document |
| `CRAWLER_MAP.md` | Added `SportSelectionGrid` component reference |
