/**
 * Styled admin text/password/number/email input.
 *
 * @param {{ label?: string, className?: string } & React.InputHTMLAttributes<HTMLInputElement>} props
 */
export default function AdminInput({ label, className = "", ...inputProps }) {
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
        className="w-full rounded-[var(--adm-radius-sm)] px-3.5 py-2.5 text-sm outline-none transition-colors"
        style={{
          backgroundColor: "var(--adm-surface)",
          border: "1px solid var(--adm-border2)",
          color: "var(--adm-text)",
          "--placeholder-color": "var(--adm-muted)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--adm-accent)";
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--adm-border2)";
          inputProps.onBlur?.(e);
        }}
      />
    </div>
  );
}
