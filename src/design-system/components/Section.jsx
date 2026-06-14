/**
 * Admin page section with heading and optional right-side actions.
 *
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   icon?: React.ReactNode,
 *   actions?: React.ReactNode,
 *   variant?: "default"|"compact",
 *   children: React.ReactNode,
 *   className?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function Section({
  title,
  subtitle,
  icon,
  actions,
  variant = "default",
  children,
  className = "",
  ...rest
}) {
  const compact = variant === "compact";

  return (
    <section data-component="Section" className={`flex flex-col ${compact ? "gap-3" : "gap-4"} ${className}`} {...rest}>
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${compact ? "gap-2" : "gap-3"}`}>
        <div className="flex min-w-0 items-start gap-2">
          {icon ? <span className="mt-0.5 shrink-0" style={{ color: "var(--ui-text-muted)" }}>{icon}</span> : null}
          <div className="min-w-0">
            <h2
              className={`font-Manrope ${compact ? "text-xs font-semibold uppercase tracking-widest" : "text-sm font-normal"}`}
              style={{ color: "var(--ui-text)" }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-xs" style={{ color: "var(--ui-text-muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0 sm:justify-end">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
