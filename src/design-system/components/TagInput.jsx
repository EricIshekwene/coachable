import { useState } from "react";
import Chip from "./Chip";

/**
 * Multi-value tag field with removable Chip items, inline input, and optional suggestions.
 * @param {string[]} value
 * @param {(tags: string[]) => void} onChange
 * @param {string[]} [suggestions=[]]
 * @param {string} [placeholder="Add a tag..."]
 * @param {number} [maxTags]
 * @param {string} [className]
 */
export default function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a tag...",
  maxTags,
  className = "",
}) {
  const [input, setInput] = useState("");

  const filtered = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  );
  const showDropdown = input.length > 0 && filtered.length > 0;

  const addTag = (tag) => {
    const t = tag.trim();
    if (!t || value.includes(t)) return;
    if (maxTags && value.length >= maxTags) return;
    onChange([...value, t]);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      data-component="TagInput"
      className={`relative flex min-h-[2.625rem] flex-wrap items-center gap-1.5 rounded-lg border px-2.5 py-2 transition focus-within:border-[color:var(--ui-accent)] ${className}`}
      style={{ borderColor: "var(--ui-border)", backgroundColor: "var(--ui-surface)" }}
    >
      {value.map((tag) => (
        <Chip key={tag} onRemove={() => onChange(value.filter((t) => t !== tag))}>
          {tag}
        </Chip>
      ))}

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[6rem] bg-transparent text-sm outline-none"
        style={{ color: "var(--ui-text)" }}
      />

      {showDropdown && (
        <div
          className="absolute left-0 top-full z-20 mt-1 w-full overflow-auto rounded-lg border shadow-lg"
          style={{
            backgroundColor: "var(--ui-surface-elevated)",
            borderColor: "var(--ui-border)",
            maxHeight: "14rem",
          }}
        >
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(s)}
              className="flex w-full items-center px-3.5 py-2 text-left text-sm transition hover:bg-[color:var(--ui-surface-2)]"
              style={{ color: "var(--ui-text-muted)" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
