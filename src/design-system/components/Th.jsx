/**
 * `Th` — canonical table header cell.
 *
 * Used inside `DataTable` and as an escape hatch for custom tables. Applies the
 * shared admin-table header style: 10 px uppercase letter-spaced label, 1 px
 * bottom border, muted text color.
 *
 * @param {Object} props
 * @param {"left"|"right"|"center"} [props.align="left"] - Text alignment
 * @param {string} [props.width] - CSS width value (e.g. "25%", "96px")
 * @param {boolean} [props.sticky=false] - Stick to the top of a scrolling container
 * @param {"md"|"sm"|"xs"} [props.size="md"] - Cell padding: md=px-4 py-3, sm=px-3 py-2, xs=px-2 py-1.5
 * @param {string} [props.className=""] - Extra className for overrides
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export default function Th({ align = "left", width, sticky = false, size = "md", className = "", children }) {
  const padding =
    size === "xs" ? "px-2 py-1.5" :
    size === "sm" ? "px-3 py-2" :
    "px-4 py-3";

  return (
    <th
      data-component="Th"
      className={`${padding} text-[10px] font-semibold uppercase tracking-[0.18em] ${sticky ? "sticky top-0 z-10 backdrop-blur-sm" : ""} ${className}`}
      style={{
        textAlign: align,
        width: width || undefined,
        color: "var(--ui-text-muted)",
        borderBottom: "1px solid var(--ui-border)",
        backgroundColor: sticky ? "var(--ui-surface)" : undefined,
      }}
    >
      {children}
    </th>
  );
}
