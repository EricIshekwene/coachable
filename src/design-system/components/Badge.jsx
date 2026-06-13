/**
 * Status/label badge for admin lists.
 *
 * @param {{
 *   status?: "open"|"in_progress"|"resolved"|"pass"|"fail"|"warning"|"info",
 *   children?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export default function Badge({ status, children, className = "", style, ...rest }) {
  const styles = {
    open:        { bg: "var(--ui-info-muted)",   color: "var(--ui-info)" },
    in_progress: { bg: "var(--ui-warning-muted)",  color: "var(--ui-warning)" },
    resolved:    { bg: "var(--ui-success-muted)",  color: "var(--ui-success)" },
    pass:        { bg: "var(--ui-success-muted)",  color: "var(--ui-success)" },
    fail:        { bg: "var(--ui-danger-muted)",    color: "var(--ui-danger)" },
    warning:     { bg: "var(--ui-warning-muted)",  color: "var(--ui-warning)" },
    info:        { bg: "var(--ui-accent-muted)", color: "var(--ui-accent)" },
  };

  const s = styles[status] ?? { bg: "var(--ui-surface-2)", color: "var(--ui-text-muted)" };

  const label = children ?? {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
    pass: "Pass",
    fail: "Fail",
    warning: "Warning",
    info: "Info",
  }[status] ?? status;

  return (
    <span
      data-component="Badge"
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}
      style={{ backgroundColor: s.bg, color: s.color, border: "1px solid color-mix(in srgb, currentColor 14%, transparent)", ...style }}
      {...rest}
    >
      {label}
    </span>
  );
}
