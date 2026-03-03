import { useState } from "react";
import { FiAlignLeft, FiAlignCenter, FiAlignRight } from "react-icons/fi";

const PRESET_COLORS = [
  "#FFFFFF", "#000000", "#ef4444", "#3b82f6", "#facc15", "#FF7A18",
  "#22c55e", "#a855f7",
];

const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];
const MAX_FONT_SIZE = 200;

const ARROW_HEAD_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "thin", label: "Thin" },
  { value: "wide", label: "Wide" },
  { value: "chevron", label: "Chevron" },
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

function SectionLabel({ children }) {
  return (
    <p className="text-BrandOrange text-[10px] sm:text-xs font-DmSans uppercase tracking-wider mt-1.5 mb-1">
      {children}
    </p>
  );
}

function SliderControl({ label, value, onChange, min, max, step = 1 }) {
  return (
    <>
      <SectionLabel>{label}</SectionLabel>
      <div className="flex items-center gap-2 w-full">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className="flex-1 accent-BrandOrange h-1.5"
        />
        <span className="text-BrandWhite text-[10px] sm:text-xs font-DmSans w-8 text-right">
          {Number.isInteger(step) ? value : value.toFixed(2)}
        </span>
      </div>
    </>
  );
}

/** Small SVG preview of an arrow head style */
function ArrowHeadPreview({ type, isActive }) {
  const color = isActive ? "#1a1a1a" : "#FF7A18";
  return (
    <svg width="36" height="18" viewBox="0 0 36 18" className="block">
      <line x1="2" y1="9" x2="24" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {type === "standard" && (
        <polygon points="24,4 34,9 24,14" fill={color} />
      )}
      {type === "thin" && (
        <polygon points="22,6 34,9 22,12" fill={color} />
      )}
      {type === "wide" && (
        <polygon points="22,1 34,9 22,17" fill={color} />
      )}
      {type === "chevron" && (
        <polyline points="22,2 34,9 22,16" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {type === "none" && (
        <circle cx="30" cy="9" r="2" fill={color} />
      )}
    </svg>
  );
}

function FontSizeDropdown({ value, onChange }) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState(String(value));

  const handleSelectChange = (e) => {
    const v = e.target.value;
    if (v === "custom") {
      setIsCustom(true);
      setCustomValue(String(value));
      return;
    }
    setIsCustom(false);
    onChange?.(Number(v));
  };

  const commitCustom = () => {
    const num = Math.min(MAX_FONT_SIZE, Math.max(1, parseInt(customValue, 10) || 18));
    onChange?.(num);
    setCustomValue(String(num));
  };

  if (isCustom) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          max={MAX_FONT_SIZE}
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onBlur={commitCustom}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") { commitCustom(); setIsCustom(false); }
            if (e.key === "Escape") setIsCustom(false);
          }}
          autoFocus
          className="w-16 bg-BrandBlack2 border border-BrandGray2 text-BrandWhite text-xs font-DmSans rounded px-1.5 py-0.5 outline-none focus:border-BrandOrange"
        />
        <button
          onClick={() => setIsCustom(false)}
          className="text-BrandGray hover:text-BrandWhite text-xs"
        >
          Done
        </button>
      </div>
    );
  }

  const isPreset = FONT_SIZE_OPTIONS.includes(value);
  return (
    <select
      value={isPreset ? value : "custom"}
      onChange={handleSelectChange}
      className="w-full bg-BrandBlack2 border border-BrandGray2 text-BrandWhite text-xs font-DmSans rounded px-1.5 py-1 outline-none focus:border-BrandOrange cursor-pointer"
    >
      {FONT_SIZE_OPTIONS.map((s) => (
        <option key={s} value={s}>{s}px</option>
      ))}
      <option value="custom">{isPreset ? "Custom..." : `${value}px (custom)`}</option>
    </select>
  );
}

function DrawSubToolStyle({ drawColor, drawStrokeWidth, drawTension, onColorChange, onStrokeWidthChange, onTensionChange }) {
  return (
    <>
      <SectionLabel>Color</SectionLabel>
      <ColorSwatches value={drawColor} onChange={onColorChange} />
      <SliderControl label="Brush Size" value={drawStrokeWidth} onChange={onStrokeWidthChange} min={1} max={20} step={1} />
      <SliderControl label="Stabilization" value={drawTension} onChange={onTensionChange} min={0} max={1} step={0.05} />
    </>
  );
}

