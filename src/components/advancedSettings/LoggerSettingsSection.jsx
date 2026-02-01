import React from "react";

export default function LoggerSettingsSection({ value = {}, onChange }) {
  const slate = value.slate ?? false;
  const controlPill = value.controlPill ?? false;
  const canvas = value.canvas ?? false;
  const sidebar = value.sidebar ?? false;

  const update = (patch) => onChange?.({ ...value, ...patch });

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

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1 sm:gap-2">
      <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">
        Logging
      </div>
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
    </div>
  );
}
