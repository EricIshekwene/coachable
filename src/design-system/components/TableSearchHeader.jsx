import { FiSearch, FiX } from "react-icons/fi";

/**
 * `TableSearchHeader` — search bar + item count header for data tables.
 *
 * Renders a flex row with a search input on the left and an optional item count
 * plus action buttons on the right. Separated from the table by a 1 px bottom
 * border. Used as the toolbar row above `DataTable`.
 *
 * @param {Object} props
 * @param {string} props.value - Current search string
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} props.onChange - Input change handler
 * @param {() => void} [props.onClear] - If provided, shows a clear × button when value is non-empty
 * @param {string} [props.placeholder="Search…"] - Input placeholder text
 * @param {number|null} [props.count] - Item count shown on the right; omitted when null
 * @param {string} [props.countLabel="items"] - Noun used in the count label (e.g. "users", "plays")
 * @param {React.ReactNode} [props.actions] - Optional action buttons rendered far right
 * @param {string} [props.className=""] - Extra className on the root element
 * @returns {JSX.Element}
 */
export default function TableSearchHeader({
  value,
  onChange,
  onClear,
  placeholder = "Search…",
  count = null,
  countLabel = "items",
  actions,
  className = "",
}) {
  return (
    <div
      data-component="TableSearchHeader"
      className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
      style={{ borderBottom: "1px solid var(--ui-border)" }}
    >
      {/* Search input */}
      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <FiSearch
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm"
          style={{ color: "var(--ui-text-muted)" }}
        />
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-[var(--radius)] py-2.5 pl-9 pr-8 text-sm outline-none transition"
          style={{
            backgroundColor: "var(--ui-surface-2)",
            border: "1px solid var(--ui-border)",
            color: "var(--ui-text)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--ui-accent)";
            e.currentTarget.style.boxShadow = "0 0 0 3px var(--ui-accent-muted)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--ui-border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs transition-opacity hover:opacity-70"
            style={{ color: "var(--ui-text-muted)" }}
            aria-label="Clear search"
          >
            <FiX />
          </button>
        )}
      </div>

      {/* Right slot — count + optional actions */}
      {(count !== null || actions) && (
        <div className="flex items-center gap-2 sm:ml-auto">
          {count !== null && (
            <span
              className="inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold"
              style={{ backgroundColor: "var(--ui-surface-3)", color: "var(--ui-text-muted)" }}
            >
              {count} {countLabel}
            </span>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
