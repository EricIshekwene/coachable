import React from "react";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";

export default function PlayerRow({ player, isSelected = false, onClick, onEdit, onDelete }) {
  if (!player) return null;
  const nameText = player.name ?? "";
  const assignmentText = player.assignment ?? "";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(player.id, { toggle: true })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.(player.id);
      }}
      className={`w-full flex flex-row rounded-sm items-center justify-between px-1 py-0.5 sm:py-1 transition-colors cursor-pointer
        ${isSelected ? "bg-BrandBlack border border-BrandOrange" : "bg-BrandBlack2 border border-transparent"}
        hover:bg-BrandBlack`}
    >
      {/* Color indicator */}
      <div
        className="w-3 h-3 sm:w-[14px] sm:h-[14px] md:w-4 md:h-4 rounded-full border-[0.25px] border-BrandBlack shrink-0"
        style={{ backgroundColor: player.color || "#ef4444" }}
      />

      {/* Number + optional label/assignment */}
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-1">
        <div className="w-full min-w-0 flex flex-row items-center justify-center gap-1">
          {/*
            Top row: number + name share identical typography.
            Name truncates with ellipsis when long.
          */}
          {(player.number ?? "") !== "" && (
            <span className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans font-semibold leading-none shrink-0">
              {player.number}
            </span>
          )}
          {(player.number ?? "") !== "" && nameText !== "" && (
            <span className="text-BrandGray text-[10px] sm:text-xs md:text-sm leading-none shrink-0">•</span>
          )}
          {nameText !== "" && (
            <span className="text-BrandWhite text-xs sm:text-sm md:text-sm font-DmSans font-semibold leading-none min-w-0 truncate">
              {nameText}
            </span>
          )}
        </div>

        {assignmentText !== "" && (
          <p className="text-BrandGray text-[7px] sm:text-[8px] md:text-[10px] font-DmSans leading-none truncate w-full text-center">
            {assignmentText}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-row justify-center items-center gap-0.5 sm:gap-1 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(player.id);
          }}
          className="text-BrandOrange text-xs sm:text-sm md:text-base"
          aria-label="Edit player"
        >
          <FiEdit />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(player.id);
          }}
          className="text-BrandOrange text-xs sm:text-sm md:text-base"
          aria-label="Delete player"
        >
          <MdDeleteOutline />
        </button>
      </div>
    </div>
  );
}
