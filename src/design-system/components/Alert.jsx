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
export default function Alert({ tone = "info", title, children, className = "", style, ...rest }) {
  const palette = {
    info: {
      bg: "var(--ui-info-muted)",
      border: "color-mix(in srgb, var(--ui-info) 22%, transparent)",
      color: "var(--ui-info)",
    },
    success: {
      bg: "var(--ui-success-muted)",
      border: "color-mix(in srgb, var(--ui-success) 22%, transparent)",
      color: "var(--ui-success)",
    },
    warning: {
      bg: "var(--ui-warning-muted)",
      border: "color-mix(in srgb, var(--ui-warning) 28%, transparent)",
      color: "var(--ui-warning)",
    },
    danger: {
      bg: "var(--ui-danger-muted)",
      border: "color-mix(in srgb, var(--ui-danger) 24%, transparent)",
      color: "var(--ui-danger)",
    },
  }[tone];

  return (
    <div
      data-component="Alert"
      className={`rounded-[var(--radius)] px-4 py-3 ${className}`}
      style={{
        backgroundColor: palette.bg,
        border: `1px solid ${palette.border}`,
        ...style,
      }}
      {...rest}
    >
      {title ? (
        <p className="text-sm font-semibold" style={{ color: palette.color }}>
          {title}
        </p>
      ) : null}
      {children ? (
        <div className={`${title ? "mt-1.5" : ""} text-sm`} style={{ color: "var(--ui-text-muted)" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
