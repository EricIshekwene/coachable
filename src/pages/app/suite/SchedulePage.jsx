/**
 * SchedulePage
 *
 * Unified Schedule for the Team Suite — merges Practice Plans and Install Calendar
 * into a single vertical timeline. Coaches see every date with content, can drill
 * into a practice plan to edit its blocks, and attach real plays from the team's
 * playbook to install slots.
 *
 * Views:
 *   "timeline" — scrollable vertical day-by-day timeline (default)
 *   "plan"     — practice plan block editor for a selected day
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useAppMessage } from "../../../context/AppMessageContext";
import { apiFetch } from "../../../utils/api";
import {
  FiPlus, FiX, FiChevronLeft, FiClock, FiTrash2, FiEdit2,
  FiCalendar, FiBookOpen, FiSearch, FiYoutube,
} from "react-icons/fi";
import PlayPreviewCard from "../../../components/PlayPreviewCard";

/** Extracts YouTube video ID from a URL. */
function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?[^#]*v=|youtu\.be\/)([^&?\s]+)/);
  return match ? match[1] : null;
}

const COACH_ROLES = ["owner", "coach", "assistant_coach"];

const BLOCK_COLORS = {
  warmup: { badge: "bg-yellow-500/15 text-yellow-400", bar: "bg-yellow-500" },
  drill: { badge: "bg-blue-500/15 text-blue-400", bar: "bg-blue-500" },
  install: { badge: "bg-BrandOrange/15 text-BrandOrange", bar: "bg-BrandOrange" },
  team_period: { badge: "bg-green-500/15 text-green-400", bar: "bg-green-500" },
  conditioning: { badge: "bg-purple-500/15 text-purple-400", bar: "bg-purple-500" },
  notes: { badge: "bg-BrandGray2/15 text-BrandGray", bar: "bg-BrandGray2" },
  other: { badge: "bg-BrandGray2/15 text-BrandGray", bar: "bg-BrandGray2" },
};
const BLOCK_LABELS = {
  warmup: "Warmup", drill: "Drill", install: "Install", team_period: "Team",
  conditioning: "Conditioning", notes: "Notes", other: "Other",
};
const INSTALL_CATEGORY_LABELS = {
  concept: "Concept", play: "Play", drill: "Drill", focus: "Focus", other: "Other",
};
const INSTALL_CATEGORY_COLORS = {
  concept: "bg-blue-500/15 text-blue-400",
  play: "bg-BrandOrange/15 text-BrandOrange",
  drill: "bg-purple-500/15 text-purple-400",
  focus: "bg-green-500/15 text-green-400",
  other: "bg-BrandGray2/15 text-BrandGray",
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = todayStr();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayName = dayNames[date.getDay()];
  const label = `${monthNames[m - 1]} ${d}`;
  if (dateStr === today) return { main: "TODAY", sub: label, isToday: true };
  return { main: dayName, sub: label, isToday: false };
}

