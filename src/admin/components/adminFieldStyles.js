export const FIELD_SIZE_STYLES = {
  sm: {
    inputClassName: "min-h-9 px-3 text-xs",
    textareaClassName: "px-3 py-2 text-xs",
    selectClassName: "min-h-9 py-2 pl-3 pr-8 text-xs",
  },
  md: {
    inputClassName: "min-h-11 px-3.5 text-sm",
    textareaClassName: "px-3.5 py-2.5 text-sm",
    selectClassName: "min-h-11 py-2.5 pl-3.5 pr-9 text-sm",
  },
  lg: {
    inputClassName: "min-h-12 px-4 text-sm",
    textareaClassName: "px-4 py-3 text-sm",
    selectClassName: "min-h-12 py-3 pl-4 pr-10 text-sm",
  },
};

export function getFieldTone({ disabled = false, invalid = false } = {}) {
  if (disabled) {
    return {
      backgroundColor: "var(--adm-surface2)",
      borderColor: "var(--adm-border)",
      color: "var(--adm-text3)",
    };
  }

  if (invalid) {
    return {
      backgroundColor: "var(--adm-surface)",
      borderColor: "color-mix(in srgb, var(--adm-danger) 46%, var(--adm-border2))",
      color: "var(--adm-text)",
    };
  }

  return {
    backgroundColor: "var(--adm-surface)",
    borderColor: "var(--adm-border2)",
    color: "var(--adm-text)",
  };
}

export function applyFieldFocus(el, { invalid = false } = {}) {
  if (!el) return;
  el.style.borderColor = invalid
    ? "color-mix(in srgb, var(--adm-danger) 72%, white 0%)"
    : "color-mix(in srgb, var(--adm-accent) 82%, white 0%)";
  el.style.boxShadow = invalid
    ? "0 0 0 4px color-mix(in srgb, var(--adm-danger-dim) 95%, transparent)"
    : "0 0 0 4px color-mix(in srgb, var(--adm-accent-dim) 95%, transparent)";
}

export function clearFieldFocus(el, { invalid = false, disabled = false } = {}) {
  if (!el) return;
  const tone = getFieldTone({ invalid, disabled });
  el.style.borderColor = tone.borderColor;
  el.style.boxShadow = "none";
}
