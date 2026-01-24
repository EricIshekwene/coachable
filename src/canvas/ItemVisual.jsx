import React from "react";
import whiteBall from "../assets/objects/balls/white_ball.png";

export default function ItemVisual({ item, allPlayersDisplay }) {
  switch (item.type) {
    case "player":
      {
        const sizePercent = allPlayersDisplay?.sizePercent ?? 100;
        // Default to showing player numbers unless explicitly turned off.
        const showNumber = allPlayersDisplay?.showNumber ?? true;
        const showName = allPlayersDisplay?.showName ?? false;
        const color = item.color || allPlayersDisplay?.color || "#ef4444";

        const basePx = 30;
        const sizePx = Math.max(6, Math.round((basePx * sizePercent) / 100));

        const numberText = item.number ?? "";
        const nameText = item.name ?? "";

        return (
          <div className="z-30 flex flex-col items-center select-none" style={{ pointerEvents: "none" }}>
            <div
              className="rounded-full border-[2px] border-BrandBlack flex items-center justify-center text-BrandBlack font-DmSans"
              style={{
                width: `${sizePx}px`,
                height: `${sizePx}px`,
                backgroundColor: color,
                fontSize: `${Math.max(10, Math.round(sizePx * 0.45))}px`,
                lineHeight: 1,
              }}
            >
              {showNumber && numberText !== "" && <span className="font-bold">{numberText}</span>}
            </div>

            {showName && nameText !== "" && (
              <div className="mt-1 text-BrandBlack font-DmSans font-semibold" style={{ fontSize: `${Math.max(9, Math.round(sizePx * 0.32))}px` }}>
                {nameText}
              </div>
            )}
          </div>
        );
      }
    case "ball":
      return (
        <img
          src={whiteBall}
          alt="white ball"
          className="z-30 w-[14px]"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          style={{ pointerEvents: "none" }}
        />
      );
    default:
      return null;
  }
}

