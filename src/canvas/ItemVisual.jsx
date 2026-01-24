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
          <div
            className="z-30 rounded-full border-[2px] border-BrandBlack flex items-center justify-center text-BrandBlack font-DmSans select-none"
            style={{
              pointerEvents: "none",
              width: `${sizePx}px`,
              height: `${sizePx}px`,
              backgroundColor: color,
              fontSize: `${Math.max(10, Math.round(sizePx * 0.45))}px`,
              lineHeight: 1,
            }}
          >
            <div className="flex flex-col items-center justify-center">
              {showNumber && numberText !== "" && <span className="font-bold">{numberText}</span>}
              {showName && nameText !== "" && (
                <span style={{ fontSize: `${Math.max(8, Math.round(sizePx * 0.3))}px` }}>
                  {nameText}
                </span>
              )}
            </div>
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

