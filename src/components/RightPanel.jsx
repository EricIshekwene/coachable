import React from "react";
import PlayNameEditor from "./rightPanel/PlayNameEditor";
import FieldSettingsSection from "./rightPanel/FieldSettingsSection";
import DrawingStyleSection from "./rightPanel/DrawingStyleSection";
import DrawingObjectsList from "./rightPanel/DrawingObjectsList";
import PlayersSection from "./rightPanel/PlayersSection";
import AdvancedSettingsButton from "./rightPanel/AdvancedSettingsButton";
import AllPlayersSection from "./rightPanel/AllPlayersSection";
import SelectedPlayersSection from "./rightPanel/SelectedPlayersSection";
import ExportActions from "./rightPanel/ExportActions";

export default function RightPanel({
  playName,
  onPlayNameChange,

  zoomPercent,
  onZoomIn,
  onZoomOut,
  onZoomPercentChange,

  onRotateLeft,
  onRotateCenter,
  onRotateRight,
  onFieldUndo,
  onFieldRedo,
  onReset,

  playersById,
  representedPlayerIds,
  selectedPlayerIds,
  selectedPlayers,
  onSelectPlayer,
  onEditPlayer,
  onDeletePlayer,

  allPlayersDisplay,
  onAllPlayersDisplayChange,
  onSelectedPlayersColorChange,

  advancedSettingsOpen,
  onOpenAdvancedSettings,

  onSaveToPlaybook,
  onImport,
  onScreenshot,
  onVideoExport,

  // Drawing style props
  canvasTool,
  drawSubTool,
  drawColor,
  drawOpacity,
  drawStrokeWidth,
  drawTension,
  drawFontSize,
  drawTextAlign,
  drawArrowHeadType,
  onDrawColorChange,
  onDrawOpacityChange,
  onDrawStrokeWidthChange,
  onDrawTensionChange,
  onDrawFontSizeChange,
  onDrawTextAlignChange,
  onDrawArrowHeadTypeChange,
  selectedDrawing,
  selectedDrawings,
  onUpdateDrawing,
  onUpdateMultipleDrawings,
  // Drawing objects list props
  drawings,
  selectedDrawingIds,
  onSelectedDrawingIdsChange,
  onRemoveDrawing,
  eraserSize,
  onEraserSizeChange,
  drawShapeType,
  drawShapeStrokeColor,
  drawShapeFill,
  onDrawShapeTypeChange,
  onDrawShapeStrokeColorChange,
  onDrawShapeFillChange,
  selectedItemIds,
  onSavePrefab,
}) {
  return (
    <aside
      className="
        h-screen shrink-0 bg-BrandBlack
        w-32 sm:w-36 md:w-40 lg:w-44 xl:w-48
        px-2 sm:px-2.5 md:px-3 py-2 sm:py-2.5 md:py-3
        flex flex-col
        gap-0.5 sm:gap-0.5 md:gap-1 lg:gap-1.5
        select-none
        overflow-hidden
        z-50
      "
    >
      {/* Scrollable content area (everything except export actions) */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0.5 hide-scroll">
        <div className="flex flex-col gap-0.5 sm:gap-0.5 md:gap-1 lg:gap-1.5">
          <PlayNameEditor value={playName} onChange={onPlayNameChange} maxLength={10} />

          <FieldSettingsSection
            zoomPercent={zoomPercent}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onZoomPercentChange={onZoomPercentChange}
            onRotateLeft={onRotateLeft}
            onRotateCenter={onRotateCenter}
            onRotateRight={onRotateRight}
            onUndo={onFieldUndo}
            onRedo={onFieldRedo}
            onReset={onReset}
          />

          {canvasTool === "pen" && (
            <DrawingStyleSection
              drawSubTool={drawSubTool}
              drawColor={drawColor}
              drawOpacity={drawOpacity}
              drawStrokeWidth={drawStrokeWidth}
              drawTension={drawTension}
              drawFontSize={drawFontSize}
              drawTextAlign={drawTextAlign}
              drawArrowHeadType={drawArrowHeadType}
              onColorChange={onDrawColorChange}
              onOpacityChange={onDrawOpacityChange}
              onStrokeWidthChange={onDrawStrokeWidthChange}
              onTensionChange={onDrawTensionChange}
              onFontSizeChange={onDrawFontSizeChange}
              onTextAlignChange={onDrawTextAlignChange}
              onArrowHeadTypeChange={onDrawArrowHeadTypeChange}
              selectedDrawing={selectedDrawing}
              selectedDrawings={selectedDrawings}
              onUpdateDrawing={onUpdateDrawing}
              onUpdateMultipleDrawings={onUpdateMultipleDrawings}
              eraserSize={eraserSize}
              onEraserSizeChange={onEraserSizeChange}
              drawShapeType={drawShapeType}
              drawShapeStrokeColor={drawShapeStrokeColor}
              drawShapeFill={drawShapeFill}
              onShapeTypeChange={onDrawShapeTypeChange}
              onShapeStrokeColorChange={onDrawShapeStrokeColorChange}
              onShapeFillChange={onDrawShapeFillChange}
            />
          )}

          <PlayersSection
            playersById={playersById}
            representedPlayerIds={representedPlayerIds}
            selectedPlayerIds={selectedPlayerIds}
            onSelectPlayer={onSelectPlayer}
            onEditPlayer={onEditPlayer}
            onDeletePlayer={onDeletePlayer}
          />

          <DrawingObjectsList
            drawings={drawings}
            selectedDrawingIds={selectedDrawingIds}
            onSelectedDrawingIdsChange={onSelectedDrawingIdsChange}
            onRemoveDrawing={onRemoveDrawing}
          />

          {selectedPlayerIds?.length > 0 ? (
            <SelectedPlayersSection
              selectedPlayerIds={selectedPlayerIds}
              selectedItemIds={selectedItemIds}
              selectedPlayers={selectedPlayers}
              allPlayersDisplay={allPlayersDisplay}
              onAllPlayersDisplayChange={onAllPlayersDisplayChange}
              onSelectedPlayersColorChange={onSelectedPlayersColorChange}
              onSavePrefab={onSavePrefab}
            />
          ) : (
            <AllPlayersSection value={allPlayersDisplay} onChange={onAllPlayersDisplayChange} />
          )}

          <AdvancedSettingsButton isOpen={advancedSettingsOpen} onOpen={onOpenAdvancedSettings} />
        </div>
      </div>

      {/* Fixed bottom area */}
      <div className="shrink-0 pt-1.5 sm:pt-2 border-t border-BrandGray2/60">
        <ExportActions
          onSaveToPlaybook={onSaveToPlaybook}
          onImport={onImport}
          onScreenshot={onScreenshot}
          onVideoExport={onVideoExport}
        />
      </div>
    </aside>
  );
}
