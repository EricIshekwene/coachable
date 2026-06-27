# Plays Page Design Spec

**Route:** `/app/plays` (root) · `/app/plays/folders/:id` (inside folder) · `/app/plays/trash`  
**Status:** Authoritative spec for v2. No open decisions.  
**Depends on:** `design/component-specs.md` (PlayCard, FolderCard, EmptyState, TagPill), `engineering/planning/permissions.md`, `design/general-formatting-standards.md`, `design/mobile/mobile-formatting-standards.md`

---

## Overview

The plays page is the core of Coachable — the first screen every coach sees after login. It lists all team plays and folders, with search, tag filtering, sort, bulk operations, and drag-to-folder on desktop. In v2 it is largely faithful to v1 in layout and interaction, with two additions: a list/grid toggle and route-based folder navigation.

---

## Layout toggle — grid vs list

The page offers two view modes. Default is grid. The user's choice persists in `localStorage` as `plays_view_mode`.

**Toggle placement:** Two icon buttons (grid icon / list icon) immediately left of the sort dropdown, right-aligned above the plays section.

### Grid view

Responsive grid identical to v1:

| Breakpoint | Columns |
|---|---|
| `< sm` (< 640px) | 1 |
| `sm–lg` (640–1024px) | 2 |
| `lg+` (> 1024px) | 3 |

Each cell renders a `<PlayCard>`. Thumbnails are the primary visual identifier.

### List view

Each play renders as a wide horizontal card — the play preview/thumbnail is the focal point on the left, with metadata on the right.

**Card anatomy:**

```
┌─────────────────────────────────────────────────────────────┐
│  [Play preview — large, ~45% of card width]  │  Title       │
│                                               │  Sport badge │
│                                               │  Tags        │
│                                               │  Timestamp   │
│                                               │       [⋯]   │
└─────────────────────────────────────────────────────────────┘
```

- Left panel: play preview at full height of card, same `PlayPreviewCard` as grid, `autoplay="hover"`, `shape="landscape"`, `background="field"`. Min height 120px.
- Right panel: title (`body-strong`), `SportBadge`, `TagPill` chips (`display` variant), relative timestamp (`caption`, `var(--ui-text-subtle)`), kebab top-right.
- Card border, hover, selected (bulk), and hidden-from-players states identical to grid `PlayCard`.
- On mobile (< 640px): list view collapses to single column. Right panel stacks below the preview (same as grid card bottom section) — the "large preview + right panel" side-by-side layout requires ≥ 640px.

---

## Page structure (top to bottom)

### 1 — Page header

**Left side:**
- Page title: `"Playbook"` at root; folder name when inside a folder. Typography: `heading` (Manrope 700).
- Subtitle: `"{N} plays · {N} folders"` at root; `"{N} plays in folder"` inside a folder. Typography: `body`, `var(--ui-text-subtle)`.
- Breadcrumbs (inside folder only): `All Plays › [parent folder] › [current folder]`. Each ancestor is a link back to its route. Current level is plain text.

**Right side (left to right, coaches only):**

| Button | Icon | Visibility |
|---|---|---|
| Bulk select toggle | checkbox icon | `canBulkEdit` only (owner, coach) |
| Bulk cancel | × + "Cancel" | Only when bulk mode is active |
| Trash | trash icon | `canViewTrash` (owner, coach, assistant) |
| New Folder | folder + "New Folder" | `canManageFolders`, max 4 folder levels deep |
| New Play | + "New Play" | `canCreatePlay`, **desktop only** (hidden on mobile) |

"New Play" navigates to `/app/plays/new`.  
"New Folder" triggers inline folder creation in the folders grid (see Folders section).  
"Trash" navigates to `/app/plays/trash`.

---

### 2 — Search bar

Full-width `Input` (`type="search"`) below the header. Placeholder: `"Search plays by name, tags, or notes..."`. Max length 200.

