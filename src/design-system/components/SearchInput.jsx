import { FiSearch, FiX } from "react-icons/fi";

/**
 * `SearchInput` — search field with icon, clear button, and optional shortcut hint.
 *
 * Drop-in replacement for every "relative div + absolute FiSearch icon + input +
 * optional clear button" pattern in the codebase.
 *
 * @param {Object} props
 * @param {string} props.value - Controlled input value
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} props.onChange - Change handler
 * @param {() => void} [props.onClear] - When provided, shows a × button while value is non-empty
 * @param {string} [props.placeholder="Search…"] - Input placeholder text
 * @param {string} [props.shortcut] - Keyboard shortcut hint rendered inside the field (e.g. "⌘K")
 * @param {boolean} [props.autoFocus=false] - Auto-focus the input on mount
 * @param {string} [props.className=""] - Extra className on the root wrapper
 * @returns {JSX.Element}
 */
export default function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search…",
  shortcut,
  autoFocus = false,
  className = "",
}) {
  const canClear = Boolean(onClear) && Boolean(value);

  return (
    <div
      data-component="SearchInput"
      className={`relative flex items-center ${className}`}
    >
      <FiSearch
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm"
        style={{ color: "var(--ui-text-subtle)" }}
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none transition"
        style={{
          backgroundColor: "var(--ui-surface-2)",
          borderColor: "var(--ui-border)",
          color: "var(--ui-text)",
          paddingRight: canClear || shortcut ? "2.5rem" : undefined,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--ui-border-strong)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--ui-border)"; }}
      />
      {canClear && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 transition"
          style={{ color: "var(--ui-text-subtle)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ui-text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ui-text-subtle)"; }}
        >
          <FiX className="text-sm" />
        </button>
      )}
      {shortcut && !canClear && (
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px]"
          style={{ backgroundColor: "var(--ui-surface-3)", color: "var(--ui-text-muted)" }}
        >
          {shortcut}
        </span>
      )}
    </div>
  );
}
