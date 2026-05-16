import { createElement } from "react";
import { PiPenNib, PiEraserFill, PiTextTBold, PiCursorFill, PiShapesFill } from "react-icons/pi";
import { FaArrowUpLong } from "react-icons/fa6";
import { FiX } from "react-icons/fi";

/**
 * Annotation drawing palette — the floating tool pill that appears whenever
 * the pen tool is active (in normal slate or in /admin/drawing).
 *
 * Styling mirrors {@link AnimationDrawingTools} (rounded-full outer pill,
 * icon-beside-label buttons, orange-active state) so the two palettes feel
 * like the same control surface even though they manage different scopes.
 *
 * This palette is annotation-only. It never appears at the same time as
 * `AnimationDrawingTools` because `Slate.jsx` gates them on mutually
 * exclusive conditions (pen tool vs motion subtool).
 */
const TOOLS = [
  { id: "select", label: "Select", Icon: PiCursorFill },
  { id: "text",   label: "Text",   Icon: PiTextTBold },
  { id: "draw",   label: "Draw",   Icon: PiPenNib, iconStyle: { transform: "rotate(90deg)" } },
  { id: "arrow",  label: "Arrow",  Icon: FaArrowUpLong, iconStyle: { transform: "rotate(45deg)" } },
  { id: "shape",  label: "Shape",  Icon: PiShapesFill },
  { id: "erase",  label: "Erase",  Icon: PiEraserFill },
];

/**
 * @param {{
 *   activeSubTool: string,
 *   onSubToolChange: (id: string) => void,
 *   onClose: () => void,
 * }} props
 */
export default function DrawToolsPill({ activeSubTool, onSubToolChange, onClose }) {
  return (
    <div
      data-testid="annotation-tool-pill"
      aria-label="Annotation drawing tools"
      className="absolute top-17 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 select-none rounded-full border border-white/10 bg-[rgba(18,18,18,0.92)] px-1.5 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.08)] backdrop-blur-sm"
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

      <button
        type="button"
        onClick={onClose}
        title="Close"
        className="group flex items-center justify-center gap-2 rounded-full px-3.5 py-2 text-xs font-DmSans font-medium tracking-[0.01em] transition-all duration-150 border border-transparent bg-white/2 text-white/82 hover:bg-white/4 active:scale-[0.98]"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full transition-colors text-BrandGray2 group-hover:text-white">
          <FiX className="text-[13px]" />
        </span>
      </button>
    </div>
  );
}
