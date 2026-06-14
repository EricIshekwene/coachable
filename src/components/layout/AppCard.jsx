/**
 * Rounded surface card for the main app, using the `--color-Brand*` palette.
 * Rounded surface card for the main app, using the `--color-Brand*` palette. Matches the existing app card styling
 * (`rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30`) so migrated pages
 * render identically.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {boolean|string} [props.padding=true] - `true` -> `p-5`, a string -> custom
 *   padding classes, `false` -> no padding.
 * @param {() => void} [props.onClick] - When provided, the card gains hover/pointer affordances.
 * @param {string} [props.className]
 */
export default function AppCard({ children, padding = true, onClick, className = "", ...cardProps }) {
  const paddingClasses = typeof padding === "string" ? padding : padding ? "p-5" : "";

  return (
    <div
      data-component="AppCard"
      onClick={onClick}
      className={`rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 ${paddingClasses} ${
        onClick ? "cursor-pointer transition hover:-translate-y-0.5 hover:border-BrandGray2/40" : ""
      } ${className}`}
      {...cardProps}
    >
      {children}
    </div>
  );
}
