/**
 * Rounded surface card using admin theme tokens.
 *
 * @param {{
 *   children: React.ReactNode,
 *   className?: string,
 *   padding?: boolean,
 *   onClick?: () => void,
 * }} props
 */
export default function Card({ children, className = "", padding = true, onClick, style, ...cardProps }) {
  const paddingClasses = typeof padding === "string"
    ? padding
    : padding
      ? "p-5"
      : "";

  return (
    <div
      onClick={onClick}
      className={`rounded-[var(--radius-lg)] ${paddingClasses} ${onClick ? "cursor-pointer transition-all hover:-translate-y-0.5 hover:opacity-95" : ""} ${className}`}
      style={{
        backgroundColor: "var(--ui-surface)",
        border: "1px solid var(--ui-border)",
        boxShadow: "var(--shadow-sm)",
        ...style,
      }}
      {...cardProps}
      data-component="Card"
    >
      {children}
    </div>
  );
}
