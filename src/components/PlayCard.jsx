import { useState, useEffect, useRef } from "react";
import {
  FiEyeOff, FiEye, FiStar, FiMoreHorizontal, FiClock, FiEdit2, FiEdit3, FiTag,
  FiCheckSquare, FiSquare, FiExternalLink, FiCopy, FiSend, FiFolder, FiTrash2,
} from "react-icons/fi";
import PlayPreviewCard from "./PlayPreviewCard";

/**
 * Formats an ISO timestamp as a short relative string ("Just now", "5m ago", …).
 * @param {string} isoString
 * @returns {string}
 */
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

/**
 * A play card for the main-app Plays grid. Self-contained: owns its own
 * context-menu open state and inline-rename editing state, and renders its own
 * "⋯" actions menu (Open / Favorite / Share / Duplicate / Hide / Post / Rename /
 * Move / Remove / Trash). Data and mutations are supplied by the parent via
 * callbacks; bulk-select and drag state remain owned by the parent.
 *
 * Extracted (behavior-preserving) from the play grid card in
 * `src/pages/app/Plays.jsx`.
 *
 * @param {Object} props
 * @param {Object} props.play - Play object
 * @param {boolean} props.isCoach - Whether the viewer can manage plays (shows the menu)
 * @param {boolean} props.bulkMode - Whether bulk-select mode is active
 * @param {boolean} props.selected - Whether this play is selected in bulk mode
 * @param {boolean} props.inFolder - Whether the grid is currently inside a folder
 * @param {boolean} props.hasFolders - Whether any folders exist (enables "Move to Folder")
 * @param {boolean} props.canEdit - Whether the Edit button shows
 * @param {boolean} props.canPostToCommunity - Whether the "Post to Community" item shows
 * @param {Function} props.onToggleSelect - Called with play.id when toggled in bulk mode
 * @param {Function} props.onDragStart - Drag-start handler `(e) => void`
 * @param {Function} props.onDragEnd - Drag-end handler `() => void`
 * @param {Function} props.onOpen - Called with play.id to open the play
 * @param {Function} props.onEdit - Called with play.id to open the editor
 * @param {Function} props.onToggleFavorite - Called with play.id
 * @param {Function} props.onShare - Called with play.id
 * @param {Function} props.onDuplicate - Called with play.id
 * @param {Function} props.onToggleHidden - Called with play.id
 * @param {Function} props.onPostToCommunity - Called with play.id
 * @param {Function} props.onRename - Called with (play.id, newTitle)
 * @param {Function} props.onMoveRequest - Called with play.id to open the move-to-folder modal
 * @param {Function} props.onRemoveFromFolder - Called with play.id
 * @param {Function} props.onDelete - Called with play.id (move to trash)
 * @returns {JSX.Element}
 */
