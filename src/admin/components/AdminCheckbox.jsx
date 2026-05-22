/**
 * Styled checkbox with label, replacing raw `accent-BrandOrange` checkboxes.
 *
 * @param {{
 *   label?: React.ReactNode,
 *   className?: string,
 *   checked?: boolean,
 *   onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void,
 * } & React.InputHTMLAttributes<HTMLInputElement>} props
 */
export default function AdminCheckbox({
  label,
  description,
  className = "",
  checked,
  onChange,
  disabled = false,
  ...inputProps
}) {
  return (
    <label className={`flex select-none items-start gap-2.5 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className}`}>
      <span className="relative flex h-4 w-4 shrink-0 translate-y-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
          {...inputProps}
        />
        <span
          className="flex h-4 w-4 items-center justify-center rounded-[4px] transition-colors"
          style={{
            backgroundColor: checked
              ? "var(--adm-accent)"
              : disabled
                ? "var(--adm-surface2)"
                : "var(--adm-surface)",
            border: checked ? "1px solid transparent" : "1px solid var(--adm-border2)",
            boxShadow: checked ? "0 8px 20px color-mix(in srgb, var(--adm-accent-dim) 96%, transparent)" : "none",
          }}
        >
          {checked && (
            <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5">
              <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </span>
      {(label || description) && (
        <span className="flex flex-col gap-0.5">
          {label ? (
            <span className="text-sm" style={{ color: "var(--adm-text)" }}>
              {label}
            </span>
          ) : null}
          {description ? (
            <span className="text-xs" style={{ color: "var(--adm-text3)" }}>
              {description}
            </span>
          ) : null}
        </span>
      )}
    </label>
  );
}
