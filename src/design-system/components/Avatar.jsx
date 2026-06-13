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
export default function Avatar({ src, name = "?", size = "md", status, className = "", style, ...rest }) {
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
    online: "var(--ui-success)",
    busy: "var(--ui-warning)",
    offline: "var(--ui-text-subtle)",
  }[status];

  return (
    <span data-component="Avatar" className={`relative inline-flex shrink-0 ${className}`} style={{ width: dimension, height: dimension, ...style }} {...rest}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover"
          style={{ border: "1px solid var(--ui-border)" }}
        />
      ) : (
        <span
          className="inline-flex h-full w-full items-center justify-center rounded-full text-xs font-semibold"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--ui-accent-muted) 95%, transparent) 0%, color-mix(in srgb, var(--ui-accent-muted) 100%, transparent) 100%)",
            border: "1px solid var(--ui-border)",
            color: "var(--ui-accent)",
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
            border: "2px solid var(--ui-surface)",
          }}
        />
      ) : null}
    </span>
  );
}
