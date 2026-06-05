import { FiSearch, FiSettings, FiPlus, FiArrowUpRight, FiTrash2, FiChevronDown } from "react-icons/fi";
import { AdminBtn } from "../../../admin/components";
import { DSPageHeading, DSGroup, DSTile, DSStage, DSChecklist, DSAnatomy } from "../dsPrimitives";

/**
 * Button system: variants, sizes, states (live AdminBtn), plus the documented
 * button patterns the checklist asks for that are not yet shared components.
 *
 * @returns {JSX.Element}
 */
export default function ButtonsSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Components"
        title="Buttons"
        lead="One accent CTA per cluster. AdminBtn is the shared admin button; it covers primary, secondary, outline, ghost, and danger across four sizes. Marketing and Slate have their own button treatments documented in their sections."
      />

      <DSGroup title="Variants" status="live" description="Primary leads intent; the rest stay quieter but clickable.">
        <DSTile>
          <DSStage>
            <AdminBtn variant="primary">Primary</AdminBtn>
            <AdminBtn variant="secondary">Secondary</AdminBtn>
            <AdminBtn variant="outline">Outline</AdminBtn>
            <AdminBtn variant="ghost">Ghost</AdminBtn>
            <AdminBtn variant="danger">Danger</AdminBtn>
            <AdminBtn disabled>Disabled</AdminBtn>
          </DSStage>
        </DSTile>
      </DSGroup>

      <DSGroup title="Sizes & icon buttons" status="live">
        <DSTile>
          <DSStage>
            <AdminBtn variant="secondary" size="sm">Small</AdminBtn>
            <AdminBtn variant="primary" size="md">Medium</AdminBtn>
            <AdminBtn variant="outline" size="lg">Large</AdminBtn>
            <AdminBtn variant="ghost" size="icon" aria-label="Search"><FiSearch /></AdminBtn>
            <AdminBtn variant="secondary" size="icon" aria-label="Settings"><FiSettings /></AdminBtn>
            <AdminBtn variant="primary"><FiPlus /> Leading icon</AdminBtn>
            <AdminBtn variant="secondary">Trailing icon <FiArrowUpRight /></AdminBtn>
          </DSStage>
        </DSTile>
      </DSGroup>

      <DSGroup title="States" description="Every interactive button defines these. Default / hover / active / focus / disabled are handled by AdminBtn.">
        <DSChecklist
          columns={3}
          items={[
            { label: "Default", note: "Resting variant style.", status: "live" },
            { label: "Hover", note: "Lift + brighten (primary) or surface shift.", status: "live" },
            { label: "Active / pressed", note: "active:scale-[0.985].", status: "live" },
            { label: "Focus visible", note: "Keyboard focus ring.", status: "spec" },
            { label: "Disabled", note: "45% opacity, no pointer events.", status: "live" },
            { label: "Loading", note: "Spinner + disabled; promote to an AdminBtn prop.", status: "spec" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Anatomy">
        <DSAnatomy parts={[
          { name: "Container", role: "Rounded-md surface carrying the variant style and elevation." },
          { name: "Leading icon (optional)", role: "Reinforces the action; inherits text color." },
          { name: "Label", role: "Verb-first, sentence case — \"Create play\", not \"New\"." },
          { name: "Trailing icon (optional)", role: "Direction / disclosure (arrow, chevron)." },
        ]} />
      </DSGroup>

      <DSGroup title="Documented but not yet shared components" description="Button patterns from the checklist that should become AdminBtn variants/props.">
        <div className="grid gap-3 sm:grid-cols-2">
          <DSTile title="Split button" status="spec">
            <DSStage>
              <div className="inline-flex">
                <AdminBtn variant="secondary" className="rounded-r-none">Save</AdminBtn>
                <AdminBtn variant="secondary" size="icon" className="rounded-l-none border-l-0" aria-label="More save options"><FiChevronDown /></AdminBtn>
              </div>
            </DSStage>
          </DSTile>
          <DSTile title="Button group" status="spec">
            <DSStage>
              <div className="inline-flex overflow-hidden rounded-[var(--adm-radius-md)]" style={{ border: "1px solid var(--adm-border2)" }}>
                <button className="px-3 py-2 text-xs font-semibold" style={{ backgroundColor: "var(--adm-accent)", color: "#fff" }}>Day</button>
                <button className="px-3 py-2 text-xs font-semibold" style={{ color: "var(--adm-text2)" }}>Week</button>
                <button className="px-3 py-2 text-xs font-semibold" style={{ color: "var(--adm-text2)" }}>Month</button>
              </div>
            </DSStage>
          </DSTile>
        </div>
        <DSChecklist
          columns={3}
          items={[
            { label: "Loading button", status: "spec" },
            { label: "Full-width button", note: "className=\"w-full\" today.", status: "live" },
            { label: "Toggle button", status: "spec" },
            { label: "Floating action button", status: "planned" },
            { label: "Dropdown button", status: "spec" },
            { label: "Success button", note: "Use semantic success token.", status: "spec" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
