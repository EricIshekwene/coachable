import { useCallback, useEffect, useRef, useState } from "react";
import { log as logRecordingDebug } from "../recordingDebugLogger";

/**
 * Recording states per player:
 * - "idle"      - not recorded yet
 * - "recording" - actively recording movement
 * - "recorded"  - has a recording saved
 *
 * Global states:
 * - "idle"       - no recording in progress
 * - "recording"  - actively recording one player's movement
 * - "previewing" - playing back all recorded tracks together
 */

const SAMPLE_INTERVAL_MS = 100;
const SAMPLE_LOG_INTERVAL_MS = 500;
const FEED_LOG_INTERVAL_MS = 150;
const STALE_FEED_WARN_INTERVAL_MS = 1200;
const PREVIEW_LOG_INTERVAL_MS = 750;

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

/**
 * Interpolate a position from a sorted keyframe array at a given time.
 * Keyframes are [{t, x, y}, ...] sorted by t ascending.
 */
function interpolateTrack(keyframes, timeMs) {
  if (!keyframes?.length) return null;
  if (timeMs <= keyframes[0].t) return { x: keyframes[0].x, y: keyframes[0].y };
  const last = keyframes[keyframes.length - 1];
  if (timeMs >= last.t) return { x: last.x, y: last.y };

  let i = 0;
  while (i < keyframes.length - 1 && keyframes[i + 1].t <= timeMs) i += 1;
  const a = keyframes[i];
  const b = keyframes[i + 1];
  if (!b) return { x: a.x, y: a.y };

  const ratio = (timeMs - a.t) / (b.t - a.t);
  return {
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
  };
}

/**
 * Hook that manages recording-mode: records player movement one at a time
 * using its own RAF-based timer (independent of AnimationEngine).
 *
 * Position data is fed externally via `feedPosition(x, y)` from drag events.
 * Recorded tracks are stored in animationData.tracks for export compatibility.
 */
