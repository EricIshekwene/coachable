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

// Wide sidebar row: icon + label in a row (same width as RightPanel)
export const WideSidebarRowButton = forwardRef(({
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

    return (
        <div
            ref={ref}
            className={`
                w-full flex items-center gap-2.5 py-2 px-2 rounded-lg
                transition-colors duration-200
                ${isSelected ? "bg-BrandBlack2" : "hover:bg-BrandBlack2/70"}
            `}
        >
            <button
                className={`
                    shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center
                    transition-all duration-200
                    ${isSelected
                        ? "bg-BrandOrange border-BrandOrange text-BrandBlack"
                        : "border-BrandGray2 bg-BrandBlack2 hover:border-BrandGray hover:bg-BrandBlack2/90 text-BrandOrange"
                    }
                `}
                onMouseEnter={onHover}
                onClick={onClick}
            >
                {Icon}
            </button>
            <span
                className={`
                    flex-1 min-w-0 text-xs sm:text-sm font-DmSans truncate transition-colors duration-200
                    ${isSelected ? "text-BrandWhite font-medium" : "text-BrandGray hover:text-BrandWhite"}
                `}
            >
                {label}
            </span>
            {onChevronClick != null && (
                <button
                    onClick={handleChevronClick}
                    className={`
                        shrink-0 p-0.5 rounded transition-colors duration-200
                        ${chevronActive ? "text-BrandOrange" : "text-BrandGray2 hover:text-BrandOrange"}
                    `}
                >
                    <IoChevronDownOutline className="text-sm" />
                </button>
            )}
        </div>
    );
});

WideSidebarRowButton.displayName = "WideSidebarRowButton";

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

export const PlayerButton = ({
    id,
    color = "#ef4444",
    number,
    name,
    assignment,
    onClick,
    onEdit,
    onDelete,
    isSelected = false,
}) => {
    const hasMeta = Boolean(name) || Boolean(assignment);
    return (
        <button
            type="button"
            onClick={() => onClick?.(id)}
            className={`w-full flex flex-row rounded sm items-center justify-between px-1 py-0.5 sm:py-1 transition-colors
                ${isSelected ? "bg-BrandBlack border border-BrandOrange" : "bg-BrandBlack2 border border-transparent"}
                hover:bg-BrandBlack`}
        >
            {/* Color indicator */}
            <div
                className="w-3 h-3 sm:w-[14px] sm:h-[14px] md:w-4 md:h-4 rounded-full border-[0.25px] border-BrandBlack shrink-0"
                style={{ backgroundColor: color }}
            />

            {/* Number + optional label/assignment */}
            <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-1">
                <p className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans leading-none">
                    {number ?? ""}
                </p>
                {hasMeta && (
                    <p className="text-BrandGray text-[9px] sm:text-[10px] md:text-xs font-DmSans leading-none truncate w-full text-center">
                        {[name, assignment].filter(Boolean).join(" • ")}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-row justify-center items-center gap-0.5 sm:gap-1 shrink-0">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(id);
                    }}
                    className="text-BrandOrange text-xs sm:text-sm md:text-base"
                    aria-label="Edit player"
                >
                    <FiEdit />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(id);
                    }}
                    className="text-BrandOrange text-xs sm:text-sm md:text-base"
                    aria-label="Delete player"
                >
                    <MdDeleteOutline />
                </button>
            </div>
        </button>
    );
};