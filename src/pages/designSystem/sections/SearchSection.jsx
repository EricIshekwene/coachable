import { useMemo, useState } from "react";
import { FiSearch, FiCommand, FiCornerDownLeft, FiX } from "react-icons/fi";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSMeta, DSDoDont, DSRef } from "../dsPrimitives";

/** Sample rows for the live local-search demo. */
const SAMPLE = [
  "Forwards crash ball",
  "Backline switch play",
  "Lineout 7-man",
  "Scrum pick-and-go",
  "Kick-chase structure",
  "Defensive blitz",
];

/**
 * Highlight the matched substring within a label.
 * @param {string} text
 * @param {string} q
 * @returns {React.ReactNode}
 */
function highlight(text, q) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)", borderRadius: 3, padding: "0 2px" }}>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Search experience: the now-live ⌘K command palette (used by this very design
 * system), a live local-search input with highlighted matches and an empty
 * state, plus the full search catalog.
 *
 * @returns {JSX.Element}
 */
export default function SearchSection() {
  const [q, setQ] = useState("");
  const matches = useMemo(
    () => SAMPLE.filter((s) => s.toLowerCase().includes(q.trim().toLowerCase())),
    [q],
  );

  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Search & command palette"
        lead="Two search surfaces: local search filters the rows already on screen (a table, a list) with highlighted matches; the global ⌘K command palette fuzzy-jumps anywhere and runs quick actions. This design system ships both — the palette in the header is the live reference implementation."
      />

      <DSGroup title="Command palette" status="live" description="Press ⌘K / Ctrl-K anywhere in this design system, or “/” when not typing.">
        <DSTile>
          <div className="mx-auto max-w-md overflow-hidden rounded-[var(--adm-radius-lg)]" style={{ backgroundColor: "var(--adm-surface-elevated)", border: "1px solid var(--adm-border2)", boxShadow: "var(--adm-shadow-lg)" }}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
              <FiSearch style={{ color: "var(--adm-text3)" }} />
              <input readOnly placeholder="Search plays, teams, settings…" className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--adm-text)" }} />
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
          <p className="mt-3 text-center text-xs" style={{ color: "var(--adm-text3)" }}>Live: <DSRef>src/pages/designSystem/SearchPalette.jsx</DSRef> · ranks with <DSRef>designSystemSearch.js</DSRef></p>
        </DSTile>
      </DSGroup>

      <DSGroup title="Local search" status="live" description="Filters on-screen rows live and highlights the matched span. Type below.">
        <DSTile>
          <div className="mx-auto max-w-sm">
            <div className="flex items-center gap-2 rounded-[var(--adm-radius-md)] px-3 py-2" style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border2)" }}>
              <FiSearch className="text-sm" style={{ color: "var(--adm-text3)" }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter plays…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--adm-text)" }} />
              {q ? <button type="button" onClick={() => setQ("")} aria-label="Clear"><FiX className="text-sm" style={{ color: "var(--adm-text3)" }} /></button> : null}
            </div>
            <div className="mt-2 flex flex-col gap-0.5">
              {matches.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm" style={{ color: "var(--adm-text3)" }}>No plays match “{q}”.</p>
              ) : (
                matches.map((m) => (
                  <div key={m} className="rounded-[var(--adm-radius-md)] px-3 py-2 text-sm" style={{ color: "var(--adm-text2)" }}>{highlight(m, q.trim())}</div>
                ))
              )}
            </div>
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Usage">
        <DSMeta rows={[
          { label: "When to use", value: "Local search for any list/table over ~8 rows. The palette for cross-surface navigation and power-user shortcuts." },
          { label: "When not to", value: "Don’t hide a primary filter behind search — surface common filters as visible chips and reserve search for free text." },
          { label: "Keyboard", value: "⌘K / Ctrl-K toggles the palette; “/” opens it when focus isn’t in a field; ↑/↓ move, Enter opens, Esc closes." },
          { label: "Accessibility", value: "Palette is role=\"dialog\" aria-modal; the input is labelled; results are buttons reachable by keyboard." },
          { label: "Empty / loading", value: "Always render a no-results line (never a blank panel). Debounce async results and show a spinner inline." },
        ]} />
        <DSDoDont
          dos={["Highlight the matched substring", "Keep recent + popular searches one keystroke away", "Make every result keyboard-selectable"]}
          donts={["Don’t clear the query on blur", "Don’t block typing while results load", "Don’t return an unbounded list — cap and rank"]}
        />
      </DSGroup>

      <DSGroup title="Search catalog">
        <DSChecklist
          columns={3}
          items={[
            { label: "Local / page search input", status: "live" },
            { label: "Global search", status: "live" },
            { label: "Command palette / quick actions", status: "live" },
            { label: "Highlighted matches", status: "live" },
            { label: "No-results state", status: "live" },
            { label: "Keyboard navigation", status: "live" },
            { label: "Search suggestions / recent", status: "planned" },
            { label: "Results page / result item", status: "spec" },
            { label: "Search loading / error", status: "spec" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
