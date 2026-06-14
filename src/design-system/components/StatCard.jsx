import { FiArrowUp, FiArrowDown, FiMinus } from "react-icons/fi";

const TONE_COLOR = {
  default: "var(--ui-text-muted)",
  success: "var(--ui-success)",
  warning: "var(--ui-warning)",
  danger:  "var(--ui-danger)",
};

const TONE_BG = {
  default: "transparent",
  success: "var(--ui-success-muted)",
  warning: "var(--ui-warning-muted)",
  danger:  "var(--ui-danger-muted)",
};

/**
 * Single-metric summary tile for dashboards and stat grids.
 *
 * @param {object}  props
 * @param {string}  props.label                     - Metric label displayed above the value
 * @param {string|number} props.value               - Primary displayed value
 * @param {{value: number, label?: string}} [props.delta] - Percentage change indicator
 * @param {"default"|"success"|"warning"|"danger"} [props.tone="default"] - Color emphasis tone
 * @param {React.ReactNode} [props.icon]            - Optional icon in top-right corner
 * @param {boolean} [props.loading=false]           - Shows skeleton animation when true
 * @param {string}  [props.className=""]
 */
export default function StatCard({ label, value, delta, tone = "default", icon, loading = false, className = "" }) {
  const toneColor = TONE_COLOR[tone] ?? TONE_COLOR.default;
  const toneBg    = TONE_BG[tone]    ?? TONE_BG.default;

  const deltaDir   = delta == null ? "flat" : delta.value > 0 ? "up" : delta.value < 0 ? "down" : "flat";
  const deltaColor = deltaDir === "up" ? "var(--ui-success)" : deltaDir === "down" ? "var(--ui-danger)" : "var(--ui-text-subtle)";

  return (
    <div
      data-component="StatCard"
      className={`rounded-lg p-4 ${className}`}
      style={{
        backgroundColor: tone === "default" ? "var(--ui-surface)" : toneBg,
        border: `1px solid ${tone === "default" ? "var(--ui-border)" : `color-mix(in srgb, ${toneColor} 30%, transparent)`}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ui-text-subtle)" }}>
          {label}
        </p>
        {icon && <span style={{ color: toneColor }}>{icon}</span>}
      </div>

      {loading ? (
        <div className="mt-2 h-7 w-24 animate-pulse rounded" style={{ backgroundColor: "var(--ui-surface-3)" }} />
      ) : (
        <p className="mt-1.5 text-2xl font-bold leading-none" style={{ color: tone === "default" ? "var(--ui-text)" : toneColor }}>
          {value}
        </p>
      )}

      {delta != null && !loading && (
        <div className="mt-2 flex items-center gap-1 text-xs font-semibold" style={{ color: deltaColor }}>
          {deltaDir === "up" ? <FiArrowUp /> : deltaDir === "down" ? <FiArrowDown /> : <FiMinus />}
          <span>{Math.abs(delta.value)}%</span>
          {delta.label && (
            <span className="font-normal" style={{ color: "var(--ui-text-subtle)" }}>{delta.label}</span>
          )}
        </div>
      )}
    </div>
  );
}
