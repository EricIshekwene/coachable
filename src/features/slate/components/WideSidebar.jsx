import WideSidebarRoot from "./wideSidebar/WideSidebarRoot";

export default function WideSidebar({
    activeTool,
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
    onDeleteCustomPrefab,
    onAddPlayer,
    players,
    prefabs,
    customPrefabs,
    publishedPrefabs,
    playName,
    onCollapse,
    onNavigateHome,
    adminMode,
    drawingMode = false,
}) {
    return (
        <WideSidebarRoot
            activeTool={activeTool}
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
            onDeleteCustomPrefab={onDeleteCustomPrefab}
            onAddPlayer={onAddPlayer}
            players={players}
            prefabs={prefabs}
            customPrefabs={customPrefabs}
            publishedPrefabs={publishedPrefabs}
            playName={playName}
            onCollapse={onCollapse}
            onNavigateHome={onNavigateHome}
            adminMode={adminMode}
            drawingMode={drawingMode}
        />
    );
}
