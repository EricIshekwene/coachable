/**
 * Toggle switch for boolean admin settings.
 *
 * @param {{
 *   checked?: boolean,
 *   onChange?: (next: boolean, event: React.MouseEvent<HTMLButtonElement>) => void,
 *   label?: React.ReactNode,
 *   description?: React.ReactNode,
 *   disabled?: boolean,
 *   className?: string,
 * }} props
 */
const Toggle = forwardRef(function Toggle({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  className = "",
  ...buttonProps
}, ref) {
  return (
    <div data-component="Toggle" className={`flex items-start justify-between gap-3 ${className}`}>
      {(label || description) ? (
        <div className="min-w-0">
          {label ? (
            <p className="text-sm font-semibold" style={{ color: "var(--ui-text)" }}>
              {label}
            </p>
          ) : null}
          {description ? (
            <p className="mt-1 text-xs" style={{ color: "var(--ui-text-subtle)" }}>
              {description}
            </p>
          ) : null}
        </div>
      ) : <span />}

      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={(event) => onChange?.(!checked, event)}
        {...buttonProps}
        className="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          backgroundColor: checked ? "var(--ui-accent)" : "var(--ui-surface-3)",
          boxShadow: checked
            ? "inset 0 0 0 1px color-mix(in srgb, var(--ui-accent) 40%, transparent)"
            : "inset 0 0 0 1px var(--ui-border-strong)",
        }}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
          style={{
            backgroundColor: "var(--ui-on-accent)",
            boxShadow: "var(--shadow-sm)",
          }}
        />
      </button>
    </div>
  );
});

export default Toggle;
import { forwardRef } from "react";
