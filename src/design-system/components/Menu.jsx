import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

/**
 * Floating context menu anchored to a trigger element.
 * Handles outside-pointer dismissal, Escape, initial focus, arrow-key + Home/End
 * navigation through menuitems, disabled-item exclusion, and focus restoration to
 * the trigger on keyboard close.
 *
 * @param {{
 *   open: boolean,
 *   anchorRef: React.RefObject<HTMLElement>,
 *   onClose: () => void,
 *   placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end",
 *   width?: number | string,
 *   children: React.ReactNode,
 * }} props
 */
export default function Menu({
  open,
  anchorRef,
  onClose,
  placement = "bottom-start",
  width = 160,
  children,
}) {
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState({});
  const closedByKeyboardRef = useRef(false);

  /** Collect all focusable (non-disabled) menuitem elements. */
  const getItems = () =>
    panelRef.current
      ? [...panelRef.current.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')]
      : [];

  // Compute position when opening
  useEffect(() => {
    if (!open || !anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const gap = 6;
    const style = { position: "fixed", zIndex: 9999 };

    if (placement.startsWith("bottom")) {
      style.top = rect.bottom + gap;
    } else {
      style.bottom = window.innerHeight - rect.top + gap;
    }
    if (placement.endsWith("start")) {
      style.left = rect.left;
    } else {
      style.right = window.innerWidth - rect.right;
    }
    setPanelStyle(style);
  }, [open, anchorRef, placement]);

  // Focus first item on open; save previous focus for restoration
  useEffect(() => {
    if (!open) return;
    const items = getItems();
    items[0]?.focus();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore focus to trigger when closing after keyboard interaction
  useEffect(() => {
    if (!open && closedByKeyboardRef.current) {
      anchorRef?.current?.focus();
      closedByKeyboardRef.current = false;
    }
  }, [open, anchorRef]);

  // Outside pointer dismissal (capture phase so it fires before any click handlers)
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

  // Keyboard: Escape, arrow keys, Home, End
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closedByKeyboardRef.current = true;
        onClose?.();
        return;
      }
      const items = getItems();
      if (!items.length) return;
      const idx = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        items[(idx + 1) % items.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <div
      ref={panelRef}
      data-component="Menu"
      role="menu"
      tabIndex={-1}
      style={{
        ...panelStyle,
        minWidth: typeof width === "number" ? `${width}px` : width,
        backgroundColor: "var(--ui-surface-elevated)",
        border: "1px solid var(--ui-border)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-lg)",
        overflow: "hidden",
        outline: "none",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
