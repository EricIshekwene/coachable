import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { normalizeAnimation } from "../animation";
import PlayPreviewCard from "./PlayPreviewCard";
import { IoPlayOutline } from "react-icons/io5";

const DEFAULT_DURATION_MS = 30000;
const DEFAULT_SPEED_MULTIPLIER = 50;

const toFiniteNumber = (value, fallback = 0) => {
  const n = Number(value);
  return isFinite(n) ? n : fallback;
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Converts ms to m:ss string. */
const formatTime = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
};

/**
 * PlayPreviewPlayer — renders a PlayPreviewCard with a ViewOnlyControls-style
 * overlay (bottom gradient, scrubber, play/pause). Plays at the speed stored in
 * the play's playback settings.
 */
export default function PlayPreviewPlayer({
  playData,
  shape = "landscape",
  cameraMode = "fit-distribution",
  background = "field",
  paddingPx = 70,
  minSpanPx = 220,
  className = "",
}) {
  const [timeMs, setTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const rafIdRef = useRef(null);
  const lastFrameAtRef = useRef(null);
  const trackRef = useRef(null);
  const fillRef = useRef(null);
  const thumbRef = useRef(null);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef(null);
  const dragTimeRef = useRef(0);

  // Keep duration + rate in refs so the RAF tick is always current
  const durationRef = useRef(DEFAULT_DURATION_MS);
  const rateRef = useRef(1);
  const timeMsRef = useRef(0);

  const play = playData?.play || null;
  const animation = useMemo(
    () => normalizeAnimation(play?.animation || { durationMs: DEFAULT_DURATION_MS, tracks: {} }),
    [play?.animation]
  );
  const durationMs = Math.max(1, Math.round(toFiniteNumber(animation?.durationMs, DEFAULT_DURATION_MS)));
  const speedMult = toFiniteNumber(play?.playback?.speedMultiplier, DEFAULT_SPEED_MULTIPLIER);
  const playbackRate = (0.25 + (speedMult / 100) * 3.75) * 3;

  useEffect(() => { durationRef.current = durationMs; }, [durationMs]);
  useEffect(() => { rateRef.current = playbackRate; }, [playbackRate]);

  // Reset when play changes
  const playId = play?.id;
  useEffect(() => {
    setTimeMs(0);
    timeMsRef.current = 0;
    setIsPlaying(false);
    lastFrameAtRef.current = null;
    applyVisual(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId]);

  // RAF loop
  useEffect(() => {
    if (!isPlaying) {
      if (rafIdRef.current) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
      lastFrameAtRef.current = null;
      return;
    }

    const tick = (stamp) => {
      if (!lastFrameAtRef.current) lastFrameAtRef.current = stamp;
      const delta = Math.max(0, stamp - lastFrameAtRef.current);
      lastFrameAtRef.current = stamp;
      const next = (timeMsRef.current + delta * rateRef.current) % durationRef.current;
      timeMsRef.current = next;
      setTimeMs(next);
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
    };
  }, [isPlaying]);

  useEffect(() => () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
  }, []);

  // Sync scrubber visuals imperatively (avoids React re-render per frame)
  const applyVisual = useCallback((t) => {
    const progress = clamp(t / durationRef.current, 0, 1);
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${progress})`;
    if (thumbRef.current) thumbRef.current.style.left = `${progress * 100}%`;
  }, []);

  useEffect(() => {
    if (!draggingRef.current) applyVisual(timeMs);
  }, [timeMs, applyVisual]);

  // Custom scrubber pointer handling
  const timeFromClientX = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return clamp((clientX - rect.left) / rect.width, 0, 1) * durationRef.current;
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsPlaying(false);
    draggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    trackRef.current?.setPointerCapture(e.pointerId);
    const t = timeFromClientX(e.clientX);
    dragTimeRef.current = t;
    timeMsRef.current = t;
    setTimeMs(t);
    applyVisual(t);
  }, [timeFromClientX, applyVisual]);

  const handlePointerMove = useCallback((e) => {
    if (!draggingRef.current || e.pointerId !== pointerIdRef.current) return;
    e.preventDefault();
    const t = timeFromClientX(e.clientX);
    dragTimeRef.current = t;
    timeMsRef.current = t;
    setTimeMs(t);
    applyVisual(t);
  }, [timeFromClientX, applyVisual]);

  const handlePointerUp = useCallback((e) => {
    if (!draggingRef.current) return;
    trackRef.current?.releasePointerCapture(e.pointerId);
    draggingRef.current = false;
    pointerIdRef.current = null;
  }, []);

  const handleTogglePlay = useCallback((e) => {
    e.stopPropagation();
    setIsPlaying((prev) => !prev);
  }, []);

  const speedLabel = (() => {
    const secs = Math.max(1, durationMs) / 1000 / playbackRate;
    return `${Math.round(secs)}s`;
  })();

  return (
    <div className={`relative ${className}`}>
      <PlayPreviewCard
        playData={playData}
        autoplay="off"
        controlledTimeMs={timeMs}
        shape={shape}
        cameraMode={cameraMode}
        background={background}
        paddingPx={paddingPx}
        minSpanPx={minSpanPx}
      />

      {/* Controls overlay — matches ViewOnlyControls style */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end pointer-events-none rounded-xl overflow-hidden">
        <div className="pointer-events-auto bg-gradient-to-t from-black/70 to-transparent pt-10 pb-3 px-3">

          {/* Scrubber track */}
          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full h-5 flex items-center cursor-pointer touch-none group"
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-white/20 group-hover:h-[4px] transition-all">
              <div
                ref={fillRef}
                className="h-full w-full bg-BrandOrange origin-left will-change-transform rounded-full"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
            <div
              ref={thumbRef}
              className="absolute z-10 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 bg-BrandOrange rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              style={{ left: "0%" }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center mt-1 gap-2">
            <span className="flex-1 text-[10px] font-DmSans text-white/60 tabular-nums">
              {formatTime(timeMs)} / {formatTime(durationMs)}
            </span>

            <button
              onClick={handleTogglePlay}
              className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-full bg-BrandOrange hover:brightness-110 transition active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-BrandBlack">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <IoPlayOutline className="text-BrandBlack text-base ml-0.5" />
              )}
            </button>

            <span className="flex-1 text-right text-[10px] font-DmSans text-white/40">
              {speedLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
