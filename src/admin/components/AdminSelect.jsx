/**
 * Styled admin select dropdown.
 *
 * @param {{ label?: string, className?: string } & React.SelectHTMLAttributes<HTMLSelectElement>} props
 */
export default function AdminSelect({ label, className = "", children, ...selectProps }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          {...selectProps}
          className="w-full appearance-none rounded-[var(--adm-radius-sm)] py-2 pl-3.5 pr-8 text-sm outline-none transition-colors"
          style={{
            backgroundColor: "var(--adm-surface)",
            border: "1px solid var(--adm-border2)",
            color: "var(--adm-text)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--adm-accent)";
            selectProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--adm-border2)";
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
    </div>
  );
}
