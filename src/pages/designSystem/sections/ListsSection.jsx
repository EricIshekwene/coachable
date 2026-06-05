import { AdminAvatar, AdminChip } from "../../../admin/components";
import { DSPageHeading, DSGroup, DSTile, DSStage, DSChecklist, DSAnatomy } from "../dsPrimitives";

/**
 * Lists, chips & tags: list types and item anatomy, plus the chip catalog.
 *
 * @returns {JSX.Element}
 */
export default function ListsSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Components"
        title="Lists, chips & tags"
        lead="Lists are the backbone of activity feeds, member rosters, and file views. Each row follows the same leading-element / title / metadata / trailing-action rhythm. Chips are compact, removable, and semantic."
      />

      <DSGroup title="Media list" status="live" description="Avatar + title + subtitle + trailing action.">
        <DSTile>
          <div className="divide-y" style={{ borderColor: "var(--adm-border)" }}>
            {[
              { name: "Maya Jordan", sub: "Head Coach · Austin Arrows", status: "online" },
              { name: "Nick Porter", sub: "Assistant Coach · Boston Blaze", status: "busy" },
              { name: "Lena Cho", sub: "Video Analyst · Seattle Tide", status: "offline" },
            ].map((u, i) => (
              <div key={u.name} className="flex items-center gap-3 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid var(--adm-border)" }}>
                <AdminAvatar name={u.name} size="md" status={u.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{u.name}</p>
                  <p className="truncate text-xs" style={{ color: "var(--adm-text3)" }}>{u.sub}</p>
                </div>
                <button className="rounded-md px-2.5 py-1 text-[11px] font-semibold" style={{ border: "1px solid var(--adm-border2)", color: "var(--adm-text2)" }}>View</button>
              </div>
            ))}
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Chips & tags" status="live" description="Shared AdminChip — tones, removable, selectable, and disabled.">
        <DSTile>
          <DSStage>
            <AdminChip tone="accent" onRemove={() => {}}>Filter chip</AdminChip>
            <AdminChip>red zone</AdminChip>
            <AdminChip>shot play</AdminChip>
            <AdminChip tone="success" selected>selected</AdminChip>
            <AdminChip disabled>disabled</AdminChip>
          </DSStage>
        </DSTile>
      </DSGroup>

      <DSGroup title="List item anatomy">
        <DSAnatomy parts={[
          { name: "Leading element", role: "Icon, avatar, file-type glyph, or checkbox." },
          { name: "Title", role: "Primary label, truncates on overflow." },
          { name: "Subtitle / metadata", role: "Muted secondary line." },
          { name: "Badge / status", role: "Optional state indicator." },
          { name: "Trailing action", role: "Button, menu, or chevron." },
        ]} />
      </DSGroup>

      <DSGroup title="List & chip catalog">
        <DSChecklist
          columns={3}
          items={[
            { label: "Basic / dense / divided list", status: "live" },
            { label: "Media / user list", status: "live" },
            { label: "Notification / activity list", note: "Notifications inbox.", status: "inApp" },
            { label: "File list", status: "spec" },
            { label: "Checklist / task list", status: "spec" },
            { label: "Drag handle / reorder", status: "spec" },
            { label: "Input / filter / status chip", status: "live" },
            { label: "Removable chip", status: "live" },
            { label: "User / category / count chip", status: "spec" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
