import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiChevronDown,
  FiCheck,
  FiUsers,
  FiUserPlus,
  FiPlusCircle,
  FiUser,
  FiX,
  FiArrowRight,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS = {
  owner: "Owner",
  coach: "Coach",
  assistant_coach: "Asst. Coach",
  player: "Player",
};

/** Sports that map to a supported field type in the editor. */
const SPORT_OPTIONS = [
  { value: "rugby", label: "Rugby" },
  { value: "soccer", label: "Soccer" },
  { value: "football", label: "Football" },
  { value: "lacrosse", label: "Lacrosse" },
  { value: "womens lacrosse", label: "Women's Lacrosse" },
  { value: "basketball", label: "Basketball" },
  { value: "blank", label: "Blank Canvas" },
];

/**
 * TeamSwitcher — shows the active team name and opens a dropdown
 * that lets the user switch teams, join a new team, create a team,
 * or create a personal workspace.
 */
export default function TeamSwitcher() {
  const { user, allTeams, switchTeam, joinTeam, createTeam, createPersonalWorkspace } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  // "list" | "join" | "create" | "personal"
  const [view, setView] = useState("list");
  const [inviteCode, setInviteCode] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamSport, setNewTeamSport] = useState("");
  const [personalName, setPersonalName] = useState("");
  const [personalSport, setPersonalSport] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setView("list");
    setInviteCode("");
    setNewTeamName("");
    setNewTeamSport("");
    setPersonalName("");
    setPersonalSport("");
    setError("");
  };

  const handleSwitch = async (teamId) => {
    if (teamId === user?.teamId) {
      handleClose();
      return;
    }
    setLoading(true);
    try {
      await switchTeam(teamId);
      navigate("/app/plays");
    } catch {
      // ignore — team might have been removed
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 6) {
      setError("Enter a valid 6-character invite code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await joinTeam(code);
      navigate("/app/plays");
      handleClose();
    } catch (err) {
      setError(err?.message || "Invalid invite code.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newTeamName.trim();
    if (name.length < 2) {
      setError("Team name must be at least 2 characters.");
      return;
    }
    if (!newTeamSport) {
      setError("Please select a sport.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await createTeam(name, newTeamSport);
      navigate("/app/plays");
      handleClose();
    } catch (err) {
      setError(err?.message || "Failed to create team.");
    } finally {
      setLoading(false);
    }
  };

  const handlePersonal = async (e) => {
    e.preventDefault();
    if (!personalSport) {
      setError("Please select a sport.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await createPersonalWorkspace(personalName.trim() || undefined, personalSport);
      navigate("/app/plays");
      handleClose();
    } catch (err) {
      setError(err?.message || "Failed to create personal workspace.");
    } finally {
      setLoading(false);
    }
  };

  const isPersonal = user?.isPersonalTeam;
  const displayName = isPersonal ? (user?.teamName || "Personal Workspace") : (user?.teamName || "My Team");

  const viewTitle = {
    list: "Switch Team",
    join: "Join a Team",
    create: "Create a Team",
    personal: "Personal Workspace",
  }[view];

  return (
    <div className="relative mx-4 mb-4" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-left transition hover:border-BrandGray2/60 hover:bg-BrandBlack2/80"
      >
        <p className="text-[10px] uppercase tracking-widest text-BrandGray2">
          {isPersonal ? "Solo Mode" : "Team"}
        </p>
        <div className="flex items-center justify-between gap-1">
          <p className="truncate text-xs font-semibold">{displayName}</p>
          <FiChevronDown
            className={`shrink-0 text-xs text-BrandGray2 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-BrandGray2/20 bg-BrandBlack shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-BrandGray2/10 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-BrandGray2">
              {viewTitle}
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="rounded p-0.5 text-BrandGray2 hover:text-BrandText"
            >
              <FiX className="text-xs" />
            </button>
          </div>

          {/* List view */}
          {view === "list" && (
            <div className="py-1">
              {allTeams.map((t) => (
                <button
                  key={t.teamId}
                  type="button"
                  onClick={() => handleSwitch(t.teamId)}
                  disabled={loading}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-BrandBlack2/60 disabled:opacity-50"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-BrandOrange/15 text-[10px] font-bold text-BrandOrange">
                    {t.isPersonal ? <FiUser className="text-xs" /> : (t.teamName?.[0] || "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">
                      {t.isPersonal ? (t.teamName || "Personal Workspace") : t.teamName}
                    </p>
                    <p className="text-[10px] text-BrandGray2">
                      {t.isPersonal ? "solo" : ROLE_LABELS[t.role] || t.role}
                    </p>
                  </div>
                  {t.teamId === user?.teamId && (
                    <FiCheck className="shrink-0 text-sm text-BrandOrange" />
                  )}
                </button>
              ))}

              <div className="border-t border-BrandGray2/10 pt-1">
                <button
                  type="button"
                  onClick={() => { setView("join"); setError(""); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-BrandGray transition hover:bg-BrandBlack2/60 hover:text-BrandText"
                >
                  <FiUserPlus className="text-sm text-BrandGray2" />
                  Join a Team
                </button>
                <button
                  type="button"
                  onClick={() => { setView("create"); setError(""); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-BrandGray transition hover:bg-BrandBlack2/60 hover:text-BrandText"
                >
                  <FiPlusCircle className="text-sm text-BrandGray2" />
                  Create a Team
                </button>
                <button
                  type="button"
                  onClick={() => { setView("personal"); setPersonalSport(user?.sport || ""); setError(""); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-BrandGray transition hover:bg-BrandBlack2/60 hover:text-BrandText"
                >
                  <FiUsers className="text-sm text-BrandGray2" />
                  Create Personal Workspace
                </button>
              </div>
            </div>
          )}

          {/* Join view */}
          {view === "join" && (
            <form onSubmit={handleJoin} className="p-3 flex flex-col gap-2">
              <p className="text-[11px] text-BrandGray2">
                Enter the 6-character code your coach shared with you.
              </p>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3"
                maxLength={8}
                autoFocus
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm font-mono tracking-widest text-BrandText outline-none placeholder:text-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
              />
              {error && <p className="text-[11px] text-red-400">{error}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setView("list"); setError(""); }}
                  className="flex-1 rounded-lg border border-BrandGray2/30 py-2 text-xs text-BrandGray transition hover:border-BrandGray2 hover:text-BrandText"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || inviteCode.trim().length < 6}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-BrandOrange py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                >
                  {loading ? "Joining…" : <>Join <FiArrowRight /></>}
                </button>
              </div>
            </form>
          )}

          {/* Create team view */}
          {view === "create" && (
            <form onSubmit={handleCreate} className="p-3 flex flex-col gap-2">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team name"
                autoFocus
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none placeholder:text-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
              />
              <select
                value={newTeamSport}
                onChange={(e) => setNewTeamSport(e.target.value)}
                required
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
              >
                <option value="" disabled>Select sport</option>
                {SPORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-BrandBlack">
                    {s.label}
                  </option>
                ))}
              </select>
              {error && <p className="text-[11px] text-red-400">{error}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setView("list"); setError(""); }}
                  className="flex-1 rounded-lg border border-BrandGray2/30 py-2 text-xs text-BrandGray transition hover:border-BrandGray2 hover:text-BrandText"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || newTeamName.trim().length < 2 || !newTeamSport}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-BrandOrange py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                >
                  {loading ? "Creating…" : <>Create <FiArrowRight /></>}
                </button>
              </div>
            </form>
          )}

          {/* Create personal workspace view */}
          {view === "personal" && (
            <form onSubmit={handlePersonal} className="p-3 flex flex-col gap-2">
              <input
                type="text"
                value={personalName}
                onChange={(e) => setPersonalName(e.target.value)}
                placeholder="Workspace name (optional)"
                autoFocus
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none placeholder:text-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
              />
              <select
                value={personalSport}
                onChange={(e) => setPersonalSport(e.target.value)}
                required
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
              >
                <option value="" disabled>Select sport</option>
                {SPORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-BrandBlack">
                    {s.label}
                  </option>
                ))}
              </select>
              {error && <p className="text-[11px] text-red-400">{error}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setView("list"); setError(""); }}
                  className="flex-1 rounded-lg border border-BrandGray2/30 py-2 text-xs text-BrandGray transition hover:border-BrandGray2 hover:text-BrandText"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !personalSport}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-BrandOrange py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                >
                  {loading ? "Creating…" : <>Create <FiArrowRight /></>}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
