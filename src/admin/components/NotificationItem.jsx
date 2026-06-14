/**
 * Admin-only notification feed item.
 *
 * Unread items carry an accent dot and a tinted background; read items mute
 * to a plain border. Supports optional tone coloring for the unread dot.
 *
 * @param {object}   props
 * @param {string}   props.title                              - Notification headline
 * @param {string}   [props.body]                             - Secondary detail line
 * @param {string}   [props.time]                             - Relative or formatted timestamp
 * @param {boolean}  [props.read=false]                       - True once the item has been read
 * @param {"default"|"success"|"warning"|"danger"} [props.tone="default"] - Dot accent tone
 * @param {Function} [props.onClick]                          - Click handler
 * @param {string}   [props.className=""]
 */
export default function NotificationItem({ title, body, time, read = false, tone = "default", onClick, className = "" }) {
  const dotColor = {
    default: read ? "var(--adm-border2)" : "var(--adm-accent)",
    success: "var(--ui-success, #22c55e)",
    warning: "var(--ui-warning, #f59e0b)",
    danger:  "var(--ui-danger,  #ef4444)",
  }[tone] ?? (read ? "var(--adm-border2)" : "var(--adm-accent)");

  return (
    <div
      data-component="NotificationItem"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(e); } : undefined}
      className={`flex items-start gap-3 px-4 py-3 transition ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        backgroundColor: !read ? "color-mix(in srgb, var(--adm-accent-dim) 80%, transparent)" : "transparent",
        borderTop: "1px solid var(--adm-border)",
      }}
    >
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>{title}</p>
        {body && <p className="mt-0.5 text-xs" style={{ color: "var(--adm-text3)" }}>{body}</p>}
      </div>
      {time && <span className="shrink-0 text-xs" style={{ color: "var(--adm-text3)" }}>{time}</span>}
    </div>
  );
}
