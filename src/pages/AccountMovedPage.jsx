import { useState } from "react";
import logo from "../assets/logos/White_Full_Coachable.png";
import { useAuth } from "../context/AuthContext";
import { useMigrationStatus } from "../context/MigrationStatusContext";
import { V2_APP_URL } from "../utils/migrationDestination";

/**
 * Full-screen interstitial shown to a coach whose team has moved to the new
 * Coachable. Deliberately a copy of MaintenancePage's markup and styles — this
 * is V1's own look, not a new design.
 *
 * Never auto-redirects: the coach clicks the link. An automatic redirect on a
 * stale status cache would be unrecoverable for them.
 *
 * If the coach still has a team that has NOT moved, this page offers a button
 * per unmoved team that switches to it and drops them straight back into V1.
 */
export default function AccountMovedPage() {
  const { user, switchTeam } = useAuth();
  const { movedTeams, stayingTeams } = useMigrationStatus();
  const [switching, setSwitching] = useState(null);

  const activeTeamName =
    movedTeams.find((t) => t.teamId === user?.teamId)?.teamName || user?.teamName || "Your team";

  /**
   * Switch the session to a team that has not moved, so the coach lands back
   * in the normal V1 app for that team.
   * @param {string} teamId
   */
  const handleSwitch = async (teamId) => {
    setSwitching(teamId);
    try {
      await switchTeam(teamId);
    } catch {
      // Leave them here rather than on a broken screen; they can retry.
      setSwitching(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-BrandBlack px-6 py-16 text-center">
      <img src={logo} alt="Coachable" className="mb-12 block h-8 w-auto object-contain opacity-90" />

      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 px-8 py-10 shadow-xl">
        <div className="mb-4 flex items-center justify-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-BrandOrange/15">
            <svg
              className="h-6 w-6 text-BrandOrange"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m3-7.5h-6m6 0v6m0-6L10.5 13.5"
              />
            </svg>
          </span>
        </div>

        <h1 className="font-Manrope text-2xl font-extrabold tracking-tight text-white">
          {activeTeamName} has moved to the new Coachable
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-BrandGray">
          Your account is now on the new Coachable. All of your plays, playbooks
          and team info came with you — nothing was lost, and it is already
          there waiting for you. Sign in with the same email and password.
        </p>

        <a
          href={V2_APP_URL}
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-BrandOrange px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Go to the new Coachable
        </a>

        <p className="mt-3 text-xs text-BrandGray">
          Bookmark {V2_APP_URL.replace("https://", "")}
        </p>

        {stayingTeams.length > 0 && (
          <div className="mt-8 border-t border-white/10 pt-6 text-left">
            <p className="text-sm leading-relaxed text-BrandGray">
              {stayingTeams.length === 1
                ? "Your other team has not moved yet. You can keep working on it here:"
                : "Your other teams have not moved yet. You can keep working on them here:"}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {stayingTeams.map((team) => (
                <button
                  key={team.teamId}
                  type="button"
                  onClick={() => handleSwitch(team.teamId)}
                  disabled={switching !== null}
                  className="w-full rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                >
                  {switching === team.teamId
                    ? `Switching to ${team.teamName}…`
                    : `Continue with ${team.teamName}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
