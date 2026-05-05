import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PlayPreviewCard from "../components/PlayPreviewCard";
import { useAdmin } from "../admin/AdminContext";
import { adminPath } from "../admin/adminNav";
import { AdminShell, AdminHeader, AdminPage, AdminBtn, AdminSpinner } from "../admin/components";

const SESSION_KEY = "coachable_admin_session";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const ROLE_PRIORITY = {
  owner: 0,
  coach: 1,
  assistant_coach: 2,
  player: 3,
};

function formatTime(ts) {
  if (!ts) return "-";
  const date = new Date(ts);
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatDateTime(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

function formatRole(role) {
  if (!role) return "Unknown";
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sortMemberships(memberships = []) {
  return [...memberships].sort((a, b) => {
    const roleDelta = (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99);
    if (roleDelta !== 0) return roleDelta;
    return new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime();
  });
}

function activityTypeMeta(type) {
  switch (type) {
    case "play_created":
      return { label: "Play Created", style: { backgroundColor: "var(--adm-badge-green-bg)", color: "var(--adm-badge-green-text)" } };
    case "play_updated":
      return { label: "Play Updated", style: { backgroundColor: "var(--adm-badge-blue-bg)", color: "var(--adm-badge-blue-text)" } };
    case "folder_created":
      return { label: "Folder Created", style: { backgroundColor: "color-mix(in srgb, var(--adm-color-cyan) 14%, transparent)", color: "var(--adm-color-cyan)" } };
    case "play_share_created":
      return { label: "Play Shared", style: { backgroundColor: "var(--adm-badge-purple-bg)", color: "var(--adm-badge-purple-text)" } };
    case "folder_share_created":
      return { label: "Folder Shared", style: { backgroundColor: "color-mix(in srgb, var(--adm-color-pink) 14%, transparent)", color: "var(--adm-color-pink)" } };
    case "invite_sent":
      return { label: "Invite Sent", style: { backgroundColor: "var(--adm-badge-amber-bg)", color: "var(--adm-badge-amber-text)" } };
    case "issue_reported":
      return { label: "Issue Reported", style: { backgroundColor: "color-mix(in srgb, var(--adm-color-pink) 14%, transparent)", color: "var(--adm-color-pink)" } };
    case "error_reported":
      return { label: "Error Reported", style: { backgroundColor: "var(--adm-badge-red-bg)", color: "var(--adm-badge-red-text)" } };
    default:
      return { label: type, style: { backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" } };
  }
}

function describeActivity(activity) {
  const meta = activity.meta || {};
  switch (activity.activity_type) {
    case "play_created":
      if (meta.archivedAt) return `Archived ${formatTime(meta.archivedAt)}`;
      if (meta.hiddenFromPlayers) return "Hidden from players";
      return "Created this play";
    case "play_updated":
      return "Updated a play they did not originally create";
    case "folder_created":
      return "Created a play folder";
    case "play_share_created":
    case "folder_share_created":
      if (meta.revokedAt) return `Link revoked ${formatTime(meta.revokedAt)}`;
      if (meta.expiresAt) return `Link expires ${formatDateTime(meta.expiresAt)}`;
      return "Share link has no expiry";
    case "invite_sent":
      return `Requested role: ${formatRole(meta.requestedRole)} | Status: ${formatRole(meta.status)}`;
    case "issue_reported":
      return `Issue status: ${formatRole(meta.status)}`;
    case "error_reported":
      if (meta.action && meta.pageUrl) return `${meta.action} on ${meta.pageUrl}`;
      if (meta.action) return meta.action;
      if (meta.pageUrl) return meta.pageUrl;
      return "Client-side error reported";
    default:
      return "";
  }
}

function StatCard({ label, value, valueStyle }) {
  return (
    <div className="rounded-[var(--adm-radius)] px-4 py-4" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)" }}>{label}</div>
      <div className="mt-2 font-Manrope text-2xl font-bold" style={valueStyle || { color: "var(--adm-text)" }}>{value}</div>
    </div>
  );
}

export default function AdminUserActivity() {
  const { basePath } = useAdmin();
  const { userId } = useParams();
  const [session] = useState(() => sessionStorage.getItem(SESSION_KEY) || "");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRestoreDeleted, setShowRestoreDeleted] = useState(false);
  const [deletedTeams, setDeletedTeams] = useState([]);
  const [deletedTeamsLoading, setDeletedTeamsLoading] = useState(false);
  const [deletedTeamsError, setDeletedTeamsError] = useState("");
  const [restoringId, setRestoringId] = useState(null);

  const authed = Boolean(session);

  const adminFetch = useCallback(
    async (path, options = {}) => {
      const { method = "GET", body } = options;
      const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
          "x-admin-session": session,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }
      return data;
    },
    [session]
  );

  const fetchUserActivity = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch(`/admin/users/${userId}/activity`);
      setPayload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminFetch, userId]);

  const fetchDeletedTeams = useCallback(async () => {
    setDeletedTeamsLoading(true);
    setDeletedTeamsError("");
    try {
      const data = await adminFetch(`/admin/users/${userId}/deleted-teams`);
      setDeletedTeams(data.deletedTeams || []);
    } catch (err) {
      setDeletedTeamsError(err.message);
    } finally {
      setDeletedTeamsLoading(false);
    }
  }, [adminFetch, userId]);

  const handleToggleRestoreDeleted = () => {
    if (!showRestoreDeleted) {
      fetchDeletedTeams();
    }
    setShowRestoreDeleted((prev) => !prev);
  };

  const handleRestoreTeam = async (teamId) => {
    setRestoringId(teamId);
    try {
      await adminFetch(`/admin/teams/${teamId}/restore`, { method: "POST" });
      setDeletedTeams((prev) => prev.filter((t) => t.id !== teamId));
    } catch (err) {
      setDeletedTeamsError(err.message);
    } finally {
      setRestoringId(null);
    }
  };

  useEffect(() => {
    if (authed) {
      fetchUserActivity();
    }
  }, [authed, fetchUserActivity]);

  const user = payload?.user || null;
  const summary = payload?.summary || {};
  const memberships = useMemo(() => sortMemberships(user?.memberships || []), [user?.memberships]);
  const recentPlays = payload?.recentPlays || [];
  const activity = payload?.activity || [];
  const totalShares = (summary.play_shares_created || 0) + (summary.folder_shares_created || 0);

  if (!authed) {
    return (
      <AdminShell className="flex items-center justify-center">
        <div className="text-center" style={{ color: "var(--adm-muted)" }}>
          <p className="mb-3 text-sm">Admin session required</p>
          <Link to={adminPath(basePath, "")} className="text-sm transition-opacity hover:opacity-70" style={{ color: "var(--adm-accent)" }}>Go to Admin Login</Link>
        </div>
      </AdminShell>
    );
  }

  const card = { backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)", borderRadius: "var(--adm-radius)" };
  const innerCard = { backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)", borderRadius: "var(--adm-radius-sm)" };

  return (
    <AdminShell>
      <AdminHeader
        title="User Activity"
        backLabel="Dashboard"
        backTo={adminPath(basePath, "")}
        actions={
          <AdminBtn variant="secondary" size="sm" onClick={fetchUserActivity} disabled={loading}>
            {loading ? <AdminSpinner size={12} /> : "Refresh"}
          </AdminBtn>
        }
      />

      <AdminPage>
        {error && (
          <div className="mb-6 rounded-[var(--adm-radius-sm)] px-4 py-3 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>
            {error}
          </div>
        )}

        {loading && !user && (
          <div className="flex items-center justify-center py-24"><AdminSpinner size={32} /></div>
        )}

        {!loading && !user && (
          <div className="px-8 py-16 text-center" style={card}>
            <p className="text-lg" style={{ color: "var(--adm-text)" }}>User not found</p>
            <p className="mt-2 text-sm" style={{ color: "var(--adm-muted)" }}>The requested account could not be loaded.</p>
          </div>
        )}

        {user && (
          <div className="space-y-6">
            {/* Profile */}
            <section className="p-6" style={card}>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-Manrope text-3xl font-bold" style={{ color: "var(--adm-text)" }}>{user.name}</h1>
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={user.can_view_activity ? { backgroundColor: "var(--adm-badge-green-bg)", color: "var(--adm-success)" } : { backgroundColor: "var(--adm-surface3)", color: "var(--adm-muted)" }}>
                      {user.can_view_activity ? "Coaching Role" : "Non-coaching account"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm" style={{ color: "var(--adm-muted)" }}>{user.email}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={user.email_verified_at ? { backgroundColor: "var(--adm-badge-green-bg)", color: "var(--adm-success)" } : { backgroundColor: "var(--adm-surface3)", color: "var(--adm-muted)" }}>
                      {user.email_verified_at ? "Email verified" : "Email unverified"}
                    </span>
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={user.onboarded_at ? { backgroundColor: "var(--adm-badge-blue-bg)", color: "var(--adm-badge-blue-text)" } : { backgroundColor: "var(--adm-badge-amber-bg)", color: "var(--adm-badge-amber-text)" }}>
                      {user.onboarded_at ? "Onboarded" : "Not onboarded"}
                    </span>
                    {user.is_beta_tester && (
                      <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: "var(--adm-badge-purple-bg)", color: "var(--adm-badge-purple-text)" }}>Beta tester</span>
                    )}
                  </div>
                </div>

                <div className="grid min-w-0 gap-4 text-sm sm:grid-cols-2">
                  {[
                    ["Account Created", formatDateTime(user.created_at)],
                    ["Last Updated", formatDateTime(user.updated_at)],
                    ["Active Team", memberships.find((m) => m.teamId === user.active_team_id)?.teamName || "-"],
                    ["Team Memberships", memberships.length],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)" }}>{label}</div>
                      <div className="mt-1" style={{ color: "var(--adm-text)" }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Stats */}
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Teams" value={memberships.length} />
              <StatCard label="Plays Created" value={summary.plays_created || 0} valueStyle={{ color: "var(--adm-success)" }} />
              <StatCard label="Plays Updated" value={summary.plays_updated || 0} valueStyle={{ color: "var(--adm-color-blue)" }} />
              <StatCard label="Folders Created" value={summary.folders_created || 0} valueStyle={{ color: "var(--adm-color-cyan)" }} />
              <StatCard label="Share Links" value={totalShares} valueStyle={{ color: "var(--adm-color-purple)" }} />
              <StatCard label="Invites Sent" value={summary.invites_sent || 0} valueStyle={{ color: "var(--adm-warning)" }} />
              <StatCard label="Issues Reported" value={summary.issues_reported || 0} valueStyle={{ color: "var(--adm-color-pink)" }} />
              <StatCard label="Error Reports" value={summary.error_reports || 0} valueStyle={{ color: "var(--adm-danger)" }} />
            </section>

            {/* Memberships */}
            <section className="p-6" style={card}>
              <h2 className="mb-1 font-Manrope text-lg font-bold" style={{ color: "var(--adm-text)" }}>Team Memberships</h2>
              <p className="mb-4 text-sm" style={{ color: "var(--adm-muted)" }}>Current memberships and roles for this account.</p>
              {memberships.length === 0 ? (
                <div className="px-4 py-6 text-sm" style={{ ...innerCard, color: "var(--adm-muted)" }}>No team memberships found.</div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {memberships.map((m) => (
                    <div key={`${m.teamId}-${m.role}`} className="px-4 py-4" style={innerCard}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold" style={{ color: "var(--adm-text)" }}>{m.teamName}</p>
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-muted)" }}>{formatRole(m.role)}</span>
                        {m.teamId === user.active_team_id && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}>Active</span>}
                        {m.isPersonal && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "var(--adm-badge-green-bg)", color: "var(--adm-badge-green-text)" }}>Personal</span>}
                      </div>
                      <p className="mt-2 text-sm" style={{ color: "var(--adm-muted)" }}>{m.sport || "No sport set"} | Joined {formatDateTime(m.joinedAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Restore deleted teams */}
            <section className="p-6" style={card}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-Manrope text-lg font-bold" style={{ color: "var(--adm-text)" }}>Restore Deleted Teams</h2>
                  <p className="mt-1 text-sm" style={{ color: "var(--adm-muted)" }}>Teams deleted by this user, recoverable within 30 days.</p>
                </div>
                <AdminBtn variant="secondary" size="sm" onClick={handleToggleRestoreDeleted}>
                  {showRestoreDeleted ? "Hide" : "Show Deleted"}
                </AdminBtn>
              </div>
              {showRestoreDeleted && (
                <div className="mt-4">
                  {deletedTeamsError && <div className="mb-3 rounded-[var(--adm-radius-sm)] px-4 py-3 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{deletedTeamsError}</div>}
                  {deletedTeamsLoading ? (
                    <div className="flex justify-center py-8"><AdminSpinner /></div>
                  ) : deletedTeams.length === 0 ? (
                    <div className="px-4 py-6 text-sm" style={{ ...innerCard, color: "var(--adm-muted)" }}>No deleted teams found for this user.</div>
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {deletedTeams.map((team) => {
                        const daysLeft = Math.ceil((new Date(team.deleted_at).getTime() + 30 * 86400000 - Date.now()) / 86400000);
                        return (
                          <div key={team.id} className="flex items-center justify-between gap-3 px-4 py-4" style={innerCard}>
                            <div className="min-w-0">
                              <p className="truncate font-semibold" style={{ color: "var(--adm-text)" }}>{team.name}</p>
                              <p className="mt-1 text-sm" style={{ color: "var(--adm-muted)" }}>{team.sport || "No sport"} | Deleted {formatTime(team.deleted_at)}</p>
                              <p className="mt-1 text-xs" style={{ color: daysLeft <= 5 ? "var(--adm-danger)" : "var(--adm-muted)" }}>
                                {daysLeft > 0 ? `${daysLeft}d until permanent deletion` : "Expires today"}
                              </p>
                            </div>
                            <AdminBtn variant="secondary" size="sm" onClick={() => handleRestoreTeam(team.id)} disabled={restoringId === team.id}>
                              {restoringId === team.id ? "Restoring…" : "Restore"}
                            </AdminBtn>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Plays + Activity */}
            <div className="grid gap-6 xl:grid-cols-[1.1fr,1.4fr]">
              <section className="p-6" style={card}>
                <h2 className="mb-1 font-Manrope text-lg font-bold" style={{ color: "var(--adm-text)" }}>Recent Plays Created</h2>
                <p className="mb-4 text-sm" style={{ color: "var(--adm-muted)" }}>Latest plays created by this user across all teams.</p>
                {recentPlays.length === 0 ? (
                  <div className="px-4 py-6 text-sm" style={{ ...innerCard, color: "var(--adm-muted)" }}>No created plays found for this user.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {recentPlays.map((play) => (
                      <div key={play.id} className="flex flex-col p-4" style={innerCard}>
                        {play.playData ? (
                          <PlayPreviewCard playData={play.playData} autoplay="hover" shape="landscape" cameraMode="fit-distribution" background="field" paddingPx={20} minSpanPx={100} className="mb-4" />
                        ) : (
                          <div className="mb-4 flex aspect-[16/10] w-full items-center justify-center text-sm" style={{ ...innerCard, color: "var(--adm-muted)" }}>Preview unavailable</div>
                        )}
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold" style={{ color: "var(--adm-text)" }}>{play.title}</p>
                            <p className="mt-1 text-sm" style={{ color: "var(--adm-muted)" }}>{play.teamName}{play.folderName ? ` | ${play.folderName}` : ""}</p>
                            {play.sport && <p className="mt-1 text-xs uppercase tracking-wider" style={{ color: "var(--adm-muted)" }}>{play.sport}</p>}
                          </div>
                          <div className="shrink-0 text-right text-xs" style={{ color: "var(--adm-muted)" }}>
                            <div>{formatTime(play.createdAt)}</div>
                            <div>{formatDateTime(play.createdAt)}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {play.hiddenFromPlayers && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "var(--adm-badge-amber-bg)", color: "var(--adm-badge-amber-text)" }}>Hidden from players</span>}
                          {play.archivedAt && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-muted)" }}>Archived</span>}
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-muted)" }}>Updated {formatTime(play.updatedAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="p-6" style={card}>
                <h2 className="mb-1 font-Manrope text-lg font-bold" style={{ color: "var(--adm-text)" }}>Recent Activity</h2>
                <p className="mb-4 text-sm" style={{ color: "var(--adm-muted)" }}>Plays, folders, share links, invites, and reported support activity.</p>
                {activity.length === 0 ? (
                  <div className="px-4 py-6 text-sm" style={{ ...innerCard, color: "var(--adm-muted)" }}>No tracked activity found for this user.</div>
                ) : (
                  <div className="space-y-3">
                    {activity.map((item) => {
                      const meta = activityTypeMeta(item.activity_type);
                      return (
                        <div key={`${item.activity_type}-${item.activity_id}`} className="px-4 py-4" style={innerCard}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={meta.style}>{meta.label}</span>
                                {item.team_name && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-muted)" }}>{item.team_name}</span>}
                              </div>
                              <p className="truncate font-semibold" style={{ color: "var(--adm-text)" }}>{item.label}</p>
                              <p className="mt-1 text-sm" style={{ color: "var(--adm-muted)" }}>{describeActivity(item)}</p>
                            </div>
                            <div className="shrink-0 text-right text-xs" style={{ color: "var(--adm-muted)" }}>
                              <div>{formatTime(item.occurred_at)}</div>
                              <div>{formatDateTime(item.occurred_at)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </AdminPage>
    </AdminShell>
  );
}
