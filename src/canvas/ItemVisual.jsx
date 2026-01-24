import React from "react";
import whiteBall from "../assets/objects/balls/white_ball.png";

export default function ItemVisual({ item }) {
  switch (item.type) {
    case "player":
      return (
        <div
          className="z-30 aspect-square w-[30px] bg-red-500 border-[2px] border-BrandBlack rounded-full"
          style={{ pointerEvents: "none" }}
        />
      );
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

