import SidebarRoot from "./sidebar/SidebarRoot";

export default function Sidebar({
    onToolChange,
    onSelectSubTool,
    onPenSubTool,
    onEraserSubTool,
    onPlayerColorChange,
    onUndo,
    onRedo,
    onReset,
    onDeleteSelected,
    onPrefabSelect,
    onAddPlayer,
    players,
    prefabs,
}) {
    return (
        <SidebarRoot
            onToolChange={onToolChange}
            onSelectSubTool={onSelectSubTool}
            onPenSubTool={onPenSubTool}
            onEraserSubTool={onEraserSubTool}
            onPlayerColorChange={onPlayerColorChange}
            onUndo={onUndo}
            onRedo={onRedo}
            onReset={onReset}
            onDeleteSelected={onDeleteSelected}
            onPrefabSelect={onPrefabSelect}
            onAddPlayer={onAddPlayer}
            players={players}
            prefabs={prefabs}
        />
    );
}
