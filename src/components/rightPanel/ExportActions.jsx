import React from "react";
import { BsBookmarkPlus } from "react-icons/bs";
import { MdCameraAlt, MdVideocam } from "react-icons/md";

const actionButtonClass = `
  group flex flex-row items-center gap-2 sm:gap-2.5
  bg-BrandBlack2 text-BrandWhite font-DmSans font-medium
  text-[10px] sm:text-xs md:text-sm
  rounded-lg py-2 sm:py-2.5 px-2.5 sm:px-3
  border border-BrandGray2
  shadow-[0_1px_0_rgba(0,0,0,0.35)]
  transition-all duration-200
  hover:-translate-y-[1px] hover:bg-BrandBlack hover:border-BrandOrange/60 hover:shadow-[0_6px_14px_rgba(0,0,0,0.35)]
  active:translate-y-0 active:scale-[0.99]
  focus:outline-none focus-visible:ring-2 focus-visible:ring-BrandOrange focus-visible:ring-offset-2 focus-visible:ring-offset-BrandBlack
`;

const fullWidthActionButtonClass = `${actionButtonClass} w-full`;

const iconWrapClass = `
  shrink-0 flex items-center justify-center
  h-5 w-5 sm:h-6 sm:w-6 rounded-md
  border border-BrandGray2 bg-BrandBlack
  text-BrandOrange
  transition-colors duration-200
  group-hover:border-BrandOrange/70
`;

const iconClass = "text-sm sm:text-base";

export default function ExportActions({
  onSaveToPlaybook,
  onScreenshot,
  onVideoExport,
  adminMode = false,
}) {
  return (
    <div className="w-full flex flex-col gap-2">
      <button
        type="button"
        onClick={() => onSaveToPlaybook?.()}
        className={fullWidthActionButtonClass}
      >
        <span className={iconWrapClass}>
          <BsBookmarkPlus className={iconClass} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate">Save to Playbook</span>
      </button>

      {adminMode && (
        <button
          type="button"
          onClick={() => onScreenshot?.()}
          className={fullWidthActionButtonClass}
        >
          <span className={iconWrapClass}>
            <MdCameraAlt className={iconClass} aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate">Photo</span>
        </button>
      )}

      {adminMode && (
        <button
          type="button"
          onClick={() => onVideoExport?.()}
          className={fullWidthActionButtonClass}
        >
          <span className={iconWrapClass}>
            <MdVideocam className={iconClass} aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate">Video</span>
        </button>
      )}
    </div>
  );
}
