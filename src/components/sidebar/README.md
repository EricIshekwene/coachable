# Sidebar sections (`src/components/sidebar/`)

This folder contains the **Sidebar** (narrow, icon-only) and its section subcomponents. The public entry for the narrow sidebar is `src/components/Sidebar.jsx`, which renders `SidebarRoot` from here.

**Note:** The app currently mounts **WideSidebar** (`src/components/WideSidebar.jsx` / `src/components/wideSidebar/`) instead of Sidebar. Sidebar is kept in the codebase but unmounted. WideSidebar reuses these same section components with `wide={true}` to show icon + tool name in a row.

## Structure

```
sidebar/
├── README.md               # This file
├── SidebarRoot.jsx         # Narrow sidebar: layout, state, callbacks
├── SelectToolSection.jsx   # Select/Hand (supports wide prop)
├── PenToolSection.jsx      # Pen/Arrow (supports wide prop)
├── EraserToolSection.jsx   # Eraser (supports wide prop)
├── AddPlayerSection.jsx    # Add Player (supports wide prop)
├── PlayerColorSection.jsx  # Player color (supports wide prop)
├── PrefabsSection.jsx      # Prefabs (supports wide prop)
└── HistoryActionsSection.jsx # Undo, Redo, Reset (supports wide prop)
```

## Callbacks (state sent up)

All callbacks are optional. Sidebar works standalone.

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

## Usage (from App)

The app uses **WideSidebar**; to use the narrow Sidebar instead, swap the import and component:

```jsx
import WideSidebar from './components/WideSidebar';  // current
// import Sidebar from './components/Sidebar';       // narrow, icon-only

<WideSidebar
  onToolChange={(tool) => { if (tool === "hand" || tool === "select") setCanvasTool(tool); }}
  onUndo={onUndo}
  onRedo={onRedo}
  onReset={onReset}
/>
```

## Optional props from parent

- `players` – list for Add Player “Assign To” dropdown (defaults to built-in list if not passed)
- `prefabs` – list for Prefabs popover (defaults to built-in list if not passed)
