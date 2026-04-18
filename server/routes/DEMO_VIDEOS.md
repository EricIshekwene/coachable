# Demo Videos Feature

## What was implemented

A full-stack feature that lets admins manage a library of tutorial videos which are displayed to coaches on the `/app/videos` page.

## How it works

### Database
A `demo_videos` table stores each video entry:
- `id` — UUID primary key
- `title` — display name
- `youtube_url` — full YouTube URL (or bare video ID); nullable for "coming soon" entries
- `done` — boolean indicating the video is recorded and ready to show
- `sort_order` — integer for manual ordering

### API (`server/routes/demoVideos.js`, mounted at `/demo-videos`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/demo-videos` | Public | Returns all videos ordered by `sort_order` |
| POST | `/demo-videos` | Admin | Create a new video entry |
| PATCH | `/demo-videos/:id` | Admin | Update title, URL, done status, or sort order |
| DELETE | `/demo-videos/:id` | Elevated (Danger Mode) | Delete a video entry |

### Admin UI (`src/pages/AdminDemoVideos.jsx`, route `/admin/demo-videos`)
- Linked from the main Admin dashboard under "Demo Videos"
- Lists all videos with title, YouTube URL, done status, and thumbnail preview
- Inline editing: click the edit icon to edit any field
- Quick done toggle: click the checkbox to mark ready without opening edit form
- Reorder with ↑/↓ chevrons — persists `sort_order` to the server
- Delete requires Danger Mode (elevated admin session)
- Preview: click the YouTube thumbnail to watch the video in a modal

### Public page (`src/pages/app/DemoVideos.jsx`, route `/app/videos`)
- Accessible via "Videos" in the app sidebar navigation
- Splits videos into "Available" (done + has YouTube URL) and "Coming Soon" sections
- Clicking an available video opens a full modal player
- YouTube ID is parsed from any supported URL format (`youtu.be/`, `watch?v=`, `embed/`, or bare 11-char ID)

## Key decisions

- **YouTube hosting**: No self-hosting needed — YouTube handles CDN and streaming. Videos are unlisted so they don't appear in search.
- **Unlisted vs Public**: Videos should be uploaded as Unlisted on YouTube. This means they only appear via the embed link, not in search or on the channel page. Do NOT mark as "made for kids" (breaks embedding features).
- **`done` flag**: Separates videos the admin has recorded from placeholder entries. Coaches see "Coming Soon" cards for unrecorded titles.
- **Sort order**: Simple integer field, updated via the ↑/↓ buttons. No drag-and-drop needed at this scale.
- **Danger Mode for delete**: Consistent with the rest of the admin panel — destructive actions require re-authentication.
