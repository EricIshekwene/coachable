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
import {
  createDefaultAdvancedSettings,
  resolveFieldTypeFromSport,
  SPORT_DEFAULTS,
  useAdvancedSettings,
} from "./hooks/useAdvancedSettings";
import { useFieldViewport } from "./hooks/useFieldViewport";
import { INITIAL_BALL, useSlateEntities, getNextPlayerId } from "./hooks/useSlateEntities";
import SavePrefabModal from "../../components/SavePrefabModal";
import { loadCustomPrefabs, saveCustomPrefabs, buildCustomPrefab, deleteCustomPrefab } from "../../utils/customPrefabs";
import { useSlateHistory } from "./hooks/useSlateHistory";
import { useSlateActionLog } from "./hooks/useSlateActionLog";
import {
  AnimationEngine,
  createEmptyAnimation,
  deleteKeyframeAtTime,
  moveKeyframeTime,
  getTrackKeyframeTimes,
  normalizeAnimation,
  samplePosesAtTime,
  getDirectionAtTime,
  upsertKeyframe,
} from "../../animation";
import { getLogs as getAnimDebugLogs, log as logAnimDebug } from "../../animation/debugLogger";
import { getLogs as getDrawDebugLogs, log as logDrawDebug } from "../../canvas/drawDebugLogger";
import { getLogs as getKeyToolDebugLogs, log as logKeyToolDebug } from "../../canvas/keyboardToolDebugLogger";
import { getLogs as getVideoExportDebugLogs, log as logVideoExport } from "../../utils/videoExportDebugLogger";
import { supportsWebCodecsMP4, createMP4Encoder, isIOSDevice, convertWebMToMP4 } from "../../utils/videoEncoder";
import { reportError } from "../../utils/errorReporter";
import { getLogs as getPlaceBallDebugLogs, log as logPlaceBallDebug } from "./placeBallDebugLogger";
import { getLogs as getRecordingDebugLogs, log as logRecordingDebug } from "./recordingDebugLogger";
import { getLogs as getPrefabDebugLogs, log as logPrefabDebug } from "./prefabDebugLogger";
import { getLogs as getKfMoveDebugLogs, log as logKfMoveDebug } from "../../animation/keyframeMoveDebugLogger";
import {
  getLogs as getPersistenceDebugLogs,
  log as logPersistence,
  summarizePlayData as summarizePersistedPlayData,
} from "../../utils/playPersistenceDebugLogger";
import { useDrawings } from "./hooks/useDrawings";
import { useRecordingMode } from "./hooks/useRecordingMode";
import RecordingControlBar from "../../components/RecordingControlBar";
import RecordingCountdown from "../../components/RecordingCountdown";
import SaveToPlaybookModal from "../../components/SaveToPlaybookModal";
import AuthPromptModal from "../../components/AuthPromptModal";
import ViewOnlyControls from "../../components/ViewOnlyControls";
import { useAuth } from "../../context/AuthContext";

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
const DEFAULT_PLAY_NAME = "Untitled";
/** Minimum gap (ms) between keyframes — prevents placing keyframes too close together. */
const KEYFRAME_MIN_GAP_MS = 500;
const KEYFRAME_TIME_TOLERANCE_MS = 0.5;

/** Returns true if timeMs is too close to any existing keyframe in the track (excluding exact matches which are updates). */
const isTooCloseToExistingKeyframe = (track, timeMs) => {
  if (!track?.keyframes?.length) return false;
  return track.keyframes.some((kf) => {
    const gap = Math.abs(kf.t - timeMs);
    return gap > KEYFRAME_TIME_TOLERANCE_MS && gap < KEYFRAME_MIN_GAP_MS;
  });
};

const hasKeyframeAtTime = (track, timeMs, toleranceMs = KEYFRAME_TIME_TOLERANCE_MS) =>
  Boolean(track?.keyframes?.some((kf) => Math.abs((kf?.t ?? 0) - timeMs) <= toleranceMs));

/**
 * Clamps a keyframe target time to maintain minimum spacing from all other keyframes.
 * Prevents keyframes from overlapping or getting too close during drag.
 * @param {number[]} keyframeTimes - All keyframe times in the animation (ms)
 * @param {number} fromMs - The original keyframe time being moved
 * @param {number} toMs - The requested target time
 * @param {number} durationMs - Total animation duration (max boundary)
 * @returns {number} Clamped time that maintains KEYFRAME_MIN_GAP_MS spacing
 */
const clampKeyframeTargetTime = (keyframeTimes, fromMs, toMs, durationMs) => {
  let clamped = toMs;
  const others = (keyframeTimes || []).filter(
    (t) => Math.abs(t - fromMs) > KEYFRAME_TIME_TOLERANCE_MS
  );

  // Clamp away from all neighboring keyframes
  for (const neighborMs of others) {
    const gap = clamped - neighborMs;
    if (Math.abs(gap) < KEYFRAME_MIN_GAP_MS) {
      // Move target away from neighbor
      clamped = gap >= 0 ? neighborMs + KEYFRAME_MIN_GAP_MS : neighborMs - KEYFRAME_MIN_GAP_MS;
    }
  }

  // Keep within duration bounds
  return Math.max(0, Math.min(durationMs, clamped));
};

const KEYBOARD_NUDGE_BY_KEY = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

const waitForAnimationFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveRecorderMimeType = ({ preferRealtimeCodec = false, preferMp4 = false } = {}) => {
  if (typeof MediaRecorder === "undefined") return null;
  const mp4Candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
  ];
  const webmCandidates = preferRealtimeCodec
    ? ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm"]
    : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const candidates = preferMp4
    ? [...mp4Candidates, ...webmCandidates]
    : [...webmCandidates, ...mp4Candidates];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || null;
};

const speedToPlaybackRate = (speedMultiplier) => (0.25 + (speedMultiplier / 100) * 3.75) * 3;

const getTrackKeyframeCounts = (animation) => {
  const counts = {};
  Object.entries(animation?.tracks || {}).forEach(([trackId, track]) => {
    counts[trackId] = Array.isArray(track?.keyframes) ? track.keyframes.length : 0;
  });
  return counts;
};

const countMovingTracks = (trackCounts) =>
  Object.values(trackCounts || {}).filter((count) => Number(count) >= 2).length;

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

