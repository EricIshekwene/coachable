/**
 * Width-constrained, padded content column for a main-app page.
 *
 * This is the per-page content wrapper that replaces the ad-hoc
 * `<div className="mx-auto max-w-... px-... py-...">` roots each page used to
 * hand-roll. It mirrors the admin `AdminPage` component for the main app, using
 * the `--color-Brand*` palette via Tailwind utility classes.
 *
 * Carries `overflow-y-auto` so the column scrolls when used standalone. Inside
 * `AppLayout` (whose `<main>` already scrolls) this is a no-op because height is
 * not constrained here, so no nested scroll container is created.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {"2xl"|"4xl"|"6xl"|"full"} [props.maxWidth="4xl"] - Content max width.
 * @param {string} [props.className]
 */
const MAX_WIDTH = {
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  full: "max-w-none",
};

export default function AppPage({ children, maxWidth = "4xl", className = "" }) {
  const maxWidthClass = MAX_WIDTH[maxWidth] ?? MAX_WIDTH["4xl"];
  return (
    <div
      data-component="AppPage"
      className={`mx-auto w-full min-w-0 overflow-y-auto px-6 py-8 md:px-10 md:py-12 ${maxWidthClass} ${className}`}
    >
      {children}
    </div>
  );
}
