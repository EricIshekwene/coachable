import { useCallback, useEffect, useRef, useState } from "react";
import { log as logRecordingDebug } from "../recordingDebugLogger";
import { smoothTrack } from "../../../utils/smoothTrack";

/**
 * Recording states per player:
 * - "idle"      - not recorded yet
 * - "recording" - actively recording movement
 * - "recorded"  - has a recording saved
 *
 * Global states:
 * - "idle"       - no recording in progress
 * - "countdown"  - 3-2-1 before recording starts
 * - "recording"  - actively recording one player's movement
 * - "paused"     - recording paused, can resume
 * - "previewing" - playing back all recorded tracks together
 */

const SAMPLE_INTERVAL_MS = 100;
const TIME_STATE_UPDATE_INTERVAL_MS = 200; // throttle React re-renders for time display
const LOG_INTERVAL_MS = 2000; // consolidated log every 2s during recording/preview

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
  ballsByIdRef,
}) {
  const [recordingModeEnabled, setRecordingModeEnabledRaw] = useState(false);
  const [recordingPlayerId, setRecordingPlayerId] = useState(null);
  const [globalState, setGlobalState] = useState("idle");
  const [playerStates, setPlayerStates] = useState({});
  const [recordingTimeMs, setRecordingTimeMs] = useState(0);
  const [countdownValue, setCountdownValue] = useState(null); // 3,2,1,null
  const [previewTimeMs, setPreviewTimeMs] = useState(0);
  const [recordingDurationMs, setRecordingDurationMs] = useState(10000);
  const [stabilization, setStabilization] = useState(0.5); // 0 to 1

  const countdownTimerRef = useRef(null);
  const pendingCountdownPlayerIdRef = useRef(null);
  const recordingPlayerIdRef = useRef(null);
  const latestPosRef = useRef({ x: 0, y: 0 });
  const recordingStartRef = useRef(null); // performance.now() at start of current segment
  const pausedElapsedRef = useRef(0); // accumulated ms from previous segments before pause
  const lastSampleElapsedRef = useRef(0);
  const recordingBufferRef = useRef([]); // [{t, x, y}]
  const rafIdRef = useRef(null);
  const preRecordingTrackRef = useRef(null);
  const globalStateRef = useRef("idle");
  const durationMsRef = useRef(recordingDurationMs);
  const lastFeedAtRef = useRef(0);
  const feedCountRef = useRef(0);
  const sampleCountRef = useRef(0);
  const lastLogAtRef = useRef(-Infinity); // consolidated log throttle
  const lastTimeStateAtRef = useRef(0); // throttle React setState for time display
  const shelvedRecordingsRef = useRef({}); // { [playerId]: { buffer, pausedElapsed, lastSampleElapsed, preRecordingTrack, feedCount, sampleCount } }

  // Preview
  const previewRafIdRef = useRef(null);
  const previewStartRef = useRef(null);
  const previewFrameCountRef = useRef(0);
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
    const prevX = latestPosRef.current.x;
    const prevY = latestPosRef.current.y;
    latestPosRef.current = { x, y };
    if (globalStateRef.current !== "recording") {
      // Log occasional feeds in non-recording state for debugging position tracking.
      feedCountRef.current += 1;
      if (feedCountRef.current % 50 === 1) {
        logRecordingDebug(
          `feedPos(non-rec) state=${globalStateRef.current} pid=${recordingPlayerIdRef.current || "none"} pos=(${Math.round(x)},${Math.round(y)}) delta=(${Math.round(x - prevX)},${Math.round(y - prevY)}) feedN=${feedCountRef.current}`
        );
      }
      return;
    }
    feedCountRef.current += 1;
    lastFeedAtRef.current = performance.now();
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

      // Position all players at their last recorded position (idle overview).
      const tracks = animationDataRef.current?.tracks || {};
      const patch = {};
      Object.entries(tracks).forEach(([itemId, track]) => {
        if (!track?.keyframes?.length) return;
        const last = track.keyframes[track.keyframes.length - 1];
        patch[itemId] = { x: last.x, y: last.y };
      });
      if (Object.keys(patch).length) {
        animationRendererRef.current?.setPoses?.(patch, { flush: true });
      }

      logRecordingDebug(
        `preview stop reason=${reason} renderedItems=${Object.keys(patch).length} frameCount=${previewFrameCountRef.current} elapsedMs=${Math.round(currentPreviewElapsedRef.current)}`
      );
      previewFrameCountRef.current = 0;
      lastLogAtRef.current = -Infinity;
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
        ? Math.max(0, pausedElapsedRef.current + (performance.now() - recordingStartRef.current))
        : pausedElapsedRef.current;
      const firstFrame = buffer[0] || null;
      const lastFrame = buffer.length ? buffer[buffer.length - 1] : null;
      logRecordingDebug(
        `stop reason=${reason} pid=${pid || "none"} frames=${buffer.length} samples=${sampleCountRef.current} feeds=${feedCountRef.current} durationMs=${Math.round(recordedDurationMs)} first=${firstFrame ? `${Math.round(firstFrame.x)},${Math.round(firstFrame.y)}@${firstFrame.t}` : "none"} last=${lastFrame ? `${Math.round(lastFrame.x)},${Math.round(lastFrame.y)}@${lastFrame.t}` : "none"}`
      );

      // Save buffer into animation data tracks (apply stabilization smoothing).
      if (pid && buffer.length > 0) {
        const keyframes = smoothTrack([...buffer], stabilization);
        logRecordingDebug(
          `smoothing applied stabilization=${stabilization} frames=${buffer.length}`
        );
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

      // Position all recorded players at their last recorded position (idle overview).
      const tracks = animationDataRef.current?.tracks || {};
      const resetPatch = {};
      Object.entries(tracks).forEach(([itemId, track]) => {
        if (itemId === pid) return; // skip the just-recorded player
        if (!track?.keyframes?.length) return;
        const last = track.keyframes[track.keyframes.length - 1];
        resetPatch[itemId] = { x: last.x, y: last.y };
      });
      if (Object.keys(resetPatch).length) {
        animationRendererRef.current?.setPoses?.(resetPatch, { flush: true });
      }

      recordingBufferRef.current = [];
      recordingStartRef.current = null;
      pausedElapsedRef.current = 0;
            preRecordingTrackRef.current = null;
      lastSampleElapsedRef.current = 0;
      lastFeedAtRef.current = 0;
      feedCountRef.current = 0;
      sampleCountRef.current = 0;
      lastLogAtRef.current = -Infinity;
      lastLogAtRef.current = -Infinity;
            setGlobalState("idle");
      setRecordingPlayerId(null);
      setRecordingTimeMs(0);
    },
    [setAnimationDataWithMeta, stabilization, animationDataRef, animationRendererRef]
  );

  // Recording RAF loop.
  const recordingTickRef = useRef(null);
  recordingTickRef.current = () => {
    if (globalStateRef.current !== "recording") return;

    if (!recordingStartRef.current) {
      logRecordingDebug("tick abort: no startTime");
      finishRecording("missingStartTime");
      return;
    }

    const now = performance.now();
    const elapsed = pausedElapsedRef.current + (now - recordingStartRef.current);
    const duration = durationMsRef.current;

    // Throttle React state updates for time display (~5fps instead of 60fps).
    if (now - lastTimeStateAtRef.current >= TIME_STATE_UPDATE_INTERVAL_MS) {
      lastTimeStateAtRef.current = now;
      setRecordingTimeMs(elapsed);
    }

    // Sample position at fixed interval.
    if (elapsed - lastSampleElapsedRef.current >= SAMPLE_INTERVAL_MS) {
      lastSampleElapsedRef.current = elapsed;
      sampleCountRef.current += 1;

      const pos = latestPosRef.current;
      recordingBufferRef.current.push({
        t: Math.round(elapsed),
        x: round2(pos.x),
        y: round2(pos.y),
      });
    }

    // Consolidated log every 2s: position, frame count, feed health.
    if (now - lastLogAtRef.current >= LOG_INTERVAL_MS) {
      lastLogAtRef.current = now;
      const sinceLastFeed = lastFeedAtRef.current > 0 ? Math.round(now - lastFeedAtRef.current) : null;
      const pos = latestPosRef.current;
      logRecordingDebug(
        `rec t=${Math.round(elapsed)}/${Math.round(duration)} pos=(${Math.round(pos.x)},${Math.round(pos.y)}) frames=${recordingBufferRef.current.length} feeds=${feedCountRef.current} lastFeedAgo=${sinceLastFeed ?? "never"}ms`
      );
    }

    // Animate already-recorded players along their tracks so the coach
    // can see how other objects move in reference while recording.
    const activePid = recordingPlayerIdRef.current;
    const tracks = animationDataRef.current?.tracks || {};
    const ghostPatch = {};
    Object.entries(tracks).forEach(([itemId, track]) => {
      if (itemId === activePid) return;
      if (!track?.keyframes?.length) return;
      const pos = interpolateTrack(track.keyframes, elapsed);
      if (pos) ghostPatch[itemId] = { x: pos.x, y: pos.y };
    });
    if (Object.keys(ghostPatch).length) {
      animationRendererRef.current?.setPoses?.(ghostPatch);
    }

    if (elapsed >= duration) {
      logRecordingDebug(
        `autoStop frames=${recordingBufferRef.current.length} feeds=${feedCountRef.current} ghosts=${Object.keys(ghostPatch).length}`
      );
      finishRecording("autoStop");
      return;
    }

    rafIdRef.current = requestAnimationFrame(() => recordingTickRef.current?.());
  };

  // Internal: actually begin recording (called after countdown).
  const beginRecordingInternal = useCallback(
    (playerId) => {
      // If already recording, stop first.
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      durationMsRef.current = recordingDurationMs;

      // Save existing track for cancel/restore.
      const currentTrack = animationDataRef.current?.tracks?.[playerId];
      preRecordingTrackRef.current = currentTrack
        ? JSON.parse(JSON.stringify(currentTrack))
        : null;
      const existingKeyframes = preRecordingTrackRef.current?.keyframes?.length || 0;

      // Get item's current visual position for initial frame.
      const renderer = animationRendererRef.current;
      const rendererPose = renderer?.getCurrentPose?.(playerId);
      const player = playersByIdRef.current?.[playerId];
      const ball = ballsByIdRef?.current?.[playerId];
      const entity = player || ball;
      const initialX = rendererPose?.x ?? entity?.x ?? 0;
      const initialY = rendererPose?.y ?? entity?.y ?? 0;
      const initialSource = rendererPose ? "renderer" : entity ? "entity" : "fallback";

      latestPosRef.current = { x: initialX, y: initialY };

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
      // Start in paused state — recording begins automatically when user drags the player.
      setGlobalState("paused");
      globalStateRef.current = "paused";
      setRecordingTimeMs(0);
      setPlayerStates((prev) => {
        logRecordingDebug(`beginRec playerStates prev=${JSON.stringify(prev)} setting ${playerId}=recording`);
        return { ...prev, [playerId]: "recording" };
      });

      // Initialize buffer with initial position at t=0.
      recordingBufferRef.current = [{ t: 0, x: round2(initialX), y: round2(initialY) }];
      lastSampleElapsedRef.current = 0;
      pausedElapsedRef.current = 0;
      recordingStartRef.current = null; // will be set on first resume (drag start)
      lastFeedAtRef.current = 0;
      feedCountRef.current = 0;
      sampleCountRef.current = 0;
      lastLogAtRef.current = -Infinity;
      lastLogAtRef.current = -Infinity;
            logRecordingDebug(`start armed pid=${playerId} sampleIntervalMs=${SAMPLE_INTERVAL_MS} state=paused (waiting for drag)`);
    },
    [animationDataRef, animationRendererRef, playersByIdRef, ballsByIdRef, setAnimationDataWithMeta, recordingDurationMs]
  );

  // Ref to avoid stale closure in setInterval callback.
  const beginRecordingInternalRef = useRef(beginRecordingInternal);
  beginRecordingInternalRef.current = beginRecordingInternal;

  // Runs a 3-2-1 countdown then calls onDone().
  const runCountdown = useCallback((playerId, onDone) => {
    // Cancel any existing countdown.
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    pendingCountdownPlayerIdRef.current = playerId;
    setGlobalState("countdown");
    setRecordingPlayerId(playerId);
    recordingPlayerIdRef.current = playerId;

    let remaining = 3;
    setCountdownValue(remaining);
    logRecordingDebug(`countdown start pid=${playerId}`);

    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdownValue(remaining);
      } else {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdownValue(null);
        pendingCountdownPlayerIdRef.current = null;
        logRecordingDebug(`countdown done pid=${playerId}`);
        onDone();
      }
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    logRecordingDebug(
      `stop requested pid=${recordingPlayerIdRef.current || "none"} global=${globalStateRef.current}`
    );
    // Can stop from recording or paused state.
    if (globalStateRef.current === "paused") {
      // Already paused — no RAF to cancel, just finish.
      finishRecording("manualStopFromPaused");
    } else {
      finishRecording("manualStop");
    }
  }, [finishRecording]);

  // Shelve the current recording state so we can switch to another player.
  const shelveCurrentRecording = useCallback(() => {
    const pid = recordingPlayerIdRef.current;
    if (!pid) return;

    // Stop RAF if running.
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Accumulate any remaining segment time.
    if (recordingStartRef.current) {
      pausedElapsedRef.current += performance.now() - recordingStartRef.current;
      recordingStartRef.current = null;
    }

    shelvedRecordingsRef.current[pid] = {
      buffer: recordingBufferRef.current,
      pausedElapsed: pausedElapsedRef.current,
      lastSampleElapsed: lastSampleElapsedRef.current,
      preRecordingTrack: preRecordingTrackRef.current,
      feedCount: feedCountRef.current,
      sampleCount: sampleCountRef.current,
    };

    // Write current buffer to animationData.tracks so preview can see it.
    const bufferCopy = [...recordingBufferRef.current];
    if (bufferCopy.length > 0) {
      const keyframes = smoothTrack(bufferCopy, stabilization);
      setAnimationDataWithMeta((base) => {
        const nextTracks = { ...base.tracks };
        nextTracks[pid] = { keyframes };
        return { ...base, tracks: nextTracks };
      });
    }

    logRecordingDebug(`shelved pid=${pid} frames=${recordingBufferRef.current.length} elapsed=${Math.round(pausedElapsedRef.current)}`);

    // Mark player as paused.
    setPlayerStates((prev) => ({ ...prev, [pid]: "paused" }));

    // Clear active refs (will be restored on unshelve).
    recordingBufferRef.current = [];
    pausedElapsedRef.current = 0;
    lastSampleElapsedRef.current = 0;
    preRecordingTrackRef.current = null;
    feedCountRef.current = 0;
    sampleCountRef.current = 0;
    recordingPlayerIdRef.current = null;
    setRecordingPlayerId(null);
    setRecordingTimeMs(0);
  }, [setAnimationDataWithMeta, stabilization]);

  // Public: starts a 3-2-1 countdown, then begins recording.
  const startRecording = useCallback(
    (playerId) => {
      if (!playerId) return;

      // If another player is currently paused/recording, shelve them first.
      const currentPid = recordingPlayerIdRef.current;
      if (currentPid && currentPid !== playerId) {
        shelveCurrentRecording();
      }

      runCountdown(playerId, () => {
        beginRecordingInternalRef.current(playerId);
      });
    },
    [shelveCurrentRecording, runCountdown]
  );

  const pauseRecording = useCallback(() => {
    if (globalStateRef.current !== "recording" && globalStateRef.current !== "paused") {
      logRecordingDebug(`pause ignored global=${globalStateRef.current}`);
      return;
    }

    // Stop RAF loop.
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Accumulate elapsed time from this segment.
    const segmentElapsed = recordingStartRef.current
      ? performance.now() - recordingStartRef.current
      : 0;
    pausedElapsedRef.current += segmentElapsed;
    recordingStartRef.current = null;

    setGlobalState("paused");
    globalStateRef.current = "paused";
    setRecordingTimeMs(pausedElapsedRef.current);
    setPlayerStates((prev) => ({ ...prev, [recordingPlayerIdRef.current]: "paused" }));

    logRecordingDebug(
      `pause pid=${recordingPlayerIdRef.current || "none"} elapsed=${Math.round(pausedElapsedRef.current)} frames=${recordingBufferRef.current.length}`
    );
  }, []);

  // Internal: actually resume recording after countdown (for both active-paused and shelved).
  const resumeRecordingInternal = useCallback((pid) => {
    // Get current position for seamless resume.
    const renderer = animationRendererRef.current;
    const rendererPose = renderer?.getCurrentPose?.(pid);
    const player = playersByIdRef.current?.[pid];
    const ball = ballsByIdRef?.current?.[pid];
    const entity = player || ball;
    const resumeX = rendererPose?.x ?? entity?.x ?? latestPosRef.current.x;
    const resumeY = rendererPose?.y ?? entity?.y ?? latestPosRef.current.y;
    latestPosRef.current = { x: resumeX, y: resumeY };

    // Reset segment start; pausedElapsedRef already holds accumulated time.
    recordingStartRef.current = performance.now();
    lastFeedAtRef.current = recordingStartRef.current;

    setRecordingPlayerId(pid);
    recordingPlayerIdRef.current = pid;
    setGlobalState("recording");
    globalStateRef.current = "recording";
    setPlayerStates((prev) => ({ ...prev, [pid]: "recording" }));

    logRecordingDebug(
      `resume pid=${pid} elapsed=${Math.round(pausedElapsedRef.current)} pos=(${Math.round(resumeX)},${Math.round(resumeY)}) frames=${recordingBufferRef.current.length}`
    );

    rafIdRef.current = requestAnimationFrame(() => recordingTickRef.current?.());
  }, [animationRendererRef, playersByIdRef, ballsByIdRef]);

  const resumeRecordingInternalRef = useRef(resumeRecordingInternal);
  resumeRecordingInternalRef.current = resumeRecordingInternal;

  // Immediate resume (no countdown) — used for auto-resume on drag start.
  const resumeRecordingImmediate = useCallback(() => {
    const pid = recordingPlayerIdRef.current;
    if (!pid || globalStateRef.current !== "paused") return;
    resumeRecordingInternalRef.current(pid);
  }, []);

  const resumeRecording = useCallback((playerId) => {
    // Determine which player to resume: explicit arg, or the current active paused player.
    const pid = playerId || recordingPlayerIdRef.current;
    if (!pid) {
      logRecordingDebug("resume ignored: no player");
      return;
    }

    // If another player is currently active (paused/recording), shelve them first.
    const currentPid = recordingPlayerIdRef.current;
    if (currentPid && currentPid !== pid) {
      shelveCurrentRecording();
    }

    // Check if this player has shelved data to restore.
    const shelved = shelvedRecordingsRef.current[pid];
    if (shelved) {
      recordingBufferRef.current = shelved.buffer;
      pausedElapsedRef.current = shelved.pausedElapsed;
      lastSampleElapsedRef.current = shelved.lastSampleElapsed;
      preRecordingTrackRef.current = shelved.preRecordingTrack;
      feedCountRef.current = shelved.feedCount;
      sampleCountRef.current = shelved.sampleCount;
      delete shelvedRecordingsRef.current[pid];
      logRecordingDebug(`unshelved pid=${pid} frames=${recordingBufferRef.current.length} elapsed=${Math.round(pausedElapsedRef.current)}`);
    }

    // Run 3-2-1 countdown before resuming.
    runCountdown(pid, () => {
      resumeRecordingInternalRef.current(pid);
    });
  }, [shelveCurrentRecording, runCountdown]);

  const cancelRecording = useCallback(() => {
    const pid = recordingPlayerIdRef.current;

    // Cancel countdown if active.
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
      setCountdownValue(null);
      pendingCountdownPlayerIdRef.current = null;
      logRecordingDebug(`cancel countdown pid=${pid || "none"}`);

      // If this was a resume countdown, re-shelve the unshelved data.
      if (pid && recordingBufferRef.current.length > 0) {
        shelvedRecordingsRef.current[pid] = {
          buffer: recordingBufferRef.current,
          pausedElapsed: pausedElapsedRef.current,
          lastSampleElapsed: lastSampleElapsedRef.current,
          preRecordingTrack: preRecordingTrackRef.current,
          feedCount: feedCountRef.current,
          sampleCount: sampleCountRef.current,
        };
        setPlayerStates((prev) => ({ ...prev, [pid]: "paused" }));
        recordingBufferRef.current = [];
        pausedElapsedRef.current = 0;
        lastSampleElapsedRef.current = 0;
        preRecordingTrackRef.current = null;
        feedCountRef.current = 0;
        sampleCountRef.current = 0;
      }

      setGlobalState("idle");
      setRecordingPlayerId(null);
      setRecordingTimeMs(0);
      return;
    }

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

    // Position ghost players at their last recorded position (idle overview).
    const tracks = animationDataRef.current?.tracks || {};
    const resetPatch = {};
    Object.entries(tracks).forEach(([itemId, track]) => {
      if (itemId === pid) return;
      if (!track?.keyframes?.length) return;
      const last = track.keyframes[track.keyframes.length - 1];
      resetPatch[itemId] = { x: last.x, y: last.y };
    });
    if (Object.keys(resetPatch).length) {
      animationRendererRef.current?.setPoses?.(resetPatch, { flush: true });
    }

    recordingBufferRef.current = [];
    recordingStartRef.current = null;
    pausedElapsedRef.current = 0;
        preRecordingTrackRef.current = null;
    lastFeedAtRef.current = 0;
    feedCountRef.current = 0;
    sampleCountRef.current = 0;
    lastLogAtRef.current = -Infinity;
    lastLogAtRef.current = -Infinity;
        setGlobalState("idle");
    setRecordingPlayerId(null);
    setRecordingTimeMs(0);
    logRecordingDebug(`cancel done pid=${pid || "none"} resetTo=idle`);
  }, [setAnimationDataWithMeta, animationDataRef, animationRendererRef]);

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

    // Throttle React state updates for time display.
    if (now - lastTimeStateAtRef.current >= TIME_STATE_UPDATE_INTERVAL_MS) {
      lastTimeStateAtRef.current = now;
      setPreviewTimeMs(elapsed);
    }

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
    if (now - lastLogAtRef.current >= LOG_INTERVAL_MS) {
      lastLogAtRef.current = now;
      logRecordingDebug(
        `preview t=${Math.round(elapsed)}/${Math.round(duration)} items=${Object.keys(patch).length} frames=${previewFrameCountRef.current}`
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
    lastLogAtRef.current = -Infinity;
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
      delete shelvedRecordingsRef.current[playerId];
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
    logRecordingDebug(`clearAll tracks=${trackCount} shelved=${Object.keys(shelvedRecordingsRef.current).length}`);
    shelvedRecordingsRef.current = {};
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

  const syncPlayerStates = useCallback((playersById, ballsById) => {
    const playerIds = Object.keys(playersById || {});
    const ballIds = Object.keys(ballsById || {});
    setPlayerStates((prev) => {
      const next = {};
      const added = [];
      const removed = [];
      const kept = [];
      [...playerIds, ...ballIds].forEach((id) => {
        next[id] = prev[id] || "idle";
        if (!prev[id]) added.push(id);
        else kept.push(`${id}:${prev[id]}`);
      });
      Object.keys(prev).forEach((id) => {
        if (!next[id]) removed.push(`${id}:${prev[id]}`);
      });
      logRecordingDebug(
        `syncPlayerStates total=${Object.keys(next).length} added=[${added.join(",")}] removed=[${removed.join(",")}] kept=[${kept.join(",")}] global=${globalStateRef.current} activePid=${recordingPlayerIdRef.current || "none"}`
      );
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
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setCountdownValue(null);
        pendingCountdownPlayerIdRef.current = null;
        shelvedRecordingsRef.current = {};
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
        pausedElapsedRef.current = 0;
                preRecordingTrackRef.current = null;
        lastFeedAtRef.current = 0;
        feedCountRef.current = 0;
        sampleCountRef.current = 0;
        lastLogAtRef.current = -Infinity;
        lastLogAtRef.current = -Infinity;
                previewFrameCountRef.current = 0;
        lastLogAtRef.current = -Infinity;
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

  const recordedCount = Object.values(playerStates).filter((s) => s === "recorded" || s === "paused").length;
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
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      logRecordingDebug("cleanup unmount");
    };
  }, []);

  return {
    recordingModeEnabled,
    setRecordingModeEnabled,
    globalState,
    countdownValue,
    recordingPlayerId,
    playerStates,
    recordingTimeMs,
    previewTimeMs,
    recordingDurationMs,
    setRecordingDurationMs,
    stabilization,
    setStabilization,
    recordedCount,
    totalCount,
    syncPlayerStates,
    feedPosition,
    getDebugSnapshot,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resumeRecordingImmediate,
    cancelRecording,
    clearPlayerRecording,
    clearAllRecordings,
    startPreview,
    stopPreview,
  };
}
