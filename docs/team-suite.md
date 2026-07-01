# Team Suite

The **Coachable Team Suite** is a paid add-on bundle of 5 coaching tools that can be enabled per-team by platform admins. Each feature is independently gated and only appears in the sidebar / is accessible via route when explicitly enabled for the team.

## Features

| Feature | Route | DB Table(s) |
|---|---|---|
| Roster + Depth Chart | `/app/suite/roster` | `suite_players`, `suite_depth_chart` |
| Practice Plan Builder | `/app/suite/practice` | `suite_practice_plans`, `suite_practice_blocks` |
| Install Calendar | `/app/suite/install` | `suite_install_items` |
| Game Plan Builder | `/app/suite/game-plans` | `suite_game_plans` |
| Player Assignments | `/app/suite/assignments` | `suite_assignments`, `suite_assignment_progress` |

## Feature Flag System

### Database
A new `team_suite_features` table stores per-team entitlements:
```sql
CREATE TABLE team_suite_features (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('roster','practice_plans','install_calendar','game_plans','assignments')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, feature)
);
```
Rows are inserted on first toggle via `INSERT ... ON CONFLICT DO UPDATE`.

### Backend
- **Suite routes**: `server/routes/suite.js` — mounted at `/teams/:teamId/suite/`
  - `requireSuiteFeature(feature)` middleware checks the `team_suite_features` table before every feature-specific endpoint. Returns 403 if disabled.
  - `requireCoachRole` middleware gates writes to owner/coach/assistant_coach.
- **Admin routes**: `server/routes/adminTeamSuite.js` — mounted at `/admin/team-suite/`
  - `GET /admin/team-suite` — all teams with their feature states
  - `PATCH /admin/team-suite/:teamId/:feature` — toggle one feature
  - `PUT /admin/team-suite/:teamId` — set all features at once
  - Protected by `requireOwnerOrLegacyAdmin` (same as all other admin routes).

### Frontend
- **SuiteContext** (`src/context/SuiteContext.jsx`) — fetches feature states from `GET /teams/:teamId/suite/features` and exposes `useSuiteFeature(name)` and `useSuiteFeatures()` hooks. Fails closed (all false on error).
- **AppLayout** wraps content in `SuiteProvider`. Suite nav items in the sidebar are conditionally rendered based on enabled features.
- **`RequireSuiteFeature`** component in `App.jsx` wraps each suite route and redirects to `/app/plays` if the feature is disabled. This prevents direct URL access.
- **Admin UI**: `/admin/team-suite` (`src/pages/AdminTeamSuitePage.jsx`) — lists all teams, each with 5 toggle switches, one per feature.

## Role-Based Access
- **Owner / Coach / Assistant Coach**: full read + write access (create, edit, delete)
- **Player / Viewer**: read-only access to all 5 features

## Key Decisions
- Per-team entitlements (not user-level) — the existing `feature_flags` table is user-scoped with targeting rules, which doesn't model team-level paid features well.
- Features fail closed — if the features endpoint errors, all features default to `false` so no accidental access.
- Each suite page handles its own loading/error state independently; they don't share state with each other.

---

## V2 — Rich Suite Pages (Second Pass)

### Overview
A thorough redesign pass across all five Team Suite pages to replace placeholder UX with fully functional, data-driven experiences.

---

### 1. Play Thumbnails Everywhere (All Pages)

**Problem:** All suite pages were fetching `plays.thumbnail_url` which is always `NULL` in the database. Play thumbnails are rendered live from `play_data` (JSONB) by the `PlayPreviewCard` SVG component — there is no stored image.

**Fix:**
- Every backend endpoint that joins `plays` now selects `p.play_data` instead of `p.thumbnail_url`.
- Every frontend card that was rendering `<img src={thumbnail_url}>` now renders `<PlayPreviewCard playData={...} />`.

**Affected endpoints:**
| Endpoint | Change |
|---|---|
| `GET /suite/plays` | `play_data AS "playData"` instead of `thumbnail_url` |
| `GET /suite/game-plans/:planId` | `p.play_data` for each `suite_game_plan_plays` row |
| `POST /suite/game-plans/:planId/plays` | fetch + return `play_data` |
| `PATCH /suite/game-plans/:planId/plays/:id` | re-fetch + return `play_data` |
| `GET /suite/schedule` | `p.play_data` on both practice blocks and install items |
| `GET /suite/assignments` | `p.play_data` instead of `p.thumbnail_url` |

