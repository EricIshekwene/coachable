/**
 * Horizontal or vertical rule using the shared border token.
 *
 * @param {{
 *   orientation?: "horizontal"|"vertical",
 *   tone?: "default"|"strong",
 *   className?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function Divider({
  orientation = "horizontal",
  tone = "default",
  className = "",
  style,
  ...rest
}) {
  const borderColor = tone === "strong" ? "var(--ui-border-strong)" : "var(--ui-border)";
  const vertical = orientation === "vertical";

  return (
    <div
      data-component="Divider"
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      className={`${vertical ? "self-stretch" : "w-full"} ${className}`}
      style={{
        ...(vertical
          ? { width: 1, minHeight: "1em", backgroundColor: borderColor }
          : { height: 1, backgroundColor: borderColor }),
        ...style,
      }}
      {...rest}
    />
  );
}
