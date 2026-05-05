/**
 * Status/label badge for admin lists.
 *
 * @param {{
 *   status?: "open"|"in_progress"|"resolved"|"pass"|"fail"|"warning"|"info",
 *   children?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export default function AdminBadge({ status, children, className = "" }) {
  const styles = {
    open:        { bg: "var(--adm-badge-blue-bg)",   color: "var(--adm-badge-blue-text)" },
    in_progress: { bg: "var(--adm-badge-amber-bg)",  color: "var(--adm-badge-amber-text)" },
    resolved:    { bg: "var(--adm-badge-green-bg)",  color: "var(--adm-badge-green-text)" },
    pass:        { bg: "var(--adm-badge-green-bg)",  color: "var(--adm-badge-green-text)" },
    fail:        { bg: "var(--adm-badge-red-bg)",    color: "var(--adm-badge-red-text)" },
    warning:     { bg: "var(--adm-badge-amber-bg)",  color: "var(--adm-badge-amber-text)" },
    info:        { bg: "var(--adm-badge-purple-bg)", color: "var(--adm-badge-purple-text)" },
  };

  const s = styles[status] ?? { bg: "var(--adm-surface2)", color: "var(--adm-muted)" };

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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}
      style={{ backgroundColor: s.bg, color: s.color, border: "1px solid color-mix(in srgb, currentColor 14%, transparent)" }}
    >
      {label}
    </span>
  );
}
