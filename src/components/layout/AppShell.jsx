import AppHeader from "./AppHeader";
import AppPage from "./AppPage";

/**
 * Page-body shell for a main-app page — the one-import "path of least resistance"
 * for building a consistent page. Renders a scrollable root, then an `AppPage`
 * (width-constrained, padded column) containing an optional `AppHeader` followed
 * by the page content.
 *
 * IMPORTANT — relationship to AppLayout:
 * `AppShell` is NOT the navigation shell. The main app's nav, auth guard,
 * background and player-view banner are owned by `src/layouts/AppLayout.jsx`
 * (the route-level wrapper, the true analog of admin's `AdminShell`). `AppShell`
 * sits inside `AppLayout`'s `<Outlet/>` and only structures the page body.
 *
 * For full control, compose `AppHeader` + `AppPage` (+ `AppSection`/`AppCard`)
 * directly instead of using `AppShell`.
 *
 * @param {object} props
 * @param {string} [props.title] - Page title (passed to AppHeader).
 * @param {string} [props.subtitle]
 * @param {string} [props.backTo]
 * @param {string} [props.backLabel]
 * @param {React.ReactNode} [props.actions] - Header actions slot.
 * @param {React.ReactNode} [props.headerExtra] - Extra header content (e.g. breadcrumbs).
 * @param {"2xl"|"4xl"|"6xl"|"full"} [props.maxWidth="4xl"]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className] - Applied to the scrollable root.
 * @param {string} [props.contentClassName] - Wraps children below the header.
 */
export default function AppShell({
  title,
  subtitle,
  backTo,
  backLabel,
  actions,
  headerExtra,
  maxWidth = "4xl",
  children,
  className = "",
  contentClassName = "",
}) {
  const hasHeader = title || subtitle || backTo || actions || headerExtra;

  return (
    <div data-component="AppShell" className={`overflow-y-auto ${className}`}>
      <AppPage maxWidth={maxWidth}>
        {hasHeader && (
          <AppHeader
            title={title}
            subtitle={subtitle}
            backTo={backTo}
            backLabel={backLabel}
            actions={actions}
          >
            {headerExtra}
          </AppHeader>
        )}
        <div className={`${hasHeader ? "mt-8" : ""} flex flex-col gap-6 ${contentClassName}`}>{children}</div>
      </AppPage>
    </div>
  );
}
