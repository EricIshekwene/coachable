import React from "react";
import { FaFootballBall } from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";
import coneIcon from "../../assets/objects/cone.png";

export default function ObjectsSection({
  ballsById,
  selectedItemIds,
  onSelectItem,
  onDeleteBall,
}) {
  const ballIds = Object.keys(ballsById || {});
  const count = ballIds.length;
  const canDelete = count > 1;

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center">
      <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">
        Objects ({count})
      </div>

      <div className="flex flex-col w-full items-start justify-start gap-0.5 sm:gap-1 mt-1 sm:mt-1.5 md:mt-2 max-h-[140px] overflow-y-auto hide-scroll">
        {ballIds.map((id) => {
          const ball = ballsById[id];
          if (!ball) return null;
          const objectType = ball.objectType === "cone" ? "cone" : "ball";
          const isSelected = selectedItemIds?.includes(id);

          return (
            <div
              key={id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectItem?.(id, "ball", { mode: "toggle" })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectItem?.(id, "ball", { mode: "toggle" });
              }}
              className={`w-full flex flex-row rounded-sm items-center justify-between px-1 py-0.5 sm:py-1 transition-colors cursor-pointer
                ${isSelected ? "bg-BrandBlack border border-BrandOrange" : "bg-BrandBlack2 border border-transparent"}
                hover:bg-BrandBlack`}
            >
              {objectType === "cone" ? (
                <img src={coneIcon} alt="Cone" className="h-3 w-3 sm:h-3.5 sm:w-3.5 object-contain shrink-0" />
              ) : (
                <FaFootballBall className="text-BrandOrange text-xs sm:text-sm shrink-0" />
              )}

              <div className="flex-1 min-w-0 flex items-center justify-center px-1">
                <span className="text-BrandWhite text-xs sm:text-sm font-DmSans font-semibold leading-none">
                  {objectType === "cone" ? "Cone" : "Ball"}
                </span>
              </div>

              <div className="flex flex-row justify-center items-center shrink-0">
                {canDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBall?.(id);
                    }}
                    className="text-BrandOrange text-xs sm:text-sm md:text-base"
                    aria-label={`Delete ${objectType}`}
                  >
                    <MdDeleteOutline />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
