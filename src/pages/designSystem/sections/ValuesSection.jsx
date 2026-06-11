import { useState } from "react";
import { FiEye, FiEyeOff, FiCopy } from "react-icons/fi";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSMeta } from "../dsPrimitives";

/**
 * Forms of values & data: value states, value display formats, and sensitive
 * value handling (reveal/copy/redact).
 *
 * @returns {JSX.Element}
 */
export default function ValuesSection() {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Values & data formatting"
        lead="Every value the UI shows has defined empty, loading, unknown, and error renderings — never a blank space. Sensitive values (API keys, tokens) stay masked with a reveal + copy affordance and only show the last few characters by default."
      />

      <DSGroup title="Value states" status="spec" description="How the same field renders across states.">
        <DSTile>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "Actual value", node: <span style={{ color: "var(--adm-text)" }}>74 plays</span> },
              { label: "Empty value", node: <span style={{ color: "var(--adm-text3)" }}>—</span> },
              { label: "Unknown value", node: <span style={{ color: "var(--adm-text3)" }}>Unknown</span> },
              { label: "Loading value", node: <span className="inline-block h-3 w-16 animate-pulse rounded-full" style={{ backgroundColor: "var(--adm-surface3)" }} /> },
              { label: "Failed value", node: <span style={{ color: "var(--adm-danger)" }}>Failed to load</span> },
              { label: "Pending value", node: <span style={{ color: "var(--adm-warning)" }}>Pending…</span> },
            ].map((v) => (
              <div key={v.label} className="flex items-center justify-between rounded-[var(--adm-radius-md)] px-3 py-2 text-sm" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                <span className="text-xs" style={{ color: "var(--adm-text3)" }}>{v.label}</span>
                {v.node}
              </div>
            ))}
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Sensitive values" status="spec" description="Masked by default, with reveal + copy.">
        <DSTile>
          <div className="flex items-center justify-between gap-3 rounded-[var(--adm-radius-md)] px-3 py-2.5" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
            <code className="text-sm" style={{ color: "var(--adm-text)" }}>{revealed ? "sk_live_8f2c91ad77be4c0a" : "sk_live_••••••••••••4c0a"}</code>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setRevealed((r) => !r)} className="rounded-md p-1.5" style={{ color: "var(--adm-text2)", border: "1px solid var(--adm-border)" }} aria-label={revealed ? "Hide" : "Reveal"}>{revealed ? <FiEyeOff /> : <FiEye />}</button>
              <button className="rounded-md p-1.5" style={{ color: "var(--adm-text2)", border: "1px solid var(--adm-border)" }} aria-label="Copy"><FiCopy /></button>
            </div>
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Formatted values" status="spec" description="Consistent rendering for the common value types.">
        <DSTile>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Currency", node: "$19.00" },
              { label: "Percentage", node: "64%" },
              { label: "Large number", node: "12.4K" },
              { label: "Date", node: "Jun 5, 2026" },
              { label: "Relative time", node: "2 hours ago" },
              { label: "Duration", node: "1m 42s" },
              { label: "File size", node: "19.3 MB" },
              { label: "Score", node: "24 – 17" },
              { label: "Email", node: "coach@club.io" },
            ].map((v) => (
              <div key={v.label} className="flex items-center justify-between rounded-[var(--adm-radius-md)] px-3 py-2 text-sm" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                <span className="text-xs" style={{ color: "var(--adm-text3)" }}>{v.label}</span>
                <span className="font-mono text-[13px]" style={{ color: "var(--adm-text)" }}>{v.node}</span>
              </div>
            ))}
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Usage">
        <DSMeta rows={[
          { label: "Never blank", value: "An absent value renders as “—” (em dash), not an empty cell — so rows stay scannable." },
          { label: "Sensitive", value: "Mask by default, reveal on demand, and only ever show the last 4 characters in summaries." },
          { label: "Numbers", value: "Right-align numeric columns; abbreviate above 10K (1.2K, 3.4M) with the full value in a tooltip." },
          { label: "Dates", value: "Show relative time for recent events; absolute date on hover/tooltip for precision." },
        ]} />
      </DSGroup>

      <DSGroup title="Value display formats">
        <DSChecklist
          columns={3}
          items={[
            { label: "Text / numeric / money", status: "spec" },
            { label: "Percentage / boolean", status: "spec" },
            { label: "Date / time / relative time", status: "live" },
            { label: "Status / user / team value", status: "live" },
            { label: "URL / email / phone", status: "spec" },
            { label: "File / color / code value", status: "spec" },
            { label: "Empty / unknown / hidden value", status: "spec" },
            { label: "Redacted / last-4 display", status: "spec" },
            { label: "Token / API-key value", status: "spec" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
