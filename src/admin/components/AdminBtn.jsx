/**
 * Admin button with consistent variants.
 *
 * @param {{
 *   variant?: "primary"|"secondary"|"outline"|"danger"|"ghost",
 *   size?: "sm"|"md"|"lg"|"icon",
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
  style,
  onMouseEnter,
  onMouseLeave,
  ...buttonProps
}) {
  const sizeClasses = {
    sm: "min-h-9 px-3 py-1.5 text-xs",
    md: "min-h-10 px-3.5 py-2 text-sm",
    lg: "min-h-11 px-4 py-2.5 text-sm",
    icon: "h-10 w-10 justify-center p-0 text-sm",
  }[size] ?? "min-h-10 px-3.5 py-2 text-sm";

  const variantStyle = {
    primary: {
      background: "linear-gradient(135deg, color-mix(in srgb, var(--adm-accent) 96%, white 4%) 0%, var(--adm-accent) 100%)",
      color: "#fff",
      border: "1px solid color-mix(in srgb, var(--adm-accent) 66%, transparent)",
      boxShadow: "0 10px 24px color-mix(in srgb, var(--adm-accent-dim) 95%, transparent)",
    },
    secondary: {
      backgroundColor: "var(--adm-surface2)",
      color: "var(--adm-text)",
      border: "1px solid var(--adm-border2)",
      boxShadow: "var(--adm-shadow-sm)",
    },
    outline: {
      backgroundColor: "transparent",
      color: "var(--adm-text)",
      border: "1px solid var(--adm-border2)",
    },
    danger: {
      backgroundColor: "var(--adm-danger-dim)",
      color: "var(--adm-danger)",
      border: "1px solid color-mix(in srgb, var(--adm-danger) 20%, transparent)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--adm-text2)",
      border: "1px solid transparent",
    },
  }[variant];

  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--adm-radius-md)] font-semibold transition-all duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45 ${sizeClasses} ${className}`}
      style={{
        ...variantStyle,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === "primary") {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.filter = "brightness(1.04)";
        } else {
          if (variant === "ghost") {
            e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--adm-surface2) 76%, transparent)";
          }
          if (variant === "outline") {
            e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--adm-surface2) 52%, transparent)";
            e.currentTarget.style.borderColor = "var(--adm-border-strong)";
          }
          if (variant === "secondary") {
            e.currentTarget.style.backgroundColor = "var(--adm-surface3)";
          }
          if (variant === "danger") {
            e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--adm-danger-dim) 75%, var(--adm-surface))";
          }
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (variant === "primary") {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.filter = "";
        } else {
          e.currentTarget.style.backgroundColor = variantStyle.backgroundColor ?? "";
          if (variant === "outline") {
            e.currentTarget.style.borderColor = "var(--adm-border2)";
          }
        }
        onMouseLeave?.(e);
      }}
      {...buttonProps}
      data-component="AdminBtn"
    >
      {children}
    </button>
  );
}
