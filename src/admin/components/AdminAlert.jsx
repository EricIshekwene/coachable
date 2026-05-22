/**
 * Inline alert surface with semantic tones.
 *
 * @param {{
 *   tone?: "info"|"success"|"warning"|"danger",
 *   title?: React.ReactNode,
 *   children?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export default function AdminAlert({ tone = "info", title, children, className = "" }) {
  const palette = {
    info: {
      bg: "var(--adm-info-dim)",
      border: "color-mix(in srgb, var(--adm-info) 22%, transparent)",
      color: "var(--adm-info)",
    },
    success: {
      bg: "var(--adm-success-dim)",
      border: "color-mix(in srgb, var(--adm-success) 22%, transparent)",
      color: "var(--adm-success)",
    },
    warning: {
      bg: "var(--adm-warning-dim)",
      border: "color-mix(in srgb, var(--adm-warning) 28%, transparent)",
      color: "var(--adm-warning)",
    },
    danger: {
      bg: "var(--adm-danger-dim)",
      border: "color-mix(in srgb, var(--adm-danger) 24%, transparent)",
      color: "var(--adm-danger)",
    },
  }[tone];

  return (
    <div
      className={`rounded-[var(--adm-radius)] px-4 py-3 ${className}`}
      style={{
        backgroundColor: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
    >
      {title ? (
        <p className="text-sm font-semibold" style={{ color: palette.color }}>
          {title}
        </p>
      ) : null}
      {children ? (
        <div className={`${title ? "mt-1.5" : ""} text-sm`} style={{ color: "var(--adm-text2)" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
