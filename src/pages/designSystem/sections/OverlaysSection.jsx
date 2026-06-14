import { useState } from "react";
import { FiZap, FiInfo } from "react-icons/fi";
import { Modal, Button, Input, Textarea, Tooltip } from "../../../design-system/components";
import { Tooltip as SlateTooltip } from "../../../components/subcomponents/Popovers";
import { DSPageHeading, DSGroup, DSTile, DSStage, DSChecklist, DSAnatomy } from "../dsPrimitives";

/**
 * Overlays: modals, drawers, popovers, and tooltips. Live Modal and the
 * Slate tooltip primitive, plus documented coverage for drawers and popovers.
 *
 * @returns {JSX.Element}
 */
export default function OverlaysSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Components"
        title="Modals, drawers & overlays"
        lead="Overlays share one scrim, radius, padding, and footer-action treatment. Modal is the shared dialog; drawers and popovers follow the same surface language. Action hierarchy stays simple — one primary, one secondary, aligned bottom-right."
      />

      <DSGroup title="Modal" status="live" description="Escape-to-close, click-scrim-to-close, blurred backdrop, sticky-able footer.">
        <DSTile>
          <div className="space-y-4">
            <div className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Modal anatomy</p>
              <div className="mt-3 space-y-3">
                <div className="rounded-[var(--adm-radius-md)] px-3 py-2 text-sm" style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)" }}>Title + short explainer</div>
                <div className="rounded-[var(--adm-radius-md)] px-3 py-8 text-sm" style={{ backgroundColor: "var(--adm-surface)", border: "1px dashed var(--adm-border2)", color: "var(--adm-text3)" }}>Scrollable content area</div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm">Cancel</Button>
                  <Button variant="primary" size="sm">Confirm</Button>
                </div>
              </div>
            </div>
            <Button variant="primary" onClick={() => setOpen(true)}>Open modal example</Button>
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Tooltip & popover" status="live" description="Shared Tooltip handles admin-themed helper text (hover + keyboard focus); the Slate tooltip is the editor-canvas variant; rich popovers add structured content.">
        <div className="grid gap-4 md:grid-cols-2">
          <DSTile title="Tooltip">
            <DSStage>
              <Tooltip label="Shared admin tooltip — hover or focus me">
                <Button variant="secondary" size="sm">Admin tooltip</Button>
              </Tooltip>
            </DSStage>
            <DSStage dark className="mt-3">
              <div className="relative inline-flex">
                <button type="button" className="rounded-lg px-3 py-2 text-xs" style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.8)" }}>Slate variant</button>
                <SlateTooltip isOpen text="Editor-canvas tooltip." />
              </div>
            </DSStage>
          </DSTile>
          <DSTile title="Info popover">
            <div className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-surface-elevated)", border: "1px solid var(--adm-border2)", boxShadow: "var(--adm-shadow)" }}>
              <div className="flex items-center gap-2"><FiInfo style={{ color: "var(--adm-accent)" }} /><p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>What's this?</p></div>
              <p className="mt-2 text-xs leading-5" style={{ color: "var(--adm-text2)" }}>Rich popovers can hold a heading, body, and a small action. They use the elevated surface + standard shadow.</p>
            </div>
          </DSTile>
        </div>
      </DSGroup>

      <DSGroup title="Modal anatomy">
        <DSAnatomy parts={[
          { name: "Overlay / scrim", role: "Dimmed, blurred backdrop; click to dismiss." },
          { name: "Container", role: "Elevated surface, large radius, max-height with scroll." },
          { name: "Header", role: "Title + optional close button." },
          { name: "Body", role: "Scrollable content region." },
          { name: "Footer", role: "Primary + secondary (or destructive) actions, bottom-right." },
        ]} />
      </DSGroup>

      <DSGroup title="Overlay catalog" description="The full set from the checklist.">
        <DSChecklist
          columns={3}
          items={[
            { label: "Confirmation modal", note: "ConfirmModal.", status: "inApp" },
            { label: "Destructive confirmation", status: "inApp" },
            { label: "Form modal", note: "SavePrefab / SaveToPlaybook.", status: "inApp" },
            { label: "Full-screen / media modal", note: "ExportModal, play view.", status: "inApp" },
            { label: "Upgrade / paywall modal", status: "planned" },
            { label: "Right / left drawer", status: "spec" },
            { label: "Bottom sheet", note: "Mobile editor bar sheet.", status: "inApp" },
            { label: "Filter / details drawer", status: "spec" },
            { label: "Hover card / user card", status: "spec" },
            { label: "Tooltip placement & delay rules", status: "spec" },
            { label: "Nested modal rules", status: "spec" },
            { label: "Mobile full-screen behavior", status: "live" },
          ]}
        />
      </DSGroup>

      <Modal open={open} onClose={() => setOpen(false)} title="Share updated design rules" width="max-w-lg">
        <div className="space-y-4">
          <p className="text-sm leading-6" style={{ color: "var(--adm-text2)" }}>Use the shared modal pattern for approvals, confirmations, and dense settings blocks. Keep the action hierarchy simple and align the button stack bottom-right.</p>
          <Input label="Audience" value="All staff" onChange={() => {}} />
          <Textarea label="Message" value="The design system now documents shared overlays, fields, and patterns." onChange={() => {}} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary"><FiZap /> Send update</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
