import React from 'react';

/**
 * KeyframeManager - Button to add or delete keyframes
 */
export default function KeyframeManager({
  selectedKeyframe,
  onAddKeyframe,
  onDeleteKeyframe,
  variant = "default",
}) {
  const isTest = variant === "test";
  return (
    <div
      onClick={selectedKeyframe !== null ? onDeleteKeyframe : onAddKeyframe}
      className={`w-200/641 bg-BrandOrange flex flex-row items-center justify-center rounded-xl cursor-pointer ${
        isTest
          ? "h-5 sm:h-6 md:h-7 lg:h-8 px-2 sm:px-3"
          : "h-4 sm:h-5.5 md:h-6 lg:h-8 px-[6.25px] sm:px-[9.375px]"
      }`}
    >
      <p
        className={`text-BrandBlack font-DmSans ${
          isTest
            ? "text-[11px] sm:text-[12px] md:text-[13px] lg:text-[15px]"
            : "text-[10px] sm:text-[12px] md:text-[15px] lg:text-[17.5px]"
        }`}
      >
        {selectedKeyframe !== null ? "Delete Keyframe" : "Add Keyframe"}
      </p>
    </div>
  );
}
