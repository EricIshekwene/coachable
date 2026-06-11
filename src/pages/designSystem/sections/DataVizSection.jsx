import { FiPlus } from "react-icons/fi";
import { AdminEmptyState, AdminBtn, AdminSpinner } from "../../../admin/components";
import KpiStrip from "../../../admin/analytics/KpiStrip";
import UserGrowthChart from "../../../admin/analytics/UserGrowthChart";
import PlayActivityChart from "../../../admin/analytics/PlayActivityChart";
import SportMixChart from "../../../admin/analytics/SportMixChart";
import OnboardingFunnel from "../../../admin/analytics/OnboardingFunnel";
import { DSPageHeading, DSGroup, DSChecklist } from "../dsPrimitives";

const KPI_SUMMARY = { totalUsers: 1284, newUsers: 86, totalTeams: 214, newTeams: 12, activeTeamsPct: 71, totalPlays: 6418, newPlays: 173, openErrors: 3, openIssues: 14 };
const USER_GROWTH = [
  { date: "2026-05-15", count: 18 }, { date: "2026-05-16", count: 22 }, { date: "2026-05-17", count: 21 },
  { date: "2026-05-18", count: 28 }, { date: "2026-05-19", count: 31 }, { date: "2026-05-20", count: 26 }, { date: "2026-05-21", count: 34 },
];
const PLAY_ACTIVITY = [
  { date: "2026-05-15", created: 8, updated: 21 }, { date: "2026-05-16", created: 11, updated: 24 }, { date: "2026-05-17", created: 10, updated: 18 },
  { date: "2026-05-18", created: 14, updated: 29 }, { date: "2026-05-19", created: 16, updated: 27 }, { date: "2026-05-20", created: 13, updated: 25 }, { date: "2026-05-21", created: 19, updated: 33 },
];
const SPORT_MIX = [
  { sport: "football", teams: 36 }, { sport: "soccer", teams: 24 }, { sport: "rugby", teams: 18 }, { sport: "basketball", teams: 14 }, { sport: "other", teams: 8 },
];
const FUNNEL = { registered: 1280, email_verified: 940, onboarded: 620, has_team: 370, has_plays: 244 };

const TONES = {
  orange: { border: "1px solid rgba(255,122,24,0.18)", badgeBg: "rgba(255,122,24,0.12)", badgeBorder: "rgba(255,122,24,0.22)", badgeColor: "var(--adm-accent)", glow: "rgba(255,122,24,0.16)", background: "linear-gradient(180deg, rgba(255,122,24,0.05) 0%, var(--adm-surface) 24%, var(--adm-surface2) 100%)" },
  blue: { border: "1px solid rgba(59,130,246,0.18)", badgeBg: "rgba(59,130,246,0.12)", badgeBorder: "rgba(59,130,246,0.22)", badgeColor: "var(--adm-color-blue)", glow: "rgba(59,130,246,0.16)", background: "linear-gradient(180deg, rgba(59,130,246,0.05) 0%, var(--adm-surface) 24%, var(--adm-surface2) 100%)" },
  green: { border: "1px solid rgba(74,222,128,0.18)", badgeBg: "rgba(74,222,128,0.12)", badgeBorder: "rgba(74,222,128,0.2)", badgeColor: "var(--adm-success)", glow: "rgba(74,222,128,0.16)", background: "linear-gradient(180deg, rgba(74,222,128,0.05) 0%, var(--adm-surface) 24%, var(--adm-surface2) 100%)" },
  amber: { border: "1px solid rgba(251,191,36,0.18)", badgeBg: "rgba(251,191,36,0.12)", badgeBorder: "rgba(251,191,36,0.2)", badgeColor: "var(--adm-warning)", glow: "rgba(251,191,36,0.16)", background: "linear-gradient(180deg, rgba(251,191,36,0.05) 0%, var(--adm-surface) 24%, var(--adm-surface2) 100%)" },
};

