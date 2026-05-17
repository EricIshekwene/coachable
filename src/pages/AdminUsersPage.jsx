import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../admin/AdminContext";
import { adminPath } from "../admin/adminNav";
import { adminApi } from "../admin/adminTransport";
import {
  AdminShell,
  AdminHeader,
  AdminPage,
  AdminSection,
  AdminCard,
  AdminInput,
  AdminBadge,
  AdminEmptyState,
  AdminSpinner,
} from "../admin/components";

const ROLE_PRIORITY = {
  owner: 0,
  coach: 1,
  assistant_coach: 2,
  player: 3,
};

function formatRole(role) {
  if (!role) return "Unknown";
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getUserInitials(name, email) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map((part) => part[0]).join("").toUpperCase();
}

function formatAdminDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSortedMemberships(memberships = []) {
  return [...memberships].sort((a, b) => {
    const roleDelta = (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99);
    if (roleDelta !== 0) return roleDelta;
    return new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime();
  });
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { basePath, hasPerm, isOwner } = useAdmin();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [savingUserId, setSavingUserId] = useState(null);
  const canEditStatus = isOwner || hasPerm("users.editStatus");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi("/admin/users");
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleBetaStatus = useCallback(async (user) => {
    setSavingUserId(user.id);
    setError("");
    try {
      const data = await adminApi(`/admin/users/${user.id}/beta-tester`, {
        method: "PATCH",
        body: JSON.stringify({ isBetaTester: !user.is_beta_tester }),
      });
      setUsers((prev) => prev.map((entry) => (
        entry.id === user.id
          ? { ...entry, is_beta_tester: data.user?.is_beta_tester ?? !user.is_beta_tester }
          : entry
      )));
    } catch (err) {
      setError(err.message || "Failed to update user status.");
    } finally {
      setSavingUserId(null);
    }
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const haystacks = [
        user.name,
        user.email,
        ...(user.memberships || []).map((membership) => membership.teamName),
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return haystacks.some((value) => value.includes(query));
    });
  }, [search, users]);

  return (
    <AdminShell>
      <AdminHeader title="Users" backLabel="Dashboard" backTo={adminPath(basePath, "")} />
      <AdminPage>
        <section className="mx-auto max-w-6xl">
          <AdminSection
            title="User Directory"
            subtitle="Browse Coachable users and open each person's activity detail."
          >
            <AdminCard className="overflow-hidden">
              <div
                className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                style={{ borderBottom: "1px solid var(--adm-border)" }}
              >
                <div className="relative min-w-0 flex-1 sm:max-w-md">
                  <AdminInput
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email, or team"
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--adm-muted)" }}>
                  <span>{filteredUsers.length}</span>
                  <span>{filteredUsers.length === 1 ? "user" : "users"}</span>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center px-6 py-16">
                  <AdminSpinner size={30} />
                </div>
              ) : error ? (
                <div className="px-6 py-6 text-sm" style={{ color: "var(--adm-danger)" }}>
                  {error}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="px-6 py-12">
                  <AdminEmptyState
                    title={users.length === 0 ? "No users found" : "No matching users"}
                    subtitle={users.length === 0 ? "Users will appear here once accounts exist." : "Try a different search term."}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] table-fixed border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr>
                        <th className="w-[28%] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)", borderBottom: "1px solid var(--adm-border)" }}>User</th>
                        <th className="w-[24%] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)", borderBottom: "1px solid var(--adm-border)" }}>Email</th>
                        <th className="w-[24%] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)", borderBottom: "1px solid var(--adm-border)" }}>Teams</th>
                        <th className="w-[10%] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)", borderBottom: "1px solid var(--adm-border)" }}>Plays</th>
                        <th className="w-[14%] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)", borderBottom: "1px solid var(--adm-border)" }}>Joined</th>
                        <th className="w-[14%] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)", borderBottom: "1px solid var(--adm-border)" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => {
                        const memberships = getSortedMemberships(user.memberships);
                        return (
                          <tr key={user.id}>
                            <td className="px-5 py-4 align-top" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                              <div className="flex items-start gap-3">
                                <div
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                                  style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}
                                >
                                  {getUserInitials(user.name, user.email)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={() => navigate(adminPath(basePath, `/users/${user.id}`))}
                                    className="block w-full truncate text-left text-sm font-semibold transition-opacity hover:opacity-80"
                                    style={{ color: "var(--adm-text)" }}
                                  >
                                    {user.name || "Unnamed user"}
                                  </button>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <AdminBadge status={user.email_verified_at ? "resolved" : undefined}>
                                      {user.email_verified_at ? "Verified" : "Unverified"}
                                    </AdminBadge>
                                    {!user.onboarded_at && <AdminBadge status="warning">Needs onboarding</AdminBadge>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 align-top text-xs" style={{ color: "var(--adm-text2)", borderBottom: "1px solid var(--adm-border)" }}>
                              <div className="break-all">{user.email || "-"}</div>
                            </td>
                            <td className="px-5 py-4 align-top" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                              {memberships.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {memberships.slice(0, 2).map((membership) => (
                                    <span
                                      key={`${user.id}-${membership.teamId}-${membership.role}`}
                                      className="inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[10px] font-semibold"
                                      style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}
                                    >
                                      <span className="truncate">{membership.teamName}</span>
                                      <span className="ml-1 shrink-0" style={{ color: "var(--adm-muted)" }}>
                                        {formatRole(membership.role)}
                                      </span>
                                    </span>
                                  ))}
                                  {memberships.length > 2 && (
                                    <span
                                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold"
                                      style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-muted)" }}
                                    >
                                      +{memberships.length - 2}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs" style={{ color: "var(--adm-muted)" }}>No teams</span>
                              )}
                            </td>
                            <td className="px-5 py-4 align-top" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                              <span
                                className="inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold"
                                style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}
                              >
                                {user.plays_created ?? 0}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-top text-xs" style={{ color: "var(--adm-text2)", borderBottom: "1px solid var(--adm-border)" }}>
                              {formatAdminDate(user.created_at)}
                            </td>
                            <td className="px-5 py-4 align-top" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                              <div className="flex flex-col items-start gap-2">
                                <AdminBadge status={user.is_beta_tester ? "warning" : undefined}>
                                  {user.is_beta_tester ? "Beta tester" : "Standard"}
                                </AdminBadge>
                                {canEditStatus && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBetaStatus(user)}
                                    disabled={savingUserId === user.id}
                                    className="rounded-md border px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-85 disabled:opacity-50"
                                    style={{ borderColor: "var(--adm-border2)", color: "var(--adm-text2)" }}
                                  >
                                    {savingUserId === user.id
                                      ? "Saving..."
                                      : user.is_beta_tester
                                        ? "Remove beta"
                                        : "Make beta"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminCard>
          </AdminSection>
        </section>
      </AdminPage>
    </AdminShell>
  );
}
