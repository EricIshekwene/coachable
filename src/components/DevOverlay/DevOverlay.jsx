import { useEffect } from "react";
import "./devOverlay.css";

/**
 * Dev-only component that toggles orange dashed outlines + component name
 * badges on all [data-component] elements. Press Ctrl+Shift+D to toggle.
 *
 * Wire into App.jsx behind {import.meta.env.DEV && <DevOverlay />}.
 * Zero cost in production — the conditional ensures the import is tree-shaken.
 */
export default function DevOverlay() {
  useEffect(() => {
    /**
     * Toggles data-dev-overlay on document.documentElement when Ctrl+Shift+D
     * is pressed, activating or deactivating the overlay CSS.
     * @param {KeyboardEvent} e
     */
    function handleKeyDown(e) {
      if (!e.ctrlKey || !e.shiftKey || e.key !== "D") return;
      if (document.documentElement.hasAttribute("data-dev-overlay")) {
        document.documentElement.removeAttribute("data-dev-overlay");
      } else {
        document.documentElement.setAttribute("data-dev-overlay", "");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
