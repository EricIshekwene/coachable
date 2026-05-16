import { createElement } from "react";
import { PiPenNib, PiEraserFill, PiTextTBold, PiCursorFill, PiShapesFill } from "react-icons/pi";
import { FaArrowUpLong } from "react-icons/fa6";
import { FiX } from "react-icons/fi";
import FloatingToolPillShell from "./toolPills/FloatingToolPillShell";

/**
 * Annotation drawing palette — the floating tool pill that appears in normal
 * (non-drawing-mode) slate when the pen tool is active.
 *
 * This palette is annotation-only. It cannot read or write motion-drawing
 * state, and it never appears at the same time as `AnimationDrawingTools`
 * because `Slate.jsx` gates rendering on `!drawingMode`.
 */
const tools = [
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
    <FloatingToolPillShell testId="annotation-tool-pill" ariaLabel="Annotation drawing tools">
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
            {createElement(Icon, { className: "text-lg", style: iconStyle })}
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
    </FloatingToolPillShell>
  );
}
