import { forwardRef } from "react";
import { FIELD_SIZE_STYLES, getFieldTone, applyFieldFocus, clearFieldFocus } from "./fieldStyles";

/**
 * Styled admin select dropdown.
 *
 * @param {{ label?: string, className?: string } & React.SelectHTMLAttributes<HTMLSelectElement>} props
 */
const Select = forwardRef(function Select({
  label,
  hint,
  error,
  className = "",
  size = "md",
  children,
  ...selectProps
}, ref) {
  const tone = getFieldTone({ disabled: selectProps.disabled, invalid: Boolean(error) || selectProps["aria-invalid"] === true });
  const sizeStyles = FIELD_SIZE_STYLES[size] ?? FIELD_SIZE_STYLES.md;

  return (
    <div data-component="Select" className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-semibold" style={{ color: "var(--ui-text-muted)" }}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          {...selectProps}
          aria-invalid={selectProps["aria-invalid"] ?? Boolean(error)}
          className={`w-full appearance-none rounded-[var(--radius-md)] outline-none transition-all ${sizeStyles.selectClassName}`}
          style={{
            backgroundColor: tone.backgroundColor,
            border: `1px solid ${tone.borderColor}`,
            color: tone.color,
          }}
          onFocus={(e) => {
            applyFieldFocus(e.currentTarget, { invalid: Boolean(error) || selectProps["aria-invalid"] === true });
            selectProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            clearFieldFocus(e.currentTarget, {
              invalid: Boolean(error) || selectProps["aria-invalid"] === true,
              disabled: selectProps.disabled,
            });
            selectProps.onBlur?.(e);
          }}
        >
          {children}
        </select>
        {/* Chevron icon */}
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
          style={{ color: "var(--ui-text-muted)" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {error ? (
        <p className="text-xs" style={{ color: "var(--ui-danger)" }}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs" style={{ color: "var(--ui-text-subtle)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Select;
