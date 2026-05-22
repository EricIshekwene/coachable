import { FIELD_SIZE_STYLES, getFieldTone, applyFieldFocus, clearFieldFocus } from "./adminFieldStyles";

/**
 * Styled admin text/password/number/email input.
 *
 * @param {{ label?: string, className?: string } & React.InputHTMLAttributes<HTMLInputElement>} props
 */
export default function AdminInput({
  label,
  hint,
  error,
  className = "",
  size = "md",
  inputClassName = "",
  ...inputProps
}) {
  const tone = getFieldTone({ disabled: inputProps.disabled, invalid: Boolean(error) || inputProps["aria-invalid"] === true });
  const sizeStyles = FIELD_SIZE_STYLES[size] ?? FIELD_SIZE_STYLES.md;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          className="text-xs font-semibold"
          style={{ color: "var(--adm-muted)" }}
        >
          {label}
        </label>
      )}
      <input
        {...inputProps}
        aria-invalid={inputProps["aria-invalid"] ?? Boolean(error)}
        className={`w-full rounded-[var(--adm-radius-md)] outline-none transition-all ${sizeStyles.inputClassName} ${inputClassName}`}
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
