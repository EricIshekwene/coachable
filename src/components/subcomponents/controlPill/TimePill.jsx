import React, { useRef, useEffect } from 'react';
import KeyframeDisplay from './KeyframeDisplay';

/**
 * TimePill - The draggable timeline component
 * Displays the timeline with tick marks, keyframes, and a draggable thumb
 */
export default function TimePill({
  timePercent,
  onTimeChange,
  keyframes = [],
  selectedKeyframe = null,
  onKeyframeClick,
  onDragStart,
  onDragEnd,
  isDragging,
}) {
  const pillRef = useRef(null);
  const justFinishedDragging = useRef(false);

  // Convert mouse position to timePercent (0-100) considering the 3%-97% visual range
  const getPercentFromMousePosition = (clientX) => {
    if (!pillRef.current) return 0;
    const rect = pillRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = (x / rect.width) * 100;
    // Map from 0-100% clickable range to 3-97% visual range, then back to 0-100 timePercent
    const visualPercent = Math.max(3, Math.min(97, percent));
    const timePercentValue = ((visualPercent - 3) / 94) * 100;
    return Math.max(0, Math.min(100, timePercentValue));
  };

  // Convert timePercent (0-100) to visual position percentage (3-97%)
  const timePercentToVisualPosition = (timePercent) => {
    return 3 + (timePercent / 100) * 94;
  };

  // Handle click on pill to jump to position
  const handlePillClick = (e) => {
    // Don't handle click if we just finished dragging (prevents click on drag end)
    if (isDragging || justFinishedDragging.current) {
      justFinishedDragging.current = false;
      return;
    }
    const newPercent = getPercentFromMousePosition(e.clientX);
    onTimeChange(newPercent);
  };

  // Handle drag start
  const handleDragStart = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent pill click from firing
    onDragStart();
  };

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newPercent = getPercentFromMousePosition(e.clientX);
      onTimeChange(newPercent);
    };

    const handleMouseUp = () => {
      justFinishedDragging.current = true;
      onDragEnd?.(); // Notify parent that dragging ended
      // Reset after a short delay to allow click event to be checked
      setTimeout(() => {
        justFinishedDragging.current = false;
      }, 10);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onTimeChange, onDragEnd]);

  return (
    <div
      ref={pillRef}
      onClick={handlePillClick}
      className="h-29/124 mt-[3.125px] sm:mt-[6.25px] md:mt-[6.25px] lg:mt-[6.25px] w-full flex items-center px-[6.25px] bg-BrandBlack2 border-[0.3125px] border-BrandGray rounded-full relative cursor-pointer"
    >
      {/* The horizontal rule (line) inside the pill */}
      <hr className="absolute left-0 top-1/2 w-full text-BrandOrange2 -translate-y-1/2" />
      
      {/* Vertical tick marks at 0%, 25%, 50%, 75%, 100% */}
      {[0, 25, 50, 75, 100].map((percent) => {
        const visualPos = timePercentToVisualPosition(percent);
        return (
          <div
            key={`tick-${percent}`}
            className="absolute z-5 bg-BrandOrange2"
            style={{
              left: `${visualPos}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "1.25px",
              height: "10px",
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Keyframe icons scattered along the pill */}
      <KeyframeDisplay
        keyframes={keyframes}
        selectedKeyframe={selectedKeyframe}
        onKeyframeClick={onKeyframeClick}
      />

      {/* The circle (thumb) positioned on top of the line */}
      <div
        onMouseDown={handleDragStart}
        className="absolute z-10 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[3.125px] w-[3.125px] sm:h-[15.625px] sm:w-[15.625px] bg-BrandOrange rounded-full cursor-grab active:cursor-grabbing"
        style={{ 
          left: `${timePercentToVisualPosition(timePercent)}%`, 
          pointerEvents: 'auto' 
        }}
      />
    </div>
  );
}
