import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PlayPreviewCard from "../components/PlayPreviewCard";
import logo from "../assets/logos/full_Coachable_logo.png";

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
      return { label: "Play Created", className: "bg-green-500/15 text-green-400" };
    case "play_updated":
      return { label: "Play Updated", className: "bg-blue-500/15 text-blue-400" };
    case "folder_created":
      return { label: "Folder Created", className: "bg-cyan-500/15 text-cyan-400" };
    case "play_share_created":
      return { label: "Play Shared", className: "bg-purple-500/15 text-purple-400" };
    case "folder_share_created":
      return { label: "Folder Shared", className: "bg-fuchsia-500/15 text-fuchsia-400" };
    case "invite_sent":
      return { label: "Invite Sent", className: "bg-amber-500/15 text-amber-400" };
    case "issue_reported":
      return { label: "Issue Reported", className: "bg-rose-500/15 text-rose-400" };
    case "error_reported":
      return { label: "Error Reported", className: "bg-red-500/15 text-red-400" };
    default:
      return { label: type, className: "bg-white/10 text-BrandGray" };
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

function StatCard({ label, value, tone = "text-white" }) {
  return (
    <div className="rounded-xl border border-white/6 bg-[#1d2127] px-4 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-BrandGray">
        {label}
      </div>
      <div className={`mt-2 font-Manrope text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

export default function AdminUserActivity() {
  const { userId } = useParams();
  const [session] = useState(() => sessionStorage.getItem(SESSION_KEY) || "");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authed = Boolean(session);

  const adminFetch = useCallback(
    async (path) => {
      const res = await fetch(`${API_URL}${path}`, {
        headers: { "x-admin-session": session },
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
      <div className="flex h-screen items-center justify-center bg-BrandBlack font-DmSans">
        <div className="text-center">
          <p className="mb-4 text-BrandGray">Admin session required</p>
          <Link to="/admin" className="text-sm text-BrandOrange hover:underline">
            Go to Admin Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="hide-scroll bg-[#13151a] font-DmSans text-white"
      style={{ height: "100dvh", overflowY: "auto" }}
    >
      <div className="border-b border-white/6 bg-[#171a20]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Coachable" className="h-5 opacity-70" />
            <span className="rounded bg-BrandOrange/20 px-2 py-0.5 text-xs font-semibold text-BrandOrange">
              ADMIN
            </span>
            <span className="rounded bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-300">
              USER ACTIVITY
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchUserActivity}
              disabled={loading}
              className="rounded-lg border border-white/8 px-3 py-1.5 text-xs text-BrandGray transition hover:border-white/20 hover:text-white disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <Link
              to="/admin"
              className="rounded-lg border border-white/8 px-3 py-1.5 text-xs text-BrandGray transition hover:border-white/20 hover:text-white"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && !user ? (
          <div className="rounded-2xl border border-white/6 bg-[#1b1f25] px-8 py-16 text-center text-BrandGray">
            Loading user activity...
          </div>
        ) : null}

        {!loading && !user ? (
          <div className="rounded-2xl border border-white/6 bg-[#1b1f25] px-8 py-16 text-center">
            <p className="text-lg text-white">User not found</p>
            <p className="mt-2 text-sm text-BrandGray">The requested account could not be loaded.</p>
          </div>
        ) : null}

        {user ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/6 bg-[#1b1f25] p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-Manrope text-3xl font-bold text-white">{user.name}</h1>
                    {user.can_view_activity ? (
                      <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-[11px] font-semibold text-green-400">
                        Coaching Role
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-BrandGray">
                        Non-coaching account
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-BrandGray">{user.email}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      user.email_verified_at ? "bg-green-500/15 text-green-400" : "bg-white/8 text-BrandGray"
                    }`}>
                      {user.email_verified_at ? "Email verified" : "Email unverified"}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      user.onboarded_at ? "bg-blue-500/15 text-blue-300" : "bg-yellow-500/15 text-yellow-400"
                    }`}>
                      {user.onboarded_at ? "Onboarded" : "Not onboarded"}
                    </span>
                    {user.is_beta_tester ? (
                      <span className="rounded-full bg-purple-500/15 px-2.5 py-1 text-[11px] font-semibold text-purple-400">
                        Beta tester
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid min-w-0 gap-4 text-sm text-BrandGray sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-BrandGray2">
                      Account Created
                    </div>
                    <div className="mt-1 text-white">{formatDateTime(user.created_at)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-BrandGray2">
                      Last Updated
                    </div>
                    <div className="mt-1 text-white">{formatDateTime(user.updated_at)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-BrandGray2">
                      Active Team
                    </div>
                    <div className="mt-1 text-white">
                      {memberships.find((membership) => membership.teamId === user.active_team_id)?.teamName || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-BrandGray2">
                      Team Memberships
                    </div>
                    <div className="mt-1 text-white">{memberships.length}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Teams" value={memberships.length} />
              <StatCard label="Plays Created" value={summary.plays_created || 0} tone="text-green-400" />
              <StatCard label="Plays Updated" value={summary.plays_updated || 0} tone="text-blue-300" />
              <StatCard label="Folders Created" value={summary.folders_created || 0} tone="text-cyan-400" />
              <StatCard label="Share Links" value={totalShares} tone="text-purple-400" />
              <StatCard label="Invites Sent" value={summary.invites_sent || 0} tone="text-amber-400" />
              <StatCard label="Issues Reported" value={summary.issues_reported || 0} tone="text-rose-400" />
              <StatCard label="Error Reports" value={summary.error_reports || 0} tone="text-red-400" />
            </section>

            <section className="rounded-2xl border border-white/6 bg-[#1b1f25] p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-Manrope text-lg font-bold text-white">Team Memberships</h2>
                  <p className="mt-1 text-sm text-BrandGray">Current memberships and roles for this account.</p>
                </div>
              </div>

              {memberships.length === 0 ? (
                <div className="rounded-xl border border-white/6 bg-[#171a20] px-4 py-6 text-sm text-BrandGray">
                  No team memberships found.
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {memberships.map((membership) => (
                    <div key={`${membership.teamId}-${membership.role}`} className="rounded-xl border border-white/6 bg-[#171a20] px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{membership.teamName}</p>
                        <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold text-BrandGray">
                          {formatRole(membership.role)}
                        </span>
                        {membership.teamId === user.active_team_id ? (
                          <span className="rounded-full bg-BrandOrange/15 px-2 py-0.5 text-[11px] font-semibold text-BrandOrange">
                            Active
                          </span>
                        ) : null}
                        {membership.isPersonal ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                            Personal
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-BrandGray">
                        {membership.sport || "No sport set"} | Joined {formatDateTime(membership.joinedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.1fr,1.4fr]">
              <section className="rounded-2xl border border-white/6 bg-[#1b1f25] p-6">
                <div className="mb-4">
                  <h2 className="font-Manrope text-lg font-bold text-white">Recent Plays Created</h2>
                  <p className="mt-1 text-sm text-BrandGray">Latest plays created by this user across all teams.</p>
                </div>

                {recentPlays.length === 0 ? (
                  <div className="rounded-xl border border-white/6 bg-[#171a20] px-4 py-6 text-sm text-BrandGray">
                    No created plays found for this user.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {recentPlays.map((play) => (
                      <div key={play.id} className="flex flex-col rounded-xl border border-white/6 bg-[#171a20] p-4">
                        {play.playData ? (
                          <PlayPreviewCard
                            playData={play.playData}
                            autoplay="hover"
                            shape="landscape"
                            cameraMode="fit-distribution"
                            background="field"
                            paddingPx={20}
                            minSpanPx={100}
                            className="mb-4"
                          />
                        ) : (
                          <div className="mb-4 flex aspect-[16/10] w-full items-center justify-center rounded-xl border border-white/8 bg-[#13151a] text-sm text-BrandGray2">
                            Preview unavailable
                          </div>
                        )}
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{play.title}</p>
                            <p className="mt-1 text-sm text-BrandGray">
                              {play.teamName}
                              {play.folderName ? ` | ${play.folderName}` : ""}
                            </p>
                            {play.sport ? (
                              <p className="mt-1 text-xs uppercase tracking-wider text-BrandGray2">{play.sport}</p>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-right text-xs text-BrandGray2">
                            <div>{formatTime(play.createdAt)}</div>
                            <div>{formatDateTime(play.createdAt)}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {play.hiddenFromPlayers ? (
                            <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-[11px] font-semibold text-yellow-400">
                              Hidden from players
                            </span>
                          ) : null}
                          {play.archivedAt ? (
                            <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold text-BrandGray">
                              Archived
                            </span>
                          ) : null}
                          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold text-BrandGray">
                            Updated {formatTime(play.updatedAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-white/6 bg-[#1b1f25] p-6">
                <div className="mb-4">
                  <h2 className="font-Manrope text-lg font-bold text-white">Recent Activity</h2>
                  <p className="mt-1 text-sm text-BrandGray">
                    Plays, folders, share links, invites, and reported support activity.
                  </p>
                </div>

                {activity.length === 0 ? (
                  <div className="rounded-xl border border-white/6 bg-[#171a20] px-4 py-6 text-sm text-BrandGray">
                    No tracked activity found for this user.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activity.map((item) => {
                      const meta = activityTypeMeta(item.activity_type);
                      return (
                        <div key={`${item.activity_type}-${item.activity_id}`} className="rounded-xl border border-white/6 bg-[#171a20] px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.className}`}>
                                  {meta.label}
                                </span>
                                {item.team_name ? (
                                  <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-BrandGray">
                                    {item.team_name}
                                  </span>
                                ) : null}
                              </div>
                              <p className="truncate font-semibold text-white">{item.label}</p>
                              <p className="mt-1 text-sm text-BrandGray">{describeActivity(item)}</p>
                            </div>
                            <div className="shrink-0 text-right text-xs text-BrandGray2">
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
        ) : null}
      </div>
    </div>
  );
}