export function useRecordingMode({
  animationRendererRef,
  setAnimationDataWithMeta,
  animationDataRef,
  playersByIdRef,
}) {
  const [recordingModeEnabled, setRecordingModeEnabledRaw] = useState(false);
  const [recordingPlayerId, setRecordingPlayerId] = useState(null);
  const [globalState, setGlobalState] = useState("idle");
  const [playerStates, setPlayerStates] = useState({});
  const [recordingTimeMs, setRecordingTimeMs] = useState(0);
  const [previewTimeMs, setPreviewTimeMs] = useState(0);
  const [recordingDurationMs, setRecordingDurationMs] = useState(10000);

  const recordingPlayerIdRef = useRef(null);
  const latestPosRef = useRef({ x: 0, y: 0 });
  const recordingStartRef = useRef(null); // performance.now() at start
  const lastSampleElapsedRef = useRef(0);
  const recordingBufferRef = useRef([]); // [{t, x, y}]
  const rafIdRef = useRef(null);
  const preRecordingTrackRef = useRef(null);
  const globalStateRef = useRef("idle");
  const durationMsRef = useRef(recordingDurationMs);
  const lastFeedAtRef = useRef(0);
  const feedCountRef = useRef(0);
  const sampleCountRef = useRef(0);
  const lastFeedLogAtRef = useRef(-Infinity);
  const lastSampleLogAtRef = useRef(-Infinity);
  const lastStaleWarnAtRef = useRef(-Infinity);
  const recordingSessionStartIsoRef = useRef(null);

  // Preview
  const previewRafIdRef = useRef(null);
  const previewStartRef = useRef(null);
  const previewFrameCountRef = useRef(0);
  const lastPreviewLogAtRef = useRef(-Infinity);
  const currentPreviewElapsedRef = useRef(0);

  useEffect(() => {
    recordingPlayerIdRef.current = recordingPlayerId;
  }, [recordingPlayerId]);

  useEffect(() => {
    durationMsRef.current = recordingDurationMs;
  }, [recordingDurationMs]);

  useEffect(() => {
    globalStateRef.current = globalState;
  }, [globalState]);

  // Feed position from external drag events.
  const feedPosition = useCallback((x, y) => {
    latestPosRef.current = { x, y };
    if (globalStateRef.current !== "recording") return;

    const now = performance.now();
    feedCountRef.current += 1;
    lastFeedAtRef.current = now;

    if (now - lastFeedLogAtRef.current >= FEED_LOG_INTERVAL_MS) {
      lastFeedLogAtRef.current = now;
      logRecordingDebug(
        `feedPosition pid=${recordingPlayerIdRef.current || "none"} x=${Math.round(x)} y=${Math.round(y)} feedCount=${feedCountRef.current}`
      );
    }
  }, []);

  // Internal preview stop helper.
  const stopPreviewInternal = useCallback(
    (reason = "unknown") => {
      if (previewRafIdRef.current) {
        cancelAnimationFrame(previewRafIdRef.current);
        previewRafIdRef.current = null;
      }
      previewStartRef.current = null;
      setGlobalState("idle");
      setPreviewTimeMs(0);

      // Reset all players to their t=0 positions.
      const tracks = animationDataRef.current?.tracks || {};
      const patch = {};
      Object.entries(tracks).forEach(([itemId, track]) => {
        if (!track?.keyframes?.length) return;
        patch[itemId] = { x: track.keyframes[0].x, y: track.keyframes[0].y };
      });
      if (Object.keys(patch).length) {
        animationRendererRef.current?.setPoses?.(patch, { flush: true });
      }

      logRecordingDebug(
        `preview stop reason=${reason} renderedItems=${Object.keys(patch).length} frameCount=${previewFrameCountRef.current} elapsedMs=${Math.round(currentPreviewElapsedRef.current)}`
      );
      previewFrameCountRef.current = 0;
      lastPreviewLogAtRef.current = -Infinity;
      currentPreviewElapsedRef.current = 0;
    },
    [animationDataRef, animationRendererRef]
  );

  // Internal recording stop helper.
  const finishRecording = useCallback(
    (reason = "unknown") => {
      const pid = recordingPlayerIdRef.current;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      const buffer = recordingBufferRef.current;
      const recordedDurationMs = recordingStartRef.current
        ? Math.max(0, performance.now() - recordingStartRef.current)
        : 0;
      const firstFrame = buffer[0] || null;
      const lastFrame = buffer.length ? buffer[buffer.length - 1] : null;
      logRecordingDebug(
        `stop reason=${reason} pid=${pid || "none"} frames=${buffer.length} samples=${sampleCountRef.current} feeds=${feedCountRef.current} durationMs=${Math.round(recordedDurationMs)} first=${firstFrame ? `${Math.round(firstFrame.x)},${Math.round(firstFrame.y)}@${firstFrame.t}` : "none"} last=${lastFrame ? `${Math.round(lastFrame.x)},${Math.round(lastFrame.y)}@${lastFrame.t}` : "none"}`
      );

      // Save buffer into animation data tracks.
      if (pid && buffer.length > 0) {
        const keyframes = [...buffer];
        setAnimationDataWithMeta((base) => {
          const nextTracks = { ...base.tracks };
          nextTracks[pid] = { keyframes };
          return { ...base, tracks: nextTracks };
        });
        setPlayerStates((prev) => ({ ...prev, [pid]: "recorded" }));
      } else if (pid) {
        // No frames recorded, mark idle.
        setPlayerStates((prev) => ({ ...prev, [pid]: "idle" }));
      }

      recordingBufferRef.current = [];
      recordingStartRef.current = null;
      recordingSessionStartIsoRef.current = null;
      preRecordingTrackRef.current = null;
      lastSampleElapsedRef.current = 0;
      lastFeedAtRef.current = 0;
      feedCountRef.current = 0;
      sampleCountRef.current = 0;
      lastFeedLogAtRef.current = -Infinity;
      lastSampleLogAtRef.current = -Infinity;
      lastStaleWarnAtRef.current = -Infinity;
      setGlobalState("idle");
      setRecordingPlayerId(null);
      setRecordingTimeMs(0);
    },
    [setAnimationDataWithMeta]
  );

  // Recording RAF loop.
  const recordingTickRef = useRef(null);
  recordingTickRef.current = () => {
    if (globalStateRef.current !== "recording") return;

    if (!recordingStartRef.current) {
      logRecordingDebug("tick abort reason=missingStartTime");
      finishRecording("missingStartTime");
      return;
    }

    const now = performance.now();
    const elapsed = now - recordingStartRef.current;
    const duration = durationMsRef.current;

    setRecordingTimeMs(elapsed);

    // Sample at fixed interval.
    if (elapsed - lastSampleElapsedRef.current >= SAMPLE_INTERVAL_MS) {
      lastSampleElapsedRef.current = elapsed;
      sampleCountRef.current += 1;

      const pos = latestPosRef.current;
      recordingBufferRef.current.push({
        t: Math.round(elapsed),
        x: round2(pos.x),
        y: round2(pos.y),
      });

      const sinceLastFeed = lastFeedAtRef.current > 0 ? now - lastFeedAtRef.current : null;
      if (
        elapsed - lastSampleLogAtRef.current >= SAMPLE_LOG_INTERVAL_MS ||
        recordingBufferRef.current.length <= 3
      ) {
        lastSampleLogAtRef.current = elapsed;
        logRecordingDebug(
          `sample pid=${recordingPlayerIdRef.current || "none"} t=${Math.round(elapsed)} x=${Math.round(pos.x || 0)} y=${Math.round(pos.y || 0)} frames=${recordingBufferRef.current.length} samples=${sampleCountRef.current} feedCount=${feedCountRef.current} msSinceFeed=${sinceLastFeed === null ? "none" : Math.round(sinceLastFeed)}`
        );
      }

      if (
        sinceLastFeed !== null &&
        sinceLastFeed >= STALE_FEED_WARN_INTERVAL_MS &&
        elapsed - lastStaleWarnAtRef.current >= STALE_FEED_WARN_INTERVAL_MS
      ) {
        lastStaleWarnAtRef.current = elapsed;
        logRecordingDebug(
          `staleFeed pid=${recordingPlayerIdRef.current || "none"} t=${Math.round(elapsed)} msSinceFeed=${Math.round(sinceLastFeed)}`
        );
      }
    }

    if (elapsed >= duration) {
      logRecordingDebug(
        `autoStop pid=${recordingPlayerIdRef.current || "none"} elapsed=${Math.round(elapsed)} frames=${recordingBufferRef.current.length} samples=${sampleCountRef.current} feeds=${feedCountRef.current}`
      );
      finishRecording("autoStop");
      return;
    }

    rafIdRef.current = requestAnimationFrame(() => recordingTickRef.current?.());
  };

  const startRecording = useCallback(
    (playerId) => {
      if (!playerId) {
        logRecordingDebug("start ignored reason=missingPlayerId");
        return;
      }

      // If already recording, stop first.
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // Read duration from animation data.
      durationMsRef.current = recordingDurationMs;

      // Save existing track for cancel/restore.
      const currentTrack = animationDataRef.current?.tracks?.[playerId];
      preRecordingTrackRef.current = currentTrack
        ? JSON.parse(JSON.stringify(currentTrack))
        : null;
      const existingKeyframes = preRecordingTrackRef.current?.keyframes?.length || 0;

      // Get player's current visual position for initial frame.
      const renderer = animationRendererRef.current;
      const rendererPose = renderer?.getCurrentPose?.(playerId);
      const player = playersByIdRef.current?.[playerId];
      const initialX = rendererPose?.x ?? player?.x ?? 0;
      const initialY = rendererPose?.y ?? player?.y ?? 0;
      const initialSource = rendererPose ? "renderer" : player ? "player" : "fallback";

      latestPosRef.current = { x: initialX, y: initialY };
      recordingSessionStartIsoRef.current = new Date().toISOString();

      logRecordingDebug(
        `start pid=${playerId} initialPos=(${Math.round(initialX)},${Math.round(initialY)}) source=${initialSource} duration=${Math.round(durationMsRef.current)} existingKeyframes=${existingKeyframes}`
      );

      // Clear this player's track (written on stop).
      setAnimationDataWithMeta((base) => {
        const nextTracks = { ...base.tracks };
        nextTracks[playerId] = { keyframes: [] };
        return { ...base, tracks: nextTracks };
      });

      setRecordingPlayerId(playerId);
      recordingPlayerIdRef.current = playerId;
      setGlobalState("recording");
      setRecordingTimeMs(0);
      setPlayerStates((prev) => ({ ...prev, [playerId]: "recording" }));

      // Initialize buffer with initial position at t=0.
      recordingBufferRef.current = [{ t: 0, x: round2(initialX), y: round2(initialY) }];
      lastSampleElapsedRef.current = 0;
      recordingStartRef.current = performance.now();
      lastFeedAtRef.current = recordingStartRef.current;
      feedCountRef.current = 0;
      sampleCountRef.current = 0;
      lastFeedLogAtRef.current = -Infinity;
      lastSampleLogAtRef.current = -Infinity;
      lastStaleWarnAtRef.current = -Infinity;
      logRecordingDebug(`start armed pid=${playerId} sampleIntervalMs=${SAMPLE_INTERVAL_MS}`);

      rafIdRef.current = requestAnimationFrame(() => recordingTickRef.current?.());
    },
    [animationDataRef, animationRendererRef, playersByIdRef, setAnimationDataWithMeta, recordingDurationMs]
  );

  const stopRecording = useCallback(() => {
    logRecordingDebug(
      `stop requested pid=${recordingPlayerIdRef.current || "none"} global=${globalStateRef.current}`
    );
    finishRecording("manualStop");
  }, [finishRecording]);

  const cancelRecording = useCallback(() => {
    const pid = recordingPlayerIdRef.current;
    const restoreKeyframes = preRecordingTrackRef.current?.keyframes?.length || 0;
    logRecordingDebug(
      `cancel begin pid=${pid || "none"} bufferedFrames=${recordingBufferRef.current.length} restoreKeyframes=${restoreKeyframes}`
    );

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Restore old track.
    if (pid) {
      setAnimationDataWithMeta((base) => {
        const nextTracks = { ...base.tracks };
        if (preRecordingTrackRef.current) {
          nextTracks[pid] = preRecordingTrackRef.current;
        } else {
          nextTracks[pid] = { keyframes: [] };
        }
        return { ...base, tracks: nextTracks };
      });
      setPlayerStates((prev) => ({
        ...prev,
        [pid]: preRecordingTrackRef.current?.keyframes?.length ? "recorded" : "idle",
      }));
    }

    recordingBufferRef.current = [];
    recordingStartRef.current = null;
    recordingSessionStartIsoRef.current = null;
    preRecordingTrackRef.current = null;
    lastFeedAtRef.current = 0;
    feedCountRef.current = 0;
    sampleCountRef.current = 0;
    lastFeedLogAtRef.current = -Infinity;
    lastSampleLogAtRef.current = -Infinity;
    lastStaleWarnAtRef.current = -Infinity;
    setGlobalState("idle");
    setRecordingPlayerId(null);
    setRecordingTimeMs(0);
    logRecordingDebug(`cancel done pid=${pid || "none"} resetTo=idle`);
  }, [setAnimationDataWithMeta]);

  // Preview RAF loop.
  const previewTickRef = useRef(null);
  previewTickRef.current = () => {
    if (globalStateRef.current !== "previewing") return;
    if (!previewStartRef.current) {
      logRecordingDebug("preview tick abort reason=missingStartTime");
      stopPreviewInternal("missingStartTime");
      return;
    }

    const now = performance.now();
    const elapsed = now - previewStartRef.current;
    currentPreviewElapsedRef.current = elapsed;
    const duration = durationMsRef.current;

    if (elapsed >= duration) {
      setPreviewTimeMs(duration);
      currentPreviewElapsedRef.current = duration;
      logRecordingDebug(
        `preview reachedEnd elapsed=${Math.round(elapsed)} duration=${Math.round(duration)}`
      );
      stopPreviewInternal("durationReached");
      return;
    }

    setPreviewTimeMs(elapsed);

    // Interpolate all recorded tracks and push to renderer.
    const tracks = animationDataRef.current?.tracks || {};
    const patch = {};
    Object.entries(tracks).forEach(([itemId, track]) => {
      if (!track?.keyframes?.length) return;
      const pos = interpolateTrack(track.keyframes, elapsed);
      if (pos) patch[itemId] = { x: pos.x, y: pos.y };
    });

    if (Object.keys(patch).length) {
      animationRendererRef.current?.setPoses?.(patch);
    }

    previewFrameCountRef.current += 1;
    if (elapsed - lastPreviewLogAtRef.current >= PREVIEW_LOG_INTERVAL_MS) {
      lastPreviewLogAtRef.current = elapsed;
      logRecordingDebug(
        `preview tick t=${Math.round(elapsed)} patchItems=${Object.keys(patch).length} frameCount=${previewFrameCountRef.current}`
      );
    }

    previewRafIdRef.current = requestAnimationFrame(() => previewTickRef.current?.());
  };

  const startPreview = useCallback(() => {
    durationMsRef.current = recordingDurationMs;
    const recordedTracks = Object.entries(animationDataRef.current?.tracks || {}).filter(
      ([, track]) => (track?.keyframes?.length || 0) > 0
    );

    logRecordingDebug(
      `preview start duration=${Math.round(durationMsRef.current)} tracksWithFrames=${recordedTracks.length}`
    );
    previewStartRef.current = performance.now();
    currentPreviewElapsedRef.current = 0;
    previewFrameCountRef.current = 0;
    lastPreviewLogAtRef.current = -Infinity;
    setGlobalState("previewing");
    setPreviewTimeMs(0);
    previewRafIdRef.current = requestAnimationFrame(() => previewTickRef.current?.());
  }, [animationDataRef, recordingDurationMs]);

  const stopPreview = useCallback(() => {
    logRecordingDebug("preview stop requested");
    stopPreviewInternal("manualStop");
  }, [stopPreviewInternal]);

  // Player management.
  const clearPlayerRecording = useCallback(
    (playerId) => {
      const prevKeyframes = animationDataRef.current?.tracks?.[playerId]?.keyframes?.length || 0;
      logRecordingDebug(`clearPlayer pid=${playerId} prevKeyframes=${prevKeyframes}`);
      setAnimationDataWithMeta((base) => {
        const nextTracks = { ...base.tracks };
        nextTracks[playerId] = { keyframes: [] };
        return { ...base, tracks: nextTracks };
      });
      setPlayerStates((prev) => ({ ...prev, [playerId]: "idle" }));
    },
    [animationDataRef, setAnimationDataWithMeta]
  );

  const clearAllRecordings = useCallback(() => {
    const trackCount = Object.keys(animationDataRef.current?.tracks || {}).length;
    logRecordingDebug(`clearAll tracks=${trackCount}`);
    setAnimationDataWithMeta((base) => {
      const nextTracks = {};
      Object.keys(base.tracks || {}).forEach((id) => {
        nextTracks[id] = { keyframes: [] };
      });
      return { ...base, tracks: nextTracks };
    });
    setPlayerStates((prev) => {
      const next = {};
      Object.keys(prev).forEach((id) => {
        next[id] = "idle";
      });
      return next;
    });
  }, [animationDataRef, setAnimationDataWithMeta]);

  const syncPlayerStates = useCallback((playersById) => {
    logRecordingDebug(`syncPlayerStates incomingPlayers=${Object.keys(playersById || {}).length}`);
    setPlayerStates((prev) => {
      const next = {};
      Object.keys(playersById || {}).forEach((id) => {
        next[id] = prev[id] || "idle";
      });
      return next;
    });
  }, []);

  const setRecordingModeEnabled = useCallback((value) => {
    setRecordingModeEnabledRaw((prev) => {
      const nextEnabled = Boolean(typeof value === "function" ? value(prev) : value);
      if (prev !== nextEnabled) {
        logRecordingDebug(`setMode enabled=${nextEnabled}`);
      }

      if (!nextEnabled) {
        // Cleanup on disable.
        const droppedFrames = recordingBufferRef.current.length;
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        if (previewRafIdRef.current) {
          cancelAnimationFrame(previewRafIdRef.current);
          previewRafIdRef.current = null;
        }
        recordingBufferRef.current = [];
        recordingStartRef.current = null;
        recordingSessionStartIsoRef.current = null;
        preRecordingTrackRef.current = null;
        lastFeedAtRef.current = 0;
        feedCountRef.current = 0;
        sampleCountRef.current = 0;
        lastFeedLogAtRef.current = -Infinity;
        lastSampleLogAtRef.current = -Infinity;
        lastStaleWarnAtRef.current = -Infinity;
        previewFrameCountRef.current = 0;
        lastPreviewLogAtRef.current = -Infinity;
        currentPreviewElapsedRef.current = 0;
        setGlobalState("idle");
        setRecordingPlayerId(null);
        setRecordingTimeMs(0);
        setPreviewTimeMs(0);
        logRecordingDebug(`mode disabled resetState droppedFrames=${droppedFrames}`);
      }
      return nextEnabled;
    });
  }, []);

  const recordedCount = Object.values(playerStates).filter((s) => s === "recorded").length;
  const totalCount = Object.keys(playerStates).length;

  const getDebugSnapshot = useCallback(() => {
    const tracks = animationDataRef.current?.tracks || {};
    const trackFrameCounts = Object.entries(tracks)
      .map(([id, track]) => ({ id, keyframes: track?.keyframes?.length || 0 }))
      .filter((entry) => entry.keyframes > 0)
      .sort((a, b) => b.keyframes - a.keyframes);

    const pid = recordingPlayerIdRef.current;
    const currentTrackKeyframes = pid ? tracks?.[pid]?.keyframes?.length || 0 : 0;
    const now = performance.now();
    const msSinceLastFeed =
      lastFeedAtRef.current > 0 ? Math.round(now - lastFeedAtRef.current) : null;

    return {
      sessionStartedAt: recordingSessionStartIsoRef.current,
      recordingModeEnabled,
      globalState,
      recordingPlayerId: pid,
      recordingTimeMs: Math.round(recordingTimeMs || 0),
      previewTimeMs: Math.round(previewTimeMs || 0),
      durationMs: Math.round(durationMsRef.current || 0),
      latestPos: {
        x: round2(latestPosRef.current?.x),
        y: round2(latestPosRef.current?.y),
      },
      bufferedFrames: recordingBufferRef.current.length,
      currentTrackKeyframes,
      feedCount: feedCountRef.current,
      sampleCount: sampleCountRef.current,
      msSinceLastFeed,
      recordingRafActive: Boolean(rafIdRef.current),
      previewRafActive: Boolean(previewRafIdRef.current),
      previewFrameCount: previewFrameCountRef.current,
      trackFrameCounts,
    };
  }, [animationDataRef, globalState, previewTimeMs, recordingModeEnabled, recordingTimeMs]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (previewRafIdRef.current) cancelAnimationFrame(previewRafIdRef.current);
      logRecordingDebug("cleanup unmount");
    };
  }, []);

  return {
    recordingModeEnabled,
    setRecordingModeEnabled,
    globalState,
    recordingPlayerId,
    playerStates,
    recordingTimeMs,
    previewTimeMs,
    recordingDurationMs,
    setRecordingDurationMs,
    recordedCount,
    totalCount,
    syncPlayerStates,
    feedPosition,
    getDebugSnapshot,
    startRecording,
    stopRecording,
    cancelRecording,
    clearPlayerRecording,
    clearAllRecordings,
    startPreview,
    stopPreview,
  };
}
