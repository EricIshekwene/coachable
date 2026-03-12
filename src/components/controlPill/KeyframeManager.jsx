import React from 'react';

/**
 * KeyframeManager - Button to add or delete keyframes
 */
export default function KeyframeManager({
  selectedKeyframe,
  onAddKeyframe,
  onDeleteKeyframe,
}) {
  return (
    <div
      onClick={selectedKeyframe !== null ? onDeleteKeyframe : onAddKeyframe}
      className="w-200/641 h-[16px] sm:h-[22px] md:h-[24px] lg:h-[32px] bg-BrandOrange flex flex-row items-center justify-center rounded-xl px-[6.25px] sm:px-[9.375px] cursor-pointer"
    >
      <p className="text-BrandBlack text-[10px] sm:text-[12px] md:text-[15px] lg:text-[17.5px] font-DmSans">
        {selectedKeyframe !== null ? "Delete Keyframe" : "Add Keyframe"}
      </p>
    </div>
  );
}
