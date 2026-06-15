import { createElement } from "react";
import { PiPenNib, PiEraserFill, PiCursorFill } from "react-icons/pi";
import { FaArrowUpLong } from "react-icons/fa6";
import { FiEye, FiEyeOff } from "react-icons/fi";

/**
 * Motion drawing palette — the floating tool pill that appears in drawing-mode
 * slate. Lets coaches arrow / draw / erase motion paths attached to players
 * and balls.
 *
 * This palette is motion-only. It never appears at the same time as
 * `DrawToolsPill` because `Slate.jsx` gates rendering on `drawingMode`.
 * Tool selections only mutate motion subtool state; annotation subtool state
 * is entirely independent.
 *
 * Outer container uses its own pill styling (rounded-full) instead of the
 * shared FloatingToolPillShell so the motion palette keeps its original look.
 */
const TOOLS = [
  { id: "arrow", label: "Arrow", Icon: FaArrowUpLong, iconStyle: { transform: "rotate(45deg)" } },
  { id: "draw",  label: "Draw",  Icon: PiPenNib,      iconStyle: { transform: "rotate(90deg)" } },
  { id: "erase", label: "Erase", Icon: PiEraserFill },
];

/**
 * @param {{
 *   activeSubTool: string,
 *   onSubToolChange: (id: string) => void,
 *   hideDrawings: boolean,
 *   onToggleHideDrawings: () => void,
 * }} props
 */
export default function AnimationDrawingTools({ activeSubTool, onSubToolChange, hideDrawings = false, onToggleHideDrawings }) {
  return (
    <div className="absolute top-17 left-1/2 -translate-x-1/2 z-50 select-none">
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap flex items-center rounded-full border border-white/10 bg-[rgba(18,18,18,0.92)] px-3 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.08)] backdrop-blur-sm text-xs font-DmSans font-medium tracking-[0.01em] text-white/84">
        Animation Drawing
      </span>
    <div
      data-testid="motion-tool-pill"
      aria-label="Motion drawing tools"
      className="flex items-center gap-1 rounded-full border border-white/10 bg-[rgba(18,18,18,0.92)] px-1.5 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.08)] backdrop-blur-sm"
    >
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
                : "border border-transparent bg-white/2 text-white/82 hover:bg-white/4 active:scale-[0.98]",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-5 w-5 items-center justify-center rounded-full transition-colors",
                isActive ? "text-BrandBlack" : "text-BrandOrange/95 group-hover:text-BrandOrange",
              ].join(" ")}
            >
              {createElement(Icon, { className: "text-[13px]", style: iconStyle })}
            </span>
            <span className={isActive ? "text-BrandBlack" : "text-white/84"}>{label}</span>
          </button>
        );
      })}

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      {(() => {
        const isActive = activeSubTool === "select";
        return (
          <button
            type="button"
            aria-pressed={isActive}
            onClick={() => onSubToolChange?.("select")}
            className={[
              "group flex items-center justify-center gap-2 rounded-full px-3.5 py-2 text-xs font-DmSans font-medium tracking-[0.01em] transition-all duration-150",
              isActive
                ? "border border-BrandOrange/55 bg-BrandOrange text-BrandBlack"
                : "border border-transparent bg-white/2 text-white/82 hover:bg-white/4 active:scale-[0.98]",
            ].join(" ")}
          >
            <span className={["flex h-5 w-5 items-center justify-center rounded-full transition-colors", isActive ? "text-BrandBlack" : "text-BrandOrange/95 group-hover:text-BrandOrange"].join(" ")}>
              <PiCursorFill className="text-[13px]" />
            </span>
            <span className={isActive ? "text-BrandBlack" : "text-white/84"}>Select</span>
          </button>
        );
      })()}

      <button
        type="button"
        aria-pressed={hideDrawings}
        onClick={onToggleHideDrawings}
        title={hideDrawings ? "Show drawings" : "Hide drawings"}
        className={[
          "group flex items-center justify-center gap-2 rounded-full px-3.5 py-2 text-xs font-DmSans font-medium tracking-[0.01em] transition-all duration-150",
          hideDrawings
            ? "border border-BrandOrange/55 bg-BrandOrange text-BrandBlack"
            : "border border-transparent bg-white/2 text-white/82 hover:bg-white/4 active:scale-[0.98]",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-5 w-5 items-center justify-center rounded-full transition-colors",
            hideDrawings ? "text-BrandBlack" : "text-BrandOrange/95 group-hover:text-BrandOrange",
          ].join(" ")}
        >
          {hideDrawings ? <FiEyeOff className="text-[13px]" /> : <FiEye className="text-[13px]" />}
        </span>
      </button>
    </div>
    </div>
  );
}
