# Playbook Sections

Admin-curated, named collections of platform plays that coaches can browse and copy into their team playbook.

## What was implemented

A two-sided feature:

1. **Admin side** — create and manage named sections, add/remove platform plays from each section, publish or keep as draft.
2. **Coach side** — browse all published sections, preview plays, and copy individual plays or an entire section into their team's playbook.

## Database

Two new tables added to `schema.sql`:

### `playbook_sections`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | auto-generated |
| `name` | TEXT | required |
| `description` | TEXT | optional, defaults to `''` |
| `sport` | TEXT | optional filter hint |
| `sort_order` | INT | display order |
| `is_published` | BOOLEAN | `false` = draft; only published sections are visible to coaches |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### `playbook_section_plays`
Junction table linking sections to platform plays.

| Column | Type | Notes |
|---|---|---|
| `section_id` | UUID FK → `playbook_sections` | CASCADE on delete |
| `play_id` | UUID FK → `platform_plays` | CASCADE on delete |
| `sort_order` | INT | ordering within the section |
| `added_at` | TIMESTAMPTZ | |

Deleting a section cascades to remove all its play links. Deleting a platform play cascades to remove it from all sections it belongs to.

## Backend routes

### Admin routes (`/admin/*`, requires `x-admin-session` header)

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/playbook-sections` | List all sections (drafts + published) with play counts |
| `POST` | `/admin/playbook-sections` | Create a section. Body: `{ name, description?, sport?, sortOrder? }` |
| `PATCH` | `/admin/playbook-sections/:id` | Update name, description, sport, sortOrder, isPublished |
| `DELETE` | `/admin/playbook-sections/:id` | Delete section (cascades play links) |
| `GET` | `/admin/playbook-sections/:id/plays` | List plays in a section, ordered by sort_order |
| `POST` | `/admin/playbook-sections/:id/plays` | Add a platform play. Body: `{ playId, sortOrder? }` |
| `DELETE` | `/admin/playbook-sections/:id/plays/:playId` | Remove a play from the section |
| `PATCH` | `/admin/playbook-sections/:id/plays/:playId` | Reorder. Body: `{ sortOrder }` |

### Coach-facing routes (`/playbook-sections/*`, requires Bearer auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/playbook-sections` | List published sections with play counts |
| `GET` | `/playbook-sections/:id` | Section detail + full plays list (with `playData`) |
| `POST` | `/playbook-sections/:id/copy` | Copy all plays in section to coach's team. Body: `{ folderId? }` |

Individual play copy reuses the existing `POST /platform-plays/:id/copy` endpoint.

## Frontend

### Admin (`src/pages/AdminPlaysPage.jsx`)
- New **"Playbook Sections"** tab in the header tab bar (alongside Plays and Page Sections).
- Left panel: section list with play counts and draft badge. New section form (name + optional sport).
- Right panel: selected section detail — inline rename, publish/unpublish toggle, delete, add-play picker, ordered plays list with remove buttons.
- **"Add to Section"** button (`FiBookOpen` icon) added to every `PlayCard` in the Plays tab. Opens a dropdown of all sections so admins can assign a play directly from the play grid without switching tabs.

### Coach app (`src/pages/app/Playbooks.jsx`)
- Route: `/app/playbooks`
- Nav link: **Playbooks** (`FiArchive` icon) inserted between Plays and Team in the sidebar. Visible to `coach`, `owner`, and `assistant_coach` roles only — not players.
- Browse view: grid of `SectionCard` components with sport filter chips.
- Detail view: full play grid with `PlayPreviewCard` previews. "Add to Playbook" per-play and "Add All to Playbook" for the whole section. Both buttons show a green "Added" state after success.
- Click a play preview to open a full-screen modal.

## Key decisions

- **Draft/Published gate:** `is_published = false` sections are fully manageable in the admin but invisible at `/playbook-sections`. This lets admins build sections before releasing them.
- **No play deduplication on copy:** copying a section that overlaps with existing team plays creates duplicates — intentional, same as the existing platform play copy behaviour.
- **Cascade deletes:** play links are removed automatically when either the section or the platform play is deleted. No orphaned references.
- **Role gate on coach routes:** `requireAuth` middleware checks the JWT; the copy endpoint additionally verifies the user's role is `owner/coach/assistant_coach` before inserting into the team's play library.
