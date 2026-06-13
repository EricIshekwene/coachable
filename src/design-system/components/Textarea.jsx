import { forwardRef } from "react";
import { FIELD_SIZE_STYLES, getFieldTone, applyFieldFocus, clearFieldFocus } from "./fieldStyles";

/**
 * Styled admin textarea with shared field tokens.
 *
 * @param {{ label?: string, hint?: string, error?: string, className?: string, size?: "sm"|"md"|"lg" } & React.TextareaHTMLAttributes<HTMLTextAreaElement>} props
 */
const Textarea = forwardRef(function Textarea({
  label,
  hint,
  error,
  className = "",
  size = "md",
  textareaClassName = "",
  rows = 4,
  ...textareaProps
}, ref) {
  const tone = getFieldTone({ disabled: textareaProps.disabled, invalid: Boolean(error) || textareaProps["aria-invalid"] === true });
  const sizeStyles = FIELD_SIZE_STYLES[size] ?? FIELD_SIZE_STYLES.md;

  return (
    <div data-component="Textarea" className={`flex flex-col gap-1 ${className}`}>
      {label ? (
        <label className="text-xs font-semibold" style={{ color: "var(--ui-text-muted)" }}>
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        {...textareaProps}
        rows={rows}
        aria-invalid={textareaProps["aria-invalid"] ?? Boolean(error)}
        className={`w-full rounded-[var(--radius-md)] outline-none transition-all resize-y ${sizeStyles.textareaClassName} ${textareaClassName}`}
        style={{
          backgroundColor: tone.backgroundColor,
          border: `1px solid ${tone.borderColor}`,
          color: tone.color,
        }}
        onFocus={(e) => {
          applyFieldFocus(e.currentTarget, { invalid: Boolean(error) || textareaProps["aria-invalid"] === true });
          textareaProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          clearFieldFocus(e.currentTarget, {
            invalid: Boolean(error) || textareaProps["aria-invalid"] === true,
            disabled: textareaProps.disabled,
          });
          textareaProps.onBlur?.(e);
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

export default Textarea;
