import React, { useCallback, useRef, useState } from 'react';
import SelectedKeyframeIcon from "../../assets/keyframes/Selected Key Frame.png";
import UnselectedKeyframeIcon from "../../assets/keyframes/Unselected Key Frame.png";

/**
 * KeyframeDisplay - Displays draggable keyframe icons on the timeline.
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
}) {
  const TRACK_VISUAL_START_PERCENT = 3;
  const TRACK_VISUAL_SPAN_PERCENT = 94;
  const FIRST_KEYFRAME_INDEX = 0;

  const timePercentToVisualPosition = (timePercent) =>
    TRACK_VISUAL_START_PERCENT + (timePercent / 100) * TRACK_VISUAL_SPAN_PERCENT;

  const draggingRef = useRef(null); // { markerIndex, originalTimeMs, pointerId }
  const hasDraggedRef = useRef(false);
  const [dragPreview, setDragPreview] = useState(null); // { index, visualPercent }

  const handlePointerDown = useCallback(
    (e, marker, idx) => {
      e.stopPropagation();
      e.preventDefault();
      if (idx === FIRST_KEYFRAME_INDEX) {
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
      const clampedTime = Math.max(0, Math.min(durationMs, Math.round(newTimeMs)));
      const newPercent = (clampedTime / durationMs) * 100;
      const visualPercent = timePercentToVisualPosition(newPercent);
      setDragPreview({ index: drag.markerIndex, visualPercent });
      onKeyframeDragMove?.(drag.originalTimeMs, clampedTime);
    },
    [timeFromClientX, durationMs, onKeyframeDragStart, onKeyframeDragMove]
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
          const clampedTime = Math.max(0, Math.min(durationMs, Math.round(newTimeMs)));
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
    [timeFromClientX, durationMs, onKeyframeDragEnd, onKeyframeClick, keyframes]
  );

  return (
    <>
      {keyframes.map((marker, idx) => {
        const isFirstKeyframe = idx === FIRST_KEYFRAME_INDEX;
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
              isDragging ? "cursor-grabbing opacity-80" : isFirstKeyframe ? "cursor-pointer" : "cursor-grab"
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
