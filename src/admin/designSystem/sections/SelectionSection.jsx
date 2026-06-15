import { useState } from "react";
import { AdminSelectableCard } from "../../../admin/components";
import { DSPageHeading, DSGroup, DSTile, DSChecklist } from "../dsPrimitives";

/**
 * Selection patterns: how a chosen card, row, option, or plan looks, and the
 * visual signals selection is allowed to use.
 *
 * @returns {JSX.Element}
 */
export default function SelectionSection() {
  const [selected, setSelected] = useState("Soccer");

  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Selection patterns"
        lead="Selection is always shown with at least two signals — never color alone — for accessibility: an accent border plus a checkmark or filled background. The treatment is identical across cards, rows, options, and plans."
      />

      <DSGroup title="Selectable cards" status="live" description="AdminSelectableCard: border + glow + checkmark on the selected card. Interactive — click to toggle.">
        <DSTile>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Football", "Soccer", "Rugby"].map((label) => (
              <AdminSelectableCard
                key={label}
                label={label}
                description="Choose your sport"
                selected={selected === label}
                onClick={() => setSelected(label)}
              />
            ))}
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
