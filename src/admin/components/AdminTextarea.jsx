import { FIELD_SIZE_STYLES, getFieldTone, applyFieldFocus, clearFieldFocus } from "./adminFieldStyles";

/**
 * Styled admin textarea with shared field tokens.
 *
 * @param {{ label?: string, hint?: string, error?: string, className?: string, size?: "sm"|"md"|"lg" } & React.TextareaHTMLAttributes<HTMLTextAreaElement>} props
 */
export default function AdminTextarea({
  label,
  hint,
  error,
  className = "",
  size = "md",
  textareaClassName = "",
  rows = 4,
  ...textareaProps
}) {
  const tone = getFieldTone({ disabled: textareaProps.disabled, invalid: Boolean(error) || textareaProps["aria-invalid"] === true });
  const sizeStyles = FIELD_SIZE_STYLES[size] ?? FIELD_SIZE_STYLES.md;

  return (
    <div data-component="AdminTextarea" className={`flex flex-col gap-1 ${className}`}>
      {label ? (
        <label className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>
          {label}
        </label>
      ) : null}
      <textarea
        {...textareaProps}
        rows={rows}
        aria-invalid={textareaProps["aria-invalid"] ?? Boolean(error)}
        className={`w-full rounded-[var(--adm-radius-md)] outline-none transition-all resize-y ${sizeStyles.textareaClassName} ${textareaClassName}`}
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
        <p className="text-xs" style={{ color: "var(--adm-danger)" }}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs" style={{ color: "var(--adm-text3)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
