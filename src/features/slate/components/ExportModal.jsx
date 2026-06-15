import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { Slider } from "@mui/material";
import { BRAND_SLIDER_SX } from "./subcomponents/sliderStyles";
import {
  POPUP_CLOSE_BUTTON_CLASS,
  POPUP_LABEL_CLASS,
  POPUP_MODAL_OVERLAY_CLASS,
  POPUP_PRIMARY_BUTTON_CLASS,
  POPUP_SURFACE_CLASS,
  POPUP_TITLE_CLASS,
} from "./subcomponents/popupStyles";

const toggleBtnClass = (active) =>
  `px-3 py-1.5 rounded-full text-xs sm:text-sm font-DmSans font-semibold transition-colors ${
    active
      ? "bg-BrandOrange text-BrandBlack"
      : "bg-BrandGray2 text-white hover:bg-BrandGray"
  }`;

const QUALITY_PRESETS = {
  standard: { label: "Standard", pixelRatio: 1, fps: 30, bitrate: 4_000_000, note: "Fast export, smaller file" },
  high:     { label: "High",     pixelRatio: 2, fps: 45, bitrate: 8_000_000, note: "Smooth playback, balanced size" },
  ultra:    { label: "Ultra",    pixelRatio: 3, fps: 60, bitrate: 16_000_000, note: "Slate-quality, every frame captured" },
};

export default function ExportModal({ open, initialFormat = "photo", onClose, onExport }) {
  const [format, setFormat] = useState(initialFormat);
  const [region, setRegion] = useState("full");
  const [durationSec, setDurationSec] = useState(30);
  const [quality, setQuality] = useState("high");

  useEffect(() => {
    if (open) setFormat(initialFormat);
  }, [open, initialFormat]);

  if (!open) return null;

  const handleExport = () => {
    const preset = QUALITY_PRESETS[quality];
    onExport?.({ format, region, durationSec, quality: { pixelRatio: preset.pixelRatio, fps: preset.fps, bitrate: preset.bitrate } });
  };

  return (
    <div
      className={POPUP_MODAL_OVERLAY_CLASS}
      onClick={onClose}
    >
      <div
        className={`relative w-72 sm:w-80 p-5 sm:p-6 flex flex-col gap-5 ${POPUP_SURFACE_CLASS}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className={POPUP_CLOSE_BUTTON_CLASS}
          aria-label="Close export popup"
        >
          <FaTimes className="text-sm" />
        </button>

        <h2 className={POPUP_TITLE_CLASS}>Export</h2>

        {/* Format toggle */}
        <div className="flex flex-col gap-1.5">
          <span className={POPUP_LABEL_CLASS}>Format</span>
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
          <span className={POPUP_LABEL_CLASS}>Region</span>
          <div className="flex gap-2">
            <button type="button" className={toggleBtnClass(region === "full")} onClick={() => setRegion("full")}>
              Full Field
            </button>
            <button type="button" className={toggleBtnClass(region === "custom")} onClick={() => setRegion("custom")}>
              Custom
            </button>
          </div>
        </div>

        {/* Duration slider (video only) */}
        {format === "video" && (
          <div className="flex flex-col gap-1.5">
            <span className={POPUP_LABEL_CLASS}>
              Duration: {durationSec}s
            </span>
            <div className="w-full min-w-0 overflow-x-hidden overflow-y-hidden flex items-center justify-start px-2">
              <Slider
                min={5}
                max={60}
                step={5}
                value={durationSec}
                onChange={(_, newValue) => setDurationSec(Array.isArray(newValue) ? newValue[0] : newValue)}
                sx={BRAND_SLIDER_SX}
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
          <span className={POPUP_LABEL_CLASS}>Quality</span>
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
          className={POPUP_PRIMARY_BUTTON_CLASS}
        >
          Export
        </button>
      </div>
    </div>
  );
}
