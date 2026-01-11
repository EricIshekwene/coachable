import React, { useEffect, useRef } from "react";

// Generic Popover component
export const Popover = ({ isOpen, onClose, children, anchorRef, topOffset = "top-0" }) => {
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

    return (
        <div
            ref={popoverRef}
            className={`absolute left-full ml-2 ${topOffset} z-50`}
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
            "
        >
            {children}
        </div>
    );
};
