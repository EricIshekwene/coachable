# Pre-Launch Test Checklist

## I. Authentication & Onboarding

- [ ] Sign up with valid email/password + sport selection
- [ ] Sign up with duplicate email (should error)
- [ ] Sign up with invalid email format (should error)
- [ ] Email verification flow (verify email page + resend code)
- [ ] Login with correct credentials
- [ ] Login with wrong password (error message)
- [ ] Forgot password → email sends → reset link works
- [ ] Reset password with expired/invalid token
- [ ] Onboarding flow completes and redirects correctly
- [ ] Sport picker page redirects to `/slate/:sport`
- [ ] Session persists after page refresh
- [ ] Logout clears session and redirects to landing
- [ ] Visiting `/onboarding` while already onboarded redirects to `/app/plays`
- [ ] Incomplete onboarding (left page) — returning user is sent back to `/onboarding` on login

---

## II. Plays List & Navigation

- [ ] Plays list loads all team plays
- [ ] Grid/list view toggle works
- [ ] Search by play name filters correctly
- [ ] Filter by tag narrows results
- [ ] Clicking a play opens view page (player) or edit page (coach)
- [ ] Create new play (coach on desktop) opens editor
- [ ] Duplicate play creates copy with "(Copy)" name
- [ ] Delete play moves to Trash folder
- [ ] Restore play from Trash
- [ ] Star/favorite a play toggles indicator
- [ ] Tag a play with custom label; tag appears in filter
- [ ] Share play generates link
- [ ] Copy link to clipboard works (fallback if no clipboard API)
- [ ] Drag play into a folder
- [ ] Breadcrumb trail updates during folder navigation
- [ ] Bulk select with Ctrl+A selects all visible plays
- [ ] Bulk delete, bulk move to folder

---

## III. Folder Management

- [ ] Create new folder
- [ ] Rename folder
- [ ] Delete folder (confirmation dialog appears)
- [ ] Delete folder with plays inside (warns and handles plays)
- [ ] Move play between folders via drag-and-drop
- [ ] Move play via context menu
- [ ] Nested folder navigation (breadcrumbs)

---

## IV. Canvas — Core Interactions

- [ ] Canvas loads with correct field image
- [ ] Mousewheel zooms in/out (0.2x – 4x range)
- [ ] Middle-mouse drag pans canvas
- [ ] Hand tool ('h' key) pans on left-mouse drag
- [ ] Field rotates 90° left/right via field settings buttons
- [ ] Rotate center (reset) returns to 0°
- [ ] Zoom input field accepts typed percentage
- [ ] Canvas resets properly with Reset button

---

## V. Drawing Tools

### Select Tool
- [ ] Click selects a single item
- [ ] Click empty area deselects all
- [ ] Shift+click adds/removes item from selection
- [ ] Marquee drag selects multiple items
- [ ] Shift+marquee adds to existing selection
- [ ] Selected items show selection handles

### Draw (Freehand) Tool
- [ ] Draw a stroke on canvas
- [ ] Stroke color, width, opacity controls update the drawn stroke
- [ ] Stroke stabilization slider affects smoothness
- [ ] Stroke appears in animation keyframe

### Arrow Tool
- [ ] Drag to create arrow
- [ ] Arrow head type changes (standard, thin, wide, chevron, none)
- [ ] Arrow tip toggle works

### Shape Tool
- [ ] Draw rectangle, triangle, circle/ellipse
- [ ] Fill color (including transparent)
- [ ] Stroke color and width

### Text Tool
- [ ] Click to place text
- [ ] Font size selector works (presets + custom)
- [ ] Text alignment: left, center, right
- [ ] Text color picker works

### Erase Tool
- [ ] Erase strokes/drawings
- [ ] Eraser size control works

### Drawing Selection & Transform
- [ ] Select drawing → resize handles appear
- [ ] Drag resize handle resizes drawing
- [ ] Rotate handle rotates drawing
- [ ] Multi-select drawings and move as group
- [ ] Delete selected drawing with Ctrl+D or Delete key

---

## VI. Players & Objects

### Add Player
- [ ] Add player via sidebar form (number, name, color)
- [ ] Player name autocomplete works
- [ ] Player appears on canvas at default position
- [ ] 'a' key activates add player mode
- [ ] Adding player with no number/name works (optional fields)

### Player on Canvas
- [ ] Drag player to new position
- [ ] Snapping guidelines appear (orange dashes) when near snap points
- [ ] Snap to field center, canvas center, other players
- [ ] Player position updates in PlayerTransformSection X/Y inputs

### Player Edit (Right Panel)
- [ ] Click player in list to select
- [ ] Edit player number/name inline
- [ ] Change player color via picker
- [ ] Delete player from right panel
- [ ] Delete player from canvas (Ctrl+D)

### Bulk Player Actions
- [ ] Multi-select players (marquee or Shift+click)
- [ ] Bulk color change for selected players
- [ ] Move group of selected players together

### Ball & Cone
- [ ] Add ball to canvas
- [ ] Add cone to canvas
- [ ] Drag ball/cone to new position
- [ ] Delete ball/cone
- [ ] Ball size setting (10–400%) updates size on canvas
- [ ] Cone size setting updates size on canvas

---

## VII. Animation & Keyframes

### Keyframe Creation & Timeline
- [ ] Scrub timeline to desired time, click "Add Keyframe"
- [ ] Keyframe marker appears on timeline at correct position
- [ ] Cannot place keyframe < 500ms from adjacent keyframe (clamped)
- [ ] Drag keyframe marker to new time position
- [ ] Keyframe marker stays within duration bounds
- [ ] Delete selected keyframe button removes it
- [ ] Timeline shows keyframes from ALL tracks (not just selected players)

### Playback
- [ ] Play button starts animation
- [ ] Pause stops at current time
- [ ] Skip backward jumps to previous keyframe (or start)
- [ ] Skip forward jumps to next keyframe (or end)
- [ ] Speed slider adjusts playback speed (1–100%)
- [ ] Animation loops back to start after reaching end
- [ ] Autoplay toggle in Advanced Settings works

### Animation Interpolation
- [ ] Player moves smoothly between keyframes during playback
- [ ] Ball moves smoothly between keyframes
- [ ] Player directions/angles interpolate correctly
- [ ] Scrubbing (dragging timeline) shows correct interpolated positions

### Delete All Keyframes
- [ ] "Delete All Keyframes" button in Advanced Settings shows confirmation
- [ ] Confirming clears all keyframe data

---

## VIII. Undo / Redo

- [ ] Ctrl+Z undoes last action (add player, move, draw)
- [ ] Ctrl+Y redoes undone action
- [ ] Undo/redo buttons in sidebar work
- [ ] Undo stack capped at 100 states (no crash with heavy use)
- [ ] Reset button clears entire slate

---

## IX. Prefabs

### Built-in Rugby Prefabs
- [ ] Lineout offense (3–7 player variants) places correctly
- [ ] Scrum offense (3 or 8 players) places correctly
- [ ] Kickoff offense (Goal Line, 22, 50) places correctly
- [ ] Lineout defense (5–8 players) places correctly
- [ ] Scrum defense (3 or 8 players) places correctly
- [ ] Kickoff defense places correctly

### Custom Prefabs
- [ ] Select players on canvas + save as custom prefab
- [ ] Prefab name input works
- [ ] Custom prefab appears in prefabs sidebar
- [ ] Place custom prefab on canvas (formation preserved)
- [ ] Delete custom prefab
- [ ] Custom prefabs persist after page refresh (localStorage)

---

## X. Import / Export

### Import
- [ ] Open JSON play file via file picker
- [ ] Drag-drop JSON file onto canvas
- [ ] Valid `play-export-v2` imports correctly (players, animation, settings)
- [ ] Raw animation JSON imports correctly
- [ ] File > 5MB shows error
- [ ] Invalid/corrupt JSON shows validation error message

### Export — Photo
- [ ] Export as PNG captures current canvas frame
- [ ] Region selector allows custom crop area
- [ ] Screenshot confirmation bar appears before download
- [ ] Downloaded PNG is correct

### Export — Video
- [ ] Export modal opens with quality options
- [ ] Standard / High / Ultra presets change bitrate/FPS display
- [ ] Duration slider (5–60s) works
- [ ] Video exports as MP4 in Chrome/Edge
- [ ] Video exports (WebM/MP4 fallback) on Safari/iOS
- [ ] Exported video plays correctly and contains animation

### Save to Playbook
- [ ] Save to Playbook modal opens
- [ ] Play name input pre-filled
- [ ] Notes field works
- [ ] Folder navigation in modal works
- [ ] Create new folder from modal works
- [ ] Save creates play in selected folder
- [ ] Update (overwrite) existing play works

---

## XI. Recording Mode

- [ ] Toggle recording mode on in right panel
- [ ] ControlPill replaced with RecordingControlBar when toggled
- [ ] Players section replaced with RecordingPlayerList
- [ ] Select a player to record in RecordingPlayerList
- [ ] Start recording → 3-2-1 countdown shows
- [ ] After countdown, recording begins (pulsing REC indicator)
- [ ] Drag player during recording → movement captured
- [ ] Pause recording pauses capture
- [ ] Resume recording continues from paused state
- [ ] Stop recording saves track
- [ ] Preview plays all recorded tracks together
- [ ] Cancel recording restores pre-recording state
- [ ] Re-record individual player clears and re-captures
- [ ] Clear all recordings resets all tracks
- [ ] Clear single player recording clears only that player

---

## XII. Sharing & Collaboration

- [ ] Generate share link for a play
- [ ] Open share link while logged out (guest view)
- [ ] Guest can play/pause/seek the animation
- [ ] Guest sees play title, creator, tags, description
- [ ] "Add to Playbook" button appears for guests; prompts login
- [ ] Logged-in user can add shared play to their playbook
- [ ] Shared folder page lists multiple plays
- [ ] Theme toggle (light/dark) works on shared view

---

## XIII. Team & User Management

### Team Page
- [ ] Team name and code displayed correctly
- [ ] Member list loads with names and roles
- [ ] Invite by email sends invite
- [ ] Invalid email shows error
- [ ] Coach code generates, copies to clipboard
- [ ] Player code generates, copies to clipboard
- [ ] Rotate code generates a new code
- [ ] Remove member shows confirmation, then removes

### Profile Page
- [ ] Edit name → save confirmation
- [ ] Edit email → verification sent
- [ ] Role displayed correctly (owner / coach / player)
- [ ] Transfer ownership: select member → confirm → role changes
- [ ] Logout button works

### Settings Page
- [ ] Dark / Light / System theme toggles apply correctly
- [ ] Sport preference saves
- [ ] Notifications toggle saves
- [ ] Player view mode: toggle on → coach UI hides
- [ ] Exit player view banner appears and exits correctly
- [ ] Invite code sections: copy, generate new

---

## XXI. Multi-Team & Team Switching

### Team Switcher (Sidebar)
- [ ] Team name badge is clickable and opens dropdown
- [ ] Dropdown lists all teams the user belongs to
- [ ] Active team has checkmark
- [ ] Each team shows the user's role on that team
- [ ] Personal workspace shows "solo" role label
- [ ] Clicking a different team switches context and navigates to `/app/plays`
- [ ] After switch: sidebar role label updates to role on new team
- [ ] After switch: player view mode is reset to off
- [ ] "Join a Team" option opens join form in dropdown
- [ ] "Create a Team" option opens create form in dropdown
- [ ] "Create Personal Workspace" only shows if user has no personal workspace
- [ ] Clicking outside dropdown closes it

### Join Team (Post-Onboarding)
- [ ] Enter valid player invite code → joins as player, switches to that team
- [ ] Enter valid coach invite code → joins as coach, switches to that team
- [ ] Enter invalid code → shows error message
- [ ] Enter code for a team already a member of → shows "already a member" error
- [ ] After joining: new team appears in switcher list

### Create Team (Post-Onboarding)
- [ ] Any role (including player) can create a new team
- [ ] Creates team, user becomes owner of new team, switches to it
- [ ] New team appears in switcher list with "Owner" label
- [ ] Team name under 2 characters shows validation error
- [ ] Sport field is optional

### Create Personal Workspace (Post-Onboarding)
- [ ] Creates personal workspace, switches to it
- [ ] Calling again (already has personal workspace) returns existing one, switches to it
- [ ] Personal workspace shows "Solo Mode" label in sidebar

### Leave Team — Player
- [ ] Leave button appears in Settings → Danger Zone for players
- [ ] Confirmation dialog appears before leaving
- [ ] After leaving: player is removed from team, switches to next available team
- [ ] If last team: personal workspace auto-created and switched to
- [ ] Plays remain with the team after player leaves

### Leave Team — Assistant Coach
- [ ] Same leave flow as player (free to leave, no blockers)
- [ ] Plays created by assistant coach remain with the team
- [ ] After leaving: auto-switches to next team or creates personal workspace

### Leave Team — Coach (non-owner)
- [ ] Same leave flow as player (free to leave, no blockers)
- [ ] After leaving: auto-switches or creates personal workspace

### Leave Team — Owner with Other Members
- [ ] "Leave" button is disabled / shows informational message
- [ ] Message says: "Transfer ownership before leaving"
- [ ] Link takes user to Profile page where transfer happens
- [ ] After transferring ownership, role becomes Coach → can now leave normally

### Leave Team — Owner as Sole Member (Delete Team)
- [ ] Danger Zone shows "Delete [Team Name]" instead of "Leave"
- [ ] Warning text says all plays will be permanently deleted
- [ ] Confirmation dialog shows before delete
- [ ] After confirming: team deleted (all plays cascade deleted)
- [ ] Auto-creates personal workspace if no other teams
- [ ] Navigates to /app/plays after deletion

