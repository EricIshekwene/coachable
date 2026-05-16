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
import RecordingPlayerList from "./rightPanel/RecordingPlayerList";
import RecordingModeToggle from "./rightPanel/RecordingModeToggle";
import ObjectsSection from "./rightPanel/ObjectsSection";
import PlayerTransformSection from "./rightPanel/PlayerTransformSection";
import ReflectPlaySection from "./rightPanel/ReflectPlaySection";

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

  adminMode = false,
  onReflectX,
  onReflectY,
  onSaveToPlaybook,
  onScreenshot,
  onVideoExport,

  // Drawing style props
  canvasTool,
  // Active drawing scope identity. Set by Slate.jsx based on the resolution
  // rule: pen tool wins (annotation), otherwise drawingMode + motion subtool
  // wins (motion). Anything else is "none" — in which case the right panel
  // hides BOTH drawing sections per the cross-scope-isolation contract.
  activeDrawingUi = "none",
  animDrawSubTool,
  drawSubTool,
  drawColor,
  drawOpacity,
  drawStrokeWidth,
  drawSmoothing,
  drawFontSize,
  drawTextAlign,
  drawArrowHeadType,
  onDrawColorChange,
  onDrawOpacityChange,
  onDrawStrokeWidthChange,
  onDrawSmoothingChange,
  onDrawFontSizeChange,
  onDrawTextAlignChange,
  onDrawArrowHeadTypeChange,
  drawArrowTip,
  onDrawArrowTipChange,
  selectedDrawing,
  selectedDrawings,
  textSelectAllTrigger,
  onUpdateDrawing,
  onUpdateMultipleDrawings,
  // Drawing objects list props.
  // `drawings` / `selectedDrawingIds` are the ACTIVE-scope view, kept for
  // back-compat. Slate.jsx also passes the typed scope props below so the
  // panel can render the correct list when needed.
  drawings,
  selectedDrawingIds,
  annotationDrawings = [],
  motionDrawings = [],
  selectedAnnotationDrawingIds = [],
  selectedMotionDrawingIds = [],
  onSelectedAnnotationDrawingIdsChange,
  onSelectedMotionDrawingIdsChange,
  onToggleAnnotationDrawingHidden,
  onToggleMotionDrawingHidden,
  onSelectedDrawingIdsChange,
  onCanvasToolChange,
  onDrawSubToolChange,
  onRemoveDrawing,
  hideAllDrawings,
  onHideAllDrawingsChange,
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
  onTogglePlayerHidden,
  onToggleColorHidden,
  onToggleBallHidden,
  onToggleDrawingHidden,
  onSavePrefab,
  fieldBounds,
  onPlayerPositionChange,
  timelineDisplayTimeMs,
  resolveItemPose,
  // Recording mode props
  recordingModeEnabled,
  recordingGlobalState,
  recordingPlayerId,
  recordingPlayerStates,
  onStartRecording,
  onResumeRecording,
  onClearPlayerRecording,
  onClearAllRecordings,
  // Optional: show the toggle button (admin record slate only)
  onRecordingModeToggle,
  recordingDurationMs,
  onRecordingDurationChange,
  recordingStabilization,
  onRecordingStabilizationChange,
  // Optional: focused player for timeline segment highlighting
  recordingFocusedId,
  onRecordingFocusId,
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
          <PlayNameEditor value={playName} onChange={onPlayNameChange} maxLength={50} />

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

          {/*
            Style section renders only when a drawing scope is active. Scope
            identity ("annotation" vs "motion") is forwarded so the section
            can hide tools that don't apply (e.g. text/shape under motion).
          */}
          {activeDrawingUi !== "none" && (
            <DrawingStyleSection
              drawingScope={activeDrawingUi}
              drawSubTool={drawSubTool}
              drawColor={drawColor}
              drawOpacity={drawOpacity}
              drawStrokeWidth={drawStrokeWidth}
              drawSmoothing={drawSmoothing}
              drawFontSize={drawFontSize}
              drawTextAlign={drawTextAlign}
              drawArrowHeadType={drawArrowHeadType}
              onColorChange={onDrawColorChange}
              onOpacityChange={onDrawOpacityChange}
              onStrokeWidthChange={onDrawStrokeWidthChange}
              onSmoothingChange={onDrawSmoothingChange}
              onFontSizeChange={onDrawFontSizeChange}
              onTextAlignChange={onDrawTextAlignChange}
              onArrowHeadTypeChange={onDrawArrowHeadTypeChange}
              drawArrowTip={drawArrowTip}
              onArrowTipChange={onDrawArrowTipChange}
              selectedDrawing={selectedDrawing}
              selectedDrawings={selectedDrawings}
              textSelectAllTrigger={textSelectAllTrigger}
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

          {onRecordingModeToggle && (
            <RecordingModeToggle
              enabled={recordingModeEnabled}
              onChange={onRecordingModeToggle}
              durationMs={recordingDurationMs}
              onDurationChange={onRecordingDurationChange}
              stabilization={recordingStabilization}
              onStabilizationChange={onRecordingStabilizationChange}
              isBusy={recordingGlobalState !== "idle"}
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
              focusedId={recordingFocusedId}
              onFocusId={onRecordingFocusId}
            />
          )}

          {/*
            Objects list renders only for the active scope. Cross-scope
            visibility is forbidden — annotations and motion drawings are
            authored, selected, and edited in independent lists.
          */}
          {activeDrawingUi === "annotation" && (
            <DrawingObjectsList
              drawingScope="annotation"
              drawings={annotationDrawings}
              selectedDrawingIds={selectedAnnotationDrawingIds}
              onSelectedDrawingIdsChange={onSelectedAnnotationDrawingIdsChange || onSelectedDrawingIdsChange}
              onRemoveDrawing={onRemoveDrawing}
              onToggleDrawingHidden={onToggleAnnotationDrawingHidden || onToggleDrawingHidden}
              hideAllDrawings={hideAllDrawings}
              onHideAllDrawingsChange={onHideAllDrawingsChange}
            />
          )}
          {activeDrawingUi === "motion" && (
            <DrawingObjectsList
              drawingScope="motion"
              drawings={motionDrawings}
              selectedDrawingIds={selectedMotionDrawingIds}
              onSelectedDrawingIdsChange={onSelectedMotionDrawingIdsChange || onSelectedDrawingIdsChange}
              onRemoveDrawing={onRemoveDrawing}
              onToggleDrawingHidden={onToggleMotionDrawingHidden || onToggleDrawingHidden}
              hideAllDrawings={hideAllDrawings}
              onHideAllDrawingsChange={onHideAllDrawingsChange}
            />
          )}

          <PlayersSection
            playersById={playersById}
            representedPlayerIds={representedPlayerIds}
            selectedPlayerIds={selectedPlayerIds}
            onSelectPlayer={onSelectPlayer}
            onEditPlayer={onEditPlayer}
            onDeletePlayer={onDeletePlayer}
            onTogglePlayerHidden={onTogglePlayerHidden}
            onToggleColorHidden={onToggleColorHidden}
          />

          {!(selectedPlayerIds?.length > 0) && (
            <ObjectsSection
              ballsById={ballsById}
              selectedItemIds={selectedItemIds}
              onSelectItem={onSelectItem}
              onDeleteBall={onDeleteBall}
              onToggleBallHidden={onToggleBallHidden}
            />
          )}

          {/*
            Previously a passive DrawingObjectsList rendered here when no
            drawing scope was active, and clicking an item would silently
            activate pen mode. That was the same coupling the refactor sets
            out to remove — when no scope is active, the panel intentionally
            shows nothing here. Users enter a drawing scope explicitly via
            the sidebar Draw button (annotation) or by activating a motion
            tool in /admin/drawing (motion).
          */}

          {selectedItemIds?.length === 1 && (() => {
            const itemId = selectedItemIds[0];
            const singleItem =
              selectedPlayers?.find((p) => p.id === itemId) ?? ballsById?.[itemId] ?? null;
            return (
              <PlayerTransformSection
                item={singleItem}
                fieldBounds={fieldBounds}
                onPositionChange={onPlayerPositionChange}
                timelineDisplayTimeMs={timelineDisplayTimeMs}
                resolveItemPose={resolveItemPose}
              />
            );
          })()}

          {selectedPlayerIds?.length > 0 ? (
            <>
              <SelectedPlayersSection
                selectedPlayerIds={selectedPlayerIds}
                selectedItemIds={selectedItemIds}
                selectedPlayers={selectedPlayers}
                allPlayersDisplay={allPlayersDisplay}
                onAllPlayersDisplayChange={onAllPlayersDisplayChange}
                onSelectedPlayersColorChange={onSelectedPlayersColorChange}
                onSavePrefab={onSavePrefab}
              />
              <ObjectsSection
                ballsById={ballsById}
                selectedItemIds={selectedItemIds}
                onSelectItem={onSelectItem}
                onDeleteBall={onDeleteBall}
                onToggleBallHidden={onToggleBallHidden}
              />
            </>
          ) : (
            <AllPlayersSection value={allPlayersDisplay} onChange={onAllPlayersDisplayChange} />
          )}

          {adminMode && (
            <ReflectPlaySection onReflectX={onReflectX} onReflectY={onReflectY} />
          )}

          <AdvancedSettingsButton isOpen={advancedSettingsOpen} onOpen={onOpenAdvancedSettings} />

        </div>
      </div>

      {/* Fixed bottom area */}
      <div className="shrink-0 pt-1.5 sm:pt-2 border-t border-BrandGray2/60">
        <ExportActions
          adminMode={adminMode}
          onSaveToPlaybook={onSaveToPlaybook}
          onScreenshot={onScreenshot}
          onVideoExport={onVideoExport}
        />
      </div>
    </aside>
  );
}
