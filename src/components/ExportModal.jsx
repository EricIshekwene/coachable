import React, { useEffect, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { Slider } from "@mui/material";

const toggleBtnClass = (active) =>
  `px-3 py-1.5 rounded-full text-xs sm:text-sm font-DmSans font-semibold transition-colors ${
    active
      ? "bg-BrandOrange text-BrandBlack"
      : "bg-BrandGray2 text-white hover:bg-BrandGray"
  }`;

const QUALITY_PRESETS = {
  standard: { label: "Standard", pixelRatio: 1, fps: 24, bitrate: 2_500_000, note: "Fast export, smaller file" },
  high:     { label: "High",     pixelRatio: 2, fps: 30, bitrate: 5_000_000, note: "Balanced quality" },
  ultra:    { label: "Ultra",    pixelRatio: 3, fps: 30, bitrate: 10_000_000, note: "Best quality, slower export" },
};

const EXPORT_SLIDER_SX = {
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

export default function ExportModal({
  open,
  initialFormat = "photo",
  onClose,
  onExport,
  previewCanvasRef: externalCanvasRef,
  onFormatChange,
  onDurationChange,
  onCustomRegionRequest,
  hasCustomRegion = false,
}) {
  const [format, setFormat] = useState(initialFormat);
  const [region, setRegion] = useState("full");
  const [durationSec, setDurationSec] = useState(30);
  const [quality, setQuality] = useState("high");
  const internalCanvasRef = useRef(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;

  const isVideo = format === "video";

  useEffect(() => {
    if (open) {
      setFormat(initialFormat);
      setRegion(hasCustomRegion ? "custom" : "full");
    }
  }, [open, initialFormat, hasCustomRegion]);

  useEffect(() => {
    onFormatChange?.(format);
  }, [format, onFormatChange]);

  useEffect(() => {
    onDurationChange?.(durationSec);
  }, [durationSec, onDurationChange]);

  if (!open) return null;

  const handleExport = () => {
    const preset = QUALITY_PRESETS[quality];
    onExport?.({ format, region, durationSec, quality: { pixelRatio: preset.pixelRatio, fps: preset.fps, bitrate: preset.bitrate } });
  };

  const handleCustomClick = () => {
    if (hasCustomRegion) {
      setRegion("custom");
    } else {
      onCustomRegionRequest?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className={`
          relative bg-BrandBlack border border-BrandGray2 rounded-xl
          p-5 sm:p-6 shadow-2xl
          ${isVideo ? "w-[700px] max-w-[95vw] flex flex-row gap-5" : "w-72 sm:w-80 flex flex-col gap-5"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview canvas (video only, left side) */}
        {isVideo && (
          <div
            className="flex-1 min-w-0 flex items-center justify-center rounded-lg overflow-hidden border border-BrandGray2"
            style={{ maxHeight: "420px" }}
          >
            <canvas
              ref={canvasRef}
              style={{ display: "block", width: "100%", height: "100%", objectFit: "contain", background: "#111" }}
            />
          </div>
        )}

        {/* Settings column */}
        <div className={`flex flex-col gap-5 ${isVideo ? "w-56 shrink-0" : ""}`}>
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
          >
            <FaTimes className="text-sm" />
          </button>

          <h2 className="text-white font-DmSans font-semibold text-sm sm:text-base">
            Export
          </h2>

          {/* Format toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="text-white/60 text-[10px] sm:text-xs font-DmSans">Format</span>
            <div className="flex gap-2">
              <button type="button" className={toggleBtnClass(format === "photo")} onClick={() => setFormat("photo")}>
                Photo
              </button>
              <button type="button" className={toggleBtnClass(format === "video")} onClick={() => setFormat("video")}>
                Video
              </button>
            </div>
          </div>

          {/* Region toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="text-white/60 text-[10px] sm:text-xs font-DmSans">Region</span>
            <div className="flex gap-2">
              <button type="button" className={toggleBtnClass(region === "full")} onClick={() => setRegion("full")}>
                Full Field
              </button>
              <button type="button" className={toggleBtnClass(region === "custom")} onClick={handleCustomClick}>
                Custom{hasCustomRegion ? " \u2713" : ""}
              </button>
            </div>
          </div>

          {/* Duration slider (video only) */}
          {isVideo && (
            <div className="flex flex-col gap-1.5">
              <span className="text-white/60 text-[10px] sm:text-xs font-DmSans">
                Duration: {durationSec}s
              </span>
              <div className="w-full min-w-0 overflow-x-hidden overflow-y-hidden flex items-center justify-start px-2">
                <Slider
                  min={5}
                  max={60}
                  step={5}
                  value={durationSec}
                  onChange={(_, newValue) => setDurationSec(Array.isArray(newValue) ? newValue[0] : newValue)}
                  sx={EXPORT_SLIDER_SX}
                  aria-label="Export duration seconds"
                />
              </div>
              <div className="flex justify-between text-[9px] text-white/40 font-DmSans">
                <span>5s</span>
                <span>60s</span>
              </div>
            </div>
          )}

          {/* Quality selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-white/60 text-[10px] sm:text-xs font-DmSans">Quality</span>
            <div className="flex gap-2">
              {Object.entries(QUALITY_PRESETS).map(([key, preset]) => (
                <button key={key} type="button" className={toggleBtnClass(quality === key)} onClick={() => setQuality(key)}>
                  {preset.label}
                </button>
              ))}
            </div>
            <span className="text-white/40 text-[9px] font-DmSans">{QUALITY_PRESETS[quality].note}</span>
          </div>

          {/* Export button */}
          <button
            type="button"
            onClick={handleExport}
            className="
              w-full py-2.5 rounded-lg
              bg-BrandOrange text-BrandBlack font-DmSans font-semibold
              text-xs sm:text-sm
              border border-BrandOrange/80
              transition-all duration-200
              hover:bg-BrandOrange/95 hover:border-BrandOrange
              active:scale-[0.98] active:bg-BrandOrange/90
            "
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
