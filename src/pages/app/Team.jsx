import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Input, Section, Tabs, TokenBox } from "../../design-system/components";
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
    <Card padding="sm" style={{ backgroundColor: "var(--ui-surface-2)" }}>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ui-text-muted)" }}>
        <Icon className="text-[10px]" /> {label}
      </p>

      {/* Code + actions row */}
      <div className="flex items-center gap-2">
        <TokenBox value={code} className="flex-1" />
        <Button variant="outline"
          onClick={() => onCopy(role)}
          className="flex items-center gap-1.5 rounded-lg border border-[color:var(--ui-border)] px-3 py-2.5 text-xs text-[color:var(--ui-text-muted)] transition hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text)]"
          title={`Copy ${role} code`}
        >
          {copiedRole === role ? <FiCheck className="text-BrandGreen" /> : <FiCopy />}
        </Button>
        <Button variant="outline"
          onClick={() => onRotate(role)}
          className="flex items-center gap-1.5 rounded-lg border border-[color:var(--ui-border)] px-3 py-2.5 text-xs text-[color:var(--ui-text-muted)] transition hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text)]"
          title={`Generate new ${role} code`}
        >
          <FiRefreshCw />
        </Button>
      </div>

      {isCoachCode && (
        <p className="mt-1.5 text-[11px]" style={{ color: "var(--ui-text-subtle)" }}>
          Only share the coach code with people you trust.
        </p>
      )}

      {/* Inline email invite */}
      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--ui-text-subtle)" }} />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder={isCoachCode ? "coach@example.com" : "player@example.com"}
            maxLength={254}
            autoComplete="email"
            className="w-full rounded-lg border border-[color:var(--ui-border)] py-2 pl-8 pr-3 text-xs outline-none transition hover:border-[color:var(--ui-border-strong)] focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
            style={{ backgroundColor: "var(--ui-surface-2)", color: "var(--ui-text)" }}
          />
        </div>
        <Button variant="primary"
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
        </Button>
      </div>
    </Card>
  );
}

export default function Team() {
  const { user, teamMembers, removeMember, playerViewMode } = useAuth();
  const { showMessage } = useAppMessage();

  const isOwner = (user?.role === "owner" || user?.id === user?.ownerId) && !playerViewMode;
  const isCoach = (user?.role === "coach" || isOwner) && !playerViewMode;
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

  // Solo users do not have a real team, but hooks must still run in a stable order.
  if (user?.isPersonalTeam) {
    return (
      <EmptyState
        icon={<FiUser />}
        title="You're in solo mode"
        description="Create or join a team from Settings to collaborate with coaches and players."
      />
    );
  }

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

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:px-10 md:py-12">
      <h1 className="font-Manrope text-xl font-bold tracking-tight">Team</h1>

      {/* Team info card */}
      <Card className="mt-6" style={{ backgroundColor: "var(--ui-surface-2)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--ui-text-subtle)" }}>Team name</p>
            <p className="mt-1 font-Manrope text-base font-semibold">
              {user?.teamName || "My Team"}
            </p>
          </div>
          {user?.sport && (
            <Badge tone="info">{user.sport}</Badge>
          )}
        </div>
      </Card>

      {/* Invite section (coach only) */}
      {isCoach && (
        <Card className="mt-6" style={{ backgroundColor: "var(--ui-surface-2)" }}>
          <Section title="Invite codes" subtitle="Share the right code based on the person's role, or send an invite email directly." variant="compact">

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
          </Section>
        </Card>
      )}

      {/* Members list */}
      <Section
        className="mt-6"
        title={`Members (${filteredMembers.length})`}
        variant="compact"
        actions={(
          <Tabs
            size="sm"
            value={filter}
            onChange={setFilter}
            items={[
              { value: "all", label: "All" },
              { value: "coach", label: "Coaches" },
              { value: "player", label: "Players" },
            ]}
          />
        )}
      >

        {/* Search */}
        <div className="relative mt-3">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--ui-text-subtle)" }} />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            maxLength={100}
            className="w-full rounded-lg border border-[color:var(--ui-border)] py-2.5 pl-9 pr-3.5 text-sm outline-none transition hover:border-[color:var(--ui-border-strong)] focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
            style={{ backgroundColor: "var(--ui-surface-2)", color: "var(--ui-text)" }}
          />
        </div>

        <div className="mt-3 flex flex-col gap-1">
          {filteredMembers.length === 0 && (
            <p className="py-6 text-center text-sm" style={{ color: "var(--ui-text-subtle)" }}>No members found</p>
          )}
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-[color:var(--ui-surface)]"
            >
              <Avatar name={member.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{member.name}</p>
                <p className="truncate text-[11px]" style={{ color: "var(--ui-text-subtle)" }}>{member.email}</p>
              </div>
              <Badge tone={member.role === "coach" ? "warning" : "default"} size="xs" dot>
                {member.role}
              </Badge>
              {member.id === user?.ownerId && (
                <Badge tone="success" size="xs">Owner</Badge>
              )}
              {isOwner && member.id !== user?.id && (
                <Button variant="danger"
                  onClick={() => setConfirmRemove(member)}
                  disabled={removingId === member.id}
                  className="rounded-md p-1.5 text-[color:var(--ui-text-subtle)] transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                  title={`Remove ${member.name}`}
                >
                  <FiUserMinus className="text-sm" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Remove member confirmation dialog */}
      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove member"
        description={confirmRemove ? `Remove ${confirmRemove.name} from the team? This action cannot be undone. They will be notified by email.` : ""}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={handleRemoveMember}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
