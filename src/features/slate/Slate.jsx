import { useCallback, useEffect, useRef, useState } from "react";
import WideSidebar from "../../components/WideSidebar";
import ControlPill from "../../components/controlPill/ControlPill";
import RightPanel from "../../components/RightPanel";
import AdvancedSettings from "../../components/AdvancedSettings";
import KonvaCanvasRoot from "../../canvas/KonvaCanvasRoot";
import PlayerEditPanel from "../../components/rightPanel/PlayerEditPanel";
import { buildPlayExportV1, downloadPlayExport } from "../../utils/exportPlay";
import {
  IMPORT_FILE_SIZE_LIMIT_BYTES,
  addKeyframeFromData,
  addPlayerFromData,
  resolveSnapshotForKeyframe,
  validatePlayExportV1,
} from "../../utils/importPlay";
import { DEFAULT_ADVANCED_SETTINGS, useAdvancedSettings } from "./hooks/useAdvancedSettings";
import { useFieldViewport } from "./hooks/useFieldViewport";
import { useTimelinePlayback } from "./hooks/useTimelinePlayback";
import {
  INITIAL_BALL,
  useSlateEntities,
} from "./hooks/useSlateEntities";
import { useKeyframeSnapshots } from "./hooks/useKeyframeSnapshots";
import { useSlateHistory } from "./hooks/useSlateHistory";
import { buildInterpolatedSlate } from "./utils/interpolate";

const KEYFRAME_TOLERANCE = 4;
const LOOP_SECONDS = 30;

