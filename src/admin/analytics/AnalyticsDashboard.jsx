import { useState } from "react";
import AdminBtn from "../components/AdminBtn";
import AdminSpinner from "../components/AdminSpinner";
import KpiStrip from "./KpiStrip";
import OnboardingFunnel from "./OnboardingFunnel";
import PlayActivityChart from "./PlayActivityChart";
import SportMixChart from "./SportMixChart";
import UserGrowthChart from "./UserGrowthChart";
import { useDashboardAnalytics } from "./useDashboardAnalytics";

const PERIODS = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "all", label: "All" },
];

const PANEL_TONES = {
  orange: {
    border: "1px solid rgba(255, 122, 24, 0.18)",
    badgeBg: "rgba(255, 122, 24, 0.12)",
    badgeBorder: "rgba(255, 122, 24, 0.22)",
    badgeColor: "var(--adm-accent)",
    glow: "rgba(255, 122, 24, 0.16)",
    background: "linear-gradient(180deg, rgba(255, 122, 24, 0.05) 0%, var(--adm-surface) 24%, var(--adm-surface2) 100%)",
  },
  blue: {
    border: "1px solid rgba(59, 130, 246, 0.18)",
    badgeBg: "rgba(59, 130, 246, 0.12)",
    badgeBorder: "rgba(59, 130, 246, 0.22)",
    badgeColor: "var(--adm-color-blue)",
    glow: "rgba(59, 130, 246, 0.16)",
    background: "linear-gradient(180deg, rgba(59, 130, 246, 0.05) 0%, var(--adm-surface) 24%, var(--adm-surface2) 100%)",
  },
  green: {
    border: "1px solid rgba(74, 222, 128, 0.18)",
    badgeBg: "rgba(74, 222, 128, 0.12)",
    badgeBorder: "rgba(74, 222, 128, 0.2)",
    badgeColor: "var(--adm-success)",
    glow: "rgba(74, 222, 128, 0.16)",
    background: "linear-gradient(180deg, rgba(74, 222, 128, 0.05) 0%, var(--adm-surface) 24%, var(--adm-surface2) 100%)",
  },
  amber: {
    border: "1px solid rgba(251, 191, 36, 0.18)",
    badgeBg: "rgba(251, 191, 36, 0.12)",
    badgeBorder: "rgba(251, 191, 36, 0.2)",
    badgeColor: "var(--adm-warning)",
    glow: "rgba(251, 191, 36, 0.16)",
    background: "linear-gradient(180deg, rgba(251, 191, 36, 0.05) 0%, var(--adm-surface) 24%, var(--adm-surface2) 100%)",
  },
};

function formatSportName(sport) {
  return (sport || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTopSport(sportMix = []) {
  if (!sportMix.length) return null;

  const leader = sportMix.reduce((best, item) => {
    if (!best || (item?.teams ?? 0) > (best?.teams ?? 0)) return item;
    return best;
  }, null);

  if (!leader) return null;
  return {
    name: formatSportName(leader.sport),
    teams: leader.teams ?? 0,
  };
}

function getOnboardingCompletion(funnel) {
  const registered = funnel?.registered ?? 0;
  if (!registered) return 0;
  return Math.round(((funnel?.has_plays ?? 0) / registered) * 100);
}

function AnalyticsPanel({
  title,
  subtitle,
  eyebrow,
  stat,
  statLabel,
  tone = "orange",
  className = "",
  children,
}) {
  const palette = PANEL_TONES[tone] ?? PANEL_TONES.orange;

  return (
    <section
      className={`relative overflow-hidden rounded-[var(--adm-radius-lg)] p-5 sm:p-6 ${className}`}
      style={{
        background: palette.background,
        border: palette.border,
        boxShadow: "var(--adm-shadow-sm)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -72,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: 999,
          background: palette.glow,
          filter: "blur(18px)",
        }}
      />

      <div className="relative flex h-full flex-col">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            {eyebrow && (
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: "var(--adm-muted)" }}
              >
                {eyebrow}
              </p>
            )}
            <h3
              className="mt-2 font-Manrope text-lg font-semibold"
              style={{ color: "var(--adm-text)" }}
            >
              {title}
            </h3>
            {subtitle && (
              <p className="mt-1 text-sm" style={{ color: "var(--adm-text2)" }}>
                {subtitle}
              </p>
            )}
          </div>

          {stat != null && (
            <div
              className="inline-flex shrink-0 flex-col rounded-full px-4 py-2.5"
              style={{
                alignSelf: "flex-start",
                backgroundColor: palette.badgeBg,
                border: `1px solid ${palette.badgeBorder}`,
              }}
            >
              {statLabel && (
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: "var(--adm-muted)" }}
                >
                  {statLabel}
                </span>
              )}
              <span
                className="text-base font-semibold"
                style={{ color: palette.badgeColor }}
              >
                {stat}
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 flex-1">{children}</div>
      </div>
    </section>
  );
}