// ── Play Picker Modal ─────────────────────────────────────────────────────────

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
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-BrandGray2/15">
          <h2 className="font-Manrope text-base font-bold">Pick a Play</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText"><FiX /></button>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2">
            <FiSearch className="shrink-0 text-sm text-BrandGray2" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm text-BrandText outline-none placeholder:text-BrandGray2"
              placeholder="Search plays…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {plays.length === 0 && (
            <p className="py-8 text-center text-sm text-BrandGray2">No plays in your playbook yet.</p>
          )}
          {plays.length > 0 && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-BrandGray2">No plays match "{query}".</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((play) => (
              <button
                key={play.id}
                onClick={() => onSelect(play)}
                className="group flex flex-col rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 overflow-hidden hover:border-BrandOrange/40 hover:bg-BrandBlack2/60 transition text-left"
              >
                <div className="aspect-video w-full bg-BrandGray2/10 overflow-hidden">
                  {play.playData ? (
                    <PlayPreviewCard playData={play.playData} autoplay="hover" shape="fill" cameraMode="fit-distribution" background="field" className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FiBookOpen className="text-2xl text-BrandGray2/40" />
                    </div>
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

// ── Add Day Panel (Practice Plan or Install Item) ─────────────────────────────

/**
 * @param {{ date: string, practiceEnabled: bool, installEnabled: bool, plays: object[],
 *           teamId: string, onPracticeCreated: (plan)=>void, onInstallCreated: (item)=>void, onClose: ()=>void }} props
 */
function AddDayPanel({ date, practiceEnabled, installEnabled, plays, teamId, onPracticeCreated, onInstallCreated, onClose }) {
  const { showMessage } = useAppMessage();
  const [tab, setTab] = useState(practiceEnabled ? "practice" : "install");
  const [saving, setSaving] = useState(false);

  // Practice form
  const [practiceTitle, setPracticeTitle] = useState("");
  const [practiceNotes, setPracticeNotes] = useState("");

  // Install form
  const [installTitle, setInstallTitle] = useState("");
  const [installCategory, setInstallCategory] = useState("concept");
  const [installPlay, setInstallPlay] = useState(null);
  const [installYoutubeUrl, setInstallYoutubeUrl] = useState("");
  const [showPlayPicker, setShowPlayPicker] = useState(false);

  const handleCreatePractice = async () => {
    if (!practiceTitle.trim()) return;
    setSaving(true);
    try {
      const data = await apiFetch(`/teams/${teamId}/suite/practice-plans`, {
        method: "POST",
        body: { title: practiceTitle, planDate: date, notes: practiceNotes },
      });
      onPracticeCreated(data.plan);
    } catch (err) {
      showMessage("Create failed", err.message, "error");
      setSaving(false);
    }
  };

  const handleCreateInstall = async () => {
    if (!installTitle.trim() && !installPlay) return;
    setSaving(true);
    try {
      const title = installTitle.trim() || installPlay?.title || "";
      const data = await apiFetch(`/teams/${teamId}/suite/install`, {
        method: "POST",
        body: {
          installDate: date,
          title,
          category: installPlay ? "play" : installCategory,
          playId: installPlay?.id || undefined,
          youtubeUrl: installYoutubeUrl.trim() || undefined,
        },
      });
      onInstallCreated(data.item);
    } catch (err) {
      showMessage("Create failed", err.message, "error");
      setSaving(false);
    }
  };

  const dateLabel = formatDateLabel(date);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl border border-BrandGray2/20 bg-BrandBlack sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">
              {dateLabel.isToday ? "Today" : dateLabel.sub}
            </p>
            <h2 className="font-Manrope text-base font-bold">Add to Schedule</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText"><FiX /></button>
        </div>

        {practiceEnabled && installEnabled && (
          <div className="flex gap-1 px-5 pb-4">
            {[{ id: "practice", label: "Practice Plan" }, { id: "install", label: "Play Install" }].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === t.id ? "bg-BrandOrange text-white" : "bg-BrandBlack2/50 text-BrandGray hover:text-BrandText"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="px-5 pb-5">
          {tab === "practice" && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Plan Title *</label>
                <input
                  autoFocus
                  className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
                  value={practiceTitle}
                  onChange={(e) => setPracticeTitle(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. Tuesday Install Practice"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Notes</label>
                <textarea
                  className="w-full resize-none rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange"
                  value={practiceNotes}
                  onChange={(e) => setPracticeNotes(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Optional notes…"
                />
              </div>
              <button
                onClick={handleCreatePractice}
                disabled={saving || !practiceTitle.trim()}
                className="w-full rounded-lg bg-BrandOrange py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40"
              >
                {saving ? "Creating…" : "Create Plan"}
              </button>
            </div>
          )}

          {tab === "install" && (
            <div className="flex flex-col gap-3">
              {/* Play picker button */}
              <button
                onClick={() => setShowPlayPicker(true)}
                className="flex items-center gap-3 rounded-xl border border-BrandGray2/30 bg-BrandBlack2/30 p-3 hover:border-BrandOrange/40 transition text-left"
              >
                <div className="h-12 w-16 shrink-0 rounded-lg overflow-hidden bg-BrandGray2/10 flex items-center justify-center">
                  {installPlay?.playData ? (
                    <PlayPreviewCard playData={installPlay.playData} autoplay="off" shape="fill" cameraMode="fit-distribution" background="field" className="w-full h-full" />
                  ) : (
                    <FiBookOpen className="text-xl text-BrandGray2/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {installPlay ? (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-BrandOrange">Play selected</p>
                      <p className="text-sm font-semibold text-BrandText truncate">{installPlay.title}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-BrandText">Pick from Playbook</p>
                      <p className="text-[11px] text-BrandGray2">Attach a play to this install</p>
                    </>
                  )}
                </div>
                {installPlay ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setInstallPlay(null); }}
                    className="shrink-0 rounded-md p-1 text-BrandGray2 hover:text-red-400"
                  >
                    <FiX className="text-sm" />
                  </button>
                ) : (
                  <FiPlus className="shrink-0 text-sm text-BrandGray2" />
                )}
              </button>

              {/* Optional custom title override */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">
                  {installPlay ? "Custom Label (optional)" : "Title *"}
                </label>
                <input
                  className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
                  value={installTitle}
                  onChange={(e) => setInstallTitle(e.target.value)}
                  maxLength={200}
                  placeholder={installPlay ? "Leave blank to use play title" : "e.g. Inside Zone Install"}
                />
              </div>

              {!installPlay && (
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Category</label>
                  <select
                    className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange"
                    value={installCategory}
                    onChange={(e) => setInstallCategory(e.target.value)}
                  >
                    {Object.entries(INSTALL_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              )}

              {/* YouTube link */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">YouTube Link (optional)</label>
                <div className="flex items-center gap-2 rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2">
                  <FiYoutube className="shrink-0 text-red-400 text-sm" />
                  <input
                    className="flex-1 bg-transparent text-sm text-BrandText outline-none placeholder:text-BrandGray2"
                    value={installYoutubeUrl}
                    onChange={(e) => setInstallYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=…"
                    maxLength={500}
                  />
                  {installYoutubeUrl && <button type="button" onClick={() => setInstallYoutubeUrl("")} className="shrink-0 text-BrandGray2 hover:text-red-400"><FiX className="text-xs" /></button>}
                </div>
              </div>

              <button
                onClick={handleCreateInstall}
                disabled={saving || (!installTitle.trim() && !installPlay)}
                className="w-full rounded-lg bg-BrandOrange py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40"
              >
                {saving ? "Adding…" : "Add Install"}
              </button>
            </div>
          )}
        </div>
      </div>

      {showPlayPicker && (
        <PlayPickerModal
          plays={plays}
          onSelect={(play) => { setInstallPlay(play); setShowPlayPicker(false); }}
          onClose={() => setShowPlayPicker(false)}
        />
      )}
    </div>
  );
}

// ── Block editor (inside plan detail) ────────────────────────────────────────

function BlockModal({ block, planId, teamId, onSave, onClose, plays }) {
  const isNew = !block?.id;
  const [form, setForm] = useState(() =>
    block
      ? { blockType: block.block_type, title: block.title, durationMinutes: block.duration_minutes ?? "", startTime: block.start_time || "", description: block.description || "", playId: block.play_id || "" }
      : { blockType: "drill", title: "", durationMinutes: "", startTime: "", description: "", playId: "" }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const selectedPlay = plays.find((p) => p.id === form.playId) || null;

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true); setError("");
    try {
      const body = {
        blockType: form.blockType,
        title: form.title,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes, 10) : undefined,
        startTime: form.startTime,
        description: form.description,
        playId: form.playId || undefined,
      };
      const endpoint = isNew
        ? `/teams/${teamId}/suite/practice-plans/${planId}/blocks`
        : `/teams/${teamId}/suite/practice-plans/${planId}/blocks/${block.id}`;
      const data = await apiFetch(endpoint, { method: isNew ? "POST" : "PATCH", body });
      onSave(data.block);
    } catch (err) {
      setError(err.message || "Save failed");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-BrandGray2/20 bg-BrandBlack p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-Manrope text-base font-bold">{isNew ? "Add Block" : "Edit Block"}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText"><FiX /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Type</label>
              <select
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange"
                value={form.blockType}
                onChange={(e) => set("blockType", e.target.value)}
              >
                {Object.entries(BLOCK_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Start Time</label>
              <input className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} placeholder="3:00 PM" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Block Title *</label>
            <input autoFocus className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]" value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} placeholder="e.g. Inside Zone Install" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Duration (min)</label>
            <input type="number" min={0} max={480} className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange" value={form.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} placeholder="20" />
          </div>

          {/* Play link */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Link to Play (optional)</label>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-BrandGray2/25 bg-BrandBlack2/30 p-2.5 hover:border-BrandOrange/40 transition text-left"
            >
              <div className="h-9 w-12 shrink-0 rounded-lg overflow-hidden bg-BrandGray2/10 flex items-center justify-center">
                {selectedPlay?.playData ? (
                  <PlayPreviewCard playData={selectedPlay.playData} autoplay="off" shape="fill" cameraMode="fit-distribution" background="field" className="w-full h-full" />
                ) : (
                  <FiBookOpen className="text-sm text-BrandGray2/40" />
                )}
              </div>
              <span className="flex-1 text-xs text-BrandGray truncate">
                {selectedPlay ? selectedPlay.title : "Click to pick a play…"}
              </span>
              {form.playId && (
                <button type="button" onClick={(e) => { e.stopPropagation(); set("playId", ""); }} className="shrink-0 rounded-md p-1 text-BrandGray2 hover:text-red-400">
                  <FiX className="text-xs" />
                </button>
              )}
            </button>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Notes</label>
            <textarea className="w-full resize-none rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange" value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={2000} placeholder="Details…" />
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-BrandGray2/40 px-3.5 py-2 text-sm text-BrandGray hover:text-BrandText">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40">{saving ? "Saving…" : isNew ? "Add" : "Save"}</button>
        </div>
      </div>

      {showPicker && (
        <PlayPickerModal
          plays={plays}
          onSelect={(play) => { set("playId", play.id); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// ── Plan detail view ──────────────────────────────────────────────────────────

/**
 * Full-screen plan block editor, displayed when a practice plan is selected from the timeline.
 * @param {{ plan: object, teamId: string, isCoach: bool, plays: object[], onBack: ()=>void, onPlanUpdated: (p)=>void }} props
 */
function PlanDetailView({ plan, teamId, isCoach, plays, onBack, onPlanUpdated }) {
  const { showMessage } = useAppMessage();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockModal, setBlockModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    apiFetch(`/teams/${teamId}/suite/practice-plans/${plan.id}`)
      .then((d) => setBlocks(d.blocks || []))
      .catch((err) => showMessage("Failed to load blocks", err.message, "error"))
      .finally(() => setLoading(false));
  }, [plan.id, teamId, showMessage]);

  const handleBlockSave = (saved) => {
    setBlocks((prev) => {
      const exists = prev.find((b) => b.id === saved.id);
      return exists ? prev.map((b) => (b.id === saved.id ? saved : b)) : [...prev, saved];
    });
    setBlockModal(null);
  };

  const handleBlockDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiFetch(`/teams/${teamId}/suite/practice-plans/${plan.id}/blocks/${confirmDelete.id}`, { method: "DELETE" });
      setBlocks((prev) => prev.filter((b) => b.id !== confirmDelete.id));
      showMessage("Block removed", "", "success");
    } catch (err) {
      showMessage("Delete failed", err.message, "error");
    } finally {
      setConfirmDelete(null);
    }
  };

  const totalMinutes = blocks.reduce((sum, b) => sum + (b.duration_minutes || 0), 0);
  const dateLabel = plan.plan_date ? formatDateLabel(String(plan.plan_date).split("T")[0]) : null;

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 md:px-10 md:py-12">
      <button onClick={onBack} className="mb-5 flex items-center gap-1.5 text-sm text-BrandGray2 hover:text-BrandText transition">
        <FiChevronLeft /> Back to Schedule
      </button>

      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          {dateLabel && (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">
              {dateLabel.main} · {dateLabel.sub}
            </p>
          )}
          <h1 className="font-Manrope text-2xl font-bold tracking-tight">{plan.title}</h1>
          {plan.notes && <p className="mt-1.5 text-sm text-BrandGray">{plan.notes}</p>}
          {totalMinutes > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-BrandGray2">
              <FiClock className="text-[10px]" /> {totalMinutes} min total
            </p>
          )}
        </div>
        {isCoach && (
          <button
            onClick={() => setBlockModal({})}
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
          >
            <FiPlus /> Add Block
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange animate-spin" />
        </div>
      )}

      {!loading && blocks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-BrandGray2/30 py-12 text-center">
          <p className="text-sm text-BrandGray2">{isCoach ? "No blocks yet — add your first block to build the plan." : "No blocks added yet."}</p>
        </div>
      )}

      {!loading && blocks.length > 0 && (
        <div className="flex flex-col gap-2">
          {blocks.map((block) => {
            const colors = BLOCK_COLORS[block.block_type] || BLOCK_COLORS.other;
            const blockPlay = block.play_id ? plays.find((p) => p.id === block.play_id) : null;
            return (
              <div key={block.id} className="flex items-start gap-3 rounded-2xl border border-BrandGray2/15 bg-BrandBlack2/25 overflow-hidden">
                <div className={`w-1 self-stretch shrink-0 ${colors.bar}`} />
                <div className="flex flex-1 min-w-0 items-start gap-3 py-3 pr-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${colors.badge}`}>
                        {BLOCK_LABELS[block.block_type] || block.block_type}
                      </span>
                      <span className="text-sm font-semibold text-BrandText">{block.title}</span>
                    </div>
                    {(block.start_time || block.duration_minutes) && (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-BrandGray2">
                        <FiClock className="text-[9px]" />
                        {[block.start_time, block.duration_minutes ? `${block.duration_minutes}min` : null].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {blockPlay && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-BrandGray2/20 bg-BrandBlack p-1.5">
                        <div className="h-8 w-11 shrink-0 rounded overflow-hidden bg-BrandGray2/10">
                          {blockPlay.playData ? (
                            <PlayPreviewCard playData={blockPlay.playData} autoplay="off" shape="fill" cameraMode="fit-distribution" background="field" className="w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FiBookOpen className="text-xs text-BrandGray2/40" />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-BrandText truncate">{blockPlay.title}</span>
                      </div>
                    )}
                    {block.description && <p className="mt-1.5 text-xs text-BrandGray leading-relaxed">{block.description}</p>}
                  </div>
                  {isCoach && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setBlockModal(block)} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText transition"><FiEdit2 className="text-sm" /></button>
                      <button onClick={() => setConfirmDelete(block)} className="rounded-md p-1.5 text-BrandGray2 hover:text-red-400 transition"><FiTrash2 className="text-sm" /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {blockModal !== null && (
        <BlockModal block={blockModal.id ? blockModal : null} planId={plan.id} teamId={teamId} plays={plays} onSave={handleBlockSave} onClose={() => setBlockModal(null)} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-BrandGray2/20 bg-BrandBlack p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-Manrope text-base font-bold mb-2">Remove block?</h2>
            <p className="text-sm text-BrandGray">Remove <strong className="text-BrandText">{confirmDelete.title}</strong>?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-BrandGray2/40 px-3.5 py-2 text-sm text-BrandGray hover:text-BrandText">Cancel</button>
              <button onClick={handleBlockDelete} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── YouTube link for install items ───────────────────────────────────────────

/**
 * Renders a compact YouTube preview link if the URL is valid, otherwise nothing.
 * @param {{ url: string|null }} props
 */
function InstallYouTubeLink({ url }) {
  if (!url) return null;
  const vid = extractYouTubeId(url);
  if (!vid) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-2 flex items-center gap-2 rounded-lg border border-BrandGray2/15 overflow-hidden hover:border-red-400/30 transition group"
    >
      <img src={`https://img.youtube.com/vi/${vid}/default.jpg`} alt="" className="h-10 w-14 shrink-0 object-cover" />
      <div className="flex items-center gap-1.5 px-2">
        <FiYoutube className="text-red-400 text-sm shrink-0" />
        <span className="text-[11px] font-semibold text-BrandGray group-hover:text-BrandText transition truncate">Watch on YouTube</span>
      </div>
    </a>
  );
}

// ── Timeline day node ─────────────────────────────────────────────────────────

/**
 * @param {{ day: object, isCoach: bool, plays: object[], teamId: string,
 *           practiceEnabled: bool, installEnabled: bool,
 *           onAddClick: (date)=>void, onPlanClick: (plan)=>void,
 *           onInstallDelete: (item)=>void }} props
 */
function DayNode({ day, isCoach, plays, teamId, practiceEnabled, installEnabled, onAddClick, onPlanClick, onInstallDelete }) {
  const { showMessage } = useAppMessage();
  const label = formatDateLabel(day.date);
  const isEmpty = !day.practice && day.installs.length === 0;
  const today = todayStr();
  const isPast = day.date < today;

  const handleInstallDelete = async (item) => {
    try {
      await apiFetch(`/teams/${teamId}/suite/install/${item.id}`, { method: "DELETE" });
      onInstallDelete(item);
    } catch (err) {
      showMessage("Delete failed", err.message, "error");
    }
  };

  return (
    <div className={`flex gap-4 ${isPast && isEmpty ? "opacity-40" : ""}`}>
      {/* Date column */}
      <div className="flex flex-col items-center" style={{ minWidth: 52 }}>
        <div className={`flex flex-col items-center justify-center rounded-xl px-2 py-2 text-center ${label.isToday ? "bg-BrandOrange/15" : "bg-BrandBlack2/30"}`} style={{ minWidth: 48 }}>
          <span className={`text-[9px] font-bold uppercase tracking-widest ${label.isToday ? "text-BrandOrange" : "text-BrandGray2"}`}>{label.main}</span>
          <span className={`mt-0.5 text-xs font-semibold ${label.isToday ? "text-BrandOrange" : "text-BrandText"}`}>{label.sub}</span>
        </div>
        {/* Connector line */}
        <div className={`mt-1 flex-1 w-px ${label.isToday ? "bg-BrandOrange/30" : "bg-BrandGray2/15"}`} />
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0 pb-5">
        {/* Practice plan */}
        {day.practice && (
          <div
            className={`mb-3 rounded-2xl border ${label.isToday ? "border-BrandOrange/25 bg-BrandOrange/5" : "border-BrandGray2/15 bg-BrandBlack2/20"} overflow-hidden`}
          >
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-BrandBlack2/30 transition"
              onClick={() => onPlanClick(day.practice)}
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">Practice Plan</p>
                <p className="text-sm font-bold text-BrandText">{day.practice.title}</p>
              </div>
              <span className="text-[10px] font-semibold text-BrandGray2 bg-BrandBlack2/50 rounded-md px-2 py-0.5">
                {day.practice.blocks?.length || 0} blocks
              </span>
            </button>
            {day.practice.blocks?.length > 0 && (
              <div className="border-t border-BrandGray2/10">
                {day.practice.blocks.map((block) => {
                  const colors = BLOCK_COLORS[block.block_type] || BLOCK_COLORS.other;
                  return (
                    <div key={block.id} className="flex items-center gap-2.5 px-4 py-2 border-b border-BrandGray2/5 last:border-0">
                      <div className={`h-2 w-2 shrink-0 rounded-full ${colors.bar}`} />
                      <span className={`shrink-0 rounded-md px-1.5 py-px text-[9px] font-bold uppercase ${colors.badge}`}>
                        {BLOCK_LABELS[block.block_type]}
                      </span>
                      <span className="flex-1 truncate text-xs font-semibold text-BrandText">{block.title}</span>
                      {block.duration_minutes && (
                        <span className="shrink-0 text-[10px] text-BrandGray2">{block.duration_minutes}m</span>
                      )}
                      {block.play_data && (
                        <div className="shrink-0 h-5 w-7 rounded overflow-hidden border border-BrandGray2/20">
                          <PlayPreviewCard playData={block.play_data} autoplay="off" shape="fill" cameraMode="fit-distribution" background="field" className="w-full h-full" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Install items */}
        {day.installs.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {day.installs.map((item) => (
              <div key={item.id} className="rounded-xl border border-BrandGray2/15 bg-BrandBlack2/15 overflow-hidden">
                {/* Full-width play canvas when a play is linked */}
                {item.play_data && (
                  <div className="aspect-video w-full bg-BrandGray2/10 overflow-hidden border-b border-BrandGray2/10">
                    <PlayPreviewCard playData={item.play_data} autoplay="hover" shape="fill" cameraMode="fit-distribution" background="field" className="w-full h-full" />
                  </div>
                )}
                {/* Title row */}
                <div className="flex items-center gap-3 px-3 py-2.5">
                  {!item.play_data && (
                    <div className="h-8 w-10 shrink-0 rounded-lg overflow-hidden bg-BrandGray2/10 flex items-center justify-center border border-BrandGray2/10">
                      <FiBookOpen className="text-xs text-BrandGray2/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-BrandGray2 mb-0.5">
                      {INSTALL_CATEGORY_LABELS[item.category] || "Install"}
                    </p>
                    <p className="text-xs font-semibold text-BrandText truncate">{item.title}</p>
                  </div>
                  {isCoach && (
                    <button
                      onClick={() => handleInstallDelete(item)}
                      className="shrink-0 rounded-md p-1.5 text-BrandGray2 hover:text-red-400 transition"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  )}
                </div>
                {item.youtube_url && (
                  <div className="px-3 pb-3">
                    <InstallYouTubeLink url={item.youtube_url} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state + add buttons for coaches */}
        {isEmpty && isCoach && (
          <button
            onClick={() => onAddClick(day.date)}
            className="flex items-center gap-1.5 text-xs text-BrandGray2 hover:text-BrandOrange transition"
          >
            <FiPlus className="text-sm" /> Add to this day
          </button>
        )}

        {/* Add more button when day already has content */}
        {!isEmpty && isCoach && (
          <button
            onClick={() => onAddClick(day.date)}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-BrandGray2/25 px-3 py-1.5 text-xs text-BrandGray2 hover:border-BrandOrange/40 hover:text-BrandOrange transition"
          >
            <FiPlus className="text-sm" /> Add more
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * SchedulePage — unified vertical timeline of practice plans and play installs.
 */
export default function SchedulePage() {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const isCoach = COACH_ROLES.includes(user?.role);
  const teamId = user?.teamId;
  const todayRef = useRef(null);

  const [days, setDays] = useState([]);
  const [plays, setPlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [practiceEnabled, setPracticeEnabled] = useState(false);
  const [installEnabled, setInstallEnabled] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [addDayDate, setAddDayDate] = useState(null);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const [schedData, playsData] = await Promise.all([
        apiFetch(`/teams/${teamId}/suite/schedule`),
        apiFetch(`/teams/${teamId}/suite/plays`).catch(() => ({ plays: [] })),
      ]);
      setDays(schedData.days || []);
      setPracticeEnabled(schedData.practiceEnabled);
      setInstallEnabled(schedData.installEnabled);
      setPlays(playsData.plays || []);
    } catch (err) {
      showMessage("Failed to load schedule", err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [teamId, showMessage]);

  useEffect(() => { load(); }, [load]);

  // Scroll to today after data loads
  useEffect(() => {
    if (!loading && todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading]);

  const handlePracticeCreated = (plan) => {
    const dateKey = String(plan.plan_date).split("T")[0];
    setDays((prev) => {
      const existing = prev.find((d) => d.date === dateKey);
      if (existing) {
        return prev.map((d) => d.date === dateKey ? { ...d, practice: { ...plan, blocks: [] } } : d);
      }
      const newDay = { date: dateKey, practice: { ...plan, blocks: [] }, installs: [] };
      return [...prev, newDay].sort((a, b) => (a.date > b.date ? 1 : -1));
    });
    setAddDayDate(null);
    // Navigate into plan detail so coach can add blocks immediately
    setSelectedPlan({ ...plan, blocks: [] });
  };

  const handleInstallCreated = (item) => {
    const dateKey = String(item.install_date).split("T")[0];
    setDays((prev) => {
      const existing = prev.find((d) => d.date === dateKey);
      if (existing) {
        return prev.map((d) => d.date === dateKey ? { ...d, installs: [...d.installs, item] } : d);
      }
      const newDay = { date: dateKey, practice: null, installs: [item] };
      return [...prev, newDay].sort((a, b) => (a.date > b.date ? 1 : -1));
    });
    setAddDayDate(null);
  };

  const handleInstallDelete = (deletedItem) => {
    const dateKey = String(deletedItem.install_date).split("T")[0];
    setDays((prev) => prev
      .map((d) => d.date === dateKey ? { ...d, installs: d.installs.filter((i) => i.id !== deletedItem.id) } : d)
      .filter((d) => d.practice || d.installs.length > 0)
    );
  };

  if (selectedPlan) {
    return (
      <PlanDetailView
        plan={selectedPlan}
        teamId={teamId}
        isCoach={isCoach}
        plays={plays}
        onBack={() => { setSelectedPlan(null); load(); }}
        onPlanUpdated={(updated) => setSelectedPlan(updated)}
      />
    );
  }

  const today = todayStr();

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 md:px-10 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-Manrope text-xl font-bold tracking-tight">Schedule</h1>
          <p className="mt-0.5 text-sm text-BrandGray2">
            {practiceEnabled && installEnabled ? "Practice plans & play installs" : practiceEnabled ? "Practice plans" : "Play installs"}
          </p>
        </div>
        {isCoach && (
          <button
            onClick={() => setAddDayDate(today)}
            className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
          >
            <FiPlus /> Add
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange animate-spin" />
        </div>
      )}

      {!loading && days.length === 0 && (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-BrandGray2/10">
            <FiCalendar className="text-2xl text-BrandGray2" />
          </div>
          <p className="font-Manrope text-base font-semibold">Nothing scheduled yet</p>
          <p className="mt-1 text-sm text-BrandGray2">
            {isCoach ? "Add a practice plan or play install to get started." : "Nothing has been scheduled yet."}
          </p>
          {isCoach && (
            <button
              onClick={() => setAddDayDate(today)}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition mx-auto"
            >
              <FiPlus /> Add to Today
            </button>
          )}
        </div>
      )}

      {!loading && days.length > 0 && (
        <div>
          {days.map((day) => (
            <div key={day.date} ref={day.date === today ? todayRef : null}>
              <DayNode
                day={day}
                isCoach={isCoach}
                plays={plays}
                teamId={teamId}
                practiceEnabled={practiceEnabled}
                installEnabled={installEnabled}
                onAddClick={setAddDayDate}
                onPlanClick={setSelectedPlan}
                onInstallDelete={handleInstallDelete}
              />
            </div>
          ))}

          {/* Coach: add a new day at the end */}
          {isCoach && (
            <button
              onClick={() => setAddDayDate(today)}
              className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-BrandGray2/25 px-3 py-2 text-sm text-BrandGray2 hover:border-BrandOrange/40 hover:text-BrandOrange transition"
            >
              <FiPlus /> Add to schedule
            </button>
          )}
        </div>
      )}

      {addDayDate !== null && (
        <AddDayPanel
          date={addDayDate}
          practiceEnabled={practiceEnabled}
          installEnabled={installEnabled}
          plays={plays}
          teamId={teamId}
          onPracticeCreated={handlePracticeCreated}
          onInstallCreated={handleInstallCreated}
          onClose={() => setAddDayDate(null)}
        />
      )}
    </div>
  );
}
