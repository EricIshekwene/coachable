import { useEffect, useRef } from "react";

/**
 * Admin modal overlay — replaces all inline `fixed inset-0 z-50` modal patterns.
 *
 * @param {{
 *   open: boolean,
 *   onClose?: () => void,
 *   title?: string,
 *   children: React.ReactNode,
 *   width?: string,
 *   hideClose?: boolean,
 * }} props
 */
export default function Modal({ open, onClose, title, children, width = "max-w-md", hideClose = false, className = "", style, onMouseDown, ...rest }) {
  const overlayRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      data-component="Modal"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}
      style={{ backgroundColor: "var(--ui-overlay)", backdropFilter: "blur(10px)", ...style }}
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) onClose?.();
        onMouseDown?.(event);
      }}
      {...rest}
    >
      <div
        className={`relative max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-[var(--radius-lg)] p-4 sm:p-6 ${width}`}
        style={{
          backgroundColor: "var(--ui-surface-elevated)",
          border: "1px solid var(--ui-border-strong)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {(title || !hideClose) && (
          <div className="mb-5 flex items-center justify-between gap-4">
            {title && (
              <h3
                className="font-Manrope text-sm font-semibold"
                style={{ color: "var(--ui-text)" }}
              >
                {title}
              </h3>
            )}
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                className="ml-auto rounded-md p-1 transition-opacity hover:opacity-60"
                style={{ color: "var(--ui-text-muted)" }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
