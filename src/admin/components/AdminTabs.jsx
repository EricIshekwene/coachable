/**
 * Segmented tab control for switching between sibling views.
 *
 * Controlled: pass `value` and `onChange`. Visual match for the inline tab
 * pattern used across admin pages (accent fill on the active tab).
 *
 * @param {{
 *   tabs: Array<{ value: string, label: React.ReactNode, icon?: React.ReactNode }>,
 *   value: string,
 *   onChange?: (value: string) => void,
 *   size?: "sm"|"md",
 *   className?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function AdminTabs({ tabs, value, onChange, size = "md", className = "" }) {
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
  return (
    <div
      role="tablist"
      data-component="AdminTabs"
      className={`inline-flex items-center gap-0.5 rounded-[var(--adm-radius-sm)] p-0.5 ${className}`}
      style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.value)}
            className={`inline-flex items-center gap-1.5 rounded font-semibold transition ${pad}`}
            style={active ? { backgroundColor: "var(--adm-accent)", color: "#fff" } : { color: "var(--adm-muted)" }}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
