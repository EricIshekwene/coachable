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
export default function AdminSkeleton({ variant = "text", width, height, lines = 1, className = "" }) {
  const base = { backgroundColor: "var(--adm-surface3)" };

  if (variant === "circle") {
    const d = height ?? width ?? 40;
    return <span className={`inline-block animate-pulse rounded-full ${className}`} style={{ ...base, width: d, height: d }} />;
  }

  if (variant === "block") {
    return <span className={`block animate-pulse rounded-[var(--adm-radius)] ${className}`} style={{ ...base, width: width ?? "100%", height: height ?? 80 }} />;
  }

  if (lines > 1) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <span key={i} className="h-3 animate-pulse rounded-full" style={{ ...base, width: LINE_WIDTHS[i % LINE_WIDTHS.length] }} />
        ))}
      </div>
    );
  }

  return <span className={`inline-block h-3 animate-pulse rounded-full ${className}`} style={{ ...base, width: width ?? "100%" }} />;
}
