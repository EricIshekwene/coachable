import { useState } from "react";

/**
 * Item within a Menu.
 *
 * @param {{
 *   icon?: React.ReactNode,
 *   destructive?: boolean,
 *   disabled?: boolean,
 *   selected?: boolean,
 *   onSelect?: () => void,
 *   children: React.ReactNode,
 * }} props
 */
export default function MenuItem({ icon, destructive = false, disabled = false, selected = false, onSelect, children }) {
  const [hovered, setHovered] = useState(false);

  const baseColor = destructive ? "var(--ui-danger)" : "var(--ui-text-muted)";
  const activeColor = destructive ? "var(--ui-danger)" : "var(--ui-text)";

  const handleActivate = () => {
    if (disabled) return;
    onSelect?.();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.();
    }
  };

  return (
    <div
      data-component="MenuItem"
      role="menuitem"
      tabIndex={disabled ? undefined : -1}
      aria-disabled={disabled || undefined}
      aria-selected={selected || undefined}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left text-xs outline-none transition-colors"
      style={{
        color: hovered && !disabled ? activeColor : baseColor,
        backgroundColor: hovered && !disabled ? "var(--ui-surface-2)" : "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon && <span className="shrink-0 text-sm">{icon}</span>}
      {children}
    </div>
  );
}
