import { useState } from "react";
import { FiMoreHorizontal, FiEdit2, FiShare2, FiTrash2, FiCheck, FiChevronRight } from "react-icons/fi";
import { Button } from "../../../design-system/components";
import { DSPageHeading, DSGroup, DSTile, DSChecklist } from "../dsPrimitives";

/**
 * Menus & actions: dropdown / overflow menus, menu items, and the common-action
 * vocabulary the product reuses.
 *
 * @returns {JSX.Element}
 */
export default function MenusSection() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Components"
        title="Menus & actions"
        lead="Overflow and context menus share the elevated-surface + standard-shadow popover treatment. Items follow a strict order: default actions, then destructive actions below a separator. Action labels are verb-first and reused verbatim across the product."
      />

      <DSGroup title="Overflow menu" status="live">
        <DSTile>
          <div className="relative inline-block">
            <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)}>Actions <FiMoreHorizontal /></Button>
            {open ? (
              <div className="absolute left-0 top-11 z-10 w-56 overflow-hidden rounded-xl py-1.5" style={{ backgroundColor: "var(--adm-surface-elevated)", border: "1px solid var(--adm-border2)", boxShadow: "var(--adm-shadow)" }}>
                {[{ Icon: FiEdit2, label: "Edit", kbd: "E" }, { Icon: FiShare2, label: "Share", kbd: "S" }, { Icon: FiCheck, label: "Mark reviewed" }].map((item) => (
                  <button key={item.label} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm" style={{ color: "var(--adm-text2)" }}>
                    <span className="flex items-center gap-2.5"><item.Icon className="text-sm" />{item.label}</span>
                    {item.kbd ? <kbd className="rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text3)" }}>{item.kbd}</kbd> : null}
                  </button>
                ))}
                <div className="my-1 h-px" style={{ backgroundColor: "var(--adm-border)" }} />
                <button className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm" style={{ color: "var(--adm-danger)" }}><FiTrash2 className="text-sm" /> Delete</button>
              </div>
            ) : null}
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Menu item states" description="Each item defines default, hover, disabled, destructive, with-icon, with-shortcut, and submenu.">
        <DSTile>
          <div className="max-w-xs overflow-hidden rounded-xl py-1.5" style={{ backgroundColor: "var(--adm-surface-elevated)", border: "1px solid var(--adm-border2)" }}>
            <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm" style={{ color: "var(--adm-text2)" }}><FiEdit2 className="text-sm" /> Default item</button>
            <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm" style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text)" }}><FiShare2 className="text-sm" /> Hover item</button>
            <button disabled className="flex w-full items-center gap-2.5 px-3 py-2 text-sm opacity-45" style={{ color: "var(--adm-text3)" }}><FiCheck className="text-sm" /> Disabled item</button>
            <button className="flex w-full items-center justify-between px-3 py-2 text-sm" style={{ color: "var(--adm-text2)" }}><span className="flex items-center gap-2.5"><FiChevronRight className="text-sm" /> Submenu</span><FiChevronRight className="text-xs" /></button>
            <div className="my-1 h-px" style={{ backgroundColor: "var(--adm-border)" }} />
            <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm" style={{ color: "var(--adm-danger)" }}><FiTrash2 className="text-sm" /> Destructive item</button>
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Common action vocabulary" description="Reuse these exact labels — never invent synonyms.">
        <DSChecklist
          columns={3}
          items={[
            { label: "Create", status: "live" }, { label: "Edit", status: "live" }, { label: "Save", status: "live" },
            { label: "Cancel", status: "live" }, { label: "Delete", status: "live" }, { label: "Duplicate", status: "inApp" },
            { label: "Share", status: "inApp" }, { label: "Copy", status: "inApp" }, { label: "Download", status: "inApp" },
            { label: "Export / Import", status: "inApp" }, { label: "Archive / Restore", status: "spec" }, { label: "Retry / Refresh", status: "spec" },
            { label: "Approve / Reject", status: "inApp" }, { label: "Open / Preview", status: "inApp" }, { label: "Back / Next / Finish", status: "live" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
