import { useEffect } from "react";

const DEFAULT_COLOR = "#121212";

/**
 * Sets the `<meta name="theme-color">` value for the duration of the component's mount.
 * On iOS Safari this controls the overscroll/bounce area color and status-bar tint.
 * Reverts to the previous value on unmount.
 */
export default function useThemeColor(color) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const prev = meta.getAttribute("content");
    meta.setAttribute("content", color || DEFAULT_COLOR);
    return () => {
      meta.setAttribute("content", prev || DEFAULT_COLOR);
    };
  }, [color]);
}
