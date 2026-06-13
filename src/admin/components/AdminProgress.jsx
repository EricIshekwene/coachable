const PROGRESS_TONES = {
  accent: "var(--adm-accent)",
  success: "var(--adm-success)",
  warning: "var(--adm-warning)",
  danger: "var(--adm-danger)",
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
export default function AdminProgress({ value = 0, tone = "accent", label, showValue = false, indeterminate = false, size = "md", className = "" }) {
  const clamped = Math.min(100, Math.max(0, value));
  const height = size === "sm" ? 6 : size === "lg" ? 12 : 8;
  const color = PROGRESS_TONES[tone] ?? PROGRESS_TONES.accent;

  return (
    <div data-component="AdminProgress" className={className}>
      {(label || showValue) ? (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label ? <span style={{ color: "var(--adm-text2)" }}>{label}</span> : <span />}
          {showValue ? <span style={{ color: "var(--adm-text3)" }}>{Math.round(clamped)}%</span> : null}
        </div>
      ) : null}
      <div
        className="overflow-hidden rounded-full"
        style={{ height, backgroundColor: "var(--adm-surface3)" }}
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
