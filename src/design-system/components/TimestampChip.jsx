import { FiClock } from "react-icons/fi";

/**
 * Read-only pill with clock icon and relative time. Renders as span, not interactive.
 * @param {import("react").ReactNode} children - Formatted time string (e.g. "2 days ago")
 * @param {string} [className]
 */
export default function TimestampChip({ children, className = "" }) {
  return (
    <span
      data-component="TimestampChip"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${className}`}
      style={{ borderColor: "var(--ui-border)", backgroundColor: "rgba(0,0,0,0.2)", color: "var(--ui-text-subtle)" }}
    >
      <FiClock className="shrink-0 text-[10px]" />
      {children}
    </span>
  );
}
