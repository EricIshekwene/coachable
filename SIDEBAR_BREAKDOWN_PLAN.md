# Sidebar Breakdown Plan

Break down the Sidebar into a `sidebar/` folder of section components, lift tool/button state and click events to the parent (App), and align with the patterns used in **ControlPill** (callbacks up, optional external control) and **RightPanel** (layout + sections, props/callbacks from App).

---

## 1. Target folder structure

```
src/components/
├── Sidebar.jsx                    # Thin wrapper that imports from sidebar/ and passes props
└── sidebar/
    ├── README.md                  # API, callbacks, section list (this plan in doc form)
    ├── SidebarRoot.jsx            # Main component: <aside>, layout, compose sections
    ├── SelectToolSection.jsx      # Select/Hand chevron + popover
    ├── PenToolSection.jsx         # Pen/Arrow chevron + popover
    ├── EraserToolSection.jsx      # Eraser chevron + popover
    ├── AddPlayerSection.jsx       # Add Player chevron + popover (form + player search)
    ├── PlayerColorSection.jsx     # Player color chevron + popover (red/blue)
    ├── PrefabsSection.jsx         # Prefabs chevron + popover
    └── HistoryActionsSection.jsx  # Undo, Redo, Reset buttons
```

Shared UI (buttons, popovers, tooltips) stays in `subcomponents/` (Buttons, Popovers, PrefabsPopover). Section components use those and report state/clicks up via callbacks.

---

## 2. State and callbacks to send up

Sidebar should **own** tool/UI state internally (like ControlPill) and **notify** the parent via optional callbacks. App (or any parent) can use these to drive canvas tool, undo/redo, etc.

### 2.1 Tool and sub-tool state

| State              | Type                      | Callback                     | When it’s sent |
|--------------------|---------------------------|------------------------------|----------------|
| Selected tool      | `"select" \| "hand" \| "pen" \| "eraser" \| "addPlayer" \| "player" \| "prefab"` | `onToolChange(tool)`         | When user picks a tool (main button or sub-option). |
| Select sub-tool    | `"select" \| "hand"`      | `onSelectSubTool?(subTool)`  | When user picks Select or Hand in the select popover. |
| Pen sub-tool       | `"pen" \| "arrow"`        | `onPenSubTool?(subTool)`     | When user picks Pen or Arrow in the pen popover. |
| Eraser sub-tool    | `"full" \| "partial"`     | `onEraserSubTool?(subTool)`  | When user picks Full or Partial in the eraser popover. |
| Player color       | `string` (hex)             | `onPlayerColorChange?(hex)`  | When user picks red/blue (or future colors) in the player popover. |

Existing `onToolChange` stays. When the tool is select/hand, its value is the select sub-tool (`"select"` or `"hand"`). Other tools can be reported as `"pen"`, `"eraser"`, `"addPlayer"`, `"player"`, `"prefab"` so the canvas (or App) knows the current mode.

### 2.2 Button click callbacks

| Button / Action       | Callback               | When it’s sent |
|-----------------------|------------------------|----------------|
| Undo                   | `onUndo?()`            | User clicks Undo. |
| Redo                   | `onRedo?()`            | User clicks Redo. |
| Reset                  | `onReset?()`           | User clicks Reset. |
| Prefab chosen          | `onPrefabSelect?(prefab)` | User selects a prefab in the Prefabs popover. |
| Add player submit      | `onAddPlayer?(data)`   | User submits add-player form (number, name, assignTo). Optional; can be added when form is wired. |

All of these are optional so Sidebar works standalone.

### 2.3 Summary: props the parent can pass

```js
// Optional: receive state updates (like ControlPill)
onToolChange(tool)              // current tool id
onSelectSubTool(subTool)        // "select" | "hand"
onPenSubTool(subTool)           // "pen" | "arrow"
onEraserSubTool(subTool)        // "full" | "partial"
onPlayerColorChange(hex)
onUndo()
onRedo()
onReset()
onPrefabSelect(prefab)
onAddPlayer(data)               // when implemented

// Optional: external control / two-way (like ControlPill’s externalTimePercent)
selectedTool?: string
selectToolType?: "select" | "hand"
penToolType?: "pen" | "arrow"
eraserToolType?: "full" | "partial"
playerColor?: string

// Optional: data from parent (like RightPanel’s playersById)
players?: Array<{ id, name, ... }>   // for Add Player “Assign To” dropdown
prefabs?: Array<PrefabConfig>        // for Prefabs popover
```

