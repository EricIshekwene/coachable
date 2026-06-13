const LINE_WIDTHS = ["100%", "92%", "78%", "85%", "60%"];

/**
 * Loading placeholder. Three variants:
 *  - "text"   → one or more shimmering lines (use `lines`)
 *  - "circle" → a round placeholder (avatar)
 *  - "block"  → a rectangular block (cards, charts, thumbnails)
 *
 * @param {{
 *   variant?: "text"|"circle"|"block",
 *   width?: number|string,
 *   height?: number|string,
 *   lines?: number,
 *   className?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function Skeleton({ variant = "text", width, height, lines = 1, className = "", style, ...rest }) {
  const base = { backgroundColor: "var(--ui-surface-3)" };

  if (variant === "circle") {
    const d = height ?? width ?? 40;
    return <span data-component="Skeleton" className={`inline-block animate-pulse rounded-full ${className}`} style={{ ...base, width: d, height: d, ...style }} {...rest} />;
  }

  if (variant === "block") {
    return <span data-component="Skeleton" className={`block animate-pulse rounded-[var(--radius)] ${className}`} style={{ ...base, width: width ?? "100%", height: height ?? 80, ...style }} {...rest} />;
  }

  if (lines > 1) {
    return (
      <div data-component="Skeleton" className={`flex flex-col gap-2 ${className}`} style={style} {...rest}>
        {Array.from({ length: lines }).map((_, i) => (
          <span key={i} className="h-3 animate-pulse rounded-full" style={{ ...base, width: LINE_WIDTHS[i % LINE_WIDTHS.length] }} />
        ))}
      </div>
    );
  }

  return <span data-component="Skeleton" className={`inline-block h-3 animate-pulse rounded-full ${className}`} style={{ ...base, width: width ?? "100%", ...style }} {...rest} />;
}
