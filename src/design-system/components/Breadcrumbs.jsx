import { Link } from "react-router-dom";

/**
 * Breadcrumb trail. Each item may carry a `to` for navigation; the last item is
 * always rendered as the current (non-link) page.
 *
 * @param {{
 *   items: Array<{ label: React.ReactNode, to?: string, href?: string, onClick?: Function }>,
 *   className?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function Breadcrumbs({ items, className = "", ...rest }) {
  return (
    <nav data-component="Breadcrumbs" className={`flex flex-wrap items-center gap-1.5 text-xs ${className}`} aria-label="Breadcrumb" {...rest}>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        const destination = item.to ?? item.href;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {item.onClick && !last ? (
              <button type="button" onClick={item.onClick} className="transition-opacity hover:opacity-70" style={{ color: "var(--ui-text-subtle)" }}>{item.label}</button>
            ) : destination && !last ? (
              <Link to={destination} className="transition-opacity hover:opacity-70" style={{ color: "var(--ui-text-subtle)" }}>{item.label}</Link>
            ) : (
              <span style={{ color: last ? "var(--ui-text)" : "var(--ui-text-subtle)" }} aria-current={last ? "page" : undefined}>{item.label}</span>
            )}
            {!last ? (
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: "var(--ui-text-subtle)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
