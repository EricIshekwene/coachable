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
export default function RadioGroup({
  label,
  options,
  value,
  onChange,
  className = "",
  name = "admin-radio-group",
  ...rest
}) {
  return (
    <div data-component="RadioGroup" className={`flex flex-col gap-2 ${className}`} {...rest}>
      {label ? (
        <p className="text-xs font-semibold" style={{ color: "var(--ui-text-muted)" }}>
          {label}
        </p>
      ) : null}
      <div className="grid gap-2">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] px-3.5 py-3 transition-colors"
              style={{
                backgroundColor: checked ? "color-mix(in srgb, var(--ui-accent-muted) 55%, var(--ui-surface))" : "var(--ui-surface)",
                border: checked ? "1px solid color-mix(in srgb, var(--ui-accent) 35%, transparent)" : "1px solid var(--ui-border)",
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
                  border: checked ? "1px solid var(--ui-accent)" : "1px solid var(--ui-border-strong)",
                  backgroundColor: checked ? "var(--ui-accent-muted)" : "var(--ui-surface-2)",
                }}
              >
                {checked ? (
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--ui-accent)" }} />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold" style={{ color: "var(--ui-text)" }}>
                  {option.label}
                </span>
                {option.description ? (
                  <span className="mt-1 block text-xs" style={{ color: "var(--ui-text-subtle)" }}>
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
