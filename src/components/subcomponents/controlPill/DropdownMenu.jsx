import React from 'react';
import { FaChevronDown, FaTimes } from "react-icons/fa";
import { BiUndo } from "react-icons/bi";
import { BiRedo } from "react-icons/bi";
import { FaRegTrashCan } from "react-icons/fa6";

/**
 * DropdownMenu - Settings dropdown with trash, undo, redo, and autoplay controls
 */
export default function DropdownMenu({
  isOpen,
  onToggle,
  onTrash,
  onUndo,
  onRedo,
  autoplayEnabled,
  onAutoplayToggle,
  canUndo,
  canRedo,
}) {
  if (!isOpen) {
    return (
      <div
        onClick={onToggle}
        className="absolute top-[97.5%] select-none left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[25px] w-[25px] bg-BrandBlack rounded-full border-[0.625px] border-BrandGray flex items-center justify-center cursor-pointer hover:bg-BrandBlack2 transition-colors"
      >
        <FaChevronDown className="text-BrandOrange text-[12.5px] sm:text-[12.5px] md:text-[12.5px] font-DmSans" />
      </div>
    );
  }

  return (
    <div className="absolute top-[96.5%] left-1/2 select-none transform -translate-x-1/2 -translate-y-1/2 h-[40px] bg-BrandBlack rounded-full border-[0.625px] border-BrandGray flex items-center gap-[12px] px-[12px]">
      {/* Trash icon */}
      <FaRegTrashCan
        onClick={onTrash}
        className="text-BrandOrange text-[12.5px] sm:text-[12.5px] md:text-[18px] font-DmSans cursor-pointer hover:opacity-80 transition-opacity"
      />

      {/* Undo icon */}
      <BiUndo
        onClick={onUndo}
        className={`text-BrandOrange text-[12.5px] sm:text-[12.5px] md:text-[18px] font-DmSans cursor-pointer hover:opacity-80 transition-opacity ${!canUndo ? 'opacity-50 cursor-not-allowed' : ''}`}
      />

      {/* Redo icon */}
      <BiRedo
        onClick={onRedo}
        className={`text-BrandOrange text-[12.5px] sm:text-[12.5px] md:text-[18px] font-DmSans cursor-pointer hover:opacity-80 transition-opacity ${!canRedo ? 'opacity-50 cursor-not-allowed' : ''}`}
      />

      {/* Autoplay pill switch */}
      <div className="flex items-center gap-[8px]">
        <span className="text-BrandGray text-[10px] sm:text-[12px] md:text-[14px] font-DmSans whitespace-nowrap">Autoplay</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAutoplayToggle();
          }}
          className={`relative w-[40px] h-[20px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${autoplayEnabled ? 'bg-BrandOrange' : 'bg-BrandGray'
            }`}
          aria-label="Toggle autoplay"
        >
          <span
            className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 w-[16px] h-[16px] bg-BrandBlack rounded-full shadow-sm ${autoplayEnabled ? 'translate-x-[22px]' : 'translate-x-[4px]'
              }`}
          />
        </button>
      </div>

      {/* Close button (X) */}
      <FaTimes
        onClick={onToggle}
        className="text-BrandOrange text-[14px] sm:text-[14px] md:text-[18px] font-DmSans cursor-pointer hover:opacity-80 transition-opacity ml-[4px]"
      />
    </div>
  );
}
