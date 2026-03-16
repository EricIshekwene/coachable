# Platform Plays

## What it is

Platform plays are admin-curated example plays that are not tied to any team. They can be featured on the public landing page so coaches can discover and copy them into their own team's playbook.

## How it works

### Data model

A `platform_plays` table stores plays independently of the team-scoped `plays` table:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Play name |
| `description` | TEXT | Short summary shown on landing page |
| `sport` | TEXT | e.g. "Rugby", "Soccer" |
| `play_data` | JSONB | Full Slate animation data |
| `thumbnail_url` | TEXT | Base64 or URL thumbnail image |
| `tags` | TEXT[] | e.g. ["attack", "lineout"] |
| `is_featured` | BOOLEAN | Whether to show on landing page |
| `sort_order` | INT | Display order (ascending) |

### Creating and editing plays

1. Log in to `/admin`
2. In the **Platform Plays** section, click **New Play**
3. You are taken to the play editor (`/admin/plays/new/edit`)
4. Design the play using the full Slate canvas
5. Changes auto-save as you work (first save creates the record)
6. Click the home/back button to return to `/admin`
7. In the Platform Plays table, toggle **Featured** to show the play on the landing page

### Public display

Featured plays (`is_featured = true`) are shown in an **Example Plays** grid on the landing page (`/`). Each card shows:
- Thumbnail (or placeholder icon)
- Title, sport badge, description, tags
- **Add to playbook** button (for logged-in coaches)
- **Sign up to use** link (for unauthenticated visitors)

### Importing into a team playbook

When a logged-in coach clicks "Add to playbook":
1. The full `play_data` is fetched from `GET /platform-plays/:id`
2. A new play is created in the coach's team via `POST /teams/:teamId/plays`
3. A success confirmation is shown briefly on the card

## API routes

### Admin (requires `x-admin-session` header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/plays` | List all platform plays |
| GET | `/admin/plays/:id` | Get a single play (with playData) |
| POST | `/admin/plays` | Create a play |
| PATCH | `/admin/plays/:id` | Update any field |
| DELETE | `/admin/plays/:id` | Delete a play |

### Public (no auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/platform-plays` | List featured plays (no playData) |
| GET | `/platform-plays/:id` | Get play details including playData |

## Key files

| File | Role |
|------|------|
| `server/db/schema.sql` | `platform_plays` table definition |
| `server/routes/admin.js` | Admin CRUD routes |
| `server/routes/platformPlays.js` | Public read routes |
| `server/index.js` | Router registration |
| `src/pages/AdminPlayEditPage.jsx` | Admin slate editor wrapper |
| `src/pages/Admin.jsx` | Admin dashboard — Platform Plays section |
| `src/pages/Landing.jsx` | Featured Plays section |
| `src/App.jsx` | `/admin/plays/:playId/edit` route |
