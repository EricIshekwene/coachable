import React, { useEffect, useState } from "react";
import { ImCheckboxChecked, ImCheckboxUnchecked } from "react-icons/im";

export default function SelectedPlayersSection({
  selectedPlayerIds = [],
  selectedPlayers = [],
  allPlayersDisplay,
  onAllPlayersDisplayChange,
  onSelectedPlayersColorChange,
}) {
  const selectedCount = selectedPlayerIds.length;
  const baseColor = allPlayersDisplay?.color ?? "#ef4444";
  const selectedBaseColor = selectedPlayers?.[0]?.color ?? baseColor;
  const showNumber = allPlayersDisplay?.showNumber ?? true;
  const showName = allPlayersDisplay?.showName ?? false;
  const hasMixedSelectedColors = selectedPlayers.some(
    (player) => (player?.color ?? baseColor) !== selectedBaseColor
  );

  const [selectedForBulk, setSelectedForBulk] = useState(() => new Set(selectedPlayerIds));
  const COLOR_OPTIONS = [
    { label: "Red", value: "#ef4444" },
    { label: "Blue", value: "#3b82f6" },
  ];

  useEffect(() => {
    setSelectedForBulk(new Set(selectedPlayerIds));
  }, [selectedPlayerIds]);

  const updateAllPlayersDisplay = (patch) =>
    onAllPlayersDisplayChange?.({ ...allPlayersDisplay, ...patch });

  const applyBulkColor = (hex) => {
    if (!selectedForBulk.size) return;
    onSelectedPlayersColorChange?.(hex, Array.from(selectedForBulk));
  };

  const toggleBulkSelection = (id) => {
    setSelectedForBulk((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-1.5 sm:pb-2 items-start justify-center gap-0.5">
      <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">
        Selected Players ({selectedCount})
      </div>

      <div className="flex flex-col w-full items-start justify-between gap-0.5 sm:gap-1 relative">
        <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans">Change Color:</p>
        <div className="w-full flex flex-row gap-1 sm:gap-1.5">
          {COLOR_OPTIONS.map((option) => {
            const isActive = !hasMixedSelectedColors && selectedBaseColor.toLowerCase() === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => applyBulkColor(option.value)}
                className={`flex-1 flex items-center justify-center gap-1 py-1 sm:py-1.5 rounded-md border transition-colors
                  ${isActive ? "border-BrandOrange bg-BrandBlack" : "border-BrandGray2 bg-BrandBlack2 hover:bg-BrandBlack2/90"}`}
              >
                <span
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-BrandGray"
                  style={{ backgroundColor: option.value }}
                />
                <span className={`text-[10px] sm:text-xs font-DmSans ${isActive ? "text-BrandWhite" : "text-BrandGray"}`}>
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
        <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Show Number:</p>
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

      <div className="w-full flex flex-col gap-1 pt-1">
        {selectedPlayers.map((player) => {
          if (!player) return null;
          const checked = selectedForBulk.has(player.id);
          return (
            <div
              key={player.id}
              className="w-full flex items-center justify-between bg-BrandBlack2 border border-BrandGray2 rounded-md px-1.5 py-1"
            >
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="text-BrandOrange text-[10px] sm:text-xs font-DmSans font-bold">
                  {player.number ?? ""}
                </span>
                <span className="text-BrandGray text-[10px] sm:text-xs font-DmSans truncate">
                  {player.name ?? ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleBulkSelection(player.id)}
                className="focus:outline-none cursor-pointer"
                aria-label="Toggle bulk selection"
              >
                {checked ? (
                  <ImCheckboxChecked className="text-BrandOrange w-3 h-3 sm:w-3.5 sm:h-3.5" />
                ) : (
                  <ImCheckboxUnchecked className="text-BrandGray2 w-3 h-3 sm:w-3.5 sm:h-3.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
