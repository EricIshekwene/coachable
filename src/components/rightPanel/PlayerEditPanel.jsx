import React, { useEffect, useRef } from "react";
import { IoClose } from "react-icons/io5";
import { POPUP_DENSE_INPUT_CLASS } from "../subcomponents/popupStyles";
import { SPORT_DEFAULTS, SPORT_POSITION_PRESETS } from "../../features/slate/hooks/useAdvancedSettings";

/**
 * Panel for editing a player's label/number and name. Changes auto-save on
 * every keystroke / preset tap. For position-label sports (Football, Soccer,
 * Lacrosse), shows categorized quick-select preset buttons and labels the
 * field "Label". For number-based sports, shows the standard "Number" field.
 */
export default function PlayerEditPanel({
  isOpen,
  player,
  draft,
  onChange,
  onClose,
  fieldType = "Rugby",
}) {
  const firstInputRef = useRef(null);
  const nameTextareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      firstInputRef.current?.focus();
    }
  }, [isOpen]);

  const nameValue = draft?.name ?? player?.name ?? "";

  useEffect(() => {
    const el = nameTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [nameValue]);

  if (!isOpen) return null;

  const numberValue = draft?.number ?? player?.number ?? "";
  const sportCfg = SPORT_DEFAULTS[fieldType] || {};
  const useLabels = Boolean(sportCfg.usePositionLabels);
  const presetGroups = SPORT_POSITION_PRESETS[fieldType] || [];
  const labelText = useLabels ? "Label" : "Number";

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
          className="text-BrandOrange text-lg cursor-pointer"
          aria-label="Close edit panel"
        >
          <IoClose />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-BrandOrange text-xs sm:text-sm font-DmSans">{labelText}</span>
          <input
            ref={firstInputRef}
            type="text"
            value={numberValue}
            onChange={(e) => onChange?.({ number: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose?.();
              if (e.key === "Enter") onClose?.();
            }}
            placeholder={useLabels ? "e.g. QB, CB, LW" : ""}
            className={POPUP_DENSE_INPUT_CLASS}
          />
        </label>
        {useLabels && presetGroups.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            {presetGroups.map((group) => (
              <div key={group.category} className="flex flex-col gap-0.5">
                <span className="text-BrandGray text-[10px] sm:text-xs font-DmSans">
                  {group.category}
                </span>
                <div className="flex flex-wrap gap-1">
                  {group.positions.map((pos) => {
                    const isActive = String(numberValue).toUpperCase() === pos;
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => onChange?.({ number: pos })}
                        className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-DmSans font-semibold transition-colors cursor-pointer ${
                          isActive
                            ? "bg-BrandOrange text-BrandBlack"
                            : "bg-BrandBlack2 text-BrandWhite hover:bg-BrandGray2"
                        }`}
                      >
                        {pos}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-BrandOrange text-xs sm:text-sm font-DmSans">Name</span>
          <textarea
            ref={nameTextareaRef}
            rows={1}
            value={nameValue}
            onChange={(e) => onChange?.({ name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose?.();
              if (e.key === "Enter") { e.preventDefault(); onClose?.(); }
            }}
            className="w-full min-h-8 sm:min-h-9 bg-BrandBlack2 border border-BrandGray rounded-md px-2 py-1.5 text-BrandWhite text-xs sm:text-sm font-DmSans focus:outline-none focus:border-BrandOrange transition-colors resize-none overflow-hidden leading-tight"
          />
        </label>
      </div>

      <div className="px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full h-8 sm:h-9 text-BrandWhite rounded-md text-xs sm:text-sm font-DmSans transition-colors hover:bg-BrandBlack2 cursor-pointer"
        >
          Done
        </button>
      </div>
    </aside>
  );
}
