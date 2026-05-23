import { useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiArrowUpRight,
  FiBell,
  FiCheckCircle,
  FiCommand,
  FiCircle,
  FiFilter,
  FiGrid,
  FiLayers,
  FiMove,
  FiMoreHorizontal,
  FiMoon,
  FiMousePointer,
  FiPause,
  FiPlay,
  FiPlus,
  FiRotateCcw,
  FiRotateCw,
  FiSearch,
  FiSettings,
  FiShield,
  FiSun,
  FiTarget,
  FiTool,
  FiTrash2,
  FiUserPlus,
  FiZap,
} from "react-icons/fi";
import { PiPenNib, PiShapesFill } from "react-icons/pi";
import { adminPath } from "../admin/adminNav";
import { useAdmin } from "../admin/AdminContext";
import OnboardingFunnel from "../admin/analytics/OnboardingFunnel";
import KpiStrip from "../admin/analytics/KpiStrip";
import PlayActivityChart from "../admin/analytics/PlayActivityChart";
import SportMixChart from "../admin/analytics/SportMixChart";
import UserGrowthChart from "../admin/analytics/UserGrowthChart";
import AnimationDrawingTools from "../components/AnimationDrawingTools";
import ControlPill from "../components/controlPill/ControlPill";
import MobileEditorBar from "../components/MobileEditorBar";
import DrawToolsPill from "../components/DrawToolsPill";
import AddPlayerSection from "../components/sidebar/AddPlayerSection";
import HistoryActionsSection from "../components/sidebar/HistoryActionsSection";
import PenToolSection from "../components/sidebar/PenToolSection";
import PlayerColorSection, { PLAYER_COLORS } from "../components/sidebar/PlayerColorSection";
import PrefabsSection from "../components/sidebar/PrefabsSection";
import PresetSection from "../components/sidebar/PresetSection";
import SelectToolSection from "../components/sidebar/SelectToolSection";
import PlayPreviewCard from "../components/PlayPreviewCard";
import { Tooltip as SlateTooltip } from "../components/subcomponents/Popovers";
import {
  AdminAlert,
  AdminAvatar,
  AdminBadge,
  AdminBtn,
  AdminCard,
  AdminCheckbox,
  AdminEmptyState,
  AdminHeader,
  AdminInput,
  AdminModal,
  AdminPage,
  AdminRadioGroup,
  AdminSection,
  AdminSelect,
  AdminShell,
  AdminSpinner,
  AdminTextarea,
  AdminToggle,
} from "../admin/components";
import { prefabToPreviewPlayData } from "../utils/sportPrefabPresets";

const FOUNDATION_RULES = [
  "Use one border radius scale across buttons, cards, fields, and overlays.",
  "Keep button heights and input heights aligned so forms feel assembled instead of mixed.",
  "Reserve accent orange for primary actions, active selection, and important counts.",
  "Prefer soft borders and layered surfaces over heavy outlines.",
];

const COLOR_SWATCHES = [
  { label: "Accent", token: "--adm-accent" },
  { label: "Surface", token: "--adm-surface" },
  { label: "Surface 2", token: "--adm-surface2" },
  { label: "Text", token: "--adm-text" },
  { label: "Muted", token: "--adm-text3" },
  { label: "Success", token: "--adm-success" },
  { label: "Warning", token: "--adm-warning" },
  { label: "Danger", token: "--adm-danger" },
];

const TABLE_ROWS = [
  { play: "Nickel Pressure", sport: "Football", folder: "3rd Down", status: "Published", updated: "12 min ago", owner: "Eric I." },
  { play: "Wide Channel Trigger", sport: "Soccer", folder: "Pressing", status: "Draft", updated: "43 min ago", owner: "Sara P." },
  { play: "5-1 Exit Sequence", sport: "Rugby", folder: "Lineout", status: "Review", updated: "2 hours ago", owner: "Maya J." },
  { play: "Box-and-1 Rotation", sport: "Basketball", folder: "Half Court", status: "Archived", updated: "Yesterday", owner: "Jon B." },
];

const USERS = [
  { name: "Maya Jordan", role: "Head Coach", team: "Austin Arrows", status: "online" },
  { name: "Nick Porter", role: "Assistant Coach", team: "Boston Blaze", status: "busy" },
  { name: "Lena Cho", role: "Video Analyst", team: "Seattle Tide", status: "offline" },
];

const TEAMS = [
  { name: "Austin Arrows", sport: "Football", members: 29, plays: 74, status: "Active" },
  { name: "Seattle Tide", sport: "Soccer", members: 22, plays: 41, status: "Reviewing" },
];

const DIRECTORY_USERS = [
  {
    id: "u1",
    name: "Maya Jordan",
    email: "maya@austinarrows.com",
    memberships: [
      { teamName: "Austin Arrows", role: "owner" },
      { teamName: "U18 Selects", role: "coach" },
    ],
    playsCreated: 42,
    joined: "May 04, 2026",
    emailVerified: true,
    onboarded: true,
    betaTester: false,
  },
  {
    id: "u2",
    name: "Nick Porter",
    email: "nick@bostonblaze.com",
    memberships: [
      { teamName: "Boston Blaze", role: "assistant_coach" },
    ],
    playsCreated: 17,
    joined: "Apr 19, 2026",
    emailVerified: true,
    onboarded: false,
    betaTester: true,
  },
  {
    id: "u3",
    name: "Lena Cho",
    email: "lena@seattletide.com",
    memberships: [],
    playsCreated: 6,
    joined: "Mar 28, 2026",
    emailVerified: false,
    onboarded: false,
    betaTester: false,
  },
];

const PLAYS = [
  {
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
  },
  {
    title: "Diamond Counter Press",
    tags: ["transition", "press"],
    updated: "1h ago",
    creator: "Sara P.",
    playData: prefabToPreviewPlayData(
      {
        players: [
          { dx: -112, dy: 12, number: "6", color: "#ef4444" },
          { dx: -36, dy: -28, number: "8", color: "#ef4444" },
          { dx: 14, dy: 26, number: "10", color: "#ef4444" },
          { dx: 92, dy: -12, number: "4", color: "#3b82f6" },
          { dx: 144, dy: 42, number: "2", color: "#3b82f6" },
        ],
        objects: [{ dx: 34, dy: -6, objectType: "ball" }],
      },
      "soccer"
    ),
  },
];

const KPI_SUMMARY = {
  totalUsers: 1284,
  newUsers: 86,
  totalTeams: 214,
  newTeams: 12,
  activeTeamsPct: 71,
  totalPlays: 6418,
  newPlays: 173,
  openErrors: 3,
  openIssues: 14,
};

const USER_GROWTH_SERIES = [
  { date: "2026-05-15", count: 18 },
  { date: "2026-05-16", count: 22 },
  { date: "2026-05-17", count: 21 },
  { date: "2026-05-18", count: 28 },
  { date: "2026-05-19", count: 31 },
  { date: "2026-05-20", count: 26 },
  { date: "2026-05-21", count: 34 },
];

const PLAY_ACTIVITY_SERIES = [
  { date: "2026-05-15", created: 8, updated: 21 },
  { date: "2026-05-16", created: 11, updated: 24 },
  { date: "2026-05-17", created: 10, updated: 18 },
  { date: "2026-05-18", created: 14, updated: 29 },
  { date: "2026-05-19", created: 16, updated: 27 },
  { date: "2026-05-20", created: 13, updated: 25 },
  { date: "2026-05-21", created: 19, updated: 33 },
];