- Searches: `play.title`, `play.tags[]`, `play.notes`
- Results update as the user types (no debounce required at this scale)
- A × clear button appears inside the right edge when the field has a value
- When searching, the Recently Edited strip and folder section are hidden; only matching plays and matching folder names are shown
- Folder name matches surface the folder card, not its plays

---

### 3 — Tag filter chips

Rendered below the search bar. Only visible when the team has at least one tagged play.

- One `TagPill` (`variant="filter"`) per unique tag across all plays, sorted alphabetically
- Only one tag active at a time — clicking an active chip deactivates it
- When a tag is active, a "Clear filter" text button appears after the chips
- Tag filter and search compose: active tag filters the search results (AND, not OR)

---

### 4 — Bulk action bar

Rendered below the tag chips. Only visible when bulk mode is active **and** at least one play is selected.

```
[ {N} selected ]  ──────────────────  [ Move ] [ Tag ] [ Delete ]
```

- **Move:** opens "Move to folder" `Modal` (`size="sm"`) listing all team folders
- **Tag:** opens "Add tag" `Modal` (`size="sm"`) with a text input + existing tag suggestions
- **Delete:** sends selected plays to trash immediately (optimistic), shows success toast

Exiting bulk mode (via Cancel button or after a bulk action completes) clears all selections.

---

### 5 — Recently Edited strip

Rendered below the bulk action bar (or tag chips if bulk bar is not shown). **Only visible at root when not searching.**

Top-5 plays sorted by `updatedAt` descending. Horizontal scroll row (`overflow-x: auto`, `hide-scroll`). Each item:

- Clock icon + play title (truncated, max 160px) + relative timestamp
- Clicking navigates to the play (edit route for coaches, view route for players/playerViewMode)

---

### 6 — Folders section

Only rendered when at least one folder exists **or** new folder creation mode is active.

**Section header:** `"FOLDERS"` — `caption` typography, `var(--ui-text-subtle)`, uppercase, wide letter-spacing.

**Grid:** same responsive columns as the play grid (1 / 2 / 3). Each cell renders a `<FolderCard>`.

**Drag-drop target:** When a play is being dragged, folder cards show a drop-target state (orange border + "Drop Here" badge). Dropping moves the play into that folder via `PATCH /api/plays/:id`.

**Inline folder creation:** When "New Folder" is clicked, an editable folder card appears at the end of the grid. It shows a focused `<input>` for the folder name. Blur or Enter commits; Escape cancels. Max folder depth is 4 levels — the "New Folder" button is hidden when the current depth is ≥ 4.

**Clicking a folder** navigates to `/app/plays/folders/:id`.

---

### 7 — Plays section

**Section header row:**
- Left: `"PLAYS"` label (`caption` typography, uppercase) — hidden when inside a folder (the breadcrumb already names the context)
- Right: grid/list toggle icons + sort `<Select>` (`size="sm"`)

**Sort options:**

| Value | Label |
|---|---|
| `updated` (default) | Recently Updated |
| `created` | Recently Created |
| `az` | Name A → Z |
| `za` | Name Z → A |

**Plays grid/list:** Renders `<PlayCard>` (grid mode) or list cards (list mode) for all `sortedVisiblePlays`.

- In bulk mode, clicking a card toggles its selection — the card does not navigate
- On desktop, play cards are draggable (`cursor: grab`). Dragging onto a folder card moves the play
- `isCreatedByViewer` is computed at the call site: `play.createdByUserId === viewer.id`

---

## Empty states

| Condition | Icon | Heading | Body | CTA |
|---|---|---|---|---|
| Root, no plays, coach | play icon | "No plays yet" | "Create your first play to get started." | "New Play" → `/app/plays/new` |
| Root, no plays, player | play icon | "No plays yet" | "Your coach hasn't added any plays yet." | none |
| Inside folder, no plays | play icon | "No plays in this folder" | "Drag plays here or use the menu to move them." | none |
| Search, no results | search icon | "No results found" | "No plays match "{query}"." | none |

