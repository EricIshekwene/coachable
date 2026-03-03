import { FiAlignLeft, FiAlignCenter, FiAlignRight } from "react-icons/fi";

const PRESET_COLORS = [
  "#FFFFFF", "#000000", "#ef4444", "#3b82f6", "#facc15", "#FF7A18",
  "#22c55e", "#a855f7",
];

const STROKE_WIDTHS = [
  { value: 2, label: "Thin" },
  { value: 4, label: "Medium" },
  { value: 6, label: "Thick" },
];

const ARROW_HEAD_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "thin", label: "Thin" },
  { value: "wide", label: "Wide" },
  { value: "none", label: "None" },
];

const TEXT_ALIGNS = [
  { value: "left", Icon: FiAlignLeft },
  { value: "center", Icon: FiAlignCenter },
  { value: "right", Icon: FiAlignRight },
];

function ColorSwatches({ value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onChange?.(c)}
          className={`
            w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all duration-100
            ${value === c ? "border-BrandOrange scale-110" : "border-transparent hover:border-BrandGray"}
          `}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function StrokeWidthPicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {STROKE_WIDTHS.map((w) => (
        <button
          key={w.value}
          onClick={() => onChange?.(w.value)}
          className={`
            flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-DmSans
            transition-all duration-100
            ${value === w.value
              ? "bg-BrandOrange text-BrandBlack"
              : "text-BrandOrange hover:bg-BrandBlack2 border border-BrandGray2"
            }
          `}
        >
          <span
            className="rounded-full bg-current"
            style={{ width: w.value * 2, height: w.value * 2 }}
          />
          {w.label}
        </button>
      ))}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-BrandOrange text-[10px] sm:text-xs font-DmSans uppercase tracking-wider mt-1.5 mb-1">
      {children}
    </p>
  );
}

