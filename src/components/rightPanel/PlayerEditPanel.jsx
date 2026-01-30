import React, { useEffect, useRef } from "react";
import { IoClose } from "react-icons/io5";

export default function PlayerEditPanel({
  isOpen,
  player,
  draft,
  onChange,
  onClose,
  onSave,
}) {
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      firstInputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const nameValue = draft?.name ?? player?.name ?? "";
  const numberValue = draft?.number ?? player?.number ?? "";
  const assignmentValue = draft?.assignment ?? player?.assignment ?? "";

  return (
    <aside
      className="absolute right-0 top-0 h-screen w-48 sm:w-56 md:w-64 bg-BrandBlack border-l border-BrandGray2/60 shadow-2xl z-[60] flex flex-col"
      role="dialog"
      aria-label="Edit player"
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-BrandGray2/60">
        <p className="text-BrandOrange text-sm sm:text-base font-DmSans font-semibold">Edit Player</p>
        <button
          type="button"
          onClick={onClose}
          className="text-BrandOrange text-lg"
          aria-label="Close edit panel"
        >
          <IoClose />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-BrandOrange text-xs sm:text-sm">Number</span>
          <input
            ref={firstInputRef}
            type="text"
            value={numberValue}
            onChange={(e) => onChange?.({ number: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave?.();
              if (e.key === "Escape") onClose?.();
            }}
            className="w-full h-8 sm:h-9 bg-BrandBlack border-[0.5px] border-BrandGray text-BrandWhite rounded-md px-2 text-xs sm:text-sm focus:outline-none focus:border-BrandOrange transition-colors"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-BrandOrange text-xs sm:text-sm">Name</span>
          <input
            type="text"
            value={nameValue}
            onChange={(e) => onChange?.({ name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave?.();
              if (e.key === "Escape") onClose?.();
            }}
            className="w-full h-8 sm:h-9 bg-BrandBlack border-[0.5px] border-BrandGray text-BrandWhite rounded-md px-2 text-xs sm:text-sm focus:outline-none focus:border-BrandOrange transition-colors"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-BrandOrange text-xs sm:text-sm">Assignment</span>
          <input
            type="text"
            value={assignmentValue}
            onChange={(e) => onChange?.({ assignment: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave?.();
              if (e.key === "Escape") onClose?.();
            }}
            className="w-full h-8 sm:h-9 bg-BrandBlack border-[0.5px] border-BrandGray text-BrandWhite rounded-md px-2 text-xs sm:text-sm focus:outline-none focus:border-BrandOrange transition-colors"
          />
        </label>
      </div>

      <div className="px-3 pb-3 pt-2 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-8 sm:h-9 border border-BrandGray text-BrandWhite rounded-md text-xs sm:text-sm font-DmSans"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex-1 h-8 sm:h-9 bg-BrandOrange text-BrandBlack rounded-md text-xs sm:text-sm font-DmSans font-semibold hover:bg-BrandOrange/90 transition-colors"
        >
          Save
        </button>
      </div>
    </aside>
  );
}
