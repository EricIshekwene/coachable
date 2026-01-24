import React from "react";
import { PlayerButton } from "../subcomponents/Buttons.jsx";

export default function PlayerRow({ player, isSelected = false, onClick, onEdit, onDelete }) {
  if (!player) return null;
  return (
    <PlayerButton
      id={player.id}
      color={player.color}
      number={player.number}
      name={player.name}
      assignment={player.assignment}
      isSelected={isSelected}
      onClick={onClick}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

