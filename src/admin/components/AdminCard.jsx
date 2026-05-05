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
export default function AdminCard({ children, className = "", padding = true, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-[var(--adm-radius)] ${padding ? "p-5" : ""} ${onClick ? "cursor-pointer transition-opacity hover:opacity-90" : ""} ${className}`}
      style={{
        backgroundColor: "var(--adm-surface)",
        border: "1px solid var(--adm-border)",
        boxShadow: "var(--adm-shadow-sm)",
      }}
    >
      {children}
    </div>
  );
}
