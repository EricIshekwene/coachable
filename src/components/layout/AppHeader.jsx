import { Link } from "react-router-dom";

/**
 * In-column page header for a main-app page: an optional back link, a title,
 * an optional subtitle, optional extra content (e.g. a breadcrumb) and a
 * right-aligned actions slot.
 *
 * Unlike the admin `AdminHeader` (a full-width sticky bar), the main app renders
 * its page title inside the same width-constrained column as the content, so
 * `AppHeader` is a plain in-flow block meant to sit at the top of an `AppPage`.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {string} [props.backTo] - If set, renders a back link to this route.
 * @param {string} [props.backLabel="Back"]
 * @param {React.ReactNode} [props.actions] - Right-aligned action buttons.
 * @param {React.ReactNode} [props.children] - Extra content under the title (e.g. breadcrumbs).
 * @param {string} [props.className]
 */
export default function AppHeader({
  title,
  subtitle,
  backTo,
  backLabel = "Back",
  actions,
  children,
  className = "",
}) {
  return (
    <header
      data-component="AppHeader"
      className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        {backTo ? (
          <Link
            to={backTo}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-BrandGray transition hover:text-BrandText"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </Link>
        ) : null}

        {title && (
          <h1 className="font-Manrope text-xl font-bold tracking-tight text-BrandText">{title}</h1>
        )}
        {subtitle && <p className="mt-1 text-sm text-BrandGray">{subtitle}</p>}
        {children}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0 sm:justify-end">{actions}</div>}
    </header>
  );
}
