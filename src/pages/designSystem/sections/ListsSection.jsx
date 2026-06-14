import { Badge, Button, Avatar, Chip, ListItem } from "../../../design-system/components";
import { DSPageHeading, DSGroup, DSTile, DSStage, DSChecklist, DSAnatomy } from "../dsPrimitives";

const LIST_MEMBERS = [
  { name: "Maya Jordan",  sub: "Head Coach · Austin Arrows",  status: "online" },
  { name: "Nick Porter",  sub: "Assistant Coach · Boston Blaze", status: "busy" },
  { name: "Lena Cho",     sub: "Video Analyst · Seattle Tide", status: "offline" },
];

/**
 * Lists, chips & tags: the ListItem component demonstrated with a media-list
 * pattern, plus the chip catalog.
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

      <DSGroup title="Media list" status="live" description="Avatar + title + subtitle + trailing action — using ListItem.">
        <DSTile>
          {LIST_MEMBERS.map((u) => (
            <ListItem
              key={u.name}
              leading={<Avatar name={u.name} size="md" status={u.status} />}
              title={u.name}
              subtitle={u.sub}
              trailing={
                <button
                  className="rounded-md px-2.5 py-1 text-[11px] font-semibold"
                  style={{ border: "1px solid var(--ui-border)", color: "var(--ui-text-muted)" }}
                >
                  View
                </button>
              }
              onClick={() => {}}
            />
          ))}
        </DSTile>
      </DSGroup>

      <DSGroup title="Chips & tags" status="live" description="Shared Chip — tones, removable, selectable, and disabled.">
        <DSTile>
          <DSStage>
            <Chip tone="accent" onRemove={() => {}}>Filter chip</Chip>
            <Chip>red zone</Chip>
            <Chip>shot play</Chip>
            <Chip tone="success" selected>selected</Chip>
            <Chip disabled>disabled</Chip>
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
