import React, { useEffect, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";

export default function SavePrefabModal({ open, onClose, onSave }) {
  const [name, setName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave?.(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative bg-BrandBlack border border-BrandGray2 rounded-xl w-72 sm:w-80 p-5 flex flex-col gap-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-BrandGray hover:text-BrandWhite transition-colors"
          aria-label="Close"
        >
          <FaTimes className="text-sm" />
        </button>

        <h2 className="text-BrandWhite font-DmSans font-bold text-sm sm:text-base">
          Save as Prefab
        </h2>

        <div className="flex flex-col gap-1.5">
          <label className="text-BrandGray text-xs font-DmSans">Prefab Name</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. My Lineout"
            className="w-full h-9 bg-BrandBlack2 border border-BrandGray rounded-md px-3 text-BrandWhite text-sm font-DmSans focus:outline-none focus:border-BrandOrange transition-colors"
            maxLength={50}
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full py-2 rounded-lg bg-BrandOrange text-BrandBlack font-DmSans font-semibold text-sm hover:bg-BrandOrange/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save Prefab
        </button>
      </div>
    </div>
  );
}
