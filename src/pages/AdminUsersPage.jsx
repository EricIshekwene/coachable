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
            <AdminCard padding={false} className="overflow-hidden" style={{ border: "none" }}>
              <div
                className="px-4 py-4 sm:px-5"
                style={{
                  background: "linear-gradient(180deg, var(--adm-surface2) 0%, var(--adm-surface) 100%)",
                }}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1 lg:max-w-md">
                    <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--adm-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name, email, or team"
                      className="w-full rounded-[var(--adm-radius)] py-3 pl-10 pr-16 text-sm outline-none transition-colors"
                      style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border2)", color: "var(--adm-text)" }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "var(--adm-accent)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px var(--adm-accent-dim)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--adm-border2)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    {search && (
                      <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs transition-opacity hover:opacity-70" style={{ color: "var(--adm-muted)" }}>
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold" style={{ backgroundColor: filteredUsers.length === users.length ? "var(--adm-surface3)" : "var(--adm-accent-dim)", color: filteredUsers.length === users.length ? "var(--adm-muted)" : "var(--adm-accent)" }}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: filteredUsers.length === users.length ? "var(--adm-muted)" : "var(--adm-accent)" }} />
                      {filteredUsers.length === users.length ? "Full directory" : "Filtered view"}
                    </span>
                    <span className="inline-flex items-center rounded-full px-3 py-2 text-[11px] font-semibold" style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}>
                      {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
                    </span>
                  </div>
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
                <>
                  <div className="px-4 py-2 text-[11px] sm:hidden" style={{ backgroundColor: "var(--adm-surface)", color: "var(--adm-muted)", borderTop: "1px solid var(--adm-border)", borderBottom: "1px solid var(--adm-border)" }}>
                    Swipe sideways to view all columns.
                  </div>
                  <div className="hide-scroll overflow-auto" style={{ backgroundColor: "var(--adm-bg)" }}>
                  <table className="min-w-[980px] w-full table-fixed border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr>
                        <th className="sticky top-0 z-10 w-1/4 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: "var(--adm-surface)", borderBottom: "1px solid var(--adm-border)", color: "var(--adm-muted)", backdropFilter: "blur(12px)" }}>User</th>
                        <th className="sticky top-0 z-10 w-1/4 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: "var(--adm-surface)", borderBottom: "1px solid var(--adm-border)", color: "var(--adm-muted)", backdropFilter: "blur(12px)" }}>Email</th>
                        <th className="sticky top-0 z-10 w-1/4 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: "var(--adm-surface)", borderBottom: "1px solid var(--adm-border)", color: "var(--adm-muted)", backdropFilter: "blur(12px)" }}>Teams</th>
                        <th className="sticky top-0 z-10 w-16 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: "var(--adm-surface)", borderBottom: "1px solid var(--adm-border)", color: "var(--adm-muted)", backdropFilter: "blur(12px)" }}>Plays</th>
                        <th className="sticky top-0 z-10 w-24 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: "var(--adm-surface)", borderBottom: "1px solid var(--adm-border)", color: "var(--adm-muted)", backdropFilter: "blur(12px)" }}>Status</th>
                        <th className="sticky top-0 z-10 w-24 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: "var(--adm-surface)", borderBottom: "1px solid var(--adm-border)", color: "var(--adm-muted)", backdropFilter: "blur(12px)" }}>Joined</th>
                        <th className="sticky top-0 z-10 w-28 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: "var(--adm-surface)", borderBottom: "1px solid var(--adm-border)", color: "var(--adm-muted)", backdropFilter: "blur(12px)" }}>Roles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => {
                        const memberships = getSortedMemberships(user.memberships);
                        const hasCoachingRole = Boolean(user.can_view_activity);
                        const isPlayerOnly = memberships.length > 0 && memberships.every((membership) => membership.role === "player");
                        const uniqueRoles = Array.from(new Set(memberships.map((membership) => membership.role)));
                        const rowBaseStyle = {
                          backgroundColor: "var(--adm-surface)",
                          borderBottom: "1px solid var(--adm-border)",
                        };
                        return (
                          <tr
                            key={user.id}
                            className={!user.onboarded_at ? "opacity-80" : ""}
                            onMouseEnter={(e) => {
                              Array.from(e.currentTarget.children).forEach((cell) => {
                                cell.style.backgroundColor = "var(--adm-surface2)";
                              });
                            }}
                            onMouseLeave={(e) => {
                              Array.from(e.currentTarget.children).forEach((cell) => {
                                cell.style.backgroundColor = "var(--adm-surface)";
                              });
                            }}
                          >
                            <td className="overflow-hidden px-4 py-4 align-top" style={rowBaseStyle}>
                              <div className="flex items-start gap-3">
                                <div
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                                  style={hasCoachingRole
                                    ? { backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }
                                    : { backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}
                                >
                                  {getUserInitials(user.name, user.email)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={() => navigate(adminPath(basePath, `/users/${user.id}`))}
                                    className="block w-full truncate p-0 text-left text-sm font-semibold transition-colors"
                                    style={{ color: "var(--adm-text)" }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--adm-accent)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--adm-text)"; }}
                                  >
                                    {user.name || "Unnamed user"}
                                  </button>
                                  <p className="mt-1 truncate text-xs" style={{ color: "var(--adm-muted)" }}>
                                    {memberships.length > 0 ? `${memberships.length} ${memberships.length === 1 ? "team role" : "team roles"}` : "No team memberships"}
                                  </p>
                                  {!user.onboarded_at && (
                                    <div className="mt-2 flex gap-1 overflow-hidden">
                                      <AdminBadge status="warning">Needs onboarding</AdminBadge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="overflow-hidden px-4 py-4 align-top text-xs" style={{ ...rowBaseStyle, color: "var(--adm-text2)" }}>
                              <div className="truncate leading-relaxed">{user.email || "-"}</div>
                            </td>
                            <td className="overflow-hidden px-4 py-4 align-top" style={rowBaseStyle}>
                              {memberships.length > 0 ? (
                                <div className="flex gap-1 overflow-hidden">
                                  {memberships.slice(0, 1).map((membership) => (
                                    <span
                                      key={`${user.id}-${membership.teamId}-${membership.role}`}
                                      className="inline-flex items-center truncate rounded-full px-2.5 py-1 text-[10px] font-semibold"
                                      style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}
                                    >
                                      {membership.teamName}
                                      <span className="ml-1 shrink-0" style={{ color: "var(--adm-muted)" }}>
                                        {formatRole(membership.role)}
                                      </span>
                                    </span>
                                  ))}
                                  {memberships.length > 1 && (
                                    <span
                                      className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold"
                                      style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-muted)" }}
                                    >
                                      +{memberships.length - 1}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs" style={{ color: "var(--adm-muted)" }}>-</span>
                              )}
                            </td>
                            <td className="px-4 py-4 align-top text-center" style={rowBaseStyle}>
                              {isPlayerOnly ? (
                                <span className="text-xs" style={{ color: "var(--adm-muted)" }}>-</span>
                              ) : (
                                <span
                                  className="inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold"
                                  style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}
                                >
                                  {user.plays_created ?? 0}
                                </span>
                              )}
                            </td>
                            <td className="overflow-hidden px-3 py-3 align-top" style={rowBaseStyle}>
                              <div className="flex flex-col gap-1">
                                <AdminBadge status={user.email_verified_at ? "resolved" : undefined}>
                                  {user.email_verified_at ? "Verified" : "Unverified"}
                                </AdminBadge>
                                {canEditStatus && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBetaStatus(user)}
                                    disabled={savingUserId === user.id}
                                    title={user.is_beta_tester ? "Remove beta tester" : "Make beta tester"}
                                    className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                                    style={user.is_beta_tester
                                      ? { backgroundColor: "var(--adm-badge-purple-bg)", borderColor: "transparent", color: "var(--adm-badge-purple-text)" }
                                      : { backgroundColor: "var(--adm-surface3)", borderColor: "var(--adm-border)", color: "var(--adm-muted)" }}
                                  >
                                    {savingUserId === user.id ? "Saving..." : user.is_beta_tester ? "Beta" : "Standard"}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top text-xs" style={{ ...rowBaseStyle, color: "var(--adm-text2)" }}>
                              {formatAdminDate(user.created_at)}
                            </td>
                            <td className="px-4 py-4 align-top" style={rowBaseStyle}>
                              {uniqueRoles.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {uniqueRoles.map((role) => (
                                    <span
                                      key={role}
                                      className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold"
                                      style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}
                                    >
                                      {formatRole(role)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs" style={{ color: "var(--adm-muted)" }}>-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ backgroundColor: "var(--adm-surface)" }}>
                    <span className="text-xs" style={{ color: "var(--adm-text2)" }}>
                      {filteredUsers.length === users.length ? `${users.length} users in view` : `${filteredUsers.length} of ${users.length} users shown`}
                    </span>
                    <span className="text-[11px] sm:hidden" style={{ color: "var(--adm-muted)" }}>
                      Scroll horizontally for email, status, and roles.
                    </span>
                  </div>
                </>
              )}
            </AdminCard>
          </AdminSection>
        </section>
      </AdminPage>
    </AdminShell>
  );
}
