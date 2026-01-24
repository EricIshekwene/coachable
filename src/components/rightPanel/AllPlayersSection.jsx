import React, { useEffect, useRef, useState } from "react";
import { FiEdit } from "react-icons/fi";
import { ImCheckboxChecked, ImCheckboxUnchecked } from "react-icons/im";
import { Popover } from "../subcomponents/Popovers";
import { ColorPickerPopover } from "../subcomponents/ColorPickerPopover";

export default function AllPlayersSection({ value, onChange }) {
  const playerSize = value?.sizePercent ?? 100;
  const playerColor = value?.color ?? "#ef4444";
  // Default to showing player numbers unless explicitly turned off.
  const showNumber = value?.showNumber ?? true;
  const showName = value?.showName ?? false;

  const update = (patch) => onChange?.({ ...value, ...patch });

  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [isEditingHex, setIsEditingHex] = useState(false);
  const [hexValue, setHexValue] = useState(playerColor);
  const colorEditButtonRef = useRef(null);
  const hexInputRef = useRef(null);

  useEffect(() => {
    if (isEditingHex) return;
    setHexValue(playerColor);
  }, [playerColor, isEditingHex]);

  useEffect(() => {
    if (!isEditingHex) return;
    if (!hexInputRef.current) return;
    hexInputRef.current.focus();
    hexInputRef.current.select();
  }, [isEditingHex]);

  const handleHexSave = () => {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexRegex.test(hexValue)) update({ color: hexValue });
    setIsEditingHex(false);
    setHexValue((prev) => (hexRegex.test(prev) ? prev : playerColor));
  };

  const handleHexKeyDown = (e) => {
    if (e.key === "Enter") handleHexSave();
    if (e.key === "Escape") {
      setHexValue(playerColor);
      setIsEditingHex(false);
    }
  };

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-1.5 sm:pb-2 items-start justify-center gap-0.5 ">
      <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">All Players</div>

      <div className="flex flex-row w-full items-center justify-between">
        <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Size: {playerSize}%</p>
        <div className="flex flex-row items-center justify-between bg-BrandBlack2 border-[0.5px] border-BrandGray2 aspect-[2/1] w-2/7 rounded-md">
          <button
            type="button"
            onClick={() => update({ sizePercent: playerSize + 5 })}
            className="text-BrandOrange font-bold m-auto text-xs sm:text-sm md:text-base hover:text-BrandOrange/80 transition-colors"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => update({ sizePercent: Math.max(5, playerSize - 5) })}
            className="text-BrandOrange font-bold m-auto text-xs sm:text-sm md:text-base hover:text-BrandOrange/80 transition-colors"
          >
            -
          </button>
        </div>
      </div>

      <div className="flex flex-col w-full items-start justify-between gap-0.5 sm:gap-1 relative">
        <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans">Color:</p>
        <div className="w-full flex flex-row bg-BrandBlack2 border-[0.5px] border-BrandGray2 rounded-md items-center justify-between py-0.5 sm:py-1 px-1.5 sm:px-2 gap-1.5 sm:gap-2">
          <div
            className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 aspect-square rounded-full border-[0.5px] border-BrandGray shrink-0"
            style={{ backgroundColor: playerColor }}
          />

          {isEditingHex ? (
            <input
              ref={hexInputRef}
              type="text"
              value={hexValue}
              onChange={(e) => setHexValue(e.target.value)}
              onBlur={handleHexSave}
              onKeyDown={handleHexKeyDown}
              className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans flex-1 bg-transparent border-none outline-none focus:outline-none"
              maxLength={7}
            />
          ) : (
            <p
              onClick={() => setIsEditingHex(true)}
              className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans flex-1 cursor-pointer"
            >
              {playerColor.toUpperCase()}
            </p>
          )}

          <button
            type="button"
            ref={colorEditButtonRef}
            onClick={() => setColorPopoverOpen((v) => !v)}
            className="text-BrandOrange hover:text-BrandOrange/80 transition-colors shrink-0"
          >
            <FiEdit className="text-BrandOrange text-xs sm:text-sm" />
          </button>
        </div>

        <Popover
          isOpen={colorPopoverOpen}
          onClose={() => setColorPopoverOpen(false)}
          anchorRef={colorEditButtonRef}
          position="left"
          topOffset="top-40 -translate-y-full -mt-2"
          marginRight={6}
        >
          <ColorPickerPopover
            color={playerColor}
            onChange={(color) => {
              update({ color: color.hex });
            }}
          />
        </Popover>
      </div>

      <div className="flex flex-row w-full items-center justify-between">
        <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Show Number:</p>
        <button type="button" onClick={() => update({ showNumber: !showNumber })} className="focus:outline-none cursor-pointer">
          {showNumber ? (
            <ImCheckboxChecked className="text-BrandOrange w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          ) : (
            <ImCheckboxUnchecked className="text-BrandGray2 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          )}
        </button>
      </div>

      <div className="flex flex-row w-full items-center justify-between">
        <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Show Name:</p>
        <button type="button" onClick={() => update({ showName: !showName })} className="focus:outline-none cursor-pointer">
          {showName ? (
            <ImCheckboxChecked className="text-BrandOrange w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          ) : (
            <ImCheckboxUnchecked className="text-BrandGray2 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

