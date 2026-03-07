import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiPlus, FiPlay, FiEdit2, FiClock, FiTag, FiFolder, FiMoreVertical,
  FiArrowLeft, FiStar, FiCopy, FiExternalLink, FiTrash2, FiEdit3,
} from "react-icons/fi";

const INITIAL_FOLDERS = [
  { id: "f1", name: "Attack Plays", tags: ["attack", "offense"], playIds: ["p1", "p5"] },
  { id: "f2", name: "Set Pieces", tags: ["set piece", "lineout"], playIds: ["p2", "p4"] },
];

const INITIAL_PLAYS = [
  { id: "p1", title: "Inside Pass Loop", tags: ["attack", "phase"], updatedAt: "2 hours ago", favorited: false },
  { id: "p2", title: "Blindside Crash", tags: ["set piece"], updatedAt: "Yesterday", favorited: false },
  { id: "p3", title: "Scrum Exit Left", tags: ["scrum", "exit"], updatedAt: "3 days ago", favorited: false },
  { id: "p4", title: "Lineout Drive Maul", tags: ["lineout"], updatedAt: "1 week ago", favorited: true },
  { id: "p5", title: "Counter Attack Spread", tags: ["counter", "backs"], updatedAt: "1 week ago", favorited: false },
];

export default function Plays() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCoach = user?.role === "coach";

  const [plays, setPlays] = useState(INITIAL_PLAYS);
  const [folders, setFolders] = useState(INITIAL_FOLDERS);
  const [activeFolder, setActiveFolder] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null); // "p1" | "f1" | null
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [moveTarget, setMoveTarget] = useState(null); // play id being moved via menu
  const [toast, setToast] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const menuRef = useRef(null);
  const renameRef = useRef(null);
  const newFolderRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-focus rename input
  useEffect(() => {
    if (renameTarget) renameRef.current?.focus();
  }, [renameTarget]);

  useEffect(() => {
    if (newFolderMode) newFolderRef.current?.focus();
  }, [newFolderMode]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg) => setToast(msg);

  // --- Actions ---
  const toggleFavorite = (playId) => {
    setPlays((prev) => prev.map((p) => (p.id === playId ? { ...p, favorited: !p.favorited } : p)));
  };

  const deletePlay = (playId) => {
    setPlays((prev) => prev.filter((p) => p.id !== playId));
    setFolders((prev) => prev.map((f) => ({ ...f, playIds: f.playIds.filter((id) => id !== playId) })));
    setMenuOpen(null);
    showToast("Play deleted");
  };

  const deleteFolder = (folderId) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    if (activeFolder === folderId) setActiveFolder(null);
    setMenuOpen(null);
    showToast("Folder deleted");
  };

  const startRename = (id, currentName) => {
    setRenameTarget(id);
    setRenameValue(currentName);
    setMenuOpen(null);
  };

  const confirmRename = () => {
    if (!renameValue.trim()) { setRenameTarget(null); return; }
    const isFolder = renameTarget?.startsWith("f");
    if (isFolder) {
      setFolders((prev) => prev.map((f) => (f.id === renameTarget ? { ...f, name: renameValue.trim() } : f)));
    } else {
      setPlays((prev) => prev.map((p) => (p.id === renameTarget ? { ...p, title: renameValue.trim() } : p)));
    }
    setRenameTarget(null);
  };

  const movePlayToFolder = useCallback((playId, folderId) => {
    const play = plays.find((p) => p.id === playId);
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === folderId && !f.playIds.includes(playId)) {
          return { ...f, playIds: [...f.playIds, playId] };
        }
        return f;
      })
    );
    const folder = folders.find((f) => f.id === folderId);
    showToast(`"${play?.title}" added to ${folder?.name}`);
    setMoveTarget(null);
    setMenuOpen(null);
  }, [plays, folders]);

  const removePlayFromFolder = (playId, folderId) => {
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, playIds: f.playIds.filter((id) => id !== playId) } : f)));
    showToast("Removed from folder");
  };

  const copyLink = (playId) => {
    navigator.clipboard.writeText(`${window.location.origin}/app/plays/${playId}`);
    showToast("Link copied");
    setMenuOpen(null);
  };

  const createFolder = () => {
    if (!newFolderName.trim()) { setNewFolderMode(false); return; }
    const id = "f-" + Date.now();
    setFolders((prev) => [...prev, { id, name: newFolderName.trim(), tags: [], playIds: [] }]);
    setNewFolderName("");
    setNewFolderMode(false);
  };

  // --- Drag & Drop ---
  const handleDragStart = (e, playId) => {
    e.dataTransfer.setData("text/plain", playId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolder(folderId);
  };

  const handleDragLeave = () => setDragOverFolder(null);

  const handleDrop = (e, folderId) => {
    e.preventDefault();
    setDragOverFolder(null);
    const playId = e.dataTransfer.getData("text/plain");
    if (playId) movePlayToFolder(playId, folderId);
  };

  // --- Derived ---
  const visiblePlays = activeFolder
    ? plays.filter((p) => folders.find((f) => f.id === activeFolder)?.playIds.includes(p.id))
    : plays;

  const activeFolderData = folders.find((f) => f.id === activeFolder);

  // --- Context menu ---
  const ContextMenu = ({ id, type }) => {
    if (menuOpen !== id) return null;
    const isFolder = type === "folder";
    const play = !isFolder ? plays.find((p) => p.id === id) : null;

    return (
      <div
        ref={menuRef}
        className="absolute right-0 top-full z-30 mt-1 w-48 rounded-lg border border-BrandGray2/20 bg-BrandBlack shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {!isFolder && (
          <>
            <button
              onClick={() => navigate(`/app/plays/${id}`)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"
            >
              <FiExternalLink className="text-sm" /> Open
            </button>
            <button
              onClick={() => { toggleFavorite(id); setMenuOpen(null); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"
            >
              <FiStar className={`text-sm ${play?.favorited ? "fill-BrandOrange text-BrandOrange" : ""}`} />
              {play?.favorited ? "Unfavorite" : "Favorite"}
            </button>
            <button
              onClick={() => copyLink(id)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"
            >
              <FiCopy className="text-sm" /> Copy Link
            </button>
          </>
        )}
        <button
          onClick={() => startRename(id, isFolder ? folders.find((f) => f.id === id)?.name : play?.title)}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"
        >
          <FiEdit3 className="text-sm" /> Rename
        </button>
        {!isFolder && folders.length > 0 && (
          <button
            onClick={() => { setMoveTarget(id); setMenuOpen(null); }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"
          >
            <FiFolder className="text-sm" /> Move to Folder
          </button>
        )}
        <div className="mx-2 my-1 h-px bg-BrandGray2/15" />
        <button
          onClick={() => (isFolder ? deleteFolder(id) : deletePlay(id))}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-red-400 transition hover:bg-red-500/10"
        >
          <FiTrash2 className="text-sm" /> Delete
        </button>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {activeFolder ? (
            <button
              onClick={() => setActiveFolder(null)}
              className="mb-2 flex items-center gap-1.5 text-xs text-BrandGray transition hover:text-BrandText"
            >
              <FiArrowLeft className="text-[10px]" /> All plays
            </button>
          ) : null}
          <h1 className="font-Manrope text-xl font-bold tracking-tight">
            {activeFolderData ? activeFolderData.name : "Playbook"}
          </h1>
          <p className="mt-1 text-sm text-BrandGray">
            {activeFolder
              ? `${visiblePlays.length} play${visiblePlays.length !== 1 ? "s" : ""} in folder`
              : `${plays.length} plays · ${folders.length} folders`}
          </p>
        </div>
        {isCoach && (
          <div className="flex items-center gap-2">
            {!activeFolder && (
              <button
                onClick={() => setNewFolderMode(true)}
                className="flex items-center gap-2 rounded-lg border border-BrandGray2/30 px-3.5 py-2.5 text-sm text-BrandGray transition hover:border-BrandGray hover:text-BrandText"
              >
                <FiFolder className="text-sm" />
                New Folder
              </button>
            )}
            <Link
              to="/app/plays/new"
              className="flex items-center gap-2 rounded-lg bg-BrandOrange px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
            >
              <FiPlus className="text-base" />
              New Play
            </Link>
          </div>
        )}
      </div>

      {/* Folders row (when not inside a folder) */}
      {!activeFolder && folders.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-BrandGray2">Folders</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => setActiveFolder(folder.id)}
                onDragOver={(e) => handleDragOver(e, folder.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder.id)}
                className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                  dragOverFolder === folder.id
                    ? "border-BrandOrange bg-BrandOrange/5 shadow-[0_0_0_2px_rgba(255,122,24,0.2)]"
                    : "border-BrandGray2/20 bg-BrandBlack2/30 hover:border-BrandGray2/40"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                  dragOverFolder === folder.id ? "bg-BrandOrange/20" : "bg-BrandGray2/15"
                }`}>
                  <FiFolder className={`text-lg ${dragOverFolder === folder.id ? "text-BrandOrange" : "text-BrandGray"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  {renameTarget === folder.id ? (
                    <input
                      ref={renameRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={confirmRename}
                      onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenameTarget(null); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full rounded bg-transparent text-sm font-semibold outline-none ring-1 ring-BrandOrange px-1"
                    />
                  ) : (
                    <p className="truncate text-sm font-semibold">{folder.name}</p>
                  )}
                  <p className="text-[11px] text-BrandGray2">{folder.playIds.length} plays</p>
                </div>
                {folder.tags.length > 0 && (
                  <div className="hidden items-center gap-1 sm:flex">
                    {folder.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-md bg-BrandGray2/15 px-1.5 py-0.5 text-[9px] text-BrandGray2">{tag}</span>
                    ))}
                  </div>
                )}
                {isCoach && (
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === folder.id ? null : folder.id); }}
                      className="rounded-md p-1.5 text-BrandGray2 opacity-0 transition hover:bg-BrandBlack2 hover:text-BrandText group-hover:opacity-100"
                    >
                      <FiMoreVertical className="text-sm" />
                    </button>
                    <ContextMenu id={folder.id} type="folder" />
                  </div>
                )}
              </div>
            ))}

            {/* New folder inline input */}
            {newFolderMode && (
              <div className="flex items-center gap-3 rounded-xl border border-BrandOrange/40 bg-BrandOrange/5 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-BrandOrange/20">
                  <FiFolder className="text-lg text-BrandOrange" />
                </div>
                <input
                  ref={newFolderRef}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={createFolder}
                  onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setNewFolderMode(false); }}
                  placeholder="Folder name..."
                  className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-BrandGray2"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active folder: remove from folder action */}
      {activeFolder && activeFolderData?.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {activeFolderData.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-BrandGray2/20 px-2 py-0.5 text-[10px] text-BrandGray">
              <FiTag className="text-[8px]" />{tag}
            </span>
          ))}
        </div>
      )}

      {/* Plays grid */}
      <div className="mt-6">
        {!activeFolder && <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-BrandGray2">Plays</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePlays.map((play) => (
            <div
              key={play.id}
              draggable={isCoach}
              onDragStart={(e) => handleDragStart(e, play.id)}
              className="group relative flex cursor-grab flex-col rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 p-5 transition hover:border-BrandOrange/30 hover:bg-BrandBlack2/60 active:cursor-grabbing"
            >
              {/* 3-dot menu */}
              {isCoach && (
                <div className="absolute right-3 top-3 z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === play.id ? null : play.id); }}
                    className="rounded-md p-1.5 text-BrandGray2 opacity-0 transition hover:bg-BrandBlack2 hover:text-BrandText group-hover:opacity-100"
                  >
                    <FiMoreVertical className="text-sm" />
                  </button>
                  <ContextMenu id={play.id} type="play" />
                </div>
              )}

              {/* Favorite star */}
              {play.favorited && (
                <div className="absolute left-3 top-3">
                  <FiStar className="fill-BrandOrange text-sm text-BrandOrange" />
                </div>
              )}

              <Link to={`/app/plays/${play.id}`} className="flex flex-1 flex-col">
                {/* Preview placeholder */}
                <div className="mb-4 flex h-28 items-center justify-center rounded-lg bg-BrandBlack2/80">
                  <FiPlay className="text-2xl text-BrandGray2/50" />
                </div>

                {renameTarget === play.id ? (
                  <input
                    ref={renameRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={confirmRename}
                    onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenameTarget(null); }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="w-full rounded bg-transparent font-Manrope text-sm font-semibold outline-none ring-1 ring-BrandOrange px-1"
                  />
                ) : (
                  <h3 className="font-Manrope text-sm font-semibold truncate">{play.title}</h3>
                )}

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {play.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-BrandGray2/20 px-2 py-0.5 text-[10px] text-BrandGray">
                      <FiTag className="text-[8px]" />{tag}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] text-BrandGray2">
                    <FiClock className="text-[10px]" />{play.updatedAt}
                  </span>
                  {isCoach && (
                    <Link
                      to={`/app/plays/${play.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-BrandGray transition hover:bg-BrandGray2/20 hover:text-BrandOrange"
                    >
                      <FiEdit2 className="text-[10px]" />Edit
                    </Link>
                  )}
                </div>
              </Link>

              {/* Remove from folder button */}
              {activeFolder && isCoach && (
                <button
                  onClick={() => removePlayFromFolder(play.id, activeFolder)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-BrandGray2/20 py-1.5 text-[11px] text-BrandGray2 transition hover:border-red-500/30 hover:text-red-400"
                >
                  Remove from folder
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {visiblePlays.length === 0 && (
        <div className="mt-20 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-BrandGray2/10">
            <FiPlay className="text-2xl text-BrandGray2" />
          </div>
          <p className="mt-4 text-sm font-semibold">
            {activeFolder ? "No plays in this folder" : "No plays yet"}
          </p>
          <p className="mt-1 text-xs text-BrandGray2">
            {activeFolder
              ? "Drag plays here or use the menu to move them."
              : isCoach
                ? "Create your first play to get started."
                : "Your coach hasn't added any plays yet."}
          </p>
        </div>
      )}

      {/* Move to folder modal */}
      {moveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 font-DmSans" onClick={() => setMoveTarget(null)}>
          <div className="w-full max-w-sm rounded-xl border border-BrandGray2/20 bg-BrandBlack p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-Manrope text-base font-bold">Move to folder</h2>
            <p className="mt-1 text-sm text-BrandGray2">
              Select a folder for "{plays.find((p) => p.id === moveTarget)?.title}"
            </p>
            <div className="mt-4 flex flex-col gap-1">
              {folders.map((folder) => {
                const alreadyIn = folder.playIds.includes(moveTarget);
                return (
                  <button
                    key={folder.id}
                    disabled={alreadyIn}
                    onClick={() => movePlayToFolder(moveTarget, folder.id)}
                    className={`flex items-center gap-3 rounded-lg px-3.5 py-3 text-left text-sm transition ${
                      alreadyIn
                        ? "cursor-not-allowed text-BrandGray2/50"
                        : "text-BrandGray hover:bg-BrandBlack2 hover:text-BrandText"
                    }`}
                  >
                    <FiFolder className="text-base" />
                    {folder.name}
                    {alreadyIn && <span className="ml-auto text-[10px] text-BrandGray2">Already in folder</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-[fadeInUp_0.25s_ease-out]">
          <div className="flex items-center gap-2 rounded-lg border border-BrandGray2/20 bg-BrandBlack px-4 py-3 shadow-xl">
            <div className="h-1 w-1 rounded-full bg-BrandOrange" />
            <p className="text-sm text-BrandText">{toast}</p>
          </div>
        </div>
      )}
    </div>
  );
}
