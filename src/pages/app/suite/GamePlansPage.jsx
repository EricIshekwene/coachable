/**
 * GamePlansPage
 *
 * Game Plan Builder for the Team Suite — play-centric design.
 * Each game plan contains rich per-play blocks (suite_game_plan_plays) where
 * coaches can add descriptions, tag team members (@mentions), bullet points,
 * body text, and YouTube video links alongside actual play thumbnails from
 * the team's playbook.
 *
 * Views:
 *   list   — card grid of all game plans
 *   detail — full game plan editor: scouting notes + play blocks
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useAppMessage } from "../../../context/AppMessageContext";
import { apiFetch } from "../../../utils/api";
import {
  FiPlus, FiX, FiChevronLeft, FiTrash2, FiEdit2, FiSave,
  FiBookOpen, FiSearch, FiChevronDown, FiChevronUp,
  FiYoutube, FiUser, FiCheck,
} from "react-icons/fi";
import PlayPreviewCard from "../../../components/PlayPreviewCard";

const COACH_ROLES = ["owner", "coach", "assistant_coach"];

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Extracts YouTube video ID from a URL. */
function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?[^#]*v=|youtu\.be\/)([^&?\s]+)/);
  return match ? match[1] : null;
}

/** Returns YouTube thumbnail URL for a video ID. */
function youtubeThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
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
        style={{ maxHeight: "82vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-BrandGray2/15">
          <div>
            <h2 className="font-Manrope text-base font-bold">Pick a Play</h2>
            <p className="text-[11px] text-BrandGray2 mt-0.5">Add a play from your team's playbook</p>
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
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-BrandGray2">
              {plays.length === 0 ? "No plays in your playbook yet." : `No plays match "${query}".`}
            </p>
          )}
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

// ── Member Tag Picker ─────────────────────────────────────────────────────────

/**
 * @param {{ members: object[], selectedIds: string[], onToggle: (id)=>void, onClose: ()=>void }} props
 */
