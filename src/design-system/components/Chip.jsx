const CHIP_TONES = {
  neutral: { bg: "var(--ui-surface-3)", color: "var(--ui-text-muted)", border: "var(--ui-border)" },
  accent: { bg: "var(--ui-accent-muted)", color: "var(--ui-accent)", border: "color-mix(in srgb, var(--ui-accent) 22%, transparent)" },
  success: { bg: "var(--ui-success-muted)", color: "var(--ui-success)", border: "color-mix(in srgb, var(--ui-success) 22%, transparent)" },
  warning: { bg: "var(--ui-warning-muted)", color: "var(--ui-warning)", border: "color-mix(in srgb, var(--ui-warning) 24%, transparent)" },
  danger: { bg: "var(--ui-danger-muted)", color: "var(--ui-danger)", border: "color-mix(in srgb, var(--ui-danger) 22%, transparent)" },
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
export default function Chip({ children, tone = "neutral", selected = false, disabled = false, leadingIcon, onClick, onRemove, className = "", style, ...rest }) {
  const palette = CHIP_TONES[tone] ?? CHIP_TONES.neutral;
  const interactive = Boolean(onClick) && !disabled;

  return (
    <span
      data-component="Chip"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${interactive ? "cursor-pointer" : ""} ${disabled ? "opacity-50" : ""} ${className}`}
      style={{
        backgroundColor: palette.bg,
        color: palette.color,
        border: `1px solid ${selected ? "color-mix(in srgb, var(--ui-accent) 50%, transparent)" : palette.border}`,
        boxShadow: selected ? "0 0 0 1px var(--ui-accent-muted)" : "none",
        ...style,
      }}
      onClick={interactive ? onClick : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      {...rest}
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
