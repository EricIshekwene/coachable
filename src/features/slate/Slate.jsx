import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WideSidebar from "../../components/WideSidebar";
import ControlPill from "../../components/controlPill/ControlPill";
import RightPanel from "../../components/RightPanel";
import AdvancedSettings from "../../components/AdvancedSettings";
import KonvaCanvasRoot from "../../canvas/KonvaCanvasRoot";
import DrawToolsPill from "../../components/DrawToolsPill";
import PlayerEditPanel from "../../components/rightPanel/PlayerEditPanel";
import { buildPlayExport, downloadPlayExport } from "../../utils/exportPlay";
import { IMPORT_FILE_SIZE_LIMIT_BYTES, validatePlayImport } from "../../utils/importPlay";
import { DEFAULT_ADVANCED_SETTINGS, useAdvancedSettings } from "./hooks/useAdvancedSettings";
import { useFieldViewport } from "./hooks/useFieldViewport";
import { INITIAL_BALL, useSlateEntities } from "./hooks/useSlateEntities";
import { useSlateHistory } from "./hooks/useSlateHistory";
import {
  AnimationEngine,
  createEmptyAnimation,
  deleteKeyframeAtTime,
  getTrackKeyframeTimes,
  normalizeAnimation,
  samplePosesAtTime,
  upsertKeyframe,
} from "../../animation";
import { getLogs as getAnimDebugLogs, log as logAnimDebug } from "../../animation/debugLogger";
import { getLogs as getDrawDebugLogs, log as logDrawDebug } from "../../canvas/drawDebugLogger";
import { useDrawings } from "./hooks/useDrawings";

/**
 * Top-level feature component for the play editor. Wires together entities, history,
 * viewport, animation engine, playback, import/export, and renders the canvas,
 * sidebar, control pill, right panel, and settings modal.
 *
 * @module Slate
 */

const LOOP_SECONDS = 30;
const DEFAULT_SPEED_MULTIPLIER = 50;
const UI_TIME_UPDATE_INTERVAL_MS = 100;
const TICK_LOG_INTERVAL_MS = 100;

const speedToPlaybackRate = (speedMultiplier) => (0.25 + (speedMultiplier / 100) * 3.75) * 3;

const stampAnimationMeta = (nextAnimation, previousMeta) => {
  const createdAt = previousMeta?.createdAt || nextAnimation?.meta?.createdAt || new Date().toISOString();
  return {
    ...nextAnimation,
    meta: {
      ...(nextAnimation.meta || {}),
      createdAt,
      updatedAt: new Date().toISOString(),
    },
  };
};

