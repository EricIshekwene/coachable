import React, { useEffect, useRef, useState } from "react";
import { BiRedo, BiUndo } from "react-icons/bi";
import { FiRotateCcw, FiRotateCw } from "react-icons/fi";
import { MdOutlineResetTv, MdOutlineZoomIn, MdOutlineZoomOut } from "react-icons/md";
import { TbRotateDot } from "react-icons/tb";
import { PanelButton } from "../subcomponents/Buttons.jsx";

export default function FieldSettingsSection({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onZoomPercentChange,
  onRotateLeft,
  onRotateCenter,
  onRotateRight,
  onUndo,
  onRedo,
  onReset,
}) {
  const iconClass = "text-BrandOrange text-sm sm:text-base md:text-lg lg:text-xl";

  const [isEditingZoom, setIsEditingZoom] = useState(false);
  const [draftZoom, setDraftZoom] = useState(String(zoomPercent ?? 100));
  const zoomInputRef = useRef(null);

  useEffect(() => {
    if (!isEditingZoom) return;
    if (!zoomInputRef.current) return;
    zoomInputRef.current.focus();
    zoomInputRef.current.select();
  }, [isEditingZoom]);

  useEffect(() => {
    if (isEditingZoom) return;
    setDraftZoom(String(zoomPercent ?? 100));
  }, [zoomPercent, isEditingZoom]);

  const commitZoom = () => {
    const parsed = Number(draftZoom);
    const next = Number.isFinite(parsed) ? parsed : zoomPercent;
    onZoomPercentChange?.(next);
    setIsEditingZoom(false);
  };

  const cancelZoom = () => {
    setDraftZoom(String(zoomPercent ?? 100));
    setIsEditingZoom(false);
  };

  const handleZoomChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) setDraftZoom(value);
  };

  const handleZoomKeyDown = (e) => {
    if (e.key === "Enter") commitZoom();
    if (e.key === "Escape") cancelZoom();
  };

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center ">
      <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">Field Settings</div>

      <div className="w-full grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 mt-1 sm:mt-1.5 md:mt-2">
        <div>
          <PanelButton Icon={<FiRotateCcw className={iconClass} />} onClick={() => onRotateLeft?.()} isSelected={false} />
        </div>

        <div>
          <PanelButton Icon={<TbRotateDot className={iconClass} />} onClick={() => onRotateCenter?.()} isSelected={false} />
        </div>

        <div>
          <PanelButton Icon={<FiRotateCw className={iconClass} />} onClick={() => onRotateRight?.()} isSelected={false} />
        </div>

        <div>
          <PanelButton Icon={<MdOutlineZoomOut className={iconClass} />} onClick={() => onZoomOut?.()} isSelected={false} />
        </div>

        <div className="flex items-center justify-center m-auto">
          {isEditingZoom ? (
            <input
              ref={zoomInputRef}
              type="text"
              value={draftZoom}
              onChange={handleZoomChange}
              onBlur={commitZoom}
              onKeyDown={handleZoomKeyDown}
              className="text-BrandWhite text-xs sm:text-sm md:text-base bg-transparent border-none outline-none focus:outline-none text-center font-DmSans w-10 sm:w-12"
              maxLength={3}
            />
          ) : (
            <p
              className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans cursor-pointer"
              onClick={() => setIsEditingZoom(true)}
            >
              {zoomPercent}%
            </p>
          )}
        </div>

        <div>
          <PanelButton Icon={<MdOutlineZoomIn className={iconClass} />} onClick={() => onZoomIn?.()} isSelected={false} />
        </div>

        <div>
          <PanelButton Icon={<BiUndo className={iconClass} />} onClick={() => onUndo?.()} isSelected={false} />
        </div>

        <div>
          <PanelButton Icon={<MdOutlineResetTv className={iconClass} />} onClick={() => onReset?.()} isSelected={false} />
        </div>

        <div>
          <PanelButton Icon={<BiRedo className={iconClass} />} onClick={() => onRedo?.()} isSelected={false} />
        </div>
      </div>
    </div>
  );
}

