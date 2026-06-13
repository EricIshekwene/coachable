import { useState, useEffect, useRef } from "react";
import { FiFolder, FiMoreHorizontal, FiChevronRight, FiCopy, FiEdit3, FiTrash2 } from "react-icons/fi";

/**
 * A folder card for the main-app Plays grid. Self-contained: owns its own
 * context-menu open state and inline-rename editing state, and renders its own
 * "⋯" actions menu (Share / Rename / Delete). Data and mutations are supplied by
 * the parent via callbacks.
 *
 * Extracted (behavior-preserving) from the folder grid card in
 * `src/pages/app/Plays.jsx`.
 *
 * @param {Object} props
 * @param {Object} props.folder - Folder object (`id`, `name`, `playIds`)
 * @param {number} props.subFolderCount - Number of child folders (for the subtitle)
 * @param {boolean} props.isCoach - Whether the current viewer can manage folders
 * @param {boolean} props.isDragOver - Whether a play is currently dragged over this folder
 * @param {Function} props.onOpen - Called when the card is clicked to enter the folder
 * @param {Function} props.onDragOver - Drag-over handler `(e) => void`
 * @param {Function} props.onDragLeave - Drag-leave handler `() => void`
 * @param {Function} props.onDrop - Drop handler `(e) => void`
 * @param {Function} props.onRename - Called with (folderId, newName) to rename
 * @param {Function} props.onShare - Called with folderId to copy/share a link
 * @param {Function} props.onDelete - Called with folderId to delete the folder
 * @returns {JSX.Element}
 */
export default function FolderCard({
  folder,
  subFolderCount,
  isCoach,
  isDragOver,
  onOpen,
  onDragOver,
  onDragLeave,
  onDrop,
  onRename,
  onShare,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
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
    setRenameValue(folder.name);
    setRenaming(true);
    setMenuOpen(false);
  };

  const confirmRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== folder.name) onRename(folder.id, trimmed);
    setRenaming(false);
  };

  return (
    <div
      data-component="FolderCard"
      onClick={renaming ? undefined : onOpen}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group relative cursor-pointer rounded-2xl border transition ${
        menuOpen ? "z-20 overflow-visible" : "overflow-hidden"
      } ${
        isDragOver
          ? "border-BrandOrange/60 bg-BrandOrange/8 shadow-[0_0_0_2px_rgba(255,122,24,0.18)]"
          : "border-BrandGray2/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),rgba(24,26,31,0.96)] hover:border-BrandOrange/25 hover:bg-[linear-gradient(180deg,rgba(255,122,24,0.05),rgba(255,255,255,0.02)),rgba(24,26,31,0.98)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <div className="flex items-start gap-4 p-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition ${
          isDragOver
            ? "border-BrandOrange/35 bg-BrandOrange/14"
            : "border-white/6 bg-white/[0.04]"
        }`}>
          <FiFolder className={`text-lg ${isDragOver ? "text-BrandOrange" : "text-BrandText"}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {renaming ? (
                <input
                  ref={renameRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={confirmRename}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenaming(false); }}
                  onClick={(e) => e.stopPropagation()}
                  maxLength={200}
                  className="w-full rounded bg-transparent px-1 text-sm font-semibold outline-none ring-1 ring-BrandOrange"
                />
              ) : (
                <p className="truncate font-Manrope text-sm font-semibold text-BrandText">{folder.name}</p>
              )}
              <p className="mt-1 text-[11px] text-BrandGray2">
                {folder.playIds.length} play{folder.playIds.length !== 1 ? "s" : ""}
                {subFolderCount > 0 && ` · ${subFolderCount} subfolder${subFolderCount !== 1 ? "s" : ""}`}
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
                    <button onClick={() => { onShare(folder.id); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiCopy className="text-sm" /> Share Folder</button>
                    <button onClick={startRename} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiEdit3 className="text-sm" /> Rename</button>
                    <div className="mx-2 my-1 h-px bg-BrandGray2/15" />
                    <button onClick={() => { onDelete(folder.id); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-red-400 transition hover:bg-red-500/10"><FiTrash2 className="text-sm" /> Delete</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-BrandGray2/20 bg-BrandBlack/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-BrandGray2">
                Folder
              </span>
              {isDragOver && (
                <span className="rounded-full border border-BrandOrange/35 bg-BrandOrange/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-BrandOrange">
                  Drop Here
                </span>
              )}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-BrandGray2/20 bg-BrandBlack/40 text-BrandGray transition group-hover:border-BrandOrange/30 group-hover:text-BrandOrange">
              <FiChevronRight className="text-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
