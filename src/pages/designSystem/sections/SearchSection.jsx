import { FiSearch, FiCommand, FiCornerDownLeft } from "react-icons/fi";
import { DSPageHeading, DSGroup, DSTile, DSChecklist } from "../dsPrimitives";

/**
 * Search experience: search input, results, and the planned command palette.
 *
 * @returns {JSX.Element}
 */
export default function SearchSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Search & command palette"
        lead="Local search (within a table or list) ships today with the standard search input. A global command palette — keyboard-launched, fuzzy, with quick actions — is the main planned addition."
      />

      <DSGroup title="Command palette" status="planned" description="Keyboard-launched (⌘K) global search + quick actions.">
        <DSTile>
          <div className="mx-auto max-w-md overflow-hidden rounded-[var(--adm-radius-lg)]" style={{ backgroundColor: "var(--adm-surface-elevated)", border: "1px solid var(--adm-border2)", boxShadow: "var(--adm-shadow-lg)" }}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
              <FiSearch style={{ color: "var(--adm-text3)" }} />
              <input autoFocus={false} placeholder="Search plays, teams, settings…" className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--adm-text)" }} />
              <span className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text3)" }}><FiCommand className="text-[10px]" />K</span>
            </div>
            <div className="p-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-text3)" }}>Quick actions</p>
              {["Create new play", "Invite staff", "Open settings"].map((a, i) => (
                <div key={a} className="flex items-center justify-between rounded-[var(--adm-radius-md)] px-2 py-2 text-sm" style={i === 0 ? { backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" } : { color: "var(--adm-text2)" }}>
                  <span>{a}</span>
                  {i === 0 ? <FiCornerDownLeft className="text-xs" /> : null}
                </div>
              ))}
            </div>
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Search catalog">
        <DSChecklist
          columns={3}
          items={[
            { label: "Local / page search input", status: "inApp" },
            { label: "Global search", status: "spec" },
            { label: "Search suggestions / recent", status: "planned" },
            { label: "Results page / result item", status: "spec" },
            { label: "Highlighted matches", status: "spec" },
            { label: "No-results state", status: "spec" },
            { label: "Search loading / error", status: "spec" },
            { label: "Keyboard navigation", status: "planned" },
            { label: "Command palette / quick actions", status: "planned" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
