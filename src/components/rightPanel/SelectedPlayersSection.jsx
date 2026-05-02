import React from "react";
import { ImCheckboxChecked, ImCheckboxUnchecked } from "react-icons/im";
import { IoSaveOutline } from "react-icons/io5";

export default function SelectedPlayersSection({
  selectedPlayerIds = [],
  selectedItemIds = [],
  selectedPlayers = [],
  allPlayersDisplay,
  onAllPlayersDisplayChange,
  onSelectedPlayersColorChange,
  onSavePrefab,
}) {
  const selectedCount = selectedPlayerIds.length;
  const baseColor = allPlayersDisplay?.color ?? "#ef4444";
  const selectedBaseColor = selectedPlayers?.[0]?.color ?? baseColor;
  const showNumber = allPlayersDisplay?.showNumber ?? true;
  const showName = allPlayersDisplay?.showName ?? false;
  const hasMixedSelectedColors = selectedPlayers.some(
    (player) => (player?.color ?? baseColor) !== selectedBaseColor
  );

  const hasSelectedBall = (selectedItemIds || []).some((itemId) => String(itemId).startsWith("ball-"));
  const COLOR_OPTIONS = [
    { label: "Red", value: "#ef4444" },
    { label: "Blue", value: "#3b82f6" },
  ];

  const updateAllPlayersDisplay = (patch) =>
    onAllPlayersDisplayChange?.({ ...allPlayersDisplay, ...patch });

  const applyBulkColor = (hex) => {
    if (!selectedPlayerIds.length) return;
    onSelectedPlayersColorChange?.(hex, selectedPlayerIds);
  };

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-1.5 sm:pb-2 items-start justify-center gap-0.5">
      <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">
        Selected Players ({selectedCount})
      </div>

      <div className="flex flex-col w-full items-start justify-between gap-0.5 sm:gap-1 relative">
        <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans">Change Color:</p>
        <div className="w-full min-w-0 flex flex-row gap-1 sm:gap-1.5 px-0.5">
          {COLOR_OPTIONS.map((option) => {
            const isActive = !hasMixedSelectedColors && selectedBaseColor.toLowerCase() === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => applyBulkColor(option.value)}
                className={`flex-1 min-w-0 flex items-center justify-center gap-1 px-1 sm:px-1.5 py-1 sm:py-1.5 rounded-md transition-colors
                  ${isActive ? "bg-BrandBlack" : "bg-BrandBlack2 hover:bg-BrandBlack2/90"}`}
              >
                <span
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0"
                  style={{ backgroundColor: option.value }}
                />
                <span className={`truncate text-[10px] sm:text-xs font-DmSans ${isActive ? "text-BrandWhite" : "text-BrandGray"}`}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
        {hasMixedSelectedColors && (
          <div className="text-[9px] sm:text-[10px] text-BrandGray font-DmSans">Mixed colors selected</div>
        )}
      </div>

      <div className="flex flex-row w-full items-center justify-between">
        <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Show Label:</p>
        <button
          type="button"
          onClick={() => updateAllPlayersDisplay({ showNumber: !showNumber })}
          className="focus:outline-none cursor-pointer"
        >
          {showNumber ? (
            <ImCheckboxChecked className="text-BrandOrange w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          ) : (
            <ImCheckboxUnchecked className="text-BrandGray2 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          )}
        </button>
      </div>

      <div className="flex flex-row w-full items-center justify-between">
        <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Show Name:</p>
        <button
          type="button"
          onClick={() => updateAllPlayersDisplay({ showName: !showName })}
          className="focus:outline-none cursor-pointer"
        >
          {showName ? (
            <ImCheckboxChecked className="text-BrandOrange w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          ) : (
            <ImCheckboxUnchecked className="text-BrandGray2 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          )}
        </button>
      </div>


      {(selectedPlayerIds.length >= 2 || (selectedPlayerIds.length >= 1 && hasSelectedBall)) && onSavePrefab && (
        <button
          type="button"
          onClick={onSavePrefab}
          className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-BrandBlack2 text-BrandGray text-[10px] sm:text-xs font-DmSans font-semibold hover:bg-BrandBlack hover:text-BrandWhite active:brightness-90 transition-all cursor-pointer"
        >
          <IoSaveOutline className="text-sm shrink-0" aria-hidden />
          Save as Prefab
        </button>
      )}
    </div>
  );
}
