import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FiArrowLeft, FiEdit2, FiClock, FiTag } from "react-icons/fi";
import { loadAppPlays, updateAppPlay } from "../../utils/appPlaysStorage";
import PlayPreviewCard from "../../components/PlayPreviewCard";

function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function formatNoteDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PlayView() {
  const { playId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCoach = user?.role === "coach";
  const noteInputRef = useRef(null);

  const getPlayById = useCallback(() => {
    const plays = loadAppPlays();
    return plays.find((p) => p.id === playId) || null;
  }, [playId]);
  const [play, setPlay] = useState(() => getPlayById());
  const [editingNotes, setEditingNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");

  useEffect(() => {
    const nextPlay = getPlayById();
    setPlay(nextPlay);
    setEditingNotes(false);
    setSavingNote(false);
    setNoteError("");
    setNoteDraft(String(nextPlay?.notes || ""));
  }, [getPlayById]);

  useEffect(() => {
    if (editingNotes) noteInputRef.current?.focus();
  }, [editingNotes]);

  const notesBody = useMemo(() => String(play?.notes || "").trim(), [play?.notes]);
  const hasNotes = notesBody.length > 0;
  const noteAuthorName = hasNotes
    ? String(play?.notesAuthorName || "Coach").trim() || "Coach"
    : "";
  const noteDate = formatNoteDate(play?.notesUpdatedAt || play?.updatedAt || play?.createdAt);
  const canSaveNote = noteDraft.length <= 500 && !savingNote;

  const handleOpenNoteEditor = () => {
    setNoteDraft(String(play?.notes || ""));
    setNoteError("");
    setEditingNotes(true);
  };

  const handleCancelNoteEditor = () => {
    setEditingNotes(false);
    setNoteDraft(String(play?.notes || ""));
    setNoteError("");
  };

  const handleSaveNote = useCallback(() => {
    if (!play || !canSaveNote) return;
    setSavingNote(true);
    setNoteError("");
    try {
      const trimmedNote = noteDraft.trim();
      const noteAuthor = trimmedNote
        ? String(user?.name || user?.email || "Coach").trim()
        : "";
      const noteUpdatedAt = trimmedNote ? new Date().toISOString() : null;
      const updated = updateAppPlay(play.id, {
        notes: trimmedNote,
        notesAuthorName: noteAuthor,
        notesUpdatedAt: noteUpdatedAt,
      });
      if (!updated) {
        throw new Error("Play could not be updated.");
      }
      setPlay(updated);
      setEditingNotes(false);
      setNoteDraft(updated.notes || "");
    } catch (err) {
      setNoteError(err?.message || "Failed to save note. Please try again.");
    } finally {
      setSavingNote(false);
    }
  }, [play, noteDraft, user, canSaveNote]);

  if (!play) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8 md:px-10 md:py-12">
        <button
          onClick={() => navigate("/app/plays")}
          className="mb-8 flex items-center gap-2 text-sm text-BrandGray transition hover:text-BrandText"
        >
          <FiArrowLeft />
          Back to Playbook
        </button>
        <h1 className="font-Manrope text-xl font-bold tracking-tight">Play not found</h1>
        <p className="mt-2 text-sm text-BrandGray">The play you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-12">
      <button
        onClick={() => navigate("/app/plays")}
        className="mb-8 flex items-center gap-2 text-sm text-BrandGray transition hover:text-BrandText"
      >
        <FiArrowLeft />
        Back to Playbook
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-Manrope text-2xl font-bold tracking-tight">{play.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-xs text-BrandGray2">
            <span className="flex items-center gap-1.5">
              <FiClock className="text-[10px]" />
              {formatRelativeTime(play.updatedAt || play.createdAt)}
            </span>
          </div>
        </div>
        {isCoach && (
          <Link
            to={`/app/plays/${playId}/edit`}
            className="flex items-center gap-2 rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <FiEdit2 className="text-sm" />
            Edit
          </Link>
        )}
      </div>

      {/* Play preview */}
      <div className="mt-8 mb-4">
        <PlayPreviewCard
          playData={play.playData}
          autoplay="always"
          shape="wide"
          cameraMode="fit-distribution"
          background="field"
          paddingPx={30}
          minSpanPx={150}
        />
      </div>

      {isCoach && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={handleOpenNoteEditor}
            className="rounded-lg border border-BrandGray2/30 px-3.5 py-2 text-xs font-semibold text-BrandGray transition hover:border-BrandOrange/50 hover:text-BrandOrange"
          >
            {hasNotes ? "Edit Note" : "Add Note"}
          </button>
        </div>
      )}

      {editingNotes && (
        <section className="mb-8 rounded-2xl border border-BrandGray2/20 bg-BrandBlack2/30 p-4 sm:p-5">
          <label className="text-xs font-semibold text-BrandText">Note</label>
          <textarea
            ref={noteInputRef}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Write your note for this play..."
            className="mt-2 h-32 w-full resize-none rounded-lg border border-BrandGray2/30 bg-BrandBlack2/60 px-3 py-2 text-sm text-BrandText outline-none transition focus:border-BrandOrange/60"
            maxLength={500}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-BrandGray2">{noteDraft.length}/500</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelNoteEditor}
                className="rounded-lg border border-BrandGray2/30 px-3 py-1.5 text-xs text-BrandGray transition hover:border-BrandGray hover:text-BrandText"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={!canSaveNote}
                className="rounded-lg bg-BrandOrange px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savingNote ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
          {noteError && <p className="mt-2 text-xs text-red-400">{noteError}</p>}
        </section>
      )}

      {/* Tags */}
      {play.tags && play.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {play.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-BrandGray2/20 px-2.5 py-1 text-xs text-BrandGray"
            >
              <FiTag className="text-[10px]" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {hasNotes && !editingNotes && (
        <section className="mt-8 rounded-2xl border border-BrandGray2/20 bg-BrandBlack2/30 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center rounded-full bg-BrandOrange/15 px-3 py-1 text-[11px] font-semibold text-BrandOrange">
              {noteAuthorName}
            </span>
            {noteDate && (
              <span className="text-[11px] text-BrandGray2">{noteDate}</span>
            )}
          </div>
          <p className="mt-3 whitespace-pre-wrap font-DmSans text-sm leading-6 text-BrandText">
            {notesBody}
          </p>
        </section>
      )}
    </div>
  );
}
