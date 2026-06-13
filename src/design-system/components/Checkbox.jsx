import { forwardRef } from "react";

/**
 * Styled checkbox with label, replacing raw `accent-BrandOrange` checkboxes.
 *
 * @param {{
 *   label?: React.ReactNode,
 *   className?: string,
 *   checked?: boolean,
 *   onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void,
 * } & React.InputHTMLAttributes<HTMLInputElement>} props
 */
const Checkbox = forwardRef(function Checkbox({
  label,
  description,
  className = "",
  checked,
  onChange,
  disabled = false,
  ...inputProps
}, ref) {
  return (
    <label data-component="Checkbox" className={`flex select-none items-start gap-2.5 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className}`}>
      <span className="relative flex h-4 w-4 shrink-0 translate-y-0.5">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
          {...inputProps}
        />
        <span
          className="flex h-4 w-4 items-center justify-center rounded-[4px] transition-colors"
          style={{
            backgroundColor: checked
              ? "var(--ui-accent)"
              : disabled
                ? "var(--ui-surface-2)"
                : "var(--ui-surface)",
            border: checked ? "1px solid transparent" : "1px solid var(--ui-border-strong)",
            boxShadow: checked ? "0 8px 20px color-mix(in srgb, var(--ui-accent-muted) 96%, transparent)" : "none",
          }}
        >
          {checked && (
            <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5">
              <path d="M2 6l3 3 5-5" stroke="var(--ui-on-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </span>
      {(label || description) && (
        <span className="flex flex-col gap-0.5">
          {label ? (
            <span className="text-sm" style={{ color: "var(--ui-text)" }}>
              {label}
            </span>
          ) : null}
          {description ? (
            <span className="text-xs" style={{ color: "var(--ui-text-subtle)" }}>
              {description}
            </span>
          ) : null}
        </span>
      )}
    </label>
  );
});

export default Checkbox;
