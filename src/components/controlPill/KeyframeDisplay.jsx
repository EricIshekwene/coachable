import React, { useCallback, useRef, useState } from 'react';
import SelectedKeyframeIcon from "../../assets/keyframes/Selected Key Frame.png";
import UnselectedKeyframeIcon from "../../assets/keyframes/Unselected Key Frame.png";

/** Minimum gap (ms) between keyframes during drag — must match Slate.jsx constant. */
const KEYFRAME_MIN_GAP_MS = 500;

/**
 * KeyframeDisplay - Displays draggable keyframe icons on the timeline.
 * Prevents keyframes from overlapping or getting too close during drag.
 */
export default function KeyframeDisplay({
  keyframes = [],
  selectedKeyframeMs = null,
  onKeyframeClick,
  onKeyframeDragStart,
  onKeyframeDragMove,
  onKeyframeDragEnd,
  timeFromClientX,
  durationMs = 30000,
  keyframesMs = [],
}) {
  const TRACK_VISUAL_START_PERCENT = 3;
  const TRACK_VISUAL_SPAN_PERCENT = 94;

  const timePercentToVisualPosition = (timePercent) =>
    TRACK_VISUAL_START_PERCENT + (timePercent / 100) * TRACK_VISUAL_SPAN_PERCENT;

  /**
   * Clamps target time to maintain minimum spacing from neighboring keyframes.
   * Prevents visual dragging into restricted zones during keyframe repositioning.
   */
  const clampDragTargetTime = useCallback(
    (originalTimeMs, targetTimeMs) => {
      let clamped = targetTimeMs;
      const otherTimes = (keyframesMs || []).filter((t) => Math.abs(t - originalTimeMs) > 0.5);

      // Clamp away from all neighboring keyframes
      for (const neighborMs of otherTimes) {
        const gap = clamped - neighborMs;
        if (Math.abs(gap) < KEYFRAME_MIN_GAP_MS) {
          clamped = gap >= 0 ? neighborMs + KEYFRAME_MIN_GAP_MS : neighborMs - KEYFRAME_MIN_GAP_MS;
        }
      }

      // Keep within duration bounds
      return Math.max(0, Math.min(durationMs, clamped));
    },
    [keyframesMs, durationMs]
  );

  const draggingRef = useRef(null); // { markerIndex, originalTimeMs, pointerId }
  const hasDraggedRef = useRef(false);
  const [dragPreview, setDragPreview] = useState(null); // { index, visualPercent }

  const handlePointerDown = useCallback(
    (e, marker, idx) => {
      e.stopPropagation();
      e.preventDefault();
      if (marker.timeMs === 0) {
        onKeyframeClick?.(e, marker);
        return;
      }
      e.target.setPointerCapture?.(e.pointerId);
      draggingRef.current = {
        markerIndex: idx,
        originalTimeMs: marker.timeMs,
        pointerId: e.pointerId,
      };
      hasDraggedRef.current = false;
    },
    [onKeyframeClick]
  );

  const handlePointerMove = useCallback(
    (e) => {
      const drag = draggingRef.current;
      if (!drag) return;
      if (e.pointerId !== drag.pointerId) return;
      e.preventDefault();
      // Fire drag start only on the first actual move
      if (!hasDraggedRef.current) {
        onKeyframeDragStart?.(drag.originalTimeMs);
      }
      hasDraggedRef.current = true;
      const newTimeMs = timeFromClientX?.(e.clientX);
      if (newTimeMs == null) return;
      // Clamp to duration bounds, then enforce keyframe spacing
      const durationClamped = Math.max(0, Math.min(durationMs, Math.round(newTimeMs)));
      const clampedTime = clampDragTargetTime(drag.originalTimeMs, durationClamped);
      const newPercent = (clampedTime / durationMs) * 100;
      const visualPercent = timePercentToVisualPosition(newPercent);
      setDragPreview({ index: drag.markerIndex, visualPercent });
      onKeyframeDragMove?.(drag.originalTimeMs, clampedTime);
    },
    [timeFromClientX, durationMs, onKeyframeDragStart, onKeyframeDragMove, clampDragTargetTime]
  );

  const handlePointerUp = useCallback(
    (e) => {
      const drag = draggingRef.current;
      if (!drag) return;
      if (e.pointerId !== drag.pointerId) return;
      e.target.releasePointerCapture?.(e.pointerId);
      e.preventDefault();
      e.stopPropagation();

      if (hasDraggedRef.current) {
        const newTimeMs = timeFromClientX?.(e.clientX);
        if (newTimeMs != null) {
          const durationClamped = Math.max(0, Math.min(durationMs, Math.round(newTimeMs)));
          const clampedTime = clampDragTargetTime(drag.originalTimeMs, durationClamped);
          onKeyframeDragEnd?.(drag.originalTimeMs, clampedTime);
        }
      } else {
        // No drag occurred — treat as click
        const marker = keyframes[drag.markerIndex];
        if (marker) {
          onKeyframeClick?.(e, marker);
        }
      }

      draggingRef.current = null;
      hasDraggedRef.current = false;
      setDragPreview(null);
    },
    [timeFromClientX, durationMs, onKeyframeDragEnd, onKeyframeClick, keyframes, clampDragTargetTime]
  );

  return (
    <>
      {keyframes.map((marker, idx) => {
        const isStartKeyframe = marker.timeMs === 0;
        const isDragging = dragPreview?.index === idx;
        const visualPos = isDragging
          ? dragPreview.visualPercent
          : timePercentToVisualPosition(marker.timePercent);
        const isSelected = selectedKeyframeMs === marker.timeMs;
        return (
          <img
            key={`kf-${marker.timeMs}-${idx}`}
            src={isSelected ? SelectedKeyframeIcon : UnselectedKeyframeIcon}
            alt="keyframe"
            draggable={false}
            data-kf-marker="true"
            onPointerDown={(e) => handlePointerDown(e, marker, idx)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`absolute z-30 ${
              isDragging ? "cursor-grabbing opacity-80" : isStartKeyframe ? "cursor-pointer" : "cursor-grab"
            }`}
            style={{
              left: `${visualPos}%`,
              top: "50%",
              transform: `translate(-50%, -50%)${isDragging ? ' scale(1.2)' : ''}`,
              width: "25px",
              height: "25px",
              objectFit: "contain",
              pointerEvents: "auto",
              transition: isDragging ? 'none' : 'left 0.15s ease-out',
            }}
          />
        );
      })}
    </>
  );
}
