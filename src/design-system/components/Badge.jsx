/**
 * Status/label badge for lists, counts, and semantic states.
 *
 * @param {{
 *   status?: "open"|"in_progress"|"resolved"|"pass"|"fail"|"warning"|"info",
 *   tone?: "default"|"success"|"warning"|"danger"|"info",
 *   size?: "xs"|"sm"|"md",
 *   dot?: boolean,
 *   children?: React.ReactNode,
 *   className?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function Badge({
  status,
  tone = "default",
  size = "sm",
  dot = false,
  children,
  className = "",
  style,
  ...rest
}) {
  const styles = {
    open:        { bg: "var(--ui-info-muted)",   color: "var(--ui-info)" },
    in_progress: { bg: "var(--ui-warning-muted)",  color: "var(--ui-warning)" },
    resolved:    { bg: "var(--ui-success-muted)",  color: "var(--ui-success)" },
    pass:        { bg: "var(--ui-success-muted)",  color: "var(--ui-success)" },
    fail:        { bg: "var(--ui-danger-muted)",    color: "var(--ui-danger)" },
    warning:     { bg: "var(--ui-warning-muted)",  color: "var(--ui-warning)" },
    info:        { bg: "var(--ui-accent-muted)", color: "var(--ui-accent)" },
  };

  const toneStyles = {
    default: { bg: "var(--ui-surface-2)", color: "var(--ui-text-muted)" },
    success: { bg: "var(--ui-success-muted)", color: "var(--ui-success)" },
    warning: { bg: "var(--ui-warning-muted)", color: "var(--ui-warning)" },
    danger: { bg: "var(--ui-danger-muted)", color: "var(--ui-danger)" },
    info: { bg: "var(--ui-info-muted)", color: "var(--ui-info)" },
  };
  const s = styles[status] ?? toneStyles[tone] ?? toneStyles.default;
  const sizeClasses = {
    xs: "px-1.5 py-0 text-[10px]",
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
  }[size] ?? "px-2 py-0.5 text-[11px]";

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
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizeClasses} ${className}`}
      style={{ backgroundColor: s.bg, color: s.color, border: "1px solid color-mix(in srgb, currentColor 14%, transparent)", ...style }}
      {...rest}
    >
      {dot ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "currentColor" }} /> : null}
      {label}
    </span>
  );
}
