import { useEffect, useState } from "react";
import {
  FiBell,
  FiCheck,
  FiMonitor,
  FiMoon,
  FiShield,
  FiSun,
  FiUsers,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

const THEME_OPTIONS = [
  { value: "dark", icon: FiMoon, label: "Dark", desc: "Easy on the eyes" },
  { value: "light", icon: FiSun, label: "Light", desc: "Classic bright mode" },
  { value: "system", icon: FiMonitor, label: "System", desc: "Match your device" },
];

const SPORT_OPTIONS = [
  "rugby",
  "soccer",
  "basketball",
  "football",
  "baseball",
  "hockey",
  "lacrosse",
  "volleyball",
  "cricket",
  "other",
];

function resolveTheme(theme) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return theme;
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", resolveTheme(theme));
  localStorage.setItem("theme", theme);
}

function ToggleRow({ label, description, enabled, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-BrandGray2/20 bg-BrandBlack2/20 px-3 py-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-BrandGray2">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative h-7 w-12 rounded-full border transition ${
          enabled
            ? "border-BrandOrange bg-BrandOrange/80"
            : "border-BrandGray2/40 bg-BrandGray2/20"
        }`}
      >
        <span
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function Settings() {
  const {
    user,
    updateAssistantPermissions,
    updateNotificationPreferences,
    updateTeamDefaults,
  } = useAuth();

  const initialTheme = localStorage.getItem("theme") || "dark";
  const initialNotifications = user?.notifications || {};
  const initialAssistantPermissions = user?.assistantPermissions || {};
  const initialTeamDefaults = {
    teamName: user?.teamName || "",
    sport: user?.sport || "",
    teamLogo: user?.teamLogo || "",
    seasonYear: user?.seasonYear || String(new Date().getFullYear()),
  };

  const [selectedTheme, setSelectedTheme] = useState(initialTheme);
  const [savedTheme, setSavedTheme] = useState(initialTheme);

  const [notifications, setNotifications] = useState(initialNotifications);
  const [savedNotifications, setSavedNotifications] = useState(initialNotifications);

  const [assistantPermissions, setAssistantPermissions] = useState(initialAssistantPermissions);
  const [savedAssistantPermissions, setSavedAssistantPermissions] = useState(initialAssistantPermissions);

  const [teamDefaults, setTeamDefaults] = useState(initialTeamDefaults);
  const [savedTeamDefaults, setSavedTeamDefaults] = useState(initialTeamDefaults);

  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    applyTheme(initialTheme);
  }, [initialTheme]);

  const hasChanges =
    selectedTheme !== savedTheme ||
    JSON.stringify(notifications) !== JSON.stringify(savedNotifications) ||
    JSON.stringify(assistantPermissions) !== JSON.stringify(savedAssistantPermissions) ||
    JSON.stringify(teamDefaults) !== JSON.stringify(savedTeamDefaults);

  const toggleNotification = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePermission = (key) => {
    setAssistantPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = () => {
    applyTheme(selectedTheme);
    setSavedTheme(selectedTheme);

    updateNotificationPreferences(notifications);
    updateAssistantPermissions(assistantPermissions);
    updateTeamDefaults(teamDefaults);

    setSavedNotifications({ ...notifications });
    setSavedAssistantPermissions({ ...assistantPermissions });
    setSavedTeamDefaults({ ...teamDefaults });

    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleCancel = () => {
    setSelectedTheme(savedTheme);
    setNotifications({ ...savedNotifications });
    setAssistantPermissions({ ...savedAssistantPermissions });
    setTeamDefaults({ ...savedTeamDefaults });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:px-10 md:py-12">
      <h1 className="font-Manrope text-xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1.5 text-sm text-BrandGray2">Manage notifications, team defaults, and app appearance.</p>

      <div className="mt-8 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 p-5">
        <div className="mb-4 flex items-center gap-2">
          <FiBell className="text-sm text-BrandOrange" />
          <p className="text-xs font-semibold uppercase tracking-widest text-BrandGray2">Notification Preferences</p>
        </div>
        <div className="flex flex-col gap-2">
          <ToggleRow
            label="Players join team"
            description="Get notified when new players join your team."
            enabled={Boolean(notifications.playersJoinTeam)}
            onToggle={() => toggleNotification("playersJoinTeam")}
          />
          <ToggleRow
            label="Coaches make changes"
            description="Get notified when coaches edit plays or team settings."
            enabled={Boolean(notifications.coachesMakeChanges)}
            onToggle={() => toggleNotification("coachesMakeChanges")}
          />
          <ToggleRow
            label="Invites accepted"
            description="Get notified when pending invites are accepted."
            enabled={Boolean(notifications.inviteAccepted)}
            onToggle={() => toggleNotification("inviteAccepted")}
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 p-5">
        <div className="mb-4 flex items-center gap-2">
          <FiShield className="text-sm text-BrandOrange" />
          <p className="text-xs font-semibold uppercase tracking-widest text-BrandGray2">Roles and Permissions</p>
        </div>
        <p className="mb-3 text-xs text-BrandGray2">Assistant coach permissions</p>
        <div className="flex flex-col gap-2">
          <ToggleRow
            label="Create, edit, and delete plays"
            description="Allow assistant coaches to manage all play content."
            enabled={Boolean(assistantPermissions.canCreateEditDeletePlays)}
            onToggle={() => togglePermission("canCreateEditDeletePlays")}
          />
          <ToggleRow
            label="Manage roster"
            description="Allow assistant coaches to add, remove, and update players."
            enabled={Boolean(assistantPermissions.canManageRoster)}
            onToggle={() => togglePermission("canManageRoster")}
          />
          <ToggleRow
            label="Send invites"
            description="Allow assistant coaches to invite members to the team."
            enabled={Boolean(assistantPermissions.canSendInvites)}
            onToggle={() => togglePermission("canSendInvites")}
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 p-5">
        <div className="mb-4 flex items-center gap-2">
          <FiUsers className="text-sm text-BrandOrange" />
          <p className="text-xs font-semibold uppercase tracking-widest text-BrandGray2">Team Defaults</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold">Team Name</label>
            <input
              type="text"
              value={teamDefaults.teamName}
              onChange={(e) => setTeamDefaults((prev) => ({ ...prev, teamName: e.target.value }))}
              className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-2.5 text-sm text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
              placeholder="Riverside Rugby"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Sport</label>
            <select
              value={teamDefaults.sport}
              onChange={(e) => setTeamDefaults((prev) => ({ ...prev, sport: e.target.value }))}
              className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-2.5 text-sm text-BrandText outline-none transition hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
            >
              <option value="">Select sport</option>
              {SPORT_OPTIONS.map((sportOption) => (
                <option key={sportOption} value={sportOption} className="bg-BrandBlack">
                  {sportOption.charAt(0).toUpperCase() + sportOption.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Season / Year</label>
            <input
              type="text"
              value={teamDefaults.seasonYear}
              onChange={(e) => setTeamDefaults((prev) => ({ ...prev, seasonYear: e.target.value }))}
              placeholder="2026"
              className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-2.5 text-sm text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold">Team Logo URL</label>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-BrandGray2/30 bg-BrandBlack2/40 text-sm font-bold text-BrandOrange">
                {teamDefaults.teamLogo ? (
                  <img src={teamDefaults.teamLogo} alt="Team logo" className="h-full w-full object-cover" />
                ) : (
                  (teamDefaults.teamName?.[0] || "T").toUpperCase()
                )}
              </div>
              <input
                type="url"
                value={teamDefaults.teamLogo}
                onChange={(e) => setTeamDefaults((prev) => ({ ...prev, teamLogo: e.target.value }))}
                placeholder="https://example.com/logo.png"
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-2.5 text-sm text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-BrandGray2">Appearance</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map((option) => {
            const ThemeIcon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedTheme(option.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition ${
                  selectedTheme === option.value
                    ? "border-BrandOrange bg-BrandOrange/5 shadow-[0_0_0_3px_rgba(255,122,24,0.08)]"
                    : "border-BrandGray2/20 hover:border-BrandGray2/40"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                    selectedTheme === option.value ? "bg-BrandOrange/15" : "bg-BrandGray2/15"
                  }`}
                >
                  <ThemeIcon
                    className={`text-lg ${selectedTheme === option.value ? "text-BrandOrange" : "text-BrandGray"}`}
                  />
                </div>
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="text-[11px] text-BrandGray2">{option.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!hasChanges}
          className="flex items-center justify-center gap-2 rounded-lg bg-BrandOrange px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {showSaved ? (
            <>
              <FiCheck className="text-sm" />
              Saved
            </>
          ) : (
            "Confirm"
          )}
        </button>

        {hasChanges && (
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg border border-BrandGray2/30 px-4 py-2.5 text-sm text-BrandGray transition hover:border-BrandGray hover:text-BrandText"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
