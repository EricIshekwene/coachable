import { getPaginationRange } from "../../admin/components/paginationRange";

/**
 * Page navigation control with first/last anchoring and ellipses. Controlled:
 * pass `page` (1-based), `pageCount`, and `onChange`. Renders nothing when
 * there is one page or fewer.
 *
 * @param {{
 *   page: number,
 *   pageCount: number,
 *   onChange?: (page: number) => void,
 *   siblingCount?: number,
 *   className?: string,
 * }} props
 * @returns {JSX.Element|null}
 */
export default function Pagination({ page, pageCount, onChange, siblingCount = 1, className = "", ...rest }) {
  if (!pageCount || pageCount <= 1) return null;

  const items = getPaginationRange(page, pageCount, siblingCount);
  const go = (target) => {
    if (target >= 1 && target <= pageCount && target !== page) onChange?.(target);
  };
  const btn = "inline-flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-md)] px-2 text-xs font-semibold transition";

  return (
    <nav data-component="Pagination" className={`flex items-center gap-1.5 ${className}`} aria-label="Pagination" {...rest}>
      <button type="button" className={btn} onClick={() => go(page - 1)} disabled={page <= 1}
        style={{ border: "1px solid var(--ui-border-strong)", color: "var(--ui-text-muted)", opacity: page <= 1 ? 0.5 : 1 }}>
        Prev
      </button>
      {items.map((item, index) => (
        item === "…"
          ? <span key={`gap-${index}`} className="px-1 text-xs" style={{ color: "var(--ui-text-subtle)" }}>…</span>
          : (
            <button key={item} type="button" onClick={() => go(item)} aria-current={item === page ? "page" : undefined} className={btn}
              style={item === page ? { backgroundColor: "var(--ui-accent)", color: "var(--ui-on-accent)" } : { border: "1px solid var(--ui-border)", color: "var(--ui-text-muted)" }}>
              {item}
            </button>
          )
      ))}
      <button type="button" className={btn} onClick={() => go(page + 1)} disabled={page >= pageCount}
        style={{ border: "1px solid var(--ui-border-strong)", color: "var(--ui-text-muted)", opacity: page >= pageCount ? 0.5 : 1 }}>
        Next
      </button>
    </nav>
  );
}
