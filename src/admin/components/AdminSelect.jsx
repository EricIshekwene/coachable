import { FIELD_SIZE_STYLES, getFieldTone, applyFieldFocus, clearFieldFocus } from "./adminFieldStyles";

/**
 * Styled admin select dropdown.
 *
 * @param {{ label?: string, className?: string } & React.SelectHTMLAttributes<HTMLSelectElement>} props
 */
export default function AdminSelect({
  label,
  hint,
  error,
  className = "",
  size = "md",
  children,
  ...selectProps
}) {
  const tone = getFieldTone({ disabled: selectProps.disabled, invalid: Boolean(error) || selectProps["aria-invalid"] === true });
  const sizeStyles = FIELD_SIZE_STYLES[size] ?? FIELD_SIZE_STYLES.md;

  return (
    <div data-component="AdminSelect" className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          {...selectProps}
          aria-invalid={selectProps["aria-invalid"] ?? Boolean(error)}
          className={`w-full appearance-none rounded-[var(--adm-radius-md)] outline-none transition-all ${sizeStyles.selectClassName}`}
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
          style={{ color: "var(--adm-muted)" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
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
