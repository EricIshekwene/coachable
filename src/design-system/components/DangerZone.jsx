/**
 * `DangerZone` — danger-styled container section for destructive actions.
 *
 * Replaces inline danger-zone divs in settings pages. Provides consistent
 * danger-colored border, background tint, title, and description, with an
 * arbitrary `children` slot for the action buttons.
 *
 * @param {Object} props
 * @param {string} [props.title="Danger Zone"] - Section heading (rendered in danger color)
 * @param {string} [props.description] - Explanatory text below the title
 * @param {React.ReactNode} props.children - Action button(s) and any additional content
 * @param {string} [props.className=""] - Extra className on the root element
 * @returns {JSX.Element}
 */
export default function DangerZone({ title = "Danger Zone", description, children, className = "" }) {
  return (
    <div
      data-component="DangerZone"
      className={`rounded-lg p-4 ${className}`}
      style={{
        backgroundColor: "color-mix(in srgb, var(--ui-danger) 6%, transparent)",
        border: "1px solid color-mix(in srgb, var(--ui-danger) 24%, transparent)",
      }}
    >
      <p className="text-sm font-semibold" style={{ color: "var(--ui-danger)" }}>
        {title}
      </p>
      {description && (
        <p className="mt-1 text-xs" style={{ color: "var(--ui-text-subtle)" }}>
          {description}
        </p>
      )}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
