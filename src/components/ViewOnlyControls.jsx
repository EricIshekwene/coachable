import React, { useCallback, useEffect, useRef } from "react";
import { IoPlayOutline, IoExpandOutline, IoContractOutline, IoCloseOutline, IoArrowBackOutline } from "react-icons/io5";
import { Slider } from "@mui/material";
import { BRAND_SLIDER_SX } from "./subcomponents/sliderStyles";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Minimal playback controls for view-only mode.
 * Shows a thin progress bar, play/pause, speed control, and fullscreen toggle.
 * No keyframe markers, no editing affordances.
 */
export default function ViewOnlyControls({
  durationMs = 30000,
  currentTimeMs = 0,
  isPlaying = false,
  speedMultiplier = 50,
  autoplayEnabled = true,
  onSeek,
  onPause,
  onPlayToggle,
  onSpeedChange,
  onAutoplayChange,
  getAuthoritativeTimeMs,
  onDragStateChange,
  onExitViewOnly,
  exitIsBack = false,
  isFullscreen = false,
  onToggleFullscreen,
  playName,
}) {
  const trackRef = useRef(null);
  const fillRef = useRef(null);
  const thumbRef = useRef(null);
  const rafFollowRef = useRef(null);
  const rafSeekRef = useRef(null);
  const pendingSeekRef = useRef(null);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef(null);
  const dragTimeRef = useRef(0);
  const durationRef = useRef(Math.max(1, durationMs));
  const onSeekRef = useRef(onSeek);
  const onPauseRef = useRef(onPause);
  const onDragStateChangeRef = useRef(onDragStateChange);
  const getAuthoritativeTimeRef = useRef(getAuthoritativeTimeMs);
  const currentTimeRef = useRef(currentTimeMs);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => { durationRef.current = Math.max(1, durationMs); }, [durationMs]);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);
  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);
  useEffect(() => { onDragStateChangeRef.current = onDragStateChange; }, [onDragStateChange]);
  useEffect(() => { getAuthoritativeTimeRef.current = getAuthoritativeTimeMs; }, [getAuthoritativeTimeMs]);
  useEffect(() => { currentTimeRef.current = currentTimeMs; }, [currentTimeMs]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const readAuthoritativeTime = useCallback(() => {
    const t = getAuthoritativeTimeRef.current?.();
    return Number.isFinite(t) ? t : currentTimeRef.current;
  }, []);

  const clampTime = useCallback((t) => clamp(Number.isFinite(t) ? t : 0, 0, durationRef.current), []);

  const applyVisual = useCallback((timeMs) => {
    const clamped = clampTime(timeMs);
    const progress = clamp(clamped / durationRef.current, 0, 1);
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${progress})`;
    if (thumbRef.current) thumbRef.current.style.left = `${progress * 100}%`;
  }, [clampTime]);

  // --- scrub / drag ---
  const flushSeek = useCallback(() => {
    if (pendingSeekRef.current == null) return;
    const t = clampTime(pendingSeekRef.current);
    pendingSeekRef.current = null;
    onSeekRef.current?.(Math.round(t), { source: "slider" });
  }, [clampTime]);

  const scheduleSeek = useCallback((timeMs) => {
    pendingSeekRef.current = timeMs;
    if (rafSeekRef.current != null) return;
    rafSeekRef.current = requestAnimationFrame(() => {
      rafSeekRef.current = null;
      flushSeek();
    });
  }, [flushSeek]);

  const timeFromClientX = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    const pct = clamp((clientX - rect.left) / rect.width, 0, 1);
    return pct * durationRef.current;
  }, []);

  const syncFromPointer = useCallback((clientX) => {
    const t = clampTime(timeFromClientX(clientX));
    dragTimeRef.current = t;
    applyVisual(t);
    scheduleSeek(t);
    return t;
  }, [applyVisual, clampTime, scheduleSeek, timeFromClientX]);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    draggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    trackRef.current?.setPointerCapture?.(e.pointerId);
    onDragStateChangeRef.current?.(true);
    onPauseRef.current?.();
    syncFromPointer(e.clientX);
  }, [syncFromPointer]);

  const handlePointerMove = useCallback((e) => {
    if (!draggingRef.current || (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current)) return;
    e.preventDefault();
    syncFromPointer(e.clientX);
  }, [syncFromPointer]);

  const handlePointerUp = useCallback((e) => {
    if (!draggingRef.current) return;
    trackRef.current?.releasePointerCapture?.(e.pointerId);
    if (rafSeekRef.current != null) { cancelAnimationFrame(rafSeekRef.current); rafSeekRef.current = null; }
    pendingSeekRef.current = dragTimeRef.current;
    flushSeek();
    draggingRef.current = false;
    pointerIdRef.current = null;
    onDragStateChangeRef.current?.(false);
  }, [flushSeek]);

  // sync visual when not dragging
  useEffect(() => {
    if (draggingRef.current) return;
    applyVisual(readAuthoritativeTime());
  }, [applyVisual, readAuthoritativeTime, currentTimeMs, durationMs]);

  // RAF follow during playback
  useEffect(() => {
    if (!isPlaying) return;
    const follow = () => {
      rafFollowRef.current = requestAnimationFrame(follow);
      if (draggingRef.current) return;
      applyVisual(readAuthoritativeTime());
    };
    rafFollowRef.current = requestAnimationFrame(follow);
    return () => { if (rafFollowRef.current != null) cancelAnimationFrame(rafFollowRef.current); };
  }, [isPlaying, applyVisual, readAuthoritativeTime]);

  // cleanup
  useEffect(() => () => {
    if (rafFollowRef.current != null) cancelAnimationFrame(rafFollowRef.current);
    if (rafSeekRef.current != null) cancelAnimationFrame(rafSeekRef.current);
  }, []);

  const speedLabel = (() => {
    const rate = (0.25 + (speedMultiplier / 100) * 3.75) * 3;
    const secs = Math.max(1, durationMs) / 1000 / rate;
    return `${Math.round(secs)}s`;
  })();

  const formatTime = (ms) => {
    const totalSec = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between pointer-events-none">
      {/* Top bar: play name + exit/fullscreen */}
      <div className="pointer-events-auto flex items-center justify-between px-4 py-3">
        {playName ? (
          <span className="text-sm font-DmSans font-semibold text-white/80 truncate max-w-[50%] bg-BrandBlack/50 backdrop-blur-sm rounded-lg px-3 py-1">
            {playName}
          </span>
        ) : <span />}
        <div className="flex items-center gap-2">
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-BrandBlack/70 text-white/80 hover:text-white hover:bg-BrandBlack/90 transition backdrop-blur-sm"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <IoContractOutline size={18} /> : <IoExpandOutline size={18} />}
            </button>
          )}
          {onExitViewOnly && (
            <button
              onClick={onExitViewOnly}
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-BrandBlack/70 text-white/80 hover:text-white hover:bg-BrandBlack/90 transition backdrop-blur-sm"
              title={exitIsBack ? "Back to playbook" : "Exit view mode"}
            >
              {exitIsBack ? <IoArrowBackOutline size={18} /> : <IoCloseOutline size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="pointer-events-auto bg-gradient-to-t from-black/60 to-transparent pt-10 pb-4 px-4">
        {/* Progress bar */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full h-6 flex items-center cursor-pointer touch-none group"
        >
          {/* Track background */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-white/20 group-hover:h-[5px] transition-all">
            <div
              ref={fillRef}
              className="h-full w-full bg-BrandOrange origin-left will-change-transform rounded-full"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
          {/* Thumb */}
          <div
            ref={thumbRef}
            className="absolute z-10 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 bg-BrandOrange rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            style={{ left: "0%" }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between mt-1">
          {/* Left: time */}
          <span className="text-xs font-DmSans text-white/70 tabular-nums min-w-[70px]">
            {formatTime(currentTimeMs)} / {formatTime(durationMs)}
          </span>

          {/* Center: play/pause */}
          <button
            onClick={onPlayToggle}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-BrandOrange hover:brightness-110 transition"
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-BrandBlack">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <IoPlayOutline className="text-BrandBlack text-xl ml-0.5" />
            )}
          </button>

          {/* Right: speed + loop */}
          <div className="flex items-center gap-2 min-w-[70px] justify-end">
            <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1 backdrop-blur-sm">
              <Slider
                min={0}
                max={100}
                step={1}
                value={speedMultiplier}
                onChange={(e, v) => onSpeedChange(v)}
                sx={{
                  ...BRAND_SLIDER_SX,
                  width: { xs: 50, sm: 56, md: 76, lg: 96, xl: 112 },
                  "& .MuiSlider-rail": { ...BRAND_SLIDER_SX["& .MuiSlider-rail"], opacity: 0.3 },
                }}
              />
              <span className="text-[10px] font-DmSans text-white/60 w-6 text-right">{speedLabel}</span>
            </div>
            <button
              onClick={() => onAutoplayChange?.(!autoplayEnabled)}
              className={`text-[10px] font-DmSans px-1.5 py-0.5 rounded transition ${
                autoplayEnabled ? "text-BrandOrange bg-BrandOrange/15" : "text-white/40 hover:text-white/60"
              }`}
              title={autoplayEnabled ? "Loop on" : "Loop off"}
            >
              Loop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
