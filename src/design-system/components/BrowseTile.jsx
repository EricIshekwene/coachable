/**
 * Section/collection preview card: colored icon header strip + title + description + count.
 * @param {string} color - CSS color for header background
 * @param {import("react").ReactNode} icon
 * @param {string} title
 * @param {string} [description]
 * @param {number} [count]
 * @param {string} [countLabel="plays"]
 * @param {() => void} [onClick]
 * @param {string} [className]
 */
export default function BrowseTile({
  color,
  icon,
  title,
  description,
  count,
  countLabel = "plays",
  onClick,
  className = "",
}) {
  return (
    <button
      data-component="BrowseTile"
      type="button"
      onClick={onClick}
      className={`group flex w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border text-left transition hover:-translate-y-0.5 hover:shadow-lg ${className}`}
      style={{ borderColor: "var(--ui-border)", backgroundColor: "var(--ui-surface)" }}
    >
      <div
        className="flex h-28 w-full items-center justify-center transition-[filter] duration-200 group-hover:brightness-110"
        style={{ backgroundColor: color }}
      >
        <span className="text-3xl text-white">{icon}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="truncate text-sm font-semibold" style={{ color: "var(--ui-text)" }}>{title}</p>
        {description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--ui-text-muted)" }}>
            {description}
          </p>
        )}
        {count !== undefined && (
          <p className="mt-auto pt-2 text-xs" style={{ color: "var(--ui-text-subtle)" }}>
            {count} {countLabel}
          </p>
        )}
      </div>
    </button>
  );
}
