import { FiMoreHorizontal, FiCircle } from "react-icons/fi";
import { Card, Avatar, Badge, Button } from "../../../design-system/components";
import PlayPreviewCard from "../../../components/PlayPreviewCard";
import { prefabToPreviewPlayData } from "../../../utils/sportPrefabPresets";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSAnatomy } from "../dsPrimitives";

const USERS = [
  { name: "Maya Jordan", role: "Head Coach", team: "Austin Arrows", status: "online" },
  { name: "Nick Porter", role: "Assistant Coach", team: "Boston Blaze", status: "busy" },
];

const TEAMS = [
  { name: "Austin Arrows", sport: "Football", members: 29, plays: 74 },
  { name: "Seattle Tide", sport: "Soccer", members: 22, plays: 41 },
];

const PLAY = {
  title: "Trips Right Flood",
  tags: ["red zone", "shot play"],
  updated: "9m ago",
  creator: "Eric I.",
  playData: prefabToPreviewPlayData(
    {
      players: [
        { dx: -148, dy: -44, number: "11", color: "#ef4444" },
        { dx: -76, dy: 8, number: "9", color: "#ef4444" },
        { dx: -2, dy: 30, number: "5", color: "#ef4444" },
        { dx: 72, dy: -18, number: "88", color: "#3b82f6" },
        { dx: 128, dy: 36, number: "21", color: "#3b82f6" },
      ],
      objects: [{ dx: -28, dy: 2, objectType: "ball" }],
    },
    "football"
  ),
};

/**
 * Play preview card matching the product's platform play card treatment:
 * landscape preview, tight title row, small tags, quiet footer.
 *
 * @returns {JSX.Element}
 */
function PlayCardPreview() {
  return (
    <div className="group relative flex max-w-[320px] flex-col rounded-xl border p-5"
      style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)", boxShadow: "0 1px 4px rgba(0,0,0,0.10)" }}>
      <div className="relative mb-4 aspect-[16/10] w-full overflow-hidden rounded-xl" style={{ border: "1px solid var(--adm-border)" }}>
        <PlayPreviewCard playData={PLAY.playData} autoplay="hover" shape="landscape" cameraMode="fit-distribution" background="field" paddingPx={20} minSpanPx={100} className="overflow-hidden rounded-xl" />
      </div>
      <div className="flex items-center gap-1.5">
        <h3 className="min-w-0 flex-1 truncate font-Manrope text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{PLAY.title}</h3>
        <button type="button" className="rounded-md p-1" style={{ color: "var(--adm-text2)" }} aria-label="More actions"><FiMoreHorizontal className="text-sm" /></button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {PLAY.tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px]" style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}>
            <FiCircle className="text-[6px]" />{tag}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--adm-muted)" }}>
          <FiCircle className="text-[6px]" /><span>{PLAY.updated}</span><span>by {PLAY.creator}</span>
        </span>
        <button type="button" className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ color: "var(--adm-text2)" }}>Edit</button>
      </div>
    </div>
  );
}

/**
 * Cards: types, anatomy, and states. Live admin cards, people/team cards, and
 * the real play preview card.
 *
 * @returns {JSX.Element}
 */
export default function CardsSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Components"
        title="Cards"
        lead="Cards group related content on a layered surface. Card is the base; product cards (play, user, team, metric) layer specific anatomy on top. Keep density consistent and reserve hover/elevation for clickable cards."
      />

      <DSGroup title="Base card" status="live">
        <div className="grid gap-4 md:grid-cols-3">
          <Card><p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Basic card</p><p className="mt-2 text-xs" style={{ color: "var(--adm-text3)" }}>Surface + soft border + padding.</p></Card>
          <Card className="cursor-pointer transition hover:-translate-y-0.5"><p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Clickable card</p><p className="mt-2 text-xs" style={{ color: "var(--adm-text3)" }}>Lifts on hover.</p></Card>
          <Card style={{ borderColor: "color-mix(in srgb, var(--adm-accent) 40%, transparent)", boxShadow: "0 0 0 1px var(--adm-accent-dim)" }}><p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Selected card</p><p className="mt-2 text-xs" style={{ color: "var(--adm-text3)" }}>Accent border + glow.</p></Card>
        </div>
      </DSGroup>

      <DSGroup title="People & team cards" status="live">
        <div className="grid gap-4 md:grid-cols-2">
          {USERS.map((user) => (
            <div key={user.name} className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
              <div className="flex items-center gap-3">
                <Avatar name={user.name} size="lg" status={user.status} />
                <div><p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{user.name}</p><p className="text-xs" style={{ color: "var(--adm-text3)" }}>{user.role} · {user.team}</p></div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Badge status="resolved">Verified</Badge>
                <Button variant="ghost" size="sm">View profile</Button>
              </div>
            </div>
          ))}
          {TEAMS.map((team) => (
            <div key={team.name} className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{team.name}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--adm-text3)" }}>{team.sport}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span style={{ color: "var(--adm-text2)" }}>{team.members} members</span>
                <span style={{ color: "var(--adm-accent)" }}>{team.plays} plays</span>
              </div>
            </div>
          ))}
        </div>
      </DSGroup>

      <DSGroup title="Play card" status="live" description="The real PlayPreviewCard with an auto-playing thumbnail on hover.">
        <PlayCardPreview />
      </DSGroup>

      <DSGroup title="Card anatomy">
        <DSAnatomy parts={[
          { name: "Container", role: "Layered surface, soft border, consistent radius." },
          { name: "Media / preview", role: "Optional image or play preview at the top." },
          { name: "Title row", role: "Truncating title + overflow menu." },
          { name: "Metadata / tags", role: "Small chips and muted timestamps." },
          { name: "Footer / actions", role: "Quiet, right-aligned actions." },
        ]} />
      </DSGroup>

      <DSGroup title="Card types & states" description="The wider card catalog from the checklist.">
        <DSChecklist
          columns={3}
          items={[
            { label: "Metric / stat / KPI card", note: "Analytics KpiStrip.", status: "live" },
            { label: "Settings card", note: "Settings page rows.", status: "inApp" },
            { label: "Integration card", status: "spec" },
            { label: "Pricing / plan card", status: "spec" },
            { label: "Notification card", status: "inApp" },
            { label: "File / upload card", status: "spec" },
            { label: "Loading / empty / error card", status: "live" },
            { label: "Featured / new state", status: "spec" },
            { label: "Multi-selected state", status: "spec" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
