import React, { useEffect, useRef, useState } from "react";

export default function LoggerSettingsSection({
  value = {},
  onChange,
  onCopyDebug,
  onCopyDrawDebug,
}) {
  const slate = value.slate ?? false;
  const controlPill = value.controlPill ?? false;
  const canvas = value.canvas ?? false;
  const sidebar = value.sidebar ?? false;
  const [copyAnimationState, setCopyAnimationState] = useState("idle");
  const [copyDrawState, setCopyDrawState] = useState("idle");
  const copyAnimationResetRef = useRef(null);
  const copyDrawResetRef = useRef(null);

  const update = (patch) => onChange?.({ ...value, ...patch });

  useEffect(
    () => () => {
      if (copyAnimationResetRef.current) {
        clearTimeout(copyAnimationResetRef.current);
        copyAnimationResetRef.current = null;
      }
      if (copyDrawResetRef.current) {
        clearTimeout(copyDrawResetRef.current);
        copyDrawResetRef.current = null;
      }
    },
    []
  );

  const ToggleRow = ({ label, enabled, onToggle }) => (
    <div className="flex items-center justify-between w-full gap-2">
      <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">{label}</p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(!enabled);
        }}
        className={`relative w-[32px] h-[16px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
          enabled ? "bg-BrandOrange" : "bg-BrandGray"
        }`}
        aria-label={`Toggle ${label} logger`}
      >
        <span
          className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 w-[12px] h-[12px] bg-BrandBlack rounded-full shadow-sm ${
            enabled ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </div>
  );

  const handleCopyAnimationDebug = async (event) => {
    event.stopPropagation();
    if (!onCopyDebug) return;
    try {
      const ok = await onCopyDebug();
      setCopyAnimationState(ok ? "copied" : "error");
    } catch {
      setCopyAnimationState("error");
    }
    if (copyAnimationResetRef.current) {
      clearTimeout(copyAnimationResetRef.current);
    }
    copyAnimationResetRef.current = setTimeout(() => {
      setCopyAnimationState("idle");
      copyAnimationResetRef.current = null;
    }, 1500);
  };

  const handleCopyDrawDebug = async (event) => {
    event.stopPropagation();
    if (!onCopyDrawDebug) return;
    try {
      const ok = await onCopyDrawDebug();
      setCopyDrawState(ok ? "copied" : "error");
    } catch {
      setCopyDrawState("error");
    }
    if (copyDrawResetRef.current) {
      clearTimeout(copyDrawResetRef.current);
    }
    copyDrawResetRef.current = setTimeout(() => {
      setCopyDrawState("idle");
      copyDrawResetRef.current = null;
    }, 1500);
  };

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1 sm:gap-2">
      <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">Logging</div>
      <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5">
        <ToggleRow label="Slate" enabled={slate} onToggle={(v) => update({ slate: v })} />
        <ToggleRow
          label="Control Pill"
          enabled={controlPill}
          onToggle={(v) => update({ controlPill: v })}
        />
        <ToggleRow label="Canvas" enabled={canvas} onToggle={(v) => update({ canvas: v })} />
        <ToggleRow label="Sidebar" enabled={sidebar} onToggle={(v) => update({ sidebar: v })} />
      </div>
      <button
        type="button"
        onClick={handleCopyAnimationDebug}
        className="mt-1 h-6 sm:h-7 w-full bg-BrandBlack2 border-[0.625px] border-BrandGray text-BrandOrange rounded-md px-2 text-[10px] sm:text-[11px] md:text-[12px] font-DmSans cursor-pointer"
      >
        {copyAnimationState === "copied"
          ? "Copied"
          : copyAnimationState === "error"
            ? "Copy Failed"
            : "Copy Animation Debug"}
      </button>
      <button
        type="button"
        onClick={handleCopyDrawDebug}
        className="h-6 sm:h-7 w-full bg-BrandBlack2 border-[0.625px] border-BrandGray text-BrandOrange rounded-md px-2 text-[10px] sm:text-[11px] md:text-[12px] font-DmSans cursor-pointer"
      >
        {copyDrawState === "copied"
          ? "Copied"
          : copyDrawState === "error"
            ? "Copy Failed"
            : "Copy Draw Debug"}
      </button>
    </div>
  );
}
