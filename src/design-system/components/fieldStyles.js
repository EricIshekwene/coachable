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

/**
 * Resolves field colors for the disabled, invalid, and default states.
 * @param {{ disabled?: boolean, invalid?: boolean }} state
 * @returns {{ backgroundColor: string, borderColor: string, color: string }}
 */
export function getFieldTone({ disabled = false, invalid = false } = {}) {
  if (disabled) {
    return {
      backgroundColor: "var(--ui-surface-2)",
      borderColor: "var(--ui-border)",
      color: "var(--ui-text-subtle)",
    };
  }

  if (invalid) {
    return {
      backgroundColor: "var(--ui-surface)",
      borderColor: "color-mix(in srgb, var(--ui-danger) 46%, var(--ui-border-strong))",
      color: "var(--ui-text)",
    };
  }

  return {
    backgroundColor: "var(--ui-surface)",
    borderColor: "var(--ui-border-strong)",
    color: "var(--ui-text)",
  };
}

/**
 * Applies the semantic focus ring to a field element.
 * @param {HTMLElement|null} el
 * @param {{ invalid?: boolean }} state
 * @returns {void}
 */
export function applyFieldFocus(el, { invalid = false } = {}) {
  if (!el) return;
  el.style.borderColor = invalid
    ? "var(--ui-danger)"
    : "var(--ui-accent)";
  el.style.boxShadow = invalid
    ? "0 0 0 4px color-mix(in srgb, var(--ui-danger-muted) 95%, transparent)"
    : "0 0 0 4px color-mix(in srgb, var(--ui-accent-muted) 95%, transparent)";
}

/**
 * Restores a field element's unfocused semantic colors.
 * @param {HTMLElement|null} el
 * @param {{ invalid?: boolean, disabled?: boolean }} state
 * @returns {void}
 */
export function clearFieldFocus(el, { invalid = false, disabled = false } = {}) {
  if (!el) return;
  const tone = getFieldTone({ invalid, disabled });
  el.style.borderColor = tone.borderColor;
  el.style.boxShadow = "none";
}
