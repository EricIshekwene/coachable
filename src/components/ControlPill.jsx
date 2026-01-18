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
    // Check if keyframe already exists at this position (within 1% tolerance)
    const existingKeyframe = keyframes.find(kf => Math.abs(kf - timePercent) < 1);
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
      <div className="aspect-[641/124] h-[50px] sm:h-[60px] md:h-20 lg:h-25
                        flex flex-col items-center justify-between gap-[2.5px] sm:gap-[5px] 
                        bg-BrandBlack
                         py-[2.5px] sm:py-[5px] px-[10px] sm:px-[12.5px] md:px-[15px]
                        rounded-[20px] sm:rounded-[22.5px] md:rounded-[25px] 
                        border-[0.5px] border-BrandGray 
                        absolute top-7/8 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        {/* time pill */}
        <div
          ref={pillRef}
          onClick={handlePillClick}
          className="h-29/124 mt-[2.5px] sm:mt-[5px] md:mt-[5px] lg:mt-[5px] w-full flex items-center px-[5px] bg-BrandBlack2 border-[0.25px] border-BrandGray rounded-full relative cursor-pointer"
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
                  width: "1px",
                  height: "8px",
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
                onClick={(e) => handleKeyframeClick(e, kfTimePercent)}
                className="absolute z-30 cursor-pointer"
                style={{
                  left: `${visualPos}%`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "20px",
                  height: "20px",
                  objectFit: "contain",
                  pointerEvents: "auto",
                }}
              />
            );
          })}
          {/* The circle positioned on top of the line */}
          <div
            onMouseDown={handleDragStart}
            className="absolute z-10 top-1/2 left-[25%] transform -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 sm:h-[12.5px] sm:w-[12.5px] bg-BrandOrange rounded-full cursor-grab active:cursor-grabbing"
            style={{ left: `${3 + (timePercent / 100) * 94}%`, pointerEvents: 'auto' }}
          ></div>
        </div>

        {/* time slide with time display, play buttons andkeyframe button*/}
        <div className="flex flex-1 w-full items-center justify-between gap-[2.5px] sm:gap-[5px]">
          {/* time slide with time display */}
          <div className="h-[15px] sm:h-5 md:h-5 lg:h-[25px] w-200/641 bg-BrandBlack2 flex flex-row rounded-lg items-center justify-center px-[5px] sm:px-[7.5px] gap-[5px] sm:gap-[7.5px]">
            <IoTimeOutline className="text-BrandOrange text-[12.5px] sm:text-sm flex-shrink-0" />
            <Slider
              min={0}
              max={100}
              step={1}
              value={speedMultiplier}
              onChange={(e, newValue) => setSpeedMultiplier(newValue)}
              className="flex-1"

              sx={{
                color: '#FF7A18',
                height: '3.75px',
                '& .MuiSlider-thumb': {
                  width: '10px',
                  height: '10px',
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
                  height: '3.75px',
                  border: 'none',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: '#75492a',
                  height: '3.75px',
                  opacity: 1,
                },
              }}
            />
            <div className="sm:py-[5px] font-DmSans rounded-md text-[8.75px] sm:text-[10px] md:text-[11.25px] text-BrandGray flex items-center justify-center ">
              {(() => {
                // Calculate actual duration based on speed multiplier
                const speed = (0.25 + (speedMultiplier / 100) * 3.75) * 3;
                const actualDuration = LOOP_SECONDS / speed;
                return `${Math.round(actualDuration)}s`;
              })()}
            </div>
          </div>
          {/* play, go back and forward button */}
          <div className="flex flex-row items-center gap-[2.5px] sm:gap-[5px] justify-between">
            <div className="h-[15px] sm:h-5 md:h-5 lg:h-[30px] w-[15px] sm:w-5 md:w-5 lg:w-[30px] bg-BrandBlack2 border-[0.5px] border-BrandGray flex items-center justify-center rounded-sm">
              < IoPlaySkipBackOutline className="text-BrandOrange text-sm sm:text-base md:text-lg" />
            </div>
            <div
              onClick={() => setIsPlaying((p) => !p)}
              className="h-[30px] w-[30px] sm:h-[35px] sm:w-[35px] md:h-10 md:w-10 bg-BrandOrange flex items-center justify-center rounded-sm cursor-pointer"
            >
              {isPlaying ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-BrandBlack"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <IoPlayOutline className="text-BrandBlack text-lg sm:text-lg md:text-xl lg:text-2xl" />
              )}
            </div>
            <div className="h-[15px] sm:h-5 md:h-5 lg:h-[30px] w-[15px] sm:w-5 md:w-5 lg:w-[30px] bg-BrandBlack2 border-[0.5px] border-BrandGray flex items-center justify-center rounded-sm">
              <IoPlaySkipForwardOutline className="text-BrandOrange text-sm sm:text-base md:text-lg" />
            </div>
          </div>

          {/* add/delete keyframe button */}
          <div
            onClick={selectedKeyframe !== null ? handleDeleteKeyframe : handleAddKeyframe}
            className="w-200/641 h-[15px] sm:h-5 md:h-5 lg:h-[30px] bg-BrandOrange flex flex-row items-center justify-center rounded-xl px-[5px] sm:px-[7.5px] cursor-pointer"
          >
            <p className="text-BrandBlack text-[13px] sm:text-[13px] md:text-[14px] font-DmSans">
              {selectedKeyframe !== null ? "Delete Keyframe" : "Add Keyframe"}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}