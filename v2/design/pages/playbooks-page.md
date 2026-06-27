# Playbooks & Folders Page Design Spec

This doc covers two distinct surfaces that share the "playbook" concept:

1. **Plays page** (`/app/plays`) — the coach's own plays and folders, collectively called their "playbook"
2. **Playbooks page** (`/app/playbooks`) — the Coachable-curated library coaches browse and copy from
3. **Public playbooks pages** (`/:sport/playbooks`) — unauthenticated browsing, one per sport

---

## Terminology

| Term | Meaning |
|---|---|
| **Folder** | A user-created container on the Plays page used to organise their own plays |
| **Playbook** (informal) | A coach's full set of plays + folders — the Plays page as a whole |
| **Playbooks Library** | Admin-curated content at `/app/playbooks` — coaches browse and copy plays from here |
| **Section** | A named collection of plays inside the Playbooks Library, created by Coachable admins |
| **Community section** | A coach-submitted section in the Library — visible only when the `community_posting` feature flag is enabled by admin |

---

## 1 — Plays Page (`/app/plays`)

### 1.1 — Page header

| State | Title | Subtitle |
|---|---|---|
| Root (no folder) | "Playbook" | "[N] plays · [N] folders" |
| Inside a folder | Folder name | "[N] plays in folder" |

Below the title, when inside a folder, a breadcrumb trail renders:

```
All Plays  /  Offense  /  Run Plays
```

Each ancestor is a button that navigates to that depth. The current folder renders as plain text (no link). Breadcrumbs only appear when `folderPath.length > 0`.

### 1.2 — Header actions (top-right)

Rendered left to right:

| Control | Visible when | Notes |
|---|---|---|
| Bulk select toggle | Coach, not in bulk mode | Icon-only button (`FiCheckSquare`), `ghost` variant |
| Cancel bulk | Bulk mode active | `secondary` variant, accent-tinted |
| Trash | Coach | Icon-only (`FiTrash2`) |
| New Folder | Coach, `folderPath.length < 4` | Disabled and hidden at depth 4 |
| New Play | Coach, desktop only | `primary` variant, `FiPlus` icon; hidden on mobile |

### 1.3 — Search bar

Full-width search input below the header. Searches across **all plays across all folders** — not scoped to the current folder. Players search across plays visible to them (hidden plays excluded).

### 1.4 — Tag filter chips

Rendered below the search bar when any plays have tags. Each chip is a `TagPill` in `filter` variant. Selecting a tag filters the visible play list. Multiple tags are not supported simultaneously — only one active at a time. A "Clear filter" button appears when a tag is active.

### 1.5 — Bulk action bar

Appears between the tag chips and the content grid when bulk mode is active and at least one play is selected. Shows selected count, and the following actions:

- **Move** (only if folders exist) — opens a folder picker modal
- **Tag** — opens an inline input to add a tag to all selected plays
- **Delete** — moves all selected plays to trash (with confirmation)

### 1.6 — Recently Edited strip

Shown at root level only (no active folder, no search). Horizontal scrollable strip of the 5 most recently edited plays. Each item shows the play title and a relative timestamp. Clicking navigates to the play editor (coach) or viewer (player view mode).

Hidden when inside a folder or when search is active.

### 1.7 — Content grid

Shows **folders first, then plays** in the current folder context.

**Folder rows** use `FolderCard`. At root, shows all top-level folders (`parentId === null`). Inside a folder, shows immediate subfolders.

**Play rows** use `PlayCard`. At root, shows all plays with no `folderId`. Inside a folder, shows plays where `folderId === currentFolderId`.

When search is active, folders and plays that match the search term are shown regardless of folder context. Folder filter by `parentId` does not apply during search.

Sort order (applies to plays only, controlled by a sort dropdown):

| Option | Behaviour |
|---|---|
| Updated (default) | `updatedAt DESC` |
| Created | `createdAt DESC` |
| A → Z | Title ascending |
| Z → A | Title descending |

Folders always render above plays regardless of sort order.

