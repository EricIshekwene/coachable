/**
 * Admin page section with heading and optional right-side actions.
 *
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   actions?: React.ReactNode,
 *   children: React.ReactNode,
 *   className?: string,
 * }} props
 */
export default function AdminSection({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            className="font-Manrope text-sm font-normal"
            style={{ color: "var(--adm-text)" }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--adm-muted)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0 sm:justify-end">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
