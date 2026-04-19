import { createElement } from "react";
import { PiPenNib, PiEraserFill, PiTextTBold, PiCursorFill, PiShapesFill } from "react-icons/pi";
import { FaArrowUpLong } from "react-icons/fa6";
import { FiX } from "react-icons/fi";

const tools = [
    { id: "select", label: "Select", Icon: PiCursorFill },
    { id: "text",   label: "Text",   Icon: PiTextTBold },
    { id: "draw",   label: "Draw",   Icon: PiPenNib, iconStyle: { transform: "rotate(90deg)" } },
    { id: "arrow",  label: "Arrow",  Icon: FaArrowUpLong, iconStyle: { transform: "rotate(45deg)" } },
    { id: "shape",  label: "Shape",  Icon: PiShapesFill },
    { id: "erase",  label: "Erase",  Icon: PiEraserFill },
];

export default function DrawToolsPill({ activeSubTool, onSubToolChange, onClose }) {
    return (
        <div className="absolute top-17 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 select-none bg-[#1a1a1a] px-3 py-2 rounded-2xl border border-white/15 shadow-xl">
            {tools.map(({ id, label, Icon, iconStyle, disabled }) => {
                const isDisabled = Boolean(disabled);
                const isActive = !isDisabled && activeSubTool === id;
                return (
                    <button
                        key={id}
                        type="button"
                        disabled={isDisabled}
                        aria-disabled={isDisabled}
                        onClick={() => {
                            if (isDisabled) return;
                            onSubToolChange?.(id);
                        }}
                        className={`
                            flex flex-col items-center justify-center gap-0.5
                            px-2 py-1.5
                            rounded-lg transition-all duration-150
                            ${isDisabled
                                ? "text-BrandGray opacity-45 cursor-not-allowed"
                                : isActive
                                ? "bg-BrandOrange text-BrandBlack"
                                : "text-BrandOrange active:bg-white/10"
                            }
                        `}
                    >
                        {createElement(Icon, {
                            className: "text-lg",
                            style: iconStyle,
                        })}
                        <span className="text-[9px] font-DmSans leading-none">{label}</span>
                    </button>
                );
            })}
            <div className="w-px h-5 bg-white/15 shrink-0 mx-1" />
            <button
                type="button"
                onClick={onClose}
                className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-150 text-BrandGray2 active:text-white"
            >
                <FiX className="text-lg" />
                <span className="text-[9px] font-DmSans leading-none">Close</span>
            </button>
        </div>
    );
}