function Slate({ onShowMessage }) {
  const [canvasTool, setCanvasTool] = useState("hand");
  const [drawSubTool, setDrawSubTool] = useState("draw");
  const [drawColor, setDrawColor] = useState("#FFFFFF");
  const [drawStrokeWidth, setDrawStrokeWidth] = useState(3);
  const [drawTension, setDrawTension] = useState(0.3);
  const [drawFontSize, setDrawFontSize] = useState(18);
  const [drawTextAlign, setDrawTextAlign] = useState("left");
  const [drawArrowHeadType, setDrawArrowHeadType] = useState("standard");
  const [selectedDrawingId, setSelectedDrawingId] = useState(null);
  const [textEditing, setTextEditing] = useState(null);
  const [playName, setPlayName] = useState("Name");
  const [speedMultiplier, setSpeedMultiplier] = useState(DEFAULT_SPEED_MULTIPLIER);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [selectedKeyframeMs, setSelectedKeyframeMs] = useState(null);
  const [timelineDisplayTimeMs, setTimelineDisplayTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationData, setAnimationData] = useState(() =>
    createEmptyAnimation({ durationMs: LOOP_SECONDS * 1000 })
  );

  const importInputRef = useRef(null);
  const historyApiRef = useRef({ pushHistory: () => {} });
  const animationRendererRef = useRef(null);
  const drawingHookRef = useRef(null);
  const animationDataRef = useRef(animationData);
  const playersByIdRef = useRef({});
  const ballRef = useRef(INITIAL_BALL);
  const representedPlayerIdsRef = useRef([]);
  const activeTrackIdsRef = useRef([]);
  const latestPosesRef = useRef({});
  const currentTimeRef = useRef(0);
  const lastUiUpdateRef = useRef(0);
  const lastTickLogRef = useRef(0);
  const timelineDraggingRef = useRef(false);
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new AnimationEngine({
      durationMs: LOOP_SECONDS * 1000,
      loop: true,
      playbackRate: speedToPlaybackRate(DEFAULT_SPEED_MULTIPLIER),
    });
  }

  const {
    advancedSettings,
    setAdvancedSettings,
    showAdvancedSettings,
    setShowAdvancedSettings,
    logEvent,
  } = useAdvancedSettings();

  const fieldViewport = useFieldViewport();
  const entities = useSlateEntities({
    historyApiRef,
    logEvent,
  });

  const drawingsState = useDrawings({ historyApiRef });

  const selectedDrawing = useMemo(
    () => drawingsState.drawings.find((d) => d.id === selectedDrawingId) || null,
    [drawingsState.drawings, selectedDrawingId]
  );

  useEffect(() => {
    logDrawDebug(`selection drawingId=${selectedDrawingId || "none"}`);
  }, [selectedDrawingId]);

  const compositeSnapshotSlate = useCallback(() => ({
    ...entities.snapshotSlate(),
    drawings: drawingsState.snapshotDrawings(),
  }), [entities.snapshotSlate, drawingsState.snapshotDrawings]);

  const compositeApplySlate = useCallback((snapshot) => {
    entities.applySlate(snapshot);
    drawingsState.applyDrawings(snapshot.drawings);
  }, [entities.applySlate, drawingsState.applyDrawings]);

  const slateHistory = useSlateHistory({
    snapshotSlate: compositeSnapshotSlate,
    applySlate: compositeApplySlate,
    isRestoringRef: entities.isRestoringRef,
    logEvent,
  });

  useEffect(() => {
    historyApiRef.current = { pushHistory: slateHistory.pushHistory };
  }, [slateHistory.pushHistory]);

  const setAnimationDataWithMeta = useCallback((updater) => {
    setAnimationData((prev) => {
      const base = normalizeAnimation(prev);
      const nextDraft = updater(base);
      if (!nextDraft) return prev;
      const normalized = normalizeAnimation(nextDraft);
      return stampAnimationMeta(normalized, base.meta);
    });
  }, []);

  useEffect(() => {
    animationDataRef.current = animationData;
  }, [animationData]);

  useEffect(() => {
    playersByIdRef.current = entities.playersById;
  }, [entities.playersById]);

  useEffect(() => {
    ballRef.current = entities.ball ?? INITIAL_BALL;
  }, [entities.ball]);

  useEffect(() => {
    representedPlayerIdsRef.current = entities.representedPlayerIds;
  }, [entities.representedPlayerIds]);

  const representedTrackIds = useMemo(() => {
    const ids = [...(entities.representedPlayerIds || [])];
    const ballId = entities.ball?.id;
    if (ballId) ids.push(ballId);
    return Array.from(new Set(ids));
  }, [entities.representedPlayerIds, entities.ball?.id]);

  const activeTrackIds = useMemo(() => {
    const ballId = entities.ball?.id;
    const selectedTrackIds = (entities.selectedItemIds || []).filter(
      (itemId) => Boolean(entities.playersById?.[itemId]) || itemId === ballId
    );
    return selectedTrackIds.length ? selectedTrackIds : representedTrackIds;
  }, [entities.selectedItemIds, entities.playersById, entities.ball?.id, representedTrackIds]);

  useEffect(() => {
    activeTrackIdsRef.current = activeTrackIds;
  }, [activeTrackIds]);

  const resolveTrackPose = useCallback((itemId) => {
    const rendererPose = animationRendererRef.current?.getCurrentPose?.(itemId);
    if (rendererPose && Number.isFinite(rendererPose.x) && Number.isFinite(rendererPose.y)) {
      return rendererPose;
    }
    const cachedPose = latestPosesRef.current[itemId];
    if (cachedPose && Number.isFinite(cachedPose.x) && Number.isFinite(cachedPose.y)) {
      return cachedPose;
    }
    const player = playersByIdRef.current?.[itemId];
    if (player) {
      return { x: player.x ?? 0, y: player.y ?? 0, r: 0 };
    }
    if (itemId === ballRef.current?.id) {
      return { x: ballRef.current?.x ?? 0, y: ballRef.current?.y ?? 0, r: 0 };
    }
    return null;
  }, []);

  const renderPoseAtTime = useCallback((timeMs) => {
    const allPlayers = playersByIdRef.current || {};
    const represented = representedPlayerIdsRef.current || [];
    const ball = ballRef.current;
    const baseIds = represented.length ? represented : Object.keys(allPlayers);
    const trackIds = Array.from(
      new Set([...(baseIds || []), ...(ball?.id ? [ball.id] : [])])
    );
    const fallbackPoses = {};

    trackIds.forEach((itemId) => {
      if (itemId === ball?.id) {
        fallbackPoses[itemId] = { x: ball.x ?? 0, y: ball.y ?? 0, r: 0 };
        return;
      }
      const player = allPlayers[itemId];
      if (!player) return;
      fallbackPoses[itemId] = { x: player.x ?? 0, y: player.y ?? 0, r: 0 };
    });

    const sampledPoses = samplePosesAtTime(
      animationDataRef.current,
      timeMs,
      fallbackPoses,
      trackIds
    );
    const previousPoses = latestPosesRef.current || {};
    const patch = {};
    Object.entries(sampledPoses).forEach(([itemId, pose]) => {
      const previous = previousPoses[itemId];
      if (!previous) {
        patch[itemId] = pose;
        return;
      }
      const moved =
        Math.abs((previous.x ?? 0) - (pose.x ?? 0)) > 0.01 ||
        Math.abs((previous.y ?? 0) - (pose.y ?? 0)) > 0.01 ||
        Math.abs((previous.r ?? 0) - (pose.r ?? 0)) > 0.01;
      if (moved) {
        patch[itemId] = pose;
      }
    });
    latestPosesRef.current = sampledPoses;
    if (Object.keys(patch).length) {
      animationRendererRef.current?.setPoses?.(patch);
    }
    return Object.keys(sampledPoses || {}).length;
  }, []);

  useEffect(() => {
    setAnimationDataWithMeta((base) => {
      const playerIds = Object.keys(entities.playersById || {});
      const ballId = entities.ball?.id;
      const validIds = new Set([...playerIds, ...(ballId ? [ballId] : [])]);
      const nextTracks = {};
      let changed = false;

      Object.entries(base.tracks || {}).forEach(([itemId, track]) => {
        if (!validIds.has(itemId)) {
          changed = true;
          return;
        }
        nextTracks[itemId] = track;
      });

      validIds.forEach((itemId) => {
        if (nextTracks[itemId]) return;
        nextTracks[itemId] = { keyframes: [] };
        changed = true;
      });

      if (!changed) return null;
      return { ...base, tracks: nextTracks };
    });
  }, [entities.playersById, entities.ball?.id, setAnimationDataWithMeta]);

  useEffect(() => {
    if (entities.isItemDraggingRef.current) return;
    renderPoseAtTime(currentTimeRef.current);
  }, [
    animationData,
    entities.representedPlayerIds,
    entities.ball?.id,
    entities.isItemDraggingRef,
    renderPoseAtTime,
  ]);

  const visibleKeyframesMs = useMemo(
    () => getTrackKeyframeTimes(animationData, activeTrackIds),
    [animationData, activeTrackIds]
  );

  useEffect(() => {
    if (selectedKeyframeMs === null || selectedKeyframeMs === undefined) return;
    if (visibleKeyframesMs.includes(selectedKeyframeMs)) return;
    setSelectedKeyframeMs(null);
  }, [selectedKeyframeMs, visibleKeyframesMs]);

  useEffect(() => {
    const engine = engineRef.current;
    const unsubscribe = engine.onTick(({ timeMs, isPlaying: playing, lastTickDeltaMs }) => {
      currentTimeRef.current = timeMs;
      const playersUpdated = renderPoseAtTime(timeMs);
      const roundedTime = Math.round(timeMs);
      const roundedDt = Math.round(lastTickDeltaMs || 0);

      setIsPlaying((prev) => (prev === playing ? prev : playing));

      const now = performance.now();
      if (now - lastTickLogRef.current >= TICK_LOG_INTERVAL_MS) {
        lastTickLogRef.current = now;
        logAnimDebug(`tick t=${roundedTime} dt=${roundedDt} playersUpdated=${playersUpdated}`);
      }

      if (!playing || now - lastUiUpdateRef.current >= UI_TIME_UPDATE_INTERVAL_MS) {
        lastUiUpdateRef.current = now;
        setTimelineDisplayTimeMs((prev) => (prev === roundedTime ? prev : roundedTime));
      }
    });

    engine.seek(engine.getTime(), { shouldLog: false, source: "engine" });
    return () => {
      unsubscribe();
    };
  }, [renderPoseAtTime]);

  useEffect(() => () => {
    engineRef.current?.dispose?.();
  }, []);

  useEffect(() => {
    engineRef.current.setDuration(animationData.durationMs);
  }, [animationData.durationMs]);

  useEffect(() => {
    engineRef.current.setLoop(autoplayEnabled);
  }, [autoplayEnabled]);

  useEffect(() => {
    engineRef.current.setPlaybackRate(speedToPlaybackRate(speedMultiplier));
  }, [speedMultiplier]);


  const onReset = () => {
    logEvent("slate", "reset");
    logDrawDebug("reset slate+drawings");
    engineRef.current.pause({ shouldLog: false });
    engineRef.current.seek(0, { shouldLog: false, source: "engine" });
    entities.resetSlateEntities();
    drawingsState.resetDrawings();
    setSelectedDrawingId(null);
    setTextEditing(null);
    slateHistory.clearSlateHistory();
    fieldViewport.resetFieldViewport();
    setAnimationData(createEmptyAnimation({ durationMs: LOOP_SECONDS * 1000 }));
    setSpeedMultiplier(DEFAULT_SPEED_MULTIPLIER);
    setAutoplayEnabled(true);
    setSelectedKeyframeMs(null);
    setTimelineDisplayTimeMs(0);
    timelineDraggingRef.current = false;
    setIsPlaying(false);
    currentTimeRef.current = 0;
    latestPosesRef.current = {};
    animationRendererRef.current?.clearPoses?.();
  };

  const onSaveToPlaybook = () => {};

  const onDownload = () => {
    const appVersion = import.meta?.env?.VITE_APP_VERSION ?? null;
    const exportPayload = buildPlayExport({
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
      animationData,
      playback: {
        speedMultiplier,
        autoplayEnabled,
      },
      coordinateSystem: {
        origin: "center",
        units: "px",
        notes: "World coordinates are centered; +x right, +y down.",
      },
      drawings: drawingsState.drawings,
    });
    const exportJson = JSON.stringify(exportPayload);
    const exportBytes = new TextEncoder().encode(exportJson).length;
    logAnimDebug(`export bytes=${exportBytes}`);
    downloadPlayExport(exportPayload, playName);
  };

  const handleDrawSubToolChange = useCallback((nextSubTool) => {
    setDrawSubTool((prevSubTool) => {
      if (prevSubTool === nextSubTool) return prevSubTool;
      logDrawDebug(`subToolChange prev=${prevSubTool} next=${nextSubTool}`);
      return nextSubTool;
    });
    setTextEditing(null);
    setSelectedDrawingId(null);
  }, []);

  const handleDrawColorChange = useCallback((nextColor) => {
    setDrawColor((prevColor) => {
      if (prevColor === nextColor) return prevColor;
      logDrawDebug(`style color prev=${prevColor} next=${nextColor}`);
      return nextColor;
    });
  }, []);

  const handleDrawStrokeWidthChange = useCallback((nextWidth) => {
    setDrawStrokeWidth((prevWidth) => {
      if (prevWidth === nextWidth) return prevWidth;
      logDrawDebug(`style strokeWidth prev=${prevWidth} next=${nextWidth}`);
      return nextWidth;
    });
  }, []);

  const handleDrawTensionChange = useCallback((nextTension) => {
    setDrawTension((prevTension) => {
      if (prevTension === nextTension) return prevTension;
      logDrawDebug(`style tension prev=${prevTension} next=${nextTension}`);
      return nextTension;
    });
  }, []);

  const handleDrawFontSizeChange = useCallback((nextFontSize) => {
    setDrawFontSize((prevFontSize) => {
      if (prevFontSize === nextFontSize) return prevFontSize;
      logDrawDebug(`style fontSize prev=${prevFontSize} next=${nextFontSize}`);
      return nextFontSize;
    });
  }, []);

  const handleDrawTextAlignChange = useCallback((nextAlign) => {
    setDrawTextAlign((prevAlign) => {
      if (prevAlign === nextAlign) return prevAlign;
      logDrawDebug(`style textAlign prev=${prevAlign} next=${nextAlign}`);
      return nextAlign;
    });
  }, []);

  const handleDrawArrowHeadTypeChange = useCallback((nextArrowHeadType) => {
    setDrawArrowHeadType((prevArrowHeadType) => {
      if (prevArrowHeadType === nextArrowHeadType) return prevArrowHeadType;
      logDrawDebug(`style arrowHead prev=${prevArrowHeadType} next=${nextArrowHeadType}`);
      return nextArrowHeadType;
    });
  }, []);

  const handleToolChange = useCallback((tool) => {
    logDrawDebug(`toolChange request=${tool}`);
    if (tool === "hand" || tool === "select" || tool === "pen" || tool === "addPlayer" || tool === "color") {
      setCanvasTool((prev) => {
        if (prev === tool) return prev;
        logDrawDebug(`toolChange applied prev=${prev} next=${tool}`);
        return tool;
      });
      setSelectedDrawingId(null);
      setTextEditing(null);
      return;
    }
    logDrawDebug(`toolChange ignored invalidTool=${tool}`);
  }, []);

  const getAuthoritativeTimeMs = useCallback(() => {
    return engineRef.current.getTime();
  }, []);

  const handleTimelineDragStateChange = useCallback((dragging) => {
    const nextDragging = Boolean(dragging);
    timelineDraggingRef.current = nextDragging;
  }, []);

  const handleCopyDebug = useCallback(async () => {
    const lines = getAnimDebugLogs(200);
    const payload = lines.length ? lines.join("\n") : "[ANIMDBG] no logs captured yet";
    try {
      await navigator.clipboard.writeText(payload);
      return true;
    } catch (error) {
      logAnimDebug(`copyDebug failed err=${error?.message || "clipboard unavailable"}`);
      onShowMessage("Copy debug failed", "Clipboard access was denied.", "error");
      return false;
    }
  }, [onShowMessage]);

  const handleCopyDrawDebug = useCallback(async () => {
    const lines = getDrawDebugLogs(300);
    const payload = lines.length ? lines.join("\n") : "[DRAWDBG] no logs captured yet";
    try {
      await navigator.clipboard.writeText(payload);
      return true;
    } catch (error) {
      logDrawDebug(`copyDrawDebug failed err=${error?.message || "clipboard unavailable"}`);
      onShowMessage("Copy draw debug failed", "Clipboard access was denied.", "error");
      return false;
    }
  }, [onShowMessage]);

  const seekTimeline = useCallback((timeMs, meta = {}) => {
    const source = typeof meta?.source === "string" ? meta.source : "engine";
    engineRef.current.seek(timeMs, { source });
  }, []);

  const pauseTimeline = useCallback(() => {
    engineRef.current.pause();
  }, []);

  const togglePlayback = useCallback(() => {
    engineRef.current.toggle();
  }, []);

  const handleAddKeyframe = useCallback(() => {
    const timeMs = Math.round(currentTimeRef.current);
    const targetTrackIds = activeTrackIdsRef.current || [];
    if (!targetTrackIds.length) return;

    setAnimationDataWithMeta((base) => {
      const nextTracks = { ...base.tracks };
      targetTrackIds.forEach((itemId) => {
        const pose = resolveTrackPose(itemId);
        if (!pose) return;
        nextTracks[itemId] = upsertKeyframe(nextTracks[itemId], {
          t: timeMs,
          x: pose.x,
          y: pose.y,
          ...(pose.r !== undefined ? { r: pose.r } : {}),
        });
        logAnimDebug(
          `addKeyframe item=${itemId} t=${timeMs} x=${Math.round(pose.x ?? 0)} y=${Math.round(pose.y ?? 0)}`
        );
      });
      return { ...base, tracks: nextTracks };
    });

    setSelectedKeyframeMs(timeMs);
  }, [resolveTrackPose, setAnimationDataWithMeta]);

  const handleDeleteKeyframe = useCallback(
    (timeMs) => {
      const targetTrackIds = activeTrackIdsRef.current || [];
      if (!targetTrackIds.length) return;
      const roundedTime = Math.round(timeMs);

      setAnimationDataWithMeta((base) => {
        const nextTracks = { ...base.tracks };
        targetTrackIds.forEach((itemId) => {
          nextTracks[itemId] = deleteKeyframeAtTime(nextTracks[itemId], roundedTime, 0.5);
          logAnimDebug(`deleteKeyframe item=${itemId} t=${roundedTime}`);
        });
        return { ...base, tracks: nextTracks };
      });
    },
    [setAnimationDataWithMeta]
  );

  const handleDeleteAllKeyframes = useCallback(() => {
    const targetTrackIds = activeTrackIdsRef.current || [];
    if (!targetTrackIds.length) return;

    setAnimationDataWithMeta((base) => {
      const nextTracks = { ...base.tracks };
      let changed = false;
      targetTrackIds.forEach((itemId) => {
        const existing = nextTracks[itemId]?.keyframes || [];
        if (!existing.length) return;
        nextTracks[itemId] = { keyframes: [] };
        changed = true;
      });
      if (!changed) return null;
      return { ...base, tracks: nextTracks };
    });
  }, [setAnimationDataWithMeta]);

  const upsertKeyframesAtCurrentTime = useCallback(
    (targetTrackIds, { source = "unknown" } = {}) => {
      const uniqueIds = Array.from(new Set((targetTrackIds || []).filter(Boolean)));
      if (!uniqueIds.length) return;

      const timeMs = Math.round(currentTimeRef.current);
      setAnimationDataWithMeta((base) => {
        const nextTracks = { ...base.tracks };
        let changed = false;
        const ballId = ballRef.current?.id;

        uniqueIds.forEach((itemId) => {
          if (!playersByIdRef.current?.[itemId] && itemId !== ballId) return;
          const pose = resolveTrackPose(itemId);
          if (!pose) return;
          nextTracks[itemId] = upsertKeyframe(nextTracks[itemId], {
            t: timeMs,
            x: pose.x,
            y: pose.y,
            ...(pose.r !== undefined ? { r: pose.r } : {}),
          });
          changed = true;
          logAnimDebug(
            `autoKeyframe source=${source} item=${itemId} t=${timeMs} x=${Math.round(pose.x ?? 0)} y=${Math.round(pose.y ?? 0)}`
          );
        });

        if (!changed) return null;
        return { ...base, tracks: nextTracks };
      });
    },
    [resolveTrackPose, setAnimationDataWithMeta]
  );

  const handleItemDragStart = useCallback(
    (id) => {
      engineRef.current.pause();
      entities.handleItemDragStart(id);
    },
    [entities]
  );

  const handleItemDragEnd = useCallback(
    (id) => {
      entities.handleItemDragEnd(id);
      if (engineRef.current.isPlaying()) return;

      const ballId = ballRef.current?.id;
      const selectedIds = entities.selectedItemIds || [];
      const selectedTrackIds = selectedIds.filter(
        (itemId) => Boolean(playersByIdRef.current?.[itemId]) || itemId === ballId
      );
      const targetTrackIds =
        selectedTrackIds.length && selectedTrackIds.includes(id)
          ? selectedTrackIds
          : playersByIdRef.current?.[id] || id === ballId
            ? [id]
            : [];
      upsertKeyframesAtCurrentTime(targetTrackIds, { source: "dragEnd" });
    },
    [entities, upsertKeyframesAtCurrentTime]
  );

  const handleItemChange = useCallback(
    (id, next, meta) => {
      entities.handleItemChange(id, next, meta);

      const ballId = ballRef.current?.id;
      const isTrackable = Boolean(playersByIdRef.current?.[id]) || id === ballId;
      if (!isTrackable) return;
      const patch = {};

      if (
        meta?.delta &&
        entities.selectedItemIds?.includes(id) &&
        entities.selectedItemIds.length > 1
      ) {
        entities.selectedItemIds.forEach((itemId) => {
          const selectedTrackable = Boolean(playersByIdRef.current?.[itemId]) || itemId === ballId;
          if (!selectedTrackable) return;
          const currentPose = resolveTrackPose(itemId);
          if (!currentPose) return;
          patch[itemId] = {
            ...currentPose,
            x: (currentPose.x ?? 0) + (meta.delta?.x ?? 0),
            y: (currentPose.y ?? 0) + (meta.delta?.y ?? 0),
          };
        });
      } else {
        const currentPose = resolveTrackPose(id) || { x: next.x, y: next.y };
        patch[id] = { ...currentPose, x: next.x, y: next.y };
      }

      if (!Object.keys(patch).length) return;
      Object.entries(patch).forEach(([itemId, pose]) => {
        latestPosesRef.current[itemId] = pose;
      });
      animationRendererRef.current?.setPoses?.(patch);
    },
    [entities, resolveTrackPose]
  );

  const loadPlayFromImport = useCallback(
    (importObj) => {
      const { ok, error, play } = validatePlayImport(importObj);
      if (!ok) {
        logAnimDebug(`import failed err=${error}`);
        onShowMessage("Import failed", error, "error");
        return false;
      }

      const nextPlayers = play.entities?.playersById || {};
      const nextRepresented = play.entities?.representedPlayerIds || Object.keys(nextPlayers);
      const nextBall = play.entities?.ball ?? INITIAL_BALL;
      const nextCamera = play.canvas?.camera ?? { x: 0, y: 0, zoom: 1 };
      const nextFieldRotation = play.canvas?.fieldRotation ?? 0;
      const nextSettings = play.settings?.advancedSettings ?? DEFAULT_ADVANCED_SETTINGS;
      const nextAllPlayersDisplay = play.settings?.allPlayersDisplay ?? entities.allPlayersDisplay;
      const nextCurrentPlayerColor =
        play.settings?.currentPlayerColor ?? entities.currentPlayerColor;
      const importedPlayback = play.playback ?? {};
      const nextSpeed =
        typeof importedPlayback.speedMultiplier === "number"
          ? importedPlayback.speedMultiplier
          : DEFAULT_SPEED_MULTIPLIER;
      const nextAutoplay =
        typeof importedPlayback.autoplayEnabled === "boolean"
          ? importedPlayback.autoplayEnabled
          : true;
      const importedAnimation = normalizeAnimation(play.animation);
      const trackCount = Object.keys(importedAnimation.tracks || {}).length;

      engineRef.current.pause({ shouldLog: false });
      engineRef.current.setDuration(importedAnimation.durationMs);
      engineRef.current.setPlaybackRate(speedToPlaybackRate(nextSpeed));
      engineRef.current.setLoop(nextAutoplay);
      engineRef.current.seek(0, { shouldLog: false, source: "engine" });

      setPlayName(play.name ?? "Name");
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
      setAnimationData(importedAnimation);
      setSpeedMultiplier(nextSpeed);
      setAutoplayEnabled(nextAutoplay);
      setSelectedKeyframeMs(null);
      setTimelineDisplayTimeMs(0);
      timelineDraggingRef.current = false;
      setIsPlaying(false);
      currentTimeRef.current = 0;
      latestPosesRef.current = {};
      animationRendererRef.current?.clearPoses?.();
      drawingsState.applyDrawings(play.drawings || []);
      setSelectedDrawingId(null);
      logAnimDebug(`import ok duration=${importedAnimation.durationMs} tracks=${trackCount}`);
      return true;
    },
    [
      entities,
      fieldViewport,
      onShowMessage,
      setAdvancedSettings,
      slateHistory,
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
      logAnimDebug("import failed err=File too large (max 5 MB).");
      onShowMessage("Import failed", "File too large (max 5 MB).", "error");
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      loadPlayFromImport(parsed);
    } catch (err) {
      logAnimDebug(`import failed err=${err?.message || "Could not read or parse JSON."}`);
      onShowMessage("Import failed", "Could not read or parse JSON.", "error");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        entities.setSelectedPlayerIds([]);
        entities.setSelectedItemIds([]);
        setSelectedDrawingId(null);
        setSelectedKeyframeMs(null);
        setCanvasTool("select");
        return;
      }

      const tagName = e.target?.tagName;
      const isTypingTarget =
        tagName === "INPUT" || tagName === "TEXTAREA" || e.target?.isContentEditable;
      if (isTypingTarget) return;

      const isDeleteKey = e.key === "Delete" || e.key === "Backspace";
      if (!isDeleteKey) return;

      // Delete selected drawing element
      if (selectedDrawingId && canvasTool === "pen" && drawSubTool === "select") {
        e.preventDefault();
        drawingsState.removeDrawing(selectedDrawingId);
        setSelectedDrawingId(null);
        return;
      }

      if (!entities.selectedPlayerIds?.length) return;
      e.preventDefault();
      entities.handleDeleteSelected();
      setSelectedKeyframeMs(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [entities, selectedDrawingId, canvasTool, drawSubTool, drawingsState]);

  const handleAnimationRendererReady = useCallback(() => {
    renderPoseAtTime(currentTimeRef.current);
  }, [renderPoseAtTime]);

  return (
    <>
      <WideSidebar
        onToolChange={handleToolChange}
        onUndo={slateHistory.onUndo}
        onRedo={slateHistory.onRedo}
        onReset={onReset}
        onAddPlayer={entities.handleAddPlayer}
        onPlayerColorChange={entities.handlePlayerColorChange}
        onDeleteSelected={entities.handleDeleteSelected}
      />
      <div className="flex-1 flex relative">
        <KonvaCanvasRoot
          tool={canvasTool}
          camera={fieldViewport.camera}
          setCamera={fieldViewport.setCamera}
          items={entities.items}
          fieldRotation={fieldViewport.fieldRotation}
          onPanStart={fieldViewport.pushFieldHistory}
          onItemChange={handleItemChange}
          onItemDragStart={handleItemDragStart}
          onItemDragEnd={handleItemDragEnd}
          onCanvasAddPlayer={entities.handleCanvasAddPlayer}
          selectedPlayerIds={entities.selectedPlayerIds}
          selectedItemIds={entities.selectedItemIds}
          onSelectItem={entities.handleSelectItem}
          onMarqueeSelect={entities.onMarqueeSelect}
          allPlayersDisplay={entities.allPlayersDisplay}
          advancedSettings={advancedSettings}
          animationRendererRef={animationRendererRef}
          onAnimationRendererReady={handleAnimationRendererReady}
          drawings={drawingsState.drawings}
          drawSubTool={drawSubTool}
          drawColor={drawColor}
          drawStrokeWidth={drawStrokeWidth}
          drawTension={drawTension}
          drawFontSize={drawFontSize}
          drawTextAlign={drawTextAlign}
          drawArrowHeadType={drawArrowHeadType}
          onAddDrawing={drawingsState.addDrawing}
          onRemoveDrawing={drawingsState.removeDrawing}
          onRemoveMultipleDrawings={drawingsState.removeMultipleDrawings}
          onSelectDrawing={setSelectedDrawingId}
          onUpdateDrawing={drawingsState.updateDrawing}
          selectedDrawingId={selectedDrawingId}
          textEditing={textEditing}
          onTextEditingChange={setTextEditing}
          drawingHookRef={drawingHookRef}
        />
        {textEditing && (
          <textarea
            className="absolute z-[60] bg-transparent border border-BrandOrange p-1 outline-none resize-none rounded"
            style={{
              left: textEditing.screenX,
              top: textEditing.screenY,
              fontSize: drawFontSize,
              fontFamily: "DmSans, sans-serif",
              color: drawColor,
              minWidth: 120,
              minHeight: 36,
            }}
            ref={(el) => {
              if (!el) return;
              // Mark as just-mounted so we can ignore the immediate blur
              // caused by the canvas mouseup completing the click cycle.
              el.dataset.mountedAt = String(Date.now());
              // Delay focus so it doesn't race with the click lifecycle.
              requestAnimationFrame(() => el.focus());
            }}
            onBlur={(e) => {
              const mountedAt = Number(e.target.dataset.mountedAt || 0);
              if (Date.now() - mountedAt < 300) return; // ignore blur from initial click
              const val = e.target.value;
              if (val?.trim()) {
                drawingHookRef.current?.commitText?.(val);
              } else {
                drawingHookRef.current?.cancelText?.();
              }
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                drawingHookRef.current?.commitText?.(e.target.value);
              }
              if (e.key === "Escape") {
                e.preventDefault();
                drawingHookRef.current?.cancelText?.();
              }
            }}
          />
        )}
      </div>
      {canvasTool === "pen" && (
        <DrawToolsPill
          activeSubTool={drawSubTool}
          onSubToolChange={handleDrawSubToolChange}
        />
      )}
      <ControlPill
        durationMs={animationData.durationMs}
        currentTimeMs={timelineDisplayTimeMs}
        isPlaying={isPlaying}
        speedMultiplier={speedMultiplier}
        autoplayEnabled={autoplayEnabled}
        selectedObjectCount={entities.selectedPlayerIds?.length ?? 0}
        keyframesMs={visibleKeyframesMs}
        selectedKeyframeMs={selectedKeyframeMs}
        onSeek={seekTimeline}
        onPause={pauseTimeline}
        onPlayToggle={togglePlayback}
        onSpeedChange={setSpeedMultiplier}
        onAddKeyframe={handleAddKeyframe}
        onDeleteKeyframe={handleDeleteKeyframe}
        onDeleteAllKeyframes={handleDeleteAllKeyframes}
        onDeleteSelectedObjects={entities.handleDeleteSelected}
        onSelectKeyframe={setSelectedKeyframeMs}
        onAutoplayChange={setAutoplayEnabled}
        getAuthoritativeTimeMs={getAuthoritativeTimeMs}
        onDragStateChange={handleTimelineDragStateChange}
      />

      <RightPanel
        canvasTool={canvasTool}
        drawSubTool={drawSubTool}
        drawColor={drawColor}
        drawStrokeWidth={drawStrokeWidth}
        drawTension={drawTension}
        drawFontSize={drawFontSize}
        drawTextAlign={drawTextAlign}
        drawArrowHeadType={drawArrowHeadType}
        onDrawColorChange={handleDrawColorChange}
        onDrawStrokeWidthChange={handleDrawStrokeWidthChange}
        onDrawTensionChange={handleDrawTensionChange}
        onDrawFontSizeChange={handleDrawFontSizeChange}
        onDrawTextAlignChange={handleDrawTextAlignChange}
        onDrawArrowHeadTypeChange={handleDrawArrowHeadTypeChange}
        selectedDrawing={selectedDrawing}
        onUpdateDrawing={drawingsState.updateDrawing}
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
          onCopyDebug={handleCopyDebug}
          onCopyDrawDebug={handleCopyDrawDebug}
          onClose={() => setShowAdvancedSettings(false)}
        />
      )}
    </>
  );
}

export default Slate;
