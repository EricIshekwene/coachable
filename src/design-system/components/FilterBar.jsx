import SearchInput from "./SearchInput";

/**
 * `FilterBar` — search field + active filter chips + action buttons row.
 *
 * Replaces the inline search + active-chip + actions row pattern. Renders
 * `SearchInput` on the left when a `search` prop is provided, any active
 * filter `chips` in the middle, and `actions` on the right.
 *
 * @param {Object} props
 * @param {{ value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onClear?: () => void, placeholder?: string }} [props.search]
 *   When provided, renders a SearchInput on the left.
 * @param {Array<{ label: string, onRemove: () => void }>} [props.chips]
 *   Active filter chips shown between the search and the actions.
 * @param {React.ReactNode} [props.actions]
 *   Right-side action buttons (e.g. "Filter", "New Play", sort toggle).
 * @param {string} [props.className=""] - Extra className on the root wrapper
 * @returns {JSX.Element}
 */
export default function FilterBar({ search, chips, actions, className = "" }) {
  return (
    <div
      data-component="FilterBar"
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      {search && (
        <SearchInput
          value={search.value}
          onChange={search.onChange}
          onClear={search.onClear}
          placeholder={search.placeholder ?? "Search…"}
          className="flex-1"
          style={{ minWidth: "12rem", maxWidth: "24rem" }}
        />
      )}

      {chips && chips.length > 0 && chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ backgroundColor: "var(--ui-accent-muted)", color: "var(--ui-accent)" }}
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Remove ${chip.label} filter`}
            onClick={chip.onRemove}
            className="shrink-0 transition-opacity hover:opacity-60"
          >
            ×
          </button>
        </span>
      ))}

      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}
