import React, { useState, useRef, useEffect, useMemo } from "react";
import { FaChevronDown, FaTimes } from "react-icons/fa";
import { FaCrown } from "react-icons/fa6";
import { Slider } from "@mui/material";
import { useSlate } from "./SlateContext";

export default function AdvancedSettings({ onClose }) {
  const { state, dispatch } = useSlate();
  const [videoQuality, setVideoQuality] = useState("1080p");
  const [watermark, setWatermark] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [openPitchColorDropdown, setOpenPitchColorDropdown] = useState(false);
  const [openPitchSizeDropdown, setOpenPitchSizeDropdown] = useState(false);
  const [openVideoQualityDropdown, setOpenVideoQualityDropdown] = useState(false);
  const [playOnLoad, setPlayOnLoad] = useState(true);
  const pitchColorRef = useRef(null);
  const pitchSizeRef = useRef(null);
  const videoQualityRef = useRef(null);

  const pitchSizeOptions = ["Full Field", "Half Pitch", "Goal", "Quarter Field"];
  const videoQualityOptions = ["360p", "480p", "720p", "1080p", "1440p", "2160p (4K)"];

  const pitchColorOptions = [
    { name: "Fresh Turf Green", hex: "#E6F4EA" },
    { name: "Practice Grass", hex: "#CDE7D3" },
    { name: "Natural Grass", hex: "#9FCC9F" },
    { name: "Stadium Grass", hex: "#6FAF7B" },
    { name: "Pro Turf Green", hex: "#3E8E5B" },
    { name: "Deep Field Green", hex: "#1F5F3F" },
    { name: "Sand Beige", hex: "#EFE6D8" },
    { name: "Clay Field", hex: "#D8C3A5" },
    { name: "Chalk Line Blue", hex: "#AFC9E8" },
    { name: "Tactical Blue", hex: "#4A78A8" },
  ];

  const selectedPitchColorName = useMemo(() => {
    return pitchColorOptions.find((color) => color.hex.toLowerCase() === state.field.pitchColor.toLowerCase())?.name || "Custom";
  }, [pitchColorOptions, state.field.pitchColor]);

  const selectedPlayer = state.objects.find((obj) => obj.id === state.selectedId && obj.type === "player");
  const playerSize = selectedPlayer?.size ?? state.defaultPlayerSize;

  // Close pitch color dropdown when clicking outside
  useEffect(() => {
    if (!openPitchColorDropdown) return;

    const handleClickOutside = (e) => {
      if (pitchColorRef.current && !pitchColorRef.current.contains(e.target)) {
        setOpenPitchColorDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openPitchColorDropdown]);

  // Close pitch size dropdown when clicking outside
  useEffect(() => {
    if (!openPitchSizeDropdown) return;

    const handleClickOutside = (e) => {
      if (pitchSizeRef.current && !pitchSizeRef.current.contains(e.target)) {
        setOpenPitchSizeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openPitchSizeDropdown]);

  // Close video quality dropdown when clicking outside
  useEffect(() => {
    if (!openVideoQualityDropdown) return;

    const handleClickOutside = (e) => {
      if (videoQualityRef.current && !videoQualityRef.current.contains(e.target)) {
        setOpenVideoQualityDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openVideoQualityDropdown]);

  const updatePlayerSize = (value) => {
    if (selectedPlayer) {
      dispatch({ type: "UPDATE_OBJECT", id: selectedPlayer.id, value: { size: value }, record: true });
    } else {
      dispatch({ type: "SET_DEFAULT_PLAYER", value: { defaultPlayerSize: value } });
    }
  };

  return (
    <div className="absolute right-0 top-0 h-screen z-40 flex flex-col">
      <aside
        className="
                     flex-1 shrink-0 bg-BrandBlack
                     w-36 sm:w-40 md:w-48 lg:w-52 xl:w-56
                     px-2 sm:px-2.5 md:px-3 py-2 sm:py-2.5 md:py-3
                     flex flex-col
                     gap-0.5 sm:gap-0.5 md:gap-1 lg:gap-1.5
                     select-none
                     overflow-y-auto hide-scroll
                     flex flex-col justify-start

                   "
      >
        <div className="flex flex-row border-b border-BrandGray2 pb-1.5 sm:pb-2 items-center justify-center gap-1.5 sm:gap-2 font-DmSans font-bold">
          <p
            className="text-BrandWhite text-lg sm:text-xl md:text-2xl bg-transparent border-none outline-none focus:outline-none text-center font-DmSans font-bold w-full max-w-[100px] sm:max-w-[110px] md:max-w-[120px]"
          >
            Advanced Settings
          </p>
        </div>

        {/* Pitch Settings */}
        <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1 sm:gap-2">
          <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">
            Pitch Settings
          </div>

          {/* Show Markings Switch */}
          <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5">
            <div className="flex items-center justify-between w-full gap-2">
              <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Show Markings</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: "SET_FIELD_SETTINGS", value: { showMarkings: !state.field.showMarkings } });
                }}
                className={`relative w-[32px] h-[16px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${state.field.showMarkings ? "bg-BrandOrange" : "bg-BrandGray"
                  }`}
                aria-label="Toggle show markings"
              >
                <span
                  className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 w-[12px] h-[12px] bg-BrandBlack rounded-full shadow-sm ${state.field.showMarkings ? "translate-x-[18px]" : "translate-x-[3px]"
                    }`}
                />
              </button>
            </div>
          </div>

          {/* Pitch Size */}
          <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5 relative">
            <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Pitch Size</p>
            <div
              ref={pitchSizeRef}
              className="relative w-full"
            >
              <div
                onClick={() => setOpenPitchSizeDropdown(!openPitchSizeDropdown)}
                className="bg-BrandBlack2 h-5 sm:h-6 w-full flex flex-row items-center justify-between px-2 rounded-md cursor-pointer"
              >
                <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">{state.field.pitchSize}</p>
                <FaChevronDown className={`text-BrandOrange text-xs transition-transform ${openPitchSizeDropdown ? "rotate-180" : ""}`} />
              </div>
              {openPitchSizeDropdown && (
                <div className="absolute left-0 top-full w-full bg-BrandBlack2 border border-BrandGray rounded-md mt-1 max-h-40 overflow-y-auto z-10 shadow-lg">
                  {pitchSizeOptions.map((size, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        dispatch({ type: "SET_FIELD_SETTINGS", value: { pitchSize: size } });
                        setOpenPitchSizeDropdown(false);
                      }}
                      className={`px-2 py-1 text-xs sm:text-sm font-DmSans cursor-pointer transition-colors ${state.field.pitchSize === size
                        ? "bg-BrandOrange text-BrandBlack"
                        : "text-BrandWhite hover:bg-BrandBlack"
                        }`}
                    >
                      {size}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pitch Color */}
          <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5 relative">
            <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Pitch Color</p>
            <div
              ref={pitchColorRef}
              className="relative w-full"
            >
              <div
                onClick={() => setOpenPitchColorDropdown(!openPitchColorDropdown)}
                className="bg-BrandBlack2 h-5 sm:h-6 w-full flex flex-row items-center justify-between px-2 rounded-md cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded border border-BrandGray shrink-0"
                    style={{ backgroundColor: state.field.pitchColor }}
                  />
                  <p className="text-BrandWhite text-xs sm:text-sm font-DmSans truncate">{selectedPitchColorName}</p>
                </div>
                <FaChevronDown className={`text-BrandOrange text-xs transition-transform shrink-0 ${openPitchColorDropdown ? "rotate-180" : ""}`} />
              </div>
              {openPitchColorDropdown && (
                <div className="absolute left-0 top-full w-full bg-BrandBlack2 border border-BrandGray rounded-md mt-1 max-h-60 overflow-y-auto z-10 shadow-lg">
                  {pitchColorOptions.map((color, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        dispatch({ type: "SET_FIELD_SETTINGS", value: { pitchColor: color.hex } });
                        setOpenPitchColorDropdown(false);
                      }}
                      className={`px-2 py-1.5 text-xs sm:text-sm font-DmSans cursor-pointer transition-colors flex items-center gap-2 ${state.field.pitchColor === color.hex
                        ? "bg-BrandOrange text-BrandBlack"
                        : "text-BrandWhite hover:bg-BrandBlack"
                        }`}
                    >
                      <div
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded border border-BrandGray shrink-0"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="truncate">{color.name}</span>
                        <span className={`text-[10px] ${state.field.pitchColor === color.hex ? "text-BrandBlack/70" : "text-BrandGray"}`}>{color.hex}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Input below pitch color */}
            <input
              className="w-full h-5 sm:h-6 bg-BrandBlack border-[0.5px] border-BrandGray text-BrandWhite rounded-md px-2 text-xs sm:text-sm focus:outline-none focus:border-BrandOrange transition-colors"
              value={state.field.pitchColor}
              onChange={(e) => {
                dispatch({ type: "SET_FIELD_SETTINGS", value: { pitchColor: e.target.value } });
              }}
            />
          </div>
        </div>

        {/* Player Settings */}
        <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1 sm:gap-2">
          <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">
            Player Settings
          </div>

          {/* Player Size */}
          <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5">
            <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Size</p>
            <Slider
              min={5}
              max={150}
              step={1}
              value={playerSize}
              onChange={(e, newValue) => updatePlayerSize(newValue)}
              sx={{
                color: "#FF7A18",
                height: "4px",
                padding: 0,
                '& .MuiSlider-thumb': {
                  width: "14px",
                  height: "14px",
                  backgroundColor: "#FF7A18",
                },
              }}
            />
          </div>

          {/* Show Number */}
          <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5">
            <div className="flex items-center justify-between w-full gap-2">
              <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Show Number</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: "SET_DISPLAY_SETTINGS", value: { showNumber: !state.display.showNumber } });
                }}
                className={`relative w-[32px] h-[16px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${state.display.showNumber ? "bg-BrandOrange" : "bg-BrandGray"
                  }`}
                aria-label="Toggle show number"
              >
                <span
                  className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 w-[12px] h-[12px] bg-BrandBlack rounded-full shadow-sm ${state.display.showNumber ? "translate-x-[18px]" : "translate-x-[3px]"
                    }`}
                />
              </button>
            </div>
          </div>

          {/* Show Label */}
          <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5">
            <div className="flex items-center justify-between w-full gap-2">
              <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Show Label</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: "SET_DISPLAY_SETTINGS", value: { showName: !state.display.showName } });
                }}
                className={`relative w-[32px] h-[16px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${state.display.showName ? "bg-BrandOrange" : "bg-BrandGray"
                  }`}
                aria-label="Toggle show label"
              >
                <span
                  className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 w-[12px] h-[12px] bg-BrandBlack rounded-full shadow-sm ${state.display.showName ? "translate-x-[18px]" : "translate-x-[3px]"
                    }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Video Export */}
        <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1 sm:gap-2">
          <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">
            Video Export
          </div>

          {/* Video Quality */}
          <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5 relative">
            <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Video Quality</p>
            <div
              ref={videoQualityRef}
              className="relative w-full"
            >
              <div
                onClick={() => setOpenVideoQualityDropdown(!openVideoQualityDropdown)}
                className="bg-BrandBlack2 h-5 sm:h-6 w-full flex flex-row items-center justify-between px-2 rounded-md cursor-pointer"
              >
                <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">{videoQuality}</p>
                <FaChevronDown className={`text-BrandOrange text-xs transition-transform ${openVideoQualityDropdown ? "rotate-180" : ""}`} />
              </div>
              {openVideoQualityDropdown && (
                <div className="absolute left-0 top-full w-full bg-BrandBlack2 border border-BrandGray rounded-md mt-1 max-h-40 overflow-y-auto z-10 shadow-lg">
                  {videoQualityOptions.map((quality, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setVideoQuality(quality);
                        setOpenVideoQualityDropdown(false);
                      }}
                      className={`px-2 py-1 text-xs sm:text-sm font-DmSans cursor-pointer transition-colors ${videoQuality === quality
                        ? "bg-BrandOrange text-BrandBlack"
                        : "text-BrandWhite hover:bg-BrandBlack"
                        }`}
                    >
                      {quality}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Watermark */}
            <div className="flex items-center justify-between w-full gap-2 mt-2">
              <div className="flex items-center gap-1">
                <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Watermark</p>
                <FaCrown className="text-BrandOrange text-xs" />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setWatermark(!watermark);
                }}
                className={`relative w-[32px] h-[16px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${watermark ? "bg-BrandOrange" : "bg-BrandGray"
                  }`}
                aria-label="Toggle watermark"
              >
                <span
                  className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 text-BrandBlack ${watermark ? "translate-x-[18px]" : "translate-x-[3px]"
                    }`}
                />
              </button>
            </div>

            {/* Include Metadata */}
            <div className="flex items-center justify-between w-full gap-2 mt-2">
              <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Include Metadata</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIncludeMetadata(!includeMetadata);
                }}
                className={`relative w-[32px] h-[16px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${includeMetadata ? "bg-BrandOrange" : "bg-BrandGray"
                  }`}
                aria-label="Toggle include metadata"
              >
                <span
                  className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 w-[12px] h-[12px] bg-BrandBlack rounded-full shadow-sm ${includeMetadata ? "translate-x-[18px]" : "translate-x-[3px]"
                    }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Play on Load */}
        <div className="flex flex-col items-start justify-start gap-1 sm:gap-1.5">
          <div className="flex items-center justify-between w-full gap-2">
            <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Play on Load</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPlayOnLoad(!playOnLoad);
              }}
              className={`relative w-[32px] h-[16px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${playOnLoad ? "bg-BrandOrange" : "bg-BrandGray"
                }`}
              aria-label="Toggle play on load"
            >
              <span
                className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 w-[12px] h-[12px] bg-BrandBlack rounded-full shadow-sm ${playOnLoad ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
              />
            </button>
          </div>
        </div>
      </aside>

      <button
        className="absolute left-[-45px] top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-BrandBlack border-[0.5px] border-BrandGray rounded-full z-50 shadow-lg flex items-center justify-center cursor-pointer hover:bg-BrandBlack2 transition-colors duration-200 hover:border-BrandOrange"
        onClick={onClose}
      >
        <FaTimes className="text-BrandOrange text-xs sm:text-sm" />
      </button>
    </div>
  );
}
