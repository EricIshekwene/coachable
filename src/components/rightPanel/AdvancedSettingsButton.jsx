import React from "react";
import { IoSettingsOutline } from "react-icons/io5";

export default function AdvancedSettingsButton({ isOpen = false, onOpen }) {
  return (
    <div className="w-full py-1 sm:py-1.5 md:py-2 border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4">
      <button
        onClick={() => onOpen?.()}
        className={`w-full flex flex-row border-[0.5px] border-BrandGray2 justify-evenly ${isOpen ? "bg-BrandBlack" : "bg-BrandBlack2"
          } py-1.5 sm:py-2 px-2 sm:px-2.5 md:px-3 rounded-md items-center gap-0.5 sm:gap-1 cursor-pointer hover:bg-BrandBlack transition-colors duration-200`}
      >
        <IoSettingsOutline className="text-BrandWhite text-sm sm:text-base md:text-lg" />
        <p className="text-BrandWhite text-[10px] sm:text-xs font-bold font-DmSans">Advanced Settings</p>
      </button>
    </div>
  );
}

