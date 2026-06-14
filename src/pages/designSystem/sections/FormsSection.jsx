import { useState } from "react";
import { FiSearch } from "react-icons/fi";
import { Input, Select, Textarea, Checkbox, Toggle, RadioGroup, Button } from "../../../design-system/components";
import { DSPageHeading, DSGroup, DSTile, DSChecklist } from "../dsPrimitives";

/**
 * A static field showing a single visual state (default/focus/error/disabled),
 * used to document input states side by side.
 *
 * @param {{ label: string, value: string, tone?: "default"|"focus"|"error"|"disabled" }} props
 * @returns {JSX.Element}
 */
function FieldState({ label, value, tone = "default" }) {
  const styles = {
    default: { border: "1px solid var(--adm-border2)", color: "var(--adm-text3)", boxShadow: "none" },
    focus: { border: "1px solid var(--adm-accent)", color: "var(--adm-text)", boxShadow: "0 0 0 4px var(--adm-accent-dim)" },
    disabled: { border: "1px solid var(--adm-border)", color: "var(--adm-text3)", backgroundColor: "var(--adm-surface2)" },
    error: { border: "1px solid color-mix(in srgb, var(--adm-danger) 46%, var(--adm-border2))", color: "var(--adm-text)", boxShadow: "0 0 0 4px var(--adm-danger-dim)" },
  }[tone];
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-text3)" }}>{label}</span>
      <div className="flex min-h-11 items-center rounded-[var(--adm-radius-md)] px-3.5 py-2.5 text-sm"
        style={{ backgroundColor: "var(--adm-surface)", ...styles }}>
        {value}
      </div>
    </div>
  );
}

/**
 * Forms system: inputs, selects, check controls, and form patterns. Live admin
 * primitives plus documented coverage for the wider checklist.
 *
 * @returns {JSX.Element}
 */
export default function FormsSection() {
  const [form, setForm] = useState({ search: "Trips Right Flood", role: "coach", notes: "Keep language concise and action-led.", alerts: true, owners: false, live: true, visibility: "team" });

  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Components"
        title="Forms & inputs"
        lead="Field heights, label sizing, radius, and focus treatment are aligned across every entry point. Input / Select / Textarea / Checkbox / Toggle / RadioGroup are the shared primitives."
      />

      <DSGroup title="Text inputs, select & textarea" status="live">
        <DSTile>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Text input" value={form.search} onChange={(e) => setForm((p) => ({ ...p, search: e.target.value }))} />
            <Input label="Email input" type="email" value="coach@austinarrows.com" onChange={() => {}} />
            <Input label="Password input" type="password" value="secretpass" onChange={() => {}} />
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3.5 top-[2.35rem] text-sm" style={{ color: "var(--adm-text3)" }} />
              <Input label="Search input" value={form.search} onChange={(e) => setForm((p) => ({ ...p, search: e.target.value }))} inputClassName="pl-9" />
            </div>
            <Select label="Select / dropdown" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="coach">Coach</option>
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
            </Select>
            <Input label="Disabled field" value="Archived roster" disabled onChange={() => {}} />
          </div>
          <div className="mt-3">
            <Textarea label="Textarea" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} hint="Same radius, spacing, and helper-text style as other fields." />
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Input states" status="live" description="Default, focus, error, and disabled share one treatment.">
        <DSTile>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FieldState label="Default" value="Field default state" />
            <FieldState label="Focused" value="Focused and ready" tone="focus" />
            <FieldState label="Error" value="Missing required info" tone="error" />
            <FieldState label="Disabled" value="Unavailable until enabled" tone="disabled" />
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Check controls" status="live" description="Checkbox, toggle, and radio group.">
        <div className="grid gap-4 md:grid-cols-2">
          <DSTile title="Checkboxes & toggles">
            <div className="space-y-3">
              <Checkbox checked={form.alerts} onChange={() => setForm((p) => ({ ...p, alerts: !p.alerts }))} label="Include issue alerts" description="Show priority bugs in the daily report." />
              <Checkbox checked={form.owners} onChange={() => setForm((p) => ({ ...p, owners: !p.owners }))} label="Limit to owners" />
              <Checkbox checked label="Locked sample" disabled />
              <Toggle checked={form.live} onChange={(next) => setForm((p) => ({ ...p, live: next }))} label="Live updates" description="Push edits into open dashboards without refresh." />
            </div>
          </DSTile>
          <DSTile title="Radio group">
            <RadioGroup
              label="Visibility"
              value={form.visibility}
              onChange={(v) => setForm((p) => ({ ...p, visibility: v }))}
              options={[
                { value: "team", label: "Team only", description: "Coaches and staff inside the current team." },
                { value: "league", label: "Org / league", description: "Broader access with shared review context." },
                { value: "private", label: "Private draft", description: "Early review or incomplete play packages." },
              ]}
            />
          </DSTile>
        </div>
      </DSGroup>

      <DSGroup title="Form patterns" description="Layout and submission patterns built from the primitives above.">
        <DSChecklist
          columns={3}
          items={[
            { label: "Field label + required marker", status: "live" },
            { label: "Helper / error / success text", status: "live" },
            { label: "Stacked & multi-column form", status: "live" },
            { label: "Sticky form actions / submit bar", note: "Modal footers do this; promote to a pattern.", status: "spec" },
            { label: "Inline & submit validation", status: "spec" },
            { label: "Dirty-state / unsaved-changes warning", note: "Editor warns; not generalized.", status: "spec" },
            { label: "Autosave form", note: "Slate autosaves plays.", status: "inApp" },
            { label: "Wizard / stepper form", status: "planned" },
            { label: "Disabled submit state", status: "live" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Selects, pickers & advanced inputs" description="From the checklist — many are not yet shared components.">
        <DSChecklist
          columns={3}
          items={[
            { label: "Combobox / searchable select", status: "spec" },
            { label: "Multi-select / tag input", note: "Play tags use chips.", status: "inApp" },
            { label: "Color picker", note: "Slate ColorPickerPopover.", status: "inApp" },
            { label: "Date / date-range picker", status: "planned" },
            { label: "Time / timezone selector", status: "planned" },
            { label: "File / image / avatar upload", note: "Demo video + logo uploads exist.", status: "inApp" },
            { label: "Slider / range slider", note: "Speed slider in editor.", status: "inApp" },
            { label: "Rating / star input", status: "planned" },
            { label: "Mention input", status: "planned" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
