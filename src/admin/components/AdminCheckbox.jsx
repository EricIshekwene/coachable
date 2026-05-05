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
export default function AdminCheckbox({ label, className = "", checked, onChange, ...inputProps }) {
  return (
    <label className={`flex cursor-pointer select-none items-center gap-2 ${className}`}>
      <span className="relative flex h-4 w-4 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
          {...inputProps}
        />
        <span
          className="flex h-4 w-4 items-center justify-center rounded-[3px] transition-colors"
          style={{
            backgroundColor: checked ? "var(--adm-accent)" : "var(--adm-surface2)",
            border: checked ? "1px solid transparent" : "1px solid var(--adm-border2)",
          }}
        >
          {checked && (
            <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5">
              <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </span>
      {label && (
        <span className="text-sm" style={{ color: "var(--adm-text)" }}>
          {label}
        </span>
      )}
    </label>
  );
}
