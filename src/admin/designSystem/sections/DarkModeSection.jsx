import { useAdmin } from "../../../admin/AdminContext";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSDoDont } from "../dsPrimitives";

/**
 * Dark mode: how surfaces, text, borders, and brand color adapt. The whole
 * design system is theme-driven, so the active toggle in the header re-renders
 * every example here.
 *
 * @returns {JSX.Element}
 */
export default function DarkModeSection() {
  const { theme, setTheme } = useAdmin();

  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Cross-cutting rules"
        title="Dark mode"
        lead="Dark mode is not an afterthought — every admin token has a dark and light value, and components read tokens rather than hard-coded colors. Contrast in dark mode comes from layered surfaces and accent restraint, not stark white borders."
        meta={
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-[var(--adm-radius-md)] px-3 py-2 text-xs font-semibold" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border2)", color: "var(--adm-text)" }}>
            Toggle: {theme === "dark" ? "Dark" : "Light"} active
          </button>
        }
      />

      <DSGroup title="Surface ladder" status="live" description="Depth comes from stacking surfaces. Toggle the theme to compare.">
        <DSTile>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Background", token: "--adm-bg" },
              { label: "Surface", token: "--adm-surface" },
              { label: "Surface 2", token: "--adm-surface2" },
              { label: "Elevated", token: "--adm-surface-elevated" },
            ].map((s) => (
              <div key={s.label} className="rounded-[var(--adm-radius)] p-3" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                <div className="h-12 rounded-[var(--adm-radius-md)]" style={{ backgroundColor: `var(${s.token})`, border: "1px solid var(--adm-border)" }} />
                <p className="mt-2 text-xs font-semibold" style={{ color: "var(--adm-text)" }}>{s.label}</p>
                <p className="font-mono text-[10px]" style={{ color: "var(--adm-text3)" }}>{s.token}</p>
              </div>
            ))}
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Dark-mode coverage">
        <DSChecklist
          columns={3}
          items={[
            { label: "Backgrounds & surfaces", status: "live" },
            { label: "Text & muted text", status: "live" },
            { label: "Borders & dividers", status: "live" },
            { label: "Inputs / buttons / cards", status: "live" },
            { label: "Modals / dropdowns / tables", status: "live" },
            { label: "Charts", status: "live" },
            { label: "Shadows & overlays", status: "live" },
            { label: "Skeletons", status: "live" },
            { label: "Logo in dark mode", note: "Sidebar swaps to white logo.", status: "live" },
            { label: "Badge status colors retuned", status: "live" },
            { label: "App-shell light mode", note: "[data-theme] on .app-themed.", status: "inApp" },
            { label: "Images/illustrations in dark", status: "spec" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Dark-mode rules">
        <DSDoDont
          dos={[
            "Read --adm-* (or Brand*) tokens; never hard-code hex in components",
            "Get contrast from surface layering and muted text",
            "Retune semantic colors per theme (already done in admin.css)",
          ]}
          donts={[
            "Use pure-white borders or text on dark surfaces",
            "Reuse a light-mode shadow unchanged in dark mode",
            "Let one panel become the same gray as everything around it",
          ]}
        />
      </DSGroup>
    </div>
  );
}
