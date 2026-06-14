import { useState, useEffect, useRef } from "react";
import {
  FiEyeOff, FiEye, FiStar, FiMoreHorizontal, FiClock, FiEdit2, FiEdit3, FiTag,
  FiCheckSquare, FiSquare, FiExternalLink, FiCopy, FiSend, FiFolder, FiTrash2,
} from "react-icons/fi";
import PlayPreviewCard from "./PlayPreviewCard";
import { Menu, MenuItem } from "../design-system/components";

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
  const menuBtnRef = useRef(null);
  const renameRef = useRef(null);

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
      className={`group relative flex cursor-grab flex-col overflow-hidden rounded-2xl border transition active:cursor-grabbing ${
        bulkMode && selected
          ? "border-BrandOrange/50 bg-BrandOrange/6 shadow-[0_0_0_1px_rgba(255,122,24,0.16)]"
          : "border-[color:var(--ui-border)] hover:border-BrandOrange/25 hover:shadow-[0_4px_16px_rgba(0,0,0,0.14)]"
      }`}
      onClick={bulkMode ? () => onToggleSelect(play.id) : undefined}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      {bulkMode && (
        <div className="absolute top-3 left-3 z-10">
          {selected ? <FiCheckSquare className="text-lg text-BrandOrange" /> : <FiSquare className="text-lg" style={{ color: "var(--ui-text-subtle)" }} />}
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
                {play.hiddenFromPlayers && isCoach && <FiEyeOff className="shrink-0 text-sm" style={{ color: "var(--ui-text-subtle)" }} title="Hidden from players" />}
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
                  <h3 className="min-w-0 flex-1 truncate font-Manrope text-sm font-semibold" style={{ color: "var(--ui-text)" }}>{play.title}</h3>
                )}
              </div>
              <p className="mt-1 text-[11px]" style={{ color: "var(--ui-text-subtle)" }}>
                {inFolder ? "Stored in this folder" : "Play preview and details"}
              </p>
            </div>

            {isCoach && (
              <div className="shrink-0">
                <button
                  ref={menuBtnRef}
                  onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                  className="rounded-lg p-1.5 text-[color:var(--ui-text-subtle)] opacity-100 transition hover:bg-[color:var(--ui-surface-2)] hover:text-[color:var(--ui-text)] md:opacity-0 group-hover:opacity-100"
                >
                  <FiMoreHorizontal className="text-sm" />
                </button>
                <Menu
                  open={menuOpen}
                  anchorRef={menuBtnRef}
                  onClose={() => setMenuOpen(false)}
                  placement="top-end"
                  width={192}
                >
                  <MenuItem icon={<FiExternalLink />} onSelect={() => { onOpen(play.id); setMenuOpen(false); }}>Open</MenuItem>
                  <MenuItem icon={<FiStar className={play.favorited ? "fill-BrandOrange text-BrandOrange" : ""} />} onSelect={() => { onToggleFavorite(play.id); setMenuOpen(false); }}>
                    {play.favorited ? "Unfavorite" : "Favorite"}
                  </MenuItem>
                  <MenuItem icon={<FiCopy />} onSelect={() => { onShare(play.id); setMenuOpen(false); }}>Share</MenuItem>
                  <MenuItem icon={<FiCopy />} onSelect={() => { onDuplicate(play.id); setMenuOpen(false); }}>Duplicate</MenuItem>
                  <MenuItem
                    icon={play.hiddenFromPlayers ? <FiEye /> : <FiEyeOff />}
                    onSelect={() => { onToggleHidden(play.id); setMenuOpen(false); }}
                  >
                    {play.hiddenFromPlayers ? "Show to Players" : "Hide from Players"}
                  </MenuItem>
                  {canPostToCommunity && (
                    <MenuItem icon={<FiSend />} onSelect={() => { onPostToCommunity(play.id); setMenuOpen(false); }}>Post to Community</MenuItem>
                  )}
                  <MenuItem icon={<FiEdit3 />} onSelect={startRename}>Rename</MenuItem>
                  {hasFolders && (
                    <MenuItem icon={<FiFolder />} onSelect={() => { onMoveRequest(play.id); setMenuOpen(false); }}>Move to Folder</MenuItem>
                  )}
                  {inFolder && (
                    <MenuItem icon={<FiFolder />} onSelect={() => { onRemoveFromFolder(play.id); setMenuOpen(false); }}>Remove from Folder</MenuItem>
                  )}
                  <div style={{ height: 1, backgroundColor: "var(--ui-border)", margin: "4px 8px" }} />
                  <MenuItem icon={<FiTrash2 />} destructive onSelect={() => { onDelete(play.id); setMenuOpen(false); }}>Move to Trash</MenuItem>
                </Menu>
              </div>
            )}
          </div>

          {(play.tags || []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {play.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-[color:var(--ui-border)] px-2.5 py-1 text-[10px]" style={{ backgroundColor: "var(--ui-surface-2)", color: "var(--ui-text-muted)" }}>
                  <FiTag className="text-[8px]" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--ui-border)] px-2.5 py-1 text-[11px]" style={{ backgroundColor: "var(--ui-surface-2)", color: "var(--ui-text-subtle)" }}>
              <FiClock className="text-[10px]" />
              {formatRelativeTime(play.updatedAt || play.createdAt)}
            </span>
            {canEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(play.id); }}
                className="flex items-center gap-1 rounded-full border border-[color:var(--ui-border)] px-3 py-1.5 text-[11px] text-[color:var(--ui-text-muted)] transition hover:border-BrandOrange/30 hover:text-BrandOrange"
                style={{ backgroundColor: "var(--ui-surface-2)" }}
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
