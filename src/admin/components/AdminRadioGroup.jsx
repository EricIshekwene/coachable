/**
 * Compact stacked radio options for admin forms.
 *
 * @param {{
 *   label?: string,
 *   options: Array<{ value: string, label: React.ReactNode, description?: React.ReactNode }>,
 *   value?: string,
 *   onChange?: (value: string) => void,
 *   className?: string,
 *   name?: string,
 * }} props
 */
export default function AdminRadioGroup({
  label,
  options,
  value,
  onChange,
  className = "",
  name = "admin-radio-group",
}) {
  return (
    <div data-component="AdminRadioGroup" className={`flex flex-col gap-2 ${className}`}>
      {label ? (
        <p className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>
          {label}
        </p>
      ) : null}
      <div className="grid gap-2">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-[var(--adm-radius-md)] px-3.5 py-3 transition-colors"
              style={{
                backgroundColor: checked ? "color-mix(in srgb, var(--adm-accent-dim) 55%, var(--adm-surface))" : "var(--adm-surface)",
                border: checked ? "1px solid color-mix(in srgb, var(--adm-accent) 35%, transparent)" : "1px solid var(--adm-border)",
              }}
            >
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onChange?.(option.value)}
                className="sr-only"
              />
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                style={{
                  border: checked ? "1px solid var(--adm-accent)" : "1px solid var(--adm-border2)",
                  backgroundColor: checked ? "color-mix(in srgb, var(--adm-accent-dim) 85%, white 0%)" : "var(--adm-surface2)",
                }}
              >
                {checked ? (
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--adm-accent)" }} />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
                  {option.label}
                </span>
                {option.description ? (
                  <span className="mt-1 block text-xs" style={{ color: "var(--adm-text3)" }}>
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
