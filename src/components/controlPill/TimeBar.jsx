import React, { useCallback, useEffect, useMemo, useRef } from "react";
import KeyframeDisplay from "./KeyframeDisplay";
import { log as logAnimDebug } from "../../animation/debugLogger";

const TRACK_VISUAL_START_PERCENT = 3;
const TRACK_VISUAL_SPAN_PERCENT = 94;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toFinite = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeDuration = (durationMs) => Math.max(1, Math.round(toFinite(durationMs, 1)));

const timePercentToVisualPercent = (timePercent) =>
  TRACK_VISUAL_START_PERCENT + (timePercent / 100) * TRACK_VISUAL_SPAN_PERCENT;

export default function TimeBar({
  durationMs = 30000,
  currentTimeMs = 0,
  isPlaying = false,
  keyframes = [],
  selectedKeyframeMs = null,
  effectiveSelectedKeyframeMs = null,
  onSeek,
  onKeyframeClick,
  onKeyframeDragStart,
  onKeyframeDragMove,
  onKeyframeDragEnd,
  getAuthoritativeTimeMs,
  onDragStateChange,
  keyframesMs = [],
  variant = "default",
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
  const durationRef = useRef(normalizeDuration(durationMs));
  const onSeekRef = useRef(onSeek);
  const onDragStateChangeRef = useRef(onDragStateChange);
  const getAuthoritativeTimeRef = useRef(getAuthoritativeTimeMs);
  const currentTimeRef = useRef(toFinite(currentTimeMs, 0));
  const isPlayingRef = useRef(Boolean(isPlaying));
  const lastDragLogTsRef = useRef(0);

  const tickPercents = useMemo(() => [0, 25, 50, 75, 100], []);

  useEffect(() => {
    durationRef.current = normalizeDuration(durationMs);
  }, [durationMs]);

  useEffect(() => {
    onSeekRef.current = onSeek;
  }, [onSeek]);

  useEffect(() => {
    onDragStateChangeRef.current = onDragStateChange;
  }, [onDragStateChange]);

  useEffect(() => {
    getAuthoritativeTimeRef.current = getAuthoritativeTimeMs;
  }, [getAuthoritativeTimeMs]);

  useEffect(() => {
    currentTimeRef.current = toFinite(currentTimeMs, 0);
  }, [currentTimeMs]);

  useEffect(() => {
    isPlayingRef.current = Boolean(isPlaying);
  }, [isPlaying]);

  const readAuthoritativeTime = useCallback(() => {
    const reportedTime = getAuthoritativeTimeRef.current?.();
    if (Number.isFinite(reportedTime)) return reportedTime;
    return currentTimeRef.current;
  }, []);

  const clampTime = useCallback((timeMs) => {
    const duration = durationRef.current;
    return clamp(toFinite(timeMs, 0), 0, duration);
  }, []);

  const applyVisualFromTime = useCallback(
    (timeMs) => {
      const clampedTime = clampTime(timeMs);
      const duration = durationRef.current;
      const progress = clamp(clampedTime / duration, 0, 1);
      const visualPercent = timePercentToVisualPercent(progress * 100);
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${progress})`;
      }
      if (thumbRef.current) {
        thumbRef.current.style.left = `${visualPercent}%`;
      }
    },
    [clampTime]
  );

  const flushSeek = useCallback(() => {
    if (pendingSeekRef.current == null) return null;
    const nextTime = clampTime(pendingSeekRef.current);
    pendingSeekRef.current = null;
    onSeekRef.current?.(Math.round(nextTime), { source: "slider" });
    const now = performance.now();
    if (now - lastDragLogTsRef.current >= 80) {
      lastDragLogTsRef.current = now;
      logAnimDebug(`dragMove t=${Math.round(nextTime)}`);
    }
    return nextTime;
  }, [clampTime]);

  const scheduleSeek = useCallback(
    (timeMs) => {
      pendingSeekRef.current = timeMs;
      if (rafSeekRef.current != null) return;
      rafSeekRef.current = requestAnimationFrame(() => {
        rafSeekRef.current = null;
        flushSeek();
      });
    },
    [flushSeek]
  );

  const timeFromClientX = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0) return 0;
    const relativeX = clamp(clientX - rect.left, 0, rect.width);
    const percent = (relativeX / rect.width) * 100;
    const timePercent = clamp((percent - TRACK_VISUAL_START_PERCENT) / TRACK_VISUAL_SPAN_PERCENT, 0, 1);
    return timePercent * durationRef.current;
  }, []);

  const syncFromPointer = useCallback(
    (clientX, { emitSeek = true } = {}) => {
      const nextTime = clampTime(timeFromClientX(clientX));
      dragTimeRef.current = nextTime;
      applyVisualFromTime(nextTime);
      if (emitSeek) {
        scheduleSeek(nextTime);
      }
      return nextTime;
    },
    [applyVisualFromTime, clampTime, scheduleSeek, timeFromClientX]
  );

  const endDrag = useCallback(
    (clientX) => {
      if (!draggingRef.current) return;
      if (Number.isFinite(clientX)) {
        syncFromPointer(clientX, { emitSeek: false });
      }
      if (rafSeekRef.current != null) {
        cancelAnimationFrame(rafSeekRef.current);
        rafSeekRef.current = null;
      }
      pendingSeekRef.current = dragTimeRef.current;
      const flushed = flushSeek() ?? dragTimeRef.current;

      draggingRef.current = false;
      pointerIdRef.current = null;
      onDragStateChangeRef.current?.(false);
      logAnimDebug(`dragEnd t=${Math.round(flushed)}`);

      const followTime = isPlayingRef.current ? readAuthoritativeTime() : currentTimeRef.current;
      applyVisualFromTime(followTime);
    },
    [applyVisualFromTime, flushSeek, readAuthoritativeTime, syncFromPointer]
  );

  const handlePointerDown = useCallback(
    (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.target?.dataset?.kfMarker === "true") return;
      event.preventDefault();
      const trackNode = trackRef.current;
      if (!trackNode) return;
      draggingRef.current = true;
      pointerIdRef.current = event.pointerId;
      trackNode.setPointerCapture?.(event.pointerId);
      onDragStateChangeRef.current?.(true);
      logAnimDebug("dragStart");
      lastDragLogTsRef.current = 0;
      syncFromPointer(event.clientX, { emitSeek: true });
    },
    [syncFromPointer]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!draggingRef.current) return;
      if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return;
      event.preventDefault();
      syncFromPointer(event.clientX, { emitSeek: true });
    },
    [syncFromPointer]
  );

  const handlePointerUp = useCallback(
    (event) => {
      if (!draggingRef.current) return;
      if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return;
      event.preventDefault();
      trackRef.current?.releasePointerCapture?.(event.pointerId);
      endDrag(event.clientX);
    },
    [endDrag]
  );

  useEffect(() => {
    if (draggingRef.current) return;
    applyVisualFromTime(readAuthoritativeTime());
  }, [applyVisualFromTime, readAuthoritativeTime, currentTimeMs, durationMs]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const follow = () => {
      rafFollowRef.current = requestAnimationFrame(follow);
      if (draggingRef.current) return;
      applyVisualFromTime(readAuthoritativeTime());
    };
    rafFollowRef.current = requestAnimationFrame(follow);
    return () => {
      if (rafFollowRef.current != null) {
        cancelAnimationFrame(rafFollowRef.current);
        rafFollowRef.current = null;
      }
    };
  }, [isPlaying, applyVisualFromTime, readAuthoritativeTime]);

  useEffect(
    () => () => {
      if (rafFollowRef.current != null) {
        cancelAnimationFrame(rafFollowRef.current);
        rafFollowRef.current = null;
      }
      if (rafSeekRef.current != null) {
        cancelAnimationFrame(rafSeekRef.current);
        rafSeekRef.current = null;
      }
    },
    []
  );

  const isTest = variant === "test";

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`h-29/124 mt-[3.125px] sm:mt-[6.25px] md:mt-[6.25px] lg:mt-[6.25px] w-full flex items-center px-[6.25px] rounded-full relative cursor-pointer touch-none ${
        isTest
          ? "bg-transparent border-transparent"
          : "bg-BrandBlack2 border-[0.3125px] border-BrandGray"
      }`}
    >
      <div
        className={`absolute left-[3%] right-[3%] top-1/2 -translate-y-1/2 rounded-full overflow-hidden pointer-events-none ${
          isTest ? "h-2 bg-white/10" : "h-[1.25px] bg-BrandOrange2/35"
        }`}
      >
        <div
          ref={fillRef}
          className={`h-full w-full origin-left will-change-transform ${
            isTest ? "bg-BrandOrange" : "bg-BrandOrange2"
          }`}
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      {!isTest && tickPercents.map((percent) => {
        const visualPos = timePercentToVisualPercent(percent);
        return (
          <div
            key={`tick-${percent}`}
            className="absolute z-5 bg-BrandOrange2 pointer-events-none"
            style={{
              left: `${visualPos}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "1.25px",
              height: "10px",
            }}
          />
        );
      })}

      <KeyframeDisplay
        keyframes={keyframes}
        selectedKeyframeMs={selectedKeyframeMs}
        effectiveSelectedKeyframeMs={effectiveSelectedKeyframeMs}
        onKeyframeClick={onKeyframeClick}
        onKeyframeDragStart={onKeyframeDragStart}
        onKeyframeDragMove={onKeyframeDragMove}
        onKeyframeDragEnd={onKeyframeDragEnd}
        timeFromClientX={timeFromClientX}
        durationMs={durationRef.current}
        keyframesMs={keyframesMs}
        variant={variant}
      />

      {isTest ? (
        <div
          ref={thumbRef}
          className="absolute z-20 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-5 bg-white/70 pointer-events-none"
          style={{ left: `${TRACK_VISUAL_START_PERCENT}%` }}
        />
      ) : (
        <div
          ref={thumbRef}
          className="absolute z-20 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[3.125px] w-[3.125px] sm:h-[15.625px] sm:w-[15.625px] bg-BrandOrange rounded-full pointer-events-none"
          style={{ left: `${TRACK_VISUAL_START_PERCENT}%` }}
        />
      )}
    </div>
  );
}
