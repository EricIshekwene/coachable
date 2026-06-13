const PROGRESS_TONES = {
  accent: "var(--ui-accent)",
  success: "var(--ui-success)",
  warning: "var(--ui-warning)",
  danger: "var(--ui-danger)",
};

/**
 * Linear progress bar with an optional label and value readout. Pass
 * `indeterminate` for an unknown-duration state.
 *
 * @param {{
 *   value?: number,
 *   tone?: "accent"|"success"|"warning"|"danger",
 *   label?: React.ReactNode,
 *   showValue?: boolean,
 *   indeterminate?: boolean,
 *   size?: "sm"|"md"|"lg",
 *   className?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function Progress({ value = 0, tone = "accent", label, showValue = false, indeterminate = false, size = "md", className = "", ...rest }) {
  const clamped = Math.min(100, Math.max(0, value));
  const height = size === "sm" ? 6 : size === "lg" ? 12 : 8;
  const color = PROGRESS_TONES[tone] ?? PROGRESS_TONES.accent;

  return (
    <div data-component="Progress" className={className} {...rest}>
      {(label || showValue) ? (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label ? <span style={{ color: "var(--ui-text-muted)" }}>{label}</span> : <span />}
          {showValue ? <span style={{ color: "var(--ui-text-subtle)" }}>{Math.round(clamped)}%</span> : null}
        </div>
      ) : null}
      <div
        className="overflow-hidden rounded-full"
        style={{ height, backgroundColor: "var(--ui-surface-3)" }}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full ${indeterminate ? "animate-pulse" : ""}`}
          style={{ width: indeterminate ? "40%" : `${clamped}%`, backgroundColor: color, transition: "width 200ms ease" }}
        />
      </div>
    </div>
  );
}
