import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiPlus, FiPlay, FiEdit2, FiClock, FiTag, FiFolder, FiMoreHorizontal,
  FiStar, FiCopy, FiExternalLink, FiTrash2, FiEdit3, FiChevronRight,
  FiLoader,
} from "react-icons/fi";
import { fetchPlays, deletePlay as apiDeletePlay, updatePlay, toggleFavorite as apiToggleFavorite, movePlayToFolder as apiMovePlayToFolder, sharePlay } from "../../utils/apiPlays";
import { fetchFolders, createFolder as apiCreateFolder, updateFolder, deleteFolder as apiFolderDelete } from "../../utils/apiFolders";
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

const MOBILE_BREAKPOINT = 768;

export default function Plays() {
  const { user, playerViewMode } = useAuth();
  const navigate = useNavigate();
  const isCoach = (user?.role === "coach" || user?.role === "owner") && !playerViewMode;
  const teamId = user?.teamId;

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const canCreatePlay = isCoach && !isMobile;
  const canEditPlay = isCoach && !isMobile;

  const [plays, setPlays] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [folderPath, setFolderPath] = useState([]);
  const [menuOpen, setMenuOpen] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [moveTarget, setMoveTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [draggingPlayId, setDraggingPlayId] = useState(null);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const menuRef = useRef(null);
  const renameRef = useRef(null);
  const newFolderRef = useRef(null);

  // Load plays and folders from API
  useEffect(() => {
    if (!teamId) { setLoadingData(false); return; }
    setLoadingData(true);
    Promise.all([fetchPlays(teamId), fetchFolders(teamId)])
      .then(([apiPlays, apiFolders]) => {
        setPlays(apiPlays);
        const folderPlayMap = {};
        apiPlays.forEach((p) => {
          if (p.folderId) {
            if (!folderPlayMap[p.folderId]) folderPlayMap[p.folderId] = [];
            folderPlayMap[p.folderId].push(p.id);
          }
        });
        setFolders(apiFolders.map((f) => ({ ...f, playIds: folderPlayMap[f.id] || [] })));
      })
      .catch(() => {
        setPlays([]);
        setFolders([]);
      })
      .finally(() => setLoadingData(false));
  }, [teamId]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { if (renameTarget) renameRef.current?.focus(); }, [renameTarget]);
  useEffect(() => { if (newFolderMode) newFolderRef.current?.focus(); }, [newFolderMode]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg) => setToast(msg);

  const handleToggleFavorite = (playId) => {
    const play = plays.find((p) => p.id === playId);
    if (!play) return;
    const next = !play.favorited;
    setPlays((prev) => prev.map((p) => (p.id === playId ? { ...p, favorited: next } : p)));
    if (teamId) apiToggleFavorite(teamId, playId, next).catch(() => {});
  };

  const handleDeletePlay = (playId) => {
    setPlays((prev) => prev.filter((p) => p.id !== playId));
    setFolders((prev) => prev.map((f) => ({ ...f, playIds: f.playIds.filter((id) => id !== playId) })));
    setMenuOpen(null);
    showToast("Play deleted");
    if (teamId) apiDeletePlay(teamId, playId).catch(() => {});
  };

  const handleDeleteFolder = (folderId) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    const currentFolderId = folderPath[folderPath.length - 1] ?? null;
    if (currentFolderId === folderId) setFolderPath(folderPath.slice(0, -1));
    setMenuOpen(null);
    showToast("Folder deleted");
    if (teamId) apiFolderDelete(teamId, folderId).catch(() => {});
  };

  const startRename = (id, currentName) => {
    setRenameTarget(id);
    setRenameValue(currentName);
    setMenuOpen(null);
  };

  const confirmRename = () => {
    if (!renameValue.trim()) { setRenameTarget(null); return; }
    const isFolder = folders.some((f) => f.id === renameTarget);
    if (isFolder) {
      setFolders((prev) => prev.map((f) => (f.id === renameTarget ? { ...f, name: renameValue.trim() } : f)));
      if (teamId) updateFolder(teamId, renameTarget, { name: renameValue.trim() }).catch(() => {});
    } else {
      setPlays((prev) => prev.map((p) => (p.id === renameTarget ? { ...p, title: renameValue.trim() } : p)));
      if (teamId) updatePlay(teamId, renameTarget, { title: renameValue.trim() }).catch(() => {});
    }
    setRenameTarget(null);
  };

  const handleMovePlayToFolder = useCallback((playId, folderId) => {
    const play = plays.find((p) => p.id === playId);
    setPlays((prev) => prev.map((p) => (p.id === playId ? { ...p, folderId } : p)));
    setFolders((prev) => prev.map((f) => {
      const withoutPlay = f.playIds.filter((id) => id !== playId);
      if (f.id === folderId) return { ...f, playIds: [...withoutPlay, playId] };
      return { ...f, playIds: withoutPlay };
    }));
    const folder = folders.find((f) => f.id === folderId);
    showToast(`"${play?.title}" moved to ${folder?.name}`);
    setMoveTarget(null);
    setMenuOpen(null);
    if (teamId) apiMovePlayToFolder(teamId, playId, folderId).catch(() => {});
  }, [plays, folders, teamId]);

  const removePlayFromFolder = (playId, folderId) => {
    setPlays((prev) => prev.map((p) => (p.id === playId ? { ...p, folderId: null } : p)));
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, playIds: f.playIds.filter((id) => id !== playId) } : f)));
    showToast("Removed from folder");
    if (teamId) apiMovePlayToFolder(teamId, playId, null).catch(() => {});
  };

  const copyLink = async (playId) => {
    setMenuOpen(null);
    try {
      const { token } = await sharePlay(teamId, playId);
      await navigator.clipboard.writeText(`${window.location.origin}/shared/${token}`);
      showToast("Share link copied");
    } catch {
      showToast("Failed to create share link");
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) { setNewFolderMode(false); return; }
    const currentFolderId = folderPath[folderPath.length - 1] ?? null;
    const tempId = "f-" + Date.now();
    const newFolder = { id: tempId, name: newFolderName.trim(), parentId: currentFolderId, tags: [], playIds: [] };
    setFolders((prev) => [...prev, newFolder]);
    setNewFolderName("");
    setNewFolderMode(false);
    if (teamId) {
      apiCreateFolder(teamId, { name: newFolder.name, parentId: currentFolderId })
        .then((created) => { setFolders((prev) => prev.map((f) => (f.id === tempId ? { ...f, id: created.id } : f))); })
        .catch(() => {});
    }
  };

  const PLAY_DRAG_MIME = "application/x-coachable-play-id";
  const handleDragStart = (e, playId) => { setDraggingPlayId(playId); e.dataTransfer.setData(PLAY_DRAG_MIME, playId); e.dataTransfer.setData("text/plain", playId); e.dataTransfer.effectAllowed = "move"; };
  const handleDragEnd = () => { setDraggingPlayId(null); setDragOverFolder(null); };
  const handleDragOver = (e, folderId) => { if (!draggingPlayId) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverFolder(folderId); };
  const handleDragLeave = () => setDragOverFolder(null);
  const handleDrop = (e, folderId) => { e.preventDefault(); setDragOverFolder(null); const playId = e.dataTransfer.getData(PLAY_DRAG_MIME) || e.dataTransfer.getData("text/plain") || draggingPlayId; const validPlay = plays.some((play) => play.id === playId); setDraggingPlayId(null); if (!validPlay) return; handleMovePlayToFolder(playId, folderId); };

  const currentFolderId = folderPath[folderPath.length - 1] ?? null;
  const currentFolder = currentFolderId ? folders.find((f) => f.id === currentFolderId) : null;
  const visibleFolders = folders.filter((f) => f.parentId === currentFolderId);
  const visiblePlays = currentFolderId ? plays.filter((p) => p.folderId === currentFolderId) : plays;

  const ContextMenu = ({ id, type }) => {
    if (menuOpen !== id) return null;
    const isFolder = type === "folder";
    const play = !isFolder ? plays.find((p) => p.id === id) : null;
    return (
      <div ref={menuRef} className="absolute right-0 bottom-full z-30 mb-1 w-48 rounded-lg border border-BrandGray2/20 bg-BrandBlack shadow-xl" onClick={(e) => e.stopPropagation()}>
        {!isFolder && (<>
          <button onClick={() => navigate(`/app/plays/${id}`)} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiExternalLink className="text-sm" /> Open</button>
          <button onClick={() => { handleToggleFavorite(id); setMenuOpen(null); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiStar className={`text-sm ${play?.favorited ? "fill-BrandOrange text-BrandOrange" : ""}`} />{play?.favorited ? "Unfavorite" : "Favorite"}</button>
          <button onClick={() => copyLink(id)} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiCopy className="text-sm" /> Share</button>
        </>)}
        <button onClick={() => startRename(id, isFolder ? folders.find((f) => f.id === id)?.name : play?.title)} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiEdit3 className="text-sm" /> Rename</button>
        {!isFolder && folders.length > 0 && (<button onClick={() => { setMoveTarget(id); setMenuOpen(null); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiFolder className="text-sm" /> Move to Folder</button>)}
        {!isFolder && currentFolderId && (<button onClick={() => { removePlayFromFolder(id, currentFolderId); setMenuOpen(null); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"><FiFolder className="text-sm" /> Remove from Folder</button>)}
        <div className="mx-2 my-1 h-px bg-BrandGray2/15" />
        <button onClick={() => (isFolder ? handleDeleteFolder(id) : handleDeletePlay(id))} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs text-red-400 transition hover:bg-red-500/10"><FiTrash2 className="text-sm" /> Delete</button>
      </div>
    );
  };

  if (loadingData) {
    return (<div className="flex items-center justify-center py-32"><FiLoader className="animate-spin text-2xl text-BrandGray2" /></div>);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-Manrope text-xl font-bold tracking-tight">{currentFolder ? currentFolder.name : "Playbook"}</h1>
          <p className="mt-1 text-sm text-BrandGray">{currentFolderId ? `${visiblePlays.length} play${visiblePlays.length !== 1 ? "s" : ""} in folder` : `${plays.length} plays · ${visibleFolders.length} folders`}</p>
          {folderPath.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-BrandGray">
              <button onClick={() => setFolderPath([])} className="transition hover:text-BrandText">All Plays</button>
              {folderPath.map((fId, idx) => { const f = folders.find((folder) => folder.id === fId); const isLast = idx === folderPath.length - 1; return (<div key={fId} className="flex items-center gap-1"><FiChevronRight className="text-[8px]" />{isLast ? <span>{f?.name}</span> : <button onClick={() => setFolderPath(folderPath.slice(0, idx + 1))} className="transition hover:text-BrandText">{f?.name}</button>}</div>); })}
            </div>
          )}
        </div>
        {(isCoach || canCreatePlay) && (
          <div className="flex items-center gap-2">
            {isCoach && folderPath.length < 4 && (<button onClick={() => setNewFolderMode(true)} className="flex items-center gap-2 rounded-lg border border-BrandGray2/30 px-3.5 py-2.5 text-sm text-BrandGray transition hover:border-BrandGray hover:text-BrandText disabled:opacity-50 disabled:cursor-not-allowed" disabled={folderPath.length >= 4}><FiFolder className="text-sm" />New Folder</button>)}
            {canCreatePlay && (<Link to="/app/plays/new" className="flex items-center gap-2 rounded-lg bg-BrandOrange px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"><FiPlus className="text-base" />New Play</Link>)}
          </div>
        )}
      </div>

      {(visibleFolders.length > 0 || newFolderMode) && (
        <div className="mt-6">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-BrandGray2">Folders</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFolders.map((folder) => (
              <div key={folder.id} onClick={() => setFolderPath([...folderPath, folder.id])} onDragOver={(e) => handleDragOver(e, folder.id)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, folder.id)} className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${dragOverFolder === folder.id ? "border-BrandOrange bg-BrandOrange/5 shadow-[0_0_0_2px_rgba(255,122,24,0.2)]" : "border-BrandGray2/20 bg-BrandBlack2/30 hover:border-BrandGray2/40"}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${dragOverFolder === folder.id ? "bg-BrandOrange/20" : "bg-BrandGray2/15"}`}><FiFolder className={`text-lg ${dragOverFolder === folder.id ? "text-BrandOrange" : "text-BrandGray"}`} /></div>
                <div className="min-w-0 flex-1">
                  {renameTarget === folder.id ? (<input ref={renameRef} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={confirmRename} onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenameTarget(null); }} onClick={(e) => e.stopPropagation()} className="w-full rounded bg-transparent text-sm font-semibold outline-none ring-1 ring-BrandOrange px-1" />) : (<p className="truncate text-sm font-semibold">{folder.name}</p>)}
                  <p className="text-[11px] text-BrandGray2">{folder.playIds.length} plays</p>
                </div>
                {isCoach && (<div className="relative"><button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === folder.id ? null : folder.id); }} className="rounded-md p-1.5 text-BrandGray2 opacity-100 md:opacity-0 transition hover:bg-BrandBlack2 hover:text-BrandText group-hover:opacity-100"><FiMoreHorizontal className="text-sm" /></button><ContextMenu id={folder.id} type="folder" /></div>)}
              </div>
            ))}
            {newFolderMode && (<div className="flex items-center gap-3 rounded-xl border border-BrandOrange/40 bg-BrandOrange/5 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-BrandOrange/20"><FiFolder className="text-lg text-BrandOrange" /></div><input ref={newFolderRef} value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onBlur={handleCreateFolder} onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setNewFolderMode(false); }} placeholder="Folder name..." className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-BrandGray2" /></div>)}
          </div>
        </div>
      )}

      <div className="mt-6">
        {!currentFolderId && <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-BrandGray2">Plays</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePlays.map((play) => (
            <div key={play.id} draggable={isCoach} onDragStart={(e) => handleDragStart(e, play.id)} onDragEnd={handleDragEnd} className="group relative flex cursor-grab flex-col rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 p-5 transition hover:border-BrandOrange/30 hover:bg-BrandBlack2/60 active:cursor-grabbing">
              <div className="flex flex-1 cursor-pointer flex-col" onClick={() => navigate(playerViewMode ? `/app/plays/${play.id}/view` : `/app/plays/${play.id}`)}>
                <PlayPreviewCard playData={play.playData} autoplay="hover" shape="landscape" cameraMode="fit-distribution" background="field" paddingPx={20} minSpanPx={100} showHoverHint={false} className="mb-4" />
                <div className="flex items-center gap-1.5">
                  {play.favorited && <FiStar className="shrink-0 fill-BrandOrange text-sm text-BrandOrange" />}
                  {renameTarget === play.id ? (<input ref={renameRef} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={confirmRename} onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenameTarget(null); }} onClick={(e) => e.stopPropagation()} className="min-w-0 flex-1 rounded bg-transparent font-Manrope text-sm font-semibold outline-none ring-1 ring-BrandOrange px-1" />) : (<h3 className="min-w-0 flex-1 font-Manrope text-sm font-semibold truncate">{play.title}</h3>)}
                  {isCoach && (<div className="relative shrink-0"><button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === play.id ? null : play.id); }} className="rounded-md p-1 text-BrandGray2 opacity-100 md:opacity-0 transition hover:bg-BrandBlack2 hover:text-BrandText group-hover:opacity-100"><FiMoreHorizontal className="text-sm" /></button><ContextMenu id={play.id} type="play" /></div>)}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">{(play.tags || []).map((tag) => (<span key={tag} className="inline-flex items-center gap-1 rounded-md bg-BrandGray2/20 px-2 py-0.5 text-[10px] text-BrandGray"><FiTag className="text-[8px]" />{tag}</span>))}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] text-BrandGray2"><FiClock className="text-[10px]" />{formatRelativeTime(play.updatedAt || play.createdAt)}</span>
                  {canEditPlay && (<button onClick={(e) => { e.stopPropagation(); navigate(`/app/plays/${play.id}/edit`); }} className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-BrandGray transition hover:bg-BrandGray2/20 hover:text-BrandOrange"><FiEdit2 className="text-[10px]" />Edit</button>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {visiblePlays.length === 0 && !loadingData && (
        <div className="mt-20 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-BrandGray2/10"><FiPlay className="text-2xl text-BrandGray2" /></div>
          <p className="mt-4 text-sm font-semibold">{currentFolderId ? "No plays in this folder" : "No plays yet"}</p>
          <p className="mt-1 text-xs text-BrandGray2">{currentFolderId ? "Drag plays here or use the menu to move them." : canCreatePlay ? "Create your first play to get started." : "Your coach hasn't added any plays yet."}</p>
        </div>
      )}

      {moveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 font-DmSans" onClick={() => setMoveTarget(null)}>
          <div className="w-full max-w-sm rounded-xl border border-BrandGray2/20 bg-BrandBlack p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-Manrope text-base font-bold">Move to folder</h2>
            <p className="mt-1 text-sm text-BrandGray2">Select a folder for &ldquo;{plays.find((p) => p.id === moveTarget)?.title}&rdquo;</p>
            <div className="mt-4 flex flex-col gap-1">
              {folders.map((folder) => { const alreadyIn = folder.playIds.includes(moveTarget); return (<button key={folder.id} disabled={alreadyIn} onClick={() => handleMovePlayToFolder(moveTarget, folder.id)} className={`flex items-center gap-3 rounded-lg px-3.5 py-3 text-left text-sm transition ${alreadyIn ? "cursor-not-allowed text-BrandGray2/50" : "text-BrandGray hover:bg-BrandBlack2 hover:text-BrandText"}`}><FiFolder className="text-base" />{folder.name}{alreadyIn && <span className="ml-auto text-[10px] text-BrandGray2">Already in folder</span>}</button>); })}
            </div>
          </div>
        </div>
      )}

      {toast && (<div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-[fadeInUp_0.25s_ease-out]"><div className="flex items-center gap-2 rounded-lg border border-BrandGray2/20 bg-BrandBlack px-4 py-3 shadow-xl"><div className="h-1 w-1 rounded-full bg-BrandOrange" /><p className="text-sm text-BrandText">{toast}</p></div></div>)}
    </div>
  );
}
