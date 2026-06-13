/**
 * Centered empty/loading/error state for admin list views.
 *
 * @param {{
 *   icon?: React.ReactNode,
 *   title: string,
 *   subtitle?: string,
 *   action?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export default function EmptyState({ icon, title, subtitle, action, className = "", ...rest }) {
  return (
    <div data-component="EmptyState" className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className}`} {...rest}>
      {icon && (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--ui-surface-3)", color: "var(--ui-text-muted)" }}
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold" style={{ color: "var(--ui-text)" }}>{title}</p>
      {subtitle && (
        <p className="max-w-xs text-xs" style={{ color: "var(--ui-text-muted)" }}>{subtitle}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
