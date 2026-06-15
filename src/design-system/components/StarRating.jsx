import { useState } from "react";
import { FiStar } from "react-icons/fi";

/**
 * Clickable star rating input with hover preview.
 * @param {number} value - 0 = nothing selected
 * @param {(v: number) => void} onChange
 * @param {number} [max=5]
 * @param {boolean} [disabled=false]
 * @param {string} [label] - visually hidden accessible label
 * @param {string} [className]
 */
export default function StarRating({ value, onChange, max = 5, disabled = false, label, className = "" }) {
  const [hovered, setHovered] = useState(null);
  const active = hovered ?? value;

  return (
    <div
      data-component="StarRating"
      role="radiogroup"
      aria-label={label}
      className={`flex items-center gap-1 ${className}`}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value >= n}
          disabled={disabled}
          onClick={() => !disabled && onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          className="transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiStar
            className="h-5 w-5"
            style={{
              color: active >= n ? "var(--ui-accent)" : "var(--ui-text-muted)",
              fill: active >= n ? "var(--ui-accent)" : "none",
            }}
          />
        </button>
      ))}
    </div>
  );
}
