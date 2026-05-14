import { createElement } from "react";
import { PiPenNib, PiEraserFill } from "react-icons/pi";
import { FaArrowUpLong } from "react-icons/fa6";

const TOOLS = [
  { id: "arrow", label: "Arrow", Icon: FaArrowUpLong, iconStyle: { transform: "rotate(45deg)" } },
  { id: "draw",  label: "Draw",  Icon: PiPenNib,      iconStyle: { transform: "rotate(90deg)" } },
  { id: "erase", label: "Erase", Icon: PiEraserFill },
];

/**
 * Permanent animation drawing tool palette for coaching mode.
 * Always visible — shows Arrow and Draw tools only, no close button.
 * A tool is only highlighted active when the canvas is in pen mode AND that subtool is selected.
 *
 * @param {{ canvasTool: string, activeSubTool: string, onSubToolChange: (id: string) => void }} props
 */
export default function AnimationDrawingTools({ activeSubTool, onSubToolChange }) {
  return (
    <div className="absolute top-17 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 select-none rounded-full border border-white/10 bg-[rgba(18,18,18,0.92)] px-1.5 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.08)] backdrop-blur-sm">
      {TOOLS.map(({ id, label, Icon, iconStyle }) => {
        const isActive = activeSubTool === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSubToolChange?.(id)}
            className={[
              "group flex items-center justify-center gap-2 rounded-full px-3.5 py-2 text-xs font-DmSans font-medium tracking-[0.01em] transition-all duration-150",
              isActive
                ? "border border-BrandOrange/55 bg-BrandOrange text-BrandBlack"
                : "border border-transparent bg-white/[0.02] text-white/82 hover:bg-white/[0.04] active:scale-[0.98]",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-5 w-5 items-center justify-center rounded-full transition-colors",
                isActive
                  ? "text-BrandBlack"
                  : "text-BrandOrange/95 group-hover:text-BrandOrange",
              ].join(" ")}
            >
              {createElement(Icon, { className: "text-[13px]", style: iconStyle })}
            </span>
            <span className={isActive ? "text-BrandBlack" : "text-white/84"}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

