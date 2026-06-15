import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSDoDont } from "../dsPrimitives";

/**
 * UI copy & content rules: copy by surface, formatting standards, and the
 * error-message format.
 *
 * @returns {JSX.Element}
 */
export default function CopySection() {
  return (
    <div className="flex flex-col gap-10">
      {/* doc-only */}
      <DSPageHeading
        eyebrow="Cross-cutting rules"
        title="UI copy & content"
        lead="Copy is part of the design. Use sentence case, no terminal punctuation on labels, verb-first CTAs, and concrete error messages that say what happened and what to do next. Write for localization: avoid idioms and concatenated fragments."
      />

      <DSGroup title="Copy examples" status="spec" description="The same message, wrong vs right.">
        <DSDoDont
          dos={[
            "\"Create play\" — verb-first, sentence case",
            "\"We couldn't save your play. Check your connection and try again.\"",
            "\"No plays yet. Create your first play to get started.\"",
          ]}
          donts={[
            "\"New\" / \"Submit\" / \"Click here\" — vague",
            "\"Error: 500\" with no next step",
            "\"You have no data.\" — dead-end empty state",
          ]}
        />
      </DSGroup>

      <DSGroup title="Copy by surface">
        <DSTile>
          <DSChecklist
            columns={2}
            items={[
              { label: "Button labels", note: "Verb-first, sentence case, ≤3 words.", status: "spec" },
              { label: "Error messages", note: "What happened + how to fix. Never blame.", status: "spec" },
              { label: "Empty states", note: "Name the first useful action.", status: "spec" },
              { label: "Confirmation / destructive copy", note: "State the consequence explicitly.", status: "spec" },
              { label: "Toast / modal copy", note: "One idea, no filler.", status: "spec" },
              { label: "Tooltip / helper copy", note: "Context only; not instructions for required steps.", status: "spec" },
            ]}
          />
        </DSTile>
      </DSGroup>

      <DSGroup title="Copy standards">
        <DSChecklist
          columns={3}
          items={[
            { label: "Sentence case (not Title Case)", status: "spec" },
            { label: "No period on labels/CTAs", status: "spec" },
            { label: "Numbers, dates, currency format", status: "spec" },
            { label: "Plurals & abbreviations", status: "spec" },
            { label: "Error-message format", status: "spec" },
            { label: "CTA format (verb + object)", status: "spec" },
            { label: "Avoid \"Click here\"", status: "spec" },
            { label: "Inclusive language", status: "spec" },
            { label: "Localization-friendly", status: "spec" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
