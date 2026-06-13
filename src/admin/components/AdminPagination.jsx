import { getPaginationRange } from "./paginationRange";

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
export default function AdminPagination({ page, pageCount, onChange, siblingCount = 1, className = "" }) {
  if (!pageCount || pageCount <= 1) return null;

  const items = getPaginationRange(page, pageCount, siblingCount);
  const go = (target) => {
    if (target >= 1 && target <= pageCount && target !== page) onChange?.(target);
  };
  const btn = "inline-flex h-8 min-w-8 items-center justify-center rounded-[var(--adm-radius-md)] px-2 text-xs font-semibold transition";

  return (
    <nav data-component="AdminPagination" className={`flex items-center gap-1.5 ${className}`} aria-label="Pagination">
      <button type="button" className={btn} onClick={() => go(page - 1)} disabled={page <= 1}
        style={{ border: "1px solid var(--adm-border2)", color: "var(--adm-text2)", opacity: page <= 1 ? 0.5 : 1 }}>
        Prev
      </button>
      {items.map((item, index) => (
        item === "…"
          ? <span key={`gap-${index}`} className="px-1 text-xs" style={{ color: "var(--adm-text3)" }}>…</span>
          : (
            <button key={item} type="button" onClick={() => go(item)} aria-current={item === page ? "page" : undefined} className={btn}
              style={item === page ? { backgroundColor: "var(--adm-accent)", color: "#fff" } : { border: "1px solid var(--adm-border)", color: "var(--adm-text2)" }}>
              {item}
            </button>
          )
      ))}
      <button type="button" className={btn} onClick={() => go(page + 1)} disabled={page >= pageCount}
        style={{ border: "1px solid var(--adm-border2)", color: "var(--adm-text2)", opacity: page >= pageCount ? 0.5 : 1 }}>
        Next
      </button>
    </nav>
  );
}
