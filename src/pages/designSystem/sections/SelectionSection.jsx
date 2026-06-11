import { FiCheck } from "react-icons/fi";
import { DSPageHeading, DSGroup, DSTile, DSChecklist } from "../dsPrimitives";

/**
 * Selection patterns: how a chosen card, row, option, or plan looks, and the
 * visual signals selection is allowed to use.
 *
 * @returns {JSX.Element}
 */
export default function SelectionSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Selection patterns"
        lead="Selection is always shown with at least two signals — never color alone — for accessibility: an accent border plus a checkmark or filled background. The treatment is identical across cards, rows, options, and plans."
      />

      <DSGroup title="Selectable cards" status="spec" description="Border + glow + checkmark on the selected card.">
        <DSTile>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Football", "Soccer", "Rugby"].map((label, i) => {
              const selected = i === 1;
              return (
                <div key={label} className="relative rounded-[var(--adm-radius)] p-4"
                  style={selected
                    ? { backgroundColor: "var(--adm-accent-dim)", border: "1px solid color-mix(in srgb, var(--adm-accent) 50%, transparent)", boxShadow: "0 0 0 1px var(--adm-accent-dim)" }
                    : { backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                  {selected ? <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-[10px]" style={{ backgroundColor: "var(--adm-accent)", color: "#fff" }}><FiCheck /></span> : null}
                  <p className="text-sm font-semibold" style={{ color: selected ? "var(--adm-accent)" : "var(--adm-text)" }}>{label}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--adm-text3)" }}>Choose your sport</p>
                </div>
              );
            })}
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Selection signals" description="Allowed ways to indicate a selected state.">
        <DSChecklist
          columns={3}
          items={[
            { label: "Accent border change", status: "live" },
            { label: "Background change", status: "live" },
            { label: "Checkmark", status: "live" },
            { label: "Radio / checkbox indicator", status: "live" },
            { label: "Glow / shadow", status: "live" },
            { label: "Text weight change", status: "spec" },
            { label: "Focus ring", status: "spec" },
            { label: "Disabled-selected state", status: "spec" },
            { label: "Multi-select count", status: "spec" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Selectable surfaces">
        <DSChecklist
          columns={3}
          items={[
            { label: "Selected card / row / list item", status: "spec" },
            { label: "Selected nav item / tab", status: "live" },
            { label: "Selected chip / option", status: "live" },
            { label: "Selectable pricing plan", status: "spec" },
            { label: "Selectable template / prefab", note: "Prefab/preset pickers.", status: "inApp" },
            { label: "Selectable file / integration", status: "spec" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
