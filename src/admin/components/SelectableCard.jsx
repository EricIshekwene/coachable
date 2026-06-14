import { FiCheck } from "react-icons/fi";

/**
 * Admin-only card with a visual selection state.
 *
 * Selected state: accent border + dim background + glow shadow + checkmark badge.
 * Unselected state: neutral surface-2 background + border.
 * Follows the two-signal rule (color + checkmark) for accessibility.
 *
 * @param {object}          props
 * @param {boolean}         [props.selected=false]  - Whether the card is selected
 * @param {Function}        [props.onClick]         - Toggle / select handler
 * @param {string}          [props.label]           - Primary text label
 * @param {string}          [props.description]     - Secondary description text
 * @param {React.ReactNode} [props.children]        - Custom card body content
 * @param {string}          [props.className=""]
 */
export default function SelectableCard({ selected = false, onClick, label, description, children, className = "" }) {
  return (
    <div
      data-component="SelectableCard"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(e); }}
      className={`relative cursor-pointer rounded-[var(--adm-radius)] p-4 transition ${className}`}
      style={
        selected
          ? {
              backgroundColor: "var(--adm-accent-dim)",
              border: "1px solid color-mix(in srgb, var(--adm-accent) 50%, transparent)",
              boxShadow: "0 0 0 1px var(--adm-accent-dim)",
            }
          : { backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }
      }
    >
      {selected && (
        <span
          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
          style={{ backgroundColor: "var(--adm-accent)", color: "#fff" }}
        >
          <FiCheck />
        </span>
      )}
      {label && (
        <p className="pr-6 text-sm font-semibold" style={{ color: selected ? "var(--adm-accent)" : "var(--adm-text)" }}>
          {label}
        </p>
      )}
      {description && (
        <p className="mt-1 text-xs" style={{ color: "var(--adm-text3)" }}>{description}</p>
      )}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
