import React from "react";
import { FaCircle } from "react-icons/fa";
import { Slider } from "@mui/material";
import { BRAND_SLIDER_SX } from "../subcomponents/sliderStyles";

const DURATION_OPTIONS = [
  { label: "5s", ms: 5000 },
  { label: "10s", ms: 10000 },
  { label: "15s", ms: 15000 },
  { label: "20s", ms: 20000 },
  { label: "30s", ms: 30000 },
];

/**
 * Toggle button in the right panel to switch between standard keyframe mode
 * and recording mode. Also includes a duration selector.
 */
export default function RecordingModeToggle({
  enabled,
  onChange,
  durationMs,
  onDurationChange,
  stabilization,
  onStabilizationChange,
  isBusy,
}) {
  const stabilizationValue = Number.isFinite(stabilization)
    ? Math.min(1, Math.max(0, stabilization))
    : 0.5;
  const stabilizationPercent = Math.round(stabilizationValue * 100);

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3">
      <button
        onClick={() => onChange(!enabled)}
        className={`
          flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors w-full
          ${enabled
            ? "bg-red-500/20 hover:bg-red-500/30"
            : "bg-BrandGray2/30 hover:bg-BrandGray2/50"
          }
        `}
      >
        <FaCircle
          className={`text-[8px] ${enabled ? "text-red-500" : "text-BrandGray"}`}
        />
        <span
          className={`text-xs font-DmSans font-medium ${
            enabled ? "text-red-400" : "text-BrandGray"
          }`}
        >
          {enabled ? "Recording Mode" : "Record Mode"}
        </span>
      </button>

      {enabled && (
        <>
          <div className="flex items-center gap-1.5 mt-1.5 px-1">
            <span className="text-BrandGray text-[10px] font-DmSans shrink-0">
              Duration:
            </span>
            <div className="flex gap-0.5 flex-wrap">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.ms}
                  onClick={() => onDurationChange?.(opt.ms)}
                  disabled={isBusy}
                  className={`
                    px-1.5 py-0.5 rounded text-[10px] font-DmSans transition-colors
                    ${durationMs === opt.ms
                      ? "bg-red-500/30 text-red-300"
                      : "bg-BrandGray2/20 text-BrandGray hover:bg-BrandGray2/40"
                    }
                    ${isBusy ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-1.5 px-1">
            <div className="flex items-center justify-between">
              <span className="text-BrandGray text-[10px] font-DmSans">
                Stabilization
              </span>
              <span className="text-BrandGray text-[10px] font-DmSans tabular-nums">
                {stabilizationPercent}%
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={5}
              value={stabilizationPercent}
              onChange={(_, newValue) => {
                const numericValue = Array.isArray(newValue) ? newValue[0] : newValue;
                if (!Number.isFinite(numericValue)) return;
                onStabilizationChange?.(numericValue / 100);
              }}
              disabled={isBusy}
              sx={BRAND_SLIDER_SX}
              aria-label="Recording stabilization"
            />
          </div>
        </>
      )}

      {!enabled && (
        <p className="text-BrandGray text-[9px] font-DmSans mt-1 px-1 leading-tight">
          Record each player's movement one at a time
        </p>
      )}
    </div>
  );
}