### 1.8 — Drag-and-drop

On desktop, plays can be dragged onto a `FolderCard` to move them. The folder shows a highlight state while a play is dragged over it. Drop calls `PATCH /:teamId/plays/:id/folder`. No drag-and-drop on mobile.

### 1.9 — Folder navigation

Clicking a `FolderCard` appends the folder's `id` to `folderPath`. The URL does not change — folder state is in-memory only. Back navigation uses the breadcrumb trail.

Maximum nesting depth is 4. The "New Folder" button is hidden at `folderPath.length >= 4`.

### 1.10 — New folder creation

Inline — clicking "New Folder" shows an inline text input in the folder list. Pressing Enter or blurring commits the name and creates the folder via `POST /:teamId/folders` with `parentId` set to the current folder (or `null` at root). Folder is optimistically inserted with a temp ID; the real ID is swapped in on server response.

### 1.11 — Play actions (action menu)

| Action | coach / owner | asst (own play) | asst (others') | player |
|---|---|---|---|---|
| Open | ✓ | ✓ | ✓ | ✓ |
| Favorite | ✓ | ✓ | ✓ | ✓ |
| Share (copy link) | ✓ | ✓ | ✓ | — |
| Duplicate | ✓ | ✓ | ✓ | — |
| Hide / Show from Players | ✓ | ✓ | — | — |
| Rename | ✓ | ✓ | — | — |
| Move to Folder | ✓ | ✓ | — | — |
| Remove from Folder | ✓ (inside a folder) | ✓ | — | — |
| Post to Community | ✓ (own plays, `community_posting` flag on) | ✓ | — | — |
| Move to Trash | ✓ | ✓ | — | — |

See `component-specs.md` PlayCard for full action matrix including `assistantPermissions` overrides.

### 1.12 — Folder actions (action menu)

| Action | coach / owner | player |
|---|---|---|
| Share (copy link) | ✓ | — |
| Rename | ✓ | — |
| Delete | ✓ | — |

Deleting a folder hard-deletes it. Plays inside the folder are moved to root via FK cascade (`folder_id` set to `NULL`).

### 1.13 — Trash view

Activated by the trash icon in the header. Replaces the play list with a flat list of soft-deleted plays. Each row shows the play title, deletion timestamp, a "Restore" button, and a "Delete Forever" button. Auto-deletion occurs after 30 days server-side.

Returning to the main view uses a "Back to Playbook" button — no URL change.

---

## 2 — Playbooks Page (`/app/playbooks`)

### 2.1 — Purpose

A read-and-copy library of curated play collections. Coaches browse sections and add individual plays (or whole sections) to their team's play list. Players can browse but cannot copy.

### 2.2 — Page header

Title: **"Playbook Library"**  
Subtitle: "Browse [sport] play collections. Add plays to your team's playbook with one click." (sport-specific based on `user.sport`; generic fallback when sport is not set)

### 2.3 — Tabs

Two tabs below the header: **Platform** and **Community**.

- **Platform** — Coachable-curated sections (`isDefault: true`). Always visible.
- **Community** — Coach-submitted sections (`isDefault: false`). **Visible only when the `community_posting` feature flag is enabled by admin.** When the flag is off, the tab is hidden entirely and the page shows Platform content only with no tab UI.

Active tab has an accent underline with a radial glow bleed upward. Inactive tab is muted text.

### 2.4 — Section grid (browse view)

Sections render as a `SectionCard` grid:

- 3 columns at `lg+`
- 2 columns at `sm–md`
- 1 column below `sm`

Each `SectionCard` shows: name, optional description (2-line clamp), play count. Clicking navigates to the section detail view at `/app/playbooks/:sectionId`.

Empty state when no sections exist for the active tab:

- Platform empty: "No playbooks yet — check back soon, collections for your sport will appear here once published."
- Community empty: "No community plays yet — plays posted to the community will appear here once published."

### 2.5 — Section detail view (`/app/playbooks/:sectionId`)

Navigating into a section swaps the browse grid for a full detail view. URL updates to `/app/playbooks/:sectionId`. The back button ("← All Playbooks") navigates to `/app/playbooks`.

**Header:**
- Section name (subheading)
- Play count (or filtered count if search/filters are active)
- "Add All to Playbook" button (coaches only, `primary` variant) — copies all plays in the section to the team via `POST /playbook-sections/:id/copy`. Button shows a spinner while copying; changes to "Added to Playbook" (success state) after. Not shown to players.

**Search + filter bar** (shown when section has plays):
- Text input: searches by title or tag
- Filter dropdown: multi-select tag filter, chips inside the panel

**Play grid:**
- Same 3/2/1 column grid as section browse
- Each play card shows: play preview animation (hover-autoplay), title, description (2-line clamp), tags
- "Add to Playbook" button per card (coaches only) — copies single play via `POST /platform-plays/:id/copy`. Toggles to "Added to Playbook" (disabled) after copy. Stays in the current state for the session — not persisted.
- Clicking a card navigates to the play viewer (`/app/plays/:id`) with a `backTo` state so the back button returns to the section.

**Empty states:**
- Section has no plays: "No plays in this section yet"
- Search returns no results: same `EmptyState` component, no CTA

### 2.6 — Copy destination

When a coach copies a play (individually or via "Add All"), the play is added to the **root of their team's play list** with no folder assignment. There is no folder picker — plays land at root and the coach can move them to a folder from the Plays page.

### 2.7 — Player experience on Playbooks page

Players see the section browse grid and can navigate into sections and view plays. The "Add to Playbook" and "Add All to Playbook" buttons are not rendered. The play viewer is read-only.

---

## 3 — Public Playbooks Pages (`/:sport/playbooks`)

One route per sport:

| Sport | Route |
|---|---|
| Rugby | `/rugby/playbooks` |
| Football | `/football/playbooks` |
| Lacrosse | `/lacrosse/playbooks` |
| Basketball | `/basketball/playbooks` |
| Soccer | `/soccer/playbooks` |
| Field Hockey | `/field-hockey/playbooks` |
| Ice Hockey | `/ice-hockey/playbooks` |
| Women's Lacrosse | `/womens-lacrosse/playbooks` |

**Content:** Platform sections for the specified sport only. Community sections are not shown on public pages regardless of the feature flag.

**Differences from authenticated Playbooks:**
- No "Add to Playbook" or "Add All to Playbook" buttons
- Play cards are display-only (no copy action)
- CTAs to sign up appear where copy buttons would be
- Unauthenticated — no `requireAuth` middleware

**Layout:** Same `SectionCard` browse grid → section detail → play grid flow as the authenticated page. Play preview animations autoplay (not hover-only) since there is no interaction cost on a public page.

---

## 4 — Post to Community flow (feature flag: `community_posting`)

When the `community_posting` flag is **on**:

- The "Post to Community" action appears on the PlayCard action menu for coaches on plays they created (`isCreatedByViewer === true`)
- Clicking opens a modal to set a title and optional bio/description for the submission
- On submit, the play is copied to the community `playbook_section` for the team's sport via `POST /:teamId/plays/:id/post-to-community`
- The Community tab becomes visible on the Playbooks page if community sections exist

When the flag is **off** (default):
- "Post to Community" is not shown anywhere
- The Community tab on the Playbooks page is hidden
- No community content is surfaced to users

The flag is toggled per-team or globally from the admin panel. See `engineering/planning/feature-flags.md` for the flag key and loading pattern.

---

## 5 — Component references

| Component | Used on |
|---|---|
| `PlayCard` | Plays page — plays grid; Playbooks section detail — play grid |
| `FolderCard` | Plays page — folder grid |
| `SectionCard` | Playbooks page — section browse grid |
| `EmptyState` | Both pages — no content states |
| `TagPill` (`filter` variant) | Plays page — tag filter chips |
| `PageShell` | Both pages — sidebar + header wrapper |

See `design/component-specs.md` for all prop APIs.
