/**
 * Titled content block for a main-app page. Renders an uppercase micro-label
 * heading (matching the existing app convention used on Profile/Settings), an
 * optional leading icon, an optional subtitle, an optional right-aligned actions
 * slot, and its children below. Mirrors the admin `Section`.
 *
 * Canonical composition (per the layout system): `AppSection` wraps an `AppCard`,
 * so the section label sits above the surface — matching how admin lays out
 * `Section > Card`.
 *
 * @param {object} props
 * @param {string} [props.title] - Section heading (rendered uppercase).
 * @param {string} [props.subtitle]
 * @param {React.ComponentType<{ className?: string }>} [props.icon] - Optional leading icon component.
 * @param {React.ReactNode} [props.actions] - Right-aligned actions.
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function AppSection({ title, subtitle, icon: Icon, actions, children, className = "" }) {
  return (
    <section data-component="AppSection" className={`flex flex-col gap-3 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title && (
              <div className="flex items-center gap-2">
                {Icon && <Icon className="text-sm text-BrandOrange" />}
                <h2 className="text-xs font-semibold uppercase tracking-widest text-BrandGray2">{title}</h2>
              </div>
            )}
            {subtitle && <p className="mt-1 text-xs text-BrandGray2">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0 sm:justify-end">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
