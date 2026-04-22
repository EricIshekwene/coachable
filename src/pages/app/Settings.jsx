import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FiBell,
  FiCheck,
  FiEye,
  FiMonitor,
  FiMoon,
  FiShield,
  FiSun,
  FiUsers,
  FiAlertTriangle,
  FiLogOut,
  FiTrash2,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

const THEME_OPTIONS = [
  { value: "dark", icon: FiMoon, label: "Dark", desc: "Easy on the eyes" },
  { value: "light", icon: FiSun, label: "Light", desc: "Classic bright mode" },
  { value: "system", icon: FiMonitor, label: "System", desc: "Match your device" },
];

/** Sports that map to a supported field type in the editor. */
const SPORT_OPTIONS = [
  { value: "rugby", label: "Rugby" },
  { value: "soccer", label: "Soccer" },
  { value: "football", label: "Football" },
  { value: "lacrosse", label: "Lacrosse" },
  { value: "womens lacrosse", label: "Women's Lacrosse" },
  { value: "basketball", label: "Basketball" },
  { value: "field hockey", label: "Field Hockey" },
  { value: "ice hockey", label: "Ice Hockey" },
  { value: "blank", label: "Blank Canvas" },
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
        aria-pressed={enabled}
        onClick={onToggle}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center overflow-hidden rounded-full border p-0.5 appearance-none transition-colors ${
          enabled
            ? "border-BrandOrange bg-BrandOrange/80"
            : "border-BrandGray2/40 bg-BrandGray2/20"
        }`}
      >
        <span
          className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            enabled ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function Settings() {
  const {
    user,
    teamMembers,
    playerViewMode,
    setPlayerViewMode,
    updateAssistantPermissions,
    updateNotificationPreferences,
    updateTeamDefaults,
    leaveTeam,
  } = useAuth();
  const navigate = useNavigate();

  // Leave / delete team state
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  const isPlayer = user?.role === "player" || playerViewMode;
  const isPersonal = user?.isPersonalTeam;

  const initialTheme = localStorage.getItem("theme") || "light";
  const initialNotifications = user?.notifications || {};
  const initialAssistantPermissions = user?.assistantPermissions || {};
  const initialTeamDefaults = {
    teamName: user?.teamName || "",
    sport: user?.sport || "",
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
    (!isPlayer && JSON.stringify(assistantPermissions) !== JSON.stringify(savedAssistantPermissions)) ||
    (!isPlayer && JSON.stringify(teamDefaults) !== JSON.stringify(savedTeamDefaults));

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
    if (!isPlayer) {
      updateAssistantPermissions(assistantPermissions);
      updateTeamDefaults(teamDefaults);
    }

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
      <p className="mt-1.5 text-sm text-BrandGray2">
        {isPersonal
          ? "Manage your workspace settings and app appearance."
          : isPlayer
            ? "Manage your notification preferences and app appearance."
            : "Manage notifications, team defaults, and app appearance."}
      </p>

      {!isPersonal && (
      <div className="mt-8 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 p-5">
        <div className="mb-4 flex items-center gap-2">
          <FiBell className="text-sm text-BrandOrange" />
          <p className="text-xs font-semibold uppercase tracking-widest text-BrandGray2">Notification Preferences</p>
        </div>
        <div className="flex flex-col gap-2">
          {isPlayer ? (
            <>
              <ToggleRow
                label="New plays added"
                description="Get notified when your coach adds new plays."
                enabled={Boolean(notifications.newPlays)}
                onToggle={() => toggleNotification("newPlays")}
              />
              <ToggleRow
                label="Play updates"
                description="Get notified when existing plays are modified."
                enabled={Boolean(notifications.playUpdates)}
                onToggle={() => toggleNotification("playUpdates")}
              />
              <ToggleRow
                label="Team announcements"
                description="Get notified about general team updates."
                enabled={Boolean(notifications.teamAnnouncements)}
                onToggle={() => toggleNotification("teamAnnouncements")}
              />
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
      )}

      {!isPlayer && !isPersonal && (
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
      )}

      {!isPlayer && (
      <div className="mt-6 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 p-5">
        <div className="mb-4 flex items-center gap-2">
          <FiUsers className="text-sm text-BrandOrange" />
          <p className="text-xs font-semibold uppercase tracking-widest text-BrandGray2">
            {isPersonal ? "Workspace Settings" : "Team Defaults"}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold">{isPersonal ? "Workspace Name" : "Team Name"}</label>
            <input
              type="text"
              value={teamDefaults.teamName}
              onChange={(e) => setTeamDefaults((prev) => ({ ...prev, teamName: e.target.value }))}
              className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-2.5 text-sm text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
              placeholder={isPersonal ? "Personal Workspace" : "Riverside Rugby"}
            />
          </div>

          <div className={`flex flex-col gap-1.5 ${isPersonal ? "md:col-span-2" : ""}`}>
            <label className="text-xs font-semibold">Sport</label>
            <select
              value={teamDefaults.sport}
              onChange={(e) => setTeamDefaults((prev) => ({ ...prev, sport: e.target.value }))}
              className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-2.5 text-sm text-BrandText outline-none transition hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
            >
              <option value="">Select sport</option>
              {SPORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value} className="bg-BrandBlack">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {!isPersonal && (
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
          )}

        </div>
      </div>
      )}

      {(user?.role === "coach" || user?.role === "owner") && !playerViewMode && !isPersonal && (
        <div className="mt-6 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 p-5">
          <div className="mb-4 flex items-center gap-2">
            <FiEye className="text-sm text-BrandOrange" />
            <p className="text-xs font-semibold uppercase tracking-widest text-BrandGray2">Player View</p>
          </div>
          <p className="text-xs text-BrandGray2">
            Preview the app as a player sees it. You'll see read-only plays, limited navigation, and player-level account options.
          </p>
          <button
            type="button"
            onClick={() => {
              setPlayerViewMode(true);
              navigate("/app/plays");
            }}
            className="mt-4 flex items-center gap-2 rounded-lg bg-BrandOrange px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            <FiEye className="text-sm" />
            Switch to Player View
          </button>
        </div>
      )}

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

      {/* Danger Zone */}
      <DangerZone
        user={user}
        teamMembers={teamMembers}
        playerViewMode={playerViewMode}
        showLeaveConfirm={showLeaveConfirm}
        setShowLeaveConfirm={setShowLeaveConfirm}
        leaveLoading={leaveLoading}
        setLeaveLoading={setLeaveLoading}
        leaveError={leaveError}
        setLeaveError={setLeaveError}
        leaveTeam={leaveTeam}
        navigate={navigate}
      />
    </div>
  );
}

/**
 * Danger Zone section — handles all leave/delete flows for every role type:
 * - player / assistant_coach / coach: free to leave
 * - owner with other members: must transfer ownership first
 * - owner sole member: delete team (soft-deletes; restorable within 30 days via admin)
 * - personal workspace: delete workspace
 */
function DangerZone({
  user,
  teamMembers,
  playerViewMode,
  showLeaveConfirm,
  setShowLeaveConfirm,
  leaveLoading,
  setLeaveLoading,
  leaveError,
  setLeaveError,
  leaveTeam,
  navigate,
}) {
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  if (!user?.teamId) return null;

  const isOwner = user?.role === "owner" && !playerViewMode;
  const isPersonal = user?.isPersonalTeam;
  const otherMembers = (teamMembers || []).filter((m) => m.id !== user?.id);
  const ownerMustTransfer = isOwner && !isPersonal && otherMembers.length > 0;
  const isDeletingTeam = isOwner && otherMembers.length === 0;

  const teamLabel = isPersonal ? "Personal Workspace" : (user?.teamName || "this team");
  const confirmTarget = isPersonal ? "Personal Workspace" : (user?.teamName || "");
  const buttonLabel = isPersonal
    ? "Delete Personal Workspace"
    : isDeletingTeam
      ? `Delete "${user?.teamName}"`
      : `Leave "${user?.teamName}"`;

  const handleLeave = async () => {
    setLeaveLoading(true);
    setLeaveError("");
    try {
      await leaveTeam(user.teamId);
      navigate("/app/plays");
    } catch (err) {
      if (err?.needsOwnerTransfer) {
        setLeaveError("You must transfer ownership before leaving.");
      } else {
        setLeaveError(err?.message || "Something went wrong.");
      }
      setShowLeaveConfirm(false);
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowLeaveConfirm(false);
    setDeleteConfirmText("");
  };

  return (
    <div className="mt-10 rounded-xl border border-red-500/20 bg-red-500/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <FiAlertTriangle className="text-sm text-red-400" />
        <p className="text-xs font-semibold uppercase tracking-widest text-red-400">Danger Zone</p>
      </div>

      {ownerMustTransfer ? (
        <div>
          <p className="text-sm font-semibold text-BrandText">Leave {teamLabel}</p>
          <p className="mt-1 text-xs text-BrandGray2">
            You are the owner of this team. You must transfer ownership to another member before you can leave.
          </p>
          <Link
            to="/app/profile"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-BrandGray2/30 px-4 py-2 text-xs font-semibold text-BrandGray transition hover:border-BrandGray hover:text-BrandText"
          >
            Go to Profile to Transfer Ownership
          </Link>
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold text-BrandText">
            {isDeletingTeam ? `Delete ${teamLabel}` : isPersonal ? "Delete Personal Workspace" : `Leave ${teamLabel}`}
          </p>
          <p className="mt-1 text-xs text-BrandGray2">
            {isDeletingTeam
              ? `You are the sole member. The team will be recoverable for 30 days via admin, then permanently deleted.`
              : isPersonal
                ? "Permanently delete your personal workspace and all plays in it."
                : `You will lose access to all plays in ${teamLabel}. Your content will remain for the team.`}
          </p>

          {leaveError && (
            <p className="mt-2 text-xs text-red-400">{leaveError}</p>
          )}

          {!showLeaveConfirm ? (
            <button
              type="button"
              onClick={() => { setShowLeaveConfirm(true); setLeaveError(""); setDeleteConfirmText(""); }}
              className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-400 transition hover:border-red-500 hover:bg-red-500/10"
            >
              {isOwner ? <FiTrash2 className="text-sm" /> : <FiLogOut className="text-sm" />}
              {buttonLabel}
            </button>
          ) : (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-BrandBlack2/30 p-3">
              <p className="text-xs font-semibold text-red-300">
                {isDeletingTeam
                  ? `Are you sure? Type the team name to confirm.`
                  : `Are you sure you want to leave "${user?.teamName}"?`}
              </p>

              {isDeletingTeam && (
                <div className="mt-2">
                  <p className="mb-1.5 text-[11px] text-BrandGray2">
                    Type <span className="font-semibold text-BrandGray">"{confirmTarget}"</span> to confirm
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={confirmTarget}
                    className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-xs text-BrandText placeholder-BrandGray2/50 outline-none focus:border-red-500/60"
                  />
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelConfirm}
                  className="flex-1 rounded-lg border border-BrandGray2/30 py-2 text-xs text-BrandGray transition hover:border-BrandGray hover:text-BrandText"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={leaveLoading || (isDeletingTeam && deleteConfirmText !== confirmTarget)}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {leaveLoading ? "Processing…" : isDeletingTeam ? "Yes, Delete" : "Yes, Leave"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
