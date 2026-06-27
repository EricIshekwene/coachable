/**
 * AssignmentsPage
 *
 * Redesigned Assignments for the Team Suite. Coaches assign real plays from the
 * team's playbook to the whole team. Players see their assignment feed, click
 * through to the play (logging a view automatically), and self-report mastery.
 * Coaches can override any member's status and see a progress overview.
 *
 * Data model:
 *   suite_assignments       — the assignment record, with play_id → plays
 *   suite_assignment_member_status — per-user viewed_at + status, keyed to users.id
 *   team_memberships        — source of truth for who's on the team
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useAppMessage } from "../../../context/AppMessageContext";
import { apiFetch } from "../../../utils/api";
import {
  FiPlus, FiX, FiChevronLeft, FiBookOpen, FiSearch,
  FiCheckCircle, FiCircle, FiTrash2, FiEdit2,
} from "react-icons/fi";
import PlayPreviewCard from "../../../components/PlayPreviewCard";

const COACH_ROLES = ["owner", "coach", "assistant_coach"];

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started", color: "bg-BrandGray2/15 text-BrandGray" },
  { value: "learning",    label: "Learning",    color: "bg-yellow-500/10 text-yellow-400" },
  { value: "ready",       label: "Ready",       color: "bg-blue-500/10 text-blue-400" },
  { value: "mastered",    label: "Mastered",    color: "bg-green-500/10 text-green-400" },
];
function statusMeta(val) { return STATUS_OPTIONS.find((s) => s.value === val) || STATUS_OPTIONS[0]; }

// ── Play Picker ───────────────────────────────────────────────────────────────

/**
 * @param {{ plays: object[], onSelect: (play)=>void, onClose: ()=>void }} props
 */
