import { useEffect, useRef } from "react";

/**
 * Multi-box OTP / verification code input. Auto-advances focus. Handles paste.
 * @param {number} [length=6]
 * @param {string} value - Full code string
 * @param {(v: string) => void} onChange
 * @param {boolean} [autoFocus=false]
 * @param {boolean} [disabled=false]
 * @param {string} [className]
 */
export default function CodeInput({ length = 6, value, onChange, autoFocus = false, disabled = false, className = "" }) {
  const refs = useRef([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buildValue = (nextChars) => nextChars.join("");

  const handleChange = (i, e) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...chars];
    next[i] = char;
    onChange(buildValue(next));
    if (char && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) {
      const next = [...chars];
      next[i - 1] = "";
      onChange(buildValue(next));
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    const next = Array(length).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    onChange(buildValue(next));
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div
      data-component="CodeInput"
      className={`flex gap-2 ${className}`}
    >
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={ch}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className="h-12 w-10 rounded-lg border text-center text-lg font-mono outline-none transition focus:border-[color:var(--ui-accent)] focus:ring-1 focus:ring-[color:var(--ui-accent)]"
          style={{
            borderColor: "var(--ui-border)",
            backgroundColor: "var(--ui-surface)",
            color: "var(--ui-text)",
          }}
        />
      ))}
    </div>
  );
}
