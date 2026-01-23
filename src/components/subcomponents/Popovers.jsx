import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Generic Popover component
export const Popover = ({ isOpen, onClose, children, anchorRef, topOffset = "top-0", position = "right", marginRight, offsetY = 0, offsetX }) => {
    const popoverRef = useRef(null);
    const [style, setStyle] = useState(null);

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

    useEffect(() => {
        if (!isOpen) return undefined;

        const updatePosition = () => {
            if (!anchorRef?.current) return;
            const rect = anchorRef.current.getBoundingClientRect();
            const spacing = offsetX ?? (marginRight ? marginRight * 4 : 8);
            const top = rect.top + rect.height / 2 + offsetY;
            const left = position === "left" ? rect.left - spacing : rect.right + spacing;
            const transform = position === "left" ? "translate(-100%, -50%)" : "translate(0, -50%)";
            setStyle({ top, left, transform });
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);

        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [isOpen, anchorRef, position, marginRight, offsetX, offsetY]);

    if (!isOpen) return null;

    const content = (
        <div
            ref={popoverRef}
            className={`fixed z-50 ${topOffset}`}
            style={style}
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>
    );

    return createPortal(content, document.body);
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
