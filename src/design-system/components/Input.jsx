import { forwardRef, useId } from "react";
import Field from "./Field";
import { FIELD_SIZE_STYLES, getFieldTone, applyFieldFocus, clearFieldFocus } from "./fieldStyles";

/**
 * Styled admin text/password/number/email input.
 *
 * @param {{
 *   label?: React.ReactNode,
 *   hint?: React.ReactNode,
 *   error?: React.ReactNode,
 *   required?: boolean,
 *   startIcon?: React.ReactNode,
 *   endAction?: React.ReactNode,
 *   appearance?: "default"|"search"|"code",
 *   className?: string,
 *   inputClassName?: string,
 *   size?: "sm"|"md"|"lg",
 * } & React.InputHTMLAttributes<HTMLInputElement>} props
 */
const Input = forwardRef(function Input({
  label,
  hint,
  error,
  required = false,
  startIcon,
  endAction,
  appearance = "default",
  className = "",
  size = "md",
  inputClassName = "",
  ...inputProps
}, ref) {
  const generatedId = useId();
  const inputId = inputProps.id ?? (label ? generatedId : undefined);
  const tone = getFieldTone({ disabled: inputProps.disabled, invalid: Boolean(error) || inputProps["aria-invalid"] === true });
  const sizeStyles = FIELD_SIZE_STYLES[size] ?? FIELD_SIZE_STYLES.md;

  const input = (
    <input
        ref={ref}
        {...inputProps}
        id={inputId}
        required={required || inputProps.required}
        aria-invalid={inputProps["aria-invalid"] ?? Boolean(error)}
        data-component="Input"
        className={`w-full outline-none transition-all ${appearance === "search" ? "rounded-full" : "rounded-[var(--radius-md)]"} ${appearance === "code" ? "font-mono" : ""} ${startIcon ? "pl-10" : ""} ${endAction ? "pr-10" : ""} ${sizeStyles.inputClassName} ${label || startIcon || endAction ? inputClassName : `${inputClassName} ${className}`}`}
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
  );

  const control = startIcon || endAction ? (
    <div className="relative" data-input-control>
      {startIcon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ui-text-subtle)" }}>
          {startIcon}
        </span>
      ) : null}
      {input}
      {endAction ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">{endAction}</span>
      ) : null}
    </div>
  ) : input;

  return label ? (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={inputId}
      className={className}
    >
      {control}
    </Field>
  ) : control;
});

export default Input;
