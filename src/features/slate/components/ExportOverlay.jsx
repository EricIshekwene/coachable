import React from "react";
import {
  POPUP_BLOCKING_OVERLAY_CLASS,
  POPUP_SECONDARY_BUTTON_CLASS,
  POPUP_SURFACE_CLASS,
  POPUP_TITLE_CLASS,
} from "./subcomponents/popupStyles";

export default function ExportOverlay({ progress = 0, visible, error, onDismissError }) {
  if (!visible) return null;

  // Error state
  if (error) {
    return (
      <div className={POPUP_BLOCKING_OVERLAY_CLASS}>
        <div className={`${POPUP_SURFACE_CLASS} border-red-500/60 w-72 sm:w-80 p-6 flex flex-col gap-4 items-center`}>
          <span className={`${POPUP_TITLE_CLASS} text-red-300`}>Export Failed</span>

          <p className="text-white/70 font-DmSans text-xs text-center leading-relaxed max-h-24 overflow-y-auto w-full">
            {error}
          </p>

          <span className="text-white/40 font-DmSans text-[10px] text-center">
            Check Advanced Settings -&gt; Debug Logs -&gt; Copy Video Export Debug for details
          </span>

          <button
            type="button"
            onClick={onDismissError}
            className={POPUP_SECONDARY_BUTTON_CLASS}
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
    <div className={POPUP_BLOCKING_OVERLAY_CLASS}>
      <div className={`${POPUP_SURFACE_CLASS} w-72 sm:w-80 p-6 flex flex-col gap-4 items-center`}>
        <span className={POPUP_TITLE_CLASS}>Exporting video...</span>

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
