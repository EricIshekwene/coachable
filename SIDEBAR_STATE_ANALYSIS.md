# Sidebar State Analysis & Refactoring Plan

## Overview
The Sidebar component manages tool selection, player management, and drawing tools. This document outlines what state should be exposed to the parent component and how to refactor it.

---

## Critical State to Expose (Required for External Control)

### 1. **selectedTool** (Current Active Tool)
- **Type**: `string`
- **Values**: `"select" | "hand" | "pen" | "arrow" | "eraser" | "addPlayer" | "player" | "prefab"`
- **Purpose**: The currently active/selected tool in the sidebar
- **Critical**: YES - Other components need to know which tool is active
- **Usage**: 
  - Canvas/canvas components need to know what tool mode to use
  - Different tools enable different interactions
  - Affects cursor and interaction behavior

### 2. **toolConfig** (Tool Configuration Object)
- **Type**: `object`
- **Structure**:
  ```typescript
  {
    selectTool: "select" | "hand",
    penTool: "pen" | "arrow",
    eraserTool: "full" | "partial"
  }
  ```
- **Purpose**: Configuration for each tool type (sub-options)
- **Critical**: YES - Determines exact behavior of each tool
- **Usage**: 
  - Canvas needs to know if pen is "pen" or "arrow" mode
  - Canvas needs to know if eraser is "full" or "partial"
  - Canvas needs to know if select is "select" or "hand" (pan) mode

### 3. **playerColor** (Player Color)
- **Type**: `string` (hex color)
- **Purpose**: Current color selected for players
- **Critical**: YES - When adding/editing players, this color is used
- **Usage**: 
  - When placing players on canvas, use this color
  - When editing existing players, apply this color
  - Sync with player color picker

---

## Important State to Expose (Useful for Context)

### 4. **playerData** (Player Form Data)
- **Type**: `object | null`
- **Structure**:
  ```typescript
  {
    number: string,
    name: string,
    assignedTo: string  // Player name from search
  } | null
  ```
- **Purpose**: Data entered in the "Add Player" form
- **Critical**: NO - But useful for tracking what player is being added
- **Usage**: 
  - When "addPlayer" tool is selected and user clicks canvas, create player with this data
  - Track form state for validation
  - Could be used for editing existing players

### 5. **selectedPrefab** (Selected Prefab)
- **Type**: `object | null`
- **Structure**: Prefab object from prefabs array
- **Purpose**: Currently selected prefab configuration
- **Critical**: NO - But needed when placing prefabs
- **Usage**: 
  - When prefab tool is active and user clicks canvas, place prefab with this config
  - Prefab includes: id, label, mode, icon, dropdowns with values

---

## Optional State (Internal Only - May Not Need Exposure)

### 6. **openPopover** (UI State)
- **Type**: `string | null`
- **Purpose**: Which popover is currently open
- **Critical**: NO - Pure UI state, no external impact

### 7. **hoveredTooltip** (UI State)
- **Type**: `string | null`
- **Purpose**: Which tooltip is being hovered
- **Critical**: NO - Pure UI state, no external impact

### 8. **playerSearch** (Internal Search State)
- **Type**: `string`
- **Purpose**: Search query for player dropdown
- **Critical**: NO - Internal to player selection UI

### 9. **showPlayerDropdown** (UI State)
- **Type**: `boolean`
- **Purpose**: Whether player dropdown is visible
- **Critical**: NO - Pure UI state

---

## Actions/Events to Expose

### 1. **onToolChange** (Tool Selection Changed)
- **Callback**: `(tool: string, toolConfig: ToolConfig) => void`
- **Purpose**: Notify parent when tool selection changes
- **Usage**: Update canvas mode, cursor, interaction handlers

### 2. **onPlayerColorChange** (Player Color Changed)
- **Callback**: `(color: string) => void`
- **Purpose**: Notify parent when player color changes
- **Usage**: Update player color in canvas, sync with existing players

### 3. **onAddPlayer** (Add Player Action)
- **Callback**: `(playerData: PlayerData, color: string) => void`
- **Purpose**: Triggered when user wants to add a player (after form submission or canvas click)
- **Usage**: Create new player on canvas with provided data

### 4. **onPrefabSelect** (Prefab Selected)
- **Callback**: `(prefab: Prefab) => void`
- **Purpose**: Notify parent when a prefab is selected
- **Usage**: Prepare canvas for prefab placement

### 5. **onUndo** (Undo Action)
- **Callback**: `() => void`
- **Purpose**: Undo last action
- **Usage**: Integrate with canvas undo system

### 6. **onRedo** (Redo Action)
- **Callback**: `() => void`
- **Purpose**: Redo last undone action
- **Usage**: Integrate with canvas redo system

### 7. **onReset** (Reset Action)
- **Callback**: `() => void`
- **Purpose**: Reset canvas/workspace
- **Usage**: Clear canvas, reset to initial state

---

## Recommended Props Interface

