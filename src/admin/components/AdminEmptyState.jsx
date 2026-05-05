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
export default function AdminEmptyState({ icon, title, subtitle, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className}`}>
      {icon && (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{title}</p>
      {subtitle && (
        <p className="max-w-xs text-xs" style={{ color: "var(--adm-text2)" }}>{subtitle}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
