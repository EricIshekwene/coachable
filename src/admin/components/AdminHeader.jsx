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
 *   sticky?: boolean,
 * }} props
 */
export default function AdminHeader({ title, backLabel, backTo, actions, sticky = false }) {
  return (
    <header
      className={`${sticky ? "sticky top-14 z-20 lg:top-0" : ""} shrink-0 px-4 py-3 sm:px-6`}
      style={{
        backgroundColor: "color-mix(in srgb, var(--adm-surface-elevated) 92%, transparent)",
        borderBottom: "1px solid var(--adm-border)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex min-h-8 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
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
              className="min-w-0 font-Manrope text-sm font-semibold sm:text-base"
              style={{ color: "var(--adm-text)" }}
            >
              {title}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      </div>
    </header>
  );
}