function Slate({ onShowMessage }) {
  const [logControlPillState] = useState(false);
  const [canvasTool, setCanvasTool] = useState("hand");
  const [playName, setPlayName] = useState("Name");
  const importInputRef = useRef(null);

  const {
    advancedSettings,
    setAdvancedSettings,
    showAdvancedSettings,
    setShowAdvancedSettings,
    logging,
    logEvent,
  } = useAdvancedSettings();

  const fieldViewport = useFieldViewport();
  const timeline = useTimelinePlayback({ defaultLoopSeconds: LOOP_SECONDS });

  const historyApiRef = useRef({ pushHistory: () => {} });
  const keyframeApiRef = useRef({
    markKeyframeSnapshotPending: () => {},
    findEditTargetKeyframe: () => null,
    latestKeyframesRef: { current: [] },
    setKeyframeSnapshots: () => {},
    timePercent: 0,
  });

  const entities = useSlateEntities({
    historyApiRef,
    keyframeApiRef,
    logEvent,
  });

  const keyframesState = useKeyframeSnapshots({
    defaultKeyframeTolerance: KEYFRAME_TOLERANCE,
    snapshotSlateState: entities.snapshotSlateState,
    playersById: entities.playersById,
    representedPlayerIds: entities.representedPlayerIds,
    ball: entities.ball,
    timePercent: timeline.timePercent,
  });

  keyframeApiRef.current = {
    markKeyframeSnapshotPending: keyframesState.markKeyframeSnapshotPending,
    findEditTargetKeyframe: keyframesState.findEditTargetKeyframe,
    latestKeyframesRef: keyframesState.latestKeyframesRef,
    setKeyframeSnapshots: keyframesState.setKeyframeSnapshots,
    timePercent: timeline.timePercent,
  };

  const slateHistory = useSlateHistory({
    snapshotSlate: entities.snapshotSlate,
    applySlate: entities.applySlate,
    isRestoringRef: entities.isRestoringRef,
    onMarkKeyframeSnapshotPending: keyframesState.markKeyframeSnapshotPending,
    logEvent,
  });

  historyApiRef.current = { pushHistory: slateHistory.pushHistory };

  const onReset = () => {
    logEvent("slate", "reset");
    entities.resetSlateEntities();
    slateHistory.clearSlateHistory();
    fieldViewport.resetFieldViewport();
    timeline.resetTimelinePlayback();
    keyframesState.resetKeyframeState();
  };

  const onSaveToPlaybook = () => {};

  const onDownload = () => {
    const appVersion = import.meta?.env?.VITE_APP_VERSION ?? null;
    const exportPayload = buildPlayExportV1({
      playName,
      appVersion,
      advancedSettings,
      allPlayersDisplay: entities.allPlayersDisplay,
      currentPlayerColor: entities.currentPlayerColor,
      camera: fieldViewport.camera,
      fieldRotation: fieldViewport.fieldRotation,
      playersById: entities.playersById,
      representedPlayerIds: entities.representedPlayerIds,
      ball: entities.ball,
      keyframes: keyframesState.keyframes,
      keyframeSnapshots: keyframesState.keyframeSnapshots,
      playback: {
        loopSeconds: timeline.loopSeconds,
        keyframeTolerance: keyframesState.keyframeTolerance,
        speedMultiplier: timeline.speedMultiplier,
        autoplayEnabled: timeline.autoplayEnabled,
      },
      coordinateSystem: {
        origin: "center",
        units: "px",
        notes: "World coordinates are centered; +x right, +y down.",
      },
    });
    downloadPlayExport(exportPayload, playName);
  };

  const handleToolChange = useCallback((tool) => {
    if (tool === "hand" || tool === "select" || tool === "addPlayer" || tool === "color") {
      setCanvasTool((prev) => (prev === tool ? prev : tool));
    }
  }, []);

  const handleKeyframeAddAttempt = useCallback(
    (payload) => {
      logEvent("controlPill", "keyframeAddAttempt", payload);
      if (payload?.added) return;
      if (payload?.reason === "max") {
        onShowMessage(
          "Keyframe limit reached",
          `Max ${payload.maxKeyframes ?? 30} keyframes`,
          "error"
        );
        return;
      }
      if (payload?.reason === "too-close") {
        onShowMessage(
          "Keyframe already nearby",
          "Selected the existing keyframe instead",
          "standard",
          2000
        );
      }
    },
    [logEvent, onShowMessage]
  );

  const loadPlayFromExport = useCallback(
    (exportObj) => {
      const { ok, error, play } = validatePlayExportV1(exportObj);
      if (!ok) {
        onShowMessage("Import failed", error, "error");
        return false;
      }

      let nextPlayers = {};
      let nextRepresented = [];
      Object.values(play.entities.playersById || {}).forEach((player) => {
        const result = addPlayerFromData(nextPlayers, nextRepresented, player, { preserveId: true });
        nextPlayers = result.playersById;
        nextRepresented = result.representedPlayerIds;
      });

      const incomingRepresented = Array.isArray(play.entities.representedPlayerIds)
        ? play.entities.representedPlayerIds
        : [];
      const representedSet = new Set([...nextRepresented, ...incomingRepresented]);
      nextRepresented = Array.from(representedSet);

      let nextKeyframes = [];
      let nextSnapshots = {};
      (play.timeline.keyframes || []).forEach((kf) => {
        const resolved = resolveSnapshotForKeyframe(kf, play.timeline.keyframeSnapshots || {});
        if (!resolved?.snapshot) return;
        const normalizedSnapshot = {
          playersById: { ...(resolved.snapshot.playersById || {}) },
          representedPlayerIds: [...(resolved.snapshot.representedPlayerIds || [])],
          ball: resolved.snapshot.ball ?? null,
        };
        const result = addKeyframeFromData(nextKeyframes, nextSnapshots, kf, normalizedSnapshot);
        nextKeyframes = result.keyframes;
        nextSnapshots = result.keyframeSnapshots;
      });

      const nextBall = play.entities.ball ?? INITIAL_BALL;
      const nextCamera = play.canvas?.camera ?? { x: 0, y: 0, zoom: 1 };
      const nextFieldRotation = play.canvas?.fieldRotation ?? 0;
      const nextSettings = play.settings?.advancedSettings ?? DEFAULT_ADVANCED_SETTINGS;
      const nextAllPlayersDisplay = play.settings?.allPlayersDisplay ?? entities.allPlayersDisplay;
      const nextCurrentPlayerColor =
        play.settings?.currentPlayerColor ?? entities.currentPlayerColor;
      const playback = play.timeline?.playback ?? {};

      keyframesState.clearKeyframeInternals();

      setPlayName(play.name);
      setAdvancedSettings(nextSettings);
      entities.setAllPlayersDisplay(nextAllPlayersDisplay);
      entities.setCurrentPlayerColor(nextCurrentPlayerColor);
      entities.loadEntitiesState({
        nextPlayers,
        nextRepresented,
        nextBall,
      });
      fieldViewport.loadFieldViewport({ nextCamera, nextFieldRotation });
      slateHistory.clearSlateHistory();
      keyframesState.loadKeyframeState({ nextKeyframes, nextSnapshots });
      timeline.setSpeedMultiplier(
        typeof playback.speedMultiplier === "number"
          ? playback.speedMultiplier
          : timeline.speedMultiplier
      );
      timeline.setAutoplayEnabled(
        typeof playback.autoplayEnabled === "boolean"
          ? playback.autoplayEnabled
          : timeline.autoplayEnabled
      );
      timeline.setLoopSeconds(
        typeof playback.loopSeconds === "number" && playback.loopSeconds > 0
          ? playback.loopSeconds
          : LOOP_SECONDS
      );
      keyframesState.setKeyframeTolerance(
        typeof playback.keyframeTolerance === "number" && playback.keyframeTolerance > 0
          ? playback.keyframeTolerance
          : KEYFRAME_TOLERANCE
      );
      timeline.setTimePercent(0);
      timeline.setIsPlaying(false);
      keyframesState.setSelectedKeyframe(null);
      return true;
    },
    [
      entities,
      fieldViewport,
      keyframesState,
      onShowMessage,
      setAdvancedSettings,
      slateHistory,
      timeline,
    ]
  );

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event) => {
    const file = event.target?.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > IMPORT_FILE_SIZE_LIMIT_BYTES) {
      onShowMessage("Import failed", "File too large (max 5 MB).", "error");
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      loadPlayFromExport(parsed);
    } catch (err) {
      void err;
      onShowMessage("Import failed", "Could not read or parse JSON.", "error");
    }
  };

  useEffect(() => {
    if (!logControlPillState) return;

    const logState = () => {
      const state = {
        timePercent: timeline.timePercent.toFixed(2),
        keyframes: keyframesState.keyframes,
        speedMultiplier: timeline.speedMultiplier,
        isPlaying: timeline.isPlaying,
        selectedKeyframe: keyframesState.selectedKeyframe,
        autoplayEnabled: timeline.autoplayEnabled,
        timestamp: new Date().toLocaleTimeString(),
      };

      console.log("=== ControlPill State (every 10s) ===");
      console.log("Time Percent:", state.timePercent + "%");
      console.log("Keyframes:", state.keyframes.length > 0 ? state.keyframes : "[]");
      console.log("Speed Multiplier:", state.speedMultiplier);
      console.log("Is Playing:", state.isPlaying);
      console.log("Selected Keyframe:", state.selectedKeyframe ?? "null");
      console.log("Autoplay Enabled:", state.autoplayEnabled);
      console.log("Timestamp:", state.timestamp);
      console.log("=====================================");
    };

    logState();
    const interval = setInterval(logState, 10000);
    return () => clearInterval(interval);
  }, [
    logControlPillState,
    keyframesState.keyframes,
    keyframesState.selectedKeyframe,
    timeline.autoplayEnabled,
    timeline.isPlaying,
    timeline.speedMultiplier,
    timeline.timePercent,
  ]);

  useEffect(() => {
    if (!logging?.controlPill) return;
    logEvent("controlPill", "keyframesChange", { keyframes: keyframesState.keyframes });
  }, [keyframesState.keyframes, logEvent, logging?.controlPill]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      entities.setSelectedPlayerIds([]);
      entities.setSelectedItemIds([]);
      keyframesState.setSelectedKeyframe(null);
      setCanvasTool("select");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [entities, keyframesState]);

  useEffect(() => {
    if (entities.isItemDraggingRef.current) return;
    const interpolatedSlate = buildInterpolatedSlate(
      timeline.timePercent,
      keyframesState.latestKeyframesRef.current,
      keyframesState.latestKeyframeSnapshotsRef.current,
      INITIAL_BALL,
      keyframesState.keyframeTolerance
    );
    if (!interpolatedSlate) return;
    entities.applySlate(interpolatedSlate);
  }, [
    entities,
    keyframesState.keyframeTolerance,
    keyframesState.latestKeyframeSnapshotsRef,
    keyframesState.latestKeyframesRef,
    timeline.timePercent,
  ]);

  return (
    <>
      <button
        onClick={() => {
          const messages = [
            { message: "Success!", subtitle: "Operation completed successfully", type: "success" },
            { message: "Error", subtitle: "Something went wrong", type: "error" },
            { message: "Info", subtitle: "This is a standard message", type: "standard" },
          ];
          const random = Math.floor(Math.random() * messages.length);
          const selected = messages[random];
          onShowMessage(selected.message, selected.subtitle, selected.type);
        }}
        className="absolute hidden top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-BrandOrange text-BrandBlack px-4 py-2 rounded-md font-DmSans font-semibold hover:bg-BrandOrange/90 transition-colors"
      >
        Test Message Popup
      </button>

      <WideSidebar
        onToolChange={handleToolChange}
        onUndo={slateHistory.onUndo}
        onRedo={slateHistory.onRedo}
        onReset={onReset}
        onAddPlayer={entities.handleAddPlayer}
        onPlayerColorChange={entities.handlePlayerColorChange}
        onDeleteSelected={entities.handleDeleteSelected}
      />
      <div className="flex-1 flex">
        <KonvaCanvasRoot
          tool={canvasTool}
          camera={fieldViewport.camera}
          setCamera={fieldViewport.setCamera}
          items={entities.items}
          fieldRotation={fieldViewport.fieldRotation}
          onPanStart={fieldViewport.pushFieldHistory}
          onItemChange={entities.handleItemChange}
          onItemDragStart={entities.handleItemDragStart}
          onItemDragEnd={entities.handleItemDragEnd}
          onCanvasAddPlayer={entities.handleCanvasAddPlayer}
          selectedPlayerIds={entities.selectedPlayerIds}
          selectedItemIds={entities.selectedItemIds}
          onSelectItem={entities.handleSelectItem}
          onMarqueeSelect={entities.onMarqueeSelect}
          allPlayersDisplay={entities.allPlayersDisplay}
          advancedSettings={advancedSettings}
        />
      </div>
      <ControlPill
        onTimePercentChange={timeline.handleTimePercentChange}
        onKeyframesChange={keyframesState.setKeyframes}
        onSpeedChange={timeline.setSpeedMultiplier}
        onPlayStateChange={timeline.setIsPlaying}
        onSelectedKeyframeChange={keyframesState.setSelectedKeyframe}
        onAutoplayChange={timeline.setAutoplayEnabled}
        externalTimePercent={timeline.timePercent}
        externalIsPlaying={timeline.isPlaying}
        externalSpeed={timeline.speedMultiplier}
        externalSelectedKeyframe={keyframesState.selectedKeyframe}
        externalAutoplayEnabled={timeline.autoplayEnabled}
        addKeyframeSignal={keyframesState.keyframeSignal}
        resetSignal={keyframesState.timelineResetSignal}
        onRequestAddKeyframe={keyframesState.requestAddKeyframe}
        onKeyframeAddAttempt={handleKeyframeAddAttempt}
      />

      <RightPanel
        playName={playName}
        onPlayNameChange={setPlayName}
        zoomPercent={fieldViewport.zoomPercent}
        onZoomIn={fieldViewport.zoomIn}
        onZoomOut={fieldViewport.zoomOut}
        onZoomPercentChange={fieldViewport.setZoomPercent}
        onRotateLeft={fieldViewport.onRotateLeft}
        onRotateCenter={fieldViewport.onRotateCenter}
        onRotateRight={fieldViewport.onRotateRight}
        onFieldUndo={fieldViewport.onFieldUndo}
        onFieldRedo={fieldViewport.onFieldRedo}
        onReset={onReset}
        playersById={entities.playersById}
        representedPlayerIds={entities.representedPlayerIds}
        selectedPlayerIds={entities.selectedPlayerIds}
        selectedPlayers={entities.selectedPlayers}
        onSelectPlayer={entities.handleSelectPlayer}
        onEditPlayer={entities.handleEditPlayer}
        onDeletePlayer={entities.handleDeletePlayer}
        allPlayersDisplay={entities.allPlayersDisplay}
        onAllPlayersDisplayChange={entities.setAllPlayersDisplay}
        onSelectedPlayersColorChange={entities.handleSelectedPlayersColorChange}
        advancedSettingsOpen={showAdvancedSettings}
        onOpenAdvancedSettings={() => setShowAdvancedSettings(true)}
        onSaveToPlaybook={onSaveToPlaybook}
        onDownload={onDownload}
        onImport={handleImportClick}
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportFileChange}
      />
      <PlayerEditPanel
        isOpen={entities.playerEditor.open}
        player={entities.playerEditor.id ? entities.playersById[entities.playerEditor.id] : null}
        draft={entities.playerEditor.draft}
        onChange={entities.handleEditDraftChange}
        onClose={entities.handleCloseEditPlayer}
        onSave={entities.handleSaveEditPlayer}
      />
      {showAdvancedSettings && (
        <AdvancedSettings
          value={advancedSettings}
          onChange={setAdvancedSettings}
          onReset={() => setAdvancedSettings(DEFAULT_ADVANCED_SETTINGS)}
          onClose={() => setShowAdvancedSettings(false)}
        />
      )}
    </>
  );
}

export default Slate;