/**
 * Tinted analytics panel matching the live dashboard module treatment.
 *
 * @param {{ title: string, subtitle?: string, eyebrow?: string, stat?: React.ReactNode, statLabel?: string, tone?: keyof typeof TONES, children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
function Panel({ title, subtitle, eyebrow, stat, statLabel, tone = "orange", children }) {
  const p = TONES[tone] ?? TONES.orange;
  return (
    <section className="relative overflow-hidden rounded-[var(--adm-radius-lg)] p-5 sm:p-6" style={{ background: p.background, border: p.border, boxShadow: "var(--adm-shadow-sm)" }}>
      <span aria-hidden="true" style={{ position: "absolute", top: -72, right: -40, width: 200, height: 200, borderRadius: 999, background: p.glow, filter: "blur(18px)" }} />
      <div className="relative flex h-full flex-col">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--adm-muted)" }}>{eyebrow}</p> : null}
            <h3 className="mt-2 font-Manrope text-lg font-semibold" style={{ color: "var(--adm-text)" }}>{title}</h3>
            {subtitle ? <p className="mt-1 text-sm" style={{ color: "var(--adm-text2)" }}>{subtitle}</p> : null}
          </div>
          {stat != null ? (
            <div className="inline-flex shrink-0 flex-col rounded-full px-4 py-2.5" style={{ alignSelf: "flex-start", backgroundColor: p.badgeBg, border: `1px solid ${p.badgeBorder}` }}>
              {statLabel ? <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--adm-muted)" }}>{statLabel}</span> : null}
              <span className="text-base font-semibold" style={{ color: p.badgeColor }}>{stat}</span>
            </div>
          ) : null}
        </div>
        <div className="mt-5 flex-1">{children}</div>
      </div>
    </section>
  );
}

/**
 * Data visualization: KPI strip and the real dashboard chart components, plus
 * chart-state and chart-type coverage.
 *
 * @returns {JSX.Element}
 */
export default function DataVizSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Components"
        title="Data visualization"
        lead="Charts reuse the live analytics-dashboard components so tooltip, legend, hover, and axis behavior stay identical everywhere. Wrap them in a tinted, color-keyed panel with a single metric badge so they read as dashboard modules, not loose embeds."
      />

      <DSGroup title="KPI strip" status="live" description="The production KpiStrip with real tile sizing, gradients, and density.">
        <KpiStrip summary={KPI_SUMMARY} />
      </DSGroup>

      <DSGroup title="Dashboard chart modules" status="live">
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel tone="orange" eyebrow="Growth" title="New user registrations" subtitle="Area chart treatment matches the dashboard exactly." stat="+18%" statLabel="30d">
            <UserGrowthChart data={USER_GROWTH} height={210} />
          </Panel>
          <Panel tone="blue" eyebrow="Activity" title="Play creation and edits" subtitle="Grouped bars, hover, legend, and tooltip from the real component." stat="173" statLabel="Events">
            <PlayActivityChart data={PLAY_ACTIVITY} height={210} />
          </Panel>
          <Panel tone="green" eyebrow="Segmentation" title="Sport mix" subtitle="Donut colors, legend scale, and tooltip locked to analytics." stat="5" statLabel="Sports">
            <SportMixChart data={SPORT_MIX} height={210} />
          </Panel>
          <Panel tone="amber" eyebrow="Onboarding" title="Activation funnel" subtitle="Horizontal funnel with dashboard label spacing and count treatment." stat="19%" statLabel="Completion">
            <OnboardingFunnel data={FUNNEL} height={210} />
          </Panel>
        </div>
      </DSGroup>

      <DSGroup title="Chart states" status="live">
        <div className="grid gap-4 md:grid-cols-2">
          <Panel tone="amber" eyebrow="Loading state" title="Module loading" subtitle="Containers keep their panel framing while fetching." stat="Syncing" statLabel="Status">
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: "var(--adm-text3)" }}>Refreshing dashboard metrics</p>
              <AdminSpinner size={20} />
            </div>
            <div className="mt-4 flex h-28 items-end gap-2">
              {[42, 76, 58, 88, 54, 64, 40].map((h, i) => <div key={i} className="animate-pulse rounded-t-[8px]" style={{ height: h, flex: 1, backgroundColor: "var(--adm-surface3)" }} />)}
            </div>
          </Panel>
          <Panel tone="blue" eyebrow="Empty state" title="No analytics source" subtitle="Empty modules still render as real panels." stat="0" statLabel="Sources">
            <AdminEmptyState className="py-6" title="Connect an analytics source" subtitle="Use the standard empty-state treatment instead of leaving charts blank." action={<AdminBtn variant="secondary" size="sm"><FiPlus /> Connect source</AdminBtn>} />
          </Panel>
        </div>
      </DSGroup>

      <DSGroup title="Chart catalog">
        <DSChecklist
          columns={3}
          items={[
            { label: "Area chart", status: "live" },
            { label: "Grouped bar chart", status: "live" },
            { label: "Donut / pie chart", status: "live" },
            { label: "Funnel chart", status: "live" },
            { label: "Line chart", status: "spec" },
            { label: "Heatmap / comparison", status: "planned" },
            { label: "Legend / chart tooltip", status: "live" },
            { label: "Chart empty / loading / error", status: "live" },
            { label: "Sparkline / mini-trend", status: "spec" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
