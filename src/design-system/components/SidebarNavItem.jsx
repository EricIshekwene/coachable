import { NavLink } from "react-router-dom";
import Badge from "./Badge";

/**
 * Single navigation link inside a sidebar. Handles active state, icon, and optional badge.
 * Used by both the admin sidebar (AdminSidebar.jsx) and the app sidebar (AppLayout.jsx).
 *
 * @param {string}          props.label
 * @param {import("react").ReactNode} [props.icon]
 * @param {string}          [props.href]    - Route path; renders as NavLink when provided
 * @param {boolean}         [props.active]  - Overrides NavLink active detection when provided
 * @param {boolean}         [props.end]     - Passed to NavLink for exact-path matching
 * @param {string|number}   [props.badge]
 * @param {() => void}      [props.onClick]
 * @param {string}          [props.className]
 */
export default function SidebarNavItem({
  label,
  icon,
  href,
  active,
  end = false,
  badge,
  onClick,
  className = "",
}) {
  const baseClass = `rounded-md px-3 py-2 text-xs font-semibold transition-colors w-full flex items-center gap-2.5 hover:bg-[color:var(--ui-surface-2)] ${className}`;

  const activeStyle = {
    backgroundColor: "var(--ui-accent-muted)",
    color: "var(--ui-accent)",
    boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--ui-accent) 22%, transparent)",
  };
  const inactiveStyle = { color: "var(--ui-text-muted)" };

  const content = (
    <>
      {icon && <span className="h-4 w-4 shrink-0 flex items-center justify-center">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <Badge size="xs" tone="info">{badge}</Badge>
      )}
    </>
  );

  if (href) {
    return (
      <NavLink
        data-component="SidebarNavItem"
        to={href}
        end={end}
        onClick={onClick}
        className={baseClass}
        style={({ isActive }) => {
          const resolvedActive = active !== undefined ? active : isActive;
          return resolvedActive ? activeStyle : inactiveStyle;
        }}
      >
        {content}
      </NavLink>
    );
  }

  return (
    <button
      data-component="SidebarNavItem"
      type="button"
      onClick={onClick}
      className={baseClass}
      style={active ? activeStyle : inactiveStyle}
    >
      {content}
    </button>
  );
}
