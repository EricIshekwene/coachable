# Sidebar sections (`src/components/sidebar/`)

This folder contains the **Sidebar** component and its section subcomponents. The public entry is `src/components/Sidebar.jsx`, which renders `SidebarRoot` from here.

## Structure

```
sidebar/
├── README.md               # This file
├── SidebarRoot.jsx         # Main orchestrator: layout, state, callbacks
├── SelectToolSection.jsx   # Select/Hand chevron + popover
├── PenToolSection.jsx      # Pen/Arrow chevron + popover
├── EraserToolSection.jsx   # Eraser chevron + popover
├── AddPlayerSection.jsx    # Add Player chevron + popover (form + player search)
├── PlayerColorSection.jsx  # Player color chevron + popover (red/blue)
├── PrefabsSection.jsx      # Prefabs chevron + popover
└── HistoryActionsSection.jsx # Undo, Redo, Reset buttons
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

```jsx
import Sidebar from './components/Sidebar';

<Sidebar
  onToolChange={(tool) => { if (tool === "hand" || tool === "select") setCanvasTool(tool); }}
  onUndo={onUndo}
  onRedo={onRedo}
  onReset={onReset}
  onPrefabSelect={(prefab) => { /* ... */ }}
  onPlayerColorChange={(hex) => { /* ... */ }}
/>
```

## Optional props from parent

- `players` – list for Add Player “Assign To” dropdown (defaults to built-in list if not passed)
- `prefabs` – list for Prefabs popover (defaults to built-in list if not passed)
