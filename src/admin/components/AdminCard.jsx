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
export default function AdminCard({ children, className = "", padding = true, onClick, style, ...cardProps }) {
  const paddingClasses = typeof padding === "string"
    ? padding
    : padding
      ? "p-5"
      : "";

  return (
    <div
      onClick={onClick}
      className={`rounded-[var(--adm-radius-lg)] ${paddingClasses} ${onClick ? "cursor-pointer transition-all hover:-translate-y-0.5 hover:opacity-95" : ""} ${className}`}
      style={{
        backgroundColor: "var(--adm-surface)",
        border: "1px solid var(--adm-border)",
        boxShadow: "var(--adm-shadow-sm)",
        ...style,
      }}
      {...cardProps}
      data-component="AdminCard"
    >
      {children}
    </div>
  );
}
