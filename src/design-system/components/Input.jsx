import { forwardRef } from "react";
import { FIELD_SIZE_STYLES, getFieldTone, applyFieldFocus, clearFieldFocus } from "./fieldStyles";

/**
 * Styled admin text/password/number/email input.
 *
 * @param {{ label?: string, className?: string } & React.InputHTMLAttributes<HTMLInputElement>} props
 */
const Input = forwardRef(function Input({
  label,
  hint,
  error,
  className = "",
  size = "md",
  inputClassName = "",
  ...inputProps
}, ref) {
  const tone = getFieldTone({ disabled: inputProps.disabled, invalid: Boolean(error) || inputProps["aria-invalid"] === true });
  const sizeStyles = FIELD_SIZE_STYLES[size] ?? FIELD_SIZE_STYLES.md;

  return (
    <div data-component="Input" className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          className="text-xs font-semibold"
          style={{ color: "var(--ui-text-muted)" }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        {...inputProps}
        aria-invalid={inputProps["aria-invalid"] ?? Boolean(error)}
        className={`w-full rounded-[var(--radius-md)] outline-none transition-all ${sizeStyles.inputClassName} ${inputClassName}`}
        style={{
          backgroundColor: tone.backgroundColor,
          border: `1px solid ${tone.borderColor}`,
          color: tone.color,
        }}
        onFocus={(e) => {
          applyFieldFocus(e.currentTarget, { invalid: Boolean(error) || inputProps["aria-invalid"] === true });
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          clearFieldFocus(e.currentTarget, {
            invalid: Boolean(error) || inputProps["aria-invalid"] === true,
            disabled: inputProps.disabled,
          });
          inputProps.onBlur?.(e);
        }}
      />
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

export default Input;
