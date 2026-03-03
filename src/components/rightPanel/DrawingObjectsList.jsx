import { FiTrash2 } from "react-icons/fi";

function getDrawingLabel(drawing, index, drawings) {
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

function getTypeIcon(type) {
  if (type === "text") return "T";
  if (type === "arrow") return "\u2192";
  if (type === "stroke") return "\u270E";
  if (type === "shape") return "\u25A1";
  return "\u25CF";
}

export default function DrawingObjectsList({
  drawings = [],
  selectedDrawingIds = [],
  onSelectedDrawingIdsChange,
  onRemoveDrawing,
}) {
  if (drawings.length === 0) return null;

  const selectedSet = new Set(selectedDrawingIds);

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-1.5 sm:pb-2 items-start justify-center gap-0.5">
      <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans font-bold mb-0.5">
        Objects
      </div>
      <div className="flex flex-col w-full gap-0.5 max-h-32 overflow-y-auto hide-scroll">
        {drawings.map((d, i) => {
          const isSelected = selectedSet.has(d.id);
          return (
            <div
              key={d.id}
              onClick={() => onSelectedDrawingIdsChange?.([d.id])}
              className={`
                flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer
                transition-all duration-100 group
                ${isSelected
                  ? "bg-BrandOrange/20 border border-BrandOrange"
                  : "hover:bg-BrandBlack2 border border-transparent"
                }
              `}
            >
              <span className="text-BrandOrange text-xs font-DmSans font-bold w-4 text-center shrink-0">
                {getTypeIcon(d.type)}
              </span>
              <span
                className={`text-[10px] sm:text-xs font-DmSans flex-1 truncate ${
                  isSelected ? "text-BrandOrange" : "text-BrandWhite"
                }`}
              >
                {getDrawingLabel(d, i, drawings)}
              </span>
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
