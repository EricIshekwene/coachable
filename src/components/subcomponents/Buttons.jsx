import React, { forwardRef } from "react";
import { IoChevronDownOutline } from "react-icons/io5";

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
        <div className="w-20 h-10">
            <button
                className={`
              
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