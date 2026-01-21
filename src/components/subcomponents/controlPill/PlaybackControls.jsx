import React from 'react';
import { IoPlayOutline } from "react-icons/io5";
import { IoPlaySkipForwardOutline, IoPlaySkipBackOutline } from "react-icons/io5";

/**
 * PlaybackControls - Play/pause and skip buttons
 */
export default function PlaybackControls({
  isPlaying,
  onPlayToggle,
  onSkipBack,
  onSkipForward,
}) {
  return (
    <div className="flex flex-row items-center gap-[3.125px] sm:gap-[6.25px] justify-between">
      <div 
        onClick={onSkipBack}
        className="h-[16px] sm:h-[22px] md:h-[24px] lg:h-[32px] w-[16px] sm:w-[22px] md:w-[24px] lg:w-[32px] bg-BrandBlack2 border-[0.625px] border-BrandGray flex items-center justify-center rounded-sm cursor-pointer"
      >
        <IoPlaySkipBackOutline className="text-BrandOrange text-[17.5px] sm:text-[20px] md:text-[22.5px] lg:text-[25px]" />
      </div>
      <div
        onClick={onPlayToggle}
        className="h-[37.5px] w-[37.5px] sm:h-[43.75px] sm:w-[43.75px] md:h-[50px] md:w-[50px] bg-BrandOrange flex items-center justify-center rounded-lg cursor-pointer"
      >
        {isPlaying ? (
          <svg
            width="22.5"
            height="22.5"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-BrandBlack"
          >
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <IoPlayOutline className="text-BrandBlack text-[22.5px] sm:text-[22.5px] md:text-[25px] lg:text-[31.25px]" />
        )}
      </div>
      <div 
        onClick={onSkipForward}
        className="h-[16px] sm:h-[22px] md:h-[24px] lg:h-[32px] w-[16px] sm:w-[22px] md:w-[24px] lg:w-[32px] bg-BrandBlack2 border-[0.625px] border-BrandGray flex items-center justify-center rounded-sm cursor-pointer"
      >
        <IoPlaySkipForwardOutline className="text-BrandOrange text-[17.5px] sm:text-[20px] md:text-[22.5px] lg:text-[25px]" />
      </div>
    </div>
  );
}
