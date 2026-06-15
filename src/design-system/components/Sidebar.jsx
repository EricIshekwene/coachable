/**
 * Structural sidebar shell used by both admin and app navigation.
 * Provides three zones: header (logo), scrollable nav, and optional footer.
 * Does NOT know about routes, permissions, or specific nav items — those are provided by callers.
 *
 * @param {import("react").ReactNode} props.header   - Logo area (shrink-0, border-bottom)
 * @param {import("react").ReactNode} props.children - Scrollable navigation content
 * @param {import("react").ReactNode} [props.footer] - Footer content (theme toggle, profile strip)
 * @param {"sm"|"md"|"lg"}           [props.width="md"]
 * @param {string}                   [props.className]
 */
export default function Sidebar({ header, children, footer, width = "md", className = "" }) {
  const widthMap = { sm: "w-52", md: "w-60", lg: "w-72" };

  return (
    <div
      data-component="Sidebar"
      className={`flex h-full flex-col overflow-hidden ${widthMap[width] ?? "w-60"} ${className}`}
      style={{ backgroundColor: "var(--ui-bg)", borderColor: "var(--ui-border)" }}
    >
      <div
        className="flex h-14 shrink-0 items-center gap-2 px-4"
        style={{ borderBottom: "1px solid var(--ui-border)" }}
      >
        {header}
      </div>

      <div className="hide-scroll flex-1 overflow-y-auto px-2 py-3">
        {children}
      </div>

      {footer && (
        <div
          className="shrink-0 px-4 py-3"
          style={{ borderTop: "1px solid var(--ui-border)" }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
