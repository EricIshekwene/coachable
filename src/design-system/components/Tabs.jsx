/**
 * Segmented tab control for switching between sibling views.
 *
 * Controlled: pass `value` and `onChange`. Visual match for the inline tab
 * pattern used across admin pages (accent fill on the active tab).
 *
 * @param {{
 *   tabs?: Array<{ value: string, label: React.ReactNode, icon?: React.ReactNode }>,
 *   items?: Array<{ value: string, label: React.ReactNode, icon?: React.ReactNode }>,
 *   value: string,
 *   onChange?: (value: string) => void,
 *   size?: "sm"|"md",
 *   variant?: "segmented"|"underline",
 *   className?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function Tabs({
  tabs,
  items,
  value,
  onChange,
  size = "md",
  variant = "segmented",
  className = "",
  style,
  ...rest
}) {
  const tabItems = items ?? tabs ?? [];
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
  const underline = variant === "underline";

  return (
    <div
      role="tablist"
      data-component="Tabs"
      className={`inline-flex items-center ${underline ? "gap-4 border-b" : "gap-0.5 rounded-[var(--radius-sm)] p-0.5"} ${className}`}
      style={underline
        ? { borderColor: "var(--ui-border)", ...style }
        : { backgroundColor: "var(--ui-surface-2)", border: "1px solid var(--ui-border)", ...style }}
      {...rest}
    >
      {tabItems.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.value)}
            className={`inline-flex items-center gap-1.5 font-semibold transition ${pad} ${underline ? "-mb-px border-b-2 rounded-none" : "rounded"}`}
            style={underline
              ? {
                  borderColor: active ? "var(--ui-accent)" : "transparent",
                  color: active ? "var(--ui-accent)" : "var(--ui-text-muted)",
                }
              : active
                ? { backgroundColor: "var(--ui-accent)", color: "var(--ui-on-accent)" }
                : { color: "var(--ui-text-muted)" }}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
