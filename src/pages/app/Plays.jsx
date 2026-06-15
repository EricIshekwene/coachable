import { Breadcrumbs, Button, Card, Chip, EmptyState, Input, Modal, Section, Spinner, Textarea, Toast, SearchInput, BulkBar, RecentlyEditedChip } from "../../design-system/components";
import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiPlus, FiPlay, FiTag, FiFolder,
  FiSearch, FiRotateCcw, FiX, FiCheckSquare,
  FiTrash2, FiSend,
} from "react-icons/fi";
import { fetchPlays, deletePlay as apiDeletePlay, updatePlay, toggleFavorite as apiToggleFavorite, movePlayToFolder as apiMovePlayToFolder, sharePlay, fetchTrashedPlays, restorePlay as apiRestorePlay, permanentDeletePlay as apiPermanentDelete, duplicatePlay as apiDuplicatePlay, bulkDeletePlays, bulkMovePlays, bulkTagPlays, postToCommunity as apiPostToCommunity } from "../../utils/apiPlays";
import { fetchFolders, createFolder as apiCreateFolder, updateFolder, deleteFolder as apiFolderDelete, shareFolder } from "../../utils/apiFolders";
import { AppPage, AppHeader } from "../../components/layout";
import PlayCard from "../../components/PlayCard";
import FolderCard from "../../components/FolderCard";

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
  const canRolePostToCommunity = (user?.role === "owner" || user?.role === "coach" || user?.role === "assistant_coach") && !playerViewMode;
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
  const [moveTarget, setMoveTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [draggingPlayId, setDraggingPlayId] = useState(null);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [search, setSearch] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [trashedPlays, setTrashedPlays] = useState([]);
  const [activeTag, setActiveTag] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [copyFallbackUrl, setCopyFallbackUrl] = useState(null);
  const [playSort, setPlaySort] = useState("updated");
  const [postTarget, setPostTarget] = useState(null);
  const [postTitle, setPostTitle] = useState("");
  const [postBio, setPostBio] = useState("");
  const [postLoading, setPostLoading] = useState(false);

  const newFolderRef = useRef(null);
  /** Tracks in-flight folder creation: { tempId, promise: Promise<realId|null> } */
  const pendingFolderRef = useRef(null);

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
      .catch(() => { setPlays([]); setFolders([]); })
      .finally(() => setLoadingData(false));
  }, [teamId]);

  useEffect(() => { if (newFolderMode) newFolderRef.current?.focus(); }, [newFolderMode]);

  const showToast = (msg) => setToast(msg);

  const handleToggleFavorite = (playId) => {
    const play = plays.find((p) => p.id === playId);
    if (!play) return;
    const next = !play.favorited;
    setPlays((prev) => prev.map((p) => (p.id === playId ? { ...p, favorited: next } : p)));
    if (teamId) apiToggleFavorite(teamId, playId, next).catch(() => {});
  };

  const handleToggleHidden = (playId) => {
    const play = plays.find((p) => p.id === playId);
    if (!play) return;
    const next = !play.hiddenFromPlayers;
    setPlays((prev) => prev.map((p) => (p.id === playId ? { ...p, hiddenFromPlayers: next } : p)));
    showToast(next ? "Hidden from players" : "Visible to players");
    if (teamId) updatePlay(teamId, playId, { hiddenFromPlayers: next }).catch(() => {});
  };

  const handleDeletePlay = (playId) => {
    const play = plays.find((p) => p.id === playId);
    setPlays((prev) => prev.filter((p) => p.id !== playId));
    setFolders((prev) => prev.map((f) => ({ ...f, playIds: f.playIds.filter((id) => id !== playId) })));
    if (play) setTrashedPlays((prev) => [{ ...play, archivedAt: new Date().toISOString() }, ...prev]);
    showToast("Moved to trash");
    if (teamId) apiDeletePlay(teamId, playId).catch(() => {});
  };

  const handleRestorePlay = (playId) => {
    const play = trashedPlays.find((p) => p.id === playId);
    setTrashedPlays((prev) => prev.filter((p) => p.id !== playId));
    if (play) setPlays((prev) => [{ ...play, archivedAt: undefined }, ...prev]);
    showToast("Play restored");
    if (teamId) apiRestorePlay(teamId, playId).catch(() => {});
  };

  const handlePermanentDelete = (playId) => {
    setTrashedPlays((prev) => prev.filter((p) => p.id !== playId));
    showToast("Play permanently deleted");
    if (teamId) apiPermanentDelete(teamId, playId).catch(() => {});
  };

  const loadTrash = () => {
    if (!teamId) return;
    fetchTrashedPlays(teamId).then(setTrashedPlays).catch(() => setTrashedPlays([]));
  };

  const handleDeleteFolder = (folderId) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    const currentFolderId = folderPath[folderPath.length - 1] ?? null;
    if (currentFolderId === folderId) setFolderPath(folderPath.slice(0, -1));
    showToast("Folder deleted");
    if (teamId) apiFolderDelete(teamId, folderId).catch(() => {});
  };

  const handleMovePlayToFolder = useCallback(async (playId, folderId) => {
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
    if (!teamId) return;
    let realFolderId = folderId;
    if (folderId?.startsWith("f-") && pendingFolderRef.current?.tempId === folderId) {
      realFolderId = await pendingFolderRef.current.promise;
    }
    if (realFolderId && !realFolderId.startsWith("f-")) {
      apiMovePlayToFolder(teamId, playId, realFolderId).catch(() => {});
    }
  }, [plays, folders, teamId]);

  const removePlayFromFolder = (playId, folderId) => {
    setPlays((prev) => prev.map((p) => (p.id === playId ? { ...p, folderId: null } : p)));
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, playIds: f.playIds.filter((id) => id !== playId) } : f)));
    showToast("Removed from folder");
    if (teamId) apiMovePlayToFolder(teamId, playId, null).catch(() => {});
  };

  const copyOrShareUrl = async (url, title) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      try { await navigator.share({ title, url }); showToast("Shared"); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(url); showToast("Share link copied"); }
    catch { setCopyFallbackUrl(url); }
  };

  const copyLink = async (playId) => {
    try {
      const { token } = await sharePlay(teamId, playId);
      await copyOrShareUrl(`${window.location.origin}/shared/${token}`, "Shared Play");
    } catch { showToast("Failed to create share link"); }
  };

  const copyFolderLink = async (folderId) => {
    try {
      const { token } = await shareFolder(teamId, folderId);
      await copyOrShareUrl(`${window.location.origin}/shared/folder/${token}`, "Shared Folder");
    } catch { showToast("Failed to create share link"); }
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
      const promise = apiCreateFolder(teamId, { name: newFolder.name, parentId: currentFolderId })
        .then((created) => { setFolders((prev) => prev.map((f) => (f.id === tempId ? { ...f, id: created.id } : f))); return created.id; })
        .catch(() => null);
      pendingFolderRef.current = { tempId, promise };
    }
  };

  const handleDuplicatePlay = async (playId) => {
    if (!teamId) return;
    try {
      const newPlay = await apiDuplicatePlay(teamId, playId);
      setPlays((prev) => {
        const idx = prev.findIndex((p) => p.id === playId);
        const next = [...prev];
        next.splice(idx < 0 ? 0 : idx + 1, 0, newPlay);
        return next;
      });
      showToast(`Duplicated as "${newPlay.title}"`);
    } catch { showToast("Failed to duplicate play"); }
  };

  /**
   * Opens the Post to Community modal, pre-filling the play's current title.
   * @param {string} playId
   */
  const openPostModal = (playId) => {
    const play = plays.find((p) => p.id === playId);
    setPostTarget(playId);
    setPostTitle(play?.title ?? "");
    setPostBio("");
  };

  /** Submits the play to the sport-specific community playbook section. */
  const handlePostToCommunity = async () => {
    if (!postTarget || !postTitle.trim()) return;
    setPostLoading(true);
    try {
      await apiPostToCommunity(teamId, postTarget, { title: postTitle.trim(), description: postBio.trim() });
      showToast("Play posted to community!");
      setPostTarget(null);
    } catch (err) {
      showToast(err?.message || "Failed to post play");
    } finally { setPostLoading(false); }
  };

  const exitBulkMode = () => { setBulkMode(false); setBulkSelected(new Set()); };

  const toggleBulkSelect = (playId) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(playId)) next.delete(playId); else next.add(playId);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = [...bulkSelected];
    const deleted = plays.filter((p) => bulkSelected.has(p.id));
    setPlays((prev) => prev.filter((p) => !bulkSelected.has(p.id)));
    setFolders((prev) => prev.map((f) => ({ ...f, playIds: f.playIds.filter((id) => !bulkSelected.has(id)) })));
    setTrashedPlays((prev) => [...deleted.map((p) => ({ ...p, archivedAt: new Date().toISOString() })), ...prev]);
    showToast(`Moved ${ids.length} play${ids.length !== 1 ? "s" : ""} to trash`);
    exitBulkMode();
    if (teamId) bulkDeletePlays(teamId, ids).catch(() => {});
  };

  const handleBulkMove = async (folderId) => {
    const ids = [...bulkSelected];
    setPlays((prev) => prev.map((p) => bulkSelected.has(p.id) ? { ...p, folderId } : p));
    setFolders((prev) => prev.map((f) => {
      const withoutSelected = f.playIds.filter((id) => !bulkSelected.has(id));
      if (f.id === folderId) return { ...f, playIds: [...withoutSelected, ...ids] };
      return { ...f, playIds: withoutSelected };
    }));
    const folder = folders.find((f) => f.id === folderId);
    showToast(`Moved ${ids.length} play${ids.length !== 1 ? "s" : ""} to ${folder?.name}`);
    setBulkMoveOpen(false);
    exitBulkMode();
    if (!teamId) return;
    let realFolderId = folderId;
    if (folderId?.startsWith("f-") && pendingFolderRef.current?.tempId === folderId) {
      realFolderId = await pendingFolderRef.current.promise;
    }
    if (realFolderId && !realFolderId.startsWith("f-")) {
      bulkMovePlays(teamId, ids, realFolderId).catch(() => {});
    }
  };

  const handleBulkTag = async () => {
    const tag = bulkTagInput.trim();
    if (!tag) return;
    const ids = [...bulkSelected];
    setPlays((prev) => prev.map((p) => bulkSelected.has(p.id) ? { ...p, tags: [...new Set([...(p.tags || []), tag])] } : p));
    showToast(`Tagged ${ids.length} play${ids.length !== 1 ? "s" : ""} with "${tag}"`);
    setBulkTagOpen(false);
    setBulkTagInput("");
    exitBulkMode();
    if (teamId) bulkTagPlays(teamId, ids, [tag]).catch(() => {});
  };

  const PLAY_DRAG_MIME = "application/x-coachable-play-id";
  const handleDragStart = (e, playId) => { setDraggingPlayId(playId); e.dataTransfer.setData(PLAY_DRAG_MIME, playId); e.dataTransfer.setData("text/plain", playId); e.dataTransfer.effectAllowed = "move"; };
  const handleDragEnd = () => { setDraggingPlayId(null); setDragOverFolder(null); };
  const handleDragOver = (e, folderId) => { if (!draggingPlayId) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverFolder(folderId); };
  const handleDragLeave = () => setDragOverFolder(null);
  const handleDrop = (e, folderId) => { e.preventDefault(); setDragOverFolder(null); const playId = e.dataTransfer.getData(PLAY_DRAG_MIME) || e.dataTransfer.getData("text/plain") || draggingPlayId; const validPlay = plays.some((play) => play.id === playId); setDraggingPlayId(null); if (!validPlay) return; handleMovePlayToFolder(playId, folderId); };

  const currentFolderId = folderPath[folderPath.length - 1] ?? null;
  const currentFolder = currentFolderId ? folders.find((f) => f.id === currentFolderId) : null;

  const searchLower = search.trim().toLowerCase();
  const isSearching = searchLower.length > 0;

  const visibleFolders = isSearching
    ? folders.filter((f) => f.name.toLowerCase().includes(searchLower))
    : folders.filter((f) => f.parentId === currentFolderId);

  const allTags = [...new Set(plays.flatMap((p) => p.tags || []))].sort();

  const playerVisible = (p) => !playerViewMode || !p.hiddenFromPlayers;

  const baseVisiblePlays = isSearching
    ? plays.filter((p) =>
        playerVisible(p) && (
        p.title.toLowerCase().includes(searchLower) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(searchLower)) ||
        (p.notes || "").toLowerCase().includes(searchLower))
      )
    : currentFolderId
      ? plays.filter((p) => playerVisible(p) && p.folderId === currentFolderId)
      : plays.filter(playerVisible);

  const visiblePlays = activeTag
    ? baseVisiblePlays.filter((p) => (p.tags || []).includes(activeTag))
    : baseVisiblePlays;

  const sortedVisiblePlays = [...visiblePlays].sort((a, b) => {
    if (playSort === "az") return (a.title || "").localeCompare(b.title || "");
    if (playSort === "za") return (b.title || "").localeCompare(a.title || "");
    if (playSort === "created") return new Date(b.createdAt) - new Date(a.createdAt);
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });

  const recentlyEdited = (!currentFolderId && !isSearching)
    ? [...plays].filter(playerVisible).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 5)
    : [];

  if (loadingData) {
    return (<div className="flex items-center justify-center py-32"><Spinner size="lg" label="Loading plays" /></div>);
  }

  if (showTrash) {
    return (
      <AppPage maxWidth="4xl">
        <AppHeader
          title="Trash"
          subtitle={`${trashedPlays.length} deleted play${trashedPlays.length !== 1 ? "s" : ""} · auto-deleted after 30 days`}
          actions={
            <Button variant="outline" onClick={() => setShowTrash(false)} className="flex items-center gap-2 rounded-lg border border-[color:var(--ui-border)] px-3.5 py-2.5 text-sm text-[color:var(--ui-text-muted)] transition hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text)]">Back to Playbook</Button>
          }
        />
        {trashedPlays.length === 0 ? (
          <EmptyState icon={<FiTrash2 />} title="Trash is empty" description="Deleted plays will appear here for 30 days." />
        ) : (
          <div className="mt-6 flex flex-col gap-2">
            {trashedPlays.map((play) => (
              <Card key={play.id} padding="md" className="flex items-center gap-4" style={{ backgroundColor: "var(--ui-surface-2)" }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{play.title}</p>
                  <p className="mt-0.5 text-[11px]" style={{ color: "var(--ui-text-subtle)" }}>Deleted {formatRelativeTime(play.archivedAt)}</p>
                </div>
                <Button variant="outline" onClick={() => handleRestorePlay(play.id)} className="flex items-center gap-1.5 rounded-lg border border-[color:var(--ui-border)] px-3 py-2 text-xs text-[color:var(--ui-text-muted)] transition hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text)]"><FiRotateCcw className="text-xs" />Restore</Button>
                <Button variant="danger" onClick={() => handlePermanentDelete(play.id)} className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/10"><FiTrash2 className="text-xs" />Delete Forever</Button>
              </Card>
            ))}
          </div>
        )}
        <Toast open={!!toast} title={toast ?? ""} onClose={() => setToast(null)} duration={2500} position="bottom-center" />
      </AppPage>
    );
  }

  return (
    <AppPage maxWidth="4xl">
      <AppHeader
        title={currentFolder ? currentFolder.name : "Playbook"}
        subtitle={currentFolderId ? `${visiblePlays.length} play${visiblePlays.length !== 1 ? "s" : ""} in folder` : `${plays.length} plays · ${visibleFolders.length} folders`}
        actions={
          <>
            {isCoach && !bulkMode && (<Button variant="outline" onClick={() => setBulkMode(true)} className="flex items-center gap-2 rounded-lg border border-[color:var(--ui-border)] px-3 py-2.5 text-sm text-[color:var(--ui-text-muted)] transition hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text)]"><FiCheckSquare className="text-sm" /></Button>)}
            {bulkMode && (<Button variant="primary" onClick={exitBulkMode} className="flex items-center gap-2 rounded-lg border border-BrandOrange/50 bg-BrandOrange/10 px-3.5 py-2.5 text-sm text-BrandOrange transition hover:bg-BrandOrange/20"><FiX className="text-sm" />Cancel</Button>)}
            {isCoach && (<Button variant="outline" onClick={() => { setShowTrash(true); loadTrash(); }} className="flex items-center gap-2 rounded-lg border border-[color:var(--ui-border)] px-3 py-2.5 text-sm text-[color:var(--ui-text-muted)] transition hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text)]"><FiTrash2 className="text-sm" /></Button>)}
            {isCoach && folderPath.length < 4 && (<Button variant="outline" onClick={() => setNewFolderMode(true)} className="flex items-center gap-2 rounded-lg border border-[color:var(--ui-border)] px-3.5 py-2.5 text-sm text-[color:var(--ui-text-muted)] transition hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text)] disabled:opacity-50 disabled:cursor-not-allowed" disabled={folderPath.length >= 4}><FiFolder className="text-sm" />New Folder</Button>)}
            {canCreatePlay && (
              <Button as={Link} to="/app/plays/new" variant="primary" startIcon={<FiPlus className="text-base" />}>
                New Play
              </Button>
            )}
          </>
        }
      >
        {folderPath.length > 0 && (
          <Breadcrumbs
            className="mt-2"
            items={[
              { label: "All Plays", onClick: () => setFolderPath([]) },
              ...folderPath.map((fId, idx) => ({
                label: folders.find((folder) => folder.id === fId)?.name || "Folder",
                onClick: idx < folderPath.length - 1
                  ? () => setFolderPath(folderPath.slice(0, idx + 1))
                  : undefined,
              })),
            ]}
          />
        )}
      </AppHeader>

      {/* Search bar */}
      <SearchInput
        className="mt-5 w-full"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={search ? () => setSearch("") : undefined}
        placeholder="Search plays by name, tags, or notes..."
      />

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <Chip
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              selected={activeTag === tag}
              leadingIcon={<FiTag className="text-[9px]" />}
            >
              {tag}
            </Chip>
          ))}
          {activeTag && (
            <Button variant="ghost" onClick={() => setActiveTag(null)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[color:var(--ui-text-subtle)] transition hover:text-[color:var(--ui-text)]">
              <FiX className="text-[9px]" />
              Clear filter
            </Button>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {bulkMode && bulkSelected.size > 0 && (
        <BulkBar
          className="mt-3"
          count={bulkSelected.size}
          actions={
            <>
              {folders.length > 0 && (
                <Button variant="outline" onClick={() => setBulkMoveOpen(true)} className="flex items-center gap-1.5 rounded-md border border-[color:var(--ui-border)] px-3 py-1.5 text-xs text-[color:var(--ui-text-muted)] transition hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text)]">
                  <FiFolder className="text-xs" />Move
                </Button>
              )}
              <Button variant="outline" onClick={() => setBulkTagOpen(true)} className="flex items-center gap-1.5 rounded-md border border-[color:var(--ui-border)] px-3 py-1.5 text-xs text-[color:var(--ui-text-muted)] transition hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text)]">
                <FiTag className="text-xs" />Tag
              </Button>
              <Button variant="danger" onClick={handleBulkDelete} className="flex items-center gap-1.5 rounded-md border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10">
                <FiTrash2 className="text-xs" />Delete
              </Button>
            </>
          }
        />
      )}

      {/* Recently edited */}
      {recentlyEdited.length > 0 && (
        <Section title="Recently Edited" variant="compact" className="mt-6">
          <div className="hide-scroll flex gap-2 overflow-x-auto pb-1">
            {recentlyEdited.map((play) => (
              <RecentlyEditedChip
                key={play.id}
                title={play.title}
                time={formatRelativeTime(play.updatedAt || play.createdAt)}
                onClick={() => navigate(playerViewMode ? `/app/plays/${play.id}/view` : `/app/plays/${play.id}`)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Folders grid */}
      {(visibleFolders.length > 0 || newFolderMode) && (
        <Section title="Folders" variant="compact" className="mt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFolders.map((folder) => {
              const subFolderCount = folders.filter((f) => f.parentId === folder.id).length;
              return (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  subFolderCount={subFolderCount}
                  isCoach={isCoach}
                  isDragOver={dragOverFolder === folder.id}
                  onOpen={() => setFolderPath([...folderPath, folder.id])}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  onRename={(id, name) => {
                    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
                    if (teamId) updateFolder(teamId, id, { name }).catch(() => {});
                  }}
                  onShare={copyFolderLink}
                  onDelete={handleDeleteFolder}
                />
              );
            })}
            {newFolderMode && (
              <Card padding="none" selected className="overflow-hidden bg-[linear-gradient(180deg,rgba(255,122,24,0.09),rgba(255,122,24,0.03))]">
                <div className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-BrandOrange/35 bg-BrandOrange/16">
                    <FiFolder className="text-lg text-BrandOrange" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-BrandOrange/80">New Folder</p>
                    <Input
                      ref={newFolderRef}
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onBlur={handleCreateFolder}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setNewFolderMode(false); }}
                      placeholder="Folder name..."
                      maxLength={80}
                      className="w-full bg-transparent text-sm font-semibold text-[color:var(--ui-text)] outline-none placeholder:text-[color:var(--ui-text-subtle)]"
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>
        </Section>
      )}

      {/* Plays grid */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          {!currentFolderId && <Section title="Plays" variant="compact" />}
          <select
            value={playSort}
            onChange={(e) => setPlaySort(e.target.value)}
            className="ml-auto cursor-pointer appearance-none rounded-md border border-[color:var(--ui-border)] px-2.5 py-1 text-[11px] outline-none focus:border-BrandOrange"
            style={{ backgroundColor: "var(--ui-surface-2)", color: "var(--ui-text-muted)" }}
          >
            <option value="updated">Recently Updated</option>
            <option value="created">Recently Created</option>
            <option value="az">Name A→Z</option>
            <option value="za">Name Z→A</option>
          </select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedVisiblePlays.map((play) => (
            <PlayCard
              key={play.id}
              play={play}
              isCoach={isCoach}
              bulkMode={bulkMode}
              selected={bulkSelected.has(play.id)}
              inFolder={!!currentFolderId}
              hasFolders={folders.length > 0}
              canEdit={canEditPlay}
              canPostToCommunity={canRolePostToCommunity && play.createdByUserId === user?.id}
              onToggleSelect={toggleBulkSelect}
              onDragStart={(e) => handleDragStart(e, play.id)}
              onDragEnd={handleDragEnd}
              onOpen={(id) => navigate(playerViewMode ? `/app/plays/${id}/view` : `/app/plays/${id}`)}
              onEdit={(id) => navigate(`/app/plays/${id}/edit`)}
              onToggleFavorite={handleToggleFavorite}
              onShare={copyLink}
              onDuplicate={handleDuplicatePlay}
              onToggleHidden={handleToggleHidden}
              onPostToCommunity={openPostModal}
              onRename={(id, title) => {
                setPlays((prev) => prev.map((p) => (p.id === id ? { ...p, title } : p)));
                if (teamId) updatePlay(teamId, id, { title }).catch(() => {});
              }}
              onMoveRequest={(id) => setMoveTarget(id)}
              onRemoveFromFolder={(id) => removePlayFromFolder(id, currentFolderId)}
              onDelete={handleDeletePlay}
            />
          ))}
        </div>
      </div>

      {visiblePlays.length === 0 && visibleFolders.length === 0 && !loadingData && (
        <EmptyState
          className="mt-20"
          icon={isSearching ? <FiSearch /> : <FiPlay />}
          title={isSearching ? "No results found" : currentFolderId ? "No plays in this folder" : "No plays yet"}
          description={isSearching ? `No plays match "${search.trim()}"` : currentFolderId ? "Drag plays here or use the menu to move them." : canCreatePlay ? "Create your first play to get started." : "Your coach hasn't added any plays yet."}
        />
      )}

      {/* Move-to-folder modal */}
      <Modal open={!!moveTarget} onClose={() => setMoveTarget(null)} title="Move to folder" size="sm">
        <p className="mb-4 text-sm" style={{ color: "var(--ui-text-muted)" }}>
          Select a folder for &ldquo;{plays.find((p) => p.id === moveTarget)?.title}&rdquo;
        </p>
        <div className="flex flex-col gap-1">
          {folders.map((folder) => {
            const alreadyIn = folder.playIds.includes(moveTarget);
            return (
              <Button variant="ghost" key={folder.id} disabled={alreadyIn} onClick={() => handleMovePlayToFolder(moveTarget, folder.id)}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-3 text-left text-sm transition ${alreadyIn ? "cursor-not-allowed opacity-50" : "text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-surface)] hover:text-[color:var(--ui-text)]"}`}>
                <FiFolder className="text-base" />{folder.name}
                {alreadyIn && <span className="ml-auto text-[10px]" style={{ color: "var(--ui-text-subtle)" }}>Already in folder</span>}
              </Button>
            );
          })}
        </div>
      </Modal>

      {/* Bulk move modal */}
      <Modal open={bulkMoveOpen} onClose={() => setBulkMoveOpen(false)} title={`Move ${bulkSelected.size} play${bulkSelected.size !== 1 ? "s" : ""} to folder`} size="sm">
        <div className="flex flex-col gap-1">
          {folders.map((folder) => (
            <Button variant="ghost" key={folder.id} onClick={() => handleBulkMove(folder.id)}
              className="flex items-center gap-3 rounded-lg px-3.5 py-3 text-left text-sm text-[color:var(--ui-text-muted)] transition hover:bg-[color:var(--ui-surface)] hover:text-[color:var(--ui-text)]">
              <FiFolder className="text-base" />{folder.name}
            </Button>
          ))}
        </div>
      </Modal>

      {/* Bulk tag modal */}
      <Modal open={bulkTagOpen} onClose={() => { setBulkTagOpen(false); setBulkTagInput(""); }}
        title={`Add tag to ${bulkSelected.size} play${bulkSelected.size !== 1 ? "s" : ""}`} size="sm">
        <Input
          autoFocus
          type="text"
          value={bulkTagInput}
          onChange={(e) => setBulkTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleBulkTag(); if (e.key === "Escape") { setBulkTagOpen(false); setBulkTagInput(""); } }}
          placeholder="Tag name..."
          maxLength={40}
          className="mb-3 w-full rounded-lg border border-[color:var(--ui-border)] px-3.5 py-2.5 text-sm outline-none focus:border-BrandOrange"
          style={{ backgroundColor: "var(--ui-surface-2)", color: "var(--ui-text)" }}
        />
        {allTags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {allTags.filter((t) => !bulkTagInput || t.toLowerCase().includes(bulkTagInput.toLowerCase())).slice(0, 12).map((tag) => (
              <Chip key={tag} onClick={() => setBulkTagInput(tag)} leadingIcon={<FiTag className="text-[8px]" />}>{tag}</Chip>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setBulkTagOpen(false); setBulkTagInput(""); }}>Cancel</Button>
          <Button variant="primary" onClick={handleBulkTag} disabled={!bulkTagInput.trim()}>Add Tag</Button>
        </div>
      </Modal>

      {/* Post to Community modal */}
      <Modal open={!!postTarget} onClose={() => !postLoading && setPostTarget(null)} title="Post to Community" size="sm">
        <p className="mb-4 text-sm" style={{ color: "var(--ui-text-muted)" }}>
          This play will be added to the community playbook for your sport.
        </p>
        <div className="flex flex-col gap-3">
          <Input
            label="Title"
            autoFocus
            type="text"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && postTitle.trim()) handlePostToCommunity(); if (e.key === "Escape") setPostTarget(null); }}
            placeholder="Play title..."
            maxLength={200}
          />
          <Textarea
            label="Description"
            hint="Optional"
            value={postBio}
            onChange={(e) => setPostBio(e.target.value)}
            placeholder="Describe this play..."
            rows={3}
            maxLength={2000}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPostTarget(null)} disabled={postLoading}>Cancel</Button>
          <Button variant="primary" onClick={handlePostToCommunity} disabled={!postTitle.trim() || postLoading}
            loading={postLoading} startIcon={!postLoading ? <FiSend className="text-sm" /> : undefined}>
            {postLoading ? "Posting..." : "Post"}
          </Button>
        </div>
      </Modal>

      {/* Copy link fallback modal */}
      <Modal open={!!copyFallbackUrl} onClose={() => setCopyFallbackUrl(null)} title="Copy this link" size="sm">
        <p className="mb-3 text-sm" style={{ color: "var(--ui-text-muted)" }}>Your browser blocked clipboard access. Copy manually:</p>
        <Input
          autoFocus
          readOnly
          value={copyFallbackUrl ?? ""}
          onFocus={(e) => e.target.select()}
          onClick={(e) => e.target.select()}
        />
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={() => setCopyFallbackUrl(null)}>Done</Button>
        </div>
      </Modal>

      <Toast open={!!toast} title={toast ?? ""} onClose={() => setToast(null)} duration={2500} position="bottom-center" />
    </AppPage>
  );
}
