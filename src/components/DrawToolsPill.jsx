import { PiPenNib, PiEraserFill, PiTextTBold, PiCursorFill } from "react-icons/pi";
import { FaArrowUpLong } from "react-icons/fa6";

const tools = [
    { id: "select", label: "Select", Icon: PiCursorFill },
    { id: "text", label: "Text", Icon: PiTextTBold },
    { id: "draw", label: "Draw", Icon: PiPenNib, iconStyle: { transform: "rotate(90deg)" } },
    { id: "arrow", label: "Arrow", Icon: FaArrowUpLong, iconStyle: { transform: "rotate(45deg)" } },
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
                {tools.map(({ id, label, Icon, iconStyle }) => {
                    const isActive = activeSubTool === id;
                    return (
                        <button
                            key={id}
                            onClick={() => onSubToolChange?.(id)}
                            className={`
                                flex flex-col items-center justify-center gap-0.5
                                px-2 sm:px-3 py-1 sm:py-1.5
                                rounded-lg transition-all duration-150
                                ${isActive
                                    ? "bg-BrandOrange text-BrandBlack"
                                    : "text-BrandOrange hover:bg-BrandBlack2"
                                }
                            `}
                        >
                            <Icon
                                className="text-lg sm:text-xl md:text-2xl"
                                style={iconStyle}
                            />
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
