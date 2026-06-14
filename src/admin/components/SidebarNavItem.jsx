/**
 * Single navigation item for the admin sidebar.
 *
 * Matches the active-item visual treatment used by AdminSidebar:
 * accent-dim fill + accent text + inset accent ring for the active route,
 * muted text for inactive items.
 *
 * @param {object}          props
 * @param {string}          props.label         - Display label
 * @param {React.ReactNode} [props.icon]        - Leading icon node
 * @param {boolean}         [props.active=false] - Whether this route is currently active
 * @param {React.ReactNode} [props.badge]       - Trailing badge (e.g. a count chip)
 * @param {Function}        [props.onClick]     - Click / keyboard activation handler
 * @param {string}          [props.className=""]
 */
export default function SidebarNavItem({ label, icon, active = false, badge, onClick, className = "" }) {
  return (
    <div
      data-component="SidebarNavItem"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(e); }}
      className={`flex cursor-pointer items-center justify-between gap-2 rounded-[var(--adm-radius-md)] px-3 py-2 text-xs font-semibold transition ${className}`}
      style={
        active
          ? {
              backgroundColor: "color-mix(in srgb, var(--adm-accent-dim) 85%, var(--adm-surface2))",
              color: "var(--adm-accent)",
              boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--adm-accent) 22%, transparent)",
            }
          : { color: "var(--adm-text2)" }
      }
    >
      <span className="flex items-center gap-2">
        {icon && <span className="text-sm">{icon}</span>}
        {label}
      </span>
      {badge && <span>{badge}</span>}
    </div>
  );
}
