import React, { useState, useRef, useEffect } from 'react'
import { FaChevronDown, FaTimes } from "react-icons/fa";
import { Slider } from '@mui/material';
import { ColorPickerPopover } from "./subcomponents/ColorPickerPopover";

export default function AdvancedSettings({ onClose }) {
    const [showMarkings, setShowMarkings] = useState(true);
    const [pitchSize, setPitchSize] = useState("Full Field");
    const [pitchColor, setPitchColor] = useState("#7ED321");
    const [playerSize, setPlayerSize] = useState(50);
    const [showNumber, setShowNumber] = useState(true);
    const [showLabel, setShowLabel] = useState(true);
    const [videoQuality, setVideoQuality] = useState("1080p");
    const [openColorPicker, setOpenColorPicker] = useState(false);
    const [openPitchSizeDropdown, setOpenPitchSizeDropdown] = useState(false);
    const [openVideoQualityDropdown, setOpenVideoQualityDropdown] = useState(false);
    const colorPickerRef = useRef(null);
    const pitchSizeRef = useRef(null);
    const videoQualityRef = useRef(null);

    const pitchSizeOptions = ["Full Field", "Half Pitch", "Goal", "Quarter Field"];
    const videoQualityOptions = ["360p", "480p", "720p", "1080p", "1440p", "2160p (4K)"];

    // Close color picker when clicking outside
    useEffect(() => {
        if (!openColorPicker) return;

        const handleClickOutside = (e) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
                setOpenColorPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openColorPicker]);

    // Close pitch size dropdown when clicking outside
    useEffect(() => {
        if (!openPitchSizeDropdown) return;

        const handleClickOutside = (e) => {
            if (pitchSizeRef.current && !pitchSizeRef.current.contains(e.target)) {
                setOpenPitchSizeDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
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

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openVideoQualityDropdown]);

    return (
        <div className="absolute right-0 top-0 h-screen z-40">
            <aside
                className="
                     h-full shrink-0 bg-BrandBlack
                     w-32 sm:w-36 md:w-40 lg:w-44 xl:w-48
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
                                    setShowMarkings(!showMarkings);
                                }}
                                className={`relative w-[32px] h-[16px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${showMarkings ? 'bg-BrandOrange' : 'bg-BrandGray'
                                    }`}
                                aria-label="Toggle show markings"
                            >
                                <span
                                    className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 w-[12px] h-[12px] bg-BrandBlack rounded-full shadow-sm ${showMarkings ? 'translate-x-[18px]' : 'translate-x-[3px]'
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
                                <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">{pitchSize}</p>
                                <FaChevronDown className={`text-BrandOrange text-xs transition-transform ${openPitchSizeDropdown ? 'rotate-180' : ''}`} />
                            </div>
                            {openPitchSizeDropdown && (
                                <div className="absolute left-0 top-full w-full bg-BrandBlack2 border border-BrandGray rounded-md mt-1 max-h-40 overflow-y-auto z-10 shadow-lg">
                                    {pitchSizeOptions.map((size, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setPitchSize(size);
                                                setOpenPitchSizeDropdown(false);
                                            }}
                                            className={`px-2 py-1 text-xs sm:text-sm font-DmSans cursor-pointer transition-colors ${pitchSize === size
                                                ? 'bg-BrandOrange text-BrandBlack'
                                                : 'text-BrandWhite hover:bg-BrandBlack'
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
                            ref={colorPickerRef}
                            className="relative"
                        >
                            <div
                                onClick={() => setOpenColorPicker(!openColorPicker)}
                                className="bg-BrandBlack2 h-5 sm:h-6 w-full flex flex-row items-center justify-between px-2 rounded-md cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 sm:w-4 sm:h-4 rounded border border-BrandGray"
                                        style={{ backgroundColor: pitchColor }}
                                    />
                                    <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">{pitchColor}</p>
                                </div>
                            </div>
                            {openColorPicker && (
                                <div className="absolute left-full ml-2 top-0 z-50">
                                    <ColorPickerPopover
                                        color={pitchColor}
                                        onChange={(color) => {
                                            setPitchColor(color.hex);
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Input below pitch color */}
                        <input
                            type="text"
                            value={pitchColor}
                            onChange={(e) => setPitchColor(e.target.value)}
                            className="w-full h-6 sm:h-7 bg-BrandBlack2 border-[0.5px] border-BrandGray text-BrandWhite rounded-md px-2 text-xs sm:text-sm focus:outline-none focus:border-BrandOrange transition-colors"
                            placeholder="#7ED321"
                        />
                    </div>
                </div>

                {/* Player Settings */}
                <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1 sm:gap-2">
                    <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">
                        Player Settings
                    </div>

                    {/* Default Player Size Slider */}
                    <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5">
                        <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Default Player Size</p>
                        <div className="w-full px-1">
                            <Slider
                                min={0}
                                max={100}
                                step={1}
                                value={playerSize}
                                onChange={(e, newValue) => setPlayerSize(newValue)}
                                className="flex-1"
                                sx={{
                                    color: '#FF7A18',
                                    height: '4px',
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
                                        height: '4px',
                                        border: 'none',
                                    },
                                    '& .MuiSlider-rail': {
                                        backgroundColor: '#75492a',
                                        height: '4px',
                                        opacity: 1,
                                    },
                                }}
                            />
                        </div>
                    </div>

                    {/* Show Number Switch */}
                    <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5">
                        <div className="flex items-center justify-between w-full gap-2">
                            <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Show Number</p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowNumber(!showNumber);
                                }}
                                className={`relative w-[32px] h-[16px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${showNumber ? 'bg-BrandOrange' : 'bg-BrandGray'
                                    }`}
                                aria-label="Toggle show number"
                            >
                                <span
                                    className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 w-[12px] h-[12px] bg-BrandBlack rounded-full shadow-sm ${showNumber ? 'translate-x-[18px]' : 'translate-x-[3px]'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Show Label Switch */}
                    <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5">
                        <div className="flex items-center justify-between w-full gap-2">
                            <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Show Label</p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowLabel(!showLabel);
                                }}
                                className={`relative w-[32px] h-[16px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${showLabel ? 'bg-BrandOrange' : 'bg-BrandGray'
                                    }`}
                                aria-label="Toggle show label"
                            >
                                <span
                                    className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 w-[12px] h-[12px] bg-BrandBlack rounded-full shadow-sm ${showLabel ? 'translate-x-[18px]' : 'translate-x-[3px]'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Video Settings */}
                <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1 sm:gap-2">
                    <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">
                        Video Settings
                    </div>

                    {/* Video Quality Dropdown */}
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
                                <FaChevronDown className={`text-BrandOrange text-xs transition-transform ${openVideoQualityDropdown ? 'rotate-180' : ''}`} />
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
                                                ? 'bg-BrandOrange text-BrandBlack'
                                                : 'text-BrandWhite hover:bg-BrandBlack'
                                                }`}
                                        >
                                            {quality}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>
            {/* close menu */}
            <button
                onClick={() => {
                    onClose?.();
                }}
                className="absolute left-[-45px] top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-BrandBlack border-[0.5px] border-BrandGray rounded-full z-50 shadow-lg flex items-center justify-center cursor-pointer hover:bg-BrandBlack2 transition-colors duration-200 hover:border-BrandOrange"
                aria-label="Close advanced settings"
            >
                <FaTimes className="text-BrandOrange text-sm sm:text-base md:text-lg hover:text-BrandOrange transition-colors" />
            </button>
        </div>
    )
}