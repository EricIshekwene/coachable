import { createElement } from "react";
import { PiPenNib, PiEraserFill, PiTextTBold, PiCursorFill, PiShapesFill } from "react-icons/pi";
import { FaArrowUpLong } from "react-icons/fa6";

const tools = [
    { id: "select", label: "Select", Icon: PiCursorFill },
    { id: "text", label: "Text", Icon: PiTextTBold, disabled: true },
    { id: "draw", label: "Draw", Icon: PiPenNib, iconStyle: { transform: "rotate(90deg)" } },
    { id: "arrow", label: "Arrow", Icon: FaArrowUpLong, iconStyle: { transform: "rotate(45deg)" } },
    { id: "shape", label: "Shape", Icon: PiShapesFill },
    { id: "erase", label: "Erase", Icon: PiEraserFill },
];

export default function DrawToolsPill({ activeSubTool, onSubToolChange }) {
    return (
        <div
            className="
                absolute top-4 left-1/2 -translate-x-1/2
                flex items-center
                select-none z-50
            "
        >
            <div
                className="
                    flex items-center gap-1 sm:gap-1.5 md:gap-2
                    bg-BrandBlack
                    px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5
                    rounded-full
                "
            >
                {tools.map(({ id, label, Icon, iconStyle, disabled }) => {
                    const isDisabled = Boolean(disabled);
                    const isActive = !isDisabled && activeSubTool === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            disabled={isDisabled}
                            aria-disabled={isDisabled}
                            title={isDisabled ? "Temporarily unavailable" : undefined}
                            onClick={() => {
                                if (isDisabled) return;
                                onSubToolChange?.(id);
                            }}
                            className={`
                                flex flex-col items-center justify-center gap-0.5
                                px-2 sm:px-3 py-1 sm:py-1.5
                                rounded-lg transition-all duration-150
                                ${isDisabled
                                    ? "text-BrandGray opacity-45 cursor-not-allowed"
                                    : isActive
                                    ? "bg-BrandOrange text-BrandBlack"
                                    : "text-BrandOrange hover:bg-BrandBlack2"
                                }
                            `}
                        >
                            {createElement(Icon, {
                                className: "text-lg sm:text-xl md:text-2xl",
                                style: iconStyle,
                            })}
                            <span className="text-[9px] sm:text-[10px] font-DmSans leading-none">
                                {label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
