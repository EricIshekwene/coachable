import { useRef, useState } from "react";

const isModifierPressed = (evt) => Boolean(evt?.shiftKey || evt?.ctrlKey || evt?.metaKey);
const DRAG_THRESHOLD = 3; // px — minimum drag distance to count as marquee vs click

/**
 * useCanvasMarquee
 *
 * Manages marquee (rubber-band) selection on the Konva stage.
 * Tracks start/end world-space coordinates, exposes a React `marquee` rect for
 * rendering, and calls onMarqueeSelect / onSelectItem when the gesture completes.
 *
 * Invariant: only active when tool === "select" and the user clicks on the stage
 * background (not an item).
 */
export function useCanvasMarquee({
  tool,
  stageRef,
  toWorldCoords,
  items,
  playerRadius,
  ballRadius,
  onSelectItem,
  onMarqueeSelect,
}) {
  const marqueeRef = useRef({
    active: false,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    shiftKey: false,
  });
  const [marquee, setMarquee] = useState(null);

  const handlePointerDown = (e, { isPanActive } = {}) => {
    const evt = e.evt;
    const isPrimaryButton = evt?.button === 0 || evt?.button === undefined;
    const stage = stageRef.current;

    if (tool !== "select" || !isPrimaryButton || e.target !== stage || isPanActive?.()) {
      return false;
    }

    const pointer = stage?.getPointerPosition?.();
    if (!pointer) return false;

    const world = toWorldCoords(pointer);
    marqueeRef.current = {
      active: true,
      start: world,
      end: world,
      shiftKey: isModifierPressed(evt),
    };
    setMarquee({ x: world.x, y: world.y, width: 0, height: 0 });
    return true;
  };

  const handlePointerMove = (e) => {
    if (!marqueeRef.current.active) return false;
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition?.();
    if (!pointer) return false;

    const world = toWorldCoords(pointer);
    marqueeRef.current.end = world;
    const start = marqueeRef.current.start;
    setMarquee({
      x: Math.min(start.x, world.x),
      y: Math.min(start.y, world.y),
      width: Math.abs(world.x - start.x),
      height: Math.abs(world.y - start.y),
    });
    return true;
  };

  const handlePointerUp = () => {
    if (!marqueeRef.current.active) return false;

    const { start, end, shiftKey } = marqueeRef.current;
    marqueeRef.current.active = false;
    setMarquee(null);

    const x1 = Math.min(start.x, end.x);
    const y1 = Math.min(start.y, end.y);
    const x2 = Math.max(start.x, end.x);
    const y2 = Math.max(start.y, end.y);

    // If barely moved, treat as a background click (clear selection)
    if (Math.abs(x2 - x1) < DRAG_THRESHOLD && Math.abs(y2 - y1) < DRAG_THRESHOLD) {
      if (!shiftKey) onSelectItem?.(null, null, { mode: "clear" });
      return true;
    }

    const intersects = (itemX, itemY, itemR) =>
      !(itemX + itemR < x1 || itemX - itemR > x2 || itemY + itemR < y1 || itemY - itemR > y2);

    const selected = items
      .filter((item) => item?.type === "player" || item?.type === "ball")
      .filter((item) => {
        const r = item.type === "ball" ? ballRadius : playerRadius;
        return intersects(item.x, item.y, r);
      })
      .map((item) => item.id);

    onMarqueeSelect?.(selected, { mode: shiftKey ? "add" : "replace" });
    return true;
  };

  const cancelMarquee = () => {
    if (!marqueeRef.current.active) return;
    marqueeRef.current.active = false;
    setMarquee(null);
  };

  const isMarqueeActive = () => marqueeRef.current.active;

  return {
    marquee,
    marqueeRef,
    isMarqueeActive,
    cancelMarquee,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}

export default useCanvasMarquee;
