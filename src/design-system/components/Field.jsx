/**
 * Field wrapper providing label, hint, error message, and character count
 * for form controls.
 *
 * @param {{
 *   label?: React.ReactNode,
 *   hint?: React.ReactNode,
 *   error?: React.ReactNode,
 *   required?: boolean,
 *   count?: { current: number, max: number },
 *   htmlFor?: string,
 *   children: React.ReactNode,
 *   className?: string,
 * }} props
 */
export default function Field({
  label,
  hint,
  error,
  required = false,
  count,
  htmlFor,
  children,
  className = "",
}) {
  const hasMeta = Boolean(error || hint || count);

  return (
    <div data-component="Field" className={`flex flex-col gap-1 ${className}`}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="text-xs font-semibold"
          style={{ color: "var(--ui-text-muted)" }}
        >
          {label}
          {required ? <span style={{ color: "var(--ui-danger)" }}> *</span> : null}
        </label>
      ) : null}
      {children}
      {hasMeta ? (
        <div className="flex min-h-4 items-start justify-between gap-3 text-xs">
          {error ? (
            <span role="alert" style={{ color: "var(--ui-danger)" }}>
              {error}
            </span>
          ) : hint ? (
            <span style={{ color: "var(--ui-text-subtle)" }}>{hint}</span>
          ) : <span />}
          {count ? (
            <span className="ml-auto shrink-0" style={{ color: "var(--ui-text-subtle)" }}>
              {count.current}/{count.max}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
