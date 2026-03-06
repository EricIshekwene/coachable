import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from "react-icons/fa";
import { Slider } from '@mui/material';

const FIELD_TYPE_OPTIONS = ["Rugby", "Soccer", "Football"];
const PITCH_SIZE_OPTIONS = ["Full Field", "Half Pitch", "Goal", "Quarter Field"];

const PITCH_COLOR_OPTIONS = [
    { name: "Fresh Turf Green", hex: "#4FA85D" },
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

export default function PitchSettingsSection({ value = {}, onChange }) {
    const fieldType = value.fieldType ?? "Rugby";
    const fieldOpacity = value.fieldOpacity ?? 100;
    const showMarkings = value.showMarkings ?? true;
    const pitchSize = value.pitchSize ?? "Full Field";
    const pitchColor = value.pitchColor ?? "#4FA85D";

    const [openFieldTypeDropdown, setOpenFieldTypeDropdown] = useState(false);
    const [openPitchColorDropdown, setOpenPitchColorDropdown] = useState(false);
    const [openPitchSizeDropdown, setOpenPitchSizeDropdown] = useState(false);
    const fieldTypeRef = useRef(null);
    const pitchColorRef = useRef(null);
    const pitchSizeRef = useRef(null);

    const selectedPitchColorName =
        PITCH_COLOR_OPTIONS.find((c) => c.hex.toLowerCase() === String(pitchColor).toLowerCase())?.name ?? "Custom";

    const update = (patch) => onChange?.({ ...value, ...patch });

    // Close field type dropdown when clicking outside
    useEffect(() => {
        if (!openFieldTypeDropdown) return;

        const handleClickOutside = (e) => {
            if (fieldTypeRef.current && !fieldTypeRef.current.contains(e.target)) {
                setOpenFieldTypeDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openFieldTypeDropdown]);

    // Close pitch color dropdown when clicking outside
    useEffect(() => {
        if (!openPitchColorDropdown) return;

        const handleClickOutside = (e) => {
            if (pitchColorRef.current && !pitchColorRef.current.contains(e.target)) {
                setOpenPitchColorDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
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

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openPitchSizeDropdown]);

    return (
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
                            update({ showMarkings: !showMarkings });
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

            {/* Field Opacity */}
            <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5">
                <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Field Opacity (%)</p>
                <div className="w-full px-1 flex flex-row gap-1 justify-between">
                    <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={fieldOpacity}
                        onChange={(_, newValue) => update({ fieldOpacity: Array.isArray(newValue) ? newValue[0] : newValue })}
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
                    <div className="flex flex-row bg-BrandBlack2 h-5 sm:h-6 w-14 items-center justify-center px-2 rounded-md">
                        <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">{fieldOpacity}%</p>
                    </div>
                </div>
            </div>

            {/* Field Type */}
            <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5 relative">
                <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Field Type</p>
                <div
                    ref={fieldTypeRef}
                    className="relative w-full"
                >
                    <div
                        onClick={() => setOpenFieldTypeDropdown(!openFieldTypeDropdown)}
                        className="bg-BrandBlack2 h-5 sm:h-6 w-full flex flex-row items-center justify-between px-2 rounded-md cursor-pointer"
                    >
                        <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">{fieldType}</p>
                        <FaChevronDown className={`text-BrandOrange text-xs transition-transform ${openFieldTypeDropdown ? 'rotate-180' : ''}`} />
                    </div>
                    {openFieldTypeDropdown && (
                        <div className="absolute left-0 top-full w-full bg-BrandBlack2 border border-BrandGray rounded-md mt-1 max-h-40 overflow-y-auto z-10 shadow-lg">
                            {FIELD_TYPE_OPTIONS.map((type, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        update({ fieldType: type });
                                        setOpenFieldTypeDropdown(false);
                                    }}
                                    className={`px-2 py-1 text-xs sm:text-sm font-DmSans cursor-pointer transition-colors ${fieldType === type
                                        ? 'bg-BrandOrange text-BrandBlack'
                                        : 'text-BrandWhite hover:bg-BrandBlack'
                                        }`}
                                >
                                    {type}
                                </div>
                            ))}
                        </div>
                    )}
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
                            {PITCH_SIZE_OPTIONS.map((size, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        update({ pitchSize: size });
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
                                style={{ backgroundColor: pitchColor }}
                            />
                            <p className="text-BrandWhite text-xs sm:text-sm font-DmSans truncate">{selectedPitchColorName}</p>
                        </div>
                        <FaChevronDown className={`text-BrandOrange text-xs transition-transform shrink-0 ${openPitchColorDropdown ? 'rotate-180' : ''}`} />
                    </div>
                    {openPitchColorDropdown && (
                        <div className="absolute left-0 top-full w-full bg-BrandBlack2 border border-BrandGray rounded-md mt-1 max-h-60 overflow-y-auto z-10 shadow-lg">
                            {PITCH_COLOR_OPTIONS.map((color, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        update({ pitchColor: color.hex });
                                        setOpenPitchColorDropdown(false);
                                    }}
                                    className={`px-2 py-1.5 text-xs sm:text-sm font-DmSans cursor-pointer transition-colors flex items-center gap-2 ${pitchColor === color.hex
                                        ? 'bg-BrandOrange text-BrandBlack'
                                        : 'text-BrandWhite hover:bg-BrandBlack'
                                        }`}
                                >
                                    <div
                                        className="w-3 h-3 sm:w-4 sm:h-4 rounded border border-BrandGray shrink-0"
                                        style={{ backgroundColor: color.hex }}
                                    />
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="truncate">{color.name}</span>
                                        <span className={`text-[10px] ${pitchColor === color.hex ? 'text-BrandBlack/70' : 'text-BrandGray'}`}>{color.hex}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Input below pitch color */}
                <input
                    type="text"
                    value={pitchColor}
                    onChange={(e) => {
                        update({ pitchColor: e.target.value });
                    }}
                    className="w-full h-6 sm:h-7 bg-BrandBlack2 border border-BrandGray text-BrandWhite rounded-md px-2 text-xs sm:text-sm font-DmSans focus:outline-none focus:border-BrandOrange transition-colors"
                    placeholder="#4FA85D"
                />
            </div>
        </div>
    );
}
