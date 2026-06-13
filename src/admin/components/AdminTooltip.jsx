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
export default function AdminTooltip({ label, children, placement = "top", className = "" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const posClass = placement === "top" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <span
      data-component="AdminTooltip"
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-[var(--adm-radius-sm)] px-2.5 py-1.5 text-xs font-medium ${posClass}`}
          style={{
            backgroundColor: "var(--adm-surface-elevated)",
            color: "var(--adm-text)",
            border: "1px solid var(--adm-border2)",
            boxShadow: "var(--adm-shadow)",
          }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
