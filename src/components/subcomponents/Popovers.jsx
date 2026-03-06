import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { POPUP_POPOVER_SURFACE_CLASS } from "./popupStyles";

const GAP_PX = 8;

// Parse topOffset string like "top-0" or "top-[-150px]" to pixels
function parseTopOffset(topOffset) {
    if (typeof topOffset === "number") return topOffset;
    if (typeof topOffset !== "string") return 0;
    const match = topOffset.match(/-?\d+/);
    return match ? parseInt(match[0], 10) : 0;
}

/** Generic popover rendered via portal, positioned relative to an anchor. Handles Escape/click-outside to close. */
export const Popover = ({ isOpen, onClose, children, anchorRef, topOffset = "top-0", position = "right", marginRight }) => {
    const popoverRef = useRef(null);
    const [style, setStyle] = useState({ left: 0, top: 0, opacity: 0 });

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

    const updatePosition = () => {
        if (!anchorRef?.current || !popoverRef.current) return;
        const anchorRect = anchorRef.current.getBoundingClientRect();
        const popoverRect = popoverRef.current.getBoundingClientRect();
        const topOffsetPx = parseTopOffset(topOffset);
        const margin = marginRight !== undefined ? marginRight * 4 : GAP_PX;

        let left;
        let top = anchorRect.top + topOffsetPx;

        if (position === "left") {
            left = anchorRect.left - popoverRect.width - margin;
        } else {
            left = anchorRect.right + margin;
        }

        // Keep on screen
        const padding = 8;
        if (left + popoverRect.width > window.innerWidth - padding) {
            left = window.innerWidth - popoverRect.width - padding;
        }
        if (left < padding) {
            left = padding;
        }
        if (top + popoverRect.height > window.innerHeight - padding) {
            top = window.innerHeight - popoverRect.height - padding;
        }
        if (top < padding) {
            top = padding;
        }

        setStyle({ left, top, opacity: 1 });
    };

    useLayoutEffect(() => {
        if (!isOpen) return;
        updatePosition();
    }, [isOpen, anchorRef, topOffset, position, marginRight]);

    // Re-measure when window resizes or anchor moves
    useEffect(() => {
        if (!isOpen) return;
        const raf = requestAnimationFrame(updatePosition);
        window.addEventListener("resize", updatePosition);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", updatePosition);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const popoverContent = (
        <div
            ref={popoverRef}
            className="fixed z-[100]"
            style={style}
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>
    );

    return createPortal(popoverContent, document.body);
};

/** Grid layout wrapper for popover content with configurable columns. */
export const PopoverGrid = ({ cols = 2, children }) => {
    const gridCols = {
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4",
    };

    return (
        <div
            className={`
                ${POPUP_POPOVER_SURFACE_CLASS} ml-2 p-2
                grid ${gridCols[cols] || gridCols[2]} gap-2
                min-w-[120px]
                font-DmSans
            `}
        >
            {children}
        </div>
    );
};

/** Form layout wrapper for popover content (e.g., Add Player form). */
export const PopoverForm = ({ children }) => {
    return (
        <div
            className="
                bg-BrandBlack z-50 ml-2 p-3 sm:p-4
                border border-BrandGray2/80 rounded-lg
                flex flex-col gap-1.5 sm:gap-2
                w-[150px] sm:w-[150px] md:w-[150px] lg:w-[175px] xl:w-[200px]
                shadow-[0_16px_30px_-20px_rgba(0,0,0,0.95)]
                font-DmSans
            "
        >
            {children}
        </div>
    );
};

/** Tooltip that renders beside an element when isOpen is true. */
export const Tooltip = ({ children, text, isOpen }) => {
    if (!isOpen) return null;

    return (
        <div
            className="
                absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50
                bg-BrandBlack z-50 rounded-md px-2 py-1.5
                text-BrandWhite text-xs font-DmSans
                whitespace-nowrap shadow-[0_16px_30px_-20px_rgba(0,0,0,0.95)]
                border border-BrandGray2/70
                pointer-events-none
            "
        >
            {text}
            {children}
        </div>
    );
};
