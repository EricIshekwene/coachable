/**
 * Simple circular loading spinner using shared semantic tokens.
 *
 * @param {{
 *   size?: "sm"|"md"|"lg"|number,
 *   tone?: "default"|"accent",
 *   label?: string,
 *   className?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function Spinner({
  size = "md",
  tone = "accent",
  label = "Loading",
  className = "",
  style,
  ...rest
}) {
  const dimension = typeof size === "number" ? size : {
    sm: 16,
    md: 24,
    lg: 32,
  }[size] ?? 24;

  return (
    <span
      data-component="Spinner"
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full ${className}`}
      style={{
        width: dimension,
        height: dimension,
        border: "2px solid var(--ui-border-strong)",
        borderTopColor: tone === "default" ? "var(--ui-text-muted)" : "var(--ui-accent)",
        ...style,
      }}
      {...rest}
    />
  );
}
