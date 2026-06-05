import { FiCheck } from "react-icons/fi";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSRef } from "../dsPrimitives";

/**
 * Onboarding & education: setup checklist, product tour, and education
 * components.
 *
 * @returns {JSX.Element}
 */
export default function OnboardingSection() {
  const steps = [
    { label: "Create your team", done: true },
    { label: "Build your first play", done: true },
    { label: "Invite your staff", done: false },
    { label: "Share a play with athletes", done: false },
  ];

  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Onboarding & education"
        lead="New coaches are guided from empty to value with a short setup checklist and contextual help. Education surfaces (tooltips, learn-more links, what's-new banners) stay quiet and dismissible."
      />

      <DSGroup title="Setup checklist" status="spec" description="Progress toward first value, with one clear next action.">
        <DSTile>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Get started</p>
            <span className="text-xs" style={{ color: "var(--adm-text3)" }}>2 of 4</span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: "var(--adm-surface3)" }}>
            <div className="h-full rounded-full" style={{ width: "50%", backgroundColor: "var(--adm-accent)" }} />
          </div>
          <div className="space-y-2">
            {steps.map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-[var(--adm-radius-md)] px-3 py-2.5" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px]" style={s.done ? { backgroundColor: "var(--adm-success)", color: "#fff" } : { border: "1px solid var(--adm-border2)", color: "var(--adm-text3)" }}>{s.done ? <FiCheck /> : ""}</span>
                <span className="text-sm" style={{ color: s.done ? "var(--adm-text3)" : "var(--adm-text)", textDecoration: s.done ? "line-through" : "none" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Onboarding catalog">
        <DSChecklist
          columns={3}
          items={[
            { label: "Welcome screen", note: "src/pages/Onboarding.jsx", status: "inApp" },
            { label: "Setup checklist / progress", status: "spec" },
            { label: "First-run modal", status: "spec" },
            { label: "Product tour / coach marks", status: "planned" },
            { label: "Sample data / seed play", note: "Onboarding seeds a play.", status: "inApp" },
            { label: "Invite teammates step", status: "inApp" },
            { label: "Connect integration", status: "planned" },
            { label: "Completion state", status: "spec" },
            { label: "Upgrade prompt", status: "planned" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Education components">
        <DSChecklist
          columns={3}
          items={[
            { label: "Help tooltip / learn-more link", status: "inApp" },
            { label: "Inline documentation", status: "spec" },
            { label: "Video embed", note: "Demo videos page.", status: "inApp" },
            { label: "What's-new banner", status: "planned" },
            { label: "Support / chat entry", status: "spec" },
            { label: "Product tips", status: "spec" },
          ]}
        />
        <p className="text-xs" style={{ color: "var(--adm-text3)" }}>Real: <DSRef>src/pages/Onboarding.jsx</DSRef> <DSRef>src/pages/app/DemoVideos.jsx</DSRef></p>
      </DSGroup>
    </div>
  );
}
