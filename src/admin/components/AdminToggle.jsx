/**
 * Toggle switch for boolean admin settings.
 *
 * @param {{
 *   checked?: boolean,
 *   onChange?: (next: boolean, event: React.MouseEvent<HTMLButtonElement>) => void,
 *   label?: React.ReactNode,
 *   description?: React.ReactNode,
 *   disabled?: boolean,
 *   className?: string,
 * }} props
 */
export default function AdminToggle({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  className = "",
}) {
  return (
    <div data-component="AdminToggle" className={`flex items-start justify-between gap-3 ${className}`}>
      {(label || description) ? (
        <div className="min-w-0">
          {label ? (
            <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
              {label}
            </p>
          ) : null}
          {description ? (
            <p className="mt-1 text-xs" style={{ color: "var(--adm-text3)" }}>
              {description}
            </p>
          ) : null}
        </div>
      ) : <span />}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={(event) => onChange?.(!checked, event)}
        className="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          backgroundColor: checked ? "var(--adm-accent)" : "var(--adm-surface3)",
          boxShadow: checked
            ? "inset 0 0 0 1px color-mix(in srgb, var(--adm-accent) 40%, transparent)"
            : "inset 0 0 0 1px var(--adm-border2)",
        }}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
          style={{
            backgroundColor: "#fff",
            boxShadow: "0 4px 10px rgba(15, 23, 42, 0.18)",
          }}
        />
      </button>
    </div>
  );
}
