import React from "react";
import { IoSaveOutline } from "react-icons/io5";

export default function SavePrefabButton() {
  return (
    <div className="w-full py-1 sm:py-1.5 md:py-2 border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4">
      <button
        type="button"
        title="Save current frame as prefab"
        className="w-full flex flex-col border-[0.5px] border-BrandGray2 justify-center bg-BrandBlack2 py-2 sm:py-2.5 px-2 sm:px-2.5 md:px-3 rounded-md items-center gap-1 sm:gap-1.5 cursor-pointer hover:bg-BrandBlack transition-colors duration-200"
      >
        <IoSaveOutline className="text-BrandWhite text-base sm:text-lg md:text-xl shrink-0" aria-hidden />
        <span className="text-BrandWhite text-[10px] sm:text-xs font-bold font-DmSans text-center leading-tight break-words min-w-0">
          Save Current Frame as Prefab
        </span>
      </button>
    </div>
  );
}
