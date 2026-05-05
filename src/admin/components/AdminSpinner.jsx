/**
 * Simple circular loading spinner using the admin accent color.
 * @param {{ size?: number, className?: string }} props
 */
export default function AdminSpinner({ size = 20, className = "" }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        border: "2px solid var(--adm-border2)",
        borderTopColor: "var(--adm-accent)",
      }}
    />
  );
}
