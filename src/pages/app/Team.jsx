import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppMessage } from "../../context/AppMessageContext";
import { FiCopy, FiCheck, FiShield, FiUser, FiMail, FiSearch, FiRefreshCw, FiSend, FiUserMinus } from "react-icons/fi";
import { isValidEmail } from "../../utils/inputValidation";
import { apiFetch } from "../../utils/api";

function InviteCodeSection({ role, code, copiedRole, onCopy, onRotate, onSendInvite, sending }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const isCoachCode = role === "coach";
  const Icon = isCoachCode ? FiShield : FiUser;
  const label = isCoachCode ? "Coach Code" : "Player Code";

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed || !isValidEmail(trimmed)) return;
    const ok = await onSendInvite(trimmed, role);
    if (ok) {
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setEmail("");
      }, 2000);
    }
  };

  return (
    <div className="rounded-lg border border-BrandGray2/20 bg-BrandBlack2/20 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-BrandGray">
        <Icon className="text-[10px]" /> {label}
      </p>

      {/* Code + actions row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg border border-BrandGray2/30 bg-BrandBlack px-3.5 py-2.5 font-mono text-sm tracking-wider text-BrandOrange">
          {code}
        </div>
        <button
          onClick={() => onCopy(role)}
          className="flex items-center gap-1.5 rounded-lg border border-BrandGray2/30 px-3 py-2.5 text-xs text-BrandGray transition hover:border-BrandGray hover:text-BrandText"
          title={`Copy ${role} code`}
        >
          {copiedRole === role ? <FiCheck className="text-BrandGreen" /> : <FiCopy />}
        </button>
        <button
          onClick={() => onRotate(role)}
          className="flex items-center gap-1.5 rounded-lg border border-BrandGray2/30 px-3 py-2.5 text-xs text-BrandGray transition hover:border-BrandGray hover:text-BrandText"
          title={`Generate new ${role} code`}
        >
          <FiRefreshCw />
        </button>
      </div>

      {isCoachCode && (
        <p className="mt-1.5 text-[11px] text-BrandGray2">
          Only share the coach code with people you trust.
        </p>
      )}

      {/* Inline email invite */}
      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-BrandGray2" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder={isCoachCode ? "coach@example.com" : "player@example.com"}
            className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 py-2 pl-8 pr-3 text-xs text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!email.trim() || sending || sent}
          className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sent ? (
            <>
              <FiCheck className="text-xs" />
              Sent
            </>
          ) : sending ? (
            "Sending..."
          ) : (
            <>
              <FiSend className="text-xs" />
              Invite
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function Team() {
  const { user, teamMembers, removeMember } = useAuth();
  const { showMessage } = useAppMessage();

  // Solo users don't have a real team — show a CTA instead
  if (user?.isPersonalTeam) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-BrandGray2/10">
          <FiUser className="text-2xl text-BrandGray2" />
        </div>
        <h1 className="mt-6 font-Manrope text-xl font-bold tracking-tight">You're in solo mode</h1>
        <p className="mt-2 text-sm text-BrandGray">
          You're creating plays on your own. Create or join a team to collaborate with coaches and players.
        </p>
        <p className="mt-4 text-xs text-BrandGray2">
          You can create or join a team from Settings.
        </p>
      </div>
    );
  }
  const isOwner = user?.role === "owner" || user?.id === user?.ownerId;
  const isCoach = user?.role === "coach" || isOwner;
  const [copiedRole, setCopiedRole] = useState(null);
  const [inviteCodes, setInviteCodes] = useState({ player: "", coach: "" });
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null); // member object or null

  useEffect(() => {
    if (!isCoach || !user?.teamId) return;
    apiFetch(`/teams/${user.teamId}/invite-codes`)
      .then((data) => setInviteCodes(data.codes || { player: "", coach: "" }))
      .catch(() => {});
  }, [isCoach, user?.teamId]);

  const handleCopy = async (role) => {
    try {
      await navigator.clipboard.writeText(inviteCodes[role]);
      setCopiedRole(role);
      setTimeout(() => setCopiedRole(null), 2000);
      showMessage(
        `${role === "coach" ? "Coach" : "Player"} code copied`,
        role === "coach"
          ? "Share this only with trusted coaches."
          : "Share this with players to join your team.",
        "success"
      );
    } catch {
      showMessage("Copy failed", "Clipboard access was denied.", "error");
    }
  };

  const handleRotate = async (role) => {
    try {
      const data = await apiFetch(`/teams/${user.teamId}/invite-codes/rotate`, {
        method: "POST",
        body: { role },
      });
      setInviteCodes((prev) => ({ ...prev, [role]: data.code }));
      showMessage(
        `${role === "coach" ? "Coach" : "Player"} code rotated`,
        "The old code will no longer work.",
        "success"
      );
    } catch {
      showMessage("Rotate failed", "Could not generate a new code.", "error");
    }
  };

  const handleSendInvite = async (email, role) => {
    if (!isValidEmail(email)) {
      showMessage("Invalid email", "Please enter a valid email address.", "error");
      return false;
    }
    setSending(true);
    try {
      await apiFetch(`/teams/${user.teamId}/invites`, {
        method: "POST",
        body: { email, role },
      });
      showMessage(
        "Invite sent",
        `Invitation emailed to ${email}.`,
        "success"
      );
      return true;
    } catch (err) {
      showMessage("Invite failed", err.message || "Could not send invite email.", "error");
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!confirmRemove) return;
    const member = confirmRemove;
    setConfirmRemove(null);
    setRemovingId(member.id);
    try {
      await removeMember(member.id);
      showMessage("Member removed", `${member.name} has been removed from the team.`, "success");
    } catch (err) {
      showMessage("Remove failed", err.message || "Could not remove member.", "error");
    } finally {
      setRemovingId(null);
    }
  };

  const filteredMembers = teamMembers.filter((m) => {
    if (filter !== "all" && m.role !== filter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filterBtn = (value, label) => (
    <button
      onClick={() => setFilter(value)}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
        filter === value
          ? "bg-BrandOrange/10 text-BrandOrange"
          : "text-BrandGray2 hover:text-BrandText"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:px-10 md:py-12">
      <h1 className="font-Manrope text-xl font-bold tracking-tight">Team</h1>

      {/* Team info card */}
      <div className="mt-6 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-BrandGray2">Team name</p>
            <p className="mt-1 font-Manrope text-base font-semibold">
              {user?.teamName || "My Team"}
            </p>
          </div>
          {user?.sport && (
            <span className="rounded-md bg-BrandOrange/10 px-2.5 py-1 text-xs text-BrandOrange capitalize">
              {user.sport}
            </span>
          )}
        </div>
      </div>

      {/* Invite section (coach only) */}
      {isCoach && (
        <div className="mt-6 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 p-5">
          <p className="text-xs font-semibold">Invite codes</p>
          <p className="mt-1 mb-4 text-xs text-BrandGray2">
            Share the right code based on the person's role, or send an invite email directly.
          </p>

          <div className="flex flex-col gap-3">
            <InviteCodeSection
              role="player"
              code={inviteCodes.player}
              copiedRole={copiedRole}
              onCopy={handleCopy}
              onRotate={handleRotate}
              onSendInvite={handleSendInvite}
              sending={sending}
            />
            <InviteCodeSection
              role="coach"
              code={inviteCodes.coach}
              copiedRole={copiedRole}
              onCopy={handleCopy}
              onRotate={handleRotate}
              onSendInvite={handleSendInvite}
              sending={sending}
            />
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">
            Members <span className="font-normal text-BrandGray2">({filteredMembers.length})</span>
          </p>
          <div className="flex items-center gap-1">
            {filterBtn("all", "All")}
            {filterBtn("coach", "Coaches")}
            {filterBtn("player", "Players")}
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-BrandGray2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 py-2.5 pl-9 pr-3.5 text-sm text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
          />
        </div>

        <div className="mt-3 flex flex-col gap-1">
          {filteredMembers.length === 0 && (
            <p className="py-6 text-center text-sm text-BrandGray2">No members found</p>
          )}
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-BrandBlack2/50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-BrandGray2/20 text-xs font-bold text-BrandGray">
                {member.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{member.name}</p>
                <p className="truncate text-[11px] text-BrandGray2">{member.email}</p>
              </div>
              <span
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                  member.role === "coach"
                    ? "bg-BrandOrange/10 text-BrandOrange"
                    : "bg-BrandGray2/15 text-BrandGray"
                }`}
              >
                {member.role === "coach" ? <FiShield className="text-[9px]" /> : <FiUser className="text-[9px]" />}
                {member.role}
              </span>
              {member.id === user?.ownerId && (
                <span className="rounded-md bg-BrandGreen/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-BrandGreen">
                  Owner
                </span>
              )}
              {isOwner && member.id !== user?.id && (
                <button
                  onClick={() => setConfirmRemove(member)}
                  disabled={removingId === member.id}
                  className="rounded-md p-1.5 text-BrandGray2 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                  title={`Remove ${member.name}`}
                >
                  <FiUserMinus className="text-sm" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Remove member confirmation modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setConfirmRemove(null)}>
          <div className="w-full max-w-sm rounded-xl border border-BrandGray2/20 bg-BrandBlack p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                <FiUserMinus className="text-red-400" />
              </div>
              <div>
                <h2 className="font-Manrope text-base font-bold text-BrandText">Remove member</h2>
                <p className="text-xs text-BrandGray2">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-BrandGray leading-relaxed">
              Remove <strong className="text-BrandText">{confirmRemove.name}</strong> from the team? They will be notified by email.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmRemove(null)}
                className="rounded-lg border border-BrandGray2/40 px-3.5 py-2 text-sm text-BrandGray transition hover:text-BrandText"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMember}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
