import { Link } from "react-router-dom";

/**
 * Breadcrumb trail. Each item may carry a `to` for navigation; the last item is
 * always rendered as the current (non-link) page.
 *
 * @param {{
 *   items: Array<{ label: React.ReactNode, to?: string }>,
 *   className?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function AdminBreadcrumbs({ items, className = "" }) {
  return (
    <nav data-component="AdminBreadcrumbs" className={`flex flex-wrap items-center gap-1.5 text-xs ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {item.to && !last ? (
              <Link to={item.to} className="transition-opacity hover:opacity-70" style={{ color: "var(--adm-text3)" }}>{item.label}</Link>
            ) : (
              <span style={{ color: last ? "var(--adm-text)" : "var(--adm-text3)" }} aria-current={last ? "page" : undefined}>{item.label}</span>
            )}
            {!last ? (
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: "var(--adm-text3)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
