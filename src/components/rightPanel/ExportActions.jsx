import React from "react";
import { BsBookmarkPlus } from "react-icons/bs";
import { IoMdDownload } from "react-icons/io";
import { FiUpload } from "react-icons/fi";

const actionButtonClass = `
  w-full flex flex-row items-center justify-center gap-2
  bg-BrandOrange text-BrandBlack font-DmSans font-semibold
  text-[10px] sm:text-xs md:text-sm
  rounded-lg py-2 sm:py-2.5 px-3
  border border-BrandOrange/80
  transition-all duration-200
  hover:bg-BrandOrange/95 hover:border-BrandOrange
  active:scale-[0.98] active:bg-BrandOrange/90
  focus:outline-none focus-visible:ring-2 focus-visible:ring-BrandOrange focus-visible:ring-offset-2 focus-visible:ring-offset-BrandBlack
`;

export default function ExportActions({ onSaveToPlaybook, onDownload, onImport }) {
  return (
    <div className="w-full flex flex-col gap-2">
      <button
        type="button"
        onClick={() => onSaveToPlaybook?.()}
        className={actionButtonClass}
      >
        <BsBookmarkPlus className="text-BrandBlack shrink-0 text-base sm:text-lg md:text-xl" aria-hidden />
        <span>Save to Playbook</span>
      </button>

      <button
        type="button"
        onClick={() => onDownload?.()}
        className={actionButtonClass}
      >
        <IoMdDownload className="text-BrandBlack shrink-0 text-base sm:text-lg md:text-xl" aria-hidden />
        <span>Download</span>
      </button>

      <button
        type="button"
        onClick={() => onImport?.()}
        className={actionButtonClass}
      >
        <FiUpload className="text-BrandBlack shrink-0 text-base sm:text-lg md:text-xl" aria-hidden />
        <span>Import</span>
      </button>
    </div>
  );
}
