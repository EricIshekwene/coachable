import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WideSidebar from "../../components/WideSidebar";
import ControlPill from "../../components/controlPill/ControlPill";
import RightPanel from "../../components/RightPanel";
import AdvancedSettings from "../../components/AdvancedSettings";
import KonvaCanvasRoot from "../../canvas/KonvaCanvasRoot";
import DrawToolsPill from "../../components/DrawToolsPill";
import PlayerEditPanel from "../../components/rightPanel/PlayerEditPanel";
import { buildPlayExport, downloadPlayExport, downloadScreenshot, downloadVideo } from "../../utils/exportPlay";
import ScreenshotConfirmBar from "../../components/ScreenshotConfirmBar";
import ExportModal from "../../components/ExportModal";
import ExportOverlay from "../../components/ExportOverlay";
import { IMPORT_FILE_SIZE_LIMIT_BYTES, validatePlayImport } from "../../utils/importPlay";
import { rotatePoint } from "../../utils/rotatePoint";
import { DEFAULT_ADVANCED_SETTINGS, useAdvancedSettings } from "./hooks/useAdvancedSettings";
import { useFieldViewport } from "./hooks/useFieldViewport";
import { INITIAL_BALL, useSlateEntities, getNextPlayerId } from "./hooks/useSlateEntities";
import SavePrefabModal from "../../components/SavePrefabModal";
import { loadCustomPrefabs, saveCustomPrefabs, buildCustomPrefab, deleteCustomPrefab } from "../../utils/customPrefabs";
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
import { getLogs as getKeyToolDebugLogs, log as logKeyToolDebug } from "../../canvas/keyboardToolDebugLogger";
import { getLogs as getVideoExportDebugLogs, log as logVideoExport } from "../../utils/videoExportDebugLogger";
import { getLogs as getPlaceBallDebugLogs, log as logPlaceBallDebug } from "./placeBallDebugLogger";
import { getLogs as getRecordingDebugLogs, log as logRecordingDebug } from "./recordingDebugLogger";
import { useDrawings } from "./hooks/useDrawings";
import { useRecordingMode } from "./hooks/useRecordingMode";
import RecordingControlBar from "../../components/RecordingControlBar";
import RecordingCountdown from "../../components/RecordingCountdown";
import SaveToPlaybookModal from "../../components/SaveToPlaybookModal";

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
const POSE_UPDATE_EPSILON = 0.001;
const KEYBOARD_NUDGE_STEP = 2;
const KEYBOARD_NUDGE_FAST_STEP = 8;
const KEYBOARD_NUDGE_SNAP_THRESHOLD_PX = 5;
const VIDEO_EXPORT_TIMESLICE_MS = 1000;
const VIDEO_EXPORT_HIGH_LOAD_PIXELS = 2_500_000;
const VIDEO_EXPORT_MAX_FPS_HIGH_LOAD = 24;
const VIDEO_EXPORT_MAX_BITRATE_HIGH_LOAD = 8_000_000;
const KEYBOARD_NUDGE_BY_KEY = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

const waitForAnimationFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveRecorderMimeType = ({ preferRealtimeCodec = false } = {}) => {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = preferRealtimeCodec
    ? ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm"]
    : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || null;
};

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
  const [canvasTool, setCanvasTool] = useState("select");
  const [drawSubTool, setDrawSubTool] = useState("draw");
  const [drawColor, setDrawColor] = useState("#FFFFFF");
  const [drawOpacity, setDrawOpacity] = useState(1);
  const [drawStrokeWidth, setDrawStrokeWidth] = useState(3);
  const [drawTension, setDrawTension] = useState(0.3);
  const [drawFontSize, setDrawFontSize] = useState(18);
  const [drawTextAlign, setDrawTextAlign] = useState("left");
  const [drawArrowHeadType, setDrawArrowHeadType] = useState("standard");
  const [drawStabilization, setDrawStabilization] = useState(0);
  const [eraserSize, setEraserSize] = useState(10);
  const [drawShapeType, setDrawShapeType] = useState("rect");
  const [drawShapeStrokeColor, setDrawShapeStrokeColor] = useState("#FFFFFF");
  const [drawShapeFill, setDrawShapeFill] = useState("transparent");
  const [selectedDrawingIds, setSelectedDrawingIds] = useState([]);
  const drawingSelectionRef = useRef(null);
  const [textEditing, setTextEditing] = useState(null);
  const [screenshotMode, setScreenshotMode] = useState(false);
  const [screenshotRegion, setScreenshotRegion] = useState(null);
  const screenshotApiRef = useRef(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState(null);
  const [exportProgress, setExportProgress] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [playName, setPlayName] = useState("Name");
  const [customPrefabs, setCustomPrefabs] = useState(() => loadCustomPrefabs());
  const [savePrefabModalOpen, setSavePrefabModalOpen] = useState(false);
  const [saveToPlaybookOpen, setSaveToPlaybookOpen] = useState(false);
  const [playbookThumbnail, setPlaybookThumbnail] = useState(null);
  const pendingPrefabRef = useRef(null);
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
  const ballsByIdRef = useRef({ [INITIAL_BALL.id]: { ...INITIAL_BALL } });
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

  const selectedDrawings = useMemo(
    () => drawingsState.drawings.filter((d) => selectedDrawingIds.includes(d.id)),
    [drawingsState.drawings, selectedDrawingIds]
  );
  const selectedDrawing = selectedDrawings.length === 1 ? selectedDrawings[0] : null;

  useEffect(() => {
    logDrawDebug(`selection drawingIds=[${selectedDrawingIds.join(",")}]`);
  }, [selectedDrawingIds]);

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
    ballsByIdRef.current = entities.ballsById ?? { [INITIAL_BALL.id]: { ...INITIAL_BALL } };
  }, [entities.ballsById]);

  useEffect(() => {
    representedPlayerIdsRef.current = entities.representedPlayerIds;
  }, [entities.representedPlayerIds]);

  const representedTrackIds = useMemo(() => {
    const ids = [...(entities.representedPlayerIds || [])];
    ids.push(...Object.keys(entities.ballsById || {}));
    return Array.from(new Set(ids));
  }, [entities.representedPlayerIds, entities.ballsById]);

  const activeTrackIds = useMemo(() => {
    const selectedTrackIds = (entities.selectedItemIds || []).filter(
      (itemId) => Boolean(entities.playersById?.[itemId]) || Boolean(entities.ballsById?.[itemId])
    );
    return selectedTrackIds.length ? selectedTrackIds : representedTrackIds;
  }, [entities.selectedItemIds, entities.playersById, entities.ballsById, representedTrackIds]);

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
    const ball = ballsByIdRef.current?.[itemId];
    if (ball) {
      return { x: ball.x ?? 0, y: ball.y ?? 0, r: 0 };
    }
    return null;
  }, []);

  const renderPoseAtTime = useCallback((timeMs, options = {}) => {
    const flushRenderer = Boolean(options?.flushRenderer);
    const allPlayers = playersByIdRef.current || {};
    const ballsById = ballsByIdRef.current || {};
    const represented = representedPlayerIdsRef.current || [];
    const baseIds = represented.length ? represented : Object.keys(allPlayers);
    const trackIds = Array.from(
      new Set([...(baseIds || []), ...Object.keys(ballsById)])
    );
    const fallbackPoses = {};

    trackIds.forEach((itemId) => {
      if (ballsById[itemId]) {
        fallbackPoses[itemId] = {
          x: ballsById[itemId].x ?? 0,
          y: ballsById[itemId].y ?? 0,
          r: 0,
        };
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
        Math.abs((previous.x ?? 0) - (pose.x ?? 0)) > POSE_UPDATE_EPSILON ||
        Math.abs((previous.y ?? 0) - (pose.y ?? 0)) > POSE_UPDATE_EPSILON ||
        Math.abs((previous.r ?? 0) - (pose.r ?? 0)) > POSE_UPDATE_EPSILON;
      if (moved) {
        patch[itemId] = pose;
      }
    });
    latestPosesRef.current = sampledPoses;
    if (Object.keys(patch).length) {
      animationRendererRef.current?.setPoses?.(
        patch,
        flushRenderer ? { flush: true } : undefined
      );
    }
    return Object.keys(sampledPoses || {}).length;
  }, []);

  const recording = useRecordingMode({
    animationRendererRef,
    setAnimationDataWithMeta,
    animationDataRef,
    playersByIdRef,
    ballsByIdRef,
  });

  // Sync recording states only when player/ball IDs change (not positions).
  const recordableIdKeysStr = useMemo(
    () => [...Object.keys(entities.playersById || {}), ...Object.keys(entities.ballsById || {})].sort().join(","),
    [entities.playersById, entities.ballsById]
  );
  useEffect(() => {
    if (recording.recordingModeEnabled) {
      recording.syncPlayerStates(entities.playersById, entities.ballsById);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordableIdKeysStr, recording.recordingModeEnabled, recording.syncPlayerStates]);

  useEffect(() => {
    setAnimationDataWithMeta((base) => {
      const playerIds = Object.keys(entities.playersById || {});
      const ballIds = Object.keys(entities.ballsById || {});
      const validIds = new Set([...playerIds, ...ballIds]);
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
  }, [entities.playersById, entities.ballsById, setAnimationDataWithMeta]);

  useEffect(() => {
    if (entities.isItemDraggingRef.current) return;
    renderPoseAtTime(currentTimeRef.current);
  }, [
    animationData,
    entities.representedPlayerIds,
    entities.ballsById,
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

  const rotateEntitiesByDelta = useCallback((delta) => {
    if (delta === 0) return;

    historyApiRef.current?.pushHistory?.();

    entities.setPlayersById((prev) => {
      const updated = {};
      for (const [id, player] of Object.entries(prev)) {
        const { x, y } = rotatePoint(player.x ?? 0, player.y ?? 0, delta);
        updated[id] = { ...player, x, y };
      }
      return updated;
    });

    entities.setBallsById((prev) => {
      const next = { ...(prev || {}) };
      Object.entries(next).forEach(([id, ball]) => {
        const { x, y } = rotatePoint(ball?.x ?? 0, ball?.y ?? 0, delta);
        next[id] = { ...ball, x, y };
      });
      return next;
    });

    setAnimationDataWithMeta((base) => {
      const nextTracks = {};
      let changed = false;
      for (const [trackId, track] of Object.entries(base.tracks || {})) {
        const nextKeyframes = (track.keyframes || []).map((kf) => {
          const { x, y } = rotatePoint(kf.x ?? 0, kf.y ?? 0, delta);
          changed = true;
          return { ...kf, x, y };
        });
        nextTracks[trackId] = { ...track, keyframes: nextKeyframes };
      }
      if (!changed) return null;
      return { ...base, tracks: nextTracks };
    });
  }, [entities.setPlayersById, entities.setBallsById, setAnimationDataWithMeta]);

  const handleRotateLeft = useCallback(() => {
    rotateEntitiesByDelta(-90);
    fieldViewport.pushFieldHistory();
    fieldViewport.setFieldRotation((prev) => prev - 90);
  }, [rotateEntitiesByDelta, fieldViewport.pushFieldHistory, fieldViewport.setFieldRotation]);

  const handleRotateCenter = useCallback(() => {
    rotateEntitiesByDelta(180);
    fieldViewport.pushFieldHistory();
    fieldViewport.setFieldRotation((prev) => prev + 180);
  }, [rotateEntitiesByDelta, fieldViewport.pushFieldHistory, fieldViewport.setFieldRotation]);

  const handleRotateRight = useCallback(() => {
    rotateEntitiesByDelta(90);
    fieldViewport.pushFieldHistory();
    fieldViewport.setFieldRotation((prev) => prev + 90);
  }, [rotateEntitiesByDelta, fieldViewport.pushFieldHistory, fieldViewport.setFieldRotation]);

  const handleDebugRotate = useCallback(() => {
    logAnimDebug(`debugRotate current=${fieldViewport.fieldRotation} rotating +90`);
    handleRotateRight();
  }, [fieldViewport.fieldRotation, handleRotateRight]);

  const onReset = () => {
    logEvent("slate", "reset");
    logDrawDebug("reset slate+drawings");
    engineRef.current.pause({ shouldLog: false });
    engineRef.current.seek(0, { shouldLog: false, source: "engine" });
    entities.resetSlateEntities();
    drawingsState.resetDrawings();
    setSelectedDrawingIds([]);
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

  const onSaveToPlaybook = useCallback(() => {
    // Generate a thumbnail preview of the current canvas.
    const bounds = screenshotApiRef.current?.getFieldWorldBounds?.();
    if (bounds) {
      try {
        const dataUrl = screenshotApiRef.current.captureRegion(bounds, { pixelRatio: 1 });
        setPlaybookThumbnail(dataUrl);
      } catch {
        setPlaybookThumbnail(null);
      }
    } else {
      setPlaybookThumbnail(null);
    }
    setSaveToPlaybookOpen(true);
  }, []);

  const playbookPlayData = useMemo(() => {
    const appVersion = import.meta?.env?.VITE_APP_VERSION ?? null;
    return buildPlayExport({
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
      ballsById: entities.ballsById,
      animationData,
      playback: { speedMultiplier, autoplayEnabled },
      coordinateSystem: {
        origin: "center",
        units: "px",
        notes: "World coordinates are centered; +x right, +y down.",
      },
      drawings: drawingsState.drawings,
    });
  }, [playName, advancedSettings, entities, fieldViewport, animationData, speedMultiplier, autoplayEnabled, drawingsState.drawings]);

  const handlePlaybookSaved = useCallback((entry) => {
    onShowMessage?.("Saved to Playbook", `"${entry.playName}" saved successfully.`, "success");
  }, [onShowMessage]);

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
      ballsById: entities.ballsById,
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

  // --- Export handlers ---

  const [exportInitialFormat, setExportInitialFormat] = useState("photo");

  const handleScreenshotExportClick = useCallback(() => {
    setExportInitialFormat("photo");
    setExportModalOpen(true);
  }, []);

  const handleVideoExportClick = useCallback(() => {
    setExportInitialFormat("video");
    setExportModalOpen(true);
  }, []);

  const clearSelectionsForCapture = useCallback(() => {
    const prevDrawingIds = [...selectedDrawingIds];
    const prevPlayerIds = entities.selectedPlayerIds ? [...entities.selectedPlayerIds] : [];
    setSelectedDrawingIds([]);
    entities.handleSelectItem?.(null, null, { mode: "clear" });
    return { prevDrawingIds, prevPlayerIds };
  }, [selectedDrawingIds, entities]);

  const restoreSelections = useCallback(({ prevDrawingIds, prevPlayerIds }) => {
    setSelectedDrawingIds(prevDrawingIds);
    if (prevPlayerIds.length > 0) {
      prevPlayerIds.forEach((id) =>
        entities.handleSelectItem?.(id, null, { mode: "add" })
      );
    }
  }, [entities]);

  const capturePhoto = useCallback(async (worldRect, quality = {}) => {
    const api = screenshotApiRef.current;
    if (!api?.captureRegion) {
      onShowMessage?.("Export failed", "Capture API not ready.", "error");
      return;
    }
    try {
      const saved = clearSelectionsForCapture();
      await new Promise((r) => requestAnimationFrame(r));
      const dataUrl = api.captureRegion(worldRect, { pixelRatio: quality.pixelRatio || 2 });
      await downloadScreenshot(dataUrl, playName);
      onShowMessage?.("Photo exported", "Download starting...", "success");
      restoreSelections(saved);
    } catch (err) {
      onShowMessage?.("Export failed", String(err), "error");
    }
  }, [playName, onShowMessage, clearSelectionsForCapture, restoreSelections]);

  const recordVideoExport = useCallback(async (worldRect, durationSec, quality = {}) => {
    logVideoExport(`=== VIDEO EXPORT START ===`);
    logVideoExport(`worldRect: x=${worldRect?.x} y=${worldRect?.y} w=${worldRect?.width} h=${worldRect?.height}`);
    logVideoExport(`durationSec=${durationSec} quality=${JSON.stringify(quality)}`);

    const api = screenshotApiRef.current;
    if (!api?.captureFrameCanvas || !api?.hideOverlays || !api?.showOverlays) {
      const reason = "Capture API not ready";
      logVideoExport(
        `ABORT: ${reason} - captureFrameCanvas=${!!api?.captureFrameCanvas} hideOverlays=${!!api?.hideOverlays} showOverlays=${!!api?.showOverlays}`
      );
      onShowMessage?.("Export failed", reason, "error");
      setExportError(reason);
      return;
    }

    const engine = engineRef.current;
    const playDurationMs = Math.max(
      1,
      Number(animationDataRef.current?.durationMs) || LOOP_SECONDS * 1000
    );
    const requestedDurationSec = Math.max(1, Number(durationSec) || 1);
    const requestedFps = Math.max(1, Number(quality.fps) || 30);
    const pixelRatio = Math.max(0.5, Number(quality.pixelRatio) || 2);
    const requestedBitrate = Math.max(250_000, Number(quality.bitrate) || 5_000_000);
    let fps = requestedFps;
    let bitrate = requestedBitrate;

    logVideoExport(
      `requested playDurationMs=${playDurationMs} durationSec=${requestedDurationSec} fps=${requestedFps} pixelRatio=${pixelRatio} bitrate=${requestedBitrate}`
    );

    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);

    let saved = null;
    let wasPlaying = false;
    let stream = null;
    let recorder = null;

    try {
      saved = clearSelectionsForCapture();
      wasPlaying = engine.playing;
      engine.pause({ shouldLog: false });
      logVideoExport(`engine paused, wasPlaying=${wasPlaying}`);
      await waitForAnimationFrame();

      api.hideOverlays();
      api.flushRender?.();
      logVideoExport(`overlays hidden`);

      const firstCanvas = api.captureFrameCanvas(worldRect, { pixelRatio, flush: true });
      if (!firstCanvas) {
        throw new Error("captureFrameCanvas returned null on first frame - stage may not be mounted");
      }
      const framePixels = firstCanvas.width * firstCanvas.height;
      logVideoExport(`firstCanvas: ${firstCanvas.width}x${firstCanvas.height}`);

      if (framePixels >= VIDEO_EXPORT_HIGH_LOAD_PIXELS && fps > VIDEO_EXPORT_MAX_FPS_HIGH_LOAD) {
        logVideoExport(
          `high-load capture (${framePixels} px) - clamping fps ${fps} -> ${VIDEO_EXPORT_MAX_FPS_HIGH_LOAD}`
        );
        fps = VIDEO_EXPORT_MAX_FPS_HIGH_LOAD;
      }
      if (framePixels >= VIDEO_EXPORT_HIGH_LOAD_PIXELS && bitrate > VIDEO_EXPORT_MAX_BITRATE_HIGH_LOAD) {
        logVideoExport(
          `high-load capture (${framePixels} px) - clamping bitrate ${bitrate} -> ${VIDEO_EXPORT_MAX_BITRATE_HIGH_LOAD}`
        );
        bitrate = VIDEO_EXPORT_MAX_BITRATE_HIGH_LOAD;
      }

      const totalFrames = Math.max(1, Math.ceil(fps * requestedDurationSec));
      const frameDurationMs = 1000 / fps;
      logVideoExport(
        `effective fps=${fps} pixelRatio=${pixelRatio} bitrate=${bitrate} totalFrames=${totalFrames} framePixels=${framePixels}`
      );

      const offscreen = document.createElement("canvas");
      offscreen.width = firstCanvas.width;
      offscreen.height = firstCanvas.height;
      const ctx = offscreen.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get 2D context from offscreen canvas");
      }
      ctx.clearRect(0, 0, offscreen.width, offscreen.height);
      ctx.drawImage(firstCanvas, 0, 0);

      stream = offscreen.captureStream(0);
      let videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error("captureStream produced no video track");
      }
      if (!videoTrack.requestFrame) {
        stream.getTracks().forEach((track) => track.stop());
        stream = offscreen.captureStream(fps);
        videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) {
          throw new Error("captureStream(fps) produced no video track");
        }
      }
      logVideoExport(`stream created, track=${videoTrack.label}, requestFrame=${typeof videoTrack.requestFrame}`);

      const preferRealtimeCodec = framePixels >= VIDEO_EXPORT_HIGH_LOAD_PIXELS || fps >= 30;
      const mimeType = resolveRecorderMimeType({ preferRealtimeCodec });
      if (!mimeType) {
        throw new Error("Browser does not support WebM video recording (MediaRecorder)");
      }
      logVideoExport(`mimeType=${mimeType}`);

      let recorderError = null;
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: bitrate,
      });
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
        logVideoExport(`chunk received: ${e.data.size} bytes (total chunks=${chunks.length})`);
      };
      recorder.onerror = (e) => {
        recorderError = e.error || new Error("MediaRecorder error event");
        logVideoExport(`MediaRecorder error`, recorderError);
      };

      const recorderStopped = new Promise((resolve) => {
        recorder.onstop = resolve;
      });
      recorder.start(VIDEO_EXPORT_TIMESLICE_MS);
      logVideoExport(`recorder started, state=${recorder.state}, timesliceMs=${VIDEO_EXPORT_TIMESLICE_MS}`);
      const exportStartWallMs = performance.now();

      let lastLoggedFrame = -1;
      for (let i = 0; i < totalFrames; i++) {
        if (recorderError) {
          throw recorderError;
        }

        const playTimeMs = (i / totalFrames) * playDurationMs;
        renderPoseAtTime(playTimeMs, { flushRenderer: true });
        api.flushRender?.();

        const frameCanvas = api.captureFrameCanvas(worldRect, { pixelRatio, flush: false });
        if (!frameCanvas) {
          throw new Error(
            `captureFrameCanvas returned null at frame ${i}/${totalFrames} (playTimeMs=${playTimeMs.toFixed(1)})`
          );
        }

        ctx.clearRect(0, 0, offscreen.width, offscreen.height);
        ctx.drawImage(frameCanvas, 0, 0);
        if (videoTrack.requestFrame) videoTrack.requestFrame();

        await waitForAnimationFrame();
        const targetNextFrameAt = exportStartWallMs + (i + 1) * frameDurationMs;
        const remainingMs = targetNextFrameAt - performance.now();
        if (remainingMs > 1) {
          await sleep(remainingMs);
        }

        if ((i + 1) % Math.max(1, Math.round(fps)) === 0 && recorder.state === "recording") {
          recorder.requestData?.();
        }

        if (i - lastLoggedFrame >= 30 || i === totalFrames - 1) {
          logVideoExport(
            `frame ${i + 1}/${totalFrames} playTimeMs=${playTimeMs.toFixed(1)} recorderState=${recorder.state}`
          );
          lastLoggedFrame = i;
        }
        if (i % 10 === 0) {
          setExportProgress((i + 1) / totalFrames);
        }
      }

      logVideoExport(`all ${totalFrames} frames rendered, stopping recorder`);
      setExportProgress(1);
      recorder.stop();
      await recorderStopped;
      logVideoExport(`recorder stopped, ${chunks.length} chunks collected`);

      if (recorderError) {
        throw recorderError;
      }
      if (chunks.length === 0) {
        throw new Error("MediaRecorder produced 0 data chunks - video is empty");
      }

      const blob = new Blob(chunks, { type: mimeType });
      logVideoExport(`blob created: ${(blob.size / 1024 / 1024).toFixed(2)} MB, type=${blob.type}`);
      downloadVideo(blob, playName);
      onShowMessage?.("Video exported", "Download starting...", "success");
      logVideoExport(`=== VIDEO EXPORT SUCCESS ===`);

      api.showOverlays();
      restoreSelections(saved);
      if (wasPlaying) engine.play();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : "";
      logVideoExport(`=== VIDEO EXPORT FAILED ===`);
      logVideoExport(`error: ${errorMsg}`);
      if (errorStack) logVideoExport(`stack: ${errorStack}`);
      onShowMessage?.("Export failed", errorMsg, "error");
      setExportError(errorMsg);
      screenshotApiRef.current?.showOverlays?.();
      if (saved) restoreSelections(saved);
      if (wasPlaying) engineRef.current?.play?.();
    } finally {
      try {
        if (recorder?.state === "recording") {
          recorder.stop();
        }
      } catch {
        // no-op: recorder already stopped
      }
      stream?.getTracks?.().forEach((track) => track.stop());
      setIsExporting(false);
      setExportProgress(null);
    }
  }, [playName, onShowMessage, clearSelectionsForCapture, restoreSelections, renderPoseAtTime]);
  const handleExportModalSubmit = useCallback(({ format, region, durationSec, quality }) => {
    setExportModalOpen(false);
    const config = { format, region, durationSec, quality };
    setExportConfig(config);

    if (region === "custom") {
      setScreenshotMode(true);
      setScreenshotRegion(null);
      logDrawDebug(`export custom region mode format=${format}`);
      return;
    }

    // Full field — execute immediately
    const bounds = screenshotApiRef.current?.getFieldWorldBounds?.();
    if (!bounds) {
      onShowMessage?.("Export failed", "Field bounds not available.", "error");
      setExportConfig(null);
      return;
    }

    if (format === "photo") {
      capturePhoto(bounds, quality).then(() => setExportConfig(null));
    } else {
      recordVideoExport(bounds, durationSec, quality).then(() => setExportConfig(null));
    }
  }, [onShowMessage, capturePhoto, recordVideoExport]);

  const handleScreenshotConfirm = useCallback(async () => {
    if (!screenshotRegion) {
      onShowMessage?.("Export failed", "No region selected.", "error");
      return;
    }
    const config = exportConfig || { format: "photo" };
    setScreenshotMode(false);
    setScreenshotRegion(null);

    if (config.format === "video") {
      await recordVideoExport(screenshotRegion, config.durationSec || 30, config.quality);
    } else {
      await capturePhoto(screenshotRegion, config.quality);
    }
    setExportConfig(null);
  }, [screenshotRegion, exportConfig, onShowMessage, capturePhoto, recordVideoExport]);

  const handleScreenshotCancel = useCallback(() => {
    setScreenshotMode(false);
    setScreenshotRegion(null);
    setExportConfig(null);
    logDrawDebug("export region selection cancelled");
  }, []);

  const handleScreenshotRegionChange = useCallback((region) => {
    setScreenshotRegion(region);
  }, []);

  const handleDrawSubToolChange = useCallback((nextSubTool, opts) => {
    setDrawSubTool((prevSubTool) => {
      if (prevSubTool === nextSubTool) {
        logKeyToolDebug(`drawSubTool unchanged subTool=${nextSubTool}`);
        return prevSubTool;
      }
      logDrawDebug(`subToolChange prev=${prevSubTool} next=${nextSubTool}`);
      logKeyToolDebug(`drawSubTool changed prev=${prevSubTool} next=${nextSubTool}`);
      return nextSubTool;
    });
    setTextEditing(null);
    // Allow callers to preserve or set a specific selection (e.g. text tool auto-select)
    if (opts?.keepSelection) return;
    if (opts?.selectIds) {
      setSelectedDrawingIds(opts.selectIds);
    } else {
      setSelectedDrawingIds([]);
    }
  }, []);

  const handleDrawColorChange = useCallback((nextColor) => {
    setDrawColor((prevColor) => {
      if (prevColor === nextColor) return prevColor;
      logDrawDebug(`style color prev=${prevColor} next=${nextColor}`);
      return nextColor;
    });
  }, []);

  const handleDrawOpacityChange = useCallback((nextOpacity) => {
    setDrawOpacity((prevOpacity) => {
      if (prevOpacity === nextOpacity) return prevOpacity;
      logDrawDebug(`style opacity prev=${prevOpacity} next=${nextOpacity}`);
      return nextOpacity;
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

  const handleEraserSizeChange = useCallback((nextSize) => {
    setEraserSize((prev) => {
      if (prev === nextSize) return prev;
      logDrawDebug(`style eraserSize prev=${prev} next=${nextSize}`);
      return nextSize;
    });
  }, []);

  const handleDrawShapeTypeChange = useCallback((nextType) => {
    setDrawShapeType((prev) => {
      if (prev === nextType) return prev;
      logDrawDebug(`style shapeType prev=${prev} next=${nextType}`);
      return nextType;
    });
  }, []);

  const handleDrawShapeStrokeColorChange = useCallback((nextColor) => {
    setDrawShapeStrokeColor((prev) => {
      if (prev === nextColor) return prev;
      logDrawDebug(`style shapeStrokeColor prev=${prev} next=${nextColor}`);
      return nextColor;
    });
  }, []);

  const handleDrawShapeFillChange = useCallback((nextFill) => {
    setDrawShapeFill((prev) => {
      if (prev === nextFill) return prev;
      logDrawDebug(`style shapeFill prev=${prev} next=${nextFill}`);
      return nextFill;
    });
  }, []);

  const handleToolChange = useCallback((tool) => {
    logDrawDebug(`toolChange request=${tool}`);
    logKeyToolDebug(`toolChange request=${tool}`);
    if (tool === "hand" || tool === "select" || tool === "pen" || tool === "addPlayer" || tool === "addBall" || tool === "addCone" || tool === "color" || tool === "prefab") {
      setCanvasTool((prev) => {
        if (prev === tool) {
          logKeyToolDebug(`toolChange noop current=${prev}`);
          return prev;
        }
        logDrawDebug(`toolChange applied prev=${prev} next=${tool}`);
        logKeyToolDebug(`toolChange applied prev=${prev} next=${tool}`);
        if (prev === "prefab" && tool !== "prefab") {
          pendingPrefabRef.current = null;
        }
        return tool;
      });
      setSelectedDrawingIds([]);
      setTextEditing(null);
      return;
    }
    logDrawDebug(`toolChange ignored invalidTool=${tool}`);
    logKeyToolDebug(`toolChange ignored invalidTool=${tool}`);
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

  const handleCopyKeyToolDebug = useCallback(async () => {
    const lines = getKeyToolDebugLogs(500);
    const payload = lines.length ? lines.join("\n") : "[KEYDBG] no logs captured yet";
    try {
      await navigator.clipboard.writeText(payload);
      return true;
    } catch (error) {
      logKeyToolDebug(`copyKeyToolDebug failed err=${error?.message || "clipboard unavailable"}`);
      onShowMessage("Copy keyboard debug failed", "Clipboard access was denied.", "error");
      return false;
    }
  }, [onShowMessage]);

  const handleCopyVideoExportDebug = useCallback(async () => {
    const lines = getVideoExportDebugLogs(400);
    const payload = lines.length ? lines.join("\n") : "[VIDEXPORT] no logs captured yet";
    try {
      await navigator.clipboard.writeText(payload);
      return true;
    } catch (error) {
      logVideoExport(`copyVideoExportDebug failed err=${error?.message || "clipboard unavailable"}`);
      onShowMessage("Copy video export debug failed", "Clipboard access was denied.", "error");
      return false;
    }
  }, [onShowMessage]);

  const handleCopyRecordingDebug = useCallback(async () => {
    const recordingLines = getRecordingDebugLogs(900);
    const recordingPlayer = recording.recordingPlayerId
      ? entities.playersById?.[recording.recordingPlayerId]
      : null;
    const recordingPlayerPose = recording.recordingPlayerId
      ? resolveTrackPose(recording.recordingPlayerId)
      : null;
    const recordingTrackKeyframes = recording.recordingPlayerId
      ? animationDataRef.current?.tracks?.[recording.recordingPlayerId]?.keyframes?.length || 0
      : 0;
    const recordingSnapshot = recording.getDebugSnapshot?.() || null;
    const tracksWithFrames = Object.entries(animationDataRef.current?.tracks || {})
      .map(([id, track]) => ({ id, keyframes: track?.keyframes?.length || 0 }))
      .filter((entry) => entry.keyframes > 0)
      .sort((a, b) => b.keyframes - a.keyframes);
    const payloadParts = [
      `[RECDBG] snapshot ${new Date().toISOString()}`,
      JSON.stringify(
        {
          tool: canvasTool,
          recordingArchitecture: "raf+feedPosition",
          recordingModeEnabled: recording.recordingModeEnabled,
          recordingGlobalState: recording.globalState,
          recordingPlayerId: recording.recordingPlayerId,
          recordingPlayerName: recordingPlayer?.name || null,
          recordingPlayerPose,
          recordingTimeMs: Math.round(recording.recordingTimeMs || 0),
          previewTimeMs: Math.round(recording.previewTimeMs || 0),
          timelineDisplayTimeMs: Math.round(timelineDisplayTimeMs || 0),
          engineTimeMs: Math.round(currentTimeRef.current || 0),
          enginePlaying: Boolean(engineRef.current?.isPlaying?.()),
          recordedCount: recording.recordedCount,
          totalCount: recording.totalCount,
          recordingTrackKeyframes,
          tracksWithFrames,
          recordingSnapshot,
          selectedItemIds: entities.selectedItemIds || [],
          isItemDragging: Boolean(entities.isItemDraggingRef?.current),
          playerStates: recording.playerStates || {},
        },
        null,
        2
      ),
      "",
      ...(recordingLines.length ? recordingLines : ["[RECDBG] no logs captured yet"]),
    ];
    try {
      await navigator.clipboard.writeText(payloadParts.join("\n"));
      return true;
    } catch (error) {
      logRecordingDebug(`copyRecordingDebug failed err=${error?.message || "clipboard unavailable"}`);
      onShowMessage("Copy recording debug failed", "Clipboard access was denied.", "error");
      return false;
    }
  }, [
    animationDataRef,
    canvasTool,
    entities.isItemDraggingRef,
    entities.playersById,
    entities.selectedItemIds,
    onShowMessage,
    recording.globalState,
    recording.getDebugSnapshot,
    recording.playerStates,
    recording.previewTimeMs,
    recording.recordedCount,
    recording.recordingModeEnabled,
    recording.recordingPlayerId,
    recording.recordingTimeMs,
    recording.totalCount,
    resolveTrackPose,
    timelineDisplayTimeMs,
  ]);

  const handleCopyPlaceBallDebug = useCallback(async () => {
    const ballIds = Object.keys(entities.ballsById || {});
    const placeBallLines = getPlaceBallDebugLogs(600);
    const payloadParts = [
      `[PLACEBALL] snapshot ${new Date().toISOString()}`,
      JSON.stringify(
        {
          tool: canvasTool,
          selectedItemIds: entities.selectedItemIds || [],
          playerCount: Object.keys(entities.playersById || {}).length,
          ballCount: ballIds.length,
          ballIds,
          balls: ballIds.map((id) => entities.ballsById[id]),
        },
        null,
        2
      ),
      "",
      ...(placeBallLines.length ? placeBallLines : ["[PLACEBALL] no logs captured yet"]),
    ];
    try {
      await navigator.clipboard.writeText(payloadParts.join("\n"));
      return true;
    } catch (error) {
      logPlaceBallDebug(`copyPlaceBallDebug failed err=${error?.message || "clipboard unavailable"}`);
      onShowMessage("Copy place ball debug failed", "Clipboard access was denied.", "error");
      return false;
    }
  }, [canvasTool, entities.ballsById, entities.playersById, entities.selectedItemIds, onShowMessage]);

  const handleCanvasAddBall = useCallback(({ x, y, objectType = "ball" }) => {
    const existingBallIds = Object.keys(entities.ballsById || {});
    logPlaceBallDebug(
      `canvasAddBall click type=${objectType} x=${Math.round(x)} y=${Math.round(y)} existingCount=${existingBallIds.length} existingIds=[${existingBallIds.join(",")}]`
    );
    historyApiRef.current?.pushHistory?.();
    const created = entities.handleAddBall({ x, y, source: "canvasAddBall", objectType });
    logPlaceBallDebug(
      `canvasAddBall created id=${created?.id || "unknown"} type=${created?.objectType || objectType} x=${Math.round(created?.x ?? x)} y=${Math.round(created?.y ?? y)} nextCount=${Object.keys(entities.ballsById || {}).length + 1}`
    );
    setCanvasTool("select");
  }, [entities]);

  // --- Prefab handlers ---

  const handlePrefabSelect = useCallback((prefab) => {
    pendingPrefabRef.current = prefab;
    setCanvasTool("prefab");
  }, []);

  const handleCanvasPlacePrefab = useCallback(({ x, y }) => {
    const prefab = pendingPrefabRef.current;
    if (!prefab?.players?.length && !prefab?.ball) return;

    historyApiRef.current?.pushHistory?.();

    let currentById = { ...entities.playersById };
    let currentRepresented = [...(entities.representedPlayerIds || [])];
    const newIds = [];

    // Build a set of taken numbers per color for dedup
    const takenByColor = {};
    Object.values(currentById).forEach((p) => {
      const c = (p.color ?? "#ef4444").toLowerCase();
      if (!takenByColor[c]) takenByColor[c] = new Set();
      const n = Number(p.number);
      if (!Number.isNaN(n)) takenByColor[c].add(n);
    });

    const getNextAvailableNumber = (color, desiredNumber) => {
      const c = (color ?? "#ef4444").toLowerCase();
      if (!takenByColor[c]) takenByColor[c] = new Set();
      let num = Number(desiredNumber);
      if (Number.isNaN(num)) num = 1;
      while (takenByColor[c].has(num)) num++;
      takenByColor[c].add(num);
      return num;
    };

    (prefab.players || []).forEach((p) => {
      const newId = getNextPlayerId(currentById);
      const color = p.color ?? "#ef4444";
      currentById[newId] = {
        id: newId,
        x: x + (p.dx ?? 0),
        y: y + (p.dy ?? 0),
        number: getNextAvailableNumber(color, p.number),
        name: p.name ?? "",
        assignment: p.assignment ?? "",
        color,
      };
      currentRepresented.push(newId);
      newIds.push(newId);
    });

    entities.setPlayersById(currentById);
    entities.setRepresentedPlayerIds(currentRepresented);

    // Place ball if prefab includes one
    if (prefab.ball) {
      const createdBall = entities.handleAddBall({
        x: x + (prefab.ball.dx ?? 0),
        y: y + (prefab.ball.dy ?? 0),
        select: false,
        source: "prefab",
      });
      if (createdBall?.id) {
        newIds.push(createdBall.id);
      }
      logPlaceBallDebug(
        `prefabPlace ballAdded id=${createdBall?.id || "unknown"} x=${Math.round(
          createdBall?.x ?? (x + (prefab.ball.dx ?? 0))
        )} y=${Math.round(createdBall?.y ?? (y + (prefab.ball.dy ?? 0)))}`
      );
    }

    entities.setSelectedItemIds(newIds);
    entities.setSelectedPlayerIds(newIds.filter((id) => Boolean(currentById[id])));

    // One-shot: return to select tool after placing
    pendingPrefabRef.current = null;
    setCanvasTool("select");
  }, [entities]);

  const handleSavePrefab = useCallback((name) => {
    const selectedPlayers = (entities.selectedPlayerIds || [])
      .map((id) => entities.playersById[id])
      .filter(Boolean);
    const selectedBallId = (entities.selectedItemIds || []).find((id) => entities.ballsById?.[id]);
    const ball = selectedBallId ? entities.ballsById[selectedBallId] : null;
    const ballSelected = Boolean(ball);
    if (selectedPlayers.length < 2 && !ballSelected) return;
    const normalizedName = String(name ?? "").trim().toLowerCase();
    const duplicateExists = customPrefabs.some(
      (prefab) => String(prefab?.label ?? "").trim().toLowerCase() === normalizedName
    );
    if (duplicateExists) {
      onShowMessage?.("Prefab not saved", `A prefab named "${name}" already exists.`, "error");
      return;
    }
    const prefab = buildCustomPrefab(name, selectedPlayers, ball);
    const updated = [...customPrefabs, prefab];
    saveCustomPrefabs(updated);
    setCustomPrefabs(updated);
    setSavePrefabModalOpen(false);
    const parts = [];
    if (selectedPlayers.length) parts.push(`${selectedPlayers.length} player${selectedPlayers.length > 1 ? "s" : ""}`);
    if (ballSelected) parts.push("ball");
    onShowMessage?.("Prefab saved", `"${name}" saved with ${parts.join(" + ")}`, "success");
  }, [
    entities.selectedPlayerIds,
    entities.selectedItemIds,
    entities.playersById,
    entities.ballsById,
    customPrefabs,
    onShowMessage,
  ]);

  const handleDeleteCustomPrefab = useCallback((id) => {
    const updated = deleteCustomPrefab(id);
    setCustomPrefabs(updated);
  }, []);

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
        const ballsById = ballsByIdRef.current || {};

        uniqueIds.forEach((itemId) => {
          if (!playersByIdRef.current?.[itemId] && !ballsById[itemId]) return;
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
      const enginePlayingBefore = Boolean(engineRef.current?.isPlaying?.());
      if (recording.recordingModeEnabled) {
        logRecordingDebug(
          `itemDragStart id=${id} global=${recording.globalState} recordingPid=${recording.recordingPlayerId || "none"} selected=[${(entities.selectedItemIds || []).join(",")}] enginePlayingBefore=${enginePlayingBefore} pauseSuppressed=true`
        );
        // Auto-resume recording when dragging the recorded player.
        if (recording.globalState === "paused" && id === recording.recordingPlayerId) {
          recording.resumeRecording();
        }
      }
      // Don't pause engine during recording - recording uses its own timer.
      if (!recording.recordingModeEnabled) {
        engineRef.current.pause();
      }
      entities.handleItemDragStart(id);
    },
    [entities, recording.globalState, recording.recordingModeEnabled, recording.recordingPlayerId, recording.resumeRecording]
  );

  const handleItemDragEnd = useCallback(
    (id) => {
      entities.handleItemDragEnd(id);
      const isPlayingNow = engineRef.current.isPlaying();

      const ballsById = ballsByIdRef.current || {};
      const selectedIds = entities.selectedItemIds || [];
      const selectedTrackIds = selectedIds.filter(
        (itemId) => Boolean(playersByIdRef.current?.[itemId]) || Boolean(ballsById[itemId])
      );
      const targetTrackIds =
        selectedTrackIds.length && selectedTrackIds.includes(id)
          ? selectedTrackIds
          : playersByIdRef.current?.[id] || ballsById[id]
            ? [id]
            : [];
      if (recording.recordingModeEnabled) {
        logRecordingDebug(
          `itemDragEnd id=${id} global=${recording.globalState} recordingPid=${recording.recordingPlayerId || "none"} enginePlaying=${isPlayingNow} targetTrackIds=[${targetTrackIds.join(",")}] recordedKeyframes=${recording.recordingPlayerId ? animationDataRef.current?.tracks?.[recording.recordingPlayerId]?.keyframes?.length || 0 : 0}`
        );
        // Auto-pause recording when user stops dragging the recorded player.
        if (recording.globalState === "recording" && id === recording.recordingPlayerId) {
          recording.pauseRecording();
        }
        // Don't upsert keyframes during recording mode - recording manages its own tracks.
        return;
      }
      if (isPlayingNow) return;
      upsertKeyframesAtCurrentTime(targetTrackIds, { source: "dragEnd" });
    },
    [
      entities,
      recording.globalState,
      recording.recordingModeEnabled,
      recording.recordingPlayerId,
      recording.pauseRecording,
      upsertKeyframesAtCurrentTime,
    ]
  );

  const handleItemChange = useCallback(
    (id, next, meta) => {
      if (recording.recordingModeEnabled && recording.globalState === "recording") {
        // Feed position to recording hook for the player being recorded.
        if (id === recording.recordingPlayerId && next) {
          recording.feedPosition(next.x ?? 0, next.y ?? 0);
        }
      }
      entities.handleItemChange(id, next, meta);

      const ballsById = ballsByIdRef.current || {};
      const isTrackable = Boolean(playersByIdRef.current?.[id]) || Boolean(ballsById[id]);
      if (!isTrackable) return;
      const patch = {};

      if (
        meta?.delta &&
        entities.selectedItemIds?.includes(id) &&
        entities.selectedItemIds.length > 1
      ) {
        entities.selectedItemIds.forEach((itemId) => {
          const selectedTrackable = Boolean(playersByIdRef.current?.[itemId]) || Boolean(ballsById[itemId]);
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
    [
      entities,
      recording.globalState,
      recording.recordingModeEnabled,
      recording.recordingPlayerId,
      recording.feedPosition,
      resolveTrackPose,
    ]
  );

  const handleNudgeSelectedItems = useCallback(
    ({ dx = 0, dy = 0, pushHistory = true, source = "keyboard" } = {}) => {
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
        return { moved: false, dx: 0, dy: 0, snappedX: false, snappedY: false };
      }
      if (dx === 0 && dy === 0) {
        return { moved: false, dx: 0, dy: 0, snappedX: false, snappedY: false };
      }

      const selectedItemIds = entities.selectedItemIds || [];
      if (!selectedItemIds.length) {
        return { moved: false, dx: 0, dy: 0, snappedX: false, snappedY: false };
      }

      let nextDx = dx;
      let nextDy = dy;
      let snappedX = false;
      let snappedY = false;
      const anchorId = selectedItemIds[0];
      const anchorPose =
        resolveTrackPose(anchorId) ||
        entities.playersById?.[anchorId] ||
        entities.ballsById?.[anchorId];
      if (anchorPose) {
        const zoom = Math.max(0.0001, fieldViewport.camera?.zoom || 1);
        const snapThresholdWorld = KEYBOARD_NUDGE_SNAP_THRESHOLD_PX / zoom;
        const targetX = (anchorPose.x ?? 0) + dx;
        const targetY = (anchorPose.y ?? 0) + dy;
        const excludedIds = new Set(selectedItemIds);
        let closestX = null;
        let closestY = null;

        (entities.items || []).forEach((item) => {
          if (!item || excludedIds.has(item.id)) return;
          if (item.type !== "player" && item.type !== "ball") return;

          const itemPose = resolveTrackPose(item.id);
          const itemX = Number.isFinite(itemPose?.x) ? itemPose.x : (item.x ?? 0);
          const itemY = Number.isFinite(itemPose?.y) ? itemPose.y : (item.y ?? 0);
          const diffX = Math.abs(itemX - targetX);
          const diffY = Math.abs(itemY - targetY);

          if (diffX <= snapThresholdWorld && (!closestX || diffX < closestX.diff)) {
            closestX = { value: itemX, diff: diffX };
          }
          if (diffY <= snapThresholdWorld && (!closestY || diffY < closestY.diff)) {
            closestY = { value: itemY, diff: diffY };
          }
        });

        if (closestX) {
          nextDx += closestX.value - targetX;
          snappedX = true;
        }
        if (closestY) {
          nextDy += closestY.value - targetY;
          snappedY = true;
        }
      }

      if (nextDx === 0 && nextDy === 0) {
        return { moved: false, dx: nextDx, dy: nextDy, snappedX, snappedY };
      }

      engineRef.current.pause();
      const movedItemIds = entities.handleMoveSelectedItemsByDelta(nextDx, nextDy, {
        pushHistory,
        source,
      });
      if (!movedItemIds.length) {
        return { moved: false, dx: nextDx, dy: nextDy, snappedX, snappedY };
      }

      const patch = {};
      movedItemIds.forEach((itemId) => {
        const currentPose = resolveTrackPose(itemId);
        if (!currentPose) return;
        patch[itemId] = {
          ...currentPose,
          x: (currentPose.x ?? 0) + nextDx,
          y: (currentPose.y ?? 0) + nextDy,
        };
      });

      if (Object.keys(patch).length) {
        Object.entries(patch).forEach(([itemId, pose]) => {
          latestPosesRef.current[itemId] = pose;
        });
        animationRendererRef.current?.setPoses?.(patch);
      }

      if (!engineRef.current.isPlaying()) {
        upsertKeyframesAtCurrentTime(movedItemIds, { source });
      }
      return { moved: true, dx: nextDx, dy: nextDy, snappedX, snappedY };
    },
    [entities, fieldViewport.camera?.zoom, resolveTrackPose, upsertKeyframesAtCurrentTime]
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
      const nextBallsById = play.entities?.ballsById ?? null;
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
        nextBallsById,
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
      setSelectedDrawingIds([]);
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
      const tagName = e.target?.tagName || "UNKNOWN";
      const isTypingTarget =
        tagName === "INPUT" || tagName === "TEXTAREA" || e.target?.isContentEditable;

      if (e.key === "Escape") {
        // Cancel export modal
        if (exportModalOpen) {
          setExportModalOpen(false);
          return;
        }
        // Block all shortcuts during video export
        if (isExporting) return;
        // Cancel screenshot/region selection mode
        if (screenshotMode) {
          handleScreenshotCancel();
          return;
        }
        // Cancel custom shape in progress
        if (canvasTool === "pen" && drawSubTool === "shape") {
          drawingHookRef.current?.cancelCustomShape?.();
        }

        const hasEntitySelection =
          (entities.selectedPlayerIds?.length || 0) > 0 ||
          (entities.selectedItemIds?.length || 0) > 0;
        const hasDrawingSelection = selectedDrawingIds.length > 0;
        const hasSelection = hasEntitySelection || hasDrawingSelection;
        const isSelectionMode = canvasTool === "select" || canvasTool === "pen";

        logKeyToolDebug(
          `keydown Escape tool=${canvasTool} subTool=${drawSubTool} typing=${Boolean(
            isTypingTarget
          )} selectedPlayers=${entities.selectedPlayerIds?.length || 0} selectedItems=${entities.selectedItemIds?.length || 0} selectedDrawings=${selectedDrawingIds.length} repeat=${Boolean(e.repeat)}`
        );

        if (hasEntitySelection) {
          entities.setSelectedPlayerIds([]);
          entities.setSelectedItemIds([]);
        }
        if (hasDrawingSelection) {
          setSelectedDrawingIds([]);
        }
        drawingSelectionRef.current?.cancelGesture?.();
        setSelectedKeyframeMs(null);

        if (hasSelection && isSelectionMode) {
          logKeyToolDebug("escape action=clearSelection");
          return;
        }
        if (canvasTool !== "select") {
          logKeyToolDebug(`escape action=switchToSelect from=${canvasTool}`);
          setCanvasTool("select");
          return;
        }
        logKeyToolDebug("escape action=noop");
        return;
      }

      // Enter commits custom shape polygon
      if (e.key === "Enter" && canvasTool === "pen" && drawSubTool === "shape" && !isTypingTarget) {
        drawingHookRef.current?.commitCustomShape?.();
        return;
      }

      if (isTypingTarget) return;

      // Ctrl/Cmd+A selects all drawings in pen+select mode
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && canvasTool === "pen" && drawSubTool === "select") {
        e.preventDefault();
        setSelectedDrawingIds(drawingsState.drawings.map((d) => d.id));
        return;
      }

      const nudgeDirection = KEYBOARD_NUDGE_BY_KEY[e.key];
      if (nudgeDirection) {
        if (exportModalOpen || isExporting || screenshotMode) return;
        const selectedItemCount = entities.selectedItemIds?.length || 0;
        if (!selectedItemCount) return;

        const step = e.shiftKey ? KEYBOARD_NUDGE_FAST_STEP : KEYBOARD_NUDGE_STEP;
        const dx = nudgeDirection.x * step;
        const dy = nudgeDirection.y * step;
        e.preventDefault();

        const nudgeResult = handleNudgeSelectedItems({
          dx,
          dy,
          pushHistory: !e.repeat,
          source: e.repeat ? "keyboardNudgeRepeat" : "keyboardNudge",
        });

        logKeyToolDebug(
          `keydown ${e.key} action=${nudgeResult.moved ? "nudgeItems" : "nudgeNoop"} selectedItems=${selectedItemCount} dx=${nudgeResult.dx} dy=${nudgeResult.dy} snapX=${nudgeResult.snappedX} snapY=${nudgeResult.snappedY} shift=${Boolean(e.shiftKey)} repeat=${Boolean(e.repeat)}`
        );
        return;
      }

      const isDeleteKey = e.key === "Delete" || e.key === "Backspace";
      if (!isDeleteKey) return;

      // Delete selected drawing elements
      if (selectedDrawingIds.length > 0 && canvasTool === "pen" && drawSubTool === "select") {
        e.preventDefault();
        drawingsState.removeMultipleDrawings(selectedDrawingIds);
        setSelectedDrawingIds([]);
        return;
      }

      if (!entities.selectedItemIds?.length) return;
      e.preventDefault();
      entities.handleDeleteSelected();
      setSelectedKeyframeMs(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    entities,
    selectedDrawingIds,
    canvasTool,
    drawSubTool,
    drawingsState,
    exportModalOpen,
    isExporting,
    screenshotMode,
    handleNudgeSelectedItems,
  ]);

  const handleAnimationRendererReady = useCallback(() => {
    renderPoseAtTime(currentTimeRef.current);
  }, [renderPoseAtTime]);

  const handleStartRecording = useCallback(
    (playerId) => {
      setCanvasTool("select");
      recording.startRecording(playerId);
    },
    [recording.startRecording]
  );

  return (
    <>
      <WideSidebar
        activeTool={canvasTool}
        onToolChange={handleToolChange}
        onUndo={slateHistory.onUndo}
        onRedo={slateHistory.onRedo}
        onReset={onReset}
        onAddPlayer={entities.handleAddPlayer}
        onPlayerColorChange={entities.handlePlayerColorChange}
        onDeleteSelected={entities.handleDeleteSelected}
        onPrefabSelect={handlePrefabSelect}
        onDeleteCustomPrefab={handleDeleteCustomPrefab}
        customPrefabs={customPrefabs}
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
          onCanvasAddBall={handleCanvasAddBall}
          onCanvasPlacePrefab={handleCanvasPlacePrefab}
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
          drawOpacity={drawOpacity}
          drawStrokeWidth={drawStrokeWidth}
          drawTension={drawTension}
          drawFontSize={drawFontSize}
          drawTextAlign={drawTextAlign}
          drawArrowHeadType={drawArrowHeadType}
          drawStabilization={drawStabilization}
          eraserSize={eraserSize}
          drawShapeType={drawShapeType}
          drawShapeStrokeColor={drawShapeStrokeColor}
          drawShapeFill={drawShapeFill}
          onAddDrawing={drawingsState.addDrawing}
          onRemoveDrawing={drawingsState.removeDrawing}
          onRemoveMultipleDrawings={drawingsState.removeMultipleDrawings}
          onUpdateDrawing={drawingsState.updateDrawing}
          selectedDrawingIds={selectedDrawingIds}
          onSelectedDrawingIdsChange={setSelectedDrawingIds}
          onUpdateMultipleDrawingsNoHistory={drawingsState.updateMultipleDrawingsNoHistory}
          historyApiRef={historyApiRef}
          drawingSelectionRef={drawingSelectionRef}
          textEditing={textEditing}
          onTextEditingChange={setTextEditing}
          drawingHookRef={drawingHookRef}
          onDrawSubToolChange={handleDrawSubToolChange}
          screenshotMode={screenshotMode}
          screenshotRegion={screenshotRegion}
          onScreenshotRegionChange={handleScreenshotRegionChange}
          screenshotApiRef={screenshotApiRef}
          lockDrag={recording.globalState === "countdown"}
        />
        {/* Text editing is now handled via right panel textarea */}
        {recording.countdownValue != null && (
          <RecordingCountdown
            value={recording.countdownValue}
            playerName={
              recording.recordingPlayerId
                ? entities.playersById[recording.recordingPlayerId]?.name || "Player"
                : null
            }
            onCancel={recording.cancelRecording}
          />
        )}
        {screenshotMode && (
          <ScreenshotConfirmBar
            hasRegion={Boolean(screenshotRegion)}
            onConfirm={handleScreenshotConfirm}
            onCancel={handleScreenshotCancel}
          />
        )}
        {canvasTool === "pen" && !screenshotMode && (
          <DrawToolsPill
            activeSubTool={drawSubTool}
            onSubToolChange={handleDrawSubToolChange}
          />
        )}
        {recording.recordingModeEnabled ? (
          <RecordingControlBar
            globalState={recording.globalState}
            recordingPlayerId={recording.recordingPlayerId}
            recordingTimeMs={recording.recordingTimeMs}
            previewTimeMs={recording.previewTimeMs}
            durationMs={recording.recordingDurationMs}
            recordedCount={recording.recordedCount}
            totalCount={recording.totalCount}
            playerName={
              recording.recordingPlayerId
                ? entities.playersById[recording.recordingPlayerId]?.name || "Player"
                : null
            }
            countdownValue={recording.countdownValue}
            onStartPreview={recording.startPreview}
            onStopPreview={recording.stopPreview}
            onStopRecording={recording.stopRecording}
            onPauseRecording={recording.pauseRecording}
            onResumeRecording={recording.resumeRecording}
            onCancelRecording={recording.cancelRecording}
          />
        ) : (
          <ControlPill
            durationMs={animationData.durationMs}
            currentTimeMs={timelineDisplayTimeMs}
            isPlaying={isPlaying}
            speedMultiplier={speedMultiplier}
            autoplayEnabled={autoplayEnabled}
            selectedObjectCount={entities.selectedItemIds?.length ?? 0}
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
        )}
      </div>
      <ExportModal
        open={exportModalOpen}
        initialFormat={exportInitialFormat}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExportModalSubmit}
      />
      <SavePrefabModal
        open={savePrefabModalOpen}
        onClose={() => setSavePrefabModalOpen(false)}
        onSave={handleSavePrefab}
      />
      <SaveToPlaybookModal
        open={saveToPlaybookOpen}
        playName={playName}
        thumbnailDataUrl={playbookThumbnail}
        playData={playbookPlayData}
        onClose={() => setSaveToPlaybookOpen(false)}
        onSaved={handlePlaybookSaved}
      />
      <ExportOverlay
        visible={isExporting || !!exportError}
        progress={exportProgress ?? 0}
        error={exportError}
        onDismissError={() => setExportError(null)}
      />

      <RightPanel
        canvasTool={canvasTool}
        drawSubTool={drawSubTool}
        drawColor={drawColor}
        drawOpacity={drawOpacity}
        drawStrokeWidth={drawStrokeWidth}
        drawTension={drawTension}
        drawFontSize={drawFontSize}
        drawTextAlign={drawTextAlign}
        drawArrowHeadType={drawArrowHeadType}
        onDrawColorChange={handleDrawColorChange}
        onDrawOpacityChange={handleDrawOpacityChange}
        onDrawStrokeWidthChange={handleDrawStrokeWidthChange}
        onDrawTensionChange={handleDrawTensionChange}
        onDrawFontSizeChange={handleDrawFontSizeChange}
        onDrawTextAlignChange={handleDrawTextAlignChange}
        onDrawArrowHeadTypeChange={handleDrawArrowHeadTypeChange}
        drawStabilization={drawStabilization}
        onDrawStabilizationChange={setDrawStabilization}
        selectedDrawing={selectedDrawing}
        selectedDrawings={selectedDrawings}
        onUpdateDrawing={drawingsState.updateDrawing}
        onUpdateMultipleDrawings={drawingsState.updateMultipleDrawings}
        drawings={drawingsState.drawings}
        selectedDrawingIds={selectedDrawingIds}
        onSelectedDrawingIdsChange={setSelectedDrawingIds}
        onRemoveDrawing={drawingsState.removeDrawing}
        eraserSize={eraserSize}
        onEraserSizeChange={handleEraserSizeChange}
        drawShapeType={drawShapeType}
        drawShapeStrokeColor={drawShapeStrokeColor}
        drawShapeFill={drawShapeFill}
        onDrawShapeTypeChange={handleDrawShapeTypeChange}
        onDrawShapeStrokeColorChange={handleDrawShapeStrokeColorChange}
        onDrawShapeFillChange={handleDrawShapeFillChange}
        playName={playName}
        onPlayNameChange={setPlayName}
        zoomPercent={fieldViewport.zoomPercent}
        onZoomIn={fieldViewport.zoomIn}
        onZoomOut={fieldViewport.zoomOut}
        onZoomPercentChange={fieldViewport.setZoomPercent}
        onRotateLeft={handleRotateLeft}
        onRotateCenter={handleRotateCenter}
        onRotateRight={handleRotateRight}
        onFieldUndo={fieldViewport.onFieldUndo}
        onFieldRedo={fieldViewport.onFieldRedo}
        onReset={onReset}
        playersById={entities.playersById}
        ballsById={entities.ballsById}
        representedPlayerIds={entities.representedPlayerIds}
        selectedPlayerIds={entities.selectedPlayerIds}
        selectedItemIds={entities.selectedItemIds}
        selectedPlayers={entities.selectedPlayers}
        onSelectPlayer={entities.handleSelectPlayer}
        onSelectItem={entities.handleSelectItem}
        onEditPlayer={entities.handleEditPlayer}
        onDeletePlayer={entities.handleDeletePlayer}
        onDeleteBall={entities.handleDeleteBall}
        allPlayersDisplay={entities.allPlayersDisplay}
        onAllPlayersDisplayChange={entities.setAllPlayersDisplay}
        onSelectedPlayersColorChange={entities.handleSelectedPlayersColorChange}
        advancedSettingsOpen={showAdvancedSettings}
        onOpenAdvancedSettings={() => setShowAdvancedSettings(true)}
        onSaveToPlaybook={onSaveToPlaybook}
        onImport={handleImportClick}
        onScreenshot={handleScreenshotExportClick}
        onVideoExport={handleVideoExportClick}
        onSavePrefab={() => setSavePrefabModalOpen(true)}
        recordingModeEnabled={recording.recordingModeEnabled}
        onRecordingModeChange={recording.setRecordingModeEnabled}
        recordingDurationMs={recording.recordingDurationMs}
        onRecordingDurationChange={recording.setRecordingDurationMs}
        recordingStabilization={recording.stabilization}
        onRecordingStabilizationChange={recording.setStabilization}
        recordingGlobalState={recording.globalState}
        recordingPlayerId={recording.recordingPlayerId}
        recordingPlayerStates={recording.playerStates}
        onStartRecording={handleStartRecording}
        onClearPlayerRecording={recording.clearPlayerRecording}
        onClearAllRecordings={recording.clearAllRecordings}
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
          onCopyKeyToolDebug={handleCopyKeyToolDebug}
          onCopyPlaceBallDebug={handleCopyPlaceBallDebug}
          onCopyVideoExportDebug={handleCopyVideoExportDebug}
          onCopyRecordingDebug={handleCopyRecordingDebug}
          onDebugRotate={handleDebugRotate}
          onDownload={onDownload}
          onClose={() => setShowAdvancedSettings(false)}
          autoplayEnabled={autoplayEnabled}
          onAutoplayChange={setAutoplayEnabled}
          onDeleteAllKeyframes={handleDeleteAllKeyframes}
        />
      )}
    </>
  );
}

export default Slate;