/**
 * Full analytics dashboard rendered at the top of the admin page.
 *
 * @param {{ session: string }} props
 */
export default function AnalyticsDashboard({ session }) {
  const [period, setPeriod] = useState("30d");
  const { data, loading, error, refetch } = useDashboardAnalytics({ session, period });
  const summary = data?.summary ?? null;
  const topSport = getTopSport(data?.sportMix ?? []);
  const trackedSports = data?.sportMix?.length ?? 0;
  const onboardingCompletion = getOnboardingCompletion(data?.onboardingFunnel);

  function handleCardClick(key) {
    if (typeof document === "undefined") return;

    const sectionId = {
      users: "users",
      errors: "errors",
      issues: "reported-issues",
    }[key];

    if (!sectionId) return;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-[var(--adm-radius-lg)] px-4 py-4 sm:px-5"
        style={{
          background: "linear-gradient(135deg, rgba(255, 122, 24, 0.08) 0%, var(--adm-surface) 28%, var(--adm-surface2) 100%)",
          border: "1px solid var(--adm-border)",
          boxShadow: "var(--adm-shadow-sm)",
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--adm-muted)" }}
            >
              Analytics cockpit
            </p>
            <h3
              className="mt-2 font-Manrope text-lg font-semibold"
              style={{ color: "var(--adm-text)" }}
            >
              Platform pulse
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--adm-text2)" }}>
              Track acquisition, activation, and usage trends in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs" style={{ color: "var(--adm-muted)" }}>
              Period
            </span>
            {PERIODS.map((p) => (
              <AdminBtn
                key={p.key}
                variant={period === p.key ? "primary" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </AdminBtn>
            ))}
            <div
              className="mx-1 hidden h-6 w-px sm:block"
              style={{ backgroundColor: "var(--adm-border2)" }}
            />
            <AdminBtn
              variant="secondary"
              size="sm"
              onClick={refetch}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </AdminBtn>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="rounded-[var(--adm-radius)] px-4 py-3 text-sm"
          style={{
            color: "var(--adm-danger)",
            backgroundColor: "var(--adm-danger-dim)",
            border: "1px solid rgba(239, 68, 68, 0.16)",
          }}
        >
          Failed to load analytics: {error}
        </div>
      )}

      {loading && !data ? (
        <div
          className="flex justify-center rounded-[var(--adm-radius-lg)] px-6 py-12"
          style={{
            backgroundColor: "var(--adm-surface)",
            border: "1px solid var(--adm-border)",
          }}
        >
          <AdminSpinner />
        </div>
      ) : (
        <>
          <KpiStrip summary={summary} onCardClick={handleCardClick} />

          <div
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-12"
            style={{ gridAutoRows: "minmax(220px, auto)" }}
          >
            <AnalyticsPanel
              className="md:col-span-2 xl:col-span-7 xl:row-span-2"
              tone="orange"
              eyebrow="Acquisition"
              title="New Users"
              subtitle="Registrations over time across the selected period."
              stat={summary?.totalUsers?.toLocaleString() ?? "0"}
              statLabel="Total users"
            >
              <UserGrowthChart data={data?.userGrowth ?? null} height={260} />
            </AnalyticsPanel>

            <AnalyticsPanel
              className="md:col-span-2 xl:col-span-5 xl:row-span-2"
              tone="green"
              eyebrow="Conversion"
              title="Onboarding Funnel"
              subtitle="See how many registered users make it all the way to creating plays."
              stat={`${onboardingCompletion}%`}
              statLabel="Reached plays"
            >
              <OnboardingFunnel data={data?.onboardingFunnel ?? null} height={260} />
            </AnalyticsPanel>

            <AnalyticsPanel
              className="md:col-span-2 xl:col-span-8"
              tone="blue"
              eyebrow="Engagement"
              title="Play Activity"
              subtitle="Daily play creation and edits, grouped to show how busy the product is."
              stat={`+${summary?.newPlays ?? 0}`}
              statLabel="New plays"
            >
              <PlayActivityChart data={data?.playActivity ?? null} height={220} />
            </AnalyticsPanel>

            <AnalyticsPanel
              className="md:col-span-2 xl:col-span-4"
              tone="amber"
              eyebrow="Coverage"
              title="Sport Mix"
              subtitle={topSport ? `Largest segment: ${topSport.name} (${topSport.teams} teams)` : "Team distribution by sport."}
              stat={trackedSports}
              statLabel="Sports tracked"
            >
              <SportMixChart data={data?.sportMix ?? null} height={220} />
            </AnalyticsPanel>
          </div>
        </>
      )}
    </div>
  );
}
