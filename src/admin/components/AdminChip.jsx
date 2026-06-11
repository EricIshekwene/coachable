const CHIP_TONES = {
  neutral: { bg: "var(--adm-surface3)", color: "var(--adm-text2)", border: "var(--adm-border)" },
  accent: { bg: "var(--adm-accent-dim)", color: "var(--adm-accent)", border: "color-mix(in srgb, var(--adm-accent) 22%, transparent)" },
  success: { bg: "var(--adm-success-dim)", color: "var(--adm-success)", border: "color-mix(in srgb, var(--adm-success) 22%, transparent)" },
  warning: { bg: "var(--adm-warning-dim)", color: "var(--adm-warning)", border: "color-mix(in srgb, var(--adm-warning) 24%, transparent)" },
  danger: { bg: "var(--adm-danger-dim)", color: "var(--adm-danger)", border: "color-mix(in srgb, var(--adm-danger) 22%, transparent)" },
};

/**
 * Compact chip / tag for filters, categories, and selections. Supports tones,
 * a selected ring, an optional leading icon, and an optional remove button.
 *
 * @param {{
 *   children: React.ReactNode,
 *   tone?: "neutral"|"accent"|"success"|"warning"|"danger",
 *   selected?: boolean,
 *   disabled?: boolean,
 *   leadingIcon?: React.ReactNode,
 *   onClick?: (e: React.MouseEvent) => void,
 *   onRemove?: (e: React.MouseEvent) => void,
 *   className?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function AdminChip({ children, tone = "neutral", selected = false, disabled = false, leadingIcon, onClick, onRemove, className = "" }) {
  const palette = CHIP_TONES[tone] ?? CHIP_TONES.neutral;
  const interactive = Boolean(onClick) && !disabled;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${interactive ? "cursor-pointer" : ""} ${disabled ? "opacity-50" : ""} ${className}`}
      style={{
        backgroundColor: palette.bg,
        color: palette.color,
        border: `1px solid ${selected ? "color-mix(in srgb, var(--adm-accent) 50%, transparent)" : palette.border}`,
        boxShadow: selected ? "0 0 0 1px var(--adm-accent-dim)" : "none",
      }}
      onClick={interactive ? onClick : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
    >
      {leadingIcon}
      {children}
      {onRemove ? (
        <button
          type="button"
          aria-label="Remove"
          className="-mr-1 ml-0.5 rounded-full p-0.5 transition hover:opacity-70"
          style={{ color: "currentColor" }}
          onClick={(e) => { e.stopPropagation(); onRemove(e); }}
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      ) : null}
    </span>
  );
}
