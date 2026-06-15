import { FiClock } from "react-icons/fi";

/**
 * Compact horizontal chip for recently-edited carousels. Clock icon + title + time.
 * @param {string} title - Play or item title.
 * @param {string} time - Relative time string (e.g. "2 days ago").
 * @param {() => void} onClick - Click handler.
 * @param {string} [className] - Extra class names.
 */
export default function RecentlyEditedChip({ title, time, onClick, className = "" }) {
  return (
    <button
      data-component="RecentlyEditedChip"
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left transition hover:border-[color:var(--ui-accent)]/30 ${className}`}
      style={{ borderColor: "var(--ui-border)", backgroundColor: "var(--ui-surface-2)" }}
    >
      <FiClock className="shrink-0 text-xs" style={{ color: "var(--ui-text-subtle)" }} />
      <div className="flex min-w-0 flex-col">
        <span className="max-w-[10rem] truncate text-sm font-semibold" style={{ color: "var(--ui-text)" }}>{title}</span>
        <span className="text-[10px]" style={{ color: "var(--ui-text-subtle)" }}>{time}</span>
      </div>
    </button>
  );
}