const SPORT_MIX_SERIES = [
  { sport: "football", teams: 36 },
  { sport: "soccer", teams: 24 },
  { sport: "rugby", teams: 18 },
  { sport: "basketball", teams: 14 },
  { sport: "other", teams: 8 },
];

const ONBOARDING_FUNNEL_DATA = {
  registered: 1280,
  email_verified: 940,
  onboarded: 620,
  has_team: 370,
  has_plays: 244,
};

const ANALYTICS_PANEL_TONES = {
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

const PLAY_CARD_PANEL_STYLE = {
  backgroundColor: "var(--adm-surface)",
  border: "1px solid var(--adm-border)",
  boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
};

const ADMIN_MENU_STYLE = {
  backgroundColor: "var(--adm-surface-elevated)",
  border: "1px solid var(--adm-border2)",
  boxShadow: "var(--adm-shadow)",
};

function getInitials(name = "", email = "") {
  const source = String(name || email).trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function formatRoleLabel(role = "") {
  return String(role)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const noop = () => {};
const NOOP_SEEK = () => {};

function DemoTile({ title, description, children, className = "" }) {
  return (
    <AdminCard className={className}>
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
          {title}
        </h3>
        {description ? (
          <p className="text-xs leading-5" style={{ color: "var(--adm-text3)" }}>
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </AdminCard>
  );
}

function MetaPill({ children }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold"
      style={{
        backgroundColor: "var(--adm-surface2)",
        border: "1px solid var(--adm-border)",
        color: "var(--adm-text2)",
      }}
    >
      {children}
    </span>
  );
}

function ThemeModeSwitch({ theme, onChange }) {
  const modes = [
    { key: "light", label: "Light", icon: FiSun },
    { key: "dark", label: "Dark", icon: FiMoon },
  ];

  return (
    <div
      className="inline-flex items-center gap-1 rounded-[var(--adm-radius-md)] p-1"
      style={{
        backgroundColor: "var(--adm-surface2)",
        border: "1px solid var(--adm-border)",
      }}
    >
      {modes.map(({ key, label, icon: Icon }) => {
        const active = theme === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className="inline-flex items-center gap-2 rounded-[var(--adm-radius-md)] px-3 py-2 text-xs font-semibold transition"
            style={active
              ? {
                  backgroundColor: "var(--adm-surface-elevated)",
                  color: "var(--adm-text)",
                  boxShadow: "var(--adm-shadow-sm)",
                }
              : {
                  color: "var(--adm-text3)",
                }}
            aria-pressed={active}
          >
            <Icon className="text-sm" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function StaticFieldState({ label, value, tone = "default", multiline = false }) {
  const styles = {
    default: {
      backgroundColor: "var(--adm-surface)",
      border: "1px solid var(--adm-border2)",
      color: "var(--adm-text3)",
      boxShadow: "none",
    },
    focus: {
      backgroundColor: "var(--adm-surface)",
      border: "1px solid color-mix(in srgb, var(--adm-accent) 82%, white 0%)",
      color: "var(--adm-text)",
      boxShadow: "0 0 0 4px color-mix(in srgb, var(--adm-accent-dim) 95%, transparent)",
    },
    disabled: {
      backgroundColor: "var(--adm-surface2)",
      border: "1px solid var(--adm-border)",
      color: "var(--adm-text3)",
      boxShadow: "none",
    },
    error: {
      backgroundColor: "var(--adm-surface)",
      border: "1px solid color-mix(in srgb, var(--adm-danger) 46%, var(--adm-border2))",
      color: "var(--adm-text)",
      boxShadow: "0 0 0 4px color-mix(in srgb, var(--adm-danger-dim) 95%, transparent)",
    },
  }[tone];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-text3)" }}>
        {label}
      </span>
      <div
        className={`rounded-[var(--adm-radius-md)] px-3.5 py-2.5 text-sm ${multiline ? "min-h-[96px]" : "min-h-11"} flex items-start`}
        style={styles}
      >
        {value}
      </div>
    </div>
  );
}

function SidebarMiniPreview() {
  const items = ["Dashboard", "Plays", "Users", "Design Rules", "Errors"];

  return (
    <div
      className="grid min-h-[270px] overflow-hidden rounded-[var(--adm-radius-lg)] md:grid-cols-[190px_minmax(0,1fr)]"
      style={{ border: "1px solid var(--adm-border)" }}
    >
      <aside
        className="flex flex-col gap-2 p-3"
        style={{
          background: "linear-gradient(180deg, var(--adm-surface) 0%, color-mix(in srgb, var(--adm-surface2) 62%, var(--adm-surface)) 100%)",
          borderRight: "1px solid var(--adm-border)",
        }}
      >
        <div className="flex items-center gap-2 rounded-[var(--adm-radius)] px-3 py-2.5" style={{ backgroundColor: "var(--adm-surface2)" }}>
          <FiGrid className="text-sm" style={{ color: "var(--adm-accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Coachable Admin</span>
        </div>
        {items.map((item, index) => {
          const active = index === 3;
          return (
            <div
              key={item}
              className="flex items-center gap-2 rounded-[var(--adm-radius-md)] px-3 py-2 text-sm font-semibold"
              style={active
                ? {
                    backgroundColor: "color-mix(in srgb, var(--adm-accent-dim) 85%, var(--adm-surface2))",
                    color: "var(--adm-accent)",
                    boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--adm-accent) 22%, transparent)",
                  }
                : { color: "var(--adm-text2)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? "var(--adm-accent)" : "var(--adm-border2)" }} />
              {item}
            </div>
          );
        })}
      </aside>

      <div className="flex flex-col gap-4 p-4" style={{ backgroundColor: "var(--adm-bg)" }}>
        <div
          className="flex items-center justify-between rounded-[var(--adm-radius)] px-4 py-3"
          style={{ backgroundColor: "var(--adm-surface-elevated)", border: "1px solid var(--adm-border)" }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-text3)" }}>Pinned standard</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Design Rules</p>
          </div>
          <AdminBadge status="info">Reference</AdminBadge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-text3)" }}>Spacing</p>
            <p className="mt-2 text-sm font-semibold" style={{ color: "var(--adm-text)" }}>8 / 12 / 16 / 24 / 32</p>
          </div>
          <div className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-text3)" }}>Primary action</p>
            <p className="mt-2 text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Accent only when intent is clear</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPreviewPanel({
  title,
  subtitle,
  eyebrow,
  stat,
  statLabel,
  tone = "orange",
  children,
}) {
  const palette = ANALYTICS_PANEL_TONES[tone] ?? ANALYTICS_PANEL_TONES.orange;

  return (
    <section
      className="relative overflow-hidden rounded-[var(--adm-radius-lg)] p-5 sm:p-6"
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
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--adm-muted)" }}>
                {eyebrow}
              </p>
            ) : null}
            <h3 className="mt-2 font-Manrope text-lg font-semibold" style={{ color: "var(--adm-text)" }}>
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-1 text-sm" style={{ color: "var(--adm-text2)" }}>
                {subtitle}
              </p>
            ) : null}
          </div>

          {stat != null ? (
            <div
              className="inline-flex shrink-0 flex-col rounded-full px-4 py-2.5"
              style={{
                alignSelf: "flex-start",
                backgroundColor: palette.badgeBg,
                border: `1px solid ${palette.badgeBorder}`,
              }}
            >
              {statLabel ? (
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--adm-muted)" }}>
                  {statLabel}
                </span>
              ) : null}
              <span className="text-base font-semibold" style={{ color: palette.badgeColor }}>
                {stat}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex-1">{children}</div>
      </div>
    </section>
  );
}

function UsersDirectoryPreview() {
  return (
    <AdminCard className="overflow-hidden" padding={false}>
      <div
        className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderBottom: "1px solid var(--adm-border)" }}
      >
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <AdminInput placeholder="Search by name, email, or team" className="w-full" />
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--adm-muted)" }}>
          <span>{DIRECTORY_USERS.length}</span>
          <span>users</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] table-fixed border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="w-[28%] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)", borderBottom: "1px solid var(--adm-border)" }}>User</th>
              <th className="w-[24%] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)", borderBottom: "1px solid var(--adm-border)" }}>Email</th>
              <th className="w-[24%] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)", borderBottom: "1px solid var(--adm-border)" }}>Teams</th>
              <th className="w-[10%] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)", borderBottom: "1px solid var(--adm-border)" }}>Plays</th>
              <th className="w-[14%] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)", borderBottom: "1px solid var(--adm-border)" }}>Joined</th>
              <th className="w-[14%] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)", borderBottom: "1px solid var(--adm-border)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {DIRECTORY_USERS.map((user) => (
              <tr key={user.id}>
                <td className="px-5 py-4 align-top" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                      style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}
                    >
                      {getInitials(user.name, user.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <button type="button" className="block w-full truncate text-left text-sm font-semibold transition-opacity hover:opacity-80" style={{ color: "var(--adm-text)" }}>
                        {user.name}
                      </button>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <AdminBadge status={user.emailVerified ? "resolved" : undefined}>
                          {user.emailVerified ? "Verified" : "Unverified"}
                        </AdminBadge>
                        {!user.onboarded ? <AdminBadge status="warning">Needs onboarding</AdminBadge> : null}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 align-top text-xs" style={{ color: "var(--adm-text2)", borderBottom: "1px solid var(--adm-border)" }}>
                  <div className="break-all">{user.email}</div>
                </td>
                <td className="px-5 py-4 align-top" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                  {user.memberships.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {user.memberships.slice(0, 2).map((membership) => (
                        <span
                          key={`${user.id}-${membership.teamName}-${membership.role}`}
                          className="inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[10px] font-semibold"
                          style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}
                        >
                          <span className="truncate">{membership.teamName}</span>
                          <span className="ml-1 shrink-0" style={{ color: "var(--adm-muted)" }}>
                            {formatRoleLabel(membership.role)}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--adm-muted)" }}>No teams</span>
                  )}
                </td>
                <td className="px-5 py-4 align-top" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                  <span
                    className="inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}
                  >
                    {user.playsCreated}
                  </span>
                </td>
                <td className="px-5 py-4 align-top text-xs" style={{ color: "var(--adm-text2)", borderBottom: "1px solid var(--adm-border)" }}>
                  {user.joined}
                </td>
                <td className="px-5 py-4 align-top" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                  <div className="flex flex-col items-start gap-2">
                    <AdminBadge status={user.betaTester ? "warning" : undefined}>
                      {user.betaTester ? "Beta tester" : "Standard"}
                    </AdminBadge>
                    <button
                      type="button"
                      className="rounded-md border px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-85"
                      style={{ borderColor: "var(--adm-border2)", color: "var(--adm-text2)" }}
                    >
                      {user.betaTester ? "Remove beta" : "Make beta"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}

function PlatformPlayCardPreview({ play }) {
  return (
    <div
      className="group relative flex max-w-[320px] flex-col rounded-xl border p-5 transition"
      style={PLAY_CARD_PANEL_STYLE}
    >
      <div className="relative mb-4 aspect-[16/10] w-full overflow-hidden rounded-xl" style={{ border: "1px solid var(--adm-border)" }}>
        <PlayPreviewCard
          playData={play.playData}
          autoplay="hover"
          shape="landscape"
          cameraMode="fit-distribution"
          background="field"
          paddingPx={20}
          minSpanPx={100}
          className="overflow-hidden rounded-xl"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <h3 className="min-w-0 flex-1 truncate font-Manrope text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
          {play.title}
        </h3>
        <button
          type="button"
          className="rounded-md p-1 opacity-100 transition hover:opacity-80 md:opacity-0 md:group-hover:opacity-100"
          style={{ color: "var(--adm-text2)" }}
          aria-label={`More actions for ${play.title}`}
        >
          <FiMoreHorizontal className="text-sm" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {play.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px]"
            style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}
          >
            <FiCircle className="text-[6px]" />
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--adm-muted)" }}>
          <FiCircle className="text-[6px]" />
          <span>{play.updated}</span>
          <span>by {play.creator}</span>
        </span>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition hover:opacity-80"
          style={{ color: "var(--adm-text2)" }}
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function AppToastStack({ items }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-[#101317] p-4">
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.title} className="flex justify-center">
            <div className="flex items-center gap-2 rounded-lg border border-BrandGray2/20 bg-BrandBlack px-4 py-3 shadow-xl">
              <div className="h-1 w-1 rounded-full bg-BrandOrange" />
              <p className="text-sm text-BrandText">{item.title}: {item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlateReferenceCard({ title, description, children, className = "" }) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 backdrop-blur-sm ${className}`}
    >
      <div className="mb-4">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-white/55">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SlateSidebarRowsPreview() {
  const selectButtonRef = useRef(null);
  const penButtonRef = useRef(null);
  const addPlayerButtonRef = useRef(null);
  const playerButtonRef = useRef(null);
  const prefabsButtonRef = useRef(null);
  const presetButtonRef = useRef(null);

  const samplePrefabs = [
    { id: "lineout", label: "Lineout", mode: "offense", icon: <FiGrid className="text-BrandOrange text-xl" /> },
    { id: "kickoff", label: "Kickoff", mode: "defense", icon: <FiLayers className="text-BrandOrange text-xl" /> },
  ];

  return (
    <div className="rounded-[24px] border border-white/8 bg-[#121212] p-4 sm:p-5">
      <div className="flex flex-wrap gap-3">
        <div className="w-full min-w-0 sm:w-[236px]">
          <SelectToolSection
            wide
            selectToolType="select"
            isSelected
            openPopover={null}
            hoveredTooltip={null}
            anchorRef={selectButtonRef}
            onToolSelect={noop}
            onSelectSubTool={noop}
            onPopoverToggle={noop}
            onPopoverClose={noop}
            onHoverTooltip={noop}
          />
        </div>
        <div className="w-full min-w-0 sm:w-[236px]">
          <PenToolSection
            wide
            isSelected={false}
            hoveredTooltip={null}
            anchorRef={penButtonRef}
            onToolSelect={noop}
            onHoverTooltip={noop}
          />
        </div>
        <div className="w-full min-w-0 sm:w-[236px]">
          <AddPlayerSection
            wide
            isSelected={false}
            openPopover={null}
            hoveredTooltip={null}
            numberValue=""
            nameValue=""
            anchorRef={addPlayerButtonRef}
            onToolSelect={noop}
            onPopoverToggle={noop}
            onPopoverClose={noop}
            onNumberChange={noop}
            onNameChange={noop}
            onHoverTooltip={noop}
            onAddPlayer={noop}
            onQuickAdd={noop}
          />
        </div>
        <div className="w-full min-w-0 sm:w-[236px]">
          <PlayerColorSection
            wide
            playerColor={PLAYER_COLORS.red}
            isSelected={false}
            openPopover={null}
            hoveredTooltip={null}
            anchorRef={playerButtonRef}
            onToolSelect={noop}
            onPlayerColorChange={noop}
            onPopoverToggle={noop}
            onPopoverClose={noop}
            onHoverTooltip={noop}
            onQuickAdd={noop}
          />
        </div>
        <div className="w-full min-w-0 sm:w-[236px]">
          <PrefabsSection
            wide
            prefabs={samplePrefabs}
            openPopover={null}
            hoveredTooltip={null}
            anchorRef={prefabsButtonRef}
            onPopoverToggle={noop}
            onPopoverClose={noop}
            onPrefabSelect={noop}
            onDeleteCustomPrefab={noop}
            onHoverTooltip={noop}
          />
        </div>
        <div className="w-full min-w-0 sm:w-[236px]">
          <PresetSection
            wide
            openPopover={null}
            hoveredTooltip={null}
            anchorRef={presetButtonRef}
            onPopoverToggle={noop}
            onPopoverClose={noop}
            onHoverTooltip={noop}
          />
        </div>
        <div className="w-full min-w-0 sm:w-[236px]">
          <HistoryActionsSection
            wide
            onUndo={noop}
            onRedo={noop}
            onReset={noop}
            hoveredTooltip={null}
            onHoverTooltip={noop}
          />
        </div>
      </div>
    </div>
  );
}

export default function AdminDesignRulesPage() {
  const { basePath, theme, setTheme } = useAdmin();
  const [modalOpen, setModalOpen] = useState(false);
  const [tabsValue, setTabsValue] = useState("overview");
  const [visibility, setVisibility] = useState("team");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [channel, setChannel] = useState("All staff");
  const controlTimeRef = useRef(18500);
  const mobileTimeRef = useRef(32000);
  const [formState, setFormState] = useState({
    search: "Nickel Pressure",
    notes: "Keep language concise, action-led, and consistent across play cards and admin reports.",
    role: "coach",
    includeAlerts: true,
    includeOwners: false,
    liveSync: true,
    compactRows: false,
  });

  const slatePlayersById = useMemo(() => ({
    p1: { id: "p1", number: "10", name: "Maya Jordan", color: "#ef4444", hidden: false },
    p2: { id: "p2", number: "22", name: "Nick Porter", color: "#3b82f6", hidden: false },
    p3: { id: "p3", number: "7", name: "Lena Cho", color: "#f59e0b", hidden: false },
  }), []);

  const slateAdvancedSettings = useMemo(() => ({
    pitch: { fieldType: "rugby", pitchColor: "#4FA85D" },
    players: { baseSizePx: 30 },
    ball: { sizePercent: 100, coneSizePercent: 70 },
    animation: {},
  }), []);

  const toastItems = useMemo(() => ([
    { title: "Play shared", body: "Trips Right Flood was sent to 18 players.", tone: "success" },
    { title: "Needs review", body: "Two issue reports are waiting on triage.", tone: "warning" },
    { title: "Draft saved", body: "Design Rules page changes are stored locally.", tone: "info" },
  ]), []);

  return (
    <AdminShell>
      <AdminHeader
        title="Design Rules"
        backLabel="Dashboard"
        backTo={adminPath(basePath, "")}
        actions={(
          <>
            <ThemeModeSwitch theme={theme} onChange={setTheme} />
            <MetaPill>Admin only</MetaPill>
            <MetaPill>{theme === "dark" ? "Dark preview" : "Light preview"}</MetaPill>
            <AdminBtn variant="outline" size="sm">Static sample data</AdminBtn>
          </>
        )}
      />

      <AdminPage wide className="min-w-0 space-y-10 overflow-x-hidden pb-10">
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <AdminCard className="relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(circle at top right, color-mix(in srgb, var(--adm-accent-dim) 95%, transparent) 0%, transparent 36%)",
              }}
            />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <MetaPill>Internal design system</MetaPill>
                <MetaPill>Admin reference</MetaPill>
                <MetaPill>Scalable component catalog</MetaPill>
              </div>
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--adm-text3)" }}>
                  Purpose
                </p>
                <h1 className="mt-3 font-Manrope text-3xl font-semibold tracking-tight sm:text-[2.3rem]" style={{ color: "var(--adm-text)" }}>
                  A single page that defines what polished Coachable admin UI should look like.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 sm:text-[15px]" style={{ color: "var(--adm-text2)" }}>
                  This page uses static sample data and shared admin components to show the standard for sizing,
                  spacing, hierarchy, interaction states, and repeated product patterns.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {FOUNDATION_RULES.map((rule) => (
                  <div
                    key={rule}
                    className="rounded-[var(--adm-radius)] px-4 py-3 text-sm"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--adm-surface2) 76%, transparent)",
                      border: "1px solid var(--adm-border)",
                    }}
                  >
                    {rule}
                  </div>
                ))}
              </div>
            </div>
          </AdminCard>

          <AdminCard className="h-full">
            <div className="flex h-full flex-col gap-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-text3)" }}>
                  Direction
                </p>
                <p className="mt-2 text-xl font-semibold" style={{ color: "var(--adm-text)" }}>
                  Sport and productivity focused, but calmer and tighter than the surrounding app.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                {[
                  { icon: FiTarget, label: "Primary action", value: "1 accent CTA per cluster" },
                  { icon: FiShield, label: "Surface language", value: "Soft border + layered card" },
                  { icon: FiCommand, label: "Spacing rhythm", value: "8px base with 16/24/32 jumps" },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="rounded-[var(--adm-radius)] p-4"
                    style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--adm-radius)]" style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}>
                        <Icon />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-text3)" }}>{label}</p>
                        <p className="mt-1 text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="rounded-[var(--adm-radius)] p-4"
                style={{
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--adm-surface2) 88%, transparent) 0%, var(--adm-surface) 100%)",
                  border: "1px solid var(--adm-border)",
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-text3)" }}>
                      Theme behavior
                    </p>
                    <p className="mt-1 text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
                      Components on this page use the live admin theme tokens.
                    </p>
                  </div>
                  <MetaPill>{theme === "dark" ? "Dark mode active" : "Light mode active"}</MetaPill>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Background", value: "var(--adm-bg)", fill: "var(--adm-bg)" },
                    { label: "Surface", value: "var(--adm-surface)", fill: "var(--adm-surface)" },
                    { label: "Elevated", value: "var(--adm-surface-elevated)", fill: "var(--adm-surface-elevated)" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[var(--adm-radius-md)] p-3" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                      <div className="h-10 rounded-[var(--adm-radius-md)] border" style={{ backgroundColor: item.fill, borderColor: "var(--adm-border)" }} />
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-text3)" }}>{item.label}</p>
                      <p className="mt-1 text-sm" style={{ color: "var(--adm-text2)" }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <AdminAlert tone="info" title="Design library rule">
                New reusable admin UI should appear here before it spreads to multiple pages.
              </AdminAlert>
            </div>
          </AdminCard>
        </section>

            <AdminSection
              title="Foundations"
              subtitle="Typography, spacing, color, and other baseline rules that repeated components should inherit."
            >
          <div className="grid gap-5 xl:grid-cols-3">
            <DemoTile
              title="Typography"
              description="Use Manrope for admin hierarchy and keep body text compact, readable, and consistently weighted."
            >
              <div className="space-y-3">
                <div>
                  <p className="font-Manrope text-3xl font-semibold" style={{ color: "var(--adm-text)" }}>Page heading</p>
                  <p className="text-sm" style={{ color: "var(--adm-text3)" }}>32px / semibold</p>
                </div>
                <div>
                  <p className="font-Manrope text-xl font-semibold" style={{ color: "var(--adm-text)" }}>Section heading</p>
                  <p className="text-sm" style={{ color: "var(--adm-text3)" }}>20px / semibold</p>
                </div>
                <div>
                  <p className="text-sm leading-7" style={{ color: "var(--adm-text2)" }}>
                    Supporting copy should stay in a narrow range so dense admin screens still scan quickly.
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--adm-text3)" }}>14-15px / regular</p>
                </div>
              </div>
            </DemoTile>

            <DemoTile
              title="Spacing and radius"
              description="Keep the spacing rhythm obvious enough that components feel cut from the same system."
            >
              <div className="space-y-4">
                {[8, 12, 16, 24, 32].map((size) => (
                  <div key={size} className="flex items-center gap-3">
                    <span className="w-8 text-xs font-semibold" style={{ color: "var(--adm-text3)" }}>{size}</span>
                    <div
                      className="rounded-full"
                      style={{ width: `${size * 3}px`, height: 8, backgroundColor: "var(--adm-accent)" }}
                    />
                  </div>
                ))}
                <div className="flex flex-wrap gap-3 pt-2">
                  {["sm", "md", "lg", "xl"].map((token, index) => (
                    <div
                      key={token}
                      className="flex h-14 w-14 items-center justify-center border text-xs font-semibold"
                      style={{
                        borderColor: "var(--adm-border)",
                        backgroundColor: "var(--adm-surface2)",
                        borderRadius: `${6 + (index * 4)}px`,
                        color: "var(--adm-text2)",
                      }}
                    >
                      {token}
                    </div>
                  ))}
                </div>
              </div>
            </DemoTile>

            <DemoTile
              title="Color usage"
              description="Accent should lead intent, while semantic states handle risk, success, and warnings."
            >
              <div className="grid grid-cols-2 gap-3">
                {COLOR_SWATCHES.map((swatch) => (
                  <div key={swatch.label} className="rounded-[var(--adm-radius)] p-3" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                    <div className="flex items-center gap-3">
                      <span
                        className="h-10 w-10 rounded-[var(--adm-radius-md)] border"
                        style={{
                          backgroundColor: `var(${swatch.token})`,
                          borderColor: "var(--adm-border)",
                        }}
                      />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{swatch.label}</p>
                        <p className="text-xs" style={{ color: "var(--adm-text3)" }}>{swatch.token}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DemoTile>
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <DemoTile
              title="Theme expectations"
              description="Light mode should feel crisp and editorial; dark mode should feel calm and contrast-rich without turning every panel into the same gray."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-text3)" }}>In light mode</p>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--adm-text2)" }}>
                    Surfaces should separate through subtle tint and shadow, with darker text and slightly stronger borders.
                  </p>
                </div>
                <div className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-text3)" }}>In dark mode</p>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--adm-text2)" }}>
                    Contrast should come from layered surfaces, accent restraint, and readable muted text instead of stark white borders.
                  </p>
                </div>
              </div>
            </DemoTile>

            <DemoTile
              title="Mode-sensitive accents"
              description="Semantic color blocks should stay legible and balanced in both themes."
            >
              <div className="space-y-3">
                {[
                  { label: "Primary action", bg: "var(--adm-accent-dim)", fg: "var(--adm-accent)" },
                  { label: "Positive state", bg: "var(--adm-success-dim)", fg: "var(--adm-success)" },
                  { label: "Warning state", bg: "var(--adm-warning-dim)", fg: "var(--adm-warning)" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-[var(--adm-radius)] px-4 py-3"
                    style={{ backgroundColor: item.bg, border: `1px solid color-mix(in srgb, ${item.fg} 18%, transparent)` }}
                  >
                    <span className="text-sm font-semibold" style={{ color: item.fg }}>{item.label}</span>
                    <span className="text-xs" style={{ color: "var(--adm-text2)" }}>{theme === "dark" ? "Dark" : "Light"} preview</span>
                  </div>
                ))}
              </div>
            </DemoTile>
          </div>
            </AdminSection>

        <AdminSection
          title="Buttons and Form Fields"
          subtitle="Show variants side by side so sizing, weights, and state treatment are easy to compare."
        >
          <div className="grid gap-5 xl:grid-cols-2">
            <DemoTile
              title="Buttons"
              description="Primary actions use the accent. Secondary and outline actions should stay quieter but still feel clickable."
            >
              <div className="space-y-5">
                <div className="flex flex-wrap gap-3">
                  <AdminBtn variant="primary">Primary</AdminBtn>
                  <AdminBtn variant="secondary">Secondary</AdminBtn>
                  <AdminBtn variant="outline">Outline</AdminBtn>
                  <AdminBtn variant="ghost">Ghost</AdminBtn>
                  <AdminBtn variant="danger">Danger</AdminBtn>
                  <AdminBtn disabled>Disabled</AdminBtn>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <AdminBtn variant="secondary" size="sm">Small</AdminBtn>
                  <AdminBtn variant="primary" size="md">Medium</AdminBtn>
                  <AdminBtn variant="outline" size="lg">Large</AdminBtn>
                  <AdminBtn variant="ghost" size="icon" aria-label="Search">
                    <FiSearch />
                  </AdminBtn>
                  <AdminBtn variant="secondary" size="icon" aria-label="Settings">
                    <FiSettings />
                  </AdminBtn>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {["Create play", "Invite staff", "Export report"].map((label, index) => (
                    <div
                      key={label}
                      className="rounded-[var(--adm-radius)] p-3"
                      style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-text3)" }}>
                        Pattern {index + 1}
                      </p>
                      <AdminBtn variant={index === 0 ? "primary" : "secondary"} className="mt-3 w-full justify-between">
                        {label}
                        <FiArrowUpRight />
                      </AdminBtn>
                    </div>
                  ))}
                </div>
              </div>
            </DemoTile>

            <DemoTile
              title="Inputs, selects, and textarea"
              description="Field heights, label sizing, and focus states should be aligned across all entry points."
            >
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <AdminInput label="Text input" value="Trips Right Flood" onChange={(e) => setFormState((prev) => ({ ...prev, search: e.target.value }))} />
                  <AdminInput label="Email input" type="email" value="coach@austinarrows.com" onChange={() => {}} />
                  <AdminInput label="Password input" type="password" value="secretpass" onChange={() => {}} />
                  <div className="relative">
                    <FiSearch className="pointer-events-none absolute left-3.5 top-[2.35rem] text-sm" style={{ color: "var(--adm-text3)" }} />
                    <AdminInput
                      label="Search input"
                      value={formState.search}
                      onChange={(e) => setFormState((prev) => ({ ...prev, search: e.target.value }))}
                      inputClassName="pl-9"
                    />
                  </div>
                  <AdminSelect label="Select / dropdown" value={formState.role} onChange={(e) => setFormState((prev) => ({ ...prev, role: e.target.value }))}>
                    <option value="coach">Coach</option>
                    <option value="analyst">Analyst</option>
                    <option value="admin">Admin</option>
                  </AdminSelect>
                  <AdminInput label="Disabled field" value="Archived roster" disabled onChange={() => {}} />
                </div>
                <AdminTextarea
                  label="Textarea"
                  value={formState.notes}
                  onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                  hint="Use the same radius, spacing, and helper text style as other fields."
                />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <StaticFieldState label="Default" value="Field default state" />
                  <StaticFieldState label="Focused" value="Focused and ready" tone="focus" />
                  <StaticFieldState label="Error" value="Missing required info" tone="error" />
                  <StaticFieldState label="Disabled" value="Unavailable until enabled" tone="disabled" />
                </div>
              </div>
            </DemoTile>
          </div>
        </AdminSection>

        <AdminSection
          title="Controls, Status, and Feedback"
          subtitle="Selection controls, status labels, alerts, toasts, and small interaction patterns should share one visual language."
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="grid gap-5">
              <DemoTile
                title="Checkboxes, toggles, and radio groups"
                description="Keep labels readable and give small state controls enough breathing room to feel intentional."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <AdminCheckbox
                      checked={formState.includeAlerts}
                      onChange={() => setFormState((prev) => ({ ...prev, includeAlerts: !prev.includeAlerts }))}
                      label="Include issue alerts"
                      description="Show priority bugs in the daily report."
                    />
                    <AdminCheckbox
                      checked={formState.includeOwners}
                      onChange={() => setFormState((prev) => ({ ...prev, includeOwners: !prev.includeOwners }))}
                      label="Limit to owners"
                      description="Only highlight actions that require ownership approval."
                    />
                    <AdminCheckbox checked label="Locked sample" disabled />
                  </div>

                  <div className="space-y-4">
                    <AdminToggle
                      checked={formState.liveSync}
                      onChange={(next) => setFormState((prev) => ({ ...prev, liveSync: next }))}
                      label="Live updates"
                      description="Push edits into open dashboards without refresh."
                    />
                    <AdminToggle
                      checked={formState.compactRows}
                      onChange={(next) => setFormState((prev) => ({ ...prev, compactRows: next }))}
                      label="Compact table density"
                      description="Tighten row height for heavier admin lists."
                    />
                  </div>
                </div>

                <AdminRadioGroup
                  className="mt-5"
                  label="Visibility"
                  value={visibility}
                  onChange={setVisibility}
                  options={[
                    { value: "team", label: "Team only", description: "Coaches and staff inside the current team." },
                    { value: "league", label: "Org / league", description: "Broader access with shared review context." },
                    { value: "private", label: "Private draft", description: "Use for early review or incomplete play packages." },
                  ]}
                />
              </DemoTile>

              <DemoTile
                title="Badges and alerts"
                description="Badges should be compact and semantic; alerts should be larger and carry message hierarchy."
              >
                <div className="flex flex-wrap gap-2">
                  <AdminBadge status="resolved" />
                  <AdminBadge status="warning" />
                  <AdminBadge status="fail" />
                  <AdminBadge status="info" />
                  <AdminBadge status="open" />
                  <AdminBadge status="in_progress" />
                </div>
                <div className="mt-4 space-y-3">
                  <AdminAlert tone="success" title="Publish complete">
                    18 athletes can now open the updated play sheet.
                  </AdminAlert>
                  <AdminAlert tone="warning" title="Needs attention">
                    One modal style still uses a custom button stack outside the shared admin primitives.
                  </AdminAlert>
                </div>
              </DemoTile>
            </div>

            <div className="grid gap-5">
              <DemoTile
                title="Tabs, dropdowns, tooltips, and toasts"
                description="Small interaction surfaces should feel part of the same system instead of four separate mini-designs."
              >
                <div
                  className="flex w-full items-center gap-0.5 overflow-x-auto rounded-[var(--adm-radius-sm)] p-0.5 lg:w-auto"
                  style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
                >
                  {[
                    { key: "overview", label: "Overview" },
                    { key: "activity", label: "Activity" },
                    { key: "sharing", label: "Sharing" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setTabsValue(tab.key)}
                      className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-normal transition"
                      style={tabsValue === tab.key
                        ? { backgroundColor: "var(--adm-accent)", color: "#fff" }
                        : { color: "var(--adm-muted)" }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="relative rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Dropdown menu</p>
                        <p className="text-xs" style={{ color: "var(--adm-text3)" }}>Compact actions with one trigger</p>
                      </div>
                      <AdminBtn variant="secondary" size="sm" onClick={() => setDropdownOpen((open) => !open)}>
                        {channel}
                        <FiMoreHorizontal />
                      </AdminBtn>
                    </div>
                    {dropdownOpen ? (
                      <div
                        className="absolute right-4 top-16 z-10 w-52 overflow-hidden rounded-xl py-1"
                        style={ADMIN_MENU_STYLE}
                      >
                        {["All staff", "Coaches only", "Owners only"].map((item) => (
                          <button
                            key={item}
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:opacity-80"
                            style={{ color: item === channel ? "var(--adm-accent)" : "var(--adm-text2)" }}
                            onClick={() => {
                              setChannel(item);
                              setDropdownOpen(false);
                            }}
                          >
                            {item}
                            {item === channel ? <FiCheckCircle /> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                    <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Tooltip</p>
                    <p className="text-xs" style={{ color: "var(--adm-text3)" }}>Mirror the Slate tooltip primitive for compact helper text.</p>
                    <div className="mt-4 rounded-2xl border border-white/8 bg-[#101317] p-4">
                      <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
                        <div className="relative inline-flex w-fit">
                          <button
                            type="button"
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80"
                          >
                            Hover target
                          </button>
                          <SlateTooltip isOpen text="Use tooltips for context only." />
                        </div>
                        <p className="text-xs leading-5 text-white/55">
                          Keep the trigger close to the left edge of the stage so the tooltip has room to breathe without breaking the layout.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <AppToastStack items={toastItems} />
                </div>
              </DemoTile>
            </div>
          </div>
        </AdminSection>

        <AdminSection
          title="Navigation and Overlay Patterns"
          subtitle="These examples show the admin chrome, a table-friendly toolbar pattern, and shared modal treatment."
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <DemoTile
              title="Sidebar and shell preview"
              description="The new page sits inside the same admin chrome and should reinforce the shell as the base system."
            >
              <SidebarMiniPreview />
            </DemoTile>

            <DemoTile
              title="Dialog pattern"
              description="Shared admin modals should use the same padding, header spacing, border treatment, and footer controls."
            >
              <div className="space-y-4">
                <div className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Sample modal anatomy</p>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-[var(--adm-radius-md)] px-3 py-2 text-sm" style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)" }}>Title + short explainer</div>
                    <div className="rounded-[var(--adm-radius-md)] px-3 py-8 text-sm" style={{ backgroundColor: "var(--adm-surface)", border: "1px dashed var(--adm-border2)", color: "var(--adm-text3)" }}>Content area</div>
                    <div className="flex justify-end gap-2">
                      <AdminBtn variant="ghost" size="sm">Cancel</AdminBtn>
                      <AdminBtn variant="primary" size="sm">Confirm</AdminBtn>
                    </div>
                  </div>
                </div>
                <AdminBtn variant="primary" onClick={() => setModalOpen(true)}>
                  Open modal example
                </AdminBtn>
              </div>
            </DemoTile>
          </div>
        </AdminSection>

            <AdminSection
              title="Data Display"
              subtitle="Tables, avatars, and card clusters should feel denser than marketing UI, but still clearly grouped and readable."
            >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <DemoTile
              title="Table pattern"
              description="This mirrors the real user-directory table pattern: search in the header, count on the right, then the dense fixed-column table."
            >
              <UsersDirectoryPreview />
            </DemoTile>

            <div className="grid gap-5">
              <DemoTile
                title="Avatar cluster"
                description="Profile treatment should stay compact and consistent across staff, users, and activity feeds."
              >
                <div className="space-y-3">
                  {USERS.map((user) => (
                    <div key={user.name} className="flex items-center gap-3 rounded-[var(--adm-radius)] p-3" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                      <AdminAvatar name={user.name} size="md" status={user.status} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{user.name}</p>
                        <p className="truncate text-xs" style={{ color: "var(--adm-text3)" }}>{user.role} · {user.team}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DemoTile>

              <DemoTile
                title="Stat card strip"
                description="This is the actual analytics KPI strip, using the live tile sizing, gradients, and density."
              >
                <KpiStrip summary={KPI_SUMMARY} />
              </DemoTile>
            </div>
          </div>
            </AdminSection>

        <AdminSection
              title="Charts and Graphs"
              subtitle="Analytics visuals should mirror the actual dashboard language: tinted panels, compact stats, restrained legends, and product-native chart defaults."
            >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <DemoTile
              title="Chart standards"
              description="These rules now track the real analytics dashboard treatment instead of a standalone showcase style."
            >
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  "Use the analytics tinted panel gradients and color-keyed borders instead of neutral generic cards.",
                  "Reuse the same dashboard chart components so tooltip, legend, hover, and axis behavior stay identical.",
                  "Keep one metric badge in the panel chrome so charts read like dashboard modules, not loose embeds.",
                  "Area, bar, donut, and funnel views should all inherit the same muted label rhythm and surface depth.",
                ].map((rule) => (
                  <div
                    key={rule}
                    className="rounded-[var(--adm-radius)] px-4 py-3 text-sm"
                    style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
                  >
                    {rule}
                  </div>
                ))}
              </div>
            </DemoTile>

            <DemoTile
              title="Chart states"
              description="Loading and empty chart states should still look native to the admin shell."
            >
              <div className="grid gap-4">
                <AnalyticsPreviewPanel
                  tone="amber"
                  eyebrow="Loading state"
                  title="Analytics module loading"
                  subtitle="Chart containers should keep their dashboard panel framing while data is fetching."
                  stat="Syncing"
                  statLabel="Status"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Refreshing dashboard metrics</p>
                      <p className="text-xs" style={{ color: "var(--adm-text3)" }}>Use the same lightweight loading language as the production analytics cards.</p>
                    </div>
                    <AdminSpinner size={20} />
                  </div>
                  <div className="mt-4 flex h-32 items-end gap-2">
                    {[42, 76, 58, 88, 54, 64, 40].map((height, index) => (
                      <div
                        key={index}
                        className="animate-pulse rounded-t-[8px]"
                        style={{
                          height,
                          flex: 1,
                          backgroundColor: "var(--adm-surface3)",
                        }}
                      />
                    ))}
                  </div>
                </AnalyticsPreviewPanel>

                <AnalyticsPreviewPanel
                  tone="blue"
                  eyebrow="Empty state"
                  title="No analytics source connected"
                  subtitle="Empty chart modules should still render as real dashboard panels, not blank card shells."
                  stat="0"
                  statLabel="Sources"
                >
                  <AdminEmptyState
                    className="py-8"
                    title="Connect an analytics source"
                    subtitle="Use the standard empty-state treatment instead of leaving charts blank."
                    action={<AdminBtn variant="secondary" size="sm"><FiPlus /> Connect source</AdminBtn>}
                  />
                </AnalyticsPreviewPanel>
              </div>
            </DemoTile>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <DemoTile
              title="Dashboard chart modules"
              description="These use the real analytics dashboard components and panel treatment so the reference page stays aligned with production."
            >
              <div className="grid gap-4">
                <AnalyticsPreviewPanel
                  tone="orange"
                  eyebrow="Growth"
                  title="New user registrations"
                  subtitle="Area chart treatment should match the analytics dashboard exactly."
                  stat="+18%"
                  statLabel="30d"
                >
                  <UserGrowthChart data={USER_GROWTH_SERIES} height={210} />
                </AnalyticsPreviewPanel>

                <AnalyticsPreviewPanel
                  tone="blue"
                  eyebrow="Activity"
                  title="Play creation and edits"
                  subtitle="Grouped bars, hover state, legend, and tooltip all come from the real dashboard component."
                  stat="173"
                  statLabel="Events"
                >
                  <PlayActivityChart data={PLAY_ACTIVITY_SERIES} height={210} />
                </AnalyticsPreviewPanel>
              </div>
            </DemoTile>

            <DemoTile
              title="Distribution and funnel charts"
              description="Category mix and funnel views should use the same analytics card system and interaction language as the live dashboard."
            >
              <div className="grid gap-4">
                <AnalyticsPreviewPanel
                  tone="green"
                  eyebrow="Segmentation"
                  title="Sport mix"
                  subtitle="Donut chart colors, legend scale, and tooltip styling should stay locked to analytics."
                  stat="5"
                  statLabel="Sports"
                >
                  <SportMixChart data={SPORT_MIX_SERIES} height={210} />
                </AnalyticsPreviewPanel>

                <AnalyticsPreviewPanel
                  tone="amber"
                  eyebrow="Onboarding"
                  title="Activation funnel"
                  subtitle="The horizontal funnel should use the same label spacing, hover tint, and count treatment as the live dashboard."
                  stat="19%"
                  statLabel="Completion"
                >
                  <OnboardingFunnel data={ONBOARDING_FUNNEL_DATA} height={210} />
                </AnalyticsPreviewPanel>
              </div>
            </DemoTile>
          </div>
            </AdminSection>

            <AdminSection
              title="Product-Specific Cards"
              subtitle="These are the repeated product patterns most likely to spread if they are not standardized early."
            >
          <div className="grid gap-5 xl:grid-cols-3">
            <DemoTile
              title="User and team cards"
              description="People and team summaries should use the same density, metadata rhythm, and CTA treatment."
            >
              <div className="space-y-3">
                {USERS.slice(0, 2).map((user) => (
                  <div key={user.name} className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                    <div className="flex items-center gap-3">
                      <AdminAvatar name={user.name} size="lg" status={user.status} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{user.name}</p>
                        <p className="text-xs" style={{ color: "var(--adm-text3)" }}>{user.role}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <AdminBadge status="resolved">Verified</AdminBadge>
                      <AdminBtn variant="ghost" size="sm">View profile</AdminBtn>
                    </div>
                  </div>
                ))}

                <div className="grid gap-3 md:grid-cols-2">
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
              </div>
            </DemoTile>

              <DemoTile
                title="Play cards"
                description="Play cards should stay slim and utilitarian: landscape preview, tight title row, small tags, and a quiet footer."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {PLAYS.map((play) => (
                    <PlatformPlayCardPreview key={play.title} play={play} />
                  ))}
                </div>
            </DemoTile>

            <DemoTile
              title="Dashboard cards and empty/loading states"
              description="Pages should move between states without inventing new styling each time."
            >
              <div className="space-y-4">
                <div className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-text3)" }}>Loading state</p>
                      <p className="mt-1 text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Syncing play activity</p>
                    </div>
                    <AdminSpinner size={22} />
                  </div>
                  <div className="mt-4 space-y-2">
                    {[72, 88, 60].map((width, index) => (
                      <div
                        key={index}
                        className="h-3 animate-pulse rounded-full"
                        style={{ width: `${width}%`, backgroundColor: "var(--adm-surface3)" }}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                  <AdminEmptyState
                    className="py-8"
                    title="No saved filters"
                    subtitle="Create a few standard views here so the table stays consistent across teams."
                    action={<AdminBtn variant="secondary" size="sm"><FiPlus /> Create filter</AdminBtn>}
                  />
                </div>
              </div>
            </DemoTile>
          </div>
            </AdminSection>

            <section className="space-y-4">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--adm-text3)" }}>
              Separate Slate Zone
            </p>
            <h2 className="mt-3 font-Manrope text-2xl font-semibold" style={{ color: "var(--adm-text)" }}>
              Slate UI Reference
            </h2>
            <p className="mt-2 text-sm leading-7" style={{ color: "var(--adm-text2)" }}>
              Slate controls use a very different visual language from the admin shell, so they live below the main design library
              in their own black canvas. This keeps the admin reference clean while still documenting the editor-specific controls.
            </p>
          </div>

          <div
            className="min-w-0 overflow-hidden rounded-[32px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
            style={{
              background: "linear-gradient(180deg, #050608 0%, #0b0f14 42%, #121212 100%)",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 32px 70px rgba(0,0,0,0.28)",
            }}
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Slate-only controls
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Native editor buttons, pills, tool rails, and mobile controls
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/55">
                  Black surface
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/55">
                  Separate from admin tokens
                </span>
              </div>
            </div>

            <div className="grid gap-5">
              <SlateReferenceCard
                title="SidebarRoot"
                description="This uses the real Slate sidebar section components in their wide-row variant so the full control set can be compared side by side without the tall editor rail."
              >
                <SlateSidebarRowsPreview />
              </SlateReferenceCard>

              <SlateReferenceCard
                title="Slate tool pills"
                description="These are the real floating annotation and motion drawing pills, rendered at their actual control sizes with enough stage width to match the editor."
              >
                <div className="grid gap-4">
                  <div className="relative isolate min-h-[164px] overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]">
                    <DrawToolsPill activeSubTool="draw" onSubToolChange={noop} onClose={noop} />
                  </div>
                  <div className="relative isolate min-h-[164px] overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]">
                    <AnimationDrawingTools
                      activeSubTool="arrow"
                      onSubToolChange={noop}
                      hideDrawings={false}
                      onToggleHideDrawings={noop}
                    />
                  </div>
                </div>
              </SlateReferenceCard>

              <SlateReferenceCard
                title="ControlPill"
                description="This uses the current live ControlPill styling and gives it a full-width stage so the real pill, slider, and rail fit without overlapping other previews."
              >
                <div className="relative isolate min-h-[210px] overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]">
                  <ControlPill
                    durationMs={45000}
                    currentTimeMs={18500}
                    isPlaying={false}
                    speedMultiplier={1.5}
                    keyframesMs={[0, 8500, 18500, 31000, 42000]}
                    selectedKeyframeMs={18500}
                    onSeek={NOOP_SEEK}
                    onPause={noop}
                    onPlayToggle={noop}
                    onSpeedChange={noop}
                    onAddKeyframe={noop}
                    onDeleteKeyframe={noop}
                    onSelectKeyframe={noop}
                    onMoveKeyframe={noop}
                    getAuthoritativeTimeMs={() => controlTimeRef.current}
                    onDragStateChange={noop}
                  />
                </div>
              </SlateReferenceCard>

              <SlateReferenceCard
                title="MobileEditorBar"
                description="This preview uses the real mobile editor bar component in a local preview mode so the top tabs, sheet, and bottom timeline keep their true sizes."
              >
                <div className="relative min-h-[640px] overflow-hidden rounded-[24px] border border-white/8 bg-[#111]">
                  <MobileEditorBar
                    previewMode
                    initialActiveSheet="tools"
                    durationMs={60000}
                    currentTimeMs={32000}
                    currentTimeMsRef={mobileTimeRef}
                    isPlaying={false}
                    keyframesMs={[0, 12000, 28000, 44000, 56000]}
                    selectedKeyframeMs={28000}
                    onSeek={NOOP_SEEK}
                    onPause={noop}
                    onPlayToggle={noop}
                    onAddKeyframe={noop}
                    onSelectKeyframe={noop}
                    onDeleteKeyframe={noop}
                    onMoveKeyframe={noop}
                    activeTool="select"
                    onToolChange={noop}
                    onUndo={noop}
                    onRedo={noop}
                    onReset={noop}
                    zoomPercent={100}
                    onZoomIn={noop}
                    onZoomOut={noop}
                    selectedItemIds={[1, 2]}
                    onSavePrefab={noop}
                    playersById={slatePlayersById}
                    representedPlayerIds={["p1", "p2"]}
                    selectedPlayerIds={["p1"]}
                    playerEditor={{ open: false, id: null, draft: {} }}
                    fieldType="rugby"
                    onSelectPlayer={noop}
                    onDeletePlayer={noop}
                    onEditPlayer={noop}
                    onEditDraftChange={noop}
                    onCloseEditPlayer={noop}
                    onTogglePlayerHidden={noop}
                    customPrefabs={[]}
                    publishedPrefabs={[]}
                    onPrefabSelect={noop}
                    onDeleteCustomPrefab={noop}
                    allPlayersDisplay={{ sizePercent: 100 }}
                    onAllPlayersDisplayChange={noop}
                    advancedSettings={slateAdvancedSettings}
                    onAdvancedSettingsChange={noop}
                    onAdvancedSettingsReset={noop}
                    onFieldTypeChange={noop}
                    autoplayEnabled={false}
                    onAutoplayChange={noop}
                    onDeleteAllKeyframes={noop}
                    onDownload={noop}
                    onImport={noop}
                    adminMode
                  />
                </div>
              </SlateReferenceCard>
            </div>
          </div>
            </section>
      </AdminPage>

      <AdminModal open={modalOpen} onClose={() => setModalOpen(false)} title="Share updated design rules" width="max-w-lg">
        <div className="space-y-4">
          <p className="text-sm leading-6" style={{ color: "var(--adm-text2)" }}>
            Use the shared modal pattern for approval flows, confirmations, and dense settings blocks. Keep the
            action hierarchy simple and align the button stack to the bottom-right.
          </p>
          <AdminInput label="Audience" value={channel} onChange={() => {}} />
          <AdminTextarea
            label="Message"
            value="The admin design rules page now includes shared buttons, fields, overlays, and card patterns."
            onChange={() => {}}
          />
          <div className="flex justify-end gap-2 pt-2">
            <AdminBtn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</AdminBtn>
            <AdminBtn variant="primary"><FiZap /> Send update</AdminBtn>
          </div>
        </div>
      </AdminModal>
    </AdminShell>
  );
}
