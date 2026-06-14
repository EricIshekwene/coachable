import { useEffect } from "react";
import ReactDOM from "react-dom";

const TONE_STYLES = {
  default: { color: "var(--ui-accent)" },
  success: { color: "var(--ui-success)" },
  error:   { color: "var(--ui-danger)" },
  warning: { color: "var(--ui-warning)" },
  info:    { color: "var(--ui-info)" },
};

const POSITION_CLASSES = {
  "bottom-right":  "fixed bottom-4 right-4",
  "bottom-center": "fixed bottom-6 left-1/2 -translate-x-1/2",
  "top-right":     "fixed top-4 right-4",
};

/**
 * Transient status message rendered in a fixed corner position.
 * For persistent inline feedback use Alert instead.
 *
 * @param {{
 *   open: boolean,
 *   title: string,
 *   description?: string,
 *   tone?: "default" | "success" | "error" | "warning" | "info",
 *   duration?: number,
 *   position?: "bottom-right" | "bottom-center" | "top-right",
 *   onClose: () => void,
 * }} props
 */
export default function Toast({
  open,
  title,
  description,
  tone = "default",
  duration = 3000,
  position = "bottom-right",
  onClose,
}) {
  useEffect(() => {
    if (!open || !duration) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const dot = TONE_STYLES[tone] ?? TONE_STYLES.default;
  const posClass = POSITION_CLASSES[position] ?? POSITION_CLASSES["bottom-right"];
  const role = tone === "error" ? "alert" : "status";
  const ariaLive = tone === "error" ? "assertive" : "polite";

  return ReactDOM.createPortal(
    <div
      data-component="Toast"
      role={role}
      aria-live={ariaLive}
      className={`${posClass} z-[9999] flex items-center gap-2 rounded-lg px-4 py-3 shadow-xl`}
      style={{
        backgroundColor: "var(--ui-surface-elevated)",
        border: "1px solid var(--ui-border)",
        boxShadow: "var(--shadow-lg)",
        animation: "fadeInUp 0.22s ease-out",
      }}
    >
      <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dot.color }} />
      <div className="min-w-0">
        <p className="text-sm" style={{ color: "var(--ui-text)" }}>{title}</p>
        {description && (
          <p className="text-xs" style={{ color: "var(--ui-text-muted)" }}>{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="ml-2 shrink-0 rounded p-0.5 transition-opacity hover:opacity-60"
        style={{ color: "var(--ui-text-muted)" }}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>,
    document.body,
  );
}