All empty states use `<EmptyState>` with a `--icon-lg` Feather icon.

---

## Trash view — `/app/plays/trash`

Separate route. Full-page view, same `PageShell` as the main plays page.

**Header:** "Trash" title + `"{N} deleted plays · auto-deleted after 30 days"` subtitle + "Back to Playbook" link (navigates to `/app/plays`).

**List:** One row per trashed play. Each row:
- Title (truncated) + "Deleted {relative time}" in `caption`
- "Restore" button → moves play back to the active list (optimistic, `PUT /api/plays/:id/restore`)
- "Delete Forever" button → permanently deletes after confirmation (no Modal — a single click with a destructive-variant button is sufficient since the user is already in the trash view)

**Empty state:** trash icon, "Trash is empty", "Deleted plays will appear here for 30 days."

Trash is accessible to all roles with `canViewTrash` (owner, coach, assistant).

---

## Modals

### Move to folder
Triggered from PlayCard action menu ("Move to Folder") and bulk action bar ("Move").  
`Modal` `size="sm"`, title "Move to folder" (single) or "Move {N} plays to folder" (bulk).  
Lists all team folders. The folder the play already lives in is disabled with "Already in folder" label.

### Add tag (bulk)
`Modal` `size="sm"`, title "Add tag to {N} plays".  
Text `Input` (autofocus) + existing tag suggestion chips below. Enter or button submits.

### Post to Community
`Modal` `size="sm"`, title "Post to Community".  
Body: "This play will be added to the community playbook for your sport."  
Fields: title `Input` (pre-filled with play title) + optional description `Textarea`.  
Submit button navigates text: "Post" → spinner + "Posting…" while in flight.

### Copy link fallback
`Modal` `size="sm"`, title "Copy this link".  
Read-only `Input` with the share URL, auto-selects on focus.  
Only shown when `navigator.clipboard.writeText` throws (browser blocked clipboard access).

---

## Role differences summary

| Feature | owner | coach | assistant | player |
|---|---|---|---|---|
| See play list | ✓ | ✓ | ✓ | ✓ (hidden plays excluded) |
| New Play button | ✓ | ✓ | `canCreatePlay` | — |
| New Folder button | ✓ | ✓ | ✓ | — |
| Trash button | ✓ | ✓ | ✓ | — |
| Bulk select | ✓ | ✓ | — | — |
| Drag-to-folder | ✓ | ✓ | ✓ | — |
| PlayCard kebab | ✓ | ✓ | ✓ | ✓ (favorite only) |
| Recently Edited | ✓ | ✓ | ✓ | ✓ |

In `playerViewMode`, a coach sees the player column above.

---

## Mobile notes

- "New Play" button is hidden on mobile (`< md` breakpoint) — play creation is desktop-only
- List view collapses to single-column (preview above, metadata below) on mobile
- Drag-to-folder is desktop-only — on mobile, moves happen via "Move to Folder" in the PlayCard action menu
- Bulk select is hidden on mobile (not rendered)
- Tag filter chips wrap onto multiple lines as needed (no horizontal scroll)
- Bottom tab bar is part of `PageShell` — this page does not render its own nav

---

## Cross-references

**Referenced by:**
- `engineering/planning/routing.md` — `/app/plays`, `/app/plays/folders/:id`, `/app/plays/trash` routes
- `design/component-specs.md` — PlayCard, FolderCard, EmptyState, TagPill

**References:**
- `design/component-specs.md §PlayCard` — action matrix, visual states, bulk selection
- `engineering/planning/permissions.md` — `canBulkEdit`, `canCreatePlay`, `canManageFolders`, `canViewTrash`
- `design/general-formatting-standards.md` — spacing grid, typography scale, motion budget
- `design/mobile/mobile-formatting-standards.md` — touch targets, single-column, bottom sheet
