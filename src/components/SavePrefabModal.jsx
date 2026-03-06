import React, { useEffect, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";
import {
  POPUP_CLOSE_BUTTON_CLASS,
  POPUP_INPUT_CLASS,
  POPUP_LABEL_CLASS,
  POPUP_MODAL_OVERLAY_CLASS,
  POPUP_PRIMARY_BUTTON_CLASS,
  POPUP_SURFACE_CLASS,
  POPUP_TITLE_CLASS,
} from "./subcomponents/popupStyles";

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
      className={POPUP_MODAL_OVERLAY_CLASS}
      onClick={onClose}
    >
      <div
        className={`relative w-72 sm:w-80 p-5 sm:p-6 flex flex-col gap-4 ${POPUP_SURFACE_CLASS}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className={POPUP_CLOSE_BUTTON_CLASS}
          aria-label="Close"
        >
          <FaTimes className="text-sm" />
        </button>

        <h2 className={POPUP_TITLE_CLASS}>Save as Prefab</h2>

        <div className="flex flex-col gap-1.5">
          <label className={POPUP_LABEL_CLASS}>Prefab Name</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. My Lineout"
            className={POPUP_INPUT_CLASS}
            maxLength={50}
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim()}
          className={`${POPUP_PRIMARY_BUTTON_CLASS} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          Save Prefab
        </button>
      </div>
    </div>
  );
}
