import React from "react";

export default function ExportOverlay({ progress = 0, visible, error, onDismissError }) {
  if (!visible) return null;

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 pointer-events-auto">
        <div className="bg-BrandBlack border border-red-500/60 rounded-xl w-72 sm:w-80 p-6 flex flex-col gap-4 items-center shadow-2xl">
          <span className="text-red-400 font-DmSans font-semibold text-sm sm:text-base">
            Export Failed
          </span>

          <p className="text-white/70 font-DmSans text-xs text-center leading-relaxed max-h-24 overflow-y-auto w-full">
            {error}
          </p>

          <span className="text-white/40 font-DmSans text-[10px] text-center">
            Check Advanced Settings → Debug Logs → Copy Video Export Debug for details
          </span>

          <button
            type="button"
            onClick={onDismissError}
            className="w-full py-2 rounded-lg bg-BrandGray2 text-white font-DmSans font-semibold text-xs sm:text-sm hover:bg-BrandGray transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Progress state
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 pointer-events-auto">
      <div className="bg-BrandBlack border border-BrandGray2 rounded-xl w-72 sm:w-80 p-6 flex flex-col gap-4 items-center shadow-2xl">
        <span className="text-white font-DmSans font-semibold text-sm sm:text-base">
          Exporting video…
        </span>

        {/* Progress bar */}
        <div className="w-full h-2.5 bg-BrandGray2 rounded-full overflow-hidden">
          <div
            className="h-full bg-BrandOrange rounded-full transition-[width] duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>

        <span className="text-white/60 font-DmSans text-xs">{pct}%</span>
      </div>
    </div>
  );
}
