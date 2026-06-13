import { forwardRef, useId } from "react";
import Field from "./Field";
import { FIELD_SIZE_STYLES, getFieldTone, applyFieldFocus, clearFieldFocus } from "./fieldStyles";

/**
 * Styled admin textarea with shared field tokens.
 *
 * @param {{ label?: React.ReactNode, hint?: React.ReactNode, error?: React.ReactNode, required?: boolean, resize?: "none"|"vertical"|"both", className?: string, size?: "sm"|"md"|"lg" } & React.TextareaHTMLAttributes<HTMLTextAreaElement>} props
 */
const Textarea = forwardRef(function Textarea({
  label,
  hint,
  error,
  required = false,
  resize = "vertical",
  className = "",
  size = "md",
  textareaClassName = "",
  rows = 4,
  ...textareaProps
}, ref) {
  const generatedId = useId();
  const textareaId = textareaProps.id ?? (label ? generatedId : undefined);
  const tone = getFieldTone({ disabled: textareaProps.disabled, invalid: Boolean(error) || textareaProps["aria-invalid"] === true });
  const sizeStyles = FIELD_SIZE_STYLES[size] ?? FIELD_SIZE_STYLES.md;

  const control = (
    <textarea
        ref={ref}
        {...textareaProps}
        id={textareaId}
        rows={rows}
        required={required || textareaProps.required}
        aria-invalid={textareaProps["aria-invalid"] ?? Boolean(error)}
        data-component="Textarea"
        className={`w-full rounded-[var(--radius-md)] outline-none transition-all ${resize === "none" ? "resize-none" : resize === "both" ? "resize" : "resize-y"} ${sizeStyles.textareaClassName} ${textareaClassName} ${label ? "" : className}`}
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
  );

  return label ? (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={textareaId} className={className}>
      {control}
    </Field>
  ) : control;
});

export default Textarea;
