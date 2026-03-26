# Hide from Players Feature

## Overview
Coaches can hide individual plays from players. Hidden plays are invisible to actual players and to coaches using Player View mode.

## How It Works

### Database
- Added `hidden_from_players BOOLEAN NOT NULL DEFAULT false` column to the `plays` table.
- Existing plays default to visible (false).

### Backend (`server/routes/plays.js`)
- **GET list** (`/:teamId/plays`): When `req.teamRole === "player"`, the SQL query filters out rows where `hidden_from_players = true`.
- **GET single** (`/:teamId/plays/:playId`): Returns 404 for players requesting a hidden play.
- **PATCH** (`/:teamId/plays/:playId`): Accepts `hiddenFromPlayers` in the request body (coach/owner only).
- **Response**: `toPlayResponse()` includes `hiddenFromPlayers` boolean in all play responses.

### Frontend

#### API (`src/utils/apiPlays.js`)
- `mapApiPlayToLocal()` maps `hiddenFromPlayers` to the local play shape.
- Toggling uses the existing `updatePlay()` function with `{ hiddenFromPlayers: true/false }`.

#### Plays Page (`src/pages/app/Plays.jsx`)
- **Context menu**: "Hide from Players" / "Show to Players" toggle option with `FiEyeOff` / `FiEye` icons. Only visible to coaches (menu is already coach-gated).
- **Visual indicator**: Hidden plays show a small eye-off icon next to the title (coach view only).
- **Player view filtering**: `playerVisible()` filter applied to `baseVisiblePlays` and `recentlyEdited` lists, hiding plays with `hiddenFromPlayers: true` when `playerViewMode` is active.

### Security
- Server-side filtering ensures actual players never receive hidden play data, even if they craft direct API requests.
- Frontend filtering handles the coach "Player View" toggle (which is a client-side concept).

## Key Decisions
- Used a simple boolean column rather than a visibility enum, since the only distinction needed is player-visible vs. hidden.
- Both server-side and client-side filtering are implemented: server-side for real players, client-side for coach player-view mode.
- The toggle is optimistic (updates UI immediately, fires API in background) consistent with other play actions like favorite/rename.