function ArrowSubToolStyle({ drawColor, drawStrokeWidth, drawArrowHeadType, onColorChange, onStrokeWidthChange, onArrowHeadTypeChange }) {
  return (
    <>
      <SectionLabel>Color</SectionLabel>
      <ColorSwatches value={drawColor} onChange={onColorChange} />
      <SliderControl label="Stroke Width" value={drawStrokeWidth} onChange={onStrokeWidthChange} min={1} max={20} step={1} />
      <SectionLabel>Arrow Head</SectionLabel>
      <div className="flex gap-1 flex-wrap">
        {ARROW_HEAD_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => onArrowHeadTypeChange?.(t.value)}
            title={t.label}
            className={`
              p-1 rounded-md transition-all duration-100
              ${drawArrowHeadType === t.value
                ? "bg-BrandOrange"
                : "hover:bg-BrandBlack2 border border-BrandGray2"
              }
            `}
          >
            <ArrowHeadPreview type={t.value} isActive={drawArrowHeadType === t.value} />
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
      <FontSizeDropdown value={drawFontSize} onChange={onFontSizeChange} />
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

function EraserSubToolStyle({ eraserSize, onEraserSizeChange }) {
  return (
    <>
      <SliderControl label="Eraser Size" value={eraserSize ?? 10} onChange={onEraserSizeChange} min={5} max={50} step={1} />
      <p className="text-BrandGray text-[10px] sm:text-xs font-DmSans mt-1">
        Drag over drawings to erase them.
      </p>
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
        <SliderControl label="Brush Size" value={d.strokeWidth || 3} onChange={(w) => update({ strokeWidth: w })} min={1} max={20} step={1} />
        <SliderControl label="Stabilization" value={d.tension ?? 0.3} onChange={(t) => update({ tension: t })} min={0} max={1} step={0.05} />
      </>
    );
  }

  if (d.type === "arrow") {
    return (
      <>
        <SectionLabel>Color</SectionLabel>
        <ColorSwatches value={d.color} onChange={(c) => update({ color: c })} />
        <SliderControl label="Stroke Width" value={d.strokeWidth || 3} onChange={(w) => update({ strokeWidth: w })} min={1} max={20} step={1} />
        <SectionLabel>Arrow Head</SectionLabel>
        <div className="flex gap-1 flex-wrap">
          {ARROW_HEAD_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => update({ arrowHeadType: t.value })}
              title={t.label}
              className={`
                p-1 rounded-md transition-all duration-100
                ${(d.arrowHeadType || "standard") === t.value
                  ? "bg-BrandOrange"
                  : "hover:bg-BrandBlack2 border border-BrandGray2"
                }
              `}
            >
              <ArrowHeadPreview type={t.value} isActive={(d.arrowHeadType || "standard") === t.value} />
            </button>
          ))}
        </div>
      </>
    );
  }

  if (d.type === "text") {
    return (
      <>
        <SectionLabel>Text Content</SectionLabel>
        <textarea
          value={d.text || ""}
          onChange={(e) => update({ text: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
          rows={3}
          className="w-full bg-BrandBlack2 border border-BrandGray2 text-BrandWhite text-xs font-DmSans rounded px-1.5 py-1 outline-none focus:border-BrandOrange resize-none"
          placeholder="Enter text..."
        />
        <SectionLabel>Color</SectionLabel>
        <ColorSwatches value={d.color} onChange={(c) => update({ color: c })} />
        <SectionLabel>Font Size</SectionLabel>
        <FontSizeDropdown value={d.fontSize || 18} onChange={(s) => update({ fontSize: s })} />
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

function MultiSelectedStyle({ selectedDrawings, onUpdateMultipleDrawings }) {
  if (!selectedDrawings?.length) return null;
  const handleColorChange = (color) => {
    const changes = {};
    for (const d of selectedDrawings) {
      changes[d.id] = { color };
    }
    onUpdateMultipleDrawings?.(changes);
  };
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
  eraserSize,
  onEraserSizeChange,
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
        <EraserSubToolStyle
          eraserSize={eraserSize}
          onEraserSizeChange={onEraserSizeChange}
        />
      )}

      {drawSubTool === "select" && !selectedDrawing && !multiSelected && (
        <p className="text-BrandGray text-[10px] sm:text-xs font-DmSans mt-1">
          Click or drag to select drawings.
        </p>
      )}
    </div>
  );
}
