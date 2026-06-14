import { Alert, Avatar, Button, Card, ConfirmDialog, Divider, IconBubble, Input, Section, Select } from "../../design-system/components";
import { useMemo, useState, useRef, useCallback } from "react";
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
import { AppShell } from "../../components/layout";

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

  const [confirmModal, setConfirmModal] = useState({ open: false });
  const confirmResolveRef = useRef(null);

  /** Open a custom confirmation modal and return a promise resolving to true/false. */
  const openConfirm = useCallback((opts) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmModal({ open: true, ...opts });
    });
  }, []);

  const handleConfirmOk = () => {
    setConfirmModal({ open: false });
    confirmResolveRef.current?.(true);
  };

  const handleConfirmCancel = () => {
    setConfirmModal({ open: false });
    confirmResolveRef.current?.(false);
  };

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

  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const handleChangeEmail = async () => {
    if (!emailInput.trim() || emailInput.trim().toLowerCase() === user?.email) {
      setEmailError("Enter a new email address to continue.");
      return;
    }

    setEmailError("");
    setEmailSubmitting(true);
    try {
      await requestEmailChange(emailInput);
      navigate("/app/profile/verify-email");
    } catch (err) {
      setEmailError(err.message || "Could not send verification code.");
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedOwnerId) return;

    const nextOwner = transferCandidates.find((member) => member.id === selectedOwnerId);
    if (!nextOwner) return;

    const ok = await openConfirm({ message: `Transfer ownership to ${nextOwner.name}?`, confirmLabel: "Transfer" });
    if (!ok) return;

    const didTransfer = transferOwnership(selectedOwnerId);
    if (!didTransfer) return;

    setShowOwnershipSaved(true);
    setTimeout(() => setShowOwnershipSaved(false), 1800);
  };

  return (
    <AppShell title="Profile" maxWidth="2xl">
      <ConfirmDialog
        open={confirmModal.open}
        title={confirmModal.message}
        description={confirmModal.subtitle}
        confirmLabel={confirmModal.confirmLabel}
        tone={confirmModal.danger ? "danger" : "default"}
        onConfirm={handleConfirmOk}
        onCancel={handleConfirmCancel}
      />

      <div className="flex items-center gap-4 rounded-xl bg-BrandOrange/10 px-5 py-4">
        <Avatar name={user?.name || "Guest"} size="lg" />
        <div>
          <p className="font-Manrope text-base font-semibold">{user?.name || "Guest"}</p>
          <p className="text-xs capitalize" style={{ color: "var(--ui-text-subtle)" }}>{isPlayerView ? "player" : (user?.role || "No role")}</p>
        </div>
      </div>

      <Section title="Account Info">
        <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <div className="flex gap-2">
              <Input
                label="Name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={80}
                autoComplete="name"
                className="w-full rounded-lg border border-[color:var(--ui-border)] px-3.5 py-2.5 text-sm text-[color:var(--ui-text)] outline-none transition placeholder:text-[color:var(--ui-text-subtle)] hover:border-[color:var(--ui-border-strong)] focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
                style={{ backgroundColor: "var(--ui-surface-2)" }}
                placeholder="Your name"
              />
              <Button variant="primary"
                type="button"
                onClick={handleSaveName}
                disabled={!nameInput.trim() || nameInput.trim() === user?.name}
                className="rounded-lg bg-BrandOrange px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </Button>
            </div>
            {showNameSaved && (
              <p className="flex items-center gap-1 text-xs text-BrandGreen">
                <FiCheck className="text-xs" />
                Name updated.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <div className="flex gap-2">
              <Input
                label="Email"
                error={emailError}
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (emailError) setEmailError("");
                }}
                maxLength={254}
                autoComplete="email"
                className="w-full rounded-lg border border-[color:var(--ui-border)] px-3.5 py-2.5 text-sm text-[color:var(--ui-text)] outline-none transition placeholder:text-[color:var(--ui-text-subtle)] hover:border-[color:var(--ui-border-strong)] focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
                style={{ backgroundColor: "var(--ui-surface-2)" }}
                placeholder="name@example.com"
              />
              <Button variant="primary"
                type="button"
                onClick={handleChangeEmail}
                disabled={emailSubmitting || !emailInput.trim() || emailInput.trim().toLowerCase() === user?.email}
                className="rounded-lg border border-BrandOrange/40 px-4 py-2.5 text-sm font-semibold text-BrandOrange transition hover:bg-BrandOrange/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {emailSubmitting ? "Sending..." : "Change"}
              </Button>
            </div>
            {pendingEmailChange?.nextEmail && (
              <p className="text-xs" style={{ color: "var(--ui-text-subtle)" }}>
                Verification pending for <span className="font-semibold" style={{ color: "var(--ui-text)" }}>{pendingEmailChange.nextEmail}</span>.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-[color:var(--ui-border)] px-3 py-3 md:col-span-2" style={{ backgroundColor: "var(--ui-surface-2)" }}>
            <IconBubble icon={<FiShield className="text-sm" />} tone="gray" size="sm" />
            <div>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--ui-text-subtle)" }}>Role</p>
              <p className="text-sm font-semibold capitalize">{isPlayerView ? "player" : (user?.role || "No role")}</p>
            </div>
          </div>
        </div>
        </Card>
      </Section>

      {!isPlayerView && (
      <Section title="Ownership" icon={<FiUsers />}>
        <Card>
          <p className="text-sm" style={{ color: "var(--ui-text-subtle)" }}>
            Current team owner: <span className="font-semibold" style={{ color: "var(--ui-text)" }}>{owner?.name || "Unknown"}</span>
          </p>

          {(user?.role === "coach" || user?.role === "owner") && isTeamOwner ? (
            <>
              <div className="mt-4 flex flex-col gap-1.5">
                <Select
                  label="Transfer ownership to"
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  className="w-full rounded-lg border border-[color:var(--ui-border)] px-3.5 py-2.5 text-sm text-[color:var(--ui-text)] outline-none transition hover:border-[color:var(--ui-border-strong)] focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
                  style={{ backgroundColor: "var(--ui-surface-2)" }}
                >
                  {transferCandidates.length === 0 && <option value="">No eligible members</option>}
                  {transferCandidates.map((member) => (
                    <option key={member.id} value={member.id} className="bg-BrandBlack">
                      {member.name} ({member.role})
                    </option>
                  ))}
                </Select>
              </div>

              <Button variant="danger"
                type="button"
                onClick={handleTransferOwnership}
                disabled={!selectedOwnerId || transferCandidates.length === 0}
                className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2.5 text-sm text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FiAlertTriangle className="text-sm" />
                Transfer Ownership
              </Button>

              {showOwnershipSaved && (
                <p className="mt-2 flex items-center gap-1 text-xs text-BrandGreen">
                  <FiCheck className="text-xs" />
                  Ownership transferred.
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 text-xs" style={{ color: "var(--ui-text-subtle)" }}>
              Only the current team owner can transfer ownership.
            </p>
          )}
        </Card>
      </Section>
      )}

      {/* Team Management — player view */}
      {isPlayerView && (
      <Section title="Team" icon={<FiUsers />}>
        <Card>
          {user?.teamName && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-[color:var(--ui-border)] px-3 py-3" style={{ backgroundColor: "var(--ui-surface-2)" }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-BrandOrange/15 text-sm font-bold text-BrandOrange">
                {user.teamName[0]}
              </div>
              <div>
                <p className="text-sm font-semibold">{user.teamName}</p>
                <p className="text-[11px] capitalize" style={{ color: "var(--ui-text-subtle)" }}>{user.sport || "No sport set"}</p>
              </div>
            </div>
          )}

          {/* Join another team */}
          <div className="mt-4">
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--ui-text-subtle)" }}>Enter the team invite code from your coach.</p>
            <div className="mt-2 flex gap-2">
              <Input
                label="Join another team"
                type="text"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                maxLength={12}
                className="w-full rounded-lg border border-[color:var(--ui-border)] px-3.5 py-2.5 font-mono text-sm tracking-wider text-[color:var(--ui-text)] outline-none transition placeholder:text-[color:var(--ui-text-subtle)] hover:border-[color:var(--ui-border-strong)] focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
                style={{ backgroundColor: "var(--ui-surface-2)" }}
              />
              <Button variant="primary"
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
              </Button>
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
            <div className="mt-5 pt-4">
              <Divider className="mb-4" />
              {!showLeaveConfirm ? (
                <Button variant="danger"
                  type="button"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2.5 text-sm text-red-300 transition hover:bg-red-500/10"
                >
                  <FiXCircle className="text-sm" />
                  Leave {user.teamName}
                </Button>
              ) : (
                <Alert tone="warning" title={`Leave ${user.teamName}?`}>
                  <p className="text-xs">
                    Are you sure you want to leave <span className="font-semibold">{user.teamName}</span>? You'll lose access to all plays.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="danger"
                      type="button"
                      onClick={() => {
                        setShowLeaveConfirm(false);
                        setShowLeftTeam(true);
                        setTimeout(() => setShowLeftTeam(false), 2500);
                      }}
                      className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-600"
                    >
                      Yes, leave team
                    </Button>
                    <Button variant="outline"
                      type="button"
                      onClick={() => setShowLeaveConfirm(false)}
                      className="rounded-lg border border-[color:var(--ui-border)] px-4 py-2 text-xs text-[color:var(--ui-text-muted)] transition hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text)]"
                    >
                      Cancel
                    </Button>
                  </div>
                </Alert>
              )}
              {showLeftTeam && (
                <p className="mt-2 flex items-center gap-1 text-xs text-red-400">
                  <FiCheck className="text-xs" />
                  You have left the team.
                </p>
              )}
            </div>
          )}
        </Card>
      </Section>
      )}

      <Button variant="danger"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10"
      >
        <FiLogOut />
        Log out
      </Button>
    </AppShell>
  );
}
