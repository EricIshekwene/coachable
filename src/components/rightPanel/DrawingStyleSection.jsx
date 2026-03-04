import { useEffect, useRef, useState } from "react";
import { FiAlignLeft, FiAlignCenter, FiAlignRight } from "react-icons/fi";
import { PiPenNib } from "react-icons/pi";
import { Slider } from "@mui/material";

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

const SHAPE_TYPES = [
  { value: "rect", label: "Rectangle" },
  { value: "triangle", label: "Triangle" },
  { value: "ellipse", label: "Circle" },
  { value: "custom", label: "Custom" },
];

const SHAPE_COLORS = [
  "transparent", ...PRESET_COLORS,
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

const DRAW_SLIDER_SX = {
  width: "100%",
  color: "#FF7A18",
  height: "6.25px",
  "& .MuiSlider-thumb": {
    width: "12.5px",
    height: "12.5px",
    backgroundColor: "#FF7A18",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
    "&:hover": {
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
    },
    "&:focus, &:active, &.Mui-focusVisible": {
      outline: "none",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
    },
  },
  "& .MuiSlider-track": {
    backgroundColor: "#FF7A18",
    height: "6.25px",
    border: "none",
  },
  "& .MuiSlider-rail": {
    backgroundColor: "#75492a",
    height: "6.25px",
    opacity: 1,
  },
};

const roundToOneDecimal = (value) => Math.round(value * 10) / 10;

function SliderControl({ label, value, onChange, min, max, step = 1, isPercentage = false }) {
  const isDecimalStep = !Number.isInteger(step);
  const rawValue = typeof value === "number" ? value : min;
  const normalizedValue = isPercentage ? rawValue * 100 : rawValue;
  const roundedValue = isDecimalStep ? roundToOneDecimal(normalizedValue) : normalizedValue;
  const sliderValue = Number.isFinite(roundedValue)
    ? Math.min(max, Math.max(min, roundedValue))
    : min;
  const displayValue = isPercentage
    ? `${Math.round(sliderValue)}%`
    : (isDecimalStep ? roundToOneDecimal(sliderValue) : sliderValue);
  const handleChange = (_, newValue) => {
    const numericValue = Array.isArray(newValue) ? newValue[0] : newValue;
    if (!Number.isFinite(numericValue)) return;
    if (isPercentage) {
      onChange?.(roundToOneDecimal(numericValue / 100));
      return;
    }
    onChange?.(isDecimalStep ? roundToOneDecimal(numericValue) : numericValue);
  };

  return (
    <>
      <SectionLabel>{label}</SectionLabel>
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 min-w-0 overflow-x-hidden overflow-y-hidden flex items-center justify-start px-2">
          <Slider
            min={min}
            max={max}
            step={step}
            value={sliderValue}
            onChange={handleChange}
            sx={DRAW_SLIDER_SX}
            aria-label={label}
          />
        </div>
        <span className={`text-BrandWhite text-[10px] sm:text-xs font-DmSans ${isPercentage ? "w-12" : "w-8"} text-right`}>
          {displayValue}
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

function DrawSubToolStyle({
  drawColor, drawOpacity, drawStrokeWidth, drawTension,
  onColorChange, onOpacityChange, onStrokeWidthChange, onTensionChange,
}) {
  return (
    <>
      <SectionLabel>Color</SectionLabel>
      <ColorSwatches value={drawColor} onChange={onColorChange} />
      <SliderControl label="Opacity" value={drawOpacity} onChange={onOpacityChange} min={0} max={100} step={10} isPercentage />
      <SliderControl label="Brush Size" value={drawStrokeWidth} onChange={onStrokeWidthChange} min={1} max={20} step={1} />
      <SliderControl label="Stabilization" value={drawTension} onChange={onTensionChange} min={0} max={1} step={0.1} />
    </>
  );
}

function ArrowSubToolStyle({
  drawColor, drawOpacity, drawStrokeWidth, drawArrowHeadType,
  onColorChange, onOpacityChange, onStrokeWidthChange, onArrowHeadTypeChange,
}) {
  return (
    <>
      <SectionLabel>Color</SectionLabel>
      <ColorSwatches value={drawColor} onChange={onColorChange} />
      <SliderControl label="Opacity" value={drawOpacity} onChange={onOpacityChange} min={0} max={100} step={10} isPercentage />
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

function TextSubToolStyle({
  drawColor, drawOpacity, drawFontSize, drawTextAlign,
  onColorChange, onOpacityChange, onFontSizeChange, onTextAlignChange,
}) {
  return (
    <>
      <SectionLabel>Color</SectionLabel>
      <ColorSwatches value={drawColor} onChange={onColorChange} />
      <SliderControl label="Opacity" value={drawOpacity} onChange={onOpacityChange} min={0} max={100} step={10} isPercentage />
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

function TextContentEditor({ text, drawingId, onUpdate }) {
  const textareaRef = useRef(null);
  const prevIdRef = useRef(null);

  useEffect(() => {
    if (drawingId !== prevIdRef.current) {
      prevIdRef.current = drawingId;
      // Auto-focus and select all when a new text drawing is selected
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.select();
        }
      });
    }
  }, [drawingId]);

  return (
    <textarea
      ref={textareaRef}
      value={text}
      onChange={(e) => onUpdate({ text: e.target.value })}
      onKeyDown={(e) => e.stopPropagation()}
      rows={3}
      className="w-full bg-BrandBlack2 border border-BrandGray2 text-BrandWhite text-xs font-DmSans rounded px-1.5 py-1 outline-none focus:border-BrandOrange resize-none"
      placeholder="Enter text..."
    />
  );
}

/** Small SVG preview of a shape type */
function ShapeTypePreview({ type, isActive }) {
  const color = isActive ? "#1a1a1a" : "#FF7A18";
  if (type === "custom") {
    return (
      <span className="w-6 h-6 flex items-center justify-center">
        <PiPenNib className="text-lg" style={{ color, transform: "rotate(90deg)" }} />
      </span>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="block">
      {type === "rect" && (
        <rect x="3" y="5" width="18" height="14" rx="1" fill="none" stroke={color} strokeWidth="2" />
      )}
      {type === "triangle" && (
        <polygon points="12,3 3,21 21,21" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      )}
      {type === "ellipse" && (
        <ellipse cx="12" cy="12" rx="9" ry="9" fill="none" stroke={color} strokeWidth="2" />
      )}
    </svg>
  );
}

function ShapeColorPicker({ value, onChange, noneTitle = "No color" }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {SHAPE_COLORS.map((c) => {
        const isTransparent = c === "transparent";
        const isSelected = value === c;
        return (
          <button
            key={c}
            onClick={() => onChange?.(c)}
            className={`
              w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all duration-100 relative overflow-hidden
              ${isSelected ? "border-BrandOrange scale-110" : "border-transparent hover:border-BrandGray"}
            `}
            style={isTransparent ? undefined : { backgroundColor: c }}
            title={isTransparent ? noneTitle : c}
          >
            {isTransparent && (
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <rect width="24" height="24" fill="#333" />
                <line x1="0" y1="24" x2="24" y2="0" stroke="#ef4444" strokeWidth="2.5" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ShapeSubToolStyle({
  drawShapeStrokeColor, drawOpacity, drawStrokeWidth, drawShapeType, drawShapeFill,
  onShapeStrokeColorChange, onOpacityChange, onStrokeWidthChange, onShapeTypeChange, onShapeFillChange,
}) {
  const hasStroke = drawShapeStrokeColor !== "transparent";

  return (
    <>
      <SectionLabel>Shape</SectionLabel>
      <div className="flex gap-1 flex-wrap">
        {SHAPE_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => onShapeTypeChange?.(t.value)}
            title={t.label}
            className={`
              p-1 rounded-md transition-all duration-100
              ${drawShapeType === t.value
                ? "bg-BrandOrange"
                : "hover:bg-BrandBlack2 border border-BrandGray2"
              }
            `}
          >
            <ShapeTypePreview type={t.value} isActive={drawShapeType === t.value} />
          </button>
        ))}
      </div>
      <SectionLabel>Stroke Color</SectionLabel>
      <ShapeColorPicker value={drawShapeStrokeColor} onChange={onShapeStrokeColorChange} noneTitle="No stroke" />
      <SliderControl label="Opacity" value={drawOpacity} onChange={onOpacityChange} min={0} max={100} step={10} isPercentage />
      <SectionLabel>Fill Color</SectionLabel>
      <ShapeColorPicker value={drawShapeFill} onChange={onShapeFillChange} noneTitle="No fill" />
      {hasStroke && (
        <SliderControl label="Stroke Width" value={drawStrokeWidth} onChange={onStrokeWidthChange} min={1} max={20} step={1} />
      )}
    </>
  );
}

function EraserSubToolStyle({ eraserSize, onEraserSizeChange }) {
  return (
    <>
      <SliderControl label="Eraser Size" value={eraserSize ?? 10} onChange={onEraserSizeChange} min={5} max={50} step={1} />
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
        <SliderControl label="Opacity" value={d.opacity ?? 1} onChange={(o) => update({ opacity: o })} min={0} max={100} step={10} isPercentage />
        <SliderControl label="Brush Size" value={d.strokeWidth || 3} onChange={(w) => update({ strokeWidth: w })} min={1} max={20} step={1} />
        <SliderControl label="Stabilization" value={d.tension ?? 0.3} onChange={(t) => update({ tension: t })} min={0} max={1} step={0.1} />
      </>
    );
  }

  if (d.type === "arrow") {
    return (
      <>
        <SectionLabel>Color</SectionLabel>
        <ColorSwatches value={d.color} onChange={(c) => update({ color: c })} />
        <SliderControl label="Opacity" value={d.opacity ?? 1} onChange={(o) => update({ opacity: o })} min={0} max={100} step={10} isPercentage />
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
        <TextContentEditor text={d.text || ""} drawingId={d.id} onUpdate={update} />
        <SectionLabel>Color</SectionLabel>
        <ColorSwatches value={d.color} onChange={(c) => update({ color: c })} />
        <SliderControl label="Opacity" value={d.opacity ?? 1} onChange={(o) => update({ opacity: o })} min={0} max={100} step={10} isPercentage />
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

  if (d.type === "shape") {
    const shapeLabel = { rect: "Rectangle", triangle: "Triangle", ellipse: "Circle", custom: "Polygon" };
    const strokeColor = d.color || "#FFFFFF";
    const hasStroke = strokeColor !== "transparent";

    return (
      <>
        <p className="text-BrandGray text-[10px] sm:text-xs font-DmSans">{shapeLabel[d.shapeType] || "Shape"}</p>
        <SectionLabel>Stroke Color</SectionLabel>
        <ShapeColorPicker value={strokeColor} onChange={(c) => update({ color: c })} noneTitle="No stroke" />
        <SliderControl label="Opacity" value={d.opacity ?? 1} onChange={(o) => update({ opacity: o })} min={0} max={100} step={10} isPercentage />
        <SectionLabel>Fill Color</SectionLabel>
        <ShapeColorPicker value={d.fill || "transparent"} onChange={(f) => update({ fill: f })} noneTitle="No fill" />
        {hasStroke && (
          <SliderControl label="Stroke Width" value={d.strokeWidth || 2} onChange={(w) => update({ strokeWidth: w })} min={1} max={20} step={1} />
        )}
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
  const handleOpacityChange = (opacity) => {
    const changes = {};
    for (const d of selectedDrawings) {
      changes[d.id] = { opacity };
    }
    onUpdateMultipleDrawings?.(changes);
  };
  const currentColor = selectedDrawings[0]?.color || "#FFFFFF";
  const currentOpacity = selectedDrawings[0]?.opacity ?? 1;
  return (
    <>
      <SectionLabel>Color</SectionLabel>
      <ColorSwatches value={currentColor} onChange={handleColorChange} />
      <SliderControl label="Opacity" value={currentOpacity} onChange={handleOpacityChange} min={0} max={100} step={10} isPercentage />
    </>
  );
}

export default function DrawingStyleSection({
  drawSubTool,
  drawColor,
  drawOpacity = 1,
  drawStrokeWidth,
  drawTension,
  drawFontSize,
  drawTextAlign,
  drawArrowHeadType,
  drawShapeStrokeColor = "#FFFFFF",
  onColorChange,
  onOpacityChange,
  onStrokeWidthChange,
  onTensionChange,
  onFontSizeChange,
  onTextAlignChange,
  onArrowHeadTypeChange,
  onShapeStrokeColorChange,
  selectedDrawing,
  selectedDrawings = [],
  onUpdateDrawing,
  onUpdateMultipleDrawings,
  eraserSize,
  onEraserSizeChange,
  drawShapeType,
  drawShapeFill,
  onShapeTypeChange,
  onShapeFillChange,
}) {
  const multiSelected = selectedDrawings.length > 1;
  const showSelectedStyle = drawSubTool === "select" && selectedDrawing && !multiSelected;

  let title = "Drawing Style";
  if (drawSubTool === "draw") title = "Brush";
  else if (drawSubTool === "arrow") title = "Arrow";
  else if (drawSubTool === "text") title = "Text";
  else if (drawSubTool === "shape") title = "Shape";
  else if (drawSubTool === "erase") title = "Eraser";
  else if (drawSubTool === "select" && multiSelected) {
    title = `${selectedDrawings.length} Selected`;
  } else if (drawSubTool === "select" && selectedDrawing) {
    const typeLabel = { stroke: "Brush", arrow: "Arrow", text: "Text", shape: "Shape" };
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
          drawOpacity={drawOpacity}
          drawStrokeWidth={drawStrokeWidth}
          drawTension={drawTension}
          onColorChange={onColorChange}
          onOpacityChange={onOpacityChange}
          onStrokeWidthChange={onStrokeWidthChange}
          onTensionChange={onTensionChange}
        />
      )}

      {drawSubTool === "arrow" && (
        <ArrowSubToolStyle
          drawColor={drawColor}
          drawOpacity={drawOpacity}
          drawStrokeWidth={drawStrokeWidth}
          drawArrowHeadType={drawArrowHeadType}
          onColorChange={onColorChange}
          onOpacityChange={onOpacityChange}
          onStrokeWidthChange={onStrokeWidthChange}
          onArrowHeadTypeChange={onArrowHeadTypeChange}
        />
      )}

      {drawSubTool === "shape" && (
        <ShapeSubToolStyle
          drawShapeStrokeColor={drawShapeStrokeColor}
          drawOpacity={drawOpacity}
          drawStrokeWidth={drawStrokeWidth}
          drawShapeType={drawShapeType}
          drawShapeFill={drawShapeFill}
          onShapeStrokeColorChange={onShapeStrokeColorChange}
          onOpacityChange={onOpacityChange}
          onStrokeWidthChange={onStrokeWidthChange}
          onShapeTypeChange={onShapeTypeChange}
          onShapeFillChange={onShapeFillChange}
        />
      )}

      {drawSubTool === "text" && (
        <TextSubToolStyle
          drawColor={drawColor}
          drawOpacity={drawOpacity}
          drawFontSize={drawFontSize}
          drawTextAlign={drawTextAlign}
          onColorChange={onColorChange}
          onOpacityChange={onOpacityChange}
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
