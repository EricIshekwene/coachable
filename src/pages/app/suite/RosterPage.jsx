/**
 * RosterPage
 *
 * Roster for the Team Suite — table layout with inline row editing.
 * Real team members (from team_memberships) are the primary source of truth.
 * Coaches can add jersey #, position, year, status, free-form tags, and notes.
 * Tags are used to filter and group players across the roster.
 * Unlisted players (suite_players with no user link) are shown in a separate section.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useAppMessage } from "../../../context/AppMessageContext";
import { apiFetch } from "../../../utils/api";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiChevronDown, FiChevronUp } from "react-icons/fi";

const COACH_ROLES = ["owner", "coach", "assistant_coach"];
const ROLE_LABELS = { owner: "Owner", coach: "Coach", assistant_coach: "Asst. Coach", player: "Player" };
const STATUS_LABELS = { active: "Active", inactive: "Inactive", injured: "Injured" };
const STATUS_COLORS = {
  active: "text-green-400",
  inactive: "text-BrandGray",
  injured: "text-red-400",
};

const EMPTY_PLAYER = { name: "", jerseyNumber: "", position: "", classYear: "", status: "active", notes: "", tags: [] };

// ── Tag input ─────────────────────────────────────────────────────────────────

/**
 * Free-form tag chips input. Press Enter or comma to add a tag.
 * @param {{ tags: string[], onChange: (tags)=>void, disabled?: bool }} props
 */
function TagInput({ tags, onChange, disabled }) {
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  const addTag = (raw) => {
    const tag = raw.trim();
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setInput("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div
      className={`flex flex-wrap gap-1 rounded-lg border border-BrandGray2/25 bg-BrandBlack2/50 px-2 py-1.5 min-h-[36px] cursor-text ${disabled ? "opacity-60 pointer-events-none" : ""}`}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded-md bg-BrandOrange/15 pl-2 pr-1 py-0.5 text-[11px] font-semibold text-BrandOrange">
          {tag}
          {!disabled && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(tags.filter((t) => t !== tag)); }} className="rounded hover:text-red-400">
              <FiX className="text-[9px]" />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value.replace(",", ""))}
          onKeyDown={handleKey}
          onBlur={() => input && addTag(input)}
          placeholder={tags.length === 0 ? "Add tag, press Enter" : ""}
          className="flex-1 min-w-[80px] bg-transparent text-xs text-BrandText outline-none placeholder:text-BrandGray2/50"
        />
      )}
    </div>
  );
}

// ── Member row (table) ────────────────────────────────────────────────────────

/**
 * One row in the roster table. Click edit to expand inline form below the row.
 * @param {{ member: object, isCoach: bool, teamId: string, onUpdated: (m)=>void }} props
 */
