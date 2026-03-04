import React from "react";

export default function ExportOverlay({ progress = 0, visible }) {
  if (!visible) return null;

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
