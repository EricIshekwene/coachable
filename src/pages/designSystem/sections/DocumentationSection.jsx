import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSAnatomy } from "../dsPrimitives";

/**
 * Documentation standards: the per-component documentation template, design
 * system deliverables, and contribution/versioning rules.
 *
 * @returns {JSX.Element}
 */
export default function DocumentationSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Meta"
        title="Documentation & contribution"
        lead="How the design system documents itself and how it grows. New reusable UI lands here first — with its states and edge cases — before it spreads across multiple pages. Every shared component follows the same documentation template."
      />

      <DSGroup title="Per-component documentation template" description="What each shared component's docs must cover.">
        <DSTile>
          <DSAnatomy parts={[
            { name: "Name & purpose", role: "What it is and the problem it solves." },
            { name: "When to use / not use", role: "Clear boundaries against neighboring components." },
            { name: "Anatomy & variants", role: "Named parts, variants, and sizes." },
            { name: "States & props", role: "Every interaction state and the prop API." },
            { name: "Content & a11y rules", role: "Copy guidance and accessibility requirements." },
            { name: "Responsive & dark-mode behavior", role: "How it adapts across breakpoints and themes." },
            { name: "Do / don't & edge cases", role: "Examples and the messy cases it must survive." },
          ]} />
        </DSTile>
      </DSGroup>

      <DSGroup title="Design system deliverables">
        <DSChecklist
          columns={3}
          items={[
            { label: "Color / type / spacing tokens", status: "live" },
            { label: "Shadow / radius / motion tokens", status: "live" },
            { label: "Icon library", status: "live" },
            { label: "Component library", note: "src/admin/components.", status: "live" },
            { label: "Pattern library", status: "spec" },
            { label: "Page templates", status: "spec" },
            { label: "Accessibility checklist", status: "spec" },
            { label: "Content style guide", status: "spec" },
            { label: "Dark-mode guidelines", status: "live" },
            { label: "This documentation site", status: "live" },
            { label: "Storybook / Figma library", status: "planned" },
            { label: "Changelog / versioning", status: "spec" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Contribution rules">
        <DSChecklist
          columns={2}
          items={[
            { label: "New shared UI is documented here first", note: "Before it spreads to multiple pages.", status: "spec" },
            { label: "Components read tokens, never hard-coded color", status: "live" },
            { label: "Every component ships its full state set", status: "spec" },
            { label: "Update this design system when you add/rename UI", note: "Same change, not a follow-up.", status: "spec" },
            { label: "Design review checklist before merge", status: "spec" },
            { label: "Tests live in admin/test/", note: "Per project conventions.", status: "live" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
