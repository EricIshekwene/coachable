# Sport Presets

## What was implemented

A system for admins to configure a sport-specific starting canvas for each sport. When users create a new play, they can choose between the blank default and the admin-configured preset for their sport.

## How it works

### Admin side

1. Navigate to `/admin/app` → **Sport Presets** tab (new tab alongside Plays, Page Sections, Playbook Sections).
2. Click any sport card to open the Slate editor at `/admin/presets/:sport/edit`.
3. Draw/arrange the preset canvas and it auto-saves via `PUT /admin/sport-presets/:sport`.
4. The sport card shows a green "Set" badge once a preset has been saved.

### User side

When a user opens `/app/plays/new`:
- The **Blank** tile is always shown (sport-aware field type, color, rotation).
- If the admin has configured a preset for the user's sport, a second tile labelled with the sport name appears.
- Selecting the sport tile pre-populates the new play's canvas with the admin's preset.

## Architecture

### Database

```sql
CREATE TABLE sport_presets (
  sport      TEXT PRIMARY KEY,  -- e.g. "Football", "Rugby"
  play_data  JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Backend

| Route | Auth | Description |
|---|---|---|
| `GET /admin/sport-presets` | requireAdmin | List all saved presets |
| `GET /admin/sport-presets/:sport` | requireAdmin | Get single preset |
| `PUT /admin/sport-presets/:sport` | requireAdmin | Upsert preset |
| `GET /sport-presets/:sport` | requireAuth | App users fetch preset |

- Admin routes live in `server/routes/admin.js`.
- The app-facing route is in `server/routes/sportPresets.js`, mounted at `/sport-presets`.

### Frontend

| File | Role |
|---|---|
| `src/pages/AdminPresetEditPage.jsx` | Slate editor for a sport preset |
| `src/pages/AdminPlaysPage.jsx` | Added "Sport Presets" tab with sport grid |
| `src/utils/apiPlays.js` | `fetchSportPreset(sport)` — fetches preset for app users |
| `src/pages/app/PlayNew.jsx` | Fetches sport preset, shows tile alongside Blank |

## Key decisions

- **One preset per sport** (not multiple named presets) — simplicity; the preset replaces the Blank starting point for that sport.
- **Upsert via PUT** — no separate create/update; simplifies the admin flow (click sport → edit → done).
- **Blank tile always shown** — users can always start from scratch regardless of whether a sport preset exists.
- **Sport preset tile only appears if admin has set one** — no empty/placeholder tile shown to users.
- **localStorage autosave** uses key prefix `coachable_preset_` (separate from plays' `coachable_play_`).
- **Back navigation** from the preset editor passes `{ state: { tab: "presets" } }` so AdminPlaysPage restores the presets tab on return.
