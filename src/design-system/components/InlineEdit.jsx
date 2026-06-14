import { useState } from "react";

/**
 * Transparent inline text field for rename flows.
 * Commits on Enter or blur. Cancels on Escape.
 * @param {string} value
 * @param {(v: string) => void} onCommit
 * @param {() => void} onCancel
 * @param {string} [placeholder]
 * @param {string} [className]
 */
export default function InlineEdit({ value, onCommit, onCancel, placeholder, className = "", ...rest }) {
  const [localValue, setLocalValue] = useState(value);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); onCommit(localValue); }
    if (e.key === "Escape") { e.preventDefault(); onCancel(); }
  };

  return (
    <input
      data-component="InlineEdit"
      type="text"
      autoFocus
      value={localValue}
      placeholder={placeholder}
      onChange={(e) => setLocalValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onCommit(localValue)}
      className={`w-full rounded bg-transparent px-1 font-semibold outline-none ring-1 ring-[color:var(--ui-accent)] ${className}`}
      style={{ color: "var(--ui-text)" }}
      {...rest}
    />
  );
}
