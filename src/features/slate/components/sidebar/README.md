# Sidebar Sections (`src/components/sidebar/`)

This folder contains the sidebar section subcomponents shared by the wide sidebar layout.

The app mounts **WideSidebar** (`src/components/WideSidebar.jsx` / `src/components/wideSidebar/`), which reuses these section components with `wide={true}` to show icon + tool name in a row.

## Structure

```
sidebar/
├── README.md                 # This file
├── SidebarRoot.jsx           # Layout, state, callbacks
├── SelectToolSection.jsx     # Select/Hand (supports wide prop)
├── PenToolSection.jsx        # Pen/Arrow (supports wide prop)
├── EraserToolSection.jsx     # Eraser (supports wide prop)
├── AddPlayerSection.jsx      # Add Player (supports wide prop)
├── PlayerColorSection.jsx    # Player color (supports wide prop, exports PLAYER_COLORS)
├── PrefabsSection.jsx        # Prefabs (supports wide prop)
└── HistoryActionsSection.jsx # Undo, Redo, Reset (supports wide prop)
```

## Callbacks (state sent up)

All callbacks are optional.

| Callback | When called |
|----------|-------------|
| `onToolChange(tool)` | Current tool: `"select"` \| `"hand"` \| `"pen"` \| `"eraser"` \| `"addPlayer"` \| `"player"` \| `"prefab"` |
| `onSelectSubTool?(subTool)` | User picks Select or Hand in the select popover |
| `onPenSubTool?(subTool)` | User picks Pen or Arrow in the pen popover |
| `onEraserSubTool?(subTool)` | User picks Full or Partial in the eraser popover |
| `onPlayerColorChange?(hex)` | User picks a color in the player-color popover |
| `onUndo?()` | User clicks Undo |
| `onRedo?()` | User clicks Redo |
| `onReset?()` | User clicks Reset |
| `onPrefabSelect?(prefab)` | User selects a prefab in the Prefabs popover |
| `onAddPlayer?(data)` | Reserved for add-player form submit |

## Optional props from parent

- `players` — list for Add Player "Assign To" dropdown (defaults to built-in list if not passed)
- `prefabs` — list for Prefabs popover (defaults to built-in list if not passed)
