import React from 'react';
import SelectedKeyframeIcon from "../../assets/keyframes/Selected Key Frame.png";
import UnselectedKeyframeIcon from "../../assets/keyframes/Unselected Key Frame.png";

/**
 * KeyframeDisplay - Displays keyframe icons on the timeline
 */
export default function KeyframeDisplay({
  keyframes = [],
  selectedKeyframeMs = null,
  onKeyframeClick,
}) {
  // Convert timePercent (0-100) to visual position percentage (3-97%)
  const timePercentToVisualPosition = (timePercent) => {
    return 3 + (timePercent / 100) * 94;
  };

  return (
    <>
      {keyframes.map((marker, idx) => {
        const visualPos = timePercentToVisualPosition(marker.timePercent);
        const isSelected = selectedKeyframeMs === marker.timeMs;
        return (
          <img
            key={`kf-${marker.timeMs}-${idx}`}
            src={isSelected ? SelectedKeyframeIcon : UnselectedKeyframeIcon}
            alt="keyframe"
            draggable={false}
            data-kf-marker="true"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => onKeyframeClick(e, marker)}
            className="absolute z-30 cursor-pointer"
            style={{
              left: `${visualPos}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "25px",
              height: "25px",
              objectFit: "contain",
              pointerEvents: "auto",
            }}
          />
        );
      })}
    </>
  );
}
