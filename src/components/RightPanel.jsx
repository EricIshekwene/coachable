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
export default function RightPanel() {
    const iconClass = "text-BrandOrange text-sm sm:text-base md:text-lg lg:text-xl";
    const [playName, setPlayName] = useState("Twister");
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef(null);

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

            <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-0.5 sm:gap-1">
                <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">
                    Field Settings
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 mt-1 sm:mt-1.5 md:mt-2">

                    <PanelButton Icon={<FiRotateCcw className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                    <PanelButton Icon={<TbRotateDot className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                    <PanelButton Icon={<FiRotateCw className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />

                    <PanelButton Icon={<MdOutlineZoomOut className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                    <p className="text-BrandWhite text-xs sm:text-sm md:text-base m-auto font-DmSans">100%</p>
                    <PanelButton Icon={<MdOutlineZoomIn className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />

                    <PanelButton Icon={<BiUndo className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                    <PanelButton Icon={<MdOutlineResetTv className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                    <PanelButton Icon={<BiRedo className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />

                </div>

            </div>


            {/*Players*/}
            <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-0.5 sm:gap-1">
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
            <div className="flex flex-col border-b border-BrandGray2 pb-1.5 sm:pb-2 items-start justify-center gap-0.5 sm:gap-1">
                <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">
                    All Players (0)
                </div>
                {/* size */}
                <div className="flex flex-row w-full items-center justify-between">
                    <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Size: 100%</p>
                    <div className="flex flex-row items-center justify-between bg-BrandBlack2 border-[0.5px] border-BrandGray2 aspect-[2/1] w-2/7 rounded-md">
                        <button className="text-BrandOrange font-bold m-auto text-xs sm:text-sm md:text-base">
                            +
                        </button>
                        <button className="text-BrandOrange font-bold m-auto text-xs sm:text-sm md:text-base">
                            -
                        </button>
                    </div>
                </div>
                {/* color */}
                <div className="flex flex-col w-full items-start justify-between">
                    <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans">Color:</p>
                    <div className="w-full flex flex-row bg-BrandBlack2 border-[0.5px] border-BrandGray2 rounded-md items-center justify-between py-0.5 sm:py-1 px-1 sm:px-1.5">
                        <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 aspect-square rounded-full bg-BrandRed"></div>
                        <div className="w-full flex flex-row items-center justify-between">
                            <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> #000000</p>
                            <button className="text-BrandOrange font-bold m-auto">
                                <FiEdit className="text-BrandOrange text-xs sm:text-sm" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* show number */}
                <div className="flex flex-row w-full items-center justify-between">
                    <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Show Number:</p>
                    <input type="checkbox" className="text-BrandOrange text-xs sm:text-sm font-DmSans w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                </div>

                {/* show name */}
                <div className="flex flex-row w-full items-center justify-between">
                    <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Show Name:</p>
                    <input type="checkbox" className="text-BrandOrange text-xs sm:text-sm font-DmSans w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                </div>
            </div>
            {/* Save to Playbook */}
            <div className="w-full flex flex-col justify-center items-center ">
                <div className="w-full flex flex-row justify-evenly items-center bg-BrandOrange text-BrandBlack font-bold text-[10px] sm:text-xs md:text-sm font-DmSans rounded-md py-0.5 sm:py-1">
                    <CiBookmarkPlus className="text-BrandBlack text-sm sm:text-base md:text-lg" />
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