import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

const SIZE_MAP = { sm: 200, md: 280, lg: 360 };

/**
 * Floating content panel anchored to a trigger, for non-menu overlays
 * (tag suggestions, filter panels, date pickers).
 * Supports outside-pointer and Escape dismissal, viewport-aware positioning,
 * and repositioning on resize/scroll.
 *
 * @param {{
 *   open: boolean,
 *   anchorRef: React.RefObject<HTMLElement>,
 *   onClose: () => void,
 *   placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end",
 *   size?: "sm" | "md" | "lg",
 *   children: React.ReactNode,
 * }} props
 */
export default function Popover({
  open,
  anchorRef,
  onClose,
  placement = "bottom-start",
  size,
  children,
}) {
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState({});

  /** Recompute position from the anchor rect. */
  const reposition = () => {
    if (!open || !anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const gap = 8;
    const panelW = size ? SIZE_MAP[size] ?? SIZE_MAP.md : null;
    const style = { position: "fixed", zIndex: 9998 };

    if (placement.startsWith("bottom")) {
      const proposed = rect.bottom + gap;
      style.top = proposed;
    } else {
      style.bottom = window.innerHeight - rect.top + gap;
    }

    if (placement.endsWith("start")) {
      const proposed = rect.left;
      // Clamp right edge to viewport
      if (panelW && proposed + panelW > window.innerWidth - 8) {
        style.right = 8;
      } else {
        style.left = proposed;
      }
    } else {
      const proposed = window.innerWidth - rect.right;
      style.right = Math.max(8, proposed);
    }

    if (panelW) style.width = panelW;
    setPanelStyle(style);
  };

  useEffect(() => { reposition(); }, [open, anchorRef, placement, size]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reposition on resize / scroll
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", reposition, { passive: true });
    window.addEventListener("scroll", reposition, { passive: true, capture: true });
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, { capture: true });
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Outside pointer dismissal
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose?.();
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [open, onClose, anchorRef]);

  // Escape dismissal
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <div
      ref={panelRef}
      data-component="Popover"
      role="dialog"
      aria-modal="false"
      style={{
        ...panelStyle,
        backgroundColor: "var(--ui-surface-elevated)",
        border: "1px solid var(--ui-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