function DrawSubToolStyle({ drawColor, drawStrokeWidth, drawTension, onColorChange, onStrokeWidthChange, onTensionChange }) {
  return (
    <>
      <SectionLabel>Color</SectionLabel>
      <ColorSwatches value={drawColor} onChange={onColorChange} />
      <SectionLabel>Brush Size</SectionLabel>
      <StrokeWidthPicker value={drawStrokeWidth} onChange={onStrokeWidthChange} />
      <SectionLabel>Stabilization</SectionLabel>
      <div className="flex gap-1.5">
        <button
          onClick={() => onTensionChange?.(0)}
          className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-DmSans transition-all duration-100 ${
            drawTension === 0 ? "bg-BrandOrange text-BrandBlack" : "text-BrandOrange hover:bg-BrandBlack2 border border-BrandGray2"
          }`}
        >
          Off
        </button>
        <button
          onClick={() => onTensionChange?.(0.3)}
          className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-DmSans transition-all duration-100 ${
            drawTension === 0.3 ? "bg-BrandOrange text-BrandBlack" : "text-BrandOrange hover:bg-BrandBlack2 border border-BrandGray2"
          }`}
        >
          Low
        </button>
        <button
          onClick={() => onTensionChange?.(0.5)}
          className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-DmSans transition-all duration-100 ${
            drawTension === 0.5 ? "bg-BrandOrange text-BrandBlack" : "text-BrandOrange hover:bg-BrandBlack2 border border-BrandGray2"
          }`}
        >
          High
        </button>
      </div>
    </>
  );
}

function ArrowSubToolStyle({ drawColor, drawStrokeWidth, drawArrowHeadType, onColorChange, onStrokeWidthChange, onArrowHeadTypeChange }) {
  return (
    <>
      <SectionLabel>Color</SectionLabel>
      <ColorSwatches value={drawColor} onChange={onColorChange} />
      <SectionLabel>Stroke Width</SectionLabel>
      <StrokeWidthPicker value={drawStrokeWidth} onChange={onStrokeWidthChange} />
      <SectionLabel>Arrow Head</SectionLabel>
      <div className="flex gap-1.5 flex-wrap">
        {ARROW_HEAD_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => onArrowHeadTypeChange?.(t.value)}
            className={`
              px-2 py-1 rounded-md text-[10px] sm:text-xs font-DmSans transition-all duration-100
              ${drawArrowHeadType === t.value
                ? "bg-BrandOrange text-BrandBlack"
                : "text-BrandOrange hover:bg-BrandBlack2 border border-BrandGray2"
              }
            `}
          >
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
}

function TextSubToolStyle({ drawColor, drawFontSize, drawTextAlign, onColorChange, onFontSizeChange, onTextAlignChange }) {
  return (
    <>
      <SectionLabel>Color</SectionLabel>
      <ColorSwatches value={drawColor} onChange={onColorChange} />
      <SectionLabel>Font Size</SectionLabel>
      <div className="flex items-center gap-2 w-full">
        <input
          type="range"
          min={12}
          max={48}
          step={2}
          value={drawFontSize}
          onChange={(e) => onFontSizeChange?.(Number(e.target.value))}
          className="flex-1 accent-BrandOrange h-1.5"
        />
        <span className="text-BrandWhite text-[10px] sm:text-xs font-DmSans w-6 text-right">
          {drawFontSize}
        </span>
      </div>
      <SectionLabel>Alignment</SectionLabel>
      <div className="flex gap-1.5">
        {TEXT_ALIGNS.map(({ value, Icon }) => (
          <button
            key={value}
            onClick={() => onTextAlignChange?.(value)}
            className={`
              p-1.5 rounded-md transition-all duration-100
              ${drawTextAlign === value
                ? "bg-BrandOrange text-BrandBlack"
                : "text-BrandOrange hover:bg-BrandBlack2 border border-BrandGray2"
              }
            `}
          >
            <Icon className="text-sm sm:text-base" />
          </button>
        ))}
      </div>
    </>
  );
}

function SelectedDrawingStyle({ selectedDrawing, onUpdateDrawing }) {
  if (!selectedDrawing) return null;
  const d = selectedDrawing;
  const update = (changes) => onUpdateDrawing?.(d.id, changes);

  if (d.type === "stroke") {
    return (
      <>
        <SectionLabel>Color</SectionLabel>
        <ColorSwatches value={d.color} onChange={(c) => update({ color: c })} />
        <SectionLabel>Brush Size</SectionLabel>
        <StrokeWidthPicker value={d.strokeWidth} onChange={(w) => update({ strokeWidth: w })} />
        <SectionLabel>Stabilization</SectionLabel>
        <div className="flex gap-1.5">
          {[{ v: 0, l: "Off" }, { v: 0.3, l: "Low" }, { v: 0.5, l: "High" }].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => update({ tension: v })}
              className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-DmSans transition-all duration-100 ${
                (d.tension ?? 0.3) === v ? "bg-BrandOrange text-BrandBlack" : "text-BrandOrange hover:bg-BrandBlack2 border border-BrandGray2"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </>
    );
  }

  if (d.type === "arrow") {
    return (
      <>
        <SectionLabel>Color</SectionLabel>
        <ColorSwatches value={d.color} onChange={(c) => update({ color: c })} />
        <SectionLabel>Stroke Width</SectionLabel>
        <StrokeWidthPicker value={d.strokeWidth} onChange={(w) => update({ strokeWidth: w })} />
        <SectionLabel>Arrow Head</SectionLabel>
        <div className="flex gap-1.5 flex-wrap">
          {ARROW_HEAD_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => update({ arrowHeadType: t.value })}
              className={`
                px-2 py-1 rounded-md text-[10px] sm:text-xs font-DmSans transition-all duration-100
                ${(d.arrowHeadType || "standard") === t.value
                  ? "bg-BrandOrange text-BrandBlack"
                  : "text-BrandOrange hover:bg-BrandBlack2 border border-BrandGray2"
                }
              `}
            >
              {t.label}
            </button>
          ))}
        </div>
      </>
    );
  }

  if (d.type === "text") {
    return (
      <>
        <SectionLabel>Color</SectionLabel>
        <ColorSwatches value={d.color} onChange={(c) => update({ color: c })} />
        <SectionLabel>Font Size</SectionLabel>
        <div className="flex items-center gap-2 w-full">
          <input
            type="range"
            min={12}
            max={48}
            step={2}
            value={d.fontSize || 18}
            onChange={(e) => update({ fontSize: Number(e.target.value) })}
            className="flex-1 accent-BrandOrange h-1.5"
          />
          <span className="text-BrandWhite text-[10px] sm:text-xs font-DmSans w-6 text-right">
            {d.fontSize || 18}
          </span>
        </div>
        <SectionLabel>Alignment</SectionLabel>
        <div className="flex gap-1.5">
          {TEXT_ALIGNS.map(({ value, Icon }) => (
            <button
              key={value}
              onClick={() => update({ align: value })}
              className={`
                p-1.5 rounded-md transition-all duration-100
                ${(d.align || "left") === value
                  ? "bg-BrandOrange text-BrandBlack"
                  : "text-BrandOrange hover:bg-BrandBlack2 border border-BrandGray2"
                }
              `}
            >
              <Icon className="text-sm sm:text-base" />
            </button>
          ))}
        </div>
      </>
    );
  }

  return null;
}

/**
 * Multi-selection style panel: when multiple drawings are selected,
 * show shared color editing only.
 */
function MultiSelectedStyle({ selectedDrawings, onUpdateMultipleDrawings }) {
  if (!selectedDrawings?.length) return null;
  const handleColorChange = (color) => {
    const changes = {};
    for (const d of selectedDrawings) {
      changes[d.id] = { color };
    }
    onUpdateMultipleDrawings?.(changes);
  };
  // Use first selected drawing's color as the active swatch
  const currentColor = selectedDrawings[0]?.color || "#FFFFFF";
  return (
    <>
      <SectionLabel>Color</SectionLabel>
      <ColorSwatches value={currentColor} onChange={handleColorChange} />
    </>
  );
}

export default function DrawingStyleSection({
  drawSubTool,
  drawColor,
  drawStrokeWidth,
  drawTension,
  drawFontSize,
  drawTextAlign,
  drawArrowHeadType,
  onColorChange,
  onStrokeWidthChange,
  onTensionChange,
  onFontSizeChange,
  onTextAlignChange,
  onArrowHeadTypeChange,
  selectedDrawing,
  selectedDrawings = [],
  onUpdateDrawing,
  onUpdateMultipleDrawings,
}) {
  const multiSelected = selectedDrawings.length > 1;
  const showSelectedStyle = drawSubTool === "select" && selectedDrawing && !multiSelected;

  let title = "Drawing Style";
  if (drawSubTool === "draw") title = "Brush";
  else if (drawSubTool === "arrow") title = "Arrow";
  else if (drawSubTool === "text") title = "Text";
  else if (drawSubTool === "erase") title = "Eraser";
  else if (drawSubTool === "select" && multiSelected) {
    title = `${selectedDrawings.length} Selected`;
  } else if (drawSubTool === "select" && selectedDrawing) {
    const typeLabel = { stroke: "Brush", arrow: "Arrow", text: "Text" };
    title = typeLabel[selectedDrawing.type] || "Selected";
  } else if (drawSubTool === "select") title = "Select";

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-1.5 sm:pb-2 items-start justify-center gap-0.5">
      <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans font-bold mb-0.5">
        {title}
      </div>

      {multiSelected && drawSubTool === "select" && (
        <MultiSelectedStyle
          selectedDrawings={selectedDrawings}
          onUpdateMultipleDrawings={onUpdateMultipleDrawings}
        />
      )}

      {showSelectedStyle && (
        <SelectedDrawingStyle selectedDrawing={selectedDrawing} onUpdateDrawing={onUpdateDrawing} />
      )}

      {drawSubTool === "draw" && (
        <DrawSubToolStyle
          drawColor={drawColor}
          drawStrokeWidth={drawStrokeWidth}
          drawTension={drawTension}
          onColorChange={onColorChange}
          onStrokeWidthChange={onStrokeWidthChange}
          onTensionChange={onTensionChange}
        />
      )}

      {drawSubTool === "arrow" && (
        <ArrowSubToolStyle
          drawColor={drawColor}
          drawStrokeWidth={drawStrokeWidth}
          drawArrowHeadType={drawArrowHeadType}
          onColorChange={onColorChange}
          onStrokeWidthChange={onStrokeWidthChange}
          onArrowHeadTypeChange={onArrowHeadTypeChange}
        />
      )}

      {drawSubTool === "text" && (
        <TextSubToolStyle
          drawColor={drawColor}
          drawFontSize={drawFontSize}
          drawTextAlign={drawTextAlign}
          onColorChange={onColorChange}
          onFontSizeChange={onFontSizeChange}
          onTextAlignChange={onTextAlignChange}
        />
      )}

      {drawSubTool === "erase" && (
        <p className="text-BrandGray text-[10px] sm:text-xs font-DmSans mt-1">
          Drag over drawings to erase them.
        </p>
      )}

      {drawSubTool === "select" && !selectedDrawing && !multiSelected && (
        <p className="text-BrandGray text-[10px] sm:text-xs font-DmSans mt-1">
          Click or drag to select drawings.
        </p>
      )}
    </div>
  );
}
