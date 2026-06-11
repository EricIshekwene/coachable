# Admin Play Card Consistency

## What Was Implemented

The `PlayCard` component (the standard animated-preview card used in the Plays tab of `/admin/app`) is now used consistently throughout every play-display surface in the admin app. Before this change, the Playbook Sections tab rendered each section play as a compact horizontal list row with a static thumbnail image — a one-off implementation that diverged from the card design used everywhere else.

### Changes

**`src/pages/AdminPlaysPage.jsx`**

1. **`PlayCard` — new props**
   - `canRemoveFromSection` (bool, default `false`) — when true, shows a **Remove from Section** option in the three-dots menu (danger-styled, consistent with Delete).
   - `onRemoveFromSection` (fn) — called with the play object when the option is selected.
   - `hasSecondaryActions` now includes `canRemoveFromSection`, so the three-dots button appears for section-panel cards even when no other secondary actions are enabled.
   - The danger-zone divider at the bottom of the main popup now triggers on `canDelete || canRemoveFromSection`.

2. **`PlaybookSectionPanel` — hooks**
   - Calls `useAdmin()` to read `basePath`, `isOwner`, and `hasPerm` directly, deriving `canEditSectionPlays` and `canCopySectionLinks` without threading extra props from the parent.
   - Calls `useNavigate()` to navigate to the play editor when the Edit action is used.

3. **`PlaybookSectionPanel` — `enrichedSectionPlays`**
   - `allPlaysById` (memoised) builds an ID→play index over the `allPlays` prop.
   - `enrichedSectionPlays` merges each section play (which only carries metadata + a static thumbnail URL from the server) with its matching full entry from `allPlays`, supplying the `playData` field that `PlayPreviewCard` needs to render the animated field.
   - Plays with no match in `allPlays` (e.g., from a folder the current actor cannot see) remain unchanged; `PlayPreviewCard` shows "No preview available" gracefully.

4. **`PlaybookSectionPanel` — plays list → card grid**
   - The `space-y-2` horizontal list is replaced with a `grid grid-cols-1 sm:grid-cols-2` card grid.
   - Each grid cell is a draggable wrapper (same pattern as the Plays tab) that delegates drag events for reordering; `sectionDragSrcId`/`sectionDragOverId` state is unchanged.
   - Each cell renders a `PlayCard` configured for the section context:
     - `canEdit` — if the actor has `plays.editContent` permission
     - `canCopyShareLinks` — if the actor has `plays.copyShareLinks` permission
     - `canRemoveFromSection` — if the actor has `playbooks.addPlays` permission (same gate as before)
     - All folder/duplicate/tag/rename/delete actions are disabled (`false`) since they don't apply inside the section panel

## How It Works

The `PlayCard` component renders an animated live `PlayPreviewCard` preview on hover, a title row, a tags row, a footer with relative timestamp and an Edit button, and a three-dots menu for secondary actions. By using this component consistently, every place in the admin where plays are displayed behaves the same way. The three-dots menu is context-sensitive: in the Plays tab it shows copy-link, duplicate, rename, move-to-folder, add-to-section, edit-tags, and delete; in the Playbook Sections tab it shows only copy-link (if permitted) and remove-from-section.

## Key Decisions

- **Enrichment over server change**: Rather than modifying the `/admin/playbook-sections/:id/plays` route to return full `playData` (which would significantly increase response size), section plays are enriched client-side against the `allPlays` array that the page already holds in memory.
- **2-column grid in the section detail panel**: The panel detail area (flex-1 in a max-w-6xl layout) comfortably fits two cards side-by-side. Three columns would be cramped at typical screen widths given the fixed-width section list sidebar.
- **Permissions derived from `useAdmin`**: Calling `useAdmin()` inside `PlaybookSectionPanel` keeps the component's prop surface small and avoids redundant prop threading from the parent.
