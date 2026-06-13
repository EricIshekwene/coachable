import { useId, useState } from "react";

/**
 * Admin-themed tooltip that shows on hover and keyboard focus. Wrap the trigger
 * element. Unlike the Slate tooltip (dark editor canvas), this reads the admin
 * surface tokens so it works in both light and dark admin themes.
 *
 * @param {{
 *   label: React.ReactNode,
 *   children: React.ReactNode,
 *   placement?: "top"|"bottom",
 *   className?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function Tooltip({ label, children, placement = "top", className = "", ...rest }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const posClass = placement === "top" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <span
      data-component="Tooltip"
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      {...rest}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium ${posClass}`}
          style={{
            backgroundColor: "var(--ui-surface-elevated)",
            color: "var(--ui-text)",
            border: "1px solid var(--ui-border-strong)",
            boxShadow: "var(--shadow)",
          }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
