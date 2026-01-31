import WideSidebarRoot from "./wideSidebar/WideSidebarRoot";

export default function WideSidebar({
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
        <WideSidebarRoot
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
