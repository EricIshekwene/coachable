import { useState } from "react";
import { FiCopy, FiCheck } from "react-icons/fi";
import Button from "./Button";

/**
 * Monospace read-only display for invite codes, API keys, tokens.
 * @param {string} value
 * @param {boolean} [copyable=false] - Shows copy-to-clipboard button
 * @param {string} [label]
 * @param {string} [className]
 */
export default function TokenBox({ value, copyable = false, label, className = "" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      data-component="TokenBox"
      className={`flex items-center gap-2 ${className}`}
    >
      {label && (
        <span className="shrink-0 text-xs" style={{ color: "var(--ui-text-muted)" }}>{label}</span>
      )}
      <span
        className="flex-1 truncate rounded-lg border px-3.5 py-2.5 font-mono text-sm tracking-wider"
        style={{ borderColor: "var(--ui-border)", backgroundColor: "var(--ui-bg)", color: "var(--ui-accent)" }}
      >
        {value}
      </span>
      {copyable && (
        <Button variant="ghost" size="icon" onClick={handleCopy}>
          {copied ? <FiCheck /> : <FiCopy />}
        </Button>
      )}
    </div>
  );
}