**Affected frontend files:** `GamePlansPage.jsx`, `SchedulePage.jsx`, `AssignmentsPage.jsx`

---

### 2. Game Plans — Rich Per-Play Blocks

**Old behavior:** Game plans stored a flat `selected_play_ids UUID[]` array. No per-play content.

**New data model:** `suite_game_plan_plays` table — one row per play block within a game plan:

```sql
CREATE TABLE IF NOT EXISTS suite_game_plan_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_plan_id UUID NOT NULL REFERENCES suite_game_plans(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  play_id UUID REFERENCES plays(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  bullet_points TEXT[] NOT NULL DEFAULT '{}',
  tagged_user_ids UUID[] NOT NULL DEFAULT '{}',
  youtube_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**New backend endpoints:**
- `GET /suite/game-plans/members` — team member list for @-tagging (must be defined before `/:planId` to avoid route collision)
- `GET /suite/game-plans/:planId` — now returns `plays[]` from `suite_game_plan_plays` with play title + `play_data`
- `POST /suite/game-plans/:planId/plays` — add a play block
- `PATCH /suite/game-plans/:planId/plays/:gpPlayId` — update description, body_text, bullet_points, tagged_user_ids, youtube_url, sort_order
- `DELETE /suite/game-plans/:planId/plays/:gpPlayId` — remove a play block

**New UI components in `GamePlansPage.jsx`:**
- `PlayPickerModal` — searchable 2-column grid of plays from the team's playbook, each rendered as a live `PlayPreviewCard`
- `MemberTagPicker` — checklist of team members for @-tagging within a play block
- `GamePlanPlayBlock` — rich card per play:
  - Full-width `aspect-video` live play canvas (animates on hover)
  - Play title overlay gradient
  - Description textarea
  - @-tagged member chips + picker
  - Bullet points (add/remove)
  - Body text area
  - YouTube URL input + thumbnail preview
  - Inline edit/save/cancel/delete
- Two-tab layout in game plan detail: **Plays** tab (primary) + **Scouting Notes** tab (existing fields)

---

### 3. Roster — Editable Table + Tag Filtering

**Old behavior:** Card list of players with a modal to edit.

**New behavior:** Editable inline table with per-row expand-to-edit and free-form tag filtering.

**Schema addition:**
```sql
ALTER TABLE suite_players ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
```

**New UI in `RosterPage.jsx`:**
- `TagInput` — free-form chip input. Enter or comma to add; Backspace removes last; × on chip removes it.
- `MemberRow` — table `<tr>` that expands to an inline edit form (colSpan=8) on click. Edits: Jersey #, Position, Year, Status, Tags, Notes.
- `RosterSection` — full `<table>` with `<thead>` (columns: #, Name, Position, Year, Status, Tags, Role, actions). Filtered by `filterTag`.
- Tag filter bar at top — collects all unique tags from all players/staff/unlisted. "All" + individual tag buttons.
- Layout changed to `max-w-4xl` for table width.

---

### 4. Schedule — YouTube Links on Install Items

**Schema addition:**
```sql
ALTER TABLE suite_install_items ADD COLUMN IF NOT EXISTS youtube_url TEXT;
```

**Changes:**
- `AddDayPanel` install form includes a YouTube URL field with `FiYoutube` icon and clear button.
- `POST /suite/install` and `PATCH /suite/install/:itemId` both accept and persist `youtubeUrl`.
- `InstallYouTubeLink` component — renders a compact YouTube card (thumbnail + "Watch on YouTube" label) below the install item title row when a valid YouTube URL is present.
- Install item cards in `DayNode` now show a **full-width `aspect-video` play canvas** when the item has `play_data` (like `app/plays`), rather than a small inline thumbnail. Non-play installs keep a compact layout.

---

### JSX Pitfalls Encountered
- **IIFE inside JSX** (`(() => {})()`) causes a Babel parse error. Extract to a named component instead.
- **Adjacent root elements in `.map()`** require a single wrapper element. Moving `key` prop to the outer wrapper fixes it.
- **Express route order matters:** `GET /suite/game-plans/members` must be defined before `GET /suite/game-plans/:planId`, otherwise Express matches `"members"` as the `:planId` param.
