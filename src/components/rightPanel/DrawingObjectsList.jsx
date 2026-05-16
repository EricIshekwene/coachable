import { FiTrash2, FiEye, FiEyeOff } from "react-icons/fi";
import { PiPenNib } from "react-icons/pi";

function isMotionEntry(drawing) {
  if (drawing?.kind === "motion") return true;
  if (drawing?.kind === "annotation") return false;
  return Boolean(
    drawing?.source === "coaching-draw" ||
      drawing?.attachedEntityId ||
      drawing?.attachedPlayerId
  );
}

function getDrawingLabel(drawing, index, drawings) {
  if (isMotionEntry(drawing)) {
    const stepNum = (drawing.stepIndex ?? 0) + 1;
    return `Step ${stepNum}`;
  }
  if (drawing.type === "text") {
    const preview = (drawing.text || "").split(/\s+/).slice(0, 3).join(" ");
    return preview || "T";
  }
  // Count how many of this type appear before this index
  const typeDrawings = drawings.filter((d) => d.type === drawing.type);
  const typeIndex = typeDrawings.indexOf(drawing) + 1;
  if (drawing.type === "arrow") return `Arrow ${typeIndex}`;
  if (drawing.type === "stroke") return `Drawing ${typeIndex}`;
  if (drawing.type === "shape") {
    const shapeLabels = { rect: "Rect", triangle: "Triangle", ellipse: "Circle", custom: "Polygon" };
    return `${shapeLabels[drawing.shapeType] || "Shape"} ${typeIndex}`;
  }
  return `Object ${typeIndex}`;
}

function getTypeIcon(drawing) {
  if (drawing.type === "text") return "T";
  if (drawing.type === "arrow") return "\u2192";
  if (drawing.type === "stroke") return "\u270E";
  if (drawing.type === "shape") {
    if (drawing.shapeType === "custom") {
      return <PiPenNib style={{ transform: "rotate(90deg)" }} />;
    }
    return "\u25A1";
  }
  return "\u25CF";
}

/**
 * @param {{
 *   drawingScope?: "annotation" | "motion",
 *   drawings: object[],
 *   selectedDrawingIds: string[],
 *   onSelectedDrawingIdsChange: (ids: string[]) => void,
 *   onRemoveDrawing: (id: string) => void,
 *   onToggleDrawingHidden: (id: string) => void,
 *   hideAllDrawings: boolean,
 *   onHideAllDrawingsChange: (next: boolean) => void,
 * }} props
 */
export default function DrawingObjectsList({
  drawingScope = "annotation",
  drawings = [],
  selectedDrawingIds = [],
  onSelectedDrawingIdsChange,
  onRemoveDrawing,
  onToggleDrawingHidden,
  hideAllDrawings = false,
  onHideAllDrawingsChange,
}) {
  if (drawings.length === 0) return null;

  const selectedSet = new Set(selectedDrawingIds);
  const sectionTitle = drawingScope === "motion" ? "Motion Steps" : "Annotations";

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-1.5 sm:pb-2 items-start justify-center gap-0.5">
      <div className="flex items-center justify-between w-full mb-0.5">
        <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans font-bold">
          {sectionTitle}
        </div>
        <button
          onClick={() => onHideAllDrawingsChange?.(!hideAllDrawings)}
          className="text-BrandGray hover:text-BrandOrange transition-colors p-0.5"
          title={hideAllDrawings ? "Show all drawings" : "Hide all drawings"}
        >
          {hideAllDrawings ? <FiEyeOff className="text-xs" /> : <FiEye className="text-xs" />}
        </button>
      </div>
      <div className={`flex flex-col w-full gap-0.5 max-h-32 overflow-y-auto hide-scroll transition-opacity ${hideAllDrawings ? "opacity-40" : ""}`}>
        {drawings.map((d, i) => {
          const isSelected = selectedSet.has(d.id);
          const isAnimDraw = isMotionEntry(d);
          const stepColor = isAnimDraw ? (d.color ?? "#FF7A18") : null;
          return (
            <div
              key={d.id}
              onClick={() => onSelectedDrawingIdsChange?.([d.id])}
              className={`
                flex items-center gap-1.5 py-1 rounded cursor-pointer
                transition-all duration-100 group
                ${isAnimDraw ? "pl-0 pr-1.5" : "px-1.5"}
                ${d.hidden ? "opacity-40" : ""}
                ${isSelected
                  ? isAnimDraw ? "" : "bg-BrandOrange/20"
                  : isAnimDraw ? "" : "hover:bg-BrandBlack2"
                }
              `}
              style={isAnimDraw ? {
                borderLeft: `2.5px solid ${stepColor}`,
                paddingLeft: 6,
                backgroundColor: isSelected
                  ? `${stepColor}28`
                  : undefined,
              } : undefined}
              onMouseEnter={isAnimDraw ? (e) => { if (!isSelected) e.currentTarget.style.backgroundColor = `${stepColor}14`; } : undefined}
              onMouseLeave={isAnimDraw ? (e) => { if (!isSelected) e.currentTarget.style.backgroundColor = ""; } : undefined}
            >
              <span
                className="text-xs font-DmSans font-bold w-4 text-center shrink-0"
                style={isAnimDraw ? { color: stepColor } : undefined}
              >
                {isAnimDraw
                  ? <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: stepColor, verticalAlign: "middle" }} />
                  : <span className="text-BrandOrange">{getTypeIcon(d)}</span>
                }
              </span>
              <span
                className={`text-[10px] sm:text-xs font-DmSans flex-1 truncate`}
                style={isAnimDraw ? { color: isSelected ? stepColor : `${stepColor}cc` } : undefined}
              >
                {!isAnimDraw && (
                  <span className={isSelected ? "text-BrandOrange" : "text-BrandWhite"}>
                    {getDrawingLabel(d, i, drawings)}
                  </span>
                )}
                {isAnimDraw && getDrawingLabel(d, i, drawings)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDrawingHidden?.(d.id);
                }}
                className="text-BrandGray hover:text-BrandOrange opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                title={d.hidden ? "Show" : "Hide"}
              >
                {d.hidden ? <FiEyeOff className="text-xs" /> : <FiEye className="text-xs" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveDrawing?.(d.id);
                }}
                className="text-BrandGray hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                title="Delete"
              >
                <FiTrash2 className="text-xs" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
