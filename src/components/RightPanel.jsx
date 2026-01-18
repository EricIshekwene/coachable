import React, { useState, useRef, useEffect } from 'react';
import { FiEdit } from "react-icons/fi";
import { BiUndo, BiRedo } from "react-icons/bi";
import { PanelButton, PlayerButton } from "./subcomponents/Buttons.jsx";
import { MdOutlineResetTv } from "react-icons/md";
import { MdOutlineZoomIn, MdOutlineZoomOut } from "react-icons/md";
import { FiRotateCcw, FiRotateCw } from "react-icons/fi";
import { TbRotateDot } from "react-icons/tb";
import { IoSettingsOutline } from "react-icons/io5";
import { CiBookmarkPlus } from "react-icons/ci";
import { IoMdDownload } from "react-icons/io";
import { ImCheckboxUnchecked } from "react-icons/im";
import { ImCheckboxChecked } from "react-icons/im";
import { BsBookmarkPlus } from "react-icons/bs";
import { Popover } from "./subcomponents/Popovers";
import { ColorPickerPopover } from "./subcomponents/ColorPickerPopover";
export default function RightPanel() {
    const iconClass = "text-BrandOrange text-sm sm:text-base md:text-lg lg:text-xl";
    const [playName, setPlayName] = useState("Twister");
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef(null);
    const [hoveredTooltip, setHoveredTooltip] = useState(null);
    const [zoomPercentage, setZoomPercentage] = useState(100);
    const [isEditingZoom, setIsEditingZoom] = useState(false);
    const zoomInputRef = useRef(null);
    const [showNumber, setShowNumber] = useState(false);
    const [showName, setShowName] = useState(false);
    const [playerSize, setPlayerSize] = useState(100);
    const [playerColor, setPlayerColor] = useState("#ef4444");
    const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
    const [isEditingHex, setIsEditingHex] = useState(false);
    const [hexValue, setHexValue] = useState("#ef4444");
    const colorEditButtonRef = useRef(null);
    const hexInputRef = useRef(null);

    // Focus input when editing mode is enabled
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Handle enabling edit mode (only if name is <= 10 characters)
    const handleEnableEdit = () => {
        if (playName.length <= 10) {
            setIsEditing(true);
        }
    };

    // Handle saving the name
    const handleSaveName = () => {
        setIsEditing(false);
    };

    // Handle input change (limit to 10 characters)
    const handleNameChange = (e) => {
        const value = e.target.value;
        if (value.length <= 10) {
            setPlayName(value);
        }
    };

    // Handle key press (Enter to save, Escape to cancel)
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSaveName();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            // Reset to original value if needed
        }
    };

    // Focus zoom input when editing mode is enabled
    useEffect(() => {
        if (isEditingZoom && zoomInputRef.current) {
            zoomInputRef.current.focus();
            zoomInputRef.current.select();
        }
    }, [isEditingZoom]);

    // Handle zoom percentage change (numbers only, validation on save)
    const handleZoomChange = (e) => {
        const value = e.target.value;
        // Only allow numbers (or empty for editing)
        if (value === '' || /^\d+$/.test(value)) {
            if (value === '') {
                setZoomPercentage(0); // Allow empty for editing
            } else {
                const numValue = parseInt(value);
                setZoomPercentage(numValue); // Allow any number while typing
            }
        }
    };

    // Handle saving zoom percentage (validate and clamp to 30-100)
    const handleSaveZoom = () => {
        // Ensure value is within range when saving
        if (zoomPercentage === 0 || zoomPercentage < 30) {
            setZoomPercentage(30);
        } else if (zoomPercentage > 100) {
            setZoomPercentage(100);
        }
        setIsEditingZoom(false);
    };

    // Handle key press for zoom input (Enter to save, Escape to cancel)
    const handleZoomKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSaveZoom();
        } else if (e.key === 'Escape') {
            setIsEditingZoom(false);
            setZoomPercentage(100); // Reset to default
        }
    };

    // Handle zoom in (add 5, max 100)
    const handleZoomIn = () => {
        const newZoom = Math.min(zoomPercentage + 5, 100);
        setZoomPercentage(newZoom);
    };

    // Handle zoom out (subtract 5, min 30)
    const handleZoomOut = () => {
        const newZoom = Math.max(zoomPercentage - 5, 30);
        setZoomPercentage(newZoom);
    };

    // Sync hexValue with playerColor when color changes from picker
    useEffect(() => {
        setHexValue(playerColor);
    }, [playerColor]);

    // Handle hex color input change
    const handleHexChange = (e) => {
        const value = e.target.value;
        setHexValue(value);
    };

    // Handle hex color save (validate and apply)
    const handleHexSave = () => {
        // Validate hex color format
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (hexRegex.test(hexValue)) {
            setPlayerColor(hexValue);
        } else {
            // Reset to current color if invalid
            setHexValue(playerColor);
        }
        setIsEditingHex(false);
    };

    // Handle hex input key press
    const handleHexKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleHexSave();
        } else if (e.key === 'Escape') {
            setHexValue(playerColor);
            setIsEditingHex(false);
        }
    };

    // Focus hex input when editing
    useEffect(() => {
        if (isEditingHex && hexInputRef.current) {
            hexInputRef.current.focus();
            hexInputRef.current.select();
        }
    }, [isEditingHex]);

    return (
        <aside
            className="
                     h-screen shrink-0 bg-BrandBlack
                     w-28 sm:w-32 md:w-36 lg:w-40 xl:w-44
                     px-2 sm:px-2.5 md:px-3 py-2 sm:py-2.5 md:py-3
                     flex flex-col
                     gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2

                   "
        >
            {/* name */}
            <div className="flex flex-row border-b border-BrandGray2 pb-1.5 sm:pb-2 items-center justify-center gap-1.5 sm:gap-2 font-DmSans font-bold">
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={playName}
                        onChange={handleNameChange}
                        onBlur={handleSaveName}
                        onKeyDown={handleKeyDown}
                        className="text-BrandWhite text-lg sm:text-xl md:text-2xl bg-transparent border-none outline-none focus:outline-none text-center font-DmSans font-bold w-full max-w-[100px] sm:max-w-[110px] md:max-w-[120px]"
                        maxLength={10}
                    />
                ) : (
                    <div
                        className="text-BrandWhite text-lg sm:text-xl md:text-2xl cursor-pointer"
                        onClick={handleEnableEdit}
                    >
                        {playName}
                    </div>
                )}
                <FiEdit
                    className={`text-xs sm:text-sm cursor-pointer transition-colors ${playName.length > 10 ? 'text-BrandGray cursor-not-allowed' : 'text-BrandWhite hover:text-BrandOrange'}`}
                    onClick={handleEnableEdit}
                />
            </div>



            {/* Field Setting */}

            <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center ">
                <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">
                    Field Settings
                </div>
                <div className="w-full  grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 mt-1 sm:mt-1.5 md:mt-2">

                    {/* Rotate Counter-Clockwise */}
                    <div
                        className="relative"
                        onMouseEnter={() => setHoveredTooltip("rotateCCW")}
                        onMouseLeave={() => setHoveredTooltip(null)}
                    >
                        <PanelButton Icon={<FiRotateCcw className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                        {hoveredTooltip === "rotateCCW" && (
                            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                                Rotate Left
                            </div>
                        )}
                    </div>

                    {/* Rotate (Center) */}
                    <div
                        className="relative"
                        onMouseEnter={() => setHoveredTooltip("rotate")}
                        onMouseLeave={() => setHoveredTooltip(null)}
                    >
                        <PanelButton Icon={<TbRotateDot className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                        {hoveredTooltip === "rotate" && (
                            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                                Rotate
                            </div>
                        )}
                    </div>

                    {/* Rotate Clockwise */}
                    <div
                        className="relative"
                        onMouseEnter={() => setHoveredTooltip("rotateCW")}
                        onMouseLeave={() => setHoveredTooltip(null)}
                    >
                        <PanelButton Icon={<FiRotateCw className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                        {hoveredTooltip === "rotateCW" && (
                            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                                Rotate Right
                            </div>
                        )}
                    </div>

                    {/* Zoom Out */}
                    <div
                        className="relative"
                        onMouseEnter={() => setHoveredTooltip("zoomOut")}
                        onMouseLeave={() => setHoveredTooltip(null)}
                    >
                        <PanelButton Icon={<MdOutlineZoomOut className={iconClass} />} onHover={() => { }} onClick={handleZoomOut} isSelected={false} />
                        {hoveredTooltip === "zoomOut" && (
                            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                                Zoom Out
                            </div>
                        )}
                    </div>

                    {/* Zoom Percentage (Editable) */}
                    <div className="flex items-center justify-center m-auto">
                        {isEditingZoom ? (
                            <input
                                ref={zoomInputRef}
                                type="text"
                                value={zoomPercentage || ''}
                                onChange={handleZoomChange}
                                onBlur={handleSaveZoom}
                                onKeyDown={handleZoomKeyDown}
                                className="text-BrandWhite text-xs sm:text-sm md:text-base bg-transparent border-none outline-none focus:outline-none text-center font-DmSans w-10 sm:w-12"
                                maxLength={3}
                            />
                        ) : (
                            <p
                                className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans cursor-pointer"
                                onClick={() => setIsEditingZoom(true)}
                            >
                                {zoomPercentage}%
                            </p>
                        )}
                    </div>

                    {/* Zoom In */}
                    <div
                        className="relative"
                        onMouseEnter={() => setHoveredTooltip("zoomIn")}
                        onMouseLeave={() => setHoveredTooltip(null)}
                    >
                        <PanelButton Icon={<MdOutlineZoomIn className={iconClass} />} onHover={() => { }} onClick={handleZoomIn} isSelected={false} />
                        {hoveredTooltip === "zoomIn" && (
                            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                                Zoom In
                            </div>
                        )}
                    </div>

                    {/* Undo */}
                    <div
                        className="relative"
                        onMouseEnter={() => setHoveredTooltip("undo")}
                        onMouseLeave={() => setHoveredTooltip(null)}
                    >
                        <PanelButton Icon={<BiUndo className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                        {hoveredTooltip === "undo" && (
                            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                                Undo
                            </div>
                        )}
                    </div>

                    {/* Reset */}
                    <div
                        className="relative"
                        onMouseEnter={() => setHoveredTooltip("reset")}
                        onMouseLeave={() => setHoveredTooltip(null)}
                    >
                        <PanelButton Icon={<MdOutlineResetTv className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                        {hoveredTooltip === "reset" && (
                            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                                Reset
                            </div>
                        )}
                    </div>

                    {/* Redo */}
                    <div
                        className="relative"
                        onMouseEnter={() => setHoveredTooltip("redo")}
                        onMouseLeave={() => setHoveredTooltip(null)}
                    >
                        <PanelButton Icon={<BiRedo className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                        {hoveredTooltip === "redo" && (
                            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                                Redo
                            </div>
                        )}
                    </div>

                </div>

            </div>


            {/*Players*/}
            <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center ">
                <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">
                    Players (0)
                </div>
                <div className="flex flex-col w-full items-start justify-start gap-0.5 sm:gap-1 mt-1 sm:mt-1.5 md:mt-2">

                    <PlayerButton onClick={() => { }} isSelected={false} />
                    <PlayerButton onClick={() => { }} isSelected={false} />
                    <PlayerButton onClick={() => { }} isSelected={false} />
                    <PlayerButton onClick={() => { }} isSelected={false} />

                </div>



            </div>
            {/* Advanced Settings */}
            <div className="w-full py-1 sm:py-1.5 md:py-2 border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4">
                <div className="w-full flex flex-row border-[0.5px] border-BrandGray2 justify-evenly bg-BrandBlack2 py-1.5 sm:py-2 px-2 sm:px-2.5 md:px-3 rounded-md items-center gap-0.5 sm:gap-1">
                    <IoSettingsOutline className="text-BrandWhite text-sm sm:text-base md:text-lg" />
                    <p className="text-BrandWhite text-[10px] sm:text-xs font-bold font-DmSans">
                        Advanced Settings
                    </p>
                </div>
            </div>

            {/* ALl players */}
            <div className="flex flex-col border-b border-BrandGray2 pb-1.5 sm:pb-2 items-start justify-center gap-0.5 ">
                <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">
                    All Players (0)
                </div>
                {/* size */}
                <div className="flex flex-row w-full items-center justify-between">
                    <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Size: {playerSize}%</p>
                    <div className="flex flex-row items-center justify-between bg-BrandBlack2 border-[0.5px] border-BrandGray2 aspect-[2/1] w-2/7 rounded-md">
                        <button
                            onClick={() => setPlayerSize(playerSize + 5)}
                            className="text-BrandOrange font-bold m-auto text-xs sm:text-sm md:text-base hover:text-BrandOrange/80 transition-colors"
                        >
                            +
                        </button>
                        <button
                            onClick={() => setPlayerSize(Math.max(5, playerSize - 5))}
                            className="text-BrandOrange font-bold m-auto text-xs sm:text-sm md:text-base hover:text-BrandOrange/80 transition-colors"
                        >
                            -
                        </button>
                    </div>
                </div>
                {/* color */}
                <div className="flex flex-col w-full items-start justify-between gap-0.5 sm:gap-1 relative">
                    <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans">Color:</p>
                    <div className="w-full flex flex-row bg-BrandBlack2 border-[0.5px] border-BrandGray2 rounded-md items-center justify-between py-0.5 sm:py-1 px-1.5 sm:px-2 gap-1.5 sm:gap-2">
                        {/* Color circle */}
                        <div
                            className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 aspect-square rounded-full border-[0.5px] border-BrandGray shrink-0"
                            style={{ backgroundColor: playerColor }}
                        ></div>
                        {/* Hex color text - editable */}
                        {isEditingHex ? (
                            <input
                                ref={hexInputRef}
                                type="text"
                                value={hexValue}
                                onChange={handleHexChange}
                                onBlur={handleHexSave}
                                onKeyDown={handleHexKeyDown}
                                className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans flex-1 bg-transparent border-none outline-none focus:outline-none"
                                maxLength={7}
                            />
                        ) : (
                            <p
                                onClick={() => setIsEditingHex(true)}
                                className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans flex-1 cursor-pointer"
                            >
                                {playerColor.toUpperCase()}
                            </p>
                        )}
                        {/* Edit button */}
                        <button
                            ref={colorEditButtonRef}
                            onClick={() => setColorPopoverOpen(!colorPopoverOpen)}
                            className="text-BrandOrange hover:text-BrandOrange/80 transition-colors shrink-0"
                        >
                            <FiEdit className="text-BrandOrange text-xs sm:text-sm" />
                        </button>
                    </div>
                    {/* Color Picker Popover */}
                    <Popover
                        isOpen={colorPopoverOpen}
                        onClose={() => setColorPopoverOpen(false)}
                        anchorRef={colorEditButtonRef}
                        position="left"
                        topOffset="top-40 -translate-y-full -mt-2"
                        marginRight={6}
                    >
                        <ColorPickerPopover
                            color={playerColor}
                            onChange={(color) => {
                                setPlayerColor(color.hex);
                            }}
                        />
                    </Popover>
                </div>

                {/* show number */}
                <div className="flex flex-row w-full items-center justify-between">
                    <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Show Number:</p>
                    <button
                        onClick={() => setShowNumber(!showNumber)}
                        className="focus:outline-none cursor-pointer"
                    >
                        {showNumber ? (
                            <ImCheckboxChecked className="text-BrandOrange w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                        ) : (
                            <ImCheckboxUnchecked className="text-BrandGray2 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                        )}
                    </button>
                </div>

                {/* show name */}
                <div className="flex flex-row w-full items-center justify-between">
                    <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Show Name:</p>
                    <button
                        onClick={() => setShowName(!showName)}
                        className="focus:outline-none cursor-pointer"
                    >
                        {showName ? (
                            <ImCheckboxChecked className="text-BrandOrange w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                        ) : (
                            <ImCheckboxUnchecked className="text-BrandGray2 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                        )}
                    </button>
                </div>
            </div>
            {/* Save to Playbook */}
            <div className="w-full flex flex-col justify-center items-center ">
                <div className="w-full flex flex-row justify-evenly items-center bg-BrandOrange text-BrandBlack font-bold text-[10px] sm:text-xs md:text-sm font-DmSans rounded-md py-0.5 sm:py-1">
                    <BsBookmarkPlus className="text-BrandBlack text-sm sm:text-base md:text-lg" />
                    <p className="text-BrandBlack text-[10px] sm:text-xs md:text-sm font-DmSans">Save to Playbook</p>
                </div>
            </div>
            {/* Download */}
            <div className="w-full flex flex-col justify-center items-center ">
                <div className="w-full flex flex-row justify-evenly items-center bg-BrandOrange text-BrandBlack font-bold text-[10px] sm:text-xs md:text-sm font-DmSans rounded-md py-0.5 sm:py-1">
                    <IoMdDownload className="text-BrandBlack text-sm sm:text-base md:text-lg" />
                    <p className="text-BrandBlack text-[10px] sm:text-xs md:text-sm font-DmSans">Download</p>
                </div>
            </div>
        </aside>
    );
}