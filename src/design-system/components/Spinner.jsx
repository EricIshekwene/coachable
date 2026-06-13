/**
 * Simple circular loading spinner using the admin accent color.
 * @param {{ size?: number, className?: string }} props
 */
export default function Spinner({ size = 20, className = "", style, ...rest }) {
  return (
    <span
      data-component="Spinner"
      className={`inline-block animate-spin rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        border: "2px solid var(--ui-border-strong)",
        borderTopColor: "var(--ui-accent)",
        ...style,
      }}
      {...rest}
    />
  );
}
