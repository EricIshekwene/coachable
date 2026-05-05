/**
 * Admin button with consistent variants.
 *
 * @param {{
 *   variant?: "primary"|"secondary"|"danger"|"ghost",
 *   size?: "sm"|"md",
 *   children: React.ReactNode,
 *   className?: string,
 *   disabled?: boolean,
 *   type?: "button"|"submit"|"reset",
 *   onClick?: (e: React.MouseEvent) => void,
 *   title?: string,
 * }} props
 */
export default function AdminBtn({
  variant = "secondary",
  size = "md",
  children,
  className = "",
  disabled,
  type = "button",
  onClick,
  title,
}) {
  const sizeClasses = size === "sm"
    ? "px-3 py-1.5 text-xs"
    : "px-3.5 py-2 text-sm";

  const variantStyle = {
    primary: {
      backgroundColor: "var(--adm-accent)",
      color: "#fff",
      border: "none",
    },
    secondary: {
      backgroundColor: "var(--adm-surface2)",
      color: "var(--adm-text)",
      border: "1px solid var(--adm-border2)",
    },
    danger: {
      backgroundColor: "var(--adm-danger-dim)",
      color: "var(--adm-danger)",
      border: "1px solid rgba(220, 38, 38, 0.18)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--adm-text2)",
      border: "none",
    },
  }[variant];

  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-[var(--adm-radius-sm)] font-semibold transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none ${sizeClasses} ${className}`}
      style={{
        ...variantStyle,
        ...(variant === "primary" ? { filter: "brightness(1)" } : {}),
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === "primary") e.currentTarget.style.filter = "brightness(1.08)";
        else e.currentTarget.style.opacity = "0.85";
      }}
      onMouseLeave={(e) => {
        if (variant === "primary") e.currentTarget.style.filter = "brightness(1)";
        else e.currentTarget.style.opacity = "1";
      }}
    >
      {children}
    </button>
  );
}
