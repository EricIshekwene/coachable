import React from "react";
import PlayerRow from "./PlayerRow";

export default function PlayersSection({
  playersById,
  representedPlayerIds,
  selectedPlayerId,
  onSelectPlayer,
  onEditPlayer,
  onDeletePlayer,
}) {
  const ids = representedPlayerIds || [];
  const count = ids.length;

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center ">
      <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">Players ({count})</div>

      <div className="flex flex-col w-full items-start justify-start gap-0.5 sm:gap-1 mt-1 sm:mt-1.5 md:mt-2 max-h-[140px] overflow-y-auto">
        {ids.map((id) => {
          const player = playersById?.[id];
          if (!player) return null;
          return (
            <PlayerRow
              key={id}
              player={player}
              isSelected={selectedPlayerId === id}
              onClick={() => onSelectPlayer?.(id)}
              onEdit={onEditPlayer}
              onDelete={onDeletePlayer}
            />
          );
        })}
      </div>
    </div>
  );
}
