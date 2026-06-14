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
  AdminDataTable,
} from "../admin/components";

const ROLE_PRIORITY = {
  owner: 0,
  coach: 1,
  assistant_coach: 2,
  player: 3,
};

/** @param {string} role @returns {string} */
function formatRole(role) {
  if (!role) return "Unknown";
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** @param {string} name @param {string} email @returns {string} */
function getUserInitials(name, email) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map((part) => part[0]).join("").toUpperCase();
}

/** @param {string|null} value @returns {string} */
function formatAdminDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Returns memberships sorted by role priority then join date descending.
 * @param {Array} memberships
 * @returns {Array}
 */
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

  const columns = useMemo(() => [
    {
      key: "user",
      label: "User",
      width: "25%",
      render: (user) => {
        const hasCoachingRole = Boolean(user.can_view_activity);
        const memberships = getSortedMemberships(user.memberships);
        return (
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={hasCoachingRole
                ? { backgroundColor: "var(--ui-accent-muted)", color: "var(--ui-accent)" }
                : { backgroundColor: "var(--ui-surface-3)", color: "var(--ui-text-muted)" }}
            >
              {getUserInitials(user.name, user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => navigate(adminPath(basePath, `/users/${user.id}`))}
                className="block w-full truncate p-0 text-left text-sm font-semibold transition-colors"
                style={{ color: "var(--ui-text)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ui-accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ui-text)"; }}
              >
                {user.name || "Unnamed user"}
              </button>
              <p className="mt-1 truncate text-xs" style={{ color: "var(--ui-text-muted)" }}>
                {memberships.length > 0 ? `${memberships.length} ${memberships.length === 1 ? "team role" : "team roles"}` : "No team memberships"}
              </p>
              {!user.onboarded_at && (
                <div className="mt-2 flex gap-1 overflow-hidden">
                  <AdminBadge status="warning">Needs onboarding</AdminBadge>
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "email",
      label: "Email",
      width: "25%",
      render: (user) => (
        <div className="truncate text-xs" style={{ color: "var(--ui-text-muted)" }}>{user.email || "-"}</div>
      ),
    },
    {
      key: "teams",
      label: "Teams",
      width: "25%",
      render: (user) => {
        const memberships = getSortedMemberships(user.memberships);
        if (memberships.length === 0) return <span className="text-xs" style={{ color: "var(--ui-text-muted)" }}>-</span>;
        return (
          <div className="flex gap-1 overflow-hidden">
            {memberships.slice(0, 1).map((m) => (
              <span
                key={`${user.id}-${m.teamId}-${m.role}`}
                className="inline-flex items-center truncate rounded-full px-2.5 py-1 text-[10px] font-semibold"
                style={{ backgroundColor: "var(--ui-surface-3)", color: "var(--ui-text-muted)" }}
              >
                {m.teamName}
                <span className="ml-1 shrink-0" style={{ color: "var(--ui-text-subtle)" }}>
                  {formatRole(m.role)}
                </span>
              </span>
            ))}
            {memberships.length > 1 && (
              <span
                className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold"
                style={{ backgroundColor: "var(--ui-surface-3)", color: "var(--ui-text-muted)" }}
              >
                +{memberships.length - 1}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "plays",
      label: "Plays",
      width: "64px",
      align: "center",
      render: (user) => {
        const memberships = getSortedMemberships(user.memberships);
        const isPlayerOnly = memberships.length > 0 && memberships.every((m) => m.role === "player");
        if (isPlayerOnly) return <span className="text-xs" style={{ color: "var(--ui-text-muted)" }}>-</span>;
        return (
          <span
            className="inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: "var(--ui-accent-muted)", color: "var(--ui-accent)" }}
          >
            {user.plays_created ?? 0}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      width: "96px",
      render: (user) => (
        <div className="flex flex-col gap-1">
          <AdminBadge status={user.email_verified_at ? "resolved" : undefined}>
            {user.email_verified_at ? "Verified" : "Unverified"}
          </AdminBadge>
          {canEditStatus && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleToggleBetaStatus(user); }}
              disabled={savingUserId === user.id}
              title={user.is_beta_tester ? "Remove beta tester" : "Make beta tester"}
              className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={user.is_beta_tester
                ? { backgroundColor: "var(--adm-badge-purple-bg)", borderColor: "transparent", color: "var(--adm-badge-purple-text)" }
                : { backgroundColor: "var(--ui-surface-3)", borderColor: "var(--ui-border)", color: "var(--ui-text-muted)" }}
            >
              {savingUserId === user.id ? "Saving..." : user.is_beta_tester ? "Beta" : "Standard"}
            </button>
          )}
        </div>
      ),
    },
    {
      key: "joined",
      label: "Joined",
      width: "80px",
      render: (user) => <span className="text-xs" style={{ color: "var(--ui-text-muted)" }}>{formatAdminDate(user.created_at)}</span>,
    },
    {
      key: "roles",
      label: "Roles",
      width: "112px",
      render: (user) => {
        const memberships = getSortedMemberships(user.memberships);
        const uniqueRoles = Array.from(new Set(memberships.map((m) => m.role)));
        if (uniqueRoles.length === 0) return <span className="text-xs" style={{ color: "var(--ui-text-muted)" }}>-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {uniqueRoles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold"
                style={{ backgroundColor: "var(--ui-surface-3)", color: "var(--ui-text-muted)" }}
              >
                {formatRole(role)}
              </span>
            ))}
          </div>
        );
      },
    },
  ], [basePath, canEditStatus, savingUserId, handleToggleBetaStatus, navigate]);

  return (
    <AdminShell>
      <AdminHeader title="Users" backLabel="Dashboard" backTo={adminPath(basePath, "")} />
      <AdminPage>
        <section className="mx-auto max-w-6xl">
          <AdminSection
            title="User Directory"
            subtitle="Browse Coachable users and open each person's activity detail."
          >
            {error && (
              <p className="mb-3 text-sm" style={{ color: "var(--ui-danger)" }}>{error}</p>
            )}
            <AdminCard padding={false} className="overflow-hidden" style={{ border: "none" }}>
              <div className="px-4 py-2 text-[11px] sm:hidden" style={{ backgroundColor: "var(--ui-surface)", color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)" }}>
                Swipe sideways to view all columns.
              </div>
              <AdminDataTable
                columns={columns}
                data={filteredUsers}
                keyField="id"
                search={{
                  value: search,
                  onChange: (e) => setSearch(e.target.value),
                  onClear: () => setSearch(""),
                  placeholder: "Search by name, email, or team",
                  countLabel: users.length === filteredUsers.length ? "users" : `of ${users.length} users`,
                }}
                loading={loading}
                empty={
                  <AdminEmptyState
                    title={users.length === 0 ? "No users found" : "No matching users"}
                    subtitle={users.length === 0 ? "Users will appear here once accounts exist." : "Try a different search term."}
                  />
                }
                onRowClick={(user) => navigate(adminPath(basePath, `/users/${user.id}`))}
                stickyHeader
                minWidth="980px"
              />
            </AdminCard>
          </AdminSection>
        </section>
      </AdminPage>
    </AdminShell>
  );
}
