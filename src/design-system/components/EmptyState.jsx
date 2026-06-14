/**
 * Centered empty/loading/error state for admin list views.
 *
 * @param {{
 *   icon?: React.ReactNode,
 *   title: string,
 *   subtitle?: string,
 *   description?: string,
 *   action?: React.ReactNode,
 *   contained?: boolean,
 *   className?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function EmptyState({
  icon,
  title,
  subtitle,
  description,
  action,
  contained = false,
  className = "",
  style,
  ...rest
}) {
  const supportingText = description ?? subtitle;

  return (
    <div
      data-component="EmptyState"
      className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${contained ? "rounded-[var(--radius-lg)] px-6" : ""} ${className}`}
      style={contained ? { border: "1px solid var(--ui-border)", backgroundColor: "var(--ui-surface)", ...style } : style}
      {...rest}
    >
      {icon && (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--ui-surface-3)", color: "var(--ui-text-muted)" }}
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold" style={{ color: "var(--ui-text)" }}>{title}</p>
      {supportingText && (
        <p className="max-w-xs text-xs" style={{ color: "var(--ui-text-muted)" }}>{supportingText}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
