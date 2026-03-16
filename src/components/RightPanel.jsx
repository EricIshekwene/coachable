import React from "react";
import { FiSun, FiMoon } from "react-icons/fi";
import PlayNameEditor from "./rightPanel/PlayNameEditor";
import FieldSettingsSection from "./rightPanel/FieldSettingsSection";
import DrawingStyleSection from "./rightPanel/DrawingStyleSection";
import DrawingObjectsList from "./rightPanel/DrawingObjectsList";
import PlayersSection from "./rightPanel/PlayersSection";
import AdvancedSettingsButton from "./rightPanel/AdvancedSettingsButton";
import AllPlayersSection from "./rightPanel/AllPlayersSection";
import SelectedPlayersSection from "./rightPanel/SelectedPlayersSection";
import ExportActions from "./rightPanel/ExportActions";
import RecordingPlayerList from "./rightPanel/RecordingPlayerList";
import ObjectsSection from "./rightPanel/ObjectsSection";

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
  ballsById,
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

  onSaveNow,
  onSaveToPlaybook,
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
  drawStabilization,
  onDrawStabilizationChange,
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
  onSelectItem,
  onDeleteBall,
  onSavePrefab,
  // Recording mode props
  recordingModeEnabled,
  recordingGlobalState,
  recordingPlayerId,
  recordingPlayerStates,
  onStartRecording,
  onResumeRecording,
  onClearPlayerRecording,
  onClearAllRecordings,
  // Theme toggle
  slateTheme = "dark",
  onSlateThemeToggle,
}) {
  return (
    <aside
      className="
        h-full shrink-0 bg-BrandBlack
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
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0.5 hide-scroll" style={{ touchAction: "pan-y" }}>
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
              drawStabilization={drawStabilization}
              onStabilizationChange={onDrawStabilizationChange}
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

          {recordingModeEnabled && (
            <RecordingPlayerList
              playersById={playersById}
              ballsById={ballsById}
              representedPlayerIds={representedPlayerIds}
              playerStates={recordingPlayerStates}
              recordingPlayerId={recordingPlayerId}
              globalState={recordingGlobalState}
              onStartRecording={onStartRecording}
              onResumeRecording={onResumeRecording}
              onClearPlayerRecording={onClearPlayerRecording}
              onClearAllRecordings={onClearAllRecordings}
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

          <ObjectsSection
            ballsById={ballsById}
            selectedItemIds={selectedItemIds}
            onSelectItem={onSelectItem}
            onDeleteBall={onDeleteBall}
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

          {onSlateThemeToggle && (
            <button
              onClick={onSlateThemeToggle}
              className="flex items-center justify-between w-full rounded-md px-2 py-1.5 text-xs text-BrandGray hover:bg-BrandBlack2 hover:text-BrandText transition-colors"
              title={slateTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className="font-medium">{slateTheme === "dark" ? "Dark" : "Light"}</span>
              <div className="relative flex items-center">
                <div
                  className={`w-8 h-4 rounded-full transition-colors duration-200 ${
                    slateTheme === "light" ? "bg-BrandOrange" : "bg-BrandGray2"
                  }`}
                >
                  <div
                    className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: slateTheme === "light" ? "17px" : "2px" }}
                  />
                </div>
                {slateTheme === "light"
                  ? <FiSun className="ml-1.5 text-BrandOrange" size={11} />
                  : <FiMoon className="ml-1.5 text-BrandGray" size={11} />
                }
              </div>
            </button>
          )}

          <AdvancedSettingsButton isOpen={advancedSettingsOpen} onOpen={onOpenAdvancedSettings} />

        </div>
      </div>

      {/* Fixed bottom area */}
      <div className="shrink-0 pt-1.5 sm:pt-2 border-t border-BrandGray2/60">
        <ExportActions
          onSaveNow={onSaveNow}
          onSaveToPlaybook={onSaveToPlaybook}
          onScreenshot={onScreenshot}
          onVideoExport={onVideoExport}
        />
      </div>
    </aside>
  );
}