function Slate({
  playId = null,
  onShowMessage,
  initialPlayData,
  initialPlayName,
  onNavigateHome,
  onPlayDataChange,
  flushRef: externalFlushRef,
  onReady,
  viewOnly: viewOnlyProp = false,
  adminMode = false,
  sport: sportProp = null,
}) {
  const [viewOnlyLocal, setViewOnlyLocal] = useState(viewOnlyProp);
  const viewOnly = viewOnlyProp || viewOnlyLocal;

  // Smooth transition state: "edit" | "collapsing" | "view" | "expanding"
  const [viewTransition, setViewTransition] = useState(viewOnly ? "view" : "edit");

  useEffect(() => {
    if (viewOnly && (viewTransition === "edit" || viewTransition === "expanding")) {
      // Start collapsing
      setViewTransition("collapsing");
      const timer = setTimeout(() => setViewTransition("view"), 350);
      return () => clearTimeout(timer);
    } else if (!viewOnly && (viewTransition === "view" || viewTransition === "collapsing")) {
      // Start expanding — mount panels in collapsed state first
      setViewTransition("expanding");
      // Use double rAF so the DOM paints the collapsed state before animating open
      let raf1, raf2;
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setViewTransition("edit");
        });
      });
      return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
    }
  }, [viewOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // Whether editing panels (sidebar, right panel, control pill) should be in the DOM
  const showEditPanels = viewTransition === "edit" || viewTransition === "collapsing" || viewTransition === "expanding";
  // Whether panels should visually be in their expanded (visible) state
  const panelsExpanded = viewTransition === "edit";
  // Whether view-only controls should be in the DOM
  const showViewOverlay = viewTransition === "view" || viewTransition === "collapsing";
  // Whether view-only controls should be fully visible
  const viewOverlayVisible = viewTransition === "view";
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current || document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  const [canvasTool, setCanvasTool] = useState("select");
  const [drawSubTool, setDrawSubTool] = useState("draw");
  const [drawColor, setDrawColor] = useState("#FFFFFF");
  const [drawOpacity, setDrawOpacity] = useState(1);
  const [drawStrokeWidth, setDrawStrokeWidth] = useState(3);
  const [drawSmoothing, setDrawSmoothing] = useState(30);
  const drawTension = drawSmoothing / 100;       // 0-1 for Konva line tension
  const drawStabilization = drawSmoothing;        // 0-100 for pull-string algorithm
  const [drawFontSize, setDrawFontSize] = useState(18);
  const [drawTextAlign, setDrawTextAlign] = useState("left");
  const [drawArrowHeadType, setDrawArrowHeadType] = useState("standard");
  const [drawArrowTip, setDrawArrowTip] = useState(false);
  const [eraserSize, setEraserSize] = useState(10);
  const [drawShapeType, setDrawShapeType] = useState("rect");
  const [drawShapeStrokeColor, setDrawShapeStrokeColor] = useState("#FFFFFF");
  const [drawShapeFill, setDrawShapeFill] = useState("transparent");
  const [selectedDrawingIds, setSelectedDrawingIds] = useState([]);
  const drawingSelectionRef = useRef(null);
  const [textEditing, setTextEditing] = useState(null);
  const [fieldBounds, setFieldBounds] = useState(null);
  const [screenshotMode, setScreenshotMode] = useState(false);
  const [screenshotRegion, setScreenshotRegion] = useState(null);
  const screenshotApiRef = useRef(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState(null);
  const [exportProgress, setExportProgress] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [playName, setPlayName] = useState(() => {
    const normalizedInitialPlayName = String(initialPlayName ?? "").trim();
    return normalizedInitialPlayName || DEFAULT_PLAY_NAME;
  });
  const [customPrefabs, setCustomPrefabs] = useState(() => loadCustomPrefabs());
  const [savePrefabModalOpen, setSavePrefabModalOpen] = useState(false);
  const [saveToPlaybookOpen, setSaveToPlaybookOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [playbookThumbnail, setPlaybookThumbnail] = useState(null);
  const pendingPrefabRef = useRef(null);
  const [slateLoadPhase, setSlateLoadPhase] = useState("loading"); // "loading" | "fading" | "done"
  const slateLoadStartRef = useRef(Date.now());
  const handleAssetsLoaded = useCallback(() => {
    const MIN_DISPLAY_MS = 600;
    const elapsed = Date.now() - slateLoadStartRef.current;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    setTimeout(() => setSlateLoadPhase("fading"), remaining);
  }, []);
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
  const selectedKeyframeMsRef = useRef(null);
  const latestPosesRef = useRef({});
  const importGuardRef = useRef({
    active: false,
    pendingFirstCommit: false,
    expiresAtMs: 0,
    baselineAnimation: null,
    baselineTrackCounts: {},
  });
  const importGuardRestoringRef = useRef(false);
  const currentTimeRef = useRef(0);
  const lastUiUpdateRef = useRef(0);
  const lastTickLogRef = useRef(0);
  const timelineDraggingRef = useRef(false);
  const recordingModeEnabledRef = useRef(false);
  const skipNextRenderPoseRef = useRef(false);
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new AnimationEngine({
      durationMs: LOOP_SECONDS * 1000,
      loop: true,
      playbackRate: speedToPlaybackRate(DEFAULT_SPEED_MULTIPLIER),
    });
  }

  const { user } = useAuth();
  const defaultFieldType = useMemo(
    () => resolveFieldTypeFromSport(sportProp ?? user?.sport),
    [sportProp, user?.sport]
  );

  const {
    advancedSettings,
    setAdvancedSettings,
    showAdvancedSettings,
    setShowAdvancedSettings,
    logEvent,
  } = useAdvancedSettings(defaultFieldType);

  const fieldViewport = useFieldViewport();
  const preViewOnlyCameraRef = useRef(null);

  // Apply sport-specific default rotation on mount
  useEffect(() => {
    const sd = SPORT_DEFAULTS[defaultFieldType] || {};
    if (sd.defaultFieldRotation) {
      fieldViewport.setFieldRotation(sd.defaultFieldRotation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Center field when entering/exiting view-only mode
  useEffect(() => {
    if (viewOnly) {
      preViewOnlyCameraRef.current = fieldViewport.camera;
      fieldViewport.setCamera({ x: 0, y: 0, zoom: 1 });
    } else if (preViewOnlyCameraRef.current) {
      fieldViewport.setCamera(preViewOnlyCameraRef.current);
      preViewOnlyCameraRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewOnly]);

  const currentFieldType = advancedSettings?.pitch?.fieldType ?? "Rugby";
  const currentFieldTypeRef = useRef(currentFieldType);
  useEffect(() => { currentFieldTypeRef.current = currentFieldType; }, [currentFieldType]);

  // Field types whose balls are oblong (football/rugby) and should rotate toward movement direction.
  // Round-ball sports (soccer, basketball, lacrosse) are excluded.
  const ROUND_BALL_FIELD_TYPES_LOWER = new Set(["soccer", "lacrosse", "basketball"]);

  const entities = useSlateEntities({
    historyApiRef,
    logEvent,
    fieldType: currentFieldType,
  });

  // Switch to select tool when the player edit panel opens so the coach
  // can click another player or click the field to deselect.
  useEffect(() => {
    if (entities.playerEditor.open) {
      setCanvasTool("select");
    }
  }, [entities.playerEditor.open]);

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

  const { logAction, actionLog } = useSlateActionLog();

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
    const guard = importGuardRef.current;
    if (!guard?.active || importGuardRestoringRef.current) return;

    if (guard.pendingFirstCommit) {
      guard.pendingFirstCommit = false;
      const currentCounts = getTrackKeyframeCounts(animationData);
      logPersistence("importGuard firstCommit", {
        movingTrackCount: countMovingTracks(currentCounts),
        trackCount: Object.keys(currentCounts).length,
      });
      return;
    }

    const nowMs = Date.now();
    const baselineCounts = guard.baselineTrackCounts || {};
    const currentCounts = getTrackKeyframeCounts(animationData);
    const droppedTracks = Object.entries(baselineCounts)
      .filter(([trackId, baselineCount]) => {
        const nextCount = currentCounts[trackId] ?? 0;
        return baselineCount >= 2 && nextCount < baselineCount;
      })
      .map(([trackId, baselineCount]) => ({
        trackId,
        baselineCount,
        nextCount: currentCounts[trackId] ?? 0,
      }));

    if (!droppedTracks.length) {
      if (nowMs > guard.expiresAtMs) {
        guard.active = false;
        logPersistence("importGuard expired noDrop", {
          movingTrackCount: countMovingTracks(currentCounts),
          trackCount: Object.keys(currentCounts).length,
        });
      }
      return;
    }

    if (nowMs > guard.expiresAtMs || !guard.baselineAnimation) {
      guard.active = false;
      logPersistence("importGuard observedDrop afterExpiry", {
        droppedTracks,
        movingTrackCount: countMovingTracks(currentCounts),
        trackCount: Object.keys(currentCounts).length,
      });
      return;
    }

    guard.active = false;
    importGuardRestoringRef.current = true;
    logPersistence("importGuard restoringBaseline", {
      droppedTracks,
      baselineMovingTrackCount: countMovingTracks(baselineCounts),
      nextMovingTrackCount: countMovingTracks(currentCounts),
    });
    setAnimationData(guard.baselineAnimation);
    setTimeout(() => {
      importGuardRestoringRef.current = false;
    }, 0);
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

  useEffect(() => {
    selectedKeyframeMsRef.current = selectedKeyframeMs;
  }, [selectedKeyframeMs]);

  const representedTrackIds = useMemo(() => {
    const ids = [...(entities.representedPlayerIds || [])];
    ids.push(...Object.keys(entities.ballsById || {}));
    return Array.from(new Set(ids));
  }, [entities.representedPlayerIds, entities.ballsById]);

  const getTimelineTrackIds = useCallback(() => {
    const playerIds = representedPlayerIdsRef.current || [];
    const ballIds = Object.keys(ballsByIdRef.current || {});
    return Array.from(new Set([...(playerIds || []), ...ballIds]));
  }, []);

  const buildFallbackPosesForTrackIds = useCallback((trackIds) => {
    const allPlayers = playersByIdRef.current || {};
    const ballsById = ballsByIdRef.current || {};
    const fallbackPoses = {};

    (trackIds || []).forEach((itemId) => {
      if (ballsById[itemId]) {
        fallbackPoses[itemId] = {
          x: ballsById[itemId].x ?? 0,
          y: ballsById[itemId].y ?? 0,
          r: 0,
        };
        return;
      }
      if (!allPlayers[itemId]) return;
      fallbackPoses[itemId] = {
        x: allPlayers[itemId].x ?? 0,
        y: allPlayers[itemId].y ?? 0,
        r: 0,
      };
    });

    return fallbackPoses;
  }, []);

  const getKeyframeActionTrackIds = useCallback(() => {
    const trackIds = getTimelineTrackIds();
    return Array.from(new Set((trackIds || []).filter(Boolean)));
  }, [getTimelineTrackIds]);

  const resolveKeyframeWriteTimeMs = useCallback(() => {
    const selectedTime = selectedKeyframeMsRef.current;
    if (selectedTime !== null && selectedTime !== undefined) {
      return Math.round(selectedTime);
    }
    return Math.round(currentTimeRef.current);
  }, []);

  const ensureKeyframeCoverageAtTime = useCallback(
    (baseAnimation, tracks, timeMs) => {
      const targetTimeMs = Math.round(timeMs);
      const trackIds = getTimelineTrackIds();
      if (!trackIds.length) {
        return { tracks, changed: false };
      }

      const sourceAnimation = normalizeAnimation({
        ...baseAnimation,
        tracks,
      });
      const fallbackPoses = buildFallbackPosesForTrackIds(trackIds);
      const sampledPoses = samplePosesAtTime(sourceAnimation, targetTimeMs, fallbackPoses, trackIds);

      let nextTracks = tracks;
      let changed = false;

      trackIds.forEach((itemId) => {
        const existingTrack = nextTracks[itemId] || { keyframes: [] };
        if (hasKeyframeAtTime(existingTrack, targetTimeMs)) return;
        const pose = sampledPoses[itemId];
        if (!pose || !Number.isFinite(pose.x) || !Number.isFinite(pose.y)) return;
        if (nextTracks === tracks) {
          nextTracks = { ...tracks };
        }
        nextTracks[itemId] = upsertKeyframe(existingTrack, {
          t: targetTimeMs,
          x: pose.x,
          y: pose.y,
          ...(pose.r !== undefined ? { r: pose.r } : {}),
        });
        changed = true;
      });

      return { tracks: nextTracks, changed };
    },
    [buildFallbackPosesForTrackIds, getTimelineTrackIds]
  );

  // Ensure all player/ball tracks have a keyframe at t=0 (starting position).
  // For brand-new tracks (zero existing keyframes), also stamps at every other keyframe
  // time already present in the animation so the item stays stationary until the user
  // explicitly moves it at a specific time.
  // Skip during recording mode — recording manages its own tracks.
  // NOTE: reads from refs inside the functional updater to avoid stale-closure bugs
  // when React Strict Mode double-fires effects.
  useEffect(() => {
    if (recordingModeEnabledRef.current) return;
    if (!representedTrackIds.length) return;
    setAnimationData((prev) => {
      // Use refs for latest entity data (avoids stale closure in StrictMode re-fire).
      const currentTrackIds = representedPlayerIdsRef.current
        ? [...representedPlayerIdsRef.current, ...Object.keys(ballsByIdRef.current || {})]
        : representedTrackIds;
      const nextTracks = { ...prev.tracks };
      let changed = false;

      // Collect all keyframe times that already exist across all tracks.
      const allExistingTimes = new Set();
      Object.values(prev.tracks).forEach((track) => {
        track?.keyframes?.forEach((kf) => allExistingTimes.add(kf.t));
      });

      currentTrackIds.forEach((itemId) => {
        const track = nextTracks[itemId];
        const player = playersByIdRef.current?.[itemId];
        const ball = ballsByIdRef.current?.[itemId];
        const source = player || ball;
        if (!source) return;

        // Brand-new track: stamp initial position at every existing keyframe time so
        // the item stays stationary until the user moves it at a specific time.
        if (!track?.keyframes?.length) {
          const stampTimes = new Set(allExistingTimes);
          stampTimes.add(0); // always include t=0
          const keyframes = Array.from(stampTimes)
            .sort((a, b) => a - b)
            .map((t) => ({ t, x: source.x ?? 0, y: source.y ?? 0 }));
          nextTracks[itemId] = { keyframes };
          changed = true;
          return;
        }

        // Existing track missing t=0: legacy/import compatibility — just prepend t=0.
        const hasZero = track.keyframes.some((kf) => kf.t === 0);
        if (hasZero) return;
        nextTracks[itemId] = {
          keyframes: [{ t: 0, x: source.x ?? 0, y: source.y ?? 0 }, ...track.keyframes],
        };
        changed = true;
      });
      if (!changed) return prev;
      return { ...prev, tracks: nextTracks };
    });
  }, [representedTrackIds, entities.playersById, entities.ballsById]);

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
    const ballsById = ballsByIdRef.current || {};
    const represented = representedPlayerIdsRef.current || [];
    const baseIds = represented.length ? represented : Object.keys(playersByIdRef.current || {});
    const trackIds = Array.from(
      new Set([...(baseIds || []), ...Object.keys(ballsById)])
    );
    const fallbackPoses = buildFallbackPosesForTrackIds(trackIds);

    const sampledPoses = samplePosesAtTime(
      animationDataRef.current,
      timeMs,
      fallbackPoses,
      trackIds
    );

    // For oblong-ball field types (Football, Rugby), compute directional rotation so the
    // tip of the ball points toward the direction of travel.
    const fieldType = currentFieldTypeRef.current ?? "Rugby";
    if (!ROUND_BALL_FIELD_TYPES_LOWER.has(fieldType.toLowerCase())) {
      const ballIds = Object.keys(ballsById);
      ballIds.forEach((ballId) => {
        const track = animationDataRef.current?.tracks?.[ballId];
        if (!track) return;
        const angle = getDirectionAtTime(track, timeMs);
        if (angle !== null && sampledPoses[ballId]) {
          sampledPoses[ballId] = { ...sampledPoses[ballId], r: angle };
        }
      });
    }

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
  }, [buildFallbackPosesForTrackIds]);

  const recording = useRecordingMode({
    animationRendererRef,
    setAnimationDataWithMeta,
    animationDataRef,
    playersByIdRef,
    ballsByIdRef,
  });
  recordingModeEnabledRef.current = recording.recordingModeEnabled;

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

  // Sync animation tracks with entity list: remove tracks for deleted entities, add empty
  // tracks for new ones. During recording mode, only ADD new tracks — never remove existing
  // ones (recording manages track data independently).
  // NOTE: reads from refs (playersByIdRef, ballsByIdRef, recordingModeEnabledRef) inside the
  // functional updater to avoid stale-closure bugs when React Strict Mode double-fires effects.
  useEffect(() => {
    setAnimationDataWithMeta((base) => {
      const playerIds = Object.keys(playersByIdRef.current || {});
      const ballIds = Object.keys(ballsByIdRef.current || {});
      const validIds = new Set([...playerIds, ...ballIds]);
      const nextTracks = {};
      let changed = false;

      Object.entries(base.tracks || {}).forEach(([itemId, track]) => {
        if (!validIds.has(itemId)) {
          // During recording, keep orphan tracks (player may be mid-record/shelved).
          if (recordingModeEnabledRef.current) {
            nextTracks[itemId] = track;
          } else {
            changed = true;
          }
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
  }, [entities.playersById, entities.ballsById, setAnimationDataWithMeta, recording.recordingModeEnabled]);

  // Re-render poses when animation data or entity list changes.
  // Skip during recording mode — the recording RAF loop manages positions.
  // Skip once after drag-end upserts to avoid snapping non-dragged players.
  useEffect(() => {
    if (recording.recordingModeEnabled) return;
    if (entities.isItemDraggingRef.current) return;
    if (skipNextRenderPoseRef.current) {
      skipNextRenderPoseRef.current = false;
      return;
    }
    renderPoseAtTime(currentTimeRef.current);
  }, [
    animationData,
    entities.representedPlayerIds,
    entities.ballsById,
    entities.isItemDraggingRef,
    renderPoseAtTime,
    recording.recordingModeEnabled,
  ]);

  // Show ALL keyframes from all tracks, not just selected ones.
  // This ensures keyframes remain visible even when only some players are selected.
  const visibleKeyframesMs = useMemo(
    () => getTrackKeyframeTimes(animationData, representedTrackIds),
    [animationData, representedTrackIds]
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
    importGuardRef.current.active = false;
    importGuardRestoringRef.current = false;
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

  /**
   * Persists the current play data to localStorage for crash recovery.
   * Called on every change via debounced autosave effect.
   * Database writes happen only on page unload / visibility change (handled by parent page).
   */
  const persistToLocalStorage = useCallback(() => {
    if (!playId) return;
    try {
      const payload = { playData: playbookPlayData, playName, savedAt: Date.now() };
      localStorage.setItem(`coachable_play_${playId}`, JSON.stringify(payload));
      logPersistence("localStorage persisted", {
        playId,
        playName,
        summary: summarizePersistedPlayData(playbookPlayData),
      });
    } catch (err) {
      logPersistence("localStorage persist failed", { error: err?.message });
    }
  }, [playId, playbookPlayData, playName]);

  /**
   * Flushes play data to the database via the parent-provided callback.
   * Called by the parent page component on unload / visibility change.
   */
  const flushToDatabase = useCallback(() => {
    if (!onPlayDataChange) return false;
    onPlayDataChange(playbookPlayData, playName, { source: "flush" });
    logPersistence("flushToDatabase", {
      playName,
      summary: summarizePersistedPlayData(playbookPlayData),
    });
    return true;
  }, [onPlayDataChange, playbookPlayData, playName]);

  // Expose flushToDatabase to parent via ref
  const flushRef = useRef(flushToDatabase);
  useEffect(() => {
    flushRef.current = flushToDatabase;
    if (externalFlushRef) externalFlushRef.current = flushToDatabase;
  }, [flushToDatabase, externalFlushRef]);

  const onSaveToPlaybook = useCallback(() => {
    if (!user) {
      setAuthPromptOpen(true);
      return;
    }
    // Always open the SaveToPlaybookModal (autosave handles persistence separately).
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
    logPersistence("saveToPlaybook modal opened", {
      playName,
      summary: summarizePersistedPlayData(playbookPlayData),
    });
    setSaveToPlaybookOpen(true);
  }, [user, playName, playbookPlayData]);

  const handlePlaybookSaved = useCallback((entry) => {
    const savedTitle = entry?.title || entry?.playName || playName;
    logPersistence("saveToPlaybook complete", {
      playId: entry?.id || null,
      playName: savedTitle,
      folderId: entry?.folderId || null,
    });
    onShowMessage?.("Saved to Playbook", `"${savedTitle}" saved successfully.`, "success");
  }, [onShowMessage, playName]);

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
    logPersistence("downloadPlayExport", {
      playName,
      exportBytes,
      summary: summarizePersistedPlayData(exportPayload),
    });
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

  /**
   * Frame-by-frame video export. Uses WebCodecs → MP4 when available,
   * falls back to MediaRecorder → WebM otherwise.
   * Each frame is rendered at the exact animation time — no real-time dependency.
   */
  const recordVideoExport = useCallback(async (worldRect, durationSec, quality = {}) => {
    logVideoExport(`=== VIDEO EXPORT START ===`);
    logVideoExport(`worldRect: x=${worldRect?.x} y=${worldRect?.y} w=${worldRect?.width} h=${worldRect?.height}`);
    logVideoExport(`durationSec=${durationSec} quality=${JSON.stringify(quality)}`);

    const api = screenshotApiRef.current;
    if (!api?.captureFrameCanvas || !api?.hideOverlays || !api?.showOverlays) {
      const reason = "Capture API not ready";
      logVideoExport(`ABORT: ${reason}`);
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
    const fps = Math.max(1, Number(quality.fps) || 30);
    const pixelRatio = Math.max(0.5, Number(quality.pixelRatio) || 2);
    const bitrate = Math.max(250_000, Number(quality.bitrate) || 5_000_000);
    const isIOS = isIOSDevice();
    const recorderMimeType = resolveRecorderMimeType({
      preferRealtimeCodec: true,
      preferMp4: isIOS,
    });
    const preferRecorderMP4 = isIOS && recorderMimeType?.includes("mp4");
    const useMP4 = supportsWebCodecsMP4() && !preferRecorderMP4;

    logVideoExport(
      `playDurationMs=${playDurationMs} durationSec=${requestedDurationSec} fps=${fps} pixelRatio=${pixelRatio} bitrate=${bitrate} useMP4=${useMP4} isIOS=${isIOS} recorderMimeType=${recorderMimeType || "none"}`
    );

    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);

    let saved = null;
    let wasPlaying = false;

    try {
      saved = clearSelectionsForCapture();
      wasPlaying = engine.playing;
      engine.pause({ shouldLog: false });
      logVideoExport(`engine paused, wasPlaying=${wasPlaying}`);

      // Wait two frames for React + Konva to settle after clearing selections
      await waitForAnimationFrame();
      await waitForAnimationFrame();

      api.hideOverlays();
      api.flushRender?.();
      logVideoExport(`overlays hidden`);

      // Render first frame to get dimensions
      renderPoseAtTime(0, { flushRenderer: true });
      api.flushRender?.();
      let firstCanvas = api.captureFrameCanvas(worldRect, { pixelRatio, flush: true });
      if (!firstCanvas) {
        throw new Error("captureFrameCanvas returned null on first frame");
      }
      const frameW = firstCanvas.width;
      const frameH = firstCanvas.height;
      logVideoExport(`firstCanvas: ${frameW}x${frameH}`);

      const totalFrames = Math.max(1, Math.ceil(fps * requestedDurationSec));
      logVideoExport(`totalFrames=${totalFrames} fps=${fps}`);

      let blob;
      let useMediaRecorderFallback = !useMP4;

      if (preferRecorderMP4) {
        logVideoExport(`skipping WebCodecs on iOS because MediaRecorder MP4 is available`);
      }

      if (useMP4) {
        // ── WebCodecs + mp4-muxer path (frame-perfect MP4) ──
        try {
          logVideoExport(`using WebCodecs MP4 encoder`);
          const mp4Encoder = await createMP4Encoder({
            width: frameW,
            height: frameH,
            fps,
            bitrate,
          });
          logVideoExport(`codec: ${mp4Encoder.codec} (mux: ${mp4Encoder.muxCodec})`);
          if (mp4Encoder.encodedWidth !== frameW || mp4Encoder.encodedHeight !== frameH) {
            logVideoExport(`resolution clamped: ${frameW}x${frameH} → ${mp4Encoder.encodedWidth}x${mp4Encoder.encodedHeight}`);
          }

          // Encode first frame
          await mp4Encoder.addFrame(firstCanvas, 0);
          setExportProgress(1 / totalFrames);

          for (let i = 1; i < totalFrames; i++) {
            const playTimeMs = (i / totalFrames) * playDurationMs;

            // Render animation state at this exact time
            renderPoseAtTime(playTimeMs, { flushRenderer: true });
            api.flushRender?.();

            const frameCanvas = api.captureFrameCanvas(worldRect, { pixelRatio, flush: true });
            if (!frameCanvas) {
              throw new Error(`captureFrameCanvas null at frame ${i}/${totalFrames}`);
            }

            await mp4Encoder.addFrame(frameCanvas, i);

            // Yield to browser every frame to keep UI responsive
            if (i % 3 === 0) await waitForAnimationFrame();

            if (i % 10 === 0) {
              setExportProgress((i + 1) / totalFrames);
            }
            if (i % 30 === 0 || i === totalFrames - 1) {
              logVideoExport(`frame ${i + 1}/${totalFrames} playTimeMs=${playTimeMs.toFixed(1)}`);
            }
          }

          logVideoExport(`all ${totalFrames} frames encoded, finalizing MP4`);
          setExportProgress(1);
          blob = await mp4Encoder.finish();
          logVideoExport(`MP4 blob: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
        } catch (mp4Err) {
          logVideoExport(`WebCodecs MP4 encoding failed: ${mp4Err?.message || mp4Err}`);
          logVideoExport(`falling back to MediaRecorder`);
          useMediaRecorderFallback = true;
          setExportProgress(0);
          // Re-render frame 0 and re-capture since the MP4 loop may have advanced
          renderPoseAtTime(0, { flushRenderer: true });
          api.flushRender?.();
          const reCapture = api.captureFrameCanvas(worldRect, { pixelRatio, flush: true });
          if (reCapture) firstCanvas = reCapture;
        }
      }

      if (useMediaRecorderFallback) {
        // ── MediaRecorder fallback (WebM on Chrome, MP4 on Safari) ──
        logVideoExport(`using MediaRecorder fallback`);

        const mimeType = recorderMimeType;
        if (!mimeType) {
          throw new Error("Browser supports neither WebCodecs nor MediaRecorder");
        }
        logVideoExport(`mimeType=${mimeType}`);

        // Use an offscreen canvas + captureStream for the MediaRecorder
        const offscreen = document.createElement("canvas");
        offscreen.width = frameW;
        offscreen.height = frameH;
        const ctx = offscreen.getContext("2d");
        if (!ctx) {
          throw new Error("Could not create 2D recording context");
        }
        ctx.drawImage(firstCanvas, 0, 0);

        const stream = offscreen.captureStream(0);
        const videoTrack = stream.getVideoTracks()[0];

        let recorderError = null;
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
        const chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onerror = (e) => {
          recorderError = e.error || new Error("MediaRecorder error");
        };
        const recorderStopped = new Promise((resolve) => { recorder.onstop = resolve; });
        recorder.start(VIDEO_EXPORT_TIMESLICE_MS);

        const frameDurationMs = 1000 / fps;
        const exportStartWallMs = performance.now();

        for (let i = 0; i < totalFrames; i++) {
          if (recorderError) throw recorderError;

          const playTimeMs = (i / totalFrames) * playDurationMs;
          renderPoseAtTime(playTimeMs, { flushRenderer: true });
          api.flushRender?.();

          const frameCanvas = api.captureFrameCanvas(worldRect, { pixelRatio, flush: true });
          if (!frameCanvas) {
            throw new Error(`captureFrameCanvas null at frame ${i}/${totalFrames}`);
          }

          ctx.clearRect(0, 0, offscreen.width, offscreen.height);
          ctx.drawImage(frameCanvas, 0, 0);
          if (videoTrack.requestFrame) videoTrack.requestFrame();

          // Pace to real-time for MediaRecorder
          await waitForAnimationFrame();
          const targetNextAt = exportStartWallMs + (i + 1) * frameDurationMs;
          const remaining = targetNextAt - performance.now();
          if (remaining > 1) await sleep(remaining);

          if (i % 10 === 0) setExportProgress((i + 1) / totalFrames);
          if (i % 30 === 0 || i === totalFrames - 1) {
            logVideoExport(`frame ${i + 1}/${totalFrames} playTimeMs=${playTimeMs.toFixed(1)}`);
          }
        }

        setExportProgress(1);
        recorder.stop();
        await recorderStopped;
        stream.getTracks().forEach((t) => t.stop());

        if (recorderError) throw recorderError;
        if (chunks.length === 0) throw new Error("MediaRecorder produced 0 data chunks");

        blob = new Blob(chunks, { type: mimeType });
        logVideoExport(`recorded blob (${mimeType}): ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

        // On iOS, WebM is not playable — convert to MP4 via FFmpeg WASM
        if (isIOS && mimeType.includes("webm")) {
          logVideoExport(`iOS detected with WebM output — converting to MP4 via FFmpeg`);
          onShowMessage?.("Converting video", "Converting to MP4 for iOS...", "info");
          try {
            blob = await convertWebMToMP4(blob, (p) => {
              setExportProgress(p);
            });
            logVideoExport(`MP4 conversion complete: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
          } catch (convertErr) {
            logVideoExport(`FFmpeg conversion failed: ${convertErr?.message}`);
            reportError({
              errorMessage: `WebM to MP4 conversion failed: ${convertErr?.message}`,
              errorStack: convertErr?.stack,
              component: "videoExport",
              action: "convertWebMToMP4",
              extra: { blobSize: blob.size, mimeType },
            });
            throw new Error(
              `iOS export could not produce MP4: ${convertErr?.message || "conversion failed"}`
            );
          }
        }
      }

      if (blob?.type?.includes("webm")) {
        reportError({
          errorMessage: "Video export fell back to WebM output",
          component: "videoExport",
          action: "webmFallback",
          extra: {
            worldRect: worldRect ? { x: worldRect.x, y: worldRect.y, w: worldRect.width, h: worldRect.height } : null,
            durationSec,
            quality,
            useMP4,
            isIOS,
            recorderMimeType,
            finalBlobType: blob.type,
            blobSize: blob.size,
          },
        });
      }

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
      reportError({
        errorMessage: errorMsg,
        errorStack,
        component: "videoExport",
        action: "exportVideo",
        extra: {
          worldRect: worldRect ? { x: worldRect.x, y: worldRect.y, w: worldRect.width, h: worldRect.height } : null,
          durationSec,
          quality,
          useMP4,
          isIOS,
          recorderMimeType,
        },
      });
      onShowMessage?.("Export failed", errorMsg, "error");
      setExportError(errorMsg);
      screenshotApiRef.current?.showOverlays?.();
      if (saved) restoreSelections(saved);
      if (wasPlaying) engineRef.current?.play?.();
    } finally {
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

  const handleDrawSmoothingChange = useCallback((nextSmoothing) => {
    setDrawSmoothing((prev) => {
      if (prev === nextSmoothing) return prev;
      logDrawDebug(`style smoothing prev=${prev} next=${nextSmoothing}`);
      return nextSmoothing;
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
    const animLines = getAnimDebugLogs(200);
    const persistLines = getPersistenceDebugLogs(400);
    const payload = [
      "--- Animation Debug ---",
      ...(animLines.length ? animLines : ["[ANIMDBG] no logs captured yet"]),
      "",
      "--- Persistence Debug ---",
      ...(persistLines.length ? persistLines : ["[PERSIST] no logs captured yet"]),
    ].join("\n");
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

  const handleCopyPrefabDebug = useCallback(async () => {
    const lines = getPrefabDebugLogs(400);
    const payload = lines.length ? lines.join("\n") : "[PREFAB] no logs captured yet";
    try {
      await navigator.clipboard.writeText(payload);
      return true;
    } catch (error) {
      logPrefabDebug(`copyPrefabDebug failed err=${error?.message || "clipboard unavailable"}`);
      onShowMessage("Copy prefab debug failed", "Clipboard access was denied.", "error");
      return false;
    }
  }, [onShowMessage]);

  const handleCopyKfMoveDebug = useCallback(async () => {
    const lines = getKfMoveDebugLogs(300);
    const payload = lines.length ? lines.join("\n") : "[KFMOVE] no logs captured yet";
    try {
      await navigator.clipboard.writeText(payload);
      return true;
    } catch (error) {
      logKfMoveDebug(`copyKfMoveDebug failed err=${error?.message || "clipboard unavailable"}`);
      onShowMessage("Copy keyframe move debug failed", "Clipboard access was denied.", "error");
      return false;
    }
  }, [onShowMessage]);

  const handleCopyFixAllDebug = useCallback(async () => {
    const allPlayers = entities.playersById || {};
    const ballsById = entities.ballsById || {};
    const represented = entities.representedPlayerIds || [];
    const anim = animationDataRef.current;
    const tracks = anim?.tracks || {};
    const currentTime = Math.round(currentTimeRef.current || 0);
    const enginePlaying = Boolean(engineRef.current?.isPlaying?.());

    // Build per-entity summary: entity position, resolved pose, latestPosesRef, all keyframes
    const entitySummaries = {};
    const allIds = Array.from(new Set([...represented, ...Object.keys(ballsById)]));
    allIds.forEach((id) => {
      const isPlayer = Boolean(allPlayers[id]);
      const isBall = Boolean(ballsById[id]);
      const entity = isPlayer ? allPlayers[id] : ballsById[id];
      const track = tracks[id];
      const keyframes = track?.keyframes || [];
      const rendererPose = animationRendererRef.current?.getCurrentPose?.(id) || null;
      const latestPose = latestPosesRef.current?.[id] || null;

      entitySummaries[id] = {
        type: isPlayer ? "player" : isBall ? "ball" : "unknown",
        ...(isPlayer ? { number: entity?.number, name: entity?.name } : {}),
        entityPos: { x: entity?.x, y: entity?.y },
        rendererPose: rendererPose ? { x: rendererPose.x, y: rendererPose.y, r: rendererPose.r } : null,
        latestPose: latestPose ? { x: latestPose.x, y: latestPose.y, r: latestPose.r } : null,
        keyframeCount: keyframes.length,
        keyframes: keyframes.map((kf) => ({
          t: kf.t,
          x: Math.round((kf.x ?? 0) * 100) / 100,
          y: Math.round((kf.y ?? 0) * 100) / 100,
          ...(kf.r !== undefined ? { r: kf.r } : {}),
        })),
        hasTrack: Boolean(track),
      };
    });

    // Identify potential issues
    const issues = [];
    allIds.forEach((id) => {
      const summary = entitySummaries[id];
      if (!summary.hasTrack) {
        issues.push(`${id}: no animation track`);
      } else if (summary.keyframeCount === 0) {
        issues.push(`${id}: track exists but 0 keyframes`);
      } else if (summary.keyframeCount === 1) {
        issues.push(`${id}: only 1 keyframe (t=${summary.keyframes[0]?.t}) — will not animate`);
      }
      // Check if keyframes at different times have identical positions
      if (summary.keyframeCount >= 2) {
        const first = summary.keyframes[0];
        const allSame = summary.keyframes.every(
          (kf) => Math.abs(kf.x - first.x) < 0.5 && Math.abs(kf.y - first.y) < 0.5
        );
        if (allSame) {
          issues.push(`${id}: all ${summary.keyframeCount} keyframes have same position (x=${first.x}, y=${first.y})`);
        }
      }
    });

    const payload = {
      timestamp: new Date().toISOString(),
      currentTimeMs: currentTime,
      enginePlaying,
      isPlaying,
      durationMs: anim?.durationMs,
      selectedKeyframeMs,
      selectedItemIds: entities.selectedItemIds || [],
      representedPlayerIds: represented,
      trackCount: Object.keys(tracks).length,
      entityCount: allIds.length,
      issues: issues.length ? issues : ["none detected"],
      entities: entitySummaries,
      persistedPlaySummary: summarizePersistedPlayData(playbookPlayData),
      persistenceLogs: getPersistenceDebugLogs(300),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      onShowMessage?.("Debug copied", "Full player + keyframe snapshot copied to clipboard.", "success");
      return true;
    } catch {
      onShowMessage?.("Copy failed", "Clipboard access was denied.", "error");
      return false;
    }
  }, [
    entities.playersById,
    entities.ballsById,
    entities.representedPlayerIds,
    entities.selectedItemIds,
    isPlaying,
    playbookPlayData,
    selectedKeyframeMs,
    onShowMessage,
  ]);

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
  }, [entities]);

  // --- Prefab handlers ---

  const handlePrefabSelect = useCallback((prefab) => {
    pendingPrefabRef.current = prefab;
    setCanvasTool("prefab");
  }, []);

  const handleCanvasPlacePrefab = useCallback(({ x, y }) => {
    const prefab = pendingPrefabRef.current;
    if (!prefab?.players?.length && !prefab?.ball) return;

    const sportCfg = SPORT_DEFAULTS[currentFieldType] || {};
    const usePositionLabels = Boolean(sportCfg.usePositionLabels);

    logPrefabDebug(
      `place fieldType=${currentFieldType} usePositionLabels=${usePositionLabels} playerCount=${prefab.players?.length ?? 0} prefabPlayers=${JSON.stringify((prefab.players || []).map((p) => ({ number: p.number, name: p.name ?? "" })))}`
    );

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
        number: usePositionLabels ? (p.number ?? "") : getNextAvailableNumber(color, p.number),
        name: usePositionLabels ? "" : (p.name ?? ""),
        color,
      };
      logPrefabDebug(
        `placed id=${newId} number="${currentById[newId].number}" name="${currentById[newId].name}" color=${color}`
      );
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
  }, [entities, currentFieldType]);

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
    const targetTrackIds = getKeyframeActionTrackIds();
    if (!targetTrackIds.length) return;

    setAnimationDataWithMeta((base) => {
      const nextTracks = { ...base.tracks };
      let changed = false;
      targetTrackIds.forEach((itemId) => {
        if (isTooCloseToExistingKeyframe(nextTracks[itemId], timeMs)) {
          logAnimDebug(`addKeyframe BLOCKED item=${itemId} t=${timeMs} — too close to existing keyframe`);
          return;
        }
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
          `addKeyframe item=${itemId} t=${timeMs} x=${Math.round(pose.x ?? 0)} y=${Math.round(pose.y ?? 0)}`
        );
        logAction("keyframe_added", { itemId, t: timeMs });
      });
      const covered = ensureKeyframeCoverageAtTime(base, nextTracks, timeMs);
      if (!changed && !covered.changed) return null;
      return { ...base, tracks: covered.tracks };
    });

    setSelectedKeyframeMs(timeMs);
  }, [ensureKeyframeCoverageAtTime, getKeyframeActionTrackIds, resolveTrackPose, setAnimationDataWithMeta, logAction]);

  const handleDeleteKeyframe = useCallback(
    (timeMs) => {
      const targetTrackIds = getKeyframeActionTrackIds();
      if (!targetTrackIds.length) return;
      const roundedTime = Math.round(timeMs);

      setAnimationDataWithMeta((base) => {
        const nextTracks = { ...base.tracks };
        targetTrackIds.forEach((itemId) => {
          nextTracks[itemId] = deleteKeyframeAtTime(nextTracks[itemId], roundedTime, 0.5);
          logAnimDebug(`deleteKeyframe item=${itemId} t=${roundedTime}`);
          logAction("keyframe_deleted", { itemId, t: roundedTime });
        });
        return { ...base, tracks: nextTracks };
      });
    },
    [getKeyframeActionTrackIds, setAnimationDataWithMeta, logAction]
  );

  const handleDeleteAllKeyframes = useCallback(() => {
    const targetTrackIds = getKeyframeActionTrackIds();
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
  }, [getKeyframeActionTrackIds, setAnimationDataWithMeta]);

  const handleMoveKeyframe = useCallback(
    (fromTimeMs, toTimeMs) => {
      const targetTrackIds = getKeyframeActionTrackIds();
      if (!targetTrackIds.length) return;
      const from = Math.round(fromTimeMs);
      const to = Math.round(toTimeMs);
      if (from === to) return;
      const firstVisibleKeyframe = getTrackKeyframeTimes(animationDataRef.current, targetTrackIds)[0];
      if (Number.isFinite(firstVisibleKeyframe) && Math.abs(from - firstVisibleKeyframe) <= 0.5) {
        logKfMoveDebug(
          `moveKeyframe blocked from=${from}ms reason=firstKeyframe locked=${Math.round(firstVisibleKeyframe)}`
        );
        setSelectedKeyframeMs(Math.round(firstVisibleKeyframe));
        return;
      }

      // Gather all keyframe times across all tracks to enforce spacing constraints
      const allKeyframeTimes = [];
      Object.values(animationDataRef.current?.tracks || {}).forEach((track) => {
        if (track?.keyframes?.length) {
          track.keyframes.forEach((kf) => {
            if (Math.abs(kf.t - from) > 0.5) {
              allKeyframeTimes.push(kf.t);
            }
          });
        }
      });

      // Clamp target time to maintain minimum spacing from neighbors
      const clampedToMs = clampKeyframeTargetTime(
        allKeyframeTimes,
        from,
        to,
        animationDataRef.current?.durationMs || LOOP_SECONDS * 1000
      );

      logKfMoveDebug(
        `moveKeyframe from=${from}ms to=${clampedToMs}ms (requested=${to}) tracks=[${targetTrackIds.join(",")}]`
      );

      setAnimationDataWithMeta((base) => {
        const nextTracks = { ...base.tracks };
        let changed = false;
        targetTrackIds.forEach((itemId) => {
          const track = nextTracks[itemId];
          if (!track?.keyframes?.length) return;
          const hasMatch = track.keyframes.some(
            (kf) => Math.abs(kf.t - from) <= 0.5
          );
          if (!hasMatch) return;
          nextTracks[itemId] = moveKeyframeTime(track, from, clampedToMs);
          changed = true;
          logKfMoveDebug(
            `  moved item=${itemId} keyframes=${nextTracks[itemId].keyframes.length}`
          );
        });
        if (!changed) {
          logKfMoveDebug(`  no matching keyframes found at t=${from}`);
          return null;
        }
        const covered = ensureKeyframeCoverageAtTime(base, nextTracks, clampedToMs);
        return { ...base, tracks: covered.tracks };
      });

      setSelectedKeyframeMs(Math.round(clampedToMs));
    },
    [ensureKeyframeCoverageAtTime, getKeyframeActionTrackIds, setAnimationDataWithMeta]
  );

  const upsertKeyframesAtCurrentTime = useCallback(
    (targetTrackIds, { source = "unknown" } = {}) => {
      const uniqueIds = Array.from(new Set((targetTrackIds || []).filter(Boolean)));
      if (!uniqueIds.length) return;

      const timeMs = resolveKeyframeWriteTimeMs();
      setAnimationDataWithMeta((base) => {
        const nextTracks = { ...base.tracks };
        let changed = false;
        const ballsById = ballsByIdRef.current || {};

        uniqueIds.forEach((itemId) => {
          if (!playersByIdRef.current?.[itemId] && !ballsById[itemId]) return;
          if (isTooCloseToExistingKeyframe(nextTracks[itemId], timeMs)) {
            logAnimDebug(
              `autoKeyframe BLOCKED source=${source} item=${itemId} t=${timeMs} — too close to existing keyframe`
            );
            return;
          }
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
        const covered = ensureKeyframeCoverageAtTime(base, nextTracks, timeMs);
        return { ...base, tracks: covered.tracks };
      });
    },
    [ensureKeyframeCoverageAtTime, resolveKeyframeWriteTimeMs, resolveTrackPose, setAnimationDataWithMeta]
  );

  const handleItemDragStart = useCallback(
    (id) => {
      const enginePlayingBefore = Boolean(engineRef.current?.isPlaying?.());
      if (recording.recordingModeEnabled) {
        logRecordingDebug(
          `itemDragStart id=${id} global=${recording.globalState} recordingPid=${recording.recordingPlayerId || "none"} selected=[${(entities.selectedItemIds || []).join(",")}] enginePlayingBefore=${enginePlayingBefore} pauseSuppressed=true`
        );
        // Auto-resume recording when dragging the recorded player (no countdown).
        if (recording.globalState === "paused" && id === recording.recordingPlayerId) {
          recording.resumeRecordingImmediate();
        }
      }
      // Don't pause engine during recording - recording uses its own timer.
      if (!recording.recordingModeEnabled) {
        engineRef.current.pause();
      }
      entities.handleItemDragStart(id);
    },
    [entities, recording.globalState, recording.recordingModeEnabled, recording.recordingPlayerId, recording.resumeRecordingImmediate]
  );

  const handleItemDragEnd = useCallback(
    (id) => {
      entities.handleItemDragEnd(id);
      const isPlayingNow = engineRef.current.isPlaying();

      const ballsById = ballsByIdRef.current || {};
      const movedPlayer = playersByIdRef.current?.[id];
      const movedBall = ballsById[id];
      if (movedPlayer || movedBall) {
        const pose = resolveTrackPose(id);
        const label = movedPlayer ? `P${movedPlayer.number || "?"}` : "ball";
        logAction("item_moved", { id, label, x: Math.round(pose?.x ?? 0), y: Math.round(pose?.y ?? 0) });
      }
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
      skipNextRenderPoseRef.current = true;
      upsertKeyframesAtCurrentTime(targetTrackIds, { source: "dragEnd" });
    },
    [
      entities,
      recording.globalState,
      recording.recordingModeEnabled,
      recording.recordingPlayerId,
      recording.pauseRecording,
      upsertKeyframesAtCurrentTime,
      logAction,
      resolveTrackPose,
    ]
  );

  const handleItemChange = useCallback(
    (id, next, meta) => {
      if (recording.recordingModeEnabled) {
        // Feed position to recording hook for the player being recorded.
        // Feed in all active states (recording/paused/countdown) so latestPosRef stays current.
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
        // Primary dragged item: use absolute position (already moved by Konva)
        // Don't apply delta again to avoid double-counting
        const primaryPose = resolveTrackPose(id) || { x: next.x, y: next.y };
        patch[id] = { ...primaryPose, x: next.x, y: next.y };

        // Other selected items: apply delta to their last known pose
        entities.selectedItemIds.forEach((itemId) => {
          if (itemId === id) return; // skip primary — handled above
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
        skipNextRenderPoseRef.current = true;
        upsertKeyframesAtCurrentTime(movedItemIds, { source });
      }
      return { moved: true, dx: nextDx, dy: nextDy, snappedX, snappedY };
    },
    [entities, fieldViewport.camera?.zoom, resolveTrackPose, upsertKeyframesAtCurrentTime]
  );

  /**
   * Handles a direct position edit from the right panel (X/Y inputs or alignment buttons).
   * Behaves like a drag-end: upserts a keyframe at the current time so animation data stays
   * consistent. Returns false if the edit is blocked (too close to an existing keyframe).
   * @param {string} id - Item id (player or ball).
   * @param {{ x: number, y: number }} pos - New world-space position.
   * @returns {boolean} True if applied, false if blocked.
   */
  const handlePositionEdit = useCallback(
    (id, pos) => {
      const timeMs = Math.round(currentTimeRef.current);
      const track = animationDataRef.current?.tracks?.[id];
      if (isTooCloseToExistingKeyframe(track, timeMs)) {
        return false;
      }
      entities.handleItemChange(id, pos);
      const r = resolveTrackPose(id)?.r ?? 0;
      const pose = { x: pos.x, y: pos.y, r };
      latestPosesRef.current[id] = pose;
      animationRendererRef.current?.setPoses?.({ [id]: pose });
      skipNextRenderPoseRef.current = true;
      upsertKeyframesAtCurrentTime([id], { source: "positionEdit" });
      return true;
    },
    [entities, resolveTrackPose, upsertKeyframesAtCurrentTime]
  );

  const loadPlayFromImport = useCallback(
    (importObj, options = {}) => {
      const { ok, error, play } = validatePlayImport(importObj);
      if (!ok) {
        logAnimDebug(`import failed err=${error}`);
        onShowMessage("Import failed", error, "error");
        logPersistence("loadPlayFromImport failed", { error });
        return false;
      }

      const nextPlayers = play.entities?.playersById || {};
      const nextRepresented = play.entities?.representedPlayerIds || Object.keys(nextPlayers);
      const nextBall = play.entities?.ball ?? INITIAL_BALL;
      const nextBallsById = play.entities?.ballsById ?? null;
      const nextCamera = play.canvas?.camera ?? { x: 0, y: 0, zoom: 1 };
      const nextFieldRotation = play.canvas?.fieldRotation ?? 0;
      const nextSettings =
        play.settings?.advancedSettings ?? createDefaultAdvancedSettings(defaultFieldType);
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
      const baselineTrackCounts = getTrackKeyframeCounts(importedAnimation);
      importGuardRef.current = {
        active: true,
        pendingFirstCommit: true,
        expiresAtMs: Date.now() + 3000,
        baselineAnimation: importedAnimation,
        baselineTrackCounts,
      };
      logPersistence("loadPlayFromImport start", {
        summary: summarizePersistedPlayData({ play }),
        importGuard: {
          movingTrackCount: countMovingTracks(baselineTrackCounts),
          trackCount: Object.keys(baselineTrackCounts).length,
        },
      });

      engineRef.current.pause({ shouldLog: false });
      engineRef.current.setDuration(importedAnimation.durationMs);
      engineRef.current.setPlaybackRate(speedToPlaybackRate(nextSpeed));
      engineRef.current.setLoop(nextAutoplay);
      engineRef.current.seek(0, { shouldLog: false, source: "engine" });

      const preferredPlayName = String(options?.preferredPlayName ?? "").trim();
      const importedPlayName = String(play.name ?? "").trim();
      setPlayName(preferredPlayName || importedPlayName || DEFAULT_PLAY_NAME);
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
      logAction("play_imported", { playerCount: Object.keys(nextPlayers).length, trackCount });
      logPersistence("loadPlayFromImport complete", {
        playerCount: Object.keys(nextPlayers).length,
        representedPlayerCount: Array.isArray(nextRepresented) ? nextRepresented.length : 0,
        trackCount,
        durationMs: importedAnimation.durationMs,
      });
      return true;
    },
    [
      defaultFieldType,
      entities,
      fieldViewport,
      onShowMessage,
      setAdvancedSettings,
      slateHistory,
      logAction,
    ]
  );

  // Load initial play data passed from parent (e.g. PlayEditPage).
  const initialPlayDataLoadedRef = useRef(false);
  const editorReadyRef = useRef(false);
  useEffect(() => {
    if (!initialPlayData || initialPlayDataLoadedRef.current) return;
    initialPlayDataLoadedRef.current = true;
    logPersistence("initialPlayData load requested", {
      summary: summarizePersistedPlayData(initialPlayData),
    });
    loadPlayFromImport(initialPlayData, { preferredPlayName: initialPlayName });
  }, [initialPlayData, initialPlayName, loadPlayFromImport]);

  // Signal to parent that the editor is ready (after first render + optional data load).
  const readyFiredRef = useRef(false);
  useEffect(() => {
    if (readyFiredRef.current) return;
    // If we have initial data, wait for it to load first.
    if (initialPlayData && !initialPlayDataLoadedRef.current) return;
    readyFiredRef.current = true;
    editorReadyRef.current = true;
    logPersistence("editorReady", {
      hasInitialPlayData: Boolean(initialPlayData),
    });
    onReady?.();
  });

  // Autosave: debounced persist to localStorage on playData or playName change.
  useEffect(() => {
    if (!playId || !editorReadyRef.current) return;
    const timeoutId = setTimeout(() => {
      persistToLocalStorage();
    }, 800);
    return () => clearTimeout(timeoutId);
  }, [playbookPlayData, playName, playId, persistToLocalStorage]);

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

  const handleAddPlayerLogged = useCallback(
    (params) => {
      entities.handleAddPlayer(params);
      logAction("player_added", { number: params?.number, name: params?.name });
    },
    [entities.handleAddPlayer, logAction]
  );

  const handleDeleteSelectedLogged = useCallback(
    () => {
      const count = (entities.selectedItemIds || []).length;
      entities.handleDeleteSelected();
      logAction("items_deleted", { count });
    },
    [entities.handleDeleteSelected, entities.selectedItemIds, logAction]
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tagName = e.target?.tagName || "UNKNOWN";
      const isTypingTarget =
        tagName === "INPUT" || tagName === "TEXTAREA" || e.target?.isContentEditable;
      // Prevent browser save dialog on Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && String(e.key || "").toLowerCase() === "s") {
        e.preventDefault();
        return;
      }

      if (e.key === "Escape") {
        // Recording mode: stop/cancel current action and return to idle overview.
        if (recording.recordingModeEnabled) {
          const gs = recording.globalState;
          if (gs === "recording" || gs === "paused") {
            recording.stopRecording();
            return;
          }
          if (gs === "countdown") {
            recording.cancelRecording();
            return;
          }
          if (gs === "previewing") {
            recording.stopPreview();
            return;
          }
        }
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
      handleDeleteSelectedLogged();
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
    handleDeleteSelectedLogged,
    recording.recordingModeEnabled,
    recording.globalState,
    recording.stopRecording,
    recording.cancelRecording,
    recording.stopPreview,
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
      {/* Loading overlay — fades out when canvas assets are ready */}
      {slateLoadPhase !== "done" && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-BrandBlack transition-opacity duration-500 ease-out"
          style={{ opacity: slateLoadPhase === "fading" ? 0 : 1 }}
          onTransitionEnd={() => {
            if (slateLoadPhase === "fading") setSlateLoadPhase("done");
          }}
        >
          <div
            className="flex flex-col items-center gap-4 transition-all duration-500 ease-out"
            style={{
              opacity: slateLoadPhase === "fading" ? 0 : 1,
              transform: slateLoadPhase === "fading" ? "scale(1.05)" : "scale(1)",
              filter: slateLoadPhase === "fading" ? "blur(8px)" : "blur(0px)",
            }}
          >
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-[3px] border-BrandGray/30" />
              <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-BrandOrange animate-spin" />
            </div>
            <span className="text-sm text-BrandGray tracking-wide">
              Loading slate&hellip;
            </span>
          </div>
        </div>
      )}
      {showEditPanels && (
        <div
          className={`shrink-0 overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out ${
            panelsExpanded ? "max-w-[12rem] opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          <WideSidebar
            activeTool={canvasTool}
            onToolChange={handleToolChange}
            onUndo={slateHistory.onUndo}
            onRedo={slateHistory.onRedo}
            onReset={onReset}
            onAddPlayer={handleAddPlayerLogged}
            onPlayerColorChange={entities.handlePlayerColorChange}
            onDeleteSelected={handleDeleteSelectedLogged}
            onPrefabSelect={handlePrefabSelect}
            onDeleteCustomPrefab={handleDeleteCustomPrefab}
            customPrefabs={customPrefabs}
            playName={playName}
            onCollapse={() => setViewOnlyLocal(true)}
            onNavigateHome={onNavigateHome}
            adminMode={adminMode}
          />
        </div>
      )}
      <div ref={containerRef} data-slate-root className="flex-1 flex relative">
        <KonvaCanvasRoot
          tool={viewOnly ? "hand" : canvasTool}
          viewOnly={viewOnly}
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
          drawArrowTip={drawArrowTip}
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
          disableSnapping={recording.recordingModeEnabled}
          onAssetsLoaded={handleAssetsLoaded}
          onFieldBoundsChange={setFieldBounds}
        />
        {/* Text editing is now handled via right panel textarea */}
        {!viewOnly && recording.countdownValue != null && (
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
        {!viewOnly && screenshotMode && (
          <ScreenshotConfirmBar
            hasRegion={Boolean(screenshotRegion)}
            onConfirm={handleScreenshotConfirm}
            onCancel={handleScreenshotCancel}
          />
        )}
        {!viewOnly && canvasTool === "pen" && !screenshotMode && (
          <DrawToolsPill
            activeSubTool={drawSubTool}
            onSubToolChange={handleDrawSubToolChange}
          />
        )}
        {showViewOverlay ? (
          <div
            className="transition-opacity duration-300 ease-in-out"
            style={{ opacity: viewOverlayVisible ? 1 : 0 }}
          >
          <ViewOnlyControls
            durationMs={animationData.durationMs}
            currentTimeMs={timelineDisplayTimeMs}
            isPlaying={isPlaying}
            speedMultiplier={speedMultiplier}
            autoplayEnabled={autoplayEnabled}
            onSeek={seekTimeline}
            onPause={pauseTimeline}
            onPlayToggle={togglePlayback}
            onSpeedChange={setSpeedMultiplier}
            onAutoplayChange={setAutoplayEnabled}
            getAuthoritativeTimeMs={getAuthoritativeTimeMs}
            onDragStateChange={handleTimelineDragStateChange}
            onExitViewOnly={viewOnlyProp ? (onNavigateHome || null) : () => setViewOnlyLocal(false)}
            exitIsBack={!!viewOnlyProp}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            playName={playName}
          />
          </div>
        ) : recording.recordingModeEnabled ? (
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
            onDeleteSelectedObjects={handleDeleteSelectedLogged}
            onSelectKeyframe={setSelectedKeyframeMs}
            onAutoplayChange={setAutoplayEnabled}
            onMoveKeyframe={handleMoveKeyframe}
            getAuthoritativeTimeMs={getAuthoritativeTimeMs}
            onDragStateChange={handleTimelineDragStateChange}
          />
        )}
      </div>
      {!viewOnly && (
        <>
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
            sourcePlayId={playId}
            onClose={() => setSaveToPlaybookOpen(false)}
            onSaved={handlePlaybookSaved}
          />
          <AuthPromptModal
            open={authPromptOpen}
            onClose={() => setAuthPromptOpen(false)}
            onLogin={() => { window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`; }}
            onSignup={() => { window.location.href = `/signup?returnTo=${encodeURIComponent(window.location.pathname)}`; }}
          />
          <ExportOverlay
            visible={isExporting || !!exportError}
            progress={exportProgress ?? 0}
            error={exportError}
            onDismissError={() => setExportError(null)}
          />
        </>
      )}

      {showEditPanels && <div
        className={`shrink-0 overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out ${
          panelsExpanded ? "max-w-[12rem] opacity-100" : "max-w-0 opacity-0"
        }`}
      ><RightPanel
        canvasTool={canvasTool}
        drawSubTool={drawSubTool}
        drawColor={drawColor}
        drawOpacity={drawOpacity}
        drawStrokeWidth={drawStrokeWidth}
        drawSmoothing={drawSmoothing}
        drawFontSize={drawFontSize}
        drawTextAlign={drawTextAlign}
        drawArrowHeadType={drawArrowHeadType}
        onDrawColorChange={handleDrawColorChange}
        onDrawOpacityChange={handleDrawOpacityChange}
        onDrawStrokeWidthChange={handleDrawStrokeWidthChange}
        onDrawSmoothingChange={handleDrawSmoothingChange}
        onDrawFontSizeChange={handleDrawFontSizeChange}
        onDrawTextAlignChange={handleDrawTextAlignChange}
        onDrawArrowHeadTypeChange={handleDrawArrowHeadTypeChange}
        drawArrowTip={drawArrowTip}
        onDrawArrowTipChange={setDrawArrowTip}
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
        fieldBounds={fieldBounds}
        onPlayerPositionChange={handlePositionEdit}
        timelineDisplayTimeMs={timelineDisplayTimeMs}
        resolveItemPose={resolveTrackPose}
        recordingModeEnabled={recording.recordingModeEnabled}
        recordingGlobalState={recording.globalState}
        recordingPlayerId={recording.recordingPlayerId}
        recordingPlayerStates={recording.playerStates}
        onStartRecording={handleStartRecording}
        onResumeRecording={recording.resumeRecording}
        onClearPlayerRecording={recording.clearPlayerRecording}
        onClearAllRecordings={recording.clearAllRecordings}
      /></div>}
      {!viewOnly && (
        <>
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
            fieldType={currentFieldType}
          />
        </>
      )}
      {!viewOnly && showAdvancedSettings && (
        <AdvancedSettings
          value={advancedSettings}
          onChange={setAdvancedSettings}
          onReset={() => {
            setAdvancedSettings(createDefaultAdvancedSettings(defaultFieldType));
            const sd = SPORT_DEFAULTS[defaultFieldType] || {};
            fieldViewport.setFieldRotation(sd.defaultFieldRotation ?? 0);
          }}
          onFieldTypeChange={(newFieldType) => {
            const sd = SPORT_DEFAULTS[newFieldType] || {};
            fieldViewport.setFieldRotation(sd.defaultFieldRotation ?? 0);
          }}
          onCopyDebug={handleCopyDebug}
          onCopyDrawDebug={handleCopyDrawDebug}
          onCopyKeyToolDebug={handleCopyKeyToolDebug}
          onCopyPrefabDebug={handleCopyPrefabDebug}
          onCopyPlaceBallDebug={handleCopyPlaceBallDebug}
          onCopyVideoExportDebug={handleCopyVideoExportDebug}
          onCopyRecordingDebug={handleCopyRecordingDebug}
          onCopyKfMoveDebug={handleCopyKfMoveDebug}
          onCopyFixAllDebug={handleCopyFixAllDebug}
          onDebugRotate={handleDebugRotate}
          onDownload={onDownload}
          onImport={handleImportClick}
          onClose={() => setShowAdvancedSettings(false)}
          autoplayEnabled={autoplayEnabled}
          onAutoplayChange={setAutoplayEnabled}
          onDeleteAllKeyframes={handleDeleteAllKeyframes}
          onRecordModeComingSoon={() =>
            onShowMessage?.("Coming soon", "Record Mode is currently disabled.", "standard")
          }
          debugPlayData={playbookPlayData}
          selectedItemIds={entities.selectedItemIds}
          playersById={entities.playersById}
          ballsById={entities.ballsById}
          animationData={animationData}
          currentTimeMs={Math.round(currentTimeRef.current)}
          actionLog={actionLog}
          adminMode={adminMode}
        />
      )}
    </>
  );
}

export default Slate;
