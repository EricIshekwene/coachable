import { forwardRef } from "react";

/**
 * Shared button with consistent variants.
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
const Button = forwardRef(function Button({
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
}, ref) {
  const sizeClasses = {
    sm: "min-h-9 px-3 py-1.5 text-xs",
    md: "min-h-10 px-3.5 py-2 text-sm",
    lg: "min-h-11 px-4 py-2.5 text-sm",
    icon: "h-10 w-10 justify-center p-0 text-sm",
  }[size] ?? "min-h-10 px-3.5 py-2 text-sm";

  const variantStyle = {
    primary: {
      background: "linear-gradient(135deg, color-mix(in srgb, var(--ui-accent) 96%, var(--ui-on-accent) 4%) 0%, var(--ui-accent) 100%)",
      color: "var(--ui-on-accent)",
      border: "1px solid color-mix(in srgb, var(--ui-accent) 66%, transparent)",
      boxShadow: "0 10px 24px color-mix(in srgb, var(--ui-accent-muted) 95%, transparent)",
    },
    secondary: {
      backgroundColor: "var(--ui-surface-2)",
      color: "var(--ui-text)",
      border: "1px solid var(--ui-border-strong)",
      boxShadow: "var(--shadow-sm)",
    },
    outline: {
      backgroundColor: "transparent",
      color: "var(--ui-text)",
      border: "1px solid var(--ui-border-strong)",
    },
    danger: {
      backgroundColor: "var(--ui-danger-muted)",
      color: "var(--ui-danger)",
      border: "1px solid color-mix(in srgb, var(--ui-danger) 20%, transparent)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--ui-text-muted)",
      border: "1px solid transparent",
    },
  }[variant];

  return (
    <button
      ref={ref}
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] font-semibold transition-all duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45 ${sizeClasses} ${className}`}
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
            e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--ui-surface-2) 76%, transparent)";
          }
          if (variant === "outline") {
            e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--ui-surface-2) 52%, transparent)";
            e.currentTarget.style.borderColor = "var(--ui-border-strong)";
          }
          if (variant === "secondary") {
            e.currentTarget.style.backgroundColor = "var(--ui-surface-3)";
          }
          if (variant === "danger") {
            e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--ui-danger-muted) 75%, var(--ui-surface))";
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
            e.currentTarget.style.borderColor = "var(--ui-border-strong)";
          }
        }
        onMouseLeave?.(e);
      }}
      {...buttonProps}
      data-component="Button"
    >
      {children}
    </button>
  );
});

export default Button;
