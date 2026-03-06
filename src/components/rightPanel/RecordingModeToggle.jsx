import React from "react";
import { FaCircle } from "react-icons/fa";

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
  isBusy,
}) {
  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3">
      <button
        onClick={() => onChange(!enabled)}
        className={`
          flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors w-full
          ${enabled
            ? "bg-red-500/20 border border-red-500/40 hover:bg-red-500/30"
            : "bg-BrandGray2/30 border border-BrandGray2/50 hover:bg-BrandGray2/50"
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
                    ? "bg-red-500/30 text-red-300 border border-red-500/40"
                    : "bg-BrandGray2/20 text-BrandGray hover:bg-BrandGray2/40 border border-transparent"
                  }
                  ${isBusy ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!enabled && (
        <p className="text-BrandGray text-[9px] font-DmSans mt-1 px-1 leading-tight">
          Record each player's movement one at a time
        </p>
      )}
    </div>
  );
}
