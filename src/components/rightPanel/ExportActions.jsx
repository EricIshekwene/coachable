import React from "react";
import { BsBookmarkPlus } from "react-icons/bs";
import { IoMdDownload } from "react-icons/io";

export default function ExportActions({ onSaveToPlaybook, onDownload }) {
  return (
    <div className="w-full flex flex-col gap-1 sm:gap-1.5">
      <button
        type="button"
        onClick={() => onSaveToPlaybook?.()}
        className="w-full flex flex-row justify-evenly items-center bg-BrandOrange text-BrandBlack font-bold text-[10px] sm:text-xs md:text-sm font-DmSans rounded-md py-0.5 sm:py-1"
      >
        <BsBookmarkPlus className="text-BrandBlack text-sm sm:text-base md:text-lg" />
        <p className="text-BrandBlack text-[10px] sm:text-xs md:text-sm font-DmSans">Save to Playbook</p>
      </button>

      <button
        type="button"
        onClick={() => onDownload?.()}
        className="w-full flex flex-row justify-evenly items-center bg-BrandOrange text-BrandBlack font-bold text-[10px] sm:text-xs md:text-sm font-DmSans rounded-md py-0.5 sm:py-1"
      >
        <IoMdDownload className="text-BrandBlack text-sm sm:text-base md:text-lg" />
        <p className="text-BrandBlack text-[10px] sm:text-xs md:text-sm font-DmSans">Download</p>
      </button>
    </div>
  );
}

