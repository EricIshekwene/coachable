import { Link } from "react-router-dom";

/**
 * Sticky admin top bar. Shown inside the main content column when
 * a sidebar layout is active. Displays an optional back link,
 * an optional title, and action buttons.
 *
 * @param {{
 *   title?: string,
 *   backLabel?: string,
 *   backTo?: string,
 *   actions?: React.ReactNode,
 * }} props
 */
export default function AdminHeader({ title, backLabel, backTo, actions }) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-4 px-6 h-14 shrink-0"
      style={{
        backgroundColor: "color-mix(in srgb, var(--adm-surface-elevated) 92%, transparent)",
        borderBottom: "1px solid var(--adm-border)",
        backdropFilter: "blur(12px)",
      }}
    >
      {backTo ? (
        <Link
          to={backTo}
          className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--adm-text2)" }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {backLabel ?? "Back"}
        </Link>
      ) : null}

      {title && (
        <span
          className="font-Manrope text-sm font-semibold"
          style={{ color: "var(--adm-text)" }}
        >
          {title}
        </span>
      )}

      <div className="ml-auto flex items-center gap-3">
        {actions}
      </div>
    </header>
  );
}