function MemberRow({ member, isCoach, teamId, onUpdated }) {
  const { showMessage } = useAppMessage();
  const [editing, setEditing] = useState(false);
  const sp = member.suitePlayer;

  const [form, setForm] = useState({
    jerseyNumber: sp?.jersey_number || "",
    position: sp?.position || "",
    classYear: sp?.class_year || "",
    status: sp?.status || "active",
    notes: sp?.notes || "",
    tags: sp?.tags || [],
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await apiFetch(`/teams/${teamId}/suite/roster/member/${member.userId}`, {
        method: "PATCH",
        body: form,
      });
      onUpdated({ ...member, suitePlayer: data.suitePlayer });
      setEditing(false);
    } catch (err) {
      showMessage("Save failed", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      jerseyNumber: sp?.jersey_number || "",
      position: sp?.position || "",
      classYear: sp?.class_year || "",
      status: sp?.status || "active",
      notes: sp?.notes || "",
      tags: sp?.tags || [],
    });
    setEditing(false);
  };

  const inputCls = "w-full rounded-md border border-BrandGray2/25 bg-BrandBlack2/60 px-2 py-1.5 text-xs text-BrandText outline-none focus:border-BrandOrange";

  return (
    <>
      <tr className={`border-b border-BrandGray2/8 hover:bg-BrandBlack2/20 transition ${editing ? "bg-BrandBlack2/20" : ""}`}>
        {/* Jersey # */}
        <td className="px-3 py-3 text-center">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-BrandOrange/15 text-xs font-bold text-BrandOrange">
            {sp?.jersey_number || member.name?.[0] || "?"}
          </span>
        </td>
        {/* Name */}
        <td className="px-3 py-3">
          <p className="text-sm font-semibold text-BrandText leading-tight">{member.name}</p>
          <p className="text-[10px] text-BrandGray2 mt-0.5">{member.email}</p>
        </td>
        {/* Position */}
        <td className="px-3 py-3 text-xs text-BrandGray hidden sm:table-cell">{sp?.position || <span className="text-BrandGray2/40">—</span>}</td>
        {/* Year */}
        <td className="px-3 py-3 text-xs text-BrandGray hidden md:table-cell">{sp?.class_year || <span className="text-BrandGray2/40">—</span>}</td>
        {/* Status */}
        <td className="px-3 py-3">
          <span className={`text-[11px] font-semibold ${STATUS_COLORS[sp?.status || "active"]}`}>
            {STATUS_LABELS[sp?.status || "active"]}
          </span>
        </td>
        {/* Tags */}
        <td className="px-3 py-3 hidden lg:table-cell">
          <div className="flex flex-wrap gap-1">
            {(sp?.tags || []).map((tag) => (
              <span key={tag} className="rounded-md bg-BrandBlack2/60 border border-BrandGray2/20 px-1.5 py-0.5 text-[10px] font-semibold text-BrandGray">
                {tag}
              </span>
            ))}
          </div>
        </td>
        {/* Role */}
        <td className="px-3 py-3 hidden xl:table-cell">
          <span className="rounded-md bg-BrandBlack2/50 px-1.5 py-0.5 text-[10px] font-semibold text-BrandGray2">
            {ROLE_LABELS[member.role] || member.role}
          </span>
        </td>
        {/* Actions */}
        <td className="px-3 py-3">
          {isCoach && (
            <button
              onClick={() => setEditing((v) => !v)}
              className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText transition"
            >
              {editing ? <FiChevronUp className="text-sm" /> : <FiEdit2 className="text-sm" />}
            </button>
          )}
        </td>
      </tr>

      {/* Inline edit form */}
      {editing && isCoach && (
        <tr className="border-b border-BrandGray2/8 bg-BrandBlack2/30">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">Jersey #</label>
                <input className={inputCls} value={form.jerseyNumber} onChange={(e) => set("jerseyNumber", e.target.value)} maxLength={10} placeholder="42" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">Position</label>
                <input className={inputCls} value={form.position} onChange={(e) => set("position", e.target.value)} maxLength={40} placeholder="QB / Prop" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">Year</label>
                <input className={inputCls} value={form.classYear} onChange={(e) => set("classYear", e.target.value)} maxLength={20} placeholder="Sr. / 2026" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">Status</label>
                <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="injured">Injured</option>
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">Tags</label>
              <TagInput tags={form.tags} onChange={(tags) => set("tags", tags)} />
              <p className="mt-1 text-[10px] text-BrandGray2/60">Press Enter or comma to add. Tags are used to filter the roster.</p>
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">Notes</label>
              <input className={inputCls} value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} placeholder="Starter, captain, right wing…" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={handleCancel} className="rounded-lg border border-BrandGray2/30 px-3 py-1.5 text-xs text-BrandGray hover:text-BrandText">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-BrandOrange px-4 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-40">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Roster table section ──────────────────────────────────────────────────────

/**
 * @param {{ title: string, count: number, rows: object[], isCoach: bool, teamId: string,
 *           filterTag: string|null, onUpdated: (m)=>void }} props
 */
function RosterSection({ title, count, rows, isCoach, teamId, filterTag, onUpdated }) {
  const filtered = filterTag ? rows.filter((m) => (m.suitePlayer?.tags || []).includes(filterTag)) : rows;

  if (filtered.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-BrandGray2">{title}</p>
        <span className="text-[10px] font-semibold text-BrandGray2">{filtered.length}</span>
      </div>
      <div className="rounded-2xl border border-BrandGray2/15 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="border-b border-BrandGray2/10 bg-BrandBlack2/30">
                <th className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider text-BrandGray2 w-12">#</th>
                <th className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider text-BrandGray2">Name</th>
                <th className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider text-BrandGray2 hidden sm:table-cell">Position</th>
                <th className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider text-BrandGray2 hidden md:table-cell">Year</th>
                <th className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider text-BrandGray2">Status</th>
                <th className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider text-BrandGray2 hidden lg:table-cell">Tags</th>
                <th className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider text-BrandGray2 hidden xl:table-cell">Role</th>
                <th className="px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  isCoach={isCoach}
                  teamId={teamId}
                  onUpdated={onUpdated}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Unlisted player modal ─────────────────────────────────────────────────────

/**
 * Modal for creating or editing an unlisted (no account) player.
 * @param {{ player: object|null, teamId: string, onSave: (p)=>void, onClose: ()=>void }} props
 */
function UnlistedPlayerModal({ player, teamId, onSave, onClose }) {
  const { showMessage } = useAppMessage();
  const isNew = !player?.id;
  const [form, setForm] = useState(() => player
    ? { name: player.name, jerseyNumber: player.jersey_number || "", position: player.position || "", classYear: player.class_year || "", status: player.status || "active", notes: player.notes || "", tags: player.tags || [] }
    : { ...EMPTY_PLAYER }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");
    try {
      const endpoint = isNew ? `/teams/${teamId}/suite/roster` : `/teams/${teamId}/suite/roster/${player.id}`;
      const data = await apiFetch(endpoint, { method: isNew ? "POST" : "PATCH", body: form });
      onSave(data.player);
    } catch (err) {
      setError(err.message || "Save failed");
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-BrandGray2/20 bg-BrandBlack p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-Manrope text-base font-bold">{isNew ? "Add Unlisted Player" : "Edit Player"}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText"><FiX /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Name *</label>
            <input autoFocus className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={80} placeholder="Full name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">#</label>
              <input className={inputCls} value={form.jerseyNumber} onChange={(e) => set("jerseyNumber", e.target.value)} maxLength={10} placeholder="42" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Position</label>
              <input className={inputCls} value={form.position} onChange={(e) => set("position", e.target.value)} maxLength={40} placeholder="QB" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Year</label>
              <input className={inputCls} value={form.classYear} onChange={(e) => set("classYear", e.target.value)} maxLength={20} placeholder="Sr." />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Status</label>
              <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="injured">Injured</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Tags</label>
            <TagInput tags={form.tags} onChange={(tags) => set("tags", tags)} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Notes</label>
            <textarea className={`${inputCls} resize-none`} value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} maxLength={2000} placeholder="Tryout player, walk-on, etc." />
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-BrandGray2/40 px-3.5 py-2 text-sm text-BrandGray hover:text-BrandText">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40">{saving ? "Saving…" : isNew ? "Add Player" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * RosterPage — table view with tag filtering and inline row editing.
 */
export default function RosterPage() {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const isCoach = COACH_ROLES.includes(user?.role);
  const teamId = user?.teamId;

  const [members, setMembers] = useState([]);
  const [unlisted, setUnlisted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState(null);
  const [showUnlisted, setShowUnlisted] = useState(false);
  const [modalPlayer, setModalPlayer] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/teams/${teamId}/suite/roster/members`);
      setMembers(data.members || []);
      setUnlisted(data.unlisted || []);
    } catch (err) {
      showMessage("Failed to load roster", err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [teamId, showMessage]);

  useEffect(() => { load(); }, [load]);

  const handleMemberUpdated = (updated) => {
    setMembers((prev) => prev.map((m) => (m.userId === updated.userId ? updated : m)));
  };

  const handleUnlistedSave = (saved) => {
    setUnlisted((prev) => {
      const exists = prev.find((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved];
    });
    setModalPlayer(null);
    showMessage(saved.created_at ? "Player added" : "Player updated", "", "success");
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/teams/${teamId}/suite/roster/${confirmDelete.id}`, { method: "DELETE" });
      setUnlisted((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      showMessage("Player removed", "", "success");
    } catch (err) {
      showMessage("Delete failed", err.message, "error");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const players = members.filter((m) => m.role === "player");
  const coaches = members.filter((m) => m.role !== "player");

  // Collect all unique tags across members + unlisted
  const allTags = [...new Set([
    ...members.flatMap((m) => m.suitePlayer?.tags || []),
    ...unlisted.flatMap((p) => p.tags || []),
  ])].sort();

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-10 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-Manrope text-xl font-bold tracking-tight">Roster</h1>
          <p className="mt-0.5 text-sm text-BrandGray2">
            {members.length} member{members.length !== 1 ? "s" : ""}
            {unlisted.length > 0 ? ` · ${unlisted.length} unlisted` : ""}
          </p>
        </div>
        {isCoach && (
          <button
            onClick={() => setModalPlayer({})}
            className="flex items-center gap-1.5 rounded-lg border border-BrandGray2/25 bg-BrandBlack2/40 px-3.5 py-2 text-sm font-semibold text-BrandText hover:border-BrandGray2/50 hover:bg-BrandBlack2 transition"
          >
            <FiPlus /> Add Unlisted
          </button>
        )}
      </div>

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterTag(null)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${!filterTag ? "bg-BrandOrange text-white" : "bg-BrandBlack2/50 text-BrandGray hover:text-BrandText border border-BrandGray2/20"}`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filterTag === tag ? "bg-BrandOrange text-white" : "bg-BrandBlack2/50 text-BrandGray hover:text-BrandText border border-BrandGray2/20"}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* Players section */}
          {players.length > 0 && (
            <RosterSection
              title="Players"
              count={players.length}
              rows={players}
              isCoach={isCoach}
              teamId={teamId}
              filterTag={filterTag}
              onUpdated={handleMemberUpdated}
            />
          )}

          {players.length === 0 && !loading && (
            <div className="mb-6 rounded-2xl border border-dashed border-BrandGray2/20 py-10 text-center">
              <p className="text-sm font-semibold">No players on the team yet</p>
              <p className="mt-1 text-xs text-BrandGray2">Players join via the team invite code from the Team page.</p>
            </div>
          )}

          {/* Coaching staff */}
          {coaches.length > 0 && (
            <RosterSection
              title="Coaching Staff"
              count={coaches.length}
              rows={coaches}
              isCoach={isCoach}
              teamId={teamId}
              filterTag={filterTag}
              onUpdated={handleMemberUpdated}
            />
          )}

          {/* Unlisted players (collapsible) */}
          {(unlisted.length > 0 || isCoach) && (
            <div className="rounded-2xl border border-BrandGray2/15 overflow-hidden">
              <button
                className="flex w-full items-center justify-between px-4 py-3 bg-BrandBlack2/30 hover:bg-BrandBlack2/50 transition"
                onClick={() => setShowUnlisted((v) => !v)}
              >
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-BrandGray2">Unlisted Players</p>
                  <p className="text-[11px] text-BrandGray2/60 mt-0.5">Players without a Coachable account</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-BrandGray2">{unlisted.length}</span>
                  {showUnlisted ? <FiChevronUp className="text-BrandGray2 text-sm" /> : <FiChevronDown className="text-BrandGray2 text-sm" />}
                </div>
              </button>

              {showUnlisted && (
                <>
                  {unlisted.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-BrandGray2">No unlisted players yet.</p>
                      {isCoach && (
                        <button onClick={() => setModalPlayer({})} className="mt-3 mx-auto flex items-center gap-1.5 rounded-lg border border-BrandGray2/25 px-3 py-1.5 text-xs text-BrandGray2 hover:text-BrandText hover:border-BrandGray2/50 transition">
                          <FiPlus /> Add Player
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[420px]">
                        <thead>
                          <tr className="border-b border-BrandGray2/10 bg-BrandBlack2/20">
                            <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-BrandGray2 w-12">#</th>
                            <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-BrandGray2">Name</th>
                            <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-BrandGray2 hidden sm:table-cell">Position</th>
                            <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-BrandGray2">Status</th>
                            <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-BrandGray2 hidden md:table-cell">Tags</th>
                            <th className="px-3 py-2 w-20"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {unlisted.map((player) => (
                            <tr key={player.id} className="border-b border-BrandGray2/8 last:border-0 hover:bg-BrandBlack2/20 transition">
                              <td className="px-3 py-3 text-center">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-BrandGray2/15 text-[11px] font-bold text-BrandGray">
                                  {player.jersey_number || player.name?.[0] || "?"}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <p className="text-sm font-semibold text-BrandText">{player.name}</p>
                                {player.notes && <p className="text-[10px] text-BrandGray2 truncate max-w-[160px]">{player.notes}</p>}
                              </td>
                              <td className="px-3 py-3 text-xs text-BrandGray hidden sm:table-cell">{player.position || "—"}</td>
                              <td className="px-3 py-3">
                                <span className={`text-[11px] font-semibold ${STATUS_COLORS[player.status || "active"]}`}>
                                  {STATUS_LABELS[player.status || "active"]}
                                </span>
                              </td>
                              <td className="px-3 py-3 hidden md:table-cell">
                                <div className="flex flex-wrap gap-1">
                                  {(player.tags || []).map((tag) => (
                                    <span key={tag} className="rounded-md bg-BrandBlack2/60 border border-BrandGray2/20 px-1.5 py-0.5 text-[10px] font-semibold text-BrandGray">{tag}</span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                {isCoach && (
                                  <div className="flex gap-1">
                                    <button onClick={() => setModalPlayer(player)} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText transition"><FiEdit2 className="text-sm" /></button>
                                    <button onClick={() => setConfirmDelete(player)} className="rounded-md p-1.5 text-BrandGray2 hover:text-red-400 transition"><FiTrash2 className="text-sm" /></button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {isCoach && (
                        <div className="px-4 py-3 border-t border-BrandGray2/8">
                          <button onClick={() => setModalPlayer({})} className="flex items-center gap-1.5 text-xs text-BrandGray2 hover:text-BrandOrange transition">
                            <FiPlus /> Add another
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Add/edit unlisted modal */}
      {modalPlayer !== null && (
        <UnlistedPlayerModal
          player={modalPlayer.id ? modalPlayer : null}
          teamId={teamId}
          onSave={handleUnlistedSave}
          onClose={() => setModalPlayer(null)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-BrandGray2/20 bg-BrandBlack p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-Manrope text-base font-bold mb-2">Remove player?</h2>
            <p className="text-sm text-BrandGray">Remove <strong className="text-BrandText">{confirmDelete.name}</strong> from unlisted players?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-BrandGray2/40 px-3.5 py-2 text-sm text-BrandGray hover:text-BrandText">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40">{deleting ? "Removing…" : "Remove"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
