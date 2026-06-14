/**
 * `BulkBar` — inline bulk-action bar that appears when rows are selected.
 *
 * Renders "N selected" on the left with an optional clear link, and action
 * buttons on the right. Animates in/out based on the `visible` prop.
 *
 * @param {Object} props
 * @param {number} props.count - Number of selected items
 * @param {() => void} [props.onClearSelect] - Called when the user clicks "Clear selection"
 * @param {React.ReactNode} props.actions - Action buttons (Delete, Move, Tag, etc.)
 * @param {boolean} [props.visible=true] - Controls visibility; when false the bar collapses to zero height
 * @param {string} [props.className=""] - Extra className on the root wrapper
 * @returns {JSX.Element}
 */
export default function BulkBar({ count, onClearSelect, actions, visible = true, className = "" }) {
  if (!visible) return null;

  return (
    <div
      data-component="BulkBar"
      className={`flex flex-wrap items-center gap-2 rounded-lg border px-4 py-2.5 ${className}`}
      style={{
        backgroundColor: "var(--ui-accent-muted)",
        borderColor: "color-mix(in srgb, var(--ui-accent) 30%, transparent)",
      }}
    >
      <span className="text-sm font-semibold" style={{ color: "var(--ui-accent)" }}>
        {count} selected
      </span>
      {onClearSelect && (
        <button
          type="button"
          onClick={onClearSelect}
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: "var(--ui-accent)" }}
        >
          Clear
        </button>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {actions}
      </div>
    </div>
  );
}
