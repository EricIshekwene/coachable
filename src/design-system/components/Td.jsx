/**
 * `Td` — canonical table data cell.
 *
 * Used inside `DataTable` and as an escape hatch for custom tables. Applies
 * consistent padding and a 1 px bottom row divider.
 *
 * @param {Object} props
 * @param {"left"|"right"|"center"} [props.align="left"] - Text alignment
 * @param {"md"|"sm"|"xs"} [props.size="md"] - Cell padding: md=px-4 py-4, sm=px-3 py-3, xs=px-2 py-1.5
 * @param {string} [props.className=""] - Extra className for overrides
 * @param {React.CSSProperties} [props.style] - Inline style overrides
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export default function Td({ align = "left", size = "md", className = "", style, children }) {
  const padding =
    size === "xs" ? "px-2 py-1.5" :
    size === "sm" ? "px-3 py-3" :
    "px-4 py-4";

  return (
    <td
      data-component="Td"
      className={`${padding} align-top ${className}`}
      style={{
        textAlign: align,
        borderBottom: "1px solid var(--ui-border)",
        ...style,
      }}
    >
      {children}
    </td>
  );
}
