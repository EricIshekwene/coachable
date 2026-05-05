import { useState } from "react";
import { Link } from "react-router-dom";
import { adminPath } from "../adminNav";
import { useAdmin } from "../AdminContext";
import AdminBadge from "../components/AdminBadge";

function formatTime(ts) {
  const d = new Date(ts);
  const diffMin = Math.floor((Date.now() - d) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return diffDays < 7 ? `${diffDays}d ago` : d.toLocaleDateString();
}

function fmtSport(s) {
  if (!s) return null;
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Row for a recent user. */
function UserRow({ user, basePath }) {
  return (
    <Link
      to={adminPath(basePath, `/users/${user.id}`)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 14px",
        borderRadius: "var(--adm-radius-sm)",
        textDecoration: "none",
        transition: "background-color 0.12s",
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--adm-surface2)"}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 400, color: "var(--adm-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {user.name}
        </span>
        <span style={{ fontSize: 11, color: "var(--adm-muted)" }}>
          {user.email}
          {user.sport ? ` · ${fmtSport(user.sport)}` : ""}
        </span>
      </div>
      <span style={{ fontSize: 11, color: "var(--adm-muted)", whiteSpace: "nowrap", marginLeft: 12 }}>
        {formatTime(user.created_at)}
      </span>
    </Link>
  );
}

/** Row for a recent error group. */
function ErrorRow({ error }) {
  const label = error.error_message?.slice(0, 70) || "Unknown error";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 14px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 400, color: "var(--adm-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: "var(--adm-muted)" }}>
          {error.component || "unknown"}{error.count > 1 ? ` · ×${error.count}` : ""}
        </span>
      </div>
      <span style={{ fontSize: 11, color: "var(--adm-muted)", whiteSpace: "nowrap", marginLeft: 12 }}>
        {formatTime(error.last_seen)}
      </span>
    </div>
  );
}

/** Row for a recent user issue. */
function IssueRow({ issue, basePath }) {
  return (
    <Link
      to={adminPath(basePath, "/user-issues")}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 14px",
        borderRadius: "var(--adm-radius-sm)",
        textDecoration: "none",
        transition: "background-color 0.12s",
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--adm-surface2)"}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <AdminBadge status={issue.status} />
        <span style={{ fontSize: 13, fontWeight: 400, color: "var(--adm-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {issue.title}
        </span>
      </div>
      <span style={{ fontSize: 11, color: "var(--adm-muted)", whiteSpace: "nowrap", marginLeft: 12 }}>
        {formatTime(issue.created_at)}
      </span>
    </Link>
  );
}

const TABS = [
  { key: "users",  label: "New Users" },
  { key: "errors", label: "Errors" },
  { key: "issues", label: "Issues" },
];

/**
 * Tabbed activity feed showing recent users, errors, and issues.
 *
 * @param {{
 *   users: Array,
 *   errors: Array,
 *   issues: Array,
 * }} props
 */
export default function ActivityFeed({ users, errors, issues }) {
  const [tab, setTab] = useState("users");
  const { basePath } = useAdmin();

  const counts = { users: users?.length ?? 0, errors: errors?.length ?? 0, issues: issues?.length ?? 0 };

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--adm-border)", marginBottom: 4, paddingBottom: 2 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              fontWeight: 400,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: tab === t.key ? "var(--adm-accent)" : "var(--adm-muted)",
              borderBottom: tab === t.key ? "2px solid var(--adm-accent)" : "2px solid transparent",
              marginBottom: -1,
              transition: "color 0.12s",
            }}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span style={{
                marginLeft: 6,
                fontSize: 10,
                fontWeight: 700,
                backgroundColor: tab === t.key ? "var(--adm-accent)" : "var(--adm-surface2)",
                color: tab === t.key ? "#fff" : "var(--adm-muted)",
                borderRadius: 10,
                padding: "1px 6px",
              }}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {tab === "users" && (
          users?.length
            ? users.map((u) => <UserRow key={u.id} user={u} basePath={basePath} />)
            : <p style={{ color: "var(--adm-muted)", fontSize: 13, padding: "20px 14px" }}>No recent users</p>
        )}
        {tab === "errors" && (
          errors?.length
            ? errors.map((e) => <ErrorRow key={e.id} error={e} />)
            : <p style={{ color: "var(--adm-muted)", fontSize: 13, padding: "20px 14px" }}>No errors in this period</p>
        )}
        {tab === "issues" && (
          issues?.length
            ? issues.map((i) => <IssueRow key={i.id} issue={i} basePath={basePath} />)
            : <p style={{ color: "var(--adm-muted)", fontSize: 13, padding: "20px 14px" }}>No open issues</p>
        )}
      </div>
    </div>
  );
}
