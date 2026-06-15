import React from "react";
import { FaTimes } from "react-icons/fa";

/**
 * Top-of-screen 3-2-1 countdown bar shown before recording starts.
 * Does not block canvas interaction (pointer-events-none on wrapper).
 */
export default function RecordingCountdown({ value, playerName, onCancel }) {
  if (value == null) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[80] pointer-events-auto">
      <div
        key={value}
        className="bg-BrandBlack/95 border border-red-500/40 rounded-xl px-5 py-3 flex items-center gap-4 shadow-lg backdrop-blur-sm animate-countdown-pop"
      >
        {/* Countdown number */}
        <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center shrink-0">
          <span className="text-red-400 text-2xl font-DmSans font-bold tabular-nums">
            {value}
          </span>
        </div>

        {/* Label */}
        <div className="flex flex-col">
          <span className="text-white text-sm font-DmSans font-medium">
            Recording in {value}...
          </span>
          {playerName && (
            <span className="text-red-400 text-xs font-DmSans">{playerName}</span>
          )}
        </div>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="ml-2 w-7 h-7 flex items-center justify-center rounded-lg bg-BrandGray2/40 hover:bg-red-500/30 text-BrandGray hover:text-red-400 transition-colors shrink-0"
          title="Cancel"
        >
          <FaTimes className="text-[10px]" />
        </button>
      </div>

      <style>{`
        @keyframes countdown-pop {
          0% { transform: scale(0.85); opacity: 0; }
          40% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-countdown-pop {
          animation: countdown-pop 0.35s ease-out;
        }
      `}</style>
    </div>
  );
}
