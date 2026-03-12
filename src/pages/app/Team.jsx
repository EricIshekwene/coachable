import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppMessage } from "../../context/AppMessageContext";
import { FiCopy, FiCheck, FiShield, FiUser, FiMail, FiMessageSquare, FiX, FiSearch } from "react-icons/fi";
import { isValidEmail, isValidPhone } from "../../utils/inputValidation";
import { apiFetch } from "../../utils/api";

export default function Team() {
  const { user, teamMembers } = useAuth();
  const { showMessage } = useAppMessage();
  const isCoach = user?.role === "coach";
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    if (!isCoach || !user?.teamId) return;
    apiFetch(`/teams/${user.teamId}/invite-code`)
      .then((data) => setInviteCode(data.inviteCode || ""))
      .catch(() => {});
  }, [isCoach, user?.teamId]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMethod, setInviteMethod] = useState("email");
  const [inviteContact, setInviteContact] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [filter, setFilter] = useState("all"); // all | coach | player
  const [search, setSearch] = useState("");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showMessage("Invite code copied", "Share it with players to join your team.", "success");
    } catch {
      showMessage("Copy failed", "Clipboard access was denied.", "error");
    }
  };

  const handleSendInvite = () => {
    const contact = inviteContact.trim();
    if (!contact) {
      showMessage(
        "Missing contact",
        inviteMethod === "email" ? "Enter an email address." : "Enter a phone number.",
        "error"
      );
      return;
    }

    if (inviteMethod === "email" && !isValidEmail(contact)) {
      showMessage("Invalid email", "Please enter a valid email address.", "error");
      return;
    }

    if (inviteMethod === "text" && !isValidPhone(contact)) {
      showMessage("Invalid phone number", "Enter a valid phone number.", "error");
      return;
    }

    setInviteSent(true);
    showMessage(
      "Invite sent",
      inviteMethod === "email" ? `Invitation sent to ${contact}.` : `Text invite sent to ${contact}.`,
      "success"
    );
    setTimeout(() => {
      setInviteSent(false);
      setInviteContact("");
      setShowInviteModal(false);
    }, 1500);
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
          <p className="text-xs font-semibold">Invite players</p>
          <p className="mt-1 text-xs text-BrandGray2">
            Share your invite code or send a direct invite.
          </p>

          {/* Invite code row */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-BrandGray2/30 bg-BrandBlack px-3.5 py-2.5 font-mono text-sm tracking-wider text-BrandOrange">
              {inviteCode}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-BrandGray2/30 px-3.5 py-2.5 text-xs text-BrandGray transition hover:border-BrandGray hover:text-BrandText"
            >
              {copied ? <FiCheck className="text-BrandGreen" /> : <FiCopy />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Send invite button */}
          <button
            onClick={() => setShowInviteModal(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-BrandOrange py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            <FiMail className="text-sm" />
            Send Invite
          </button>
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
            </div>
          ))}
        </div>
      </div>

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 font-DmSans">
          <div className="w-full max-w-md rounded-xl border border-BrandGray2/20 bg-BrandBlack p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-Manrope text-base font-bold">Invite a Player</h2>
              <button
                onClick={() => { setShowInviteModal(false); setInviteContact(""); }}
                className="rounded-lg p-1.5 text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"
              >
                <FiX />
              </button>
            </div>
            <p className="mt-1.5 text-sm text-BrandGray2">
              Send an invite via email or text message.
            </p>

            {/* Method toggle */}
            <div className="mt-5 flex gap-2 rounded-lg border border-BrandGray2/20 p-1">
              <button
                onClick={() => setInviteMethod("email")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-xs font-medium transition ${
                  inviteMethod === "email"
                    ? "bg-BrandOrange/10 text-BrandOrange"
                    : "text-BrandGray2 hover:text-BrandText"
                }`}
              >
                <FiMail className="text-sm" />
                Email
              </button>
              <button
                onClick={() => setInviteMethod("text")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-xs font-medium transition ${
                  inviteMethod === "text"
                    ? "bg-BrandOrange/10 text-BrandOrange"
                    : "text-BrandGray2 hover:text-BrandText"
                }`}
              >
                <FiMessageSquare className="text-sm" />
                Text
              </button>
            </div>

            {/* Input */}
            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-xs font-semibold">
                {inviteMethod === "email" ? "Email address" : "Phone number"}
              </label>
              <input
                type={inviteMethod === "email" ? "email" : "tel"}
                value={inviteContact}
                onChange={(e) => setInviteContact(e.target.value)}
                placeholder={inviteMethod === "email" ? "player@example.com" : "(555) 123-4567"}
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-2.5 text-sm text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
                autoFocus
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSendInvite}
              disabled={!inviteContact.trim() || inviteSent}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-BrandOrange py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {inviteSent ? (
                <>
                  <FiCheck />
                  Invite Sent!
                </>
              ) : (
                <>
                  Send Invite
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
