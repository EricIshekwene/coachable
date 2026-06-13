import { forwardRef, useId } from "react";
import Field from "./Field";
import { FIELD_SIZE_STYLES, getFieldTone, applyFieldFocus, clearFieldFocus } from "./fieldStyles";

/**
 * Styled admin select dropdown.
 *
 * @param {{ label?: React.ReactNode, hint?: React.ReactNode, error?: React.ReactNode, required?: boolean, className?: string } & React.SelectHTMLAttributes<HTMLSelectElement>} props
 */
const Select = forwardRef(function Select({
  label,
  hint,
  error,
  required = false,
  className = "",
  size = "md",
  children,
  ...selectProps
}, ref) {
  const generatedId = useId();
  const selectId = selectProps.id ?? (label ? generatedId : undefined);
  const tone = getFieldTone({ disabled: selectProps.disabled, invalid: Boolean(error) || selectProps["aria-invalid"] === true });
  const sizeStyles = FIELD_SIZE_STYLES[size] ?? FIELD_SIZE_STYLES.md;

  const control = (
    <div className="relative">
        <select
          ref={ref}
          {...selectProps}
          id={selectId}
          required={required || selectProps.required}
          aria-invalid={selectProps["aria-invalid"] ?? Boolean(error)}
          data-component="Select"
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
  );

  return label ? (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={selectId} className={className}>
      {control}
    </Field>
  ) : (
    <div className={className}>
      {control}
      {error || hint ? <Field hint={hint} error={error}>{null}</Field> : null}
    </div>
  );
});

export default Select;
