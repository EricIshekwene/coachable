import { useEffect, useRef, useState } from "react";

/**
 * useCanvasSize
 *
 * Observes a container element and keeps a `size` object { width, height }
 * in sync with its actual pixel dimensions. Uses ResizeObserver when available,
 * falls back to a window resize listener.
 *
 * Returns { size, containerRef } — attach containerRef to the container div.
 */
export function useCanvasSize() {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      });
    };

    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateSize);
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return { size, containerRef };
}

export default useCanvasSize;