---

## 3. Section components and their contracts

Each section renders one “row” in the sidebar (icon + optional popover) and gets the callbacks and state it needs from `SidebarRoot`.

### 3.1 SelectToolSection

- **Renders:** `SidebarChevronButton` (Select or Hand icon), `Tooltip`, `Popover` with Select / Hand options.
- **Receives from parent:**  
  `selectedTool`, `selectToolType`, `openPopover`, `hoveredTooltip`,  
  `onToolSelect`, `onSelectSubTool`, `onPopoverToggle`, `onPopoverClose`, `onHoverTooltip`, `anchorRef`.
- **Behavior:** On main click → set tool to current `selectToolType` and call `onToolSelect(selectToolType)`. On option click → update sub-tool and call `onSelectSubTool(option)`, then close popover. Keyboard shortcuts (S/H) can stay in SidebarRoot and call the same callbacks.

### 3.2 PenToolSection

- **Renders:** Pen/Arrow chevron button, tooltip, popover with Pen / Arrow.
- **Receives:** `selectedTool`, `penToolType`, `openPopover`, `hoveredTooltip`, `onToolSelect("pen")`, `onPenSubTool`, `onPopoverToggle`, `onPopoverClose`, `onHoverTooltip`, `anchorRef`.
- **Behavior:** Main click → select pen tool. Option click → set pen sub-tool, call `onPenSubTool(option)`, close popover.

### 3.3 EraserToolSection

- **Renders:** Eraser chevron button, tooltip, popover with Full / Partial.
- **Receives:** `selectedTool`, `eraserToolType`, `openPopover`, `hoveredTooltip`, `onToolSelect("eraser")`, `onEraserSubTool`, `onPopoverToggle`, `onPopoverClose`, `onHoverTooltip`, `anchorRef`.
- **Behavior:** Same pattern as Pen.

### 3.4 AddPlayerSection

- **Renders:** Add Player chevron button, tooltip, popover with form (Number, Name, Assign To + player search).
- **Receives:** `selectedTool`, `openPopover`, `playerSearch`, `showPlayerDropdown`, `players` (optional),  
  `onToolSelect("addPlayer")`, `onPopoverToggle`, `onPopoverClose`, `onPlayerSearchChange`, `onPlayerAssign`, `onHoverTooltip`, `anchorRef`, `dropdownRef`.
- **Behavior:** Main click → select add-player tool. Form and “Assign To” are local to this section; when we add “Add” submit, call `onAddPlayer({ number, name, assignTo })`.

### 3.5 PlayerColorSection

- **Renders:** Player color dot chevron button, tooltip, popover with Red / Blue (and later more colors).
- **Receives:** `selectedTool`, `playerColor`, `openPopover`, `hoveredTooltip`, `onToolSelect("player")`, `onPlayerColorChange`, `onPopoverToggle`, `onPopoverClose`, `onHoverTooltip`, `anchorRef`.
- **Behavior:** Main click → select player tool. Color option click → call `onPlayerColorChange(hex)`, close popover.

### 3.6 PrefabsSection

- **Renders:** Prefabs chevron button, tooltip, popover with prefab list (from `prefabs` prop or default list).
- **Receives:** `openPopover`, `hoveredTooltip`, `prefabs`, `onPopoverToggle`, `onPopoverClose`, `onPrefabSelect`, `onHoverTooltip`, `anchorRef`.
- **Behavior:** Chevron toggles popover. Choosing a prefab calls `onPrefabSelect(prefab)` and can call `onToolChange("prefab")` (or equivalent) so parent knows tool switched to prefab mode.

### 3.7 HistoryActionsSection

- **Renders:** Undo, Redo, Reset icon buttons and tooltips.
- **Receives:** `onUndo`, `onRedo`, `onReset`, `onHoverTooltip` (and maybe `hoveredTooltip` for tooltip visibility).
- **Behavior:** Each button calls its callback on click. No tool state; only actions.

---

## 4. SidebarRoot.jsx – main orchestrator

