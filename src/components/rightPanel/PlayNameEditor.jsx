import React, { useEffect, useRef, useState } from "react";
import { FiEdit } from "react-icons/fi";

export default function PlayNameEditor({ value, onChange, maxLength = 10 }) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isEditing) return;
    if (!inputRef.current) return;
    inputRef.current.focus();
    inputRef.current.select();
  }, [isEditing]);

  const handleEnableEdit = () => {
    if ((value || "").length <= maxLength) setIsEditing(true);
  };

  const handleSave = () => setIsEditing(false);

  const handleNameChange = (e) => {
    const next = e.target.value;
    if (next.length <= maxLength) onChange?.(next);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setIsEditing(false);
  };

  return (
    <div className="flex flex-row border-b border-BrandGray2 pb-1.5 sm:pb-2 items-center justify-center gap-1.5 sm:gap-2 font-DmSans font-bold">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleNameChange}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="text-BrandWhite text-lg sm:text-xl md:text-2xl bg-transparent border-none outline-none focus:outline-none text-center font-DmSans font-bold w-full max-w-[100px] sm:max-w-[110px] md:max-w-[120px]"
          maxLength={maxLength}
        />
      ) : (
        <div className="text-BrandWhite text-lg sm:text-xl md:text-2xl cursor-pointer" onClick={handleEnableEdit}>
          {value}
        </div>
      )}
      <FiEdit
        className={`text-xs sm:text-sm cursor-pointer transition-colors ${(value || "").length > maxLength ? "text-BrandGray cursor-not-allowed" : "text-BrandWhite hover:text-BrandOrange"
          }`}
        onClick={handleEnableEdit}
      />
    </div>
  );
}

