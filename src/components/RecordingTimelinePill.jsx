import React, { useCallback, useEffect, useRef } from "react";
import { FaCircle, FaStop, FaPlay, FaPause, FaUndo } from "react-icons/fa";

const formatTime = (ms) => {
  const totalSec = Math.floor((ms || 0) / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Derive the recorded time range [startMs, endMs] for a track from its keyframes.
 * Returns null if the track has no keyframes.
 */
function getTrackRange(track) {
  const kfs = track?.keyframes;
  if (!kfs?.length) return null;
  return { startMs: kfs[0].t, endMs: kfs[kfs.length - 1].t };
}

/**
 * RecordingTimelinePill — bottom control bar for recording mode.
 *
 * Replaces RecordingControlBar with a full scrubbing timeline that shows
 * per-player recording segments (CapCut-style). The focused player's segment
 * is shown prominently; all others are shown as thin background tracks.
 *
 * Scrubbing is enabled when globalState is "idle" or "previewing".
 */
export default function RecordingTimelinePill({
  globalState,
  recordingPlayerId,
  recordingTimeMs,
  previewTimeMs,
  durationMs,
  recordedCount,
  totalCount,
  countdownValue,
  playerName,
  // Animation data to derive segments
  animationData,
  playersById,
  ballsById,
  // Focused player id (set by clicking in right panel)
  focusedId,
  // Scrubbing
  currentTimeMs,
  onSeek,
  getAuthoritativeTimeMs,
  // Reads currentPreviewElapsedRef directly (bypasses 200ms throttle on previewTimeMs state)
  getPreviewTimeMs,
  onDragStateChange,
  // Controls
  onStartPreview,
  onStopPreview,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onCancelRecording,
}) {
  const isRecording = globalState === "recording";
  const isPreviewing = globalState === "previewing";
  const isIdle = globalState === "idle";
  const isCountdown = globalState === "countdown";
  const isPaused = globalState === "paused";
  const canScrub = isIdle || isPreviewing;

  // Refs for imperative timeline DOM manipulation
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef(null);
  const durationRef = useRef(Math.max(1, durationMs || 1));
  const onSeekRef = useRef(onSeek);
  const onDragStateChangeRef = useRef(onDragStateChange);
  const getAuthoritativeTimeRef = useRef(getAuthoritativeTimeMs);
  const getPreviewTimeMsRef = useRef(getPreviewTimeMs);
  const currentTimeRef = useRef(currentTimeMs || 0);
  const dragTimeRef = useRef(0);
  const rafRef = useRef(null);
  const pendingSeekRef = useRef(null);

  useEffect(() => { durationRef.current = Math.max(1, durationMs || 1); }, [durationMs]);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);
  useEffect(() => { onDragStateChangeRef.current = onDragStateChange; }, [onDragStateChange]);
  useEffect(() => { getAuthoritativeTimeRef.current = getAuthoritativeTimeMs; }, [getAuthoritativeTimeMs]);
  useEffect(() => { getPreviewTimeMsRef.current = getPreviewTimeMs; }, [getPreviewTimeMs]);
  useEffect(() => { currentTimeRef.current = currentTimeMs || 0; }, [currentTimeMs]);

  /** Position the thumb imperatively without a React re-render. */
  const applyThumb = useCallback((timeMs) => {
    const pct = clamp((timeMs || 0) / durationRef.current, 0, 1) * 100;
    if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
  }, []);

  const timeFromClientX = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0) return 0;
    const pct = clamp((clientX - rect.left) / rect.width, 0, 1);
    return pct * durationRef.current;
  }, []);

  const flushSeek = useCallback(() => {
    if (pendingSeekRef.current == null) return;
    const t = clamp(pendingSeekRef.current, 0, durationRef.current);
    pendingSeekRef.current = null;
    onSeekRef.current?.(Math.round(t), { source: "recording-slider" });
  }, []);

  const scheduleSeek = useCallback((timeMs) => {
    pendingSeekRef.current = timeMs;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      flushSeek();
    });
  }, [flushSeek]);

  const handlePointerDown = useCallback((e) => {
    if (!canScrub) return;
    if (e.button !== 0) return;
    e.preventDefault();
    draggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    trackRef.current?.setPointerCapture?.(e.pointerId);
    onDragStateChangeRef.current?.(true);
    const t = timeFromClientX(e.clientX);
    dragTimeRef.current = t;
    applyThumb(t);
    scheduleSeek(t);
  }, [canScrub, applyThumb, scheduleSeek, timeFromClientX]);

  const handlePointerMove = useCallback((e) => {
    if (!draggingRef.current) return;
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
    e.preventDefault();
    const t = timeFromClientX(e.clientX);
    dragTimeRef.current = t;
    applyThumb(t);
    scheduleSeek(t);
  }, [applyThumb, scheduleSeek, timeFromClientX]);

  const handlePointerUp = useCallback((e) => {
    if (!draggingRef.current) return;
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
    e.preventDefault();
    trackRef.current?.releasePointerCapture?.(e.pointerId);
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    pendingSeekRef.current = dragTimeRef.current;
    flushSeek();
    draggingRef.current = false;
    pointerIdRef.current = null;
    onDragStateChangeRef.current?.(false);
  }, [flushSeek]);

  // Keep thumb in sync when not dragging
  useEffect(() => {
    if (draggingRef.current) return;
    const t = getAuthoritativeTimeRef.current?.() ?? currentTimeRef.current;
    applyThumb(t);
  }, [applyThumb, currentTimeMs, durationMs]);

  // RAF follow during preview — reads currentPreviewElapsedRef directly (bypasses 200ms throttle)
  useEffect(() => {
    if (!isPreviewing) return;
    const follow = () => {
      if (!draggingRef.current) {
        const t = getPreviewTimeMsRef.current?.() ?? currentTimeRef.current;
        applyThumb(t);
      }
      rafRef.current = requestAnimationFrame(follow);
    };
    rafRef.current = requestAnimationFrame(follow);
    return () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  }, [isPreviewing, applyThumb]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Build segments from animationData ──────────────────────────────────────
  const tracks = animationData?.tracks || {};
  const dur = Math.max(1, durationMs || 1);

  const segments = Object.entries(tracks).map(([id, track]) => {
    const isActive = id === recordingPlayerId;
    // While actively recording this player, the old track is being replaced — hide
    // the stale static segment so the live progress overlay is the only indicator.
    if (isActive && (isRecording || isPaused)) return null;
    const range = getTrackRange(track);
    if (!range) return null;
    const player = playersById?.[id];
    const ball = ballsById?.[id];
    const color = player?.color || (ball ? "#FF7A18" : "#ef4444");
    const isFocused = id === (focusedId || recordingPlayerId);
    const startPct = clamp((range.startMs / dur) * 100, 0, 100);
    const widthPct = clamp(((range.endMs - range.startMs) / dur) * 100, 0, 100 - startPct);
    const label = player ? `P${player.number}` : ball ? "Ball" : id;
    return { id, color, isFocused, isActive, startPct, widthPct, label };
  }).filter(Boolean);

  // Sort: focused on top (rendered last)
  const sortedSegments = [...segments].sort((a, b) => (a.isFocused ? 1 : -1) - (b.isFocused ? 1 : -1));

  // ── Display time label ─────────────────────────────────────────────────────
  const displayMs = isRecording ? recordingTimeMs : isPreviewing ? previewTimeMs : isPaused ? recordingTimeMs : currentTimeMs;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(680px,90vw)]">
      <div className="bg-BrandBlack/95 border border-BrandGray2 rounded-2xl px-3 py-2 shadow-lg backdrop-blur-sm">

        {/* Row 1: Status + timeline + time + buttons */}
        <div className="flex items-center gap-2.5">

          {/* Status badge */}
          <div className="flex items-center gap-1.5 shrink-0 min-w-[72px]">
            {isCountdown && (
              <>
                <FaCircle className="text-yellow-400 text-[8px] animate-pulse" />
                <span className="text-yellow-300 text-[11px] font-DmSans font-bold tabular-nums">
                  {countdownValue ?? "..."}
                </span>
              </>
            )}
            {isRecording && (
              <>
                <FaCircle className="text-red-500 text-[8px] animate-pulse" />
                <span className="text-red-400 text-[11px] font-DmSans font-bold">REC</span>
              </>
            )}
            {isPaused && (
              <>
                <FaPause className="text-yellow-400 text-[8px]" />
                <span className="text-yellow-300 text-[11px] font-DmSans font-bold">PAUSED</span>
              </>
            )}
            {isPreviewing && (
              <>
                <FaPlay className="text-BrandOrange text-[8px]" />
                <span className="text-BrandOrange text-[11px] font-DmSans font-bold">PREVIEW</span>
              </>
            )}
            {isIdle && (
              <span className="text-BrandGray text-[11px] font-DmSans tabular-nums">
                {recordedCount}/{totalCount}
              </span>
            )}
          </div>

          {/* Timeline track */}
          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`relative flex-1 h-7 rounded-lg bg-BrandBlack2 border border-BrandGray2/60 overflow-hidden ${canScrub ? "cursor-pointer" : "cursor-default"}`}
            style={{ touchAction: "none" }}
          >
            {/* Empty-state hint */}
            {segments.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-BrandGray/40 text-[9px] font-DmSans">
                  no recordings yet
                </span>
              </div>
            )}

            {/* Segments */}
            {sortedSegments.map(({ id, color, isFocused, isActive, startPct, widthPct }) => (
              <div
                key={id}
                className="absolute top-0 bottom-0 rounded-sm transition-all duration-150"
                style={{
                  left: `${startPct}%`,
                  width: `${widthPct}%`,
                  backgroundColor: color,
                  opacity: isFocused ? 0.75 : 0.22,
                  // Focused player fills full height; others are thin bars at bottom
                  top: isFocused ? "0%" : "60%",
                  bottom: "0%",
                  // Pulsing border for actively recording segment
                  outline: isActive ? `1px solid ${color}` : "none",
                }}
              />
            ))}

            {/* Focused label — shown inside the focused segment if it's wide enough */}
            {segments.find((s) => s.isFocused) && (() => {
              const seg = segments.find((s) => s.isFocused);
              if (seg.widthPct < 8) return null;
              const player = playersById?.[seg.id];
              const label = player ? `P${player.number}` : "Ball";
              return (
                <div
                  className="absolute top-0 bottom-0 flex items-center px-1 pointer-events-none"
                  style={{ left: `${seg.startPct}%`, width: `${seg.widthPct}%` }}
                >
                  <span className="text-white text-[8px] font-DmSans font-bold truncate drop-shadow">
                    {label}
                  </span>
                </div>
              );
            })()}

            {/* Playhead */}
            <div
              ref={thumbRef}
              className="absolute top-0 bottom-0 w-0.5 bg-white/90 pointer-events-none z-10"
              style={{ left: "0%", transform: "translateX(-50%)" }}
            />

            {/* Recording progress overlay when actively recording */}
            {(isRecording || isPaused) && recordingPlayerId && (() => {
              const pct = clamp(((recordingTimeMs || 0) / dur) * 100, 0, 100);
              const track = tracks[recordingPlayerId];
              const range = track?.keyframes?.length
                ? { startMs: track.keyframes[0].t }
                : null;
              const startPct = range ? clamp((range.startMs / dur) * 100, 0, 100) : 0;
              const widthPct = pct - startPct;
              if (widthPct <= 0) return null;
              return (
                <div
                  className={`absolute top-0 bottom-0 pointer-events-none ${isRecording ? "opacity-40" : "opacity-20"}`}
                  style={{
                    left: `${startPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: playersById?.[recordingPlayerId]?.color || "#ef4444",
                  }}
                />
              );
            })()}
          </div>

          {/* Time display */}
          <span className="text-white text-[11px] font-mono tabular-nums shrink-0">
            {formatTime(displayMs)}<span className="text-BrandGray/60">/{formatTime(durationMs)}</span>
          </span>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {isCountdown && (
              <button
                onClick={onCancelRecording}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-BrandGray2/40 hover:bg-BrandGray2/60 text-BrandGray transition-colors"
                title="Cancel"
              >
                <FaUndo className="text-[9px]" />
              </button>
            )}
            {isRecording && (
              <>
                <button onClick={onPauseRecording} className="w-6 h-6 flex items-center justify-center rounded-lg bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 transition-colors" title="Pause">
                  <FaPause className="text-[9px]" />
                </button>
                <button onClick={onStopRecording} className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors" title="Stop & save">
                  <FaStop className="text-[9px]" />
                </button>
                <button onClick={onCancelRecording} className="w-6 h-6 flex items-center justify-center rounded-lg bg-BrandGray2/40 hover:bg-BrandGray2/60 text-BrandGray transition-colors" title="Cancel">
                  <FaUndo className="text-[9px]" />
                </button>
              </>
            )}
            {isPaused && (
              <>
                <button onClick={onResumeRecording} className="w-6 h-6 flex items-center justify-center rounded-lg bg-green-500/20 hover:bg-green-500/40 text-green-400 transition-colors" title="Resume">
                  <FaPlay className="text-[9px]" />
                </button>
                <button onClick={onStopRecording} className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors" title="Stop & save">
                  <FaStop className="text-[9px]" />
                </button>
                <button onClick={onCancelRecording} className="w-6 h-6 flex items-center justify-center rounded-lg bg-BrandGray2/40 hover:bg-BrandGray2/60 text-BrandGray transition-colors" title="Cancel">
                  <FaUndo className="text-[9px]" />
                </button>
              </>
            )}
            {isPreviewing && (
              <button onClick={onStopPreview} className="w-6 h-6 flex items-center justify-center rounded-lg bg-BrandOrange/20 hover:bg-BrandOrange/40 text-BrandOrange transition-colors" title="Stop preview">
                <FaPause className="text-[9px]" />
              </button>
            )}
            {isIdle && recordedCount > 0 && (
              <button onClick={onStartPreview} className="w-6 h-6 flex items-center justify-center rounded-lg bg-BrandOrange/20 hover:bg-BrandOrange/40 text-BrandOrange transition-colors" title="Preview all">
                <FaPlay className="text-[9px]" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Active player name + focus hint */}
        {(isRecording || isPaused || isCountdown) && playerName && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <FaCircle className={`text-[6px] ${isRecording ? "text-red-500 animate-pulse" : "text-yellow-400"}`} />
            <span className="text-white/80 text-[10px] font-DmSans truncate">{playerName}</span>
          </div>
        )}
        {isIdle && segments.length > 0 && !focusedId && (
          <div className="mt-1 text-BrandGray/50 text-[9px] font-DmSans text-center">
            tap a player in the panel to focus their segment
          </div>
        )}
      </div>
    </div>
  );
}
