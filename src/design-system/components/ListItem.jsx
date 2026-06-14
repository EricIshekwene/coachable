/**
 * `ListItem` — media-list row with named slots.
 *
 * The single replacement for every "leading element + title + subtitle + trailing
 * action" row pattern in the codebase. Slot-based, not variant-based — the slots
 * handle all cases without proliferating sub-components.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.leading] - Leading element: Avatar, icon, checkbox, file glyph
 * @param {string|React.ReactNode} props.title - Primary label (truncates on overflow)
 * @param {string|React.ReactNode} [props.subtitle] - Secondary muted line
 * @param {React.ReactNode} [props.badge] - Badge or status chip (rendered between text and trailing)
 * @param {React.ReactNode} [props.trailing] - Trailing action: Button, Menu trigger, chevron
 * @param {() => void} [props.onClick] - Makes the row interactive (cursor-pointer + hover bg)
 * @param {boolean} [props.divider=true] - Renders a 1 px bottom border
 * @param {boolean} [props.selected=false] - Accent-dim background when selected
 * @param {string} [props.className=""] - Extra className on the root element
 * @returns {JSX.Element}
 */
export default function ListItem({
  leading,
  title,
  subtitle,
  badge,
  trailing,
  onClick,
  divider = true,
  selected = false,
  className = "",
}) {
  const isInteractive = Boolean(onClick);

  return (
    <div
      data-component="ListItem"
      className={`flex items-center gap-3 py-3 transition ${isInteractive ? "cursor-pointer" : ""} ${className}`}
      style={{
        borderBottom: divider ? "1px solid var(--ui-border)" : undefined,
        backgroundColor: selected ? "var(--ui-accent-muted)" : undefined,
      }}
      onClick={onClick}
      onMouseEnter={isInteractive ? (e) => {
        if (!selected) e.currentTarget.style.backgroundColor = "var(--ui-surface-2)";
      } : undefined}
      onMouseLeave={isInteractive ? (e) => {
        if (!selected) e.currentTarget.style.backgroundColor = "";
      } : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      {leading && <div className="shrink-0">{leading}</div>}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" style={{ color: "var(--ui-text)" }}>
          {title}
        </p>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs" style={{ color: "var(--ui-text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>

      {badge && <div className="shrink-0">{badge}</div>}
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
