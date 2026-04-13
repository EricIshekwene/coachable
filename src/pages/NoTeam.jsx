import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { FiUserPlus, FiPlusCircle, FiUser } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

/**
 * NoTeam page — safety net shown when an authenticated, onboarded user
 * somehow has no team memberships. Lets them recover by joining, creating,
 * or getting a personal workspace.
 */
export default function NoTeam() {
  const { user, allTeams, joinTeam, createTeam, createPersonalWorkspace } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState("menu"); // "menu" | "join" | "create"
  const [inviteCode, setInviteCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [sport, setSport] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    } catch (err) {
      setError(err?.message || "Invalid invite code.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = teamName.trim();
    if (name.length < 2) {
      setError("Team name must be at least 2 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await createTeam(name, sport || undefined);
      navigate("/app/plays");
    } catch (err) {
      setError(err?.message || "Failed to create team.");
    } finally {
      setLoading(false);
    }
  };

  const handlePersonal = async () => {
    setLoading(true);
    setError("");
    try {
      await createPersonalWorkspace();
      navigate("/app/plays");
    } catch (err) {
      setError(err?.message || "Failed to create personal workspace.");
    } finally {
      setLoading(false);
    }
  };

  if (allTeams.length > 0) {
    return <Navigate to="/app/plays" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-BrandBlack px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-Manrope text-xl font-bold tracking-tight text-BrandText">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-2 text-sm text-BrandGray2">
          You&apos;re not currently on any teams. Choose how you&apos;d like to continue.
        </p>

        {error && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        {view === "menu" && (
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => { setView("join"); setError(""); }}
              className="flex items-center gap-3 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 px-4 py-4 text-left transition hover:border-BrandOrange/40 hover:bg-BrandBlack2/60"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-BrandOrange/15">
                <FiUserPlus className="text-BrandOrange" />
              </div>
              <div>
                <p className="text-sm font-semibold">Join a Team</p>
                <p className="text-xs text-BrandGray2">Enter an invite code from your coach</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => { setView("create"); setError(""); }}
              className="flex items-center gap-3 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 px-4 py-4 text-left transition hover:border-BrandOrange/40 hover:bg-BrandBlack2/60"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-BrandOrange/15">
                <FiPlusCircle className="text-BrandOrange" />
              </div>
              <div>
                <p className="text-sm font-semibold">Create a Team</p>
                <p className="text-xs text-BrandGray2">Start a new team and invite members</p>
              </div>
            </button>

            <button
              type="button"
              onClick={handlePersonal}
              disabled={loading}
              className="flex items-center gap-3 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 px-4 py-4 text-left transition hover:border-BrandOrange/40 hover:bg-BrandBlack2/60 disabled:opacity-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-BrandOrange/15">
                <FiUser className="text-BrandOrange" />
              </div>
              <div>
                <p className="text-sm font-semibold">Just Make Plays</p>
                <p className="text-xs text-BrandGray2">Personal workspace, no team needed</p>
              </div>
            </button>
          </div>
        )}

        {view === "join" && (
          <form onSubmit={handleJoin} className="mt-6 flex flex-col gap-3">
            <p className="text-xs text-BrandGray2">
              Enter the 6-character code your coach shared with you.
            </p>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3"
              maxLength={8}
              autoFocus
              className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-3 font-mono text-sm tracking-widest text-BrandText outline-none placeholder:text-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setView("menu"); setError(""); }}
                className="flex-1 rounded-lg border border-BrandGray2/30 py-2.5 text-sm text-BrandGray transition hover:border-BrandGray hover:text-BrandText"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || inviteCode.trim().length < 6}
                className="flex-1 rounded-lg bg-BrandOrange py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                {loading ? "Joining…" : "Join Team"}
              </button>
            </div>
          </form>
        )}

        {view === "create" && (
          <form onSubmit={handleCreate} className="mt-6 flex flex-col gap-3">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              autoFocus
              className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-3 text-sm text-BrandText outline-none placeholder:text-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
            />
            <input
              type="text"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              placeholder="Sport (optional)"
              className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-3 text-sm text-BrandText outline-none placeholder:text-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setView("menu"); setError(""); }}
                className="flex-1 rounded-lg border border-BrandGray2/30 py-2.5 text-sm text-BrandGray transition hover:border-BrandGray hover:text-BrandText"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || teamName.trim().length < 2}
                className="flex-1 rounded-lg bg-BrandOrange py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                {loading ? "Creating…" : "Create Team"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
