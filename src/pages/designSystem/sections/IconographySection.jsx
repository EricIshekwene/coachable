import { FiPlay, FiPause, FiPlus, FiTrash2, FiSettings, FiSearch, FiBell, FiShare2, FiDownload, FiEdit2, FiCheck, FiX, FiAlertCircle, FiUsers, FiGrid, FiLayers } from "react-icons/fi";
import { PiPenNib, PiShapesFill } from "react-icons/pi";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSDoDont } from "../dsPrimitives";

const SIZES = [
  { label: "Small", px: 14, cls: "text-sm" },
  { label: "Medium", px: 16, cls: "text-base" },
  { label: "Large", px: 20, cls: "text-xl" },
];

const COMMON = [
  { Icon: FiPlay, name: "Play" }, { Icon: FiPause, name: "Pause" }, { Icon: FiPlus, name: "Create" },
  { Icon: FiEdit2, name: "Edit" }, { Icon: FiTrash2, name: "Delete" }, { Icon: FiShare2, name: "Share" },
  { Icon: FiDownload, name: "Download" }, { Icon: FiSearch, name: "Search" }, { Icon: FiSettings, name: "Settings" },
  { Icon: FiBell, name: "Notifications" }, { Icon: FiUsers, name: "Team" }, { Icon: FiGrid, name: "Plays" },
  { Icon: FiLayers, name: "Prefabs" }, { Icon: PiPenNib, name: "Draw" }, { Icon: PiShapesFill, name: "Shapes" },
  { Icon: FiCheck, name: "Confirm" }, { Icon: FiX, name: "Close" }, { Icon: FiAlertCircle, name: "Alert" },
];

/**
 * Icon and illustration system: library, sizes, stroke, color rules, and the
 * planned illustration set.
 *
 * @returns {JSX.Element}
 */
export default function IconographySection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Design tokens"
        title="Iconography & illustration"
        lead="Icons come from react-icons — primarily Feather (Fi*) for line icons, with Phosphor (Pi*) for editor-specific marks. Keep stroke weight and size consistent, and let icons inherit text color."
      />

      <DSGroup title="Sizes & stroke" description="Three sizes cover almost everything. Feather's 2px stroke is the default weight.">
        <div className="flex flex-wrap gap-6">
          {SIZES.map((s) => (
            <DSTile key={s.label} title={`${s.label} · ${s.px}px`}>
              <div className="flex items-center gap-3" style={{ color: "var(--adm-text)" }}>
                <FiPlay className={s.cls} />
                <FiSettings className={s.cls} />
                <FiBell className={s.cls} />
              </div>
            </DSTile>
          ))}
        </div>
      </DSGroup>

      <DSGroup title="Common product icons" description="The recurring action and navigation glyphs.">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {COMMON.map((entry) => (
            <div key={entry.name} className="flex flex-col items-center gap-2 rounded-[var(--adm-radius)] py-4"
              style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
              <entry.Icon className="text-xl" style={{ color: "var(--adm-text)" }} />
              <span className="text-[10px]" style={{ color: "var(--adm-text3)" }}>{entry.name}</span>
            </div>
          ))}
        </div>
      </DSGroup>

      <DSGroup title="Icon color & alignment rules">
        <DSDoDont
          dos={[
            "Let icons inherit currentColor so they track the text/state",
            "Use accent only for active/selected icon buttons",
            "Center icons optically inside icon-only buttons (h-10 w-10)",
          ]}
          donts={[
            "Mix icon libraries within one cluster (keep Feather + Feather)",
            "Hard-code icon colors that fight dark mode",
            "Use filled and outline variants of the same icon together",
          ]}
        />
      </DSGroup>

      <DSGroup title="Illustration system" description="Beyond icons, the product uses the play canvas itself as imagery. A formal illustration set is still to come.">
        <DSChecklist
          columns={2}
          items={[
            { label: "Empty-state graphics", note: "Currently icon-in-circle; promote to a small illustration set.", status: "spec" },
            { label: "Error illustrations", note: "404/500 use type + icon today.", status: "spec" },
            { label: "Onboarding illustrations", note: "Sport-themed spot art.", status: "planned" },
            { label: "Play-preview as hero", note: "Auto-playing play thumbnails double as imagery.", status: "live" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
