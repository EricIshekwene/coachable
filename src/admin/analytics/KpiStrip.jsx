import KpiCard from "./KpiCard";

/**
 * Responsive KPI bento grid for the analytics overview.
 *
 * @param {{
 *   summary: Object,
 *   onCardClick?: (key: string) => void,
 * }} props
 */
export default function KpiStrip({ summary, onCardClick }) {
  if (!summary) return null;

  function click(key) {
    if (!key) return undefined;
    return onCardClick ? () => onCardClick(key) : undefined;
  }

  const s = summary;
  const tiles = [
    {
      key: "users",
      sectionKey: "users",
      label: "Total Users",
      value: s.totalUsers?.toLocaleString(),
      delta: s.newUsers,
      deltaLabel: "new this period",
      featured: true,
      className: "sm:col-span-2 lg:col-span-2",
    },
    {
      key: "teams",
      label: "Teams",
      value: s.totalTeams?.toLocaleString(),
      delta: s.newTeams,
      deltaLabel: "new this period",
    },
    {
      key: "active",
      label: "Active Teams",
      value: `${s.activeTeamsPct ?? 0}%`,
      delta: null,
      footer: `${s.totalTeams?.toLocaleString() ?? 0} teams tracked`,
    },
    {
      key: "plays",
      label: "Total Plays",
      value: s.totalPlays?.toLocaleString(),
      delta: s.newPlays,
      deltaLabel: "created this period",
      featured: true,
      className: "sm:col-span-2 lg:col-span-2",
    },
    {
      key: "errors",
      sectionKey: "errors",
      label: "Errors",
      value: s.openErrors?.toLocaleString(),
      delta: null,
      accent: s.openErrors > 0 ? "danger" : null,
      footer: s.openErrors > 0 ? "Needs review" : "All clear",
    },
    {
      key: "issues",
      sectionKey: "issues",
      label: "Open Issues",
      value: s.openIssues?.toLocaleString(),
      delta: null,
      accent: s.openIssues > 0 ? "warn" : null,
      footer: s.openIssues > 0 ? "Needs follow-up" : "Nothing open",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <KpiCard
          key={tile.key}
          label={tile.label}
          value={tile.value}
          delta={tile.delta}
          deltaLabel={tile.deltaLabel}
          featured={tile.featured}
          accent={tile.accent}
          footer={tile.footer}
          className={tile.className}
          onClick={click(tile.sectionKey)}
        />
      ))}
    </div>
  );
}