export default function PlayCard({
  play,
  isCoach,
  bulkMode,
  selected,
  inFolder,
  hasFolders,
  canEdit,
  canPostToCommunity,
  onToggleSelect,
  onDragStart,
  onDragEnd,
  onOpen,
  onEdit,
  onToggleFavorite,
  onShare,
  onDuplicate,
  onToggleHidden,
  onPostToCommunity,
  onRename,
  onMoveRequest,
  onRemoveFromFolder,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(play.title || "");
  const menuRef = useRef(null);
  const renameRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => { if (renaming) renameRef.current?.focus(); }, [renaming]);

  const startRename = () => {
    setRenameValue(play.title || "");
    setRenaming(true);
    setMenuOpen(false);
  };

  const confirmRename = () => {
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenaming(false); return; }
    if (trimmed !== play.title) onRename(play.id, trimmed);
    setRenaming(false);
  };

  return (
    <div
      data-component="PlayCard"
      draggable={isCoach && !bulkMode}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group relative flex cursor-grab flex-col rounded-2xl border transition active:cursor-grabbing ${
        menuOpen ? "z-20 overflow-visible" : "overflow-hidden"
      } ${
        bulkMode && selected
          ? "border-BrandOrange/50 bg-BrandOrange/6 shadow-[0_0_0_1px_rgba(255,122,24,0.16)]"
          : "border-BrandGray2/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),rgba(24,26,31,0.96)] hover:border-BrandOrange/25 hover:shadow-[0_4px_16px_rgba(0,0,0,0.14)]"
      }`}
      onClick={bulkMode ? () => onToggleSelect(play.id) : undefined}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      {bulkMode && (
        <div className="absolute top-3 left-3 z-10">
          {selected ? <FiCheckSquare className="text-lg text-BrandOrange" /> : <FiSquare className="text-lg text-BrandGray2" />}
        </div>
      )}
      <div
        className="flex flex-1 cursor-pointer flex-col"
        onClick={bulkMode ? undefined : () => onOpen(play.id)}
      >
        <div className="border-b border-white/6 bg-BrandBlack/40 p-3">
          <PlayPreviewCard
            playData={play.playData}
            autoplay="hover"
            shape="landscape"
            cameraMode="fit-distribution"
            background="field"
            paddingPx={20}
            minSpanPx={100}
            showHoverHint={false}
            className="overflow-hidden rounded-xl"
          />
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {play.hiddenFromPlayers && isCoach && <FiEyeOff className="shrink-0 text-sm text-BrandGray2" title="Hidden from players" />}
                {play.favorited && <FiStar className="shrink-0 fill-BrandOrange text-sm text-BrandOrange" />}
                {renaming ? (
                  <input
                    ref={renameRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={confirmRename}
                    onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenaming(false); }}
                    onClick={(e) => e.stopPropagation()}
                    className="min-w-0 flex-1 rounded bg-transparent px-1 font-Manrope text-sm font-semibold outline-none ring-1 ring-BrandOrange"
                  />
                ) : (
                  <h3 className="min-w-0 flex-1 truncate font-Manrope text-sm font-semibold text-BrandText">{play.title}</h3>
                )}
              </div>
              <p className="mt-1 text-[11px] text-BrandGray2">
                {inFolder ? "Stored in this folder" : "Play preview and details"}
              </p>
            </div>

            {isCoach && (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                  className="rounded-lg p-1.5 text-BrandGray2 opacity-100 transition hover:bg-BrandBlack2 hover:text-BrandText md:opacity-0 group-hover:opacity-100"
                >
                  <FiMoreHorizontal className="text-sm" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 bottom-full z-50 mb-1 w-48 rounded-lg border border-BrandGray2/20 bg-BrandBlack shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { onOpen(play.id); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiExternalLink className="text-sm" /> Open</button>
                    <button onClick={() => { onToggleFavorite(play.id); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiStar className={`text-sm ${play.favorited ? "fill-BrandOrange text-BrandOrange" : ""}`} />{play.favorited ? "Unfavorite" : "Favorite"}</button>
                    <button onClick={() => { onShare(play.id); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiCopy className="text-sm" /> Share</button>
                    <button onClick={() => { onDuplicate(play.id); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiCopy className="text-sm" /> Duplicate</button>
                    <button onClick={() => { onToggleHidden(play.id); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText">{play.hiddenFromPlayers ? <><FiEye className="text-sm" /> Show to Players</> : <><FiEyeOff className="text-sm" /> Hide from Players</>}</button>
                    {canPostToCommunity && (
                      <button onClick={() => { onPostToCommunity(play.id); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiSend className="text-sm" /> Post to Community</button>
                    )}
                    <button onClick={startRename} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiEdit3 className="text-sm" /> Rename</button>
                    {hasFolders && (<button onClick={() => { onMoveRequest(play.id); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiFolder className="text-sm" /> Move to Folder</button>)}
                    {inFolder && (<button onClick={() => { onRemoveFromFolder(play.id); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiFolder className="text-sm" /> Remove from Folder</button>)}
                    <div className="mx-2 my-1 h-px bg-BrandGray2/15" />
                    <button onClick={() => { onDelete(play.id); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-red-400 transition hover:bg-red-500/10"><FiTrash2 className="text-sm" /> Move to Trash</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {(play.tags || []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {play.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-BrandGray2/15 bg-BrandBlack/35 px-2.5 py-1 text-[10px] text-BrandGray">
                  <FiTag className="text-[8px]" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-BrandGray2/15 bg-BrandBlack/35 px-2.5 py-1 text-[11px] text-BrandGray2">
              <FiClock className="text-[10px]" />
              {formatRelativeTime(play.updatedAt || play.createdAt)}
            </span>
            {canEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(play.id); }}
                className="flex items-center gap-1 rounded-full border border-BrandGray2/20 bg-BrandBlack/35 px-3 py-1.5 text-[11px] text-BrandGray transition hover:border-BrandOrange/30 hover:text-BrandOrange"
              >
                <FiEdit2 className="text-[10px]" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
