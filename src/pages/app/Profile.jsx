import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiAlertTriangle,
  FiCheck,
  FiLogOut,
  FiShield,
  FiUserPlus,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";

export default function Profile() {
  const {
    user,
    logout,
    teamMembers,
    pendingEmailChange,
    playerViewMode,
    requestEmailChange,
    transferOwnership,
    updateProfile,
  } = useAuth();
  const navigate = useNavigate();

  const [nameInput, setNameInput] = useState(user?.name || "");
  const [emailInput, setEmailInput] = useState(user?.email || "");
  const [selectedOwnerId, setSelectedOwnerId] = useState(
    teamMembers.find((member) => member.id !== user?.id)?.id || "",
  );

  const [showNameSaved, setShowNameSaved] = useState(false);
  const [showOwnershipSaved, setShowOwnershipSaved] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [showJoinSuccess, setShowJoinSuccess] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showLeftTeam, setShowLeftTeam] = useState(false);

  const owner = useMemo(
    () => teamMembers.find((member) => member.id === user?.ownerId),
    [teamMembers, user?.ownerId],
  );

  const transferCandidates = useMemo(
    () => teamMembers.filter((member) => member.id !== user?.id),
    [teamMembers, user?.id],
  );

  const isTeamOwner = user?.ownerId === user?.id;
  const isPlayerView = playerViewMode || user?.role === "player";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSaveName = () => {
    const didSave = updateProfile({ name: nameInput });
    if (!didSave) return;

    setShowNameSaved(true);
    setTimeout(() => setShowNameSaved(false), 1800);
  };

  const handleChangeEmail = () => {
    const didRequest = requestEmailChange(emailInput);
    if (!didRequest) {
      setEmailError("Enter a new email address to continue.");
      return;
    }

    setEmailError("");
    navigate("/app/profile/verify-email");
  };

  const handleTransferOwnership = () => {
    if (!selectedOwnerId) return;

    const nextOwner = transferCandidates.find((member) => member.id === selectedOwnerId);
    if (!nextOwner) return;

    const confirmed = window.confirm(`Transfer ownership to ${nextOwner.name}?`);
    if (!confirmed) return;

    const didTransfer = transferOwnership(selectedOwnerId);
    if (!didTransfer) return;

    setShowOwnershipSaved(true);
    setTimeout(() => setShowOwnershipSaved(false), 1800);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:px-10 md:py-12">
      <h1 className="font-Manrope text-xl font-bold tracking-tight">Profile</h1>

      <div className="mt-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-BrandOrange/15 text-xl font-bold text-BrandOrange">
          {user?.name?.[0] || "?"}
        </div>
        <div>
          <p className="font-Manrope text-base font-semibold">{user?.name || "Guest"}</p>
          <p className="text-xs capitalize text-BrandGray2">{isPlayerView ? "player" : (user?.role || "No role")}</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-BrandGray2">Account Info</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold">Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-2.5 text-sm text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
                placeholder="Your name"
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={!nameInput.trim() || nameInput.trim() === user?.name}
                className="rounded-lg bg-BrandOrange px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
            </div>
            {showNameSaved && (
              <p className="flex items-center gap-1 text-xs text-BrandGreen">
                <FiCheck className="text-xs" />
                Name updated.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold">Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (emailError) setEmailError("");
                }}
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-2.5 text-sm text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
                placeholder="name@example.com"
              />
              <button
                type="button"
                onClick={handleChangeEmail}
                disabled={!emailInput.trim() || emailInput.trim() === user?.email}
                className="rounded-lg border border-BrandOrange/40 px-4 py-2.5 text-sm font-semibold text-BrandOrange transition hover:bg-BrandOrange/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Verify
              </button>
            </div>
            {emailError && <p className="text-xs text-red-400">{emailError}</p>}
            {pendingEmailChange?.nextEmail && (
              <p className="text-xs text-BrandGray2">
                Verification pending for <span className="font-semibold text-BrandText">{pendingEmailChange.nextEmail}</span>.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-BrandGray2/20 bg-BrandBlack2/20 px-3 py-3 md:col-span-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-BrandGray2/15 text-BrandGray">
              <FiShield className="text-sm" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-BrandGray2">Role</p>
              <p className="text-sm font-semibold capitalize">{isPlayerView ? "player" : (user?.role || "No role")}</p>
            </div>
          </div>
        </div>
      </div>

      {!isPlayerView && (
        <div className="mt-6 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 p-5">
          <div className="flex items-center gap-2">
            <FiUsers className="text-sm text-BrandOrange" />
            <p className="text-xs font-semibold uppercase tracking-widest text-BrandGray2">Ownership</p>
          </div>

          <p className="mt-2 text-sm text-BrandGray2">
            Current team owner: <span className="font-semibold text-BrandText">{owner?.name || "Unknown"}</span>
          </p>

          {(user?.role === "coach" || user?.role === "owner") && isTeamOwner ? (
            <>
              <div className="mt-4 flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Transfer ownership to</label>
                <select
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-2.5 text-sm text-BrandText outline-none transition hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
                >
                  {transferCandidates.length === 0 && <option value="">No eligible members</option>}
                  {transferCandidates.map((member) => (
                    <option key={member.id} value={member.id} className="bg-BrandBlack">
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleTransferOwnership}
                disabled={!selectedOwnerId || transferCandidates.length === 0}
                className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2.5 text-sm text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FiAlertTriangle className="text-sm" />
                Transfer Ownership
              </button>

              {showOwnershipSaved && (
                <p className="mt-2 flex items-center gap-1 text-xs text-BrandGreen">
                  <FiCheck className="text-xs" />
                  Ownership transferred.
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 text-xs text-BrandGray2">
              Only the current team owner can transfer ownership.
            </p>
          )}
        </div>
      )}

      {/* Team Management — player view */}
      {isPlayerView && (
        <div className="mt-6 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 p-5">
          <div className="flex items-center gap-2">
            <FiUsers className="text-sm text-BrandOrange" />
            <p className="text-xs font-semibold uppercase tracking-widest text-BrandGray2">Team</p>
          </div>

          {user?.teamName && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-BrandGray2/20 bg-BrandBlack2/20 px-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-BrandOrange/15 text-sm font-bold text-BrandOrange">
                {user.teamName[0]}
              </div>
              <div>
                <p className="text-sm font-semibold">{user.teamName}</p>
                <p className="text-[11px] text-BrandGray2 capitalize">{user.sport || "No sport set"}</p>
              </div>
            </div>
          )}

          {/* Join another team */}
          <div className="mt-4">
            <label className="text-xs font-semibold">Join another team</label>
            <p className="mt-0.5 text-[11px] text-BrandGray2">Enter the team invite code from your coach.</p>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-2.5 font-mono text-sm tracking-wider text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
              />
              <button
                type="button"
                onClick={() => {
                  if (!teamCode.trim()) return;
                  setShowJoinSuccess(true);
                  setTeamCode("");
                  setTimeout(() => setShowJoinSuccess(false), 2000);
                }}
                disabled={!teamCode.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FiUserPlus className="text-sm" />
                Join
              </button>
            </div>
            {showJoinSuccess && (
              <p className="mt-2 flex items-center gap-1 text-xs text-BrandGreen">
                <FiCheck className="text-xs" />
                Request sent! Waiting for coach approval.
              </p>
            )}
          </div>

          {/* Leave team */}
          {user?.teamName && (
            <div className="mt-5 border-t border-BrandGray2/15 pt-4">
              {!showLeaveConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2.5 text-sm text-red-300 transition hover:bg-red-500/10"
                >
                  <FiXCircle className="text-sm" />
                  Leave {user.teamName}
                </button>
              ) : (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-xs text-red-300">
                    Are you sure you want to leave <span className="font-semibold">{user.teamName}</span>? You'll lose access to all plays.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLeaveConfirm(false);
                        setShowLeftTeam(true);
                        setTimeout(() => setShowLeftTeam(false), 2500);
                      }}
                      className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-600"
                    >
                      Yes, leave team
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLeaveConfirm(false)}
                      className="rounded-lg border border-BrandGray2/30 px-4 py-2 text-xs text-BrandGray transition hover:border-BrandGray hover:text-BrandText"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {showLeftTeam && (
                <p className="mt-2 flex items-center gap-1 text-xs text-red-400">
                  <FiCheck className="text-xs" />
                  You have left the team.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleLogout}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10"
      >
        <FiLogOut />
        Log out
      </button>
    </div>
  );
}
