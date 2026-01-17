import React, { forwardRef } from "react";
import { IoChevronDownOutline } from "react-icons/io5";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";
// Sidebar chevron button component
export const SidebarChevronButton = forwardRef(({
    Icon,
    label,
    onHover,
    onClick,
    onChevronClick,
    isSelected,
    chevronActive = false,
}, ref) => {
    const handleChevronClick = (e) => {
        e.stopPropagation();
        onChevronClick?.();
    };

    const buttonContent = (
        <div className="w-full flex items-center gap-1">
            <button
                className={`
                    w-full aspect-square
                    rounded-md border-[0.5px] border-BrandGray
                    transition-all duration-100
                    flex items-center justify-center
                    ${isSelected ? "bg-BrandOrange" : "bg-BrandBlack2"}
                `}
                onMouseEnter={onHover}
                onClick={onClick}
            >
                {Icon}
            </button>
            <button
                onClick={handleChevronClick}
                className={`
                    shrink-0 transition-colors duration-100
                    ${chevronActive ? "text-BrandOrange" : "text-BrandOrange/60"}
                    hover:text-BrandOrange
                `}
            >
                <IoChevronDownOutline className="text-[10px] sm:text-xs md:text-sm" />
            </button>
        </div>
    );

    if (label) {
        return (
            <div ref={ref} className="w-full flex flex-col items-center gap-1 relative">
                {buttonContent}
                <span className="text-[10px] sm:text-xs text-BrandGray text-center mt-1 leading-none font-DmSans">
                    {label}
                </span>
            </div>
        );
    }

    return (
        <div ref={ref} className="w-full relative">
            {buttonContent}
        </div>
    );
});

SidebarChevronButton.displayName = "SidebarChevronButton";

// Original Button component (kept for backward compatibility)
export const Button = ({ Icon, onHover, onClick, isSelected }) => {
    return (
        <div className="w-full">
            <button
                className={`
             w-full aspect-square
             rounded-md border-[0.5px] border-BrandGray
             transition-all duration-300
             flex items-center justify-center
             ${isSelected ? "bg-BrandOrange " : "bg-BrandBlack2 "}
           `}
                onMouseEnter={onHover}
                onClick={onClick}
            >
                {Icon}
            </button>
        </div>
    );
};

// Original ButtonWithLabel component (kept for backward compatibility)
export const ButtonWithLabel = ({ Icon, label, onHover, onClick, isSelected }) => {
    return (
        <div className="w-full flex flex-col items-center gap-1">
            <button
                className={`
                    w-full aspect-square rounded-md border-[0.5px] border-BrandGray 
                    transition-all duration-300 flex items-center justify-center 
                    ${isSelected ? "bg-BrandOrange " : "bg-BrandBlack2 "}
                `}
                onMouseEnter={onHover}
                onClick={onClick}
            >
                {Icon}
            </button>
            <span className="text-[10px] sm:text-xs text-BrandGray text-center leading-none font-DmSans">
                {label}
            </span>
        </div>
    );
};

// Legacy components (deprecated, kept for compatibility)
export const ButtonWithChevron = ({ Icon, onHover, onClick, isSelected }) => {
    return (
        <div className="w-full flex items-center gap-1">
            <button
                className={`
             w-full aspect-square
             rounded-md border-[0.5px] border-BrandGray
             transition-all duration-100
             flex items-center justify-center
           ${isSelected ? "bg-BrandOrange " : "bg-BrandBlack2 "}
           `}
                onMouseEnter={onHover}
                onClick={onClick}
            >
                {Icon}
            </button>
            <IoChevronDownOutline className="shrink-0 text-BrandOrange text-[10px] sm:text-xs md:text-sm" />
        </div>
    );
};

export const ButtonWithChevronAndLabel = ({ Icon, label, onHover, onClick, isSelected }) => {
    return (
        <div className="w-full flex flex-col items-center gap-1">
            <div className="w-full flex items-center gap-1">
                <button
                    className={`
              w-full aspect-square
              rounded-md border-[0.5px] border-BrandGray
              transition-all duration-300
              flex items-center justify-center
            ${isSelected ? "bg-BrandOrange " : "bg-BrandBlack2 "}
            `}
                    onMouseEnter={onHover}
                    onClick={onClick}
                >
                    {Icon}
                </button>

                <IoChevronDownOutline className="shrink-0 text-BrandOrange text-[10px] sm:text-xs md:text-sm" />
            </div>

            <span className="text-[10px] sm:text-xs text-BrandGray text-center leading-none font-DmSans">
                {label}
            </span>
        </div>
    );
};

//panel button component
export const PanelButton = ({ Icon, onHover, onClick, isSelected = false }) => {
    return (

        <button
            className={`
             w-full aspect-[5/3]
             rounded-md border-[0.5px] border-BrandGray
             transition-all duration-300
             flex items-center justify-center p-1
             ${isSelected ? "bg-BrandOrange " : "bg-BrandBlack2 "}
           `}
            onMouseEnter={onHover}
            onClick={onClick}
        >
            {Icon}
        </button>

    );
};

export const PlayerButton = ({ onClick, isSelected = false, }) => {
    return (
        <div className="w-full flex flex-row rounded sm bg-BrandBlack2 items-center justify-between px-1 py-0.5 sm:py-1">
            {/*Player icons*/}
            <div className="w-3 h-3 sm:w-[14px] sm:h-[14px] md:w-4 md:h-4 rounded-full bg-red-500 border-[0.25px] border-BrandBlack">

            </div>
            {/*Player name*/}
            <p className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">
                Player 1
            </p>
            {/*Icons*/}
            <div className="flex flex-row justify-center items-center gap-0.5 sm:gap-1">
                <button className="text-BrandOrange text-xs sm:text-sm md:text-base" >
                    <FiEdit />
                </button>
                <button className="text-BrandOrange text-xs sm:text-sm md:text-base" >
                    <MdDeleteOutline />
                </button>
            </div>

        </div>
    );
};