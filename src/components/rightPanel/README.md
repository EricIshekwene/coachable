# Right Panel sections (`src/components/rightPanel/`)

This folder contains the **section components** used by the Right Panel. The main Right Panel component lives in `src/components/RightPanel.jsx` and composes these sections.

## High-level behavior

- **Fixed-width, full-height panel**: `RightPanel.jsx` (in `src/components/`) renders an `<aside>` that is `h-screen` and uses flex column layout.
- **Scrollable content + pinned footer**:
- The **main content** (play name, field settings, players list, advanced settings, all-players controls) lives inside a **scroll container**.
  - The **export actions** (“Save to Playbook”, “Download”) live in a **non-scrolling footer** at the bottom.

This is implemented by splitting the panel into:

- **Scrollable area**: `flex-1 min-h-0 overflow-y-auto overflow-x-hidden`
- **Footer**: `shrink-0` (so it never gets pushed off-screen)

You can see this in `src/components/RightPanel.jsx`.

## Data flow (where state comes from)

`RightPanel.jsx` itself is mostly a **layout/composition** component. State is owned by `src/App.jsx` and passed down as props:

- **Play name**
  - `playName` (string)
  - `onPlayNameChange(nextName)`
- **Field controls**
  - `zoomPercent`
  - `onZoomIn()`, `onZoomOut()`
  - `onZoomPercentChange(nextPercent)`
  - `onRotateLeft()`, `onRotateCenter()`, `onRotateRight()`
  - `onUndo()`, `onRedo()`, `onReset()`
- **Players list / selection**
  - `playersById` (map of player objects)
  - `representedPlayerIds` (array of ids shown in list)
  - `selectedPlayerIds` (array of selected ids)
  - `onSelectPlayer(id, { toggle })`
- **All players display**
  - `allPlayersDisplay` (object: `sizePercent`, `color`, `showNumber`, `showName`)
  - `onAllPlayersDisplayChange(nextObject)`
- **Advanced settings**
  - `advancedSettingsOpen`
  - `onOpenAdvancedSettings()`
- **Export**
  - `onSaveToPlaybook()`
  - `onDownload()`

## Section-by-section

### `PlayNameEditor.jsx`

- Inline editable title at the top (“Name”).
- Click the text (or pencil icon) to edit.
- Enforces `maxLength`.

### `FieldSettingsSection.jsx`

- Grid of icon buttons (rotate/zoom/undo/reset/redo) + editable zoom percent.
- **No tooltips/popovers** (tooltips were removed; buttons are “plain” now).

### `PlayersSection.jsx`

- Shows `Players (count)` header and a scrollable list of players (bounded height).
- Renders each row using `PlayerRow.jsx`.

### `PlayerRow.jsx`

- Single row UI for a player in the list.
- Top line: `number • name` (name truncates with `...` when long).
- Second line: assignment only (truncates).
- Right-side icons: edit/delete (callbacks are optional).

### `AdvancedSettingsButton.jsx`

- Button that triggers the advanced settings modal/panel via `onOpen`.

### `AllPlayersSection.jsx`

Controls that apply to **all players** (defaults / display preferences):

- **Size slider**: uses MUI `Slider` styled to match the ControlPill slider theme.
- **Color**: hex display + color picker popover (`Popover` + `ColorPickerPopover`).
- **Show Number / Show Name**: checkbox toggles.

### `ExportActions.jsx`

- The bottom “export” buttons.
- Includes its own vertical spacing (`gap-*`) so it still looks correct when pinned inside the footer wrapper.

## Common layout gotchas

- **Pinned footer requires `min-h-0` on the scroll area**:
  - Without `min-h-0`, the scroll container may not shrink and the footer can get pushed off-screen.
- **Horizontal scroll prevention**:
  - The scroll container uses `overflow-x-hidden` so controls like sliders don’t create sideways scrolling.
