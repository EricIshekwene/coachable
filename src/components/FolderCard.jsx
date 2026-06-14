import { useState, useEffect, useRef } from "react";
import { FiFolder, FiMoreHorizontal, FiChevronRight, FiCopy, FiEdit3, FiTrash2 } from "react-icons/fi";
import { Badge, Button, Divider, Menu, MenuItem } from "../design-system/components";

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
  const menuBtnRef = useRef(null);
  const renameRef = useRef(null);

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
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition ${
        isDragOver
          ? "border-BrandOrange/60 bg-BrandOrange/8 shadow-[0_0_0_2px_rgba(255,122,24,0.18)]"
          : "border-[color:var(--ui-border)] hover:border-BrandOrange/25"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <div className="flex items-start gap-4 p-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition ${
          isDragOver
            ? "border-BrandOrange/35 bg-BrandOrange/14"
            : "border-[color:var(--ui-border)] bg-[color:var(--ui-surface-2)]"
        }`}>
          <FiFolder className={`text-lg ${isDragOver ? "text-BrandOrange" : "text-[color:var(--ui-text)]"}`} />
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
                <p className="truncate font-Manrope text-sm font-semibold" style={{ color: "var(--ui-text)" }}>{folder.name}</p>
              )}
              <p className="mt-1 text-[11px]" style={{ color: "var(--ui-text-subtle)" }}>
                {folder.playIds.length} play{folder.playIds.length !== 1 ? "s" : ""}
                {subFolderCount > 0 && ` · ${subFolderCount} subfolder${subFolderCount !== 1 ? "s" : ""}`}
              </p>
            </div>

            {isCoach && (
              <div className="shrink-0">
                <Button
                  ref={menuBtnRef}
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                  className="opacity-100 md:opacity-0 group-hover:opacity-100"
                >
                  <FiMoreHorizontal className="text-sm" />
                </Button>
                <Menu
                  open={menuOpen}
                  anchorRef={menuBtnRef}
                  onClose={() => setMenuOpen(false)}
                  placement="top-end"
                  width={192}
                >
                  <MenuItem icon={<FiCopy />} onSelect={() => { onShare(folder.id); setMenuOpen(false); }}>Share Folder</MenuItem>
                  <MenuItem icon={<FiEdit3 />} onSelect={startRename}>Rename</MenuItem>
                  <Divider className="mx-2 my-1" />
                  <MenuItem icon={<FiTrash2 />} destructive onSelect={() => { onDelete(folder.id); setMenuOpen(false); }}>Delete</MenuItem>
                </Menu>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="uppercase tracking-[0.14em]">Folder</Badge>
              {isDragOver && (
                <Badge status="info" className="uppercase tracking-[0.14em]">Drop Here</Badge>
              )}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--ui-border)] text-[color:var(--ui-text-muted)] transition group-hover:border-BrandOrange/30 group-hover:text-BrandOrange" style={{ backgroundColor: "var(--ui-surface-2)" }}>
              <FiChevronRight className="text-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