- **State owned inside SidebarRoot (unless overridden by props):**  
  `selectedTool`, `selectToolType`, `penToolType`, `eraserToolType`, `playerColor`, `openPopover`, `hoveredTooltip`, `playerSearch`, `showPlayerDropdown`.
- **Effects:**  
  - When `selectedTool` (or select sub-tool) changes, call `onToolChange` with the appropriate value (e.g. when tool is select/hand, send `selectToolType`; otherwise send `selectedTool`).  
  - Same pattern as current Sidebar: keyboard S/H updates local state and triggers `onToolChange`.
- **Refs:** One ref per section that has a popover (select, pen, eraser, addPlayer, playerColor, prefabs), or a single map keyed by popover id; pass `anchorRef` into each section.
- **Layout:**  
  - One `SelectToolSection` … `HistoryActionsSection` per slot, with `<hr />` dividers between groups as in the current Sidebar.  
  - Reuse `subcomponents/` for `SidebarChevronButton`, `Button`, `Popover`, `PopoverGrid`, `PopoverForm`, `Tooltip`, `PrefabsPopover`.

---

## 5. Wiring in App.jsx

After breakdown, App (or the layout that renders Sidebar) should:

1. **Import** `Sidebar` from `./components/Sidebar`, and keep `Sidebar` as a thin shell that renders `<SidebarRoot ... />` with the same props.
2. **State in App (optional):**  
   e.g. `sidebarTool`, `sidebarSelectSubTool`, etc., if you want to read or control Sidebar from outside.
3. **Callbacks:**  
   - `onToolChange` → already used for `setCanvasTool` when tool is `"hand"` or `"select"`.  
   - `onUndo`, `onRedo`, `onReset` → pass the same handlers you use for RightPanel/field (`onUndo`, `onRedo`, `onReset`) so Undo/Redo/Reset in the sidebar and in the panel stay in sync.  
   - `onPrefabSelect`, `onPlayerColorChange`, etc. when you need them for canvas or future features.

Example:

```jsx
<Sidebar
  onToolChange={(tool) => {
    if (tool === "hand" || tool === "select") setCanvasTool(tool);
  }}
  onUndo={onUndo}
  onRedo={onRedo}
  onReset={onReset}
  onPrefabSelect={(prefab) => { /* ... */ }}
  onPlayerColorChange={(hex) => { /* ... */ }}
/>
```

---

## 6. Implementation order

1. **Create `sidebar/` folder** and add `README.md` (summarize this plan: sections, callbacks, usage).
2. **Add `SidebarRoot.jsx`** and move the existing Sidebar logic into it (state, refs, effects, layout structure). Keep rendering one big block first; get behavior and callbacks correct.
3. **Extract sections one by one** (e.g. first `HistoryActionsSection`, then `SelectToolSection`, then Pen, Eraser, AddPlayer, PlayerColor, Prefabs). After each extraction, pass in the right props and callbacks from SidebarRoot so state and clicks still go up as in §2.
4. **Introduce `onUndo` / `onRedo` / `onReset`** from SidebarRoot to the parent and wire them in App to your existing field handlers.
5. **Rename/organize:** Keep `Sidebar.jsx` in `components/` as the public entry that renders `SidebarRoot` from `sidebar/SidebarRoot.jsx`, so imports in App don’t need to change.
6. **Optional:** Add `onSelectSubTool`, `onPenSubTool`, `onEraserSubTool`, `onPlayerColorChange`, `onPrefabSelect` (and later `onAddPlayer`) in App when you need to react to those in the canvas or elsewhere.

---

## 7. Consistency with ControlPill and RightPanel

- **ControlPill:** Owns state, reports via `onTimePercentChange`, `onKeyframesChange`, etc. Optional `external*` props for two-way binding.  
  → **Sidebar:** Same idea: SidebarRoot owns tool/UI state, reports via `onToolChange`, `onUndo`, etc.; optional `selectedTool` / `selectToolType` / … for controlled mode.
- **RightPanel:** No local domain state; receives `playName`, `zoomPercent`, `onPlayNameChange`, etc. from App.  
  → **Sidebar:** Same idea for *data* coming from parent: `players`, `prefabs` are optional props; tool state can stay in Sidebar and only be “reported” up, or be driven by App if you add `selectedTool` / … props.

This keeps the Sidebar’s state and button clicks clearly defined and sent up via a small set of callbacks, matching how the control pill and right panel are structured.
