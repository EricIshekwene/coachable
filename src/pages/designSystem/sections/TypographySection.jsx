import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSTokenTable } from "../dsPrimitives";

const SCALE = [
  { token: "Hero / page heading", value: "32px · Manrope · 600", sample: <span className="font-Manrope text-3xl font-semibold" style={{ color: "var(--adm-text)" }}>Aa</span> },
  { token: "Section heading", value: "20px · Manrope · 600", sample: <span className="font-Manrope text-xl font-semibold" style={{ color: "var(--adm-text)" }}>Aa</span> },
  { token: "Card / modal title", value: "14px · Manrope · 600", sample: <span className="font-Manrope text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Aa</span> },
  { token: "Body large", value: "15px · 1.6 line-height", sample: <span className="text-[15px]" style={{ color: "var(--adm-text2)" }}>Aa</span> },
  { token: "Body / regular", value: "14px · 1.5 line-height", sample: <span className="text-sm" style={{ color: "var(--adm-text2)" }}>Aa</span> },
  { token: "Caption / helper", value: "12px", sample: <span className="text-xs" style={{ color: "var(--adm-text3)" }}>Aa</span> },
  { token: "Overline / eyebrow", value: "11px · uppercase · 0.2em tracking", sample: <span className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--adm-text3)" }}>Aa</span> },
];

/**
 * Typography system: font families, the heading/body scale, label & code text,
 * text behavior (truncation/clamp), and value/data formatting rules.
 *
 * @returns {JSX.Element}
 */
export default function TypographySection() {
  return (
    <div className="flex flex-col gap-10">
      {/* doc-only */}
      <DSPageHeading
        eyebrow="Design tokens"
        title="Typography"
        lead="Manrope carries hierarchy (headings, labels, UI); DmSans is available for longer-form body. Keep the type scale tight so dense admin and editor screens stay scannable."
      />

      <DSGroup title="Font families">
        <div className="grid gap-4 md:grid-cols-3">
          <DSTile title="Manrope — primary" status="live">
            <p className="font-Manrope text-2xl font-semibold" style={{ color: "var(--adm-text)" }}>Coachable</p>
            <p className="mt-2 text-xs" style={{ color: "var(--adm-text3)" }}>Weights 400 / 600 · headings, labels, UI</p>
          </DSTile>
          <DSTile title="DmSans — body" status="live">
            <p className="font-DmSans text-2xl" style={{ color: "var(--adm-text)" }}>Coachable</p>
            <p className="mt-2 text-xs" style={{ color: "var(--adm-text3)" }}>Weights 400 / 700 · long-form content</p>
          </DSTile>
          <DSTile title="Monospace — code" status="spec">
            <p className="font-mono text-2xl" style={{ color: "var(--adm-text)" }}>Coachable</p>
            <p className="mt-2 text-xs" style={{ color: "var(--adm-text3)" }}>System mono · tokens, IDs, code</p>
          </DSTile>
        </div>
      </DSGroup>

      <DSGroup title="Type scale" description="The full set of text styles, from hero to overline.">
        <DSTokenTable rows={SCALE} />
      </DSGroup>

      <DSGroup title="Text behavior" description="How text adapts to constrained space.">
        <div className="grid gap-4 md:grid-cols-2">
          <DSTile title="Truncation (single line)">
            <p className="max-w-[220px] truncate text-sm" style={{ color: "var(--adm-text2)" }}>
              Trips Right Flood — Red Zone shot play vs Cover 3
            </p>
          </DSTile>
          <DSTile title="Multi-line clamp (2 lines)">
            <p className="line-clamp-2 max-w-[260px] text-sm" style={{ color: "var(--adm-text2)" }}>
              Keep language concise, action-led, and consistent across play cards and admin reports so dense screens still scan quickly.
            </p>
          </DSTile>
        </div>
      </DSGroup>

      <DSGroup title="Value & data formatting" description="Consistent formatting rules for numbers, dates, and other values.">
        <DSChecklist
          columns={2}
          items={[
            { label: "Whole / large numbers", note: "Group thousands: 6,418. Abbreviate in tight chips: 1.2K, 3.4M.", status: "spec" },
            { label: "Currency / percentage", note: "Currency with symbol + 2 decimals; percentages as 71% (no decimal unless needed).", status: "spec" },
            { label: "Dates & times", note: "\"May 04, 2026\" for absolute; \"2 hours ago\" for recent activity.", status: "inApp" },
            { label: "Durations & scores", note: "mm:ss for play length; scores as plain integers.", status: "spec" },
            { label: "Empty / unknown values", note: "Render \"—\" for empty, never a blank cell.", status: "spec" },
            { label: "Required / optional labels", note: "Required marked with accent asterisk; optional labelled \"(optional)\".", status: "spec" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
