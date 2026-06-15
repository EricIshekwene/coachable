/**
 * Shared shell for the floating drawing palettes (annotation + motion).
 *
 * Both `DrawToolsPill` and `AnimationDrawingTools` render their tool buttons
 * inside this shell, which is what guarantees they have:
 *
 * - the same top offset (`top-17`) and horizontal centering
 * - the same z-index
 * - the same outer min-height so the bottom of each palette aligns
 * - the same outer radius, border, shadow, and backdrop blur
 *
 * The palettes contribute the inner button row only; outer shell concerns are
 * captured here so we don't drift on padding/height between the two.
 *
 * @module components/toolPills/FloatingToolPillShell
 */

/**
 * @param {{
 *   children: import("react").ReactNode,
 *   testId?: string,
 *   ariaLabel?: string,
 * }} props
 */
export default function FloatingToolPillShell({ children, testId, ariaLabel }) {
  return (
    <div
      data-testid={testId}
      aria-label={ariaLabel}
      // top/left/translate/z mirror the legacy palette positioning so plays
      // that have a remembered pointer position still feel identical.
      // min-h-[44px] is the locked outer height — both palettes sit on the
      // same baseline because the inner button row is centered inside this
      // box. Background/border/shadow live here too so the two palettes are
      // visually interchangeable.
      className={[
        "absolute top-17 left-1/2 -translate-x-1/2 z-50",
        "flex items-center justify-center gap-1 select-none",
        "min-h-[44px] px-1.5 py-1.5",
        "rounded-2xl border border-white/15",
        "bg-[rgba(18,18,18,0.92)] backdrop-blur-sm",
        "shadow-[0_1px_4px_rgba(0,0,0,0.08)]",
        "max-w-[calc(100vw-2rem)]",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