### Delete Personal Workspace
- [ ] "Delete Personal Workspace" button shown in Settings when on personal workspace
- [ ] Warning text mentions play deletion
- [ ] After confirming: workspace and plays deleted
- [ ] Switches to another real team if user has one, otherwise shows NoTeam page

### No Team Safety Net
- [ ] `/no-team` page renders for onboarded users with no teams
- [ ] Three options: Join a Team, Create a Team, Just Make Plays
- [ ] Each option works and redirects to `/app/plays` after success
- [ ] Visiting `/no-team` while having teams redirects to `/app/plays`

### Role-Specific UI After Team Switch
- [ ] Switching to a team where user is "player" → hides coach UI (create plays, invite codes)
- [ ] Switching to a team where user is "owner" → shows full coach + owner UI
- [ ] Switching to a team where user is "coach" → shows coach UI, hides owner-only controls
- [ ] Switching to personal workspace → hides team management UI entirely
- [ ] Notifications section in Settings adapts to role on newly switched team

### Session Persistence
- [ ] Active team persists across page refresh (stored server-side via active_team_id)
- [ ] Active team persists across logout/login
- [ ] User who joined multiple teams sees all of them after re-login

---

## XIV. Advanced Settings

- [ ] Pitch Settings: field type changes field image (Rugby, Soccer, Football, Lacrosse, Basketball)
- [ ] Show markings toggle shows/hides field lines
- [ ] Field opacity slider adjusts correctly
- [ ] Pitch color presets and custom hex update field color
- [ ] Default player size slider resizes new players
- [ ] Ball size and cone size sliders update objects on canvas
- [ ] Export video quality preset selector updates bitrate/FPS values
- [ ] Logger: all debug toggles enable/disable logging
- [ ] Logger: "Copy logs to clipboard" works

---

## XV. Keyboard Shortcuts

- [ ] 's' → select tool
- [ ] 'h' → hand/pan tool
- [ ] 'p' → pen/draw tool
- [ ] 'a' → add player tool
- [ ] 'c' → toggle player color (red ↔ blue)
- [ ] Ctrl+Z → undo
- [ ] Ctrl+Y → redo
- [ ] Ctrl+D → delete selected item(s)
- [ ] Escape → deselect / cancel current action

---

## XVI. View-Only Mode

- [ ] Player role sees view-only page for all plays
- [ ] No sidebar editing tools shown
- [ ] Play/pause, seek, speed controls work
- [ ] Canvas is not editable (no drag, no draw)
- [ ] Fullscreen button works
- [ ] Exit button returns to plays list

---

## XVII. Mobile / Responsive

- [ ] Landing page renders correctly on mobile
- [ ] Plays list renders on mobile (bottom nav visible)
- [ ] Opening play on mobile shows view-only mode (MobileViewOnlyGate)
- [ ] Playback controls are touch-friendly
- [ ] Sidebar/right panel hidden on small screens
- [ ] Touch pan/zoom on canvas works

---

## XVIII. Error Handling & Edge Cases

- [ ] Network error during save shows toast notification
- [ ] Network error during load shows error state
- [ ] Deleting a player that has keyframes removes their animation track
- [ ] Undo after import restores pre-import state
- [ ] Placing a prefab when canvas is at non-default zoom/rotation
- [ ] Exporting video on a play with 0 keyframes
- [ ] Adding 50+ players doesn't crash
- [ ] Drawing 100+ strokes doesn't crash
- [ ] Rapid undo/redo (holding keys) doesn't corrupt state
- [ ] Closing/reopening editor retains unsaved state warning
- [ ] 404 page renders for invalid routes

---

## XIX. Admin (Internal)

- [ ] Admin login with correct password grants access
- [ ] Admin login with wrong password shows error
- [ ] Platform plays: create, edit, duplicate, delete
- [ ] Admin folder management: create, delete, move
- [ ] Bulk delete/move on admin plays page
- [ ] Admin play editor: all tools work same as user editor
- [ ] Admin Tests page runs test suites and shows results
- [ ] Admin Errors page loads and displays logged errors

---

## XX. Performance & Polish

- [ ] No console errors on initial load
- [ ] No memory leaks during long animation playback (check via dev tools)
- [ ] Large plays (20+ players, 10+ keyframes) load and play without lag
- [ ] Video export completes without freezing the tab
- [ ] Canvas FPS stays smooth during playback
- [ ] Toast notifications auto-dismiss
- [ ] All modals close on Escape key or click-outside
- [ ] All scrollable containers scroll correctly on long content