```typescript
interface SidebarProps {
  // Callbacks for state changes
  onToolChange?: (tool: string, toolConfig: ToolConfig) => void;
  onPlayerColorChange?: (color: string) => void;
  onAddPlayer?: (playerData: PlayerData, color: string) => void;
  onPrefabSelect?: (prefab: Prefab) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onReset?: () => void;
  
  // Optional: External control (two-way binding)
  externalSelectedTool?: string;
  externalToolConfig?: ToolConfig;
  externalPlayerColor?: string;
  
  // Optional: Data from parent
  players?: string[];  // Allow parent to provide player list
  prefabs?: Prefab[];  // Allow parent to provide prefabs
}

interface ToolConfig {
  selectTool: "select" | "hand";
  penTool: "pen" | "arrow";
  eraserTool: "full" | "partial";
}

interface PlayerData {
  number: string;
  name: string;
  assignedTo: string;
}

interface Prefab {
  id: string;
  label: string;
  mode: "offense" | "defense";
  icon: React.ReactNode;
  dropdowns: Array<{
    label: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
  }>;
}
```

---

## Suggested Component Breakdown Structure

```
components/
  subcomponents/
    sidebar/
      ToolSelector.jsx        # Select tool (select/hand)
      PenTool.jsx            # Pen tool (pen/arrow)
      EraserTool.jsx         # Eraser tool (full/partial)
      AddPlayerTool.jsx      # Add player tool with form
      PlayerColorTool.jsx    # Player color picker
      PrefabsTool.jsx        # Prefabs selector
      ActionButtons.jsx      # Undo, Redo, Reset buttons
      Sidebar.jsx            # Main component (orchestrates subcomponents)
```

---

## State Management Strategy

### Option 1: Callback-Based (Recommended)
- Sidebar manages its own state internally
- Exposes state changes via callbacks
- Parent can listen to changes but doesn't control state
- **Pros**: Simple, Sidebar remains self-contained
- **Cons**: Parent can't programmatically change tools

### Option 2: Controlled Component
- Parent manages all state
- Sidebar receives state as props
- Sidebar calls callbacks to request state changes
- **Pros**: Full control from parent
- **Cons**: More complex, parent must manage all state

### Option 3: Hybrid (Recommended for Flexibility)
- Sidebar manages internal state by default
- Optional props allow parent to control state externally
- Best of both worlds
- **Pros**: Flexible, can work standalone or controlled
- **Cons**: Slightly more complex implementation

---

## Key Functions to Expose

1. **getCurrentTool()** - Returns current tool and config
2. **setTool(tool, config?)** - Programmatically set tool
3. **getPlayerColor()** - Returns current player color
4. **setPlayerColor(color)** - Set player color
5. **getPlayerFormData()** - Returns current player form data
6. **clearPlayerForm()** - Reset player form

---

## Integration Points

### Canvas Integration
- Canvas needs to know: `selectedTool`, `toolConfig`
- When tool is "addPlayer", canvas should create player on click
- When tool is "prefab", canvas should place prefab on click
- When tool is "pen", canvas should draw with pen/arrow mode
- When tool is "eraser", canvas should erase with full/partial mode

### Player Management Integration
- Player color changes should update existing players if needed
- Add player action should create player with form data + color
- Player list could come from external source (API, state management)

### Prefab Integration
- Prefab selection should prepare canvas for placement
- Prefab dropdown values should be accessible when placing
- Prefab mode (offense/defense) affects placement behavior

---

## Notes

- **Tool States**: The selectedTool can be different from the tool type (e.g., selectedTool="pen" but penToolType="arrow")
- **Player Form**: The "Add Player" form has three fields: Number, Name, Assign To
- **Prefabs**: Each prefab has dropdowns that can be configured (e.g., number of players, area, formation)
- **Undo/Redo**: Currently empty handlers - should integrate with canvas undo/redo system
- **Reset**: Currently empty handler - should clear canvas/workspace

---

## Migration Steps

1. **Phase 1**: Add callbacks to existing Sidebar (non-breaking)
2. **Phase 2**: Break down into subcomponents
3. **Phase 3**: Add external control props (optional)
4. **Phase 4**: Integrate with canvas/other components

---

## Example Usage

```jsx
function App() {
  const [currentTool, setCurrentTool] = useState("select");
  const [toolConfig, setToolConfig] = useState({
    selectTool: "select",
    penTool: "pen",
    eraserTool: "full"
  });
  const [playerColor, setPlayerColor] = useState("#561ecb");

  const handleToolChange = (tool, config) => {
    setCurrentTool(tool);
    setToolConfig(config);
    console.log("Tool changed:", tool, config);
  };

  const handleAddPlayer = (playerData, color) => {
    console.log("Add player:", playerData, "with color:", color);
    // Create player on canvas
  };

  return (
    <Sidebar
      onToolChange={handleToolChange}
      onPlayerColorChange={setPlayerColor}
      onAddPlayer={handleAddPlayer}
      externalSelectedTool={currentTool}
      externalToolConfig={toolConfig}
      externalPlayerColor={playerColor}
    />
  );
}
```
