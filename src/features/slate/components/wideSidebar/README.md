# Wide Sidebar (`src/components/wideSidebar/`)

The **Wide Sidebar** is the left tools panel used in the app. It has the **same width as the Right Panel** (`w-32 sm:w-36 md:w-40 lg:w-44 xl:w-48`) and shows **icon + tool name** in a row for each tool (Select, Hand, Pen, Eraser, Add Player, Player Color, Prefabs, Undo/Redo/Reset).

## Structure

```
wideSidebar/
├── README.md           # This file
└── WideSidebarRoot.jsx # Layout, state, callbacks; reuses sidebar sections with wide={true}
```

The public entry is `src/components/WideSidebar.jsx`, which renders `WideSidebarRoot`. The wide sidebar reuses the same section components from `src/components/sidebar/` by passing `wide={true}` so each section renders icon + label in a row via `WideSidebarRowButton`.

## Callbacks

| Callback | When called |
|----------|-------------|
| `onToolChange(tool)` | Current tool: `"select"` \| `"hand"` \| `"pen"` \| `"eraser"` \| `"addPlayer"` \| `"player"` \| `"prefab"` |
| `onSelectSubTool?(subTool)` | User picks Select or Hand |
| `onPenSubTool?(subTool)` | User picks Pen or Arrow |
| `onEraserSubTool?(subTool)` | User picks Full or Partial |
| `onPlayerColorChange?(hex)` | User picks a color |
| `onUndo?()`, `onRedo?()`, `onReset?()` | History actions |
| `onPrefabSelect?(prefab)` | User selects a prefab |
| `onAddPlayer?(data)` | Reserved for add-player form submit |

## Usage (from Slate)

```jsx
import WideSidebar from './components/WideSidebar';

<WideSidebar
  onToolChange={handleToolChange}
  onUndo={onUndo}
  onRedo={onRedo}
  onReset={onReset}
/>
```

Optional props: `players`, `prefabs`.
