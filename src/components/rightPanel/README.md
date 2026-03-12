# Right Panel sections (`src/components/rightPanel/`)

This folder contains the **section components** used by the Right Panel. The main Right Panel component lives in `src/components/RightPanel.jsx` and composes these sections.

## Layout

- **Fixed-width, full-height panel** with flex column layout.
- **Scrollable content** (play name, field settings, players, advanced settings) + **pinned footer** (export actions).

## Data Flow

`RightPanel.jsx` is a layout/composition component. State is owned by hooks in `src/features/slate/` and passed down as props from `Slate.jsx`.

## Sections

### `PlayNameEditor.jsx`
Inline editable title at the top. Click text or pencil icon to edit.

### `FieldSettingsSection.jsx`
Grid of icon buttons (rotate/zoom/undo/reset/redo) + editable zoom percent.

### `PlayersSection.jsx`
Shows `Players (count)` header and a scrollable list using `PlayerRow.jsx`.

### `PlayerRow.jsx`
Single row: `number . name` (truncated), assignment line, edit/delete icons.

### `SelectedPlayersSection.jsx`
Shows details/controls for currently selected players.

### `PlayerEditPanel.jsx`
Inline editor for a single player's number, name, and assignment.

### `AllPlayersSection.jsx`
Controls for all players: size slider, color picker, show number/name toggles.

### `AdvancedSettingsButton.jsx`
Button that opens the advanced settings modal.

### `SavePrefabButton.jsx`
Button to save current frame as prefab (not yet wired).

### `ExportActions.jsx`
Bottom export buttons (Download, Import). Pinned in footer.

## Layout Notes

- `min-h-0` on the scroll area is required for the pinned footer to work.
- `overflow-x-hidden` prevents slider controls from causing horizontal scroll.