function MemberTagPicker({ members, selectedIds, onToggle, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-t-2xl border border-BrandGray2/20 bg-BrandBlack sm:rounded-2xl"
        style={{ maxHeight: "70vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-BrandGray2/15">
          <h3 className="font-Manrope text-sm font-bold">Tag Members</h3>
          <button onClick={onClose} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText"><FiX className="text-sm" /></button>
        </div>
        <div className="overflow-y-auto pb-4" style={{ maxHeight: "calc(70vh - 56px)" }}>
          {members.length === 0 && <p className="px-4 py-6 text-sm text-BrandGray2 text-center">No team members found.</p>}
          {members.map((m) => {
            const selected = selectedIds.includes(m.userId);
            return (
              <button
                key={m.userId}
                onClick={() => onToggle(m.userId)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-BrandBlack2/40 ${selected ? "bg-BrandOrange/5" : ""}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-BrandGray2/15 text-xs font-bold text-BrandGray">
                  {m.name?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-BrandText truncate">{m.name}</p>
                  <p className="text-[10px] text-BrandGray2 capitalize">{m.role?.replace("_", " ")}</p>
                </div>
                {selected && <FiCheck className="shrink-0 text-sm text-BrandOrange" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Game Plan Play Block ──────────────────────────────────────────────────────

/**
 * A single play entry within a game plan — editable by coaches.
 * @param {{ gpPlay: object, members: object[], isCoach: bool, teamId: string, planId: string,
 *           onUpdated: (p)=>void, onDeleted: (id)=>void, plays: object[] }} props
 */
function GamePlanPlayBlock({ gpPlay, members, isCoach, teamId, planId, onUpdated, onDeleted, plays }) {
  const { showMessage } = useAppMessage();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    description: gpPlay.description || "",
    bodyText: gpPlay.body_text || "",
    bulletPoints: gpPlay.bullet_points?.length ? [...gpPlay.bullet_points] : [],
    taggedUserIds: gpPlay.tagged_user_ids || [],
    youtubeUrl: gpPlay.youtube_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showPlayPicker, setShowPlayPicker] = useState(false);
  const [localPlay, setLocalPlay] = useState({ title: gpPlay.play_title, playData: gpPlay.play_data });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const videoId = extractYouTubeId(form.youtubeUrl);
  const savedVideoId = extractYouTubeId(gpPlay.youtube_url);

  const taggedMembers = members.filter((m) => form.taggedUserIds.includes(m.userId));
  const savedTaggedMembers = members.filter((m) => (gpPlay.tagged_user_ids || []).includes(m.userId));

  const toggleMember = (userId) => {
    set("taggedUserIds", form.taggedUserIds.includes(userId)
      ? form.taggedUserIds.filter((id) => id !== userId)
      : [...form.taggedUserIds, userId]
    );
  };

  const addBullet = () => set("bulletPoints", [...form.bulletPoints, ""]);
  const setBullet = (i, val) => set("bulletPoints", form.bulletPoints.map((b, j) => (j === i ? val : b)));
  const removeBullet = (i) => set("bulletPoints", form.bulletPoints.filter((_, j) => j !== i));

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await apiFetch(`/teams/${teamId}/suite/game-plans/${planId}/plays/${gpPlay.id}`, {
        method: "PATCH",
        body: {
          description: form.description,
          bodyText: form.bodyText,
          bulletPoints: form.bulletPoints.filter((b) => b.trim()),
          taggedUserIds: form.taggedUserIds,
          youtubeUrl: form.youtubeUrl || null,
          playId: localPlay?.id || gpPlay.play_id || undefined,
        },
      });
      onUpdated({ ...data.play, play_title: data.play.play_title || localPlay?.title, play_data: data.play.play_data || localPlay?.playData });
      setEditing(false);
    } catch (err) {
      showMessage("Save failed", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePlay = (play) => {
    setLocalPlay({ id: play.id, title: play.title, playData: play.playData });
    setShowPlayPicker(false);
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/teams/${teamId}/suite/game-plans/${planId}/plays/${gpPlay.id}`, { method: "DELETE" });
      onDeleted(gpPlay.id);
    } catch (err) {
      showMessage("Delete failed", err.message, "error");
    }
    setConfirmDelete(false);
  };

  const activePlayData = (editing ? localPlay?.playData : gpPlay.play_data) || null;
  const title = (editing ? localPlay?.title : gpPlay.play_title) || null;

  return (
    <div className="rounded-2xl border border-BrandGray2/15 bg-BrandBlack2/20 overflow-hidden">
      {/* Play thumbnail header */}
      <div className="relative">
        <div className="aspect-video w-full bg-BrandGray2/10 overflow-hidden">
          {activePlayData ? (
            <PlayPreviewCard playData={activePlayData} autoplay="hover" shape="fill" cameraMode="fit-distribution" background="field" className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <FiBookOpen className="text-3xl text-BrandGray2/25" />
              {isCoach && editing && (
                <button
                  onClick={() => setShowPlayPicker(true)}
                  className="rounded-lg bg-BrandBlack2/80 border border-BrandGray2/30 px-3 py-1.5 text-xs font-semibold text-BrandGray hover:text-BrandText transition"
                >
                  Pick Play from Playbook
                </button>
              )}
            </div>
          )}
        </div>

        {/* Play title overlay */}
        {title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-BrandOrange mb-0.5">Play</p>
            <p className="text-sm font-bold text-white leading-tight">{title}</p>
          </div>
        )}

        {/* Coach actions in corner */}
        {isCoach && (
          <div className="absolute top-2 right-2 flex gap-1">
            {editing && (
              <button
                onClick={() => setShowPlayPicker(true)}
                className="rounded-lg bg-black/60 border border-white/20 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-black/80 transition"
              >
                Change Play
              </button>
            )}
            <button
              onClick={() => { if (!editing) setEditing(true); else setEditing(false); }}
              className="rounded-lg bg-black/60 border border-white/20 p-1.5 text-white hover:bg-black/80 transition"
            >
              {editing ? <FiX className="text-sm" /> : <FiEdit2 className="text-sm" />}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg bg-black/60 border border-white/20 p-1.5 text-white hover:text-red-400 transition"
            >
              <FiTrash2 className="text-sm" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3">
        {/* Description */}
        {editing ? (
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">Description</label>
            <textarea
              className="w-full resize-none rounded-lg border border-BrandGray2/25 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="What's this play about? Coaching focus points…"
            />
          </div>
        ) : (
          gpPlay.description && <p className="text-sm text-BrandGray leading-relaxed">{gpPlay.description}</p>
        )}

        {/* Tagged members */}
        <div>
          {editing ? (
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">Tagged Members</label>
              <div className="flex flex-wrap gap-1.5 items-center">
                {taggedMembers.map((m) => (
                  <span key={m.userId} className="flex items-center gap-1 rounded-full bg-BrandOrange/15 pl-2 pr-1.5 py-1 text-[11px] font-semibold text-BrandOrange">
                    @{m.name}
                    <button onClick={() => toggleMember(m.userId)} className="rounded-full hover:text-red-400"><FiX className="text-[9px]" /></button>
                  </span>
                ))}
                <button
                  onClick={() => setShowMemberPicker(true)}
                  className="flex items-center gap-1 rounded-full border border-dashed border-BrandGray2/30 px-2.5 py-1 text-[11px] text-BrandGray2 hover:border-BrandOrange/50 hover:text-BrandOrange transition"
                >
                  <FiUser className="text-[10px]" /> @ Tag
                </button>
              </div>
            </div>
          ) : (
            savedTaggedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {savedTaggedMembers.map((m) => (
                  <span key={m.userId} className="rounded-full bg-BrandOrange/10 px-2.5 py-0.5 text-[11px] font-semibold text-BrandOrange">
                    @{m.name}
                  </span>
                ))}
              </div>
            )
          )}
        </div>

        {/* Bullet points */}
        {editing ? (
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">Bullet Points</label>
            <div className="flex flex-col gap-1.5">
              {form.bulletPoints.map((bullet, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="shrink-0 text-BrandOrange text-sm">•</span>
                  <input
                    className="flex-1 rounded-lg border border-BrandGray2/25 bg-BrandBlack2/50 px-3 py-1.5 text-sm text-BrandText outline-none focus:border-BrandOrange"
                    value={bullet}
                    onChange={(e) => setBullet(i, e.target.value)}
                    placeholder={`Point ${i + 1}`}
                    maxLength={300}
                  />
                  <button onClick={() => removeBullet(i)} className="shrink-0 rounded-md p-1 text-BrandGray2 hover:text-red-400"><FiX className="text-xs" /></button>
                </div>
              ))}
              <button
                onClick={addBullet}
                className="flex items-center gap-1.5 text-[11px] text-BrandGray2 hover:text-BrandOrange transition mt-0.5"
              >
                <FiPlus className="text-xs" /> Add bullet point
              </button>
            </div>
          </div>
        ) : (
          gpPlay.bullet_points?.filter(Boolean).length > 0 && (
            <ul className="flex flex-col gap-1">
              {gpPlay.bullet_points.filter(Boolean).map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-BrandGray">
                  <span className="shrink-0 mt-0.5 text-BrandOrange">•</span>
                  {b}
                </li>
              ))}
            </ul>
          )
        )}

        {/* Body text */}
        {editing ? (
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">Additional Notes</label>
            <textarea
              className="w-full resize-none rounded-lg border border-BrandGray2/25 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange"
              value={form.bodyText}
              onChange={(e) => set("bodyText", e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="Detailed schematic notes, adjustments, keys to success…"
            />
          </div>
        ) : (
          gpPlay.body_text && (
            <p className="text-sm text-BrandGray leading-relaxed whitespace-pre-line border-t border-BrandGray2/10 pt-3">{gpPlay.body_text}</p>
          )
        )}

        {/* YouTube */}
        {editing ? (
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">YouTube Link (optional)</label>
            <div className="flex items-center gap-2 rounded-lg border border-BrandGray2/25 bg-BrandBlack2/50 px-3 py-2">
              <FiYoutube className="shrink-0 text-red-400 text-sm" />
              <input
                className="flex-1 bg-transparent text-sm text-BrandText outline-none placeholder:text-BrandGray2"
                value={form.youtubeUrl}
                onChange={(e) => set("youtubeUrl", e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                maxLength={500}
              />
              {form.youtubeUrl && <button onClick={() => set("youtubeUrl", "")} className="shrink-0 text-BrandGray2 hover:text-red-400"><FiX className="text-xs" /></button>}
            </div>
            {videoId && (
              <div className="mt-2 rounded-xl overflow-hidden border border-BrandGray2/20">
                <img src={youtubeThumbnail(videoId)} alt="YouTube preview" className="w-full object-cover" style={{ maxHeight: 120 }} />
              </div>
            )}
          </div>
        ) : (
          savedVideoId && (
            <a
              href={gpPlay.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-BrandGray2/15 overflow-hidden hover:border-red-400/30 transition group"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={youtubeThumbnail(savedVideoId)} alt="Watch on YouTube" className="h-14 w-20 shrink-0 object-cover" />
              <div className="flex items-center gap-2 px-3">
                <FiYoutube className="text-red-400 text-base shrink-0" />
                <span className="text-xs font-semibold text-BrandGray group-hover:text-BrandText transition">Watch on YouTube</span>
              </div>
            </a>
          )
        )}

        {/* Save/cancel when editing */}
        {editing && isCoach && (
          <div className="flex justify-end gap-2 pt-1 border-t border-BrandGray2/10 mt-1">
            <button onClick={() => setEditing(false)} className="rounded-lg border border-BrandGray2/30 px-3 py-1.5 text-xs text-BrandGray hover:text-BrandText">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="rounded-lg bg-BrandOrange px-4 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-40">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {showPlayPicker && (
        <PlayPickerModal plays={plays} onSelect={handleChangePlay} onClose={() => setShowPlayPicker(false)} />
      )}

      {showMemberPicker && (
        <MemberTagPicker
          members={members}
          selectedIds={form.taggedUserIds}
          onToggle={toggleMember}
          onClose={() => setShowMemberPicker(false)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setConfirmDelete(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-BrandGray2/20 bg-BrandBlack p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-Manrope text-base font-bold mb-2">Remove play?</h3>
            <p className="text-sm text-BrandGray">Remove <strong className="text-BrandText">{gpPlay.play_title || "this play"}</strong> from the game plan?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} className="rounded-lg border border-BrandGray2/40 px-3.5 py-2 text-sm text-BrandGray hover:text-BrandText">Cancel</button>
              <button onClick={handleDelete} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Game Plan Detail ──────────────────────────────────────────────────────────

/**
 * Full game plan editor: scouting notes + play blocks.
 * @param {{ plan: object, teamId: string, isCoach: bool, plays: object[], members: object[],
 *           onBack: ()=>void, onUpdated: (p)=>void }} props
 */
function GamePlanDetail({ plan, teamId, isCoach, plays, members, onBack, onUpdated }) {
  const { showMessage } = useAppMessage();

  const [tab, setTab] = useState("plays");
  const [notesOpen, setNotesOpen] = useState(true);

  // Scouting notes form
  const [form, setForm] = useState({
    opponent: plan.opponent || "",
    gameDate: plan.game_date || "",
    goals: plan.goals || "",
    keyNotes: plan.key_notes || "",
    personnelNotes: plan.personnel_notes || "",
    opponentTendencies: plan.opponent_tendencies || "",
    reminders: plan.reminders || "",
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Game plan plays
  const [gpPlays, setGpPlays] = useState([]);
  const [loadingPlays, setLoadingPlays] = useState(true);
  const [showPlayPicker, setShowPlayPicker] = useState(false);
  const [addingPlay, setAddingPlay] = useState(false);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  // Load plays for this game plan
  useEffect(() => {
    apiFetch(`/teams/${teamId}/suite/game-plans/${plan.id}`)
      .then((d) => setGpPlays(d.plays || []))
      .catch((err) => showMessage("Failed to load plays", err.message, "error"))
      .finally(() => setLoadingPlays(false));
  }, [plan.id, teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveNotes = async () => {
    if (!form.opponent.trim()) { showMessage("Opponent name required", "", "error"); return; }
    setSaving(true);
    try {
      const data = await apiFetch(`/teams/${teamId}/suite/game-plans/${plan.id}`, {
        method: "PATCH",
        body: { ...form },
      });
      onUpdated(data.plan);
      setDirty(false);
      showMessage("Saved", "", "success");
    } catch (err) {
      showMessage("Save failed", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPlay = async (play) => {
    setAddingPlay(true);
    setShowPlayPicker(false);
    try {
      const data = await apiFetch(`/teams/${teamId}/suite/game-plans/${plan.id}/plays`, {
        method: "POST",
        body: { playId: play.id, sortOrder: gpPlays.length },
      });
      setGpPlays((prev) => [...prev, data.play]);
    } catch (err) {
      showMessage("Failed to add play", err.message, "error");
    } finally {
      setAddingPlay(false);
    }
  };

  const fieldCls = "w-full rounded-lg border border-BrandGray2/25 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)] placeholder:text-BrandGray2/60";
  const textareaCls = `${fieldCls} resize-none`;
  const labelCls = "mb-1 block text-[10px] font-semibold uppercase tracking-wider text-BrandGray2";

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 md:px-10 md:py-12">
      <button onClick={onBack} className="mb-5 flex items-center gap-1.5 text-sm text-BrandGray2 hover:text-BrandText transition">
        <FiChevronLeft /> All Game Plans
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-BrandGray2 mb-0.5">
            {plan.game_date || "No date set"}
          </p>
          <h1 className="font-Manrope text-2xl font-bold tracking-tight">vs. {plan.opponent}</h1>
        </div>
        {isCoach && dirty && (
          <button onClick={handleSaveNotes} disabled={saving} className="shrink-0 flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40 transition">
            <FiSave className="text-sm" /> {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-BrandGray2/15 pb-px">
        {[{ id: "plays", label: `Plays (${gpPlays.length})` }, { id: "notes", label: "Scouting Notes" }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${tab === t.id ? "text-BrandOrange border-b-2 border-BrandOrange" : "text-BrandGray hover:text-BrandText"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Plays tab */}
      {tab === "plays" && (
        <div className="flex flex-col gap-4">
          {isCoach && (
            <button
              onClick={() => setShowPlayPicker(true)}
              disabled={addingPlay}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-BrandOrange/40 bg-BrandOrange/5 px-4 py-3 text-sm font-semibold text-BrandOrange hover:bg-BrandOrange/10 transition disabled:opacity-50"
            >
              <FiPlus /> {addingPlay ? "Adding…" : "Add Play from Playbook"}
            </button>
          )}

          {loadingPlays && (
            <div className="flex justify-center py-12">
              <div className="h-7 w-7 rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange animate-spin" />
            </div>
          )}

          {!loadingPlays && gpPlays.length === 0 && (
            <div className="rounded-2xl border border-dashed border-BrandGray2/20 py-14 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-BrandGray2/10">
                <FiBookOpen className="text-xl text-BrandGray2" />
              </div>
              <p className="text-sm font-semibold">No plays added yet</p>
              <p className="mt-1 text-xs text-BrandGray2">{isCoach ? "Add plays from your playbook to build out the game plan." : "No plays have been added to this game plan."}</p>
            </div>
          )}

          {!loadingPlays && gpPlays.map((gp) => (
            <GamePlanPlayBlock
              key={gp.id}
              gpPlay={gp}
              members={members}
              isCoach={isCoach}
              teamId={teamId}
              planId={plan.id}
              plays={plays}
              onUpdated={(updated) => setGpPlays((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
              onDeleted={(id) => setGpPlays((prev) => prev.filter((p) => p.id !== id))}
            />
          ))}
        </div>
      )}

      {/* Scouting notes tab */}
      {tab === "notes" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Opponent *</label>
              <input className={fieldCls} value={form.opponent} onChange={(e) => set("opponent", e.target.value)} maxLength={80} placeholder="Team name" disabled={!isCoach} />
            </div>
            <div>
              <label className={labelCls}>Game Date</label>
              <input type="date" className={fieldCls} value={form.gameDate} onChange={(e) => set("gameDate", e.target.value)} disabled={!isCoach} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Goals</label>
            <textarea className={textareaCls} rows={3} value={form.goals} onChange={(e) => set("goals", e.target.value)} maxLength={10000} placeholder="What do we need to accomplish to win?" disabled={!isCoach} />
          </div>
          <div>
            <label className={labelCls}>Key Notes</label>
            <textarea className={textareaCls} rows={3} value={form.keyNotes} onChange={(e) => set("keyNotes", e.target.value)} maxLength={10000} placeholder="Key points for the team…" disabled={!isCoach} />
          </div>
          <div>
            <label className={labelCls}>Personnel Notes</label>
            <textarea className={textareaCls} rows={3} value={form.personnelNotes} onChange={(e) => set("personnelNotes", e.target.value)} maxLength={10000} placeholder="Personnel matchups and packages…" disabled={!isCoach} />
          </div>
          <div>
            <label className={labelCls}>Opponent Tendencies</label>
            <textarea className={textareaCls} rows={3} value={form.opponentTendencies} onChange={(e) => set("opponentTendencies", e.target.value)} maxLength={10000} placeholder="What does the opponent like to do?" disabled={!isCoach} />
          </div>
          <div>
            <label className={labelCls}>Reminders</label>
            <textarea className={textareaCls} rows={2} value={form.reminders} onChange={(e) => set("reminders", e.target.value)} maxLength={2000} placeholder="Pre-game reminders…" disabled={!isCoach} />
          </div>
          {isCoach && dirty && (
            <div className="flex justify-end">
              <button onClick={handleSaveNotes} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40">
                <FiSave /> {saving ? "Saving…" : "Save Notes"}
              </button>
            </div>
          )}
        </div>
      )}

      {showPlayPicker && (
        <PlayPickerModal plays={plays} onSelect={handleAddPlay} onClose={() => setShowPlayPicker(false)} />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * GamePlansPage — list of game plans with play-centric detail view.
 */
export default function GamePlansPage() {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const isCoach = COACH_ROLES.includes(user?.role);
  const teamId = user?.teamId;

  const [plans, setPlans] = useState([]);
  const [plays, setPlays] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ opponent: "", gameDate: "" });
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const [plansData, playsData, membersData] = await Promise.all([
        apiFetch(`/teams/${teamId}/suite/game-plans`),
        apiFetch(`/teams/${teamId}/suite/plays`).catch(() => ({ plays: [] })),
        apiFetch(`/teams/${teamId}/suite/game-plans/members`).catch(() => ({ members: [] })),
      ]);
      setPlans(plansData.plans || []);
      setPlays(playsData.plays || []);
      setMembers(membersData.members || []);
    } catch (err) {
      showMessage("Failed to load game plans", err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [teamId, showMessage]);

  useEffect(() => { load(); }, [load]);

  if (selectedPlan) {
    return (
      <GamePlanDetail
        plan={selectedPlan}
        teamId={teamId}
        isCoach={isCoach}
        plays={plays}
        members={members}
        onBack={() => setSelectedPlan(null)}
        onUpdated={(updated) => {
          setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          setSelectedPlan(updated);
        }}
      />
    );
  }

  const handleCreate = async () => {
    if (!createForm.opponent.trim()) return;
    setCreating(true);
    try {
      const data = await apiFetch(`/teams/${teamId}/suite/game-plans`, {
        method: "POST",
        body: { opponent: createForm.opponent, gameDate: createForm.gameDate || undefined },
      });
      setPlans((prev) => [data.plan, ...prev]);
      setShowCreate(false);
      setCreateForm({ opponent: "", gameDate: "" });
      setSelectedPlan(data.plan);
    } catch (err) {
      showMessage("Create failed", err.message, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiFetch(`/teams/${teamId}/suite/game-plans/${confirmDelete.id}`, { method: "DELETE" });
      setPlans((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      showMessage("Deleted", "", "success");
    } catch (err) {
      showMessage("Delete failed", err.message, "error");
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 md:px-10 md:py-12">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-Manrope text-xl font-bold tracking-tight">Game Plans</h1>
          <p className="mt-0.5 text-sm text-BrandGray2">{plans.length} plan{plans.length !== 1 ? "s" : ""}</p>
        </div>
        {isCoach && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110 transition">
            <FiPlus /> New Plan
          </button>
        )}
      </div>

      {loading && <div className="flex justify-center py-16"><div className="h-8 w-8 rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange animate-spin" /></div>}

      {!loading && plans.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-BrandGray2/10">
            <FiBookOpen className="text-2xl text-BrandGray2" />
          </div>
          <p className="font-Manrope text-base font-semibold">No game plans yet</p>
          <p className="mt-1 text-sm text-BrandGray2">{isCoach ? "Create your first game plan." : "No game plans have been created."}</p>
          {isCoach && (
            <button onClick={() => setShowCreate(true)} className="mt-4 mx-auto flex items-center gap-1.5 rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition">
              <FiPlus /> Create Game Plan
            </button>
          )}
        </div>
      )}

      {!loading && plans.length > 0 && (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => {
            return (
              <div
                key={plan.id}
                className="group relative rounded-2xl border border-BrandGray2/15 bg-BrandBlack2/20 overflow-hidden cursor-pointer hover:border-BrandGray2/30 hover:bg-BrandBlack2/35 transition"
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="relative flex items-center gap-4 p-4">
                  {/* Orange accent left border */}
                  <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-BrandOrange/10 border border-BrandOrange/20">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-BrandOrange">
                      {plan.game_date ? new Date(plan.game_date + "T12:00:00").toLocaleString("en", { month: "short" }) : "TBD"}
                    </span>
                    <span className="text-lg font-bold text-BrandOrange leading-none">
                      {plan.game_date ? new Date(plan.game_date + "T12:00:00").getDate() : "—"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-BrandText">vs. {plan.opponent}</p>
                    {plan.goals && <p className="text-[11px] text-BrandGray truncate mt-0.5">{plan.goals}</p>}
                  </div>
                  {isCoach && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(plan); }}
                      className="shrink-0 rounded-md p-1.5 text-BrandGray2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-sm rounded-xl border border-BrandGray2/20 bg-BrandBlack p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-Manrope text-base font-bold">New Game Plan</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText"><FiX /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Opponent *</label>
                <input autoFocus className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]" value={createForm.opponent} onChange={(e) => setCreateForm((f) => ({ ...f, opponent: e.target.value }))} maxLength={80} placeholder="Team name" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-BrandGray2">Game Date</label>
                <input type="date" className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange" value={createForm.gameDate} onChange={(e) => setCreateForm((f) => ({ ...f, gameDate: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-BrandGray2/40 px-3.5 py-2 text-sm text-BrandGray hover:text-BrandText">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !createForm.opponent.trim()} className="rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40">{creating ? "Creating…" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-xl border border-BrandGray2/20 bg-BrandBlack p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-Manrope text-base font-bold mb-2">Delete game plan?</h2>
            <p className="text-sm text-BrandGray">Delete <strong className="text-BrandText">vs. {confirmDelete.opponent}</strong> and all its plays?</p>
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
