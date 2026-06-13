/**
 * Small avatar primitive with optional image fallback to initials.
 *
 * @param {{
 *   src?: string,
 *   name?: string,
 *   size?: "sm"|"md"|"lg",
 *   status?: "online"|"busy"|"offline",
 *   className?: string,
 * }} props
 */
export default function AdminAvatar({ src, name = "?", size = "md", status, className = "" }) {
  const dimension = {
    sm: 32,
    md: 40,
    lg: 56,
  }[size] ?? 40;

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

  const statusColor = {
    online: "var(--adm-success)",
    busy: "var(--adm-warning)",
    offline: "var(--adm-text3)",
  }[status];

  return (
    <span data-component="AdminAvatar" className={`relative inline-flex shrink-0 ${className}`} style={{ width: dimension, height: dimension }}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover"
          style={{ border: "1px solid var(--adm-border)" }}
        />
      ) : (
        <span
          className="inline-flex h-full w-full items-center justify-center rounded-full text-xs font-semibold"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--adm-accent-dim) 95%, transparent) 0%, color-mix(in srgb, var(--adm-surface-tint) 100%, transparent) 100%)",
            border: "1px solid var(--adm-border)",
            color: "var(--adm-accent)",
          }}
        >
          {initials}
        </span>
      )}
      {statusColor ? (
        <span
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full"
          style={{
            backgroundColor: statusColor,
            border: "2px solid var(--adm-surface)",
          }}
        />
      ) : null}
    </span>
  );
}
