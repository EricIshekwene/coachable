/**
 * `SettingsRow` — single settings page row: label + optional description on the
 * left, arbitrary control on the right.
 *
 * Replaces inline `flex items-center justify-between` settings-row divs so all
 * settings pages share identical spacing, typography, and divider treatment.
 *
 * @param {Object} props
 * @param {string} props.label - Row label (primary text, always visible)
 * @param {string} [props.description] - Secondary descriptive text below the label
 * @param {React.ReactNode} props.control - Control element rendered on the right (Toggle, Button, Select, etc.)
 * @param {boolean} [props.divider=true] - Renders a 1 px top border (use false on the first row)
 * @param {boolean} [props.danger=false] - Tints the label with --ui-danger color
 * @param {string} [props.className=""] - Extra className on the root element
 * @returns {JSX.Element}
 */
export default function SettingsRow({
  label,
  description,
  control,
  divider = true,
  danger = false,
  className = "",
}) {
  return (
    <div
      data-component="SettingsRow"
      className={`flex items-center justify-between gap-4 py-4 ${className}`}
      style={divider ? { borderTop: "1px solid var(--ui-border)" } : undefined}
    >
      <div className="min-w-0">
        <p
          className="text-sm font-semibold"
          style={{ color: danger ? "var(--ui-danger)" : "var(--ui-text)" }}
        >
          {label}
        </p>
        {description && (
          <p className="mt-1 text-xs" style={{ color: "var(--ui-text-subtle)" }}>
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
