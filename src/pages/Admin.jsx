import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../utils/api";
import logo from "../assets/logos/full_Coachable_logo.png";

const SESSION_KEY = "coachable_admin_session";

export default function Admin() {
  const [session, setSession] = useState(() => localStorage.getItem(SESSION_KEY) || "");
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logging, setLogging] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", teamName: "", sport: "" });
  const [creating, setCreating] = useState(false);

  const authed = Boolean(session);

  const adminFetch = useCallback(
    async (path, options = {}) => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${path}`,
        {
          ...options,
          headers: {
            "Content-Type": "application/json",
            "x-admin-session": session,
            ...options.headers,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        }
      );
      if (res.status === 401) {
        localStorage.removeItem(SESSION_KEY);
        setSession("");
        throw new Error("Session expired");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
    [session]
  );

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLogging(true);
    try {
      const data = await apiFetch("/admin/login", {
        method: "POST",
        body: { password },
      });
      localStorage.setItem(SESSION_KEY, data.session);
      setSession(data.session);
      setPassword("");
    } catch (err) {
      setError(err.message || "Invalid password");
    } finally {
      setLogging(false);
    }
  };

  const handleLogout = () => {
    adminFetch("/admin/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem(SESSION_KEY);
    setSession("");
    setUsers([]);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch("/admin/users");
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    if (authed) fetchUsers();
  }, [authed, fetchUsers]);

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await adminFetch(`/admin/users/${id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await adminFetch("/admin/create-account", {
        method: "POST",
        body: createForm,
      });
      setCreateForm({ name: "", email: "", password: "", teamName: "", sport: "" });
      setShowCreate(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("DELETE ALL USERS? This cannot be undone!")) return;
    if (!window.confirm("Are you absolutely sure? ALL accounts will be permanently deleted.")) return;
    try {
      await adminFetch("/admin/users", { method: "DELETE" });
      setUsers([]);
    } catch (err) {
      setError(err.message);
    }
  };

  // Login screen
  if (!authed) {
    return (
      <div className="flex h-screen items-center justify-center bg-BrandBlack font-DmSans">
        <div className="w-full max-w-sm rounded-2xl bg-[#1e2228] p-8 shadow-xl">
          <img src={logo} alt="Coachable" className="mx-auto mb-6 h-6 opacity-70" />
          <h1 className="mb-1 text-center font-Manrope text-lg font-bold text-white">
            Admin Panel
          </h1>
          <p className="mb-6 text-center text-xs text-BrandGray">Restricted access</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full rounded-lg border border-BrandGray2/40 bg-BrandBlack px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-BrandGray focus:border-BrandOrange"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={logging || !password}
              className="w-full rounded-lg bg-BrandOrange py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {logging ? "Authenticating..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-BrandBlack font-DmSans text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-BrandGray2/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Coachable" className="h-5 opacity-70" />
          <span className="rounded bg-BrandOrange/20 px-2 py-0.5 text-xs font-semibold text-BrandOrange">
            ADMIN
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-BrandGray2/40 px-3 py-1.5 text-xs text-BrandGray transition hover:border-BrandGray hover:text-white"
        >
          Logout
        </button>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Stats + Actions */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-Manrope text-xl font-bold">Users</h2>
            <p className="text-sm text-BrandGray">{users.length} total accounts</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-BrandOrange px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
            >
              Create Account
            </button>
            <Link
              to="/admin/slate"
              className="rounded-lg border border-BrandOrange/40 px-3 py-1.5 text-xs font-semibold text-BrandOrange transition hover:border-BrandOrange hover:bg-BrandOrange/10"
            >
              Open Slate
            </Link>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="rounded-lg border border-BrandGray2/40 px-3 py-1.5 text-xs text-BrandGray transition hover:border-BrandGray hover:text-white disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={async () => {
                try {
                  const data = await adminFetch("/admin/cleanup", { method: "POST" });
                  setError("");
                  if (data.cleaned > 0) fetchUsers();
                  alert(`Cleaned up ${data.cleaned} stale account(s)`);
                } catch (err) { setError(err.message); }
              }}
              className="rounded-lg border border-yellow-500/40 px-3 py-1.5 text-xs font-semibold text-yellow-400 transition hover:bg-yellow-500/10"
            >
              Cleanup Stale
            </button>
            <button
              onClick={handleDeleteAll}
              className="rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-600/30"
            >
              Delete All Users
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-600/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Users table */}
        <div className="overflow-hidden rounded-xl border border-BrandGray2/20">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-BrandGray2/20 bg-[#1e2228]">
                <th className="px-4 py-3 text-xs font-semibold text-BrandGray">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-BrandGray">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-BrandGray">Team</th>
                <th className="px-4 py-3 text-xs font-semibold text-BrandGray">Verified</th>
                <th className="px-4 py-3 text-xs font-semibold text-BrandGray">Created</th>
                <th className="px-4 py-3 text-xs font-semibold text-BrandGray"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className={`border-b border-BrandGray2/10 transition hover:bg-[#1e2228]/50 ${!u.onboarded_at ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3 font-medium">
                    {u.name}
                    {!u.onboarded_at && (
                      <span className="ml-2 rounded bg-yellow-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-yellow-400 uppercase">
                        Not onboarded
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-BrandGray">{u.email}</td>
                  <td className="px-4 py-3 text-BrandGray">
                    {u.team_name ? (
                      <span>
                        {u.team_name}{" "}
                        <span className="text-xs text-BrandGray2">({u.role})</span>
                      </span>
                    ) : (
                      <span className="text-BrandGray2">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.email_verified_at ? (
                      <span className="text-BrandGreen">Yes</span>
                    ) : (
                      <span className="text-BrandGray2">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-BrandGray">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="rounded px-2 py-1 text-xs text-red-400 transition hover:bg-red-600/20"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-BrandGray2">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Account Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-xl border border-BrandGray2/20 bg-[#1e2228] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-Manrope text-base font-bold">Create Account</h2>
            <p className="mt-1 text-xs text-BrandGray">No email verification required. Leave team name blank to skip onboarding.</p>
            <form onSubmit={handleCreateAccount} className="mt-4 flex flex-col gap-3">
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Name *"
                required
                className="w-full rounded-lg border border-BrandGray2/40 bg-BrandBlack px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-BrandGray focus:border-BrandOrange"
              />
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email *"
                required
                className="w-full rounded-lg border border-BrandGray2/40 bg-BrandBlack px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-BrandGray focus:border-BrandOrange"
              />
              <input
                type="text"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Password * (min 6 chars)"
                required
                minLength={6}
                className="w-full rounded-lg border border-BrandGray2/40 bg-BrandBlack px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-BrandGray focus:border-BrandOrange"
              />
              <div className="mt-1 border-t border-BrandGray2/20 pt-3">
                <p className="mb-2 text-xs text-BrandGray">Optional: create a team (auto-onboards the user)</p>
                <input
                  type="text"
                  value={createForm.teamName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, teamName: e.target.value }))}
                  placeholder="Team name"
                  className="mb-2 w-full rounded-lg border border-BrandGray2/40 bg-BrandBlack px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-BrandGray focus:border-BrandOrange"
                />
                <input
                  type="text"
                  value={createForm.sport}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sport: e.target.value }))}
                  placeholder="Sport (e.g. Rugby)"
                  className="w-full rounded-lg border border-BrandGray2/40 bg-BrandBlack px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-BrandGray focus:border-BrandOrange"
                />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-BrandGray2/40 px-3.5 py-2 text-sm text-BrandGray transition hover:text-white">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50">
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
