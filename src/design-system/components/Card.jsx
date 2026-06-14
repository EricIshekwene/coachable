/**
 * Rounded surface card using shared design-system tokens.
 *
 * @param {{
 *   children: React.ReactNode,
 *   className?: string,
 *   padding?: "none"|"sm"|"md"|"lg"|boolean|string,
 *   interactive?: boolean,
 *   selected?: boolean,
 *   tone?: "default"|"elevated"|"ghost",
 *   as?: React.ElementType,
 * }} props
 * @returns {JSX.Element}
 */
export default function Card({
  children,
  className = "",
  padding = "md",
  interactive = false,
  selected = false,
  tone = "default",
  as: Component = "div",
  type,
  onClick,
  style,
  ...cardProps
}) {
  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  }[padding] ?? (typeof padding === "string" ? padding : padding ? "p-5" : "");
  const isInteractive = interactive || Boolean(onClick);
  const backgroundColor = tone === "ghost"
    ? "transparent"
    : tone === "elevated"
      ? "var(--ui-surface-elevated)"
      : "var(--ui-surface)";
  const borderStyle = tone === "ghost" ? "dashed" : "solid";
  const nativeType = Component === "button" ? (type ?? "button") : undefined;

  return (
    <Component
      type={nativeType}
      onClick={onClick}
      className={`rounded-[var(--radius-lg)] ${paddingClasses} ${isInteractive ? "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg" : ""} ${className}`}
      style={{
        backgroundColor,
        border: `1px ${borderStyle} ${selected ? "var(--ui-accent)" : "var(--ui-border)"}`,
        boxShadow: tone === "elevated" ? "var(--shadow-md)" : tone === "ghost" ? "none" : "var(--shadow-sm)",
        ...style,
      }}
      {...cardProps}
      data-component="Card"
    >
      {children}
    </Component>
  );
}
