import React, { useEffect, useRef } from "react";

// Generic Popover component
export const Popover = ({ isOpen, onClose, children, anchorRef, topOffset = "top-0", position = "right", marginRight }) => {
    const popoverRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        const handleClickOutside = (e) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(e.target) &&
                anchorRef &&
                !anchorRef.current?.contains(e.target)
            ) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose, anchorRef]);

    if (!isOpen) return null;

    // Map margin values to Tailwind classes
    const marginMap = {
        2: position === "left" ? "mr-2" : "ml-2",
        4: position === "left" ? "mr-4" : "ml-4",
        6: position === "left" ? "mr-6" : "ml-6",
        8: position === "left" ? "mr-8" : "ml-8",
        10: position === "left" ? "mr-10" : "ml-10",
        12: position === "left" ? "mr-12" : "ml-12",
    };

    // Determine margin class based on position and custom marginRight prop
    const marginClass = marginRight !== undefined
        ? (marginMap[marginRight] || (position === "left" ? "mr-2" : "ml-2"))
        : (position === "left" ? "mr-2" : "ml-2");

    const positionClass = position === "left" ? "right-full" : "left-full";

    return (
        <div
            ref={popoverRef}
            className={`absolute ${positionClass} ${marginClass} ${topOffset} z-50`}
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>
    );
};

// Popover layout: Grid for option tiles
export const PopoverGrid = ({ cols = 2, children }) => {
    const gridCols = {
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4",
    };

    return (
        <div
            className={`
                bg-BrandBlack  ml-2 rounded-md p-2
                grid ${gridCols[cols] || gridCols[2]} gap-2
                min-w-[120px] shadow-lg 
                font-DmSans
            `}
        >
            {children}
        </div>
    );
};

// Popover layout: List for future lists
export const PopoverList = ({ children }) => {
    return (
        <div
            className="
                bg-BrandBlack2  ml-2 rounded-md p-2
                flex flex-col gap-1 min-w-[150px] shadow-lg
                font-DmSans
            "
        >
            {children}
        </div>
    );
};

// Popover layout: Form for forms like Add Player
export const PopoverForm = ({ children }) => {
    return (
        <div
            className="
                bg-BrandBlack2  ml-2 rounded-md p-3 sm:p-4
                flex flex-col gap-1.5 sm:gap-2
                w-[150px] sm:w-[150px] md:w-[150px] lg:w-[175px] xl:w-[200px]
                shadow-lg
                font-DmSans
            "
        >
            {children}
        </div>
    );
};

// Tooltip component for hover tooltips
export const Tooltip = ({ children, text, isOpen }) => {
    if (!isOpen) return null;

    return (
        <div
            className="
                absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50
                bg-BrandBlack2 rounded-md px-2 py-1.5
                text-BrandWhite text-xs font-DmSans
                whitespace-nowrap shadow-lg
                border border-BrandGray/30
                pointer-events-none
            "
        >
            {text}
            {children}
        </div>
    );
};
