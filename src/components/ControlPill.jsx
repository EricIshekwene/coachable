import React from "react";
import { IoTimeOutline, IoPlayOutline } from "react-icons/io5";
import { IoPlaySkipForwardOutline, IoPlaySkipBackOutline } from "react-icons/io5";
import SelectedKeyframeIcon from "../assets/keyframes/Selected Key Frame.png";
import UnselectedKeyframeIcon from "../assets/keyframes/Unselected Key Frame.png";
import { Slider } from "@mui/material";
import { FaChevronDown, FaTimes } from "react-icons/fa";
import { BiUndo, BiRedo } from "react-icons/bi";
import { FaRegTrashCan } from "react-icons/fa6";
import { useSlate } from "./SlateContext";

const timePercentToVisualPosition = (timePercent) => 3 + (timePercent / 100) * 94;

export default function ControlPill() {
  const { state, dispatch, playback, setPlayback } = useSlate();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [selectedKeyframeIndex, setSelectedKeyframeIndex] = React.useState(state.currentKeyframeIndex);
  const keyframes = state.keyframes;
  const selectedIndex = state.currentKeyframeIndex;

  React.useEffect(() => {
    setSelectedKeyframeIndex(state.currentKeyframeIndex);
  }, [state.currentKeyframeIndex]);

  const handleAddKeyframe = (e) => {
    e.stopPropagation();
    dispatch({ type: "ADD_KEYFRAME" });
    setSelectedKeyframeIndex(null);
  };

  const handleDeleteKeyframe = (e) => {
    e.stopPropagation();
    const targetIndex = selectedKeyframeIndex ?? selectedIndex;
    dispatch({ type: "DELETE_KEYFRAME", index: targetIndex });
    setSelectedKeyframeIndex(null);
  };

  const handleKeyframeClick = (e, index) => {
    e.stopPropagation();
    if (selectedKeyframeIndex === index) {
      setSelectedKeyframeIndex(null);
      return;
    }
    const snapshot = keyframes[index]?.snapshot;
    if (snapshot) {
      dispatch({ type: "APPLY_SNAPSHOT", snapshot, index });
      setSelectedKeyframeIndex(index);
    }
  };

  const handleTrash = (e) => {
    e.stopPropagation();
    dispatch({ type: "CLEAR_KEYFRAMES" });
  };

  const handleSkipBack = () => {
    dispatch({ type: "UNDO" });
  };

  const handleSkipForward = () => {
    dispatch({ type: "REDO" });
  };

  const handlePlayToggle = () => {
    setPlayback((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleSpeedChange = (value) => {
    setPlayback((prev) => ({ ...prev, speedMultiplier: value }));
  };

  return (
    <>
      {/*Slate Time controller and keyframes*/}
      <div className={`aspect-[641/124] h-[62.5px] sm:h-[75px] md:h-[100px] lg:h-[125px]
                        flex flex-col items-center justify-between gap-[3.125px] sm:gap-[6.25px] 
                        bg-BrandBlack
                         py-[3.125px] sm:py-[6.25px] px-[12.5px] sm:px-[15.625px] md:px-[18.75px]
                        rounded-[25px] sm:rounded-[28.125px] md:rounded-[31.25px] 
                        select-none
                        absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${isDropdownOpen ? "top-[84%]" : "top-[87%]"
        }`}>
        {/* time pill */}
        <div
          className="h-29/124 mt-[3.125px] sm:mt-[6.25px] md:mt-[6.25px] lg:mt-[6.25px] w-full flex items-center px-[6.25px] bg-BrandBlack2 border-[0.3125px] border-BrandGray rounded-full relative"
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
          {keyframes.map((_, idx) => {
            const count = keyframes.length;
            const percent = count <= 1 ? 0 : (idx / (count - 1)) * 100;
            const visualPos = timePercentToVisualPosition(percent);
            const isSelected = selectedIndex === idx;
            return (
              <img
                key={`kf-${idx}`}
                src={isSelected ? SelectedKeyframeIcon : UnselectedKeyframeIcon}
                alt="keyframe"
                draggable={false}
                onClick={(e) => handleKeyframeClick(e, idx)}
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
            className="absolute z-10 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[3.125px] w-[3.125px] sm:h-[15.625px] sm:w-[15.625px] bg-BrandOrange rounded-full"
            style={{ left: `${3 + (playback.timePercent / 100) * 94}%`, pointerEvents: "none" }}
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
              value={playback.speedMultiplier}
              onChange={(e, newValue) => handleSpeedChange(newValue)}
              className="flex-1"

              sx={{
                color: "#FF7A18",
                height: "6.25px",
                "& .MuiSlider-thumb": {
                  width: "12.5px",
                  height: "12.5px",
                  backgroundColor: "#FF7A18",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                  "&:hover": {
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
                  },
                  "&:focus, &:active, &.Mui-focusVisible": {
                    outline: "none",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                  },
                },
                "& .MuiSlider-track": {
                  backgroundColor: "#FF7A18",
                  height: "6.25px",
                  border: "none",
                },
                "& .MuiSlider-rail": {
                  backgroundColor: "#75492a",
                  height: "6.25px",
                  opacity: 1,
                },
              }}
            />
            <div className="sm:py-[6.25px] font-DmSans rounded-md text-[10.9375px] sm:text-[12.5px] md:text-[14.0625px] text-BrandGray flex items-center justify-center ">
              {(() => {
                const speed = (0.25 + (playback.speedMultiplier / 100) * 3.75) * 3;
                const actualDuration = 30 / speed;
                return `${Math.round(actualDuration)}s`;
              })()}
            </div>
          </div>
          {/* play, go back and forward button */}
          <div className="flex flex-row items-center gap-[3.125px] sm:gap-[6.25px] justify-between">
            <div
              onClick={handleSkipBack}
              className="h-[16px] sm:h-[22px] md:h-[24px] lg:h-[32px] w-[16px] sm:w-[22px] md:w-[24px] lg:w-[32px] bg-BrandBlack2 border-[0.625px] border-BrandGray flex items-center justify-center rounded-sm cursor-pointer"
            >
              <IoPlaySkipBackOutline className="text-BrandOrange text-[17.5px] sm:text-[20px] md:text-[22.5px] lg:text-[25px]" />
            </div>
            <div
              onClick={handlePlayToggle}
              className="h-[37.5px] w-[37.5px] sm:h-[43.75px] sm:w-[43.75px] md:h-[50px] md:w-[50px] bg-BrandOrange flex items-center justify-center rounded-lg cursor-pointer"
            >
              {playback.isPlaying ? (
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
            <div
              onClick={handleSkipForward}
              className="h-[16px] sm:h-[22px] md:h-[24px] lg:h-[32px] w-[16px] sm:w-[22px] md:w-[24px] lg:w-[32px] bg-BrandBlack2 border-[0.625px] border-BrandGray flex items-center justify-center rounded-sm cursor-pointer"
            >
              <IoPlaySkipForwardOutline className="text-BrandOrange text-[17.5px] sm:text-[20px] md:text-[22.5px] lg:text-[25px]" />
            </div>
          </div>

          {/* add/delete keyframe button */}
          <div
            onClick={selectedKeyframeIndex !== null && keyframes.length > 1 ? handleDeleteKeyframe : handleAddKeyframe}
            className="w-200/641 h-[16px] sm:h-[22px] md:h-[24px] lg:h-[32px] bg-BrandOrange flex flex-row items-center justify-center rounded-xl px-[6.25px] sm:px-[9.375px] cursor-pointer"
          >
            <p className="text-BrandBlack text-[10px] sm:text-[12px] md:text-[15px]  lg:text-[17.l5px] font-DmSans">
              {selectedKeyframeIndex !== null && keyframes.length > 1 ? "Delete Keyframe" : "Add Keyframe"}
            </p>
          </div>
        </div>
      </div>
      {/* dropdown menu button */}
      {!isDropdownOpen && (
        <div
          onClick={() => setIsDropdownOpen(true)}
          className="absolute top-[97.5%] select-none left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[25px] w-[25px] bg-BrandBlack rounded-full border-[0.625px] border-BrandGray flex items-center justify-center cursor-pointer hover:bg-BrandBlack2 transition-colors"
        >
          <FaChevronDown className="text-BrandOrange text-[12.5px] sm:text-[12.5px] md:text-[12.5px] font-DmSans" />
        </div>
      )}
      {/* dropdown Options */}
      {isDropdownOpen && (
        <div className="absolute top-[96.5%] left-1/2 select-none transform -translate-x-1/2 -translate-y-1/2 h-[40px] bg-BrandBlack rounded-full border-[0.625px] border-BrandGray flex items-center gap-[12px] px-[12px]">
          {/* Trash icon */}
          <FaRegTrashCan
            onClick={handleTrash}
            className="text-BrandOrange text-[12.5px] sm:text-[12.5px] md:text-[18px] font-DmSans cursor-pointer hover:opacity-80 transition-opacity"
          />

          {/* Undo icon */}
          <BiUndo
            onClick={() => dispatch({ type: "UNDO" })}
            className={`text-BrandOrange text-[12.5px] sm:text-[12.5px] md:text-[18px] font-DmSans cursor-pointer hover:opacity-80 transition-opacity ${selectedIndex === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
          />

          {/* Redo icon */}
          <BiRedo
            onClick={() => dispatch({ type: "REDO" })}
            className={`text-BrandOrange text-[12.5px] sm:text-[12.5px] md:text-[18px] font-DmSans cursor-pointer hover:opacity-80 transition-opacity ${selectedIndex === keyframes.length - 1 ? "opacity-50 cursor-not-allowed" : ""}`}
          />

          {/* Autoplay pill switch */}
          <div className="flex items-center gap-[8px]">
            <span className="text-BrandGray text-[10px] sm:text-[12px] md:text-[14px] font-DmSans whitespace-nowrap">Autoplay</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPlayback((prev) => {
                  const nextAutoplay = !prev.autoplayEnabled;
                  return {
                    ...prev,
                    autoplayEnabled: nextAutoplay,
                    timePercent: nextAutoplay ? prev.timePercent : 0,
                    isPlaying: nextAutoplay ? prev.isPlaying : false,
                  };
                });
              }}
              className={`relative w-[40px] h-[20px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${playback.autoplayEnabled ? "bg-BrandOrange" : "bg-BrandGray"
                }`}
              aria-label="Toggle autoplay"
            >
              <span
                className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 w-[16px] h-[16px] bg-BrandBlack rounded-full shadow-sm ${playback.autoplayEnabled ? "translate-x-[22px]" : "translate-x-[4px]"
                  }`}
              />
            </button>
          </div>

          {/* Close button (X) */}
          <FaTimes
            onClick={() => setIsDropdownOpen(false)}
            className="text-BrandOrange text-[14px] sm:text-[14px] md:text-[18px] font-DmSans cursor-pointer hover:opacity-80 transition-opacity ml-[4px]"
          />
        </div>
      )}
    </>
  );
}
