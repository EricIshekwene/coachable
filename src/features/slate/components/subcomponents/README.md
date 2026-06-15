# Subcomponents (`src/components/subcomponents/`)

Shared UI primitives used across multiple panels and sections.

## Files

### `Buttons.jsx`

Reusable button components:

| Export | Used By | Description |
|--------|---------|-------------|
| `SidebarChevronButton` | Sidebar sections | Icon button with chevron dropdown trigger |
| `WideSidebarRowButton` | Wide sidebar sections | Row button with icon + label + optional chevron |
| `Button` | HistoryActionsSection | Simple square icon button |
| `PanelButton` | FieldSettingsSection | Wider aspect-ratio icon button for right panel |
| `PlayerButton` | SidebarRoot, WideSidebarRoot | Player list row with color, number, name, edit/delete |

### `Popovers.jsx`

Popover and tooltip primitives:

| Export | Used By | Description |
|--------|---------|-------------|
| `Popover` | Multiple sections | Portal-rendered popover with anchor positioning, Escape/click-outside close |
| `PopoverGrid` | Color picker, tool popovers | Grid layout wrapper (configurable columns) |
| `PopoverForm` | AddPlayerSection | Form layout wrapper |
| `Tooltip` | Sidebar sections | Hover tooltip beside an element |

### `ColorPickerPopover.jsx`

Color picker using `react-color` (SketchPicker) inside a `Popover`. Used for player color and pitch color selection.

### `PrefabsPopover.jsx`

Popover for selecting formation prefabs. Shows a grid of preset formations.
