import React, { useEffect, useRef } from "react";
import { IoClose } from "react-icons/io5";
import { POPUP_DENSE_INPUT_CLASS } from "../subcomponents/popupStyles";

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
  return (
    <aside
      className="absolute right-0 top-0 h-screen w-48 sm:w-56 md:w-64 bg-BrandBlack border-l border-BrandGray2/80 shadow-[0_18px_38px_-18px_rgba(0,0,0,0.95)] z-[60] flex flex-col"
      role="dialog"
      aria-label="Edit player"
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-BrandGray2/80">
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
          <span className="text-BrandOrange text-xs sm:text-sm font-DmSans">Number</span>
          <input
            ref={firstInputRef}
            type="text"
            value={numberValue}
            onChange={(e) => onChange?.({ number: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave?.();
              if (e.key === "Escape") onClose?.();
            }}
            className={POPUP_DENSE_INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-BrandOrange text-xs sm:text-sm font-DmSans">Name</span>
          <input
            type="text"
            value={nameValue}
            onChange={(e) => onChange?.({ name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave?.();
              if (e.key === "Escape") onClose?.();
            }}
            className={POPUP_DENSE_INPUT_CLASS}
          />
        </label>
      </div>

      <div className="px-3 pb-3 pt-2 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-8 sm:h-9 border border-BrandGray text-BrandWhite rounded-md text-xs sm:text-sm font-DmSans transition-colors hover:bg-BrandBlack2"
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
