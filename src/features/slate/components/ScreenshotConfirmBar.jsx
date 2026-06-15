import React from "react";
import { FaCheck, FaTimes } from "react-icons/fa";

export default function ScreenshotConfirmBar({ hasRegion, onConfirm, onCancel }) {
  return (
    <div
      className="
        absolute top-4 left-1/2 -translate-x-1/2
        flex items-center gap-2 sm:gap-3
        bg-BrandBlack border border-BrandGray2
        rounded-full px-3 sm:px-4 py-1.5 sm:py-2
        select-none z-50
        shadow-lg
      "
    >
      <span className="text-white text-[10px] sm:text-xs md:text-sm font-DmSans whitespace-nowrap">
        {hasRegion ? "Capture this region?" : "Draw a region to capture"}
      </span>

      {hasRegion && (
        <>
          <button
            type="button"
            onClick={onConfirm}
            className="
              flex items-center justify-center
              w-6 h-6 sm:w-7 sm:h-7
              rounded-full bg-green-600 hover:bg-green-500
              text-white text-xs sm:text-sm
              transition-colors
            "
            title="Capture screenshot"
          >
            <FaCheck />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="
              flex items-center justify-center
              w-6 h-6 sm:w-7 sm:h-7
              rounded-full bg-red-600 hover:bg-red-500
              text-white text-xs sm:text-sm
              transition-colors
            "
            title="Cancel screenshot"
          >
            <FaTimes />
          </button>
        </>
      )}

      {!hasRegion && (
        <button
          type="button"
          onClick={onCancel}
          className="
            flex items-center justify-center
            w-6 h-6 sm:w-7 sm:h-7
            rounded-full bg-BrandGray2 hover:bg-BrandGray
            text-white text-xs sm:text-sm
            transition-colors
          "
          title="Cancel"
        >
          <FaTimes />
        </button>
      )}
    </div>
  );
}
