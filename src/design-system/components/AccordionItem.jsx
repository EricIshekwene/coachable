import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";

/**
 * Collapsible content section with animated height and chevron toggle.
 * @param {string} title
 * @param {boolean} [defaultOpen=false]
 * @param {import("react").ReactNode} [actions] - Optional buttons rendered below body content
 * @param {import("react").ReactNode} children
 * @param {string} [className]
 */
export default function AccordionItem({ title, defaultOpen = false, actions, children, className = "" }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      data-component="AccordionItem"
      className={`border-b last:border-b-0 ${className}`}
      style={{ borderColor: "var(--ui-border)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-start justify-between gap-4 py-4 text-left"
        style={{ color: "var(--ui-text)" }}
      >
        <span className="text-sm font-semibold leading-snug">{title}</span>
        <FiChevronDown
          className={`mt-0.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--ui-text-muted)" }}
        />
      </button>
      <div className={`overflow-hidden transition-[max-height] duration-200 ${open ? "max-h-[72rem] pb-4" : "max-h-0"}`}>
        <div className="text-sm leading-relaxed" style={{ color: "var(--ui-text-muted)" }}>
          {children}
        </div>
        {actions && <div className="mt-3">{actions}</div>}
      </div>
    </div>
  );
}