function PlayPickerModal({ plays, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const filtered = plays.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl border border-BrandGray2/20 bg-BrandBlack sm:rounded-2xl flex flex-col"
        style={{ maxHeight: "82vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-BrandGray2/15">
          <div>
            <h2 className="font-Manrope text-base font-bold">Assign a Play</h2>
            <p className="text-[11px] text-BrandGray2 mt-0.5">Pick from your team's playbook</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText"><FiX /></button>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2">
            <FiSearch className="shrink-0 text-sm text-BrandGray2" />
            <input autoFocus className="flex-1 bg-transparent text-sm text-BrandText outline-none placeholder:text-BrandGray2" placeholder="Search plays…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-5">
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-BrandGray2">{plays.length === 0 ? "No plays in your playbook yet." : `No plays match "${query}".`}</p>}
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((play) => (
              <button
                key={play.id}
                onClick={() => onSelect(play)}
                className="group flex flex-col rounded-xl border border-BrandGray2/20 bg-BrandBlack2/25 overflow-hidden hover:border-BrandOrange/50 hover:bg-BrandBlack2/60 transition text-left"
              >
                <div className="aspect-video w-full bg-BrandGray2/10 overflow-hidden">
                  {play.playData ? (
                    <PlayPreviewCard playData={play.playData} autoplay="hover" shape="fill" cameraMode="fit-distribution" background="field" className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><FiBookOpen className="text-2xl text-BrandGray2/30" /></div>
                  )}
                </div>
                <p className="px-3 py-2 text-xs font-semibold text-BrandText leading-tight line-clamp-2">{play.title}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Assignment creation modal ─────────────────────────────────────────────────

/**
 * @param {{ assignment: object|null, plays: object[], teamId: string, onSave: (a)=>void, onClose: ()=>void }} props
 */
function AssignmentModal({ assignment, plays, teamId, onSave, onClose }) {
  const isNew = !assignment?.id;
  const [selectedPlay, setSelectedPlay] = useState(() => assignment?.play_id ? plays.find((p) => p.id === assignment.play_id) || null : null);
  const [description, setDescription] = useState(assignment?.description || "");
  const [title, setTitle] = useState(assignment?.title || "");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const effectiveTitle = (title.trim() || selectedPlay?.title || "").trim();
    if (!effectiveTitle) { setError("Title is required."); return; }
    setSaving(true); setError("");
    try {
      const body = {
        title: effectiveTitle,
        description,
        assignmentType: selectedPlay ? "play" : "general",
        playId: selectedPlay?.id || undefined,
      };
      const endpoint = isNew
        ? `/teams/${teamId}/suite/assignments`
        : `/teams/${teamId}/suite/assignments/${assignment.id}`;
      const data = await apiFetch(endpoint, { method: isNew ? "POST" : "PATCH", body });
      onSave({ ...data.assignment, play_title: selectedPlay?.title, play_data: selectedPlay?.playData });
    } catch (err) {
      setError(err.message || "Save failed");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl border border-BrandGray2/20 bg-BrandBlack sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2 className="font-Manrope text-base font-bold">{isNew ? "New Assignment" : "Edit Assignment"}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText"><FiX /></button>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-4">
          {/* Play selector */}
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Play from Playbook</label>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-BrandGray2/25 bg-BrandBlack2/30 p-3 hover:border-BrandOrange/40 transition text-left"
            >
              <div className="h-14 w-20 shrink-0 rounded-xl overflow-hidden bg-BrandGray2/10 flex items-center justify-center border border-BrandGray2/15">
                {selectedPlay?.playData ? (
                  <PlayPreviewCard playData={selectedPlay.playData} autoplay="off" shape="fill" cameraMode="fit-distribution" background="field" className="w-full h-full" />
                ) : (
                  <FiBookOpen className="text-xl text-BrandGray2/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {selectedPlay ? (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-BrandOrange mb-0.5">Play selected</p>
                    <p className="text-sm font-bold text-BrandText truncate">{selectedPlay.title}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-BrandText">Pick a play</p>
                    <p className="text-[11px] text-BrandGray2">Optional but recommended</p>
                  </>
                )}
              </div>
              {selectedPlay ? (
                <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedPlay(null); }} className="shrink-0 rounded-md p-1.5 text-BrandGray2 hover:text-red-400">
                  <FiX className="text-sm" />
                </button>
              ) : (
                <FiPlus className="shrink-0 text-BrandGray2" />
              )}
            </button>
          </div>

          {/* Title (optional override) */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">
              {selectedPlay ? "Custom Title (optional)" : "Title *"}
            </label>
            <input
              className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder={selectedPlay ? `Leave blank to use "${selectedPlay.title}"` : "e.g. Study Inside Zone"}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Instructions / Notes</label>
            <textarea
              className="w-full resize-none rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="What should players focus on? Any notes for the team…"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving || (!title.trim() && !selectedPlay)}
            className="w-full rounded-lg bg-BrandOrange py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40"
          >
            {saving ? "Saving…" : isNew ? "Create Assignment" : "Save Changes"}
          </button>
        </div>

        {showPicker && (
          <PlayPickerModal
            plays={plays}
            onSelect={(play) => { setSelectedPlay(play); setShowPicker(false); }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── Assignment card (list view) ───────────────────────────────────────────────

/**
 * @param {{ assignment: object, statuses: object[], totalMembers: number,
 *           isCoach: bool, onClick: ()=>void,
 *           onEdit: ()=>void, onDelete: ()=>void }} props
 */
function AssignmentCard({ assignment, statuses, totalMembers, isCoach, onClick, onEdit, onDelete }) {
  const myStatuses = statuses.filter((s) => s.assignment_id === assignment.id);
  const viewedCount = myStatuses.filter((s) => s.viewed_at).length;
  const masteredCount = myStatuses.filter((s) => s.status === "mastered").length;
  const viewPct = totalMembers > 0 ? Math.round((viewedCount / totalMembers) * 100) : 0;

  return (
    <div
      className="group flex items-start gap-0 rounded-2xl border border-BrandGray2/15 bg-BrandBlack2/20 overflow-hidden cursor-pointer hover:border-BrandGray2/30 hover:bg-BrandBlack2/35 transition"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="h-full w-24 sm:w-32 shrink-0 bg-BrandGray2/10 overflow-hidden border-r border-BrandGray2/10" style={{ minHeight: 88 }}>
        {assignment.play_data ? (
          <PlayPreviewCard playData={assignment.play_data} autoplay="hover" shape="fill" cameraMode="fit-distribution" background="field" className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FiBookOpen className="text-2xl text-BrandGray2/30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-BrandOrange mb-0.5">Assignment</p>
        <p className="text-sm font-bold text-BrandText leading-snug">{assignment.title}</p>
        {assignment.description && (
          <p className="mt-1 text-[11px] text-BrandGray line-clamp-2 leading-relaxed">{assignment.description}</p>
        )}

        {/* Progress bar */}
        {totalMembers > 0 && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-BrandGray2">{viewedCount}/{totalMembers} viewed</span>
              {masteredCount > 0 && (
                <span className="text-[10px] font-semibold text-green-400">{masteredCount} mastered</span>
              )}
            </div>
            <div className="h-1 w-full rounded-full bg-BrandGray2/15">
              <div
                className="h-full rounded-full bg-BrandOrange transition-all"
                style={{ width: `${viewPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Coach actions */}
      {isCoach && (
        <div className="flex flex-col items-center gap-1 p-2 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText transition"
          >
            <FiEdit2 className="text-sm" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded-md p-1.5 text-BrandGray2 hover:text-red-400 transition"
          >
            <FiTrash2 className="text-sm" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Assignment detail view ────────────────────────────────────────────────────

/**
 * @param {{ assignment: object, members: object[], statuses: object[],
 *           teamId: string, isCoach: bool,
 *           onBack: ()=>void, onStatusChange: (status)=>void }} props
 */
function AssignmentDetail({ assignment, members, statuses, teamId, isCoach, onBack, onStatusChange }) {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(null);

  // Auto-log view when detail opens (for the current user if they're a player/member)
  useEffect(() => {
    apiFetch(`/teams/${teamId}/suite/assignments/${assignment.id}/view`, { method: "POST" })
      .then(() => {
        // Optimistically update local status to reflect viewed
        onStatusChange({ assignment_id: assignment.id, user_id: user?.id, viewed_at: new Date().toISOString() });
      })
      .catch(() => { /* silent */ });
  }, [assignment.id, teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatus = (userId) => statuses.find((s) => s.assignment_id === assignment.id && s.user_id === userId);

  const handleStatusChange = async (userId, status) => {
    setUpdating(userId);
    try {
      const data = await apiFetch(`/teams/${teamId}/suite/assignments/${assignment.id}/member-status`, {
        method: "PUT",
        body: isCoach ? { userId, status } : { status },
      });
      onStatusChange(data.status);
    } catch (err) {
      showMessage("Update failed", err.message, "error");
    } finally {
      setUpdating(null);
    }
  };

  const playerMembers = members.filter((m) => m.role === "player");
  const coachMembers = members.filter((m) => m.role !== "player");

  const renderMemberRow = (member) => {
    const st = getStatus(member.userId);
    const meta = statusMeta(st?.status || "not_started");
    const viewed = !!st?.viewed_at;
    const isMe = member.userId === user?.id;

    return (
      <div key={member.userId} className="flex items-center gap-3 px-4 py-3 border-b border-BrandGray2/8 last:border-0 hover:bg-BrandBlack2/20 transition">
        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-BrandGray2/15 text-xs font-bold text-BrandGray">
          {member.name?.[0] || "?"}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-BrandText truncate">{member.name}</p>
            {isMe && <span className="text-[9px] font-bold uppercase tracking-wider text-BrandGray2 bg-BrandGray2/10 rounded px-1.5 py-0.5">you</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {viewed ? (
              <FiCheckCircle className="text-[11px] text-green-400 shrink-0" />
            ) : (
              <FiCircle className="text-[11px] text-BrandGray2/40 shrink-0" />
            )}
            <span className="text-[10px] text-BrandGray2">{viewed ? "Viewed" : "Not viewed"}</span>
          </div>
        </div>

        {/* Status control */}
        {(isCoach || isMe) ? (
          <select
            value={st?.status || "not_started"}
            onChange={(e) => handleStatusChange(member.userId, e.target.value)}
            disabled={updating === member.userId}
            className="rounded-lg border border-BrandGray2/25 bg-BrandBlack2/50 px-2.5 py-1.5 text-[11px] font-semibold text-BrandText outline-none focus:border-BrandOrange disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        ) : (
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}>{meta.label}</span>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 md:px-10 md:py-12">
      <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-sm text-BrandGray2 hover:text-BrandText transition">
        <FiChevronLeft /> All Assignments
      </button>

      {/* Play hero */}
      <div className="mb-7 rounded-2xl border border-BrandGray2/15 overflow-hidden">
        <div className="aspect-video w-full bg-BrandGray2/10 overflow-hidden">
          {assignment.play_data ? (
            <PlayPreviewCard playData={assignment.play_data} autoplay="hover" shape="fill" cameraMode="fit-distribution" background="field" className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FiBookOpen className="text-4xl text-BrandGray2/25" />
            </div>
          )}
        </div>
        <div className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-BrandOrange mb-1">
            {assignment.play_id ? "Play Assignment" : "Assignment"}
          </p>
          <h1 className="font-Manrope text-xl font-bold leading-tight">{assignment.title}</h1>
          {assignment.description && (
            <p className="mt-2 text-sm text-BrandGray leading-relaxed">{assignment.description}</p>
          )}
          {assignment.play_id && (
            <button
              onClick={() => navigate(`/app/plays/${assignment.play_id}`)}
              className="mt-4 flex items-center gap-2 rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
            >
              <FiBookOpen /> View Play
            </button>
          )}
        </div>
      </div>

      {/* Members progress */}
      {members.length === 0 ? (
        <p className="text-sm text-BrandGray2 text-center py-6">No team members found.</p>
      ) : (
        <div className="rounded-2xl border border-BrandGray2/15 overflow-hidden">
          {playerMembers.length > 0 && (
            <>
              <div className="px-4 py-2.5 bg-BrandBlack2/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-BrandGray2">Players ({playerMembers.length})</p>
              </div>
              {playerMembers.map(renderMemberRow)}
            </>
          )}
          {coachMembers.length > 0 && (
            <>
              <div className={`px-4 py-2.5 bg-BrandBlack2/30 ${playerMembers.length > 0 ? "border-t border-BrandGray2/10" : ""}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-BrandGray2">Coaches ({coachMembers.length})</p>
              </div>
              {coachMembers.map(renderMemberRow)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * AssignmentsPage — play-first assignment tracker for the full team.
 */
export default function AssignmentsPage() {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const isCoach = COACH_ROLES.includes(user?.role);
  const teamId = user?.teamId;

  const [assignments, setAssignments] = useState([]);
  const [plays, setPlays] = useState([]);
  const [members, setMembers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [modalAssignment, setModalAssignment] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const [asgnData, membersData, statusData, playsData] = await Promise.all([
        apiFetch(`/teams/${teamId}/suite/assignments`),
        apiFetch(`/teams/${teamId}/suite/assignments/members`),
        apiFetch(`/teams/${teamId}/suite/assignments/member-statuses`),
        apiFetch(`/teams/${teamId}/suite/plays`).catch(() => ({ plays: [] })),
      ]);
      setAssignments(asgnData.assignments || []);
      setMembers(membersData.members || []);
      setStatuses(statusData.statuses || []);
      setPlays(playsData.plays || []);
    } catch (err) {
      showMessage("Failed to load assignments", err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [teamId, showMessage]);

  useEffect(() => { load(); }, [load]);

  const handleSave = (saved) => {
    setAssignments((prev) => {
      const exists = prev.find((a) => a.id === saved.id);
      return exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...prev];
    });
    setModalAssignment(null);
    if (selectedAssignment?.id === saved.id) setSelectedAssignment(saved);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiFetch(`/teams/${teamId}/suite/assignments/${confirmDelete.id}`, { method: "DELETE" });
      setAssignments((prev) => prev.filter((a) => a.id !== confirmDelete.id));
      if (selectedAssignment?.id === confirmDelete.id) setSelectedAssignment(null);
      showMessage("Assignment deleted", "", "success");
    } catch (err) {
      showMessage("Delete failed", err.message, "error");
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleStatusChange = (updated) => {
    setStatuses((prev) => {
      const exists = prev.find((s) => s.assignment_id === updated.assignment_id && s.user_id === updated.user_id);
      return exists
        ? prev.map((s) => (s.assignment_id === updated.assignment_id && s.user_id === updated.user_id ? { ...s, ...updated } : s))
        : [...prev, updated];
    });
  };

  if (selectedAssignment) {
    const fullAssignment = assignments.find((a) => a.id === selectedAssignment.id) || selectedAssignment;
    return (
      <AssignmentDetail
        assignment={fullAssignment}
        members={members}
        statuses={statuses}
        teamId={teamId}
        isCoach={isCoach}
        onBack={() => setSelectedAssignment(null)}
        onStatusChange={handleStatusChange}
      />
    );
  }

  // For players: show only their own status feed
  const playerAssignments = isCoach
    ? assignments
    : assignments;

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 md:px-10 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-Manrope text-xl font-bold tracking-tight">Assignments</h1>
          <p className="mt-0.5 text-sm text-BrandGray2">
            {isCoach
              ? `${assignments.length} assignment${assignments.length !== 1 ? "s" : ""} · ${members.length} members`
              : `${assignments.length} assignment${assignments.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {isCoach && (
          <button
            onClick={() => setModalAssignment({})}
            className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
          >
            <FiPlus /> Assign Play
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange animate-spin" />
        </div>
      )}

      {!loading && playerAssignments.length === 0 && (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-BrandGray2/10">
            <FiBookOpen className="text-2xl text-BrandGray2" />
          </div>
          <p className="font-Manrope text-base font-semibold">No assignments yet</p>
          <p className="mt-1 text-sm text-BrandGray2">
            {isCoach
              ? "Assign a play from your playbook and the whole team will see it here."
              : "No plays have been assigned to the team yet."}
          </p>
          {isCoach && (
            <button
              onClick={() => setModalAssignment({})}
              className="mt-4 mx-auto flex items-center gap-1.5 rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
            >
              <FiPlus /> Assign a Play
            </button>
          )}
        </div>
      )}

      {!loading && playerAssignments.length > 0 && (
        <div className="flex flex-col gap-3">
          {playerAssignments.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              statuses={statuses}
              totalMembers={members.length}
              isCoach={isCoach}
              onClick={() => setSelectedAssignment(a)}
              onEdit={() => setModalAssignment(a)}
              onDelete={() => setConfirmDelete(a)}
            />
          ))}
        </div>
      )}

      {modalAssignment !== null && (
        <AssignmentModal
          assignment={modalAssignment.id ? modalAssignment : null}
          plays={plays}
          teamId={teamId}
          onSave={handleSave}
          onClose={() => setModalAssignment(null)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-BrandGray2/20 bg-BrandBlack p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-Manrope text-base font-bold mb-2">Delete assignment?</h2>
            <p className="text-sm text-BrandGray">Delete <strong className="text-BrandText">{confirmDelete.title}</strong> and all progress records?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-BrandGray2/40 px-3.5 py-2 text-sm text-BrandGray hover:text-BrandText">Cancel</button>
              <button onClick={handleDelete} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
