/**
 * AdminTeamSuitePage
 *
 * Admin control panel for enabling / disabling Team Suite features per team.
 * Each of the 5 features can be toggled independently using a toggle switch.
 *
 * Uses /admin/team-suite routes (requireOwnerOrLegacyAdmin).
 */

import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../admin/adminTransport";
import {
  AdminShell, AdminHeader, AdminPage, AdminCard,
  AdminSpinner, AdminToggle, AdminAlert,
} from "../admin/components";

const FEATURES = [
  { key: "roster",           label: "Roster",           desc: "Player roster & depth chart management" },
  { key: "practice_plans",   label: "Practice Plans",   desc: "Build and schedule practice plans with blocks" },
  { key: "install_calendar", label: "Install Calendar", desc: "Calendar of what concepts/plays are being installed" },
  { key: "game_plans",       label: "Game Plans",       desc: "Structured scouting and game preparation docs" },
  { key: "assignments",      label: "Assignments",      desc: "Assign plays/concepts to players with progress tracking" },
];

/**
 * A row representing one team with toggles for each suite feature.
 * @param {{ team: object, onToggle: (teamId:string, feature:string, enabled:boolean)=>void }} props
 */
function TeamRow({ team, onToggle }) {
  const [toggling, setToggling] = useState(null);

  const handleToggle = async (feature, newVal) => {
    setToggling(feature);
    try {
      await onToggle(team.id, feature, newVal);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="rounded-xl border" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--adm-border)" }}>
        <div>
          <p className="font-Manrope text-sm font-bold" style={{ color: "var(--adm-text)" }}>{team.name}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--adm-text2)" }}>
            {team.sport ? `${team.sport} · ` : ""}{team.owner_email}
          </p>
        </div>
        {team.is_personal && (
          <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}>Personal</span>
        )}
      </div>
      <div className="divide-y" style={{ borderColor: "var(--adm-border)" }}>
        {FEATURES.map((f) => (
          <div key={f.key} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{f.label}</p>
              <p className="text-xs" style={{ color: "var(--adm-text2)" }}>{f.desc}</p>
            </div>
            <AdminToggle
              checked={team.suiteFeatures?.[f.key] ?? false}
              disabled={toggling === f.key}
              onChange={(v) => handleToggle(f.key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Admin page for managing Team Suite feature entitlements per team.
 */
export default function AdminTeamSuitePage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi("/admin/team-suite");
      setTeams(data.teams || []);
    } catch (err) {
      setError(err.message || "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (teamId, feature, enabled) => {
    try {
      const data = await adminApi(`/admin/team-suite/${teamId}/${feature}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId ? { ...t, suiteFeatures: data.suiteFeatures } : t
        )
      );
    } catch (err) {
      setError(err.message || "Toggle failed");
    }
  };

  const filtered = teams.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.owner_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell>
      <AdminHeader title="Team Suite" subtitle="Enable or disable paid suite features per team" />
      <AdminPage>
        {error && <AdminAlert type="error" message={error} onClose={() => setError("")} className="mb-5" />}

        <AdminCard>
          <div className="mb-5 flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams…"
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1"
              style={{
                borderColor: "var(--adm-border)",
                backgroundColor: "var(--adm-surface2)",
                color: "var(--adm-text)",
              }}
            />
            <span className="text-sm" style={{ color: "var(--adm-text2)" }}>
              {filtered.length} team{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading && <div className="flex justify-center py-12"><AdminSpinner /></div>}

          {!loading && filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: "var(--adm-text2)" }}>
                {search ? "No teams match your search." : "No teams found."}
              </p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="flex flex-col gap-4">
              {filtered.map((team) => (
                <TeamRow key={team.id} team={team} onToggle={handleToggle} />
              ))}
            </div>
          )}
        </AdminCard>
      </AdminPage>
    </AdminShell>
  );
}
