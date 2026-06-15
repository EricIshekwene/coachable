import React, { useEffect, useRef } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import PlayerRow from "./PlayerRow";

const BLUE = "#3b82f6";

export default function PlayersSection({
  playersById,
  representedPlayerIds,
  selectedPlayerIds,
  onSelectPlayer,
  onEditPlayer,
  onDeletePlayer,
  onTogglePlayerHidden,
  onToggleColorHidden,
}) {
  const ids = representedPlayerIds || [];
  const count = ids.length;
  const rowRefs = useRef(new Map());

  const bluePlayers = ids
    .map((id) => playersById?.[id])
    .filter((p) => p?.color === BLUE);
  const allBlueHidden = bluePlayers.length > 0 && bluePlayers.every((p) => p.hidden);

  useEffect(() => {
    const targetId = selectedPlayerIds?.[0];
    if (!targetId) return;
    if (!ids.includes(targetId)) return;

    const node = rowRefs.current.get(targetId);
    if (!node) return;

    const frame = window.requestAnimationFrame(() => {
      node.scrollIntoView({ block: "nearest" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedPlayerIds, ids]);

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center ">
      <div className="w-full flex flex-row items-center justify-between">
        <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">Players ({count})</div>
        {bluePlayers.length > 0 && (
          <button
            type="button"
            onClick={() => onToggleColorHidden?.(BLUE)}
            className="flex flex-row items-center gap-0.5 text-[#3b82f6] text-[9px] sm:text-[10px] md:text-xs font-DmSans hover:opacity-80 transition-opacity"
            aria-label={allBlueHidden ? "Show blue players" : "Hide blue players"}
          >
            {allBlueHidden ? <FiEye className="shrink-0" /> : <FiEyeOff className="shrink-0" />}
            <span>{allBlueHidden ? "Show" : "Hide"} Blue</span>
          </button>
        )}
      </div>

      <div className="flex flex-col w-full items-start justify-start gap-0.5 sm:gap-1 mt-1 sm:mt-1.5 md:mt-2 max-h-[140px] overflow-y-auto hide-scroll">
        {ids.map((id) => {
          const player = playersById?.[id];
          if (!player) return null;
          return (
            <div
              key={id}
              ref={(node) => {
                if (node) rowRefs.current.set(id, node);
                else rowRefs.current.delete(id);
              }}
              className="w-full"
            >
              <PlayerRow
                player={player}
                isSelected={selectedPlayerIds?.includes(id)}
                onClick={(meta) => onSelectPlayer?.(id, meta)}
                onEdit={onEditPlayer}
                onDelete={onDeletePlayer}
                onToggleHidden={onTogglePlayerHidden}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
