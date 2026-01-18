import React, { useState, useEffect, useRef } from 'react'
import { IoTimeOutline, IoPlayOutline } from "react-icons/io5";
import { IoPlaySkipForwardOutline, IoPlaySkipBackOutline } from "react-icons/io5";
import { IoIosAddCircleOutline, IoIosRemoveCircleOutline } from "react-icons/io";
import SelectedKeyframeIcon from "../assets/keyframes/Selected Key Frame.png";
import UnselectedKeyframeIcon from "../assets/keyframes/Unselected Key Frame.png";
import { Slider } from '@mui/material';
export default function ControlPill() {
  const [timePercent, setTimePercent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(50); // Slider controls speed (0-100, default 75 = ~3x speed)

  const rafId = useRef(null);
  const lastTs = useRef(null);
  const pillRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const justFinishedDragging = useRef(false);
  const [keyframes, setKeyframes] = useState([]); // Array of timePercent values (0-100)
  const [selectedKeyframe, setSelectedKeyframe] = useState(null); // Selected keyframe timePercent or null

  // Duration for one full traversal from 0 -> 100 before looping
  const LOOP_SECONDS = 30;

  // Animation loop that updates timePercent based on speed multiplier
  useEffect(() => {
    if (!isPlaying) {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = null;
      lastTs.current = null;
      return;
    }

    const tick = (ts) => {
      if (lastTs.current == null) lastTs.current = ts;
      const dt = (ts - lastTs.current) / 1000; // seconds since last frame
      lastTs.current = ts;

      // Speed calculation: 0 = 0.25x (slow), 75 = ~3x (default), 100 = 4x (fast)
      const speed = (0.25 + (speedMultiplier / 100) * 3.75) * 3;

      setTimePercent((p) => {
        const next = p + (dt / LOOP_SECONDS) * 100 * speed;
        return next >= 100 ? next - 100 : next; // loop back
      });

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = null;
      lastTs.current = null;
    };
  }, [isPlaying, speedMultiplier]);

  // Convert mouse position to timePercent (0-100) considering the 3%-97% visual range
  const getPercentFromMousePosition = (clientX) => {
    if (!pillRef.current) return 0;
    const rect = pillRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = (x / rect.width) * 100;
    // Map from 0-100% clickable range to 3-97% visual range, then back to 0-100 timePercent
    // Visual position: 3% to 97% (94% range)
    // If click is at visual 3%, timePercent should be 0
    // If click is at visual 97%, timePercent should be 100
    const visualPercent = Math.max(3, Math.min(97, percent));
    const timePercentValue = ((visualPercent - 3) / 94) * 100;
    return Math.max(0, Math.min(100, timePercentValue));
  };

  // Handle click on pill to jump to position
  const handlePillClick = (e) => {
    // Don't handle click if we just finished dragging (prevents click on drag end)
    if (isDragging || justFinishedDragging.current) {
      justFinishedDragging.current = false;
      return;
    }
    const newPercent = getPercentFromMousePosition(e.clientX);
    setTimePercent(newPercent);
  };

  // Handle drag start
  const handleDragStart = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent pill click from firing
    setIsDragging(true);
    setIsPlaying(false); // Pause when dragging
  };

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newPercent = getPercentFromMousePosition(e.clientX);
      setTimePercent(newPercent);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      justFinishedDragging.current = true;
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
  }, [isDragging]);

  // Convert timePercent (0-100) to visual position percentage (3-97%)
  const timePercentToVisualPosition = (timePercent) => {
    return 3 + (timePercent / 100) * 94;
  };

  // Handle adding a keyframe at current time position
  const handleAddKeyframe = (e) => {
    e.stopPropagation(); // Prevent triggering pill click

    // Limit maximum keyframes to 10
    if (keyframes.length >= 10) {
      return;
    }

    // Check if keyframe already exists at this position (within 3% tolerance to prevent close keyframes)
    const MIN_DISTANCE = 4; // Minimum distance between keyframes in percent
    const existingKeyframe = keyframes.find(kf => Math.abs(kf - timePercent) < MIN_DISTANCE);

    if (!existingKeyframe) {
      setKeyframes([...keyframes, timePercent].sort((a, b) => a - b));
    }
  };

  // Handle clicking on a keyframe
  const handleKeyframeClick = (e, timePercentValue) => {
    e.stopPropagation(); // Prevent triggering pill click
    if (selectedKeyframe === timePercentValue) {
      setSelectedKeyframe(null); // Deselect if already selected
    } else {
      setSelectedKeyframe(timePercentValue); // Select this keyframe
    }
  };

  // Handle deleting selected keyframe
  const handleDeleteKeyframe = (e) => {
    e.stopPropagation(); // Prevent triggering pill click
    if (selectedKeyframe !== null) {
      setKeyframes(keyframes.filter(kf => kf !== selectedKeyframe));
      setSelectedKeyframe(null);
    }
  };

  return (
    <>
      {/*Slate Time controller and keyframes*/}
      <div className="aspect-[641/124] h-[62.5px] sm:h-[75px] md:h-[100px] lg:h-[125px]
                        flex flex-col items-center justify-between gap-[3.125px] sm:gap-[6.25px] 
                        bg-BrandBlack
                         py-[3.125px] sm:py-[6.25px] px-[12.5px] sm:px-[15.625px] md:px-[18.75px]
                        rounded-[25px] sm:rounded-[28.125px] md:rounded-[31.25px] 
                        border-[0.625px] border-BrandGray 
                        absolute top-7/8 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        {/* time pill */}
        <div
          ref={pillRef}
          onClick={handlePillClick}
          className="h-29/124 mt-[3.125px] sm:mt-[6.25px] md:mt-[6.25px] lg:mt-[6.25px] w-full flex items-center px-[6.25px] bg-BrandBlack2 border-[0.3125px] border-BrandGray rounded-full relative cursor-pointer"
        >
          {/* The horizontal rule (line) inside the pill */}
          <hr className="absolute left-0 top-1/2 w-full  text-BrandOrange2 -translate-y-1/2" />
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
          {keyframes.map((kfTimePercent, idx) => {
            const visualPos = timePercentToVisualPosition(kfTimePercent);
            const isSelected = selectedKeyframe === kfTimePercent;
            return (
              <img
                key={`kf-${kfTimePercent}-${idx}`}
                src={isSelected ? SelectedKeyframeIcon : UnselectedKeyframeIcon}
                alt="keyframe"
                draggable={false}
                onClick={(e) => handleKeyframeClick(e, kfTimePercent)}
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
          {/* The circle positioned on top of the line */}
          <div
            onMouseDown={handleDragStart}
            className="absolute z-10 top-1/2 left-[25%] transform -translate-x-1/2 -translate-y-1/2 h-[3.125px] w-[3.125px] sm:h-[15.625px] sm:w-[15.625px] bg-BrandOrange rounded-full cursor-grab active:cursor-grabbing"
            style={{ left: `${3 + (timePercent / 100) * 94}%`, pointerEvents: 'auto' }}
          ></div>
        </div>

        {/* time slide with time display, play buttons andkeyframe button*/}
        <div className="flex flex-1 w-full items-center justify-between gap-[3.125px] sm:gap-[6.25px]">
          {/* time slide with time display */}
          <div className="h-[16px] sm:h-[22px] md:h-[24px] lg:h-[32px] w-200/641 bg-BrandBlack2 flex flex-row rounded-xl items-center justify-center px-[6.25px] sm:px-[9.375px] gap-[6.25px] sm:gap-[9.375px]">
            <IoTimeOutline className="text-BrandOrange text-[14px] sm:text-[16px] md:text-[18px] lg:text-[20px] flex-shrink-0" />
            <Slider
              min={0}
              max={100}
              step={1}
              value={speedMultiplier}
              onChange={(e, newValue) => setSpeedMultiplier(newValue)}
              className="flex-1"

              sx={{
                color: '#FF7A18',
                height: '6.25px',
                '& .MuiSlider-thumb': {
                  width: '12.5px',
                  height: '12.5px',
                  backgroundColor: '#FF7A18',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                  },
                  '&:focus, &:active, &.Mui-focusVisible': {
                    outline: 'none',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  },
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#FF7A18',
                  height: '6.25px',
                  border: 'none',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: '#75492a',
                  height: '6.25px',
                  opacity: 1,
                },
              }}
            />
            <div className="sm:py-[6.25px] font-DmSans rounded-md text-[10.9375px] sm:text-[12.5px] md:text-[14.0625px] text-BrandGray flex items-center justify-center ">
              {(() => {
                // Calculate actual duration based on speed multiplier
                const speed = (0.25 + (speedMultiplier / 100) * 3.75) * 3;
                const actualDuration = LOOP_SECONDS / speed;
                return `${Math.round(actualDuration)}s`;
              })()}
            </div>
          </div>
          {/* play, go back and forward button */}
          <div className="flex flex-row items-center gap-[3.125px] sm:gap-[6.25px] justify-between">
            <div className="h-[16px] sm:h-[22px] md:h-[24px] lg:h-[32px] w-[16px] sm:w-[22px] md:w-[24px] lg:w-[32px] bg-BrandBlack2 border-[0.625px] border-BrandGray flex items-center justify-center rounded-sm">
              < IoPlaySkipBackOutline className="text-BrandOrange text-[17.5px] sm:text-[20px] md:text-[22.5px] lg:text-[25px]" />
            </div>
            <div
              onClick={() => setIsPlaying((p) => !p)}
              className="h-[37.5px] w-[37.5px] sm:h-[43.75px] sm:w-[43.75px] md:h-[50px] md:w-[50px] bg-BrandOrange flex items-center justify-center rounded-lg cursor-pointer"
            >
              {isPlaying ? (
                <svg
                  width="22.5"
                  height="22.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-BrandBlack"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <IoPlayOutline className="text-BrandBlack text-[22.5px] sm:text-[22.5px] md:text-[25px] lg:text-[31.25px]" />
              )}
            </div>
            <div className="h-[16px] sm:h-[22px] md:h-[24px] lg:h-[32px] w-[16px] sm:w-[22px] md:w-[24px] lg:w-[32px] bg-BrandBlack2 border-[0.625px] border-BrandGray flex items-center justify-center rounded-sm">
              <IoPlaySkipForwardOutline className="text-BrandOrange text-[17.5px] sm:text-[20px] md:text-[22.5px] lg:text-[25px]" />
            </div>
          </div>

          {/* add/delete keyframe button */}
          <div
            onClick={selectedKeyframe !== null ? handleDeleteKeyframe : handleAddKeyframe}
            className="w-200/641 h-[16px] sm:h-[22px] md:h-[24px] lg:h-[32px] bg-BrandOrange flex flex-row items-center justify-center rounded-xl px-[6.25px] sm:px-[9.375px] cursor-pointer"
          >
            <p className="text-BrandBlack text-[16.25px] sm:text-[16.25px] md:text-[17.5px] font-DmSans">
              {selectedKeyframe !== null ? "Delete Keyframe" : "Add Keyframe"}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}