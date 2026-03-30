import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logos/full_Coachable_logo.png";
import {
  FiPlus, FiEdit2, FiTrash2, FiLogOut, FiFolder, FiFolderPlus,
  FiChevronRight, FiLink, FiCheck, FiX, FiEdit3, FiLayout, FiSearch,
} from "react-icons/fi";
import PlayPreviewCard from "../components/PlayPreviewCard";

const SESSION_KEY = "coachable_admin_session";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── API helpers ──────────────────────────────────────────────────────────────

/**
 * Fetch all platform plays via the admin API.
 * @param {string} session - Admin session token
 * @returns {Promise<Object[]>} Array of platform play objects
 */
async function fetchAllPlays(session) {
  const res = await fetch(`${API_URL}/admin/plays`, {
    headers: { "x-admin-session": session },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  const data = await res.json();
  return data.plays || [];
}

/**
 * Fetch all platform play folders.
 * @param {string} session - Admin session token
 * @returns {Promise<Object[]>} Array of folder objects
 */
async function fetchAllFolders(session) {
  const res = await fetch(`${API_URL}/admin/platform-folders`, {
    headers: { "x-admin-session": session },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  const data = await res.json();
  return data.folders || [];
}

/**
 * Delete a platform play via the admin API.
 * @param {string} session - Admin session token
 * @param {string} id - Platform play ID
 */
async function deletePlay(session, id) {
  const res = await fetch(`${API_URL}/admin/plays/${id}`, {
    method: "DELETE",
    headers: { "x-admin-session": session },
  });
  if (!res.ok) throw new Error("Failed to delete play");
}

/**
 * Move a play to a folder (or null to un-folder).
 * @param {string} session - Admin session token
 * @param {string} playId - Platform play ID
 * @param {string|null} folderId - Destination folder ID, or null
 * @returns {Promise<Object>} Updated play object
 */
async function movePlay(session, playId, folderId) {
  const res = await fetch(`${API_URL}/admin/plays/${playId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify({ folderId: folderId || null }),
  });
  if (!res.ok) throw new Error("Failed to move play");
  return (await res.json()).play;
}

/**
 * Create a platform play folder.
 * @param {string} session - Admin session token
 * @param {string} name - Folder name
 * @param {string|null} parentId - Parent folder ID, or null for root
 * @returns {Promise<Object>} Created folder object
 */
async function createFolderApi(session, name, parentId) {
  const res = await fetch(`${API_URL}/admin/platform-folders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify({ name, parentId: parentId || null }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create folder");
  }
  return (await res.json()).folder;
}

/**
 * Rename a platform play folder.
 * @param {string} session - Admin session token
 * @param {string} id - Folder ID
 * @param {string} name - New name
 * @returns {Promise<Object>} Updated folder object
 */
async function renameFolderApi(session, id, name) {
  const res = await fetch(`${API_URL}/admin/platform-folders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to rename folder");
  }
  return (await res.json()).folder;
}

/**
 * Delete a platform play folder (plays inside become un-foldered).
 * @param {string} session - Admin session token
 * @param {string} id - Folder ID
 */
async function deleteFolderApi(session, id) {
  const res = await fetch(`${API_URL}/admin/platform-folders/${id}`, {
    method: "DELETE",
    headers: { "x-admin-session": session },
  });
  if (!res.ok) throw new Error("Failed to delete folder");
}

/**
 * Fetch all page sections with their assigned play info.
 * @param {string} session - Admin session token
 * @returns {Promise<Object[]>} Array of section objects
 */
async function fetchPageSections(session) {
  const res = await fetch(`${API_URL}/admin/page-sections`, {
    headers: { "x-admin-session": session },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  return (await res.json()).sections || [];
}

/**
 * Assign (or unassign) a play to a page section.
 * @param {string} session - Admin session token
 * @param {string} key - Section key (e.g. "landing.visualize")
 * @param {string|null} playId - Play ID to assign, or null to unassign
 */
async function assignSectionPlay(session, key, playId) {
  const res = await fetch(`${API_URL}/admin/page-sections/${encodeURIComponent(key)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify({ playId: playId || null }),
  });
  if (!res.ok) throw new Error("Failed to update section");
  return (await res.json()).section;
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

/**
 * A single folder row in the sidebar with inline rename and delete actions.
 * @param {Object} props
 * @param {Object} props.folder - Folder data object
 * @param {boolean} props.isActive - Whether this folder is currently selected
 * @param {Function} props.onClick - Called when folder is clicked
 * @param {Function} props.onRename - Called with (id, newName) to rename
 * @param {Function} props.onDelete - Called with (folder) to delete
 */
function FolderItem({ folder, isActive, onClick, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(folder.name);
  const inputRef = useRef(null);

  const startEdit = (e) => {
    e.stopPropagation();
    setEditValue(folder.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    if (editValue.trim() && editValue.trim() !== folder.name) {
      onRename(folder.id, editValue.trim());
    }
    setEditing(false);
  };

  return (
    <div
      onClick={editing ? undefined : onClick}
      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition ${
        isActive
          ? "bg-BrandOrange/15 text-BrandOrange"
          : "text-BrandGray hover:bg-white/5 hover:text-white"
      }`}
    >
      <FiFolder className="shrink-0 text-xs" />
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 rounded border border-BrandOrange/40 bg-[#13151a] px-1 py-0 text-xs text-white outline-none"
        />
      ) : (
        <span className="flex-1 truncate text-xs">{folder.name}</span>
      )}
      {!editing && (
        <div className="hidden items-center gap-1 group-hover:flex">
          <button
            onClick={startEdit}
            title="Rename"
            className="rounded p-0.5 text-BrandGray2 hover:text-white"
          >
            <FiEdit3 className="text-[10px]" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(folder); }}
            title="Delete folder"
            className="rounded p-0.5 text-BrandGray2 hover:text-red-400"
          >
            <FiTrash2 className="text-[10px]" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A single platform play card with edit, copy link, move, and delete actions.
 * @param {Object} props
 * @param {Object} props.play - Platform play object
 * @param {Object[]} props.folders - All folders for the move dropdown
 * @param {Function} props.onEdit - Called with play to navigate to editor
 * @param {Function} props.onDelete - Called with play to delete
 * @param {Function} props.onMove - Called with (play, folderId) to move to folder
 */
function PlayCard({ play, folders, onEdit, onDelete, onMove }) {
  const [copied, setCopied] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const moveRef = useRef(null);

  useEffect(() => {
    if (!moveOpen) return;
    const handler = (e) => {
      if (moveRef.current && !moveRef.current.contains(e.target)) setMoveOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moveOpen]);

  /**
   * Copy the public shareable link for this platform play to clipboard.
   * The link points to /platform-play/:id which is publicly accessible.
   */
  const handleCopyLink = () => {
    const url = `${window.location.origin}/platform-play/${play.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-white/8 bg-[#1e2228] transition hover:border-white/16">
      {/* Preview */}
      <div className="relative">
        <PlayPreviewCard
          playData={play.playData}
          autoplay="hover"
          shape="landscape"
          cameraMode="fit-distribution"
          background="field"
          paddingPx={20}
          minSpanPx={100}
          showHoverHint={false}
        />
        {play.sport && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
            {play.sport}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-Manrope text-sm font-bold text-white">{play.title}</h3>
        {play.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-BrandGray">
            {play.description}
          </p>
        )}
        {play.tags?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {play.tags.map((tag) => (
              <span key={tag} className="rounded bg-white/6 px-1.5 py-0.5 text-[10px] text-BrandGray2">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          {/* Edit */}
          <button
            onClick={() => onEdit(play)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/4 py-2 text-xs font-semibold text-white transition hover:bg-white/8"
          >
            <FiEdit2 className="text-xs" /> Edit
          </button>

          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            title={copied ? "Copied!" : "Copy shareable link"}
            className={`flex items-center justify-center rounded-lg border px-2.5 py-2 text-xs transition ${
              copied
                ? "border-green-500/40 bg-green-500/15 text-green-400"
                : "border-white/10 bg-white/4 text-BrandGray2 hover:text-white"
            }`}
          >
            {copied ? <FiCheck className="text-sm" /> : <FiLink className="text-sm" />}
          </button>

          {/* Move to folder */}
          <div className="relative" ref={moveRef}>
            <button
              onClick={() => setMoveOpen((v) => !v)}
              title="Move to folder"
              className={`flex items-center justify-center rounded-lg border px-2.5 py-2 text-xs transition ${
                play.folderId
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                  : "border-white/10 bg-white/4 text-BrandGray2 hover:text-white"
              }`}
            >
              <FiFolder className="text-sm" />
            </button>
            {moveOpen && (
              <div className="absolute bottom-full right-0 z-30 mb-1 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1a1d24] py-1 shadow-xl">
                <button
                  onClick={() => { onMove(play, null); setMoveOpen(false); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-white/6 ${
                    !play.folderId ? "text-BrandOrange" : "text-BrandGray"
                  }`}
                >
                  <FiX className="text-[10px]" /> No folder
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { onMove(play, f.id); setMoveOpen(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-white/6 ${
                      play.folderId === f.id ? "text-BrandOrange" : "text-BrandGray"
                    }`}
                  >
                    <FiFolder className="text-[10px]" /> {f.name}
                  </button>
                ))}
                {folders.length === 0 && (
                  <p className="px-3 py-2 text-xs text-BrandGray2">No folders yet</p>
                )}
              </div>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={() => onDelete(play)}
            title="Delete play"
            className="flex items-center justify-center rounded-lg border border-white/10 bg-white/4 px-2.5 py-2 text-xs text-red-400 transition hover:border-red-500/30 hover:bg-red-500/10"
          >
            <FiTrash2 className="text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * A single page section row showing the assigned play and a picker to change it.
 * @param {Object} props
 * @param {Object} props.section - Section data (sectionKey, label, page, playId, playTitle, playThumbnail)
 * @param {Object[]} props.plays - All platform plays for the picker
 * @param {Function} props.onAssign - Called with (sectionKey, playId | null)
 */
function SectionRow({ section, plays, onAssign }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  const filteredPlays = plays.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.title?.toLowerCase().includes(q) || p.sport?.toLowerCase().includes(q);
  });

  const handlePick = async (playId) => {
    setSaving(true);
    setPickerOpen(false);
    setSearch("");
    await onAssign(section.sectionKey, playId);
    setSaving(false);
  };

  return (
    <div className="flex items-center gap-5 rounded-xl border border-white/8 bg-[#1e2228] p-4">
      {/* Section info */}
      <div className="w-52 shrink-0">
        <p className="text-sm font-semibold text-white">{section.label}</p>
        <p className="mt-0.5 font-mono text-[10px] text-BrandGray2">{section.sectionKey}</p>
        <span className="mt-1.5 inline-block rounded bg-BrandOrange/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-BrandOrange">
          {section.page}
        </span>
      </div>

      {/* Assigned play preview */}
      <div className="flex flex-1 items-center gap-4">
        {section.playId ? (
          <>
            <div className="w-32 shrink-0">
              {section.playThumbnail ? (
                <img
                  src={section.playThumbnail}
                  alt={section.playTitle}
                  className="w-full rounded-lg object-cover aspect-video border border-white/8"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-white/8 bg-[#13151a]">
                  <FiLayout className="text-BrandGray2" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{section.playTitle}</p>
              {section.playSport && (
                <p className="text-xs text-BrandGray2">{section.playSport}</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-BrandGray2 italic">No play assigned</p>
        )}
      </div>

      {/* Picker */}
      <div className="relative shrink-0" ref={pickerRef}>
        <div className="flex items-center gap-2">
          {section.playId && (
            <button
              onClick={() => handlePick(null)}
              disabled={saving}
              title="Remove assignment"
              className="rounded-lg border border-white/10 bg-white/4 px-2.5 py-2 text-xs text-red-400 transition hover:border-red-500/30 hover:bg-red-500/10 disabled:opacity-50"
            >
              <FiX />
            </button>
          )}
          <button
            onClick={() => setPickerOpen((v) => !v)}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/8 disabled:opacity-50"
          >
            {saving ? (
              <span className="inline-block h-3 w-3 rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange animate-spin" />
            ) : (
              <FiEdit2 className="text-xs" />
            )}
            {section.playId ? "Change" : "Assign Play"}
          </button>
        </div>

        {pickerOpen && (
          <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-[#1a1d24] shadow-2xl">
            {/* Search */}
            <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2.5">
              <FiSearch className="shrink-0 text-xs text-BrandGray2" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plays..."
                className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-BrandGray2"
              />
            </div>
            {/* Play list */}
            <div className="max-h-64 overflow-y-auto">
              {filteredPlays.length === 0 && (
                <p className="px-4 py-3 text-xs text-BrandGray2">No plays found</p>
              )}
              {filteredPlays.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePick(p.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs transition hover:bg-white/6 ${
                    section.playId === p.id ? "text-BrandOrange" : "text-white"
                  }`}
                >
                  <div className="w-12 shrink-0">
                    {p.playData ? (
                      <PlayPreviewCard
                        playData={p.playData}
                        autoplay="always"
                        shape="landscape"
                        className="rounded-md!"
                        paddingPx={10}
                        minSpanPx={60}
                      />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center rounded-md border border-white/8 bg-[#13151a]">
                        <FiLayout className="text-[8px] text-BrandGray2" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.title}</p>
                    {p.sport && <p className="text-BrandGray2">{p.sport}</p>}
                  </div>
                  {section.playId === p.id && <FiCheck className="ml-auto shrink-0 text-BrandOrange" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

/**
 * Admin plays manager page — accessible at /admin/app.
 * Lists all platform plays with folder navigation, create/edit/delete/feature controls,
 * and per-play shareable link copying. Redirects to /admin if not authenticated.
 */
export default function AdminPlaysPage() {
  const navigate = useNavigate();
  const session = localStorage.getItem(SESSION_KEY) || "";

  const [activeTab, setActiveTab] = useState("plays");
  const [plays, setPlays] = useState([]);
  const [folders, setFolders] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderRef = useRef(null);

  useEffect(() => {
    if (!session) navigate("/admin", { replace: true });
  }, [session, navigate]);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const [playsData, foldersData, sectionsData] = await Promise.all([
        fetchAllPlays(session),
        fetchAllFolders(session),
        fetchPageSections(session),
      ]);
      setPlays(playsData);
      setFolders(foldersData);
      setSections(sectionsData);
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        localStorage.removeItem(SESSION_KEY);
        navigate("/admin", { replace: true });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [session, navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (newFolderMode) setTimeout(() => newFolderRef.current?.focus(), 0);
  }, [newFolderMode]);

  const handleLogout = () => {
    fetch(`${API_URL}/admin/logout`, {
      method: "POST",
      headers: { "x-admin-session": session },
    }).catch(() => {});
    localStorage.removeItem(SESSION_KEY);
    navigate("/admin", { replace: true });
  };

  const handleEdit = (play) => navigate(`/admin/plays/${play.id}/edit`);
  const handleNew = () => navigate("/admin/plays/new/edit");

  const handleDelete = async (play) => {
    if (!window.confirm(`Delete "${play.title}"? This cannot be undone.`)) return;
    try {
      await deletePlay(session, play.id);
      setPlays((prev) => prev.filter((p) => p.id !== play.id));
    } catch (err) { setError(err.message); }
  };

  /** Move a play to a folder or remove it from any folder. */
  const handleMove = async (play, folderId) => {
    try {
      const updated = await movePlay(session, play.id, folderId);
      setPlays((prev) => prev.map((p) => (p.id === play.id ? updated : p)));
    } catch (err) { setError(err.message); }
  };

  /** Create a new folder at root level. */
  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) { setNewFolderMode(false); return; }
    try {
      const folder = await createFolderApi(session, name, null);
      setFolders((prev) => [...prev, folder]);
      setNewFolderName("");
      setNewFolderMode(false);
    } catch (err) { setError(err.message); }
  };

  /** Rename a folder inline. */
  const handleRenameFolder = async (id, name) => {
    try {
      const updated = await renameFolderApi(session, id, name);
      setFolders((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch (err) { setError(err.message); }
  };

  /** Delete a folder; plays inside become un-foldered. */
  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Delete folder "${folder.name}"? Plays inside will become un-foldered.`)) return;
    try {
      await deleteFolderApi(session, folder.id);
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      setPlays((prev) => prev.map((p) => (p.folderId === folder.id ? { ...p, folderId: null } : p)));
      if (currentFolderId === folder.id) setCurrentFolderId(null);
    } catch (err) { setError(err.message); }
  };

  /** Assign or unassign a play from a page section. */
  const handleAssignSection = async (key, playId) => {
    try {
      await assignSectionPlay(session, key, playId);
      const assignedPlay = plays.find((p) => p.id === playId) || null;
      setSections((prev) =>
        prev.map((s) =>
          s.sectionKey === key
            ? {
                ...s,
                playId: playId || null,
                playTitle: assignedPlay?.title || null,
                playThumbnail: assignedPlay?.thumbnail || null,
                playSport: assignedPlay?.sport || null,
              }
            : s
        )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const visiblePlays = plays.filter((p) => {
    const inFolder = currentFolderId === null || p.folderId === currentFolderId;
    if (!inFolder) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.sport?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const currentFolder = folders.find((f) => f.id === currentFolderId);

  return (
    <div className="hide-scroll bg-[#13151a] font-DmSans text-white" style={{ height: "100dvh", overflowY: "auto" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/6 bg-[#13151a]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin")} className="inline-flex opacity-70 transition hover:opacity-100">
              <img src={logo} alt="Coachable" className="h-5" />
            </button>
            <span className="rounded bg-BrandOrange/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-BrandOrange">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-[#1e2228] p-0.5">
            <button
              onClick={() => setActiveTab("plays")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "plays" ? "bg-BrandOrange text-white" : "text-BrandGray hover:text-white"
              }`}
            >
              <FiFolder className="text-[10px]" /> Plays
            </button>
            <button
              onClick={() => setActiveTab("sections")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "sections" ? "bg-BrandOrange text-white" : "text-BrandGray hover:text-white"
              }`}
            >
              <FiLayout className="text-[10px]" /> Page Sections
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs text-BrandGray2">
            <span>{plays.length} total</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleNew}
              className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
            >
              <FiPlus /> New Play
            </button>
            <button
              onClick={() => navigate("/admin")}
              className="rounded-lg border border-white/8 px-3.5 py-2 text-xs text-BrandGray transition hover:border-white/20 hover:text-white"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              title="Log out"
              className="flex items-center gap-1.5 rounded-lg border border-white/6 px-3 py-2 text-xs text-BrandGray transition hover:border-white/20 hover:text-white"
            >
              <FiLogOut />
            </button>
          </div>
        </div>
      </div>

      {/* Page Sections tab */}
      {activeTab === "sections" && (
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="mb-6">
            <h2 className="font-Manrope text-base font-bold text-white">Page Sections</h2>
            <p className="mt-1 text-xs text-BrandGray2">
              Assign a platform play to each section. The play&apos;s animation will be shown as a live preview on that page.
            </p>
          </div>
          {error && (
            <div className="mb-4 rounded-lg bg-red-600/10 px-4 py-2 text-sm text-red-400">{error}</div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange" />
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map((section) => (
                <SectionRow
                  key={section.sectionKey}
                  section={section}
                  plays={plays}
                  onAssign={handleAssignSection}
                />
              ))}
              {sections.length === 0 && (
                <p className="text-sm text-BrandGray2">No sections defined yet.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Body: sidebar + content */}
      {activeTab === "plays" && <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        {/* ── Folder sidebar ── */}
        <aside className="w-52 shrink-0">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">
            Folders
          </p>

          {/* All plays */}
          <button
            onClick={() => setCurrentFolderId(null)}
            className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
              currentFolderId === null
                ? "bg-BrandOrange/15 text-BrandOrange"
                : "text-BrandGray hover:bg-white/5 hover:text-white"
            }`}
          >
            <FiFolder className="text-xs" />
            <span className="flex-1">All Plays</span>
            <span className="text-[10px] opacity-60">{plays.length}</span>
          </button>

          {/* Folder list */}
          <div className="space-y-0.5">
            {folders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                isActive={currentFolderId === folder.id}
                onClick={() => setCurrentFolderId(folder.id)}
                onRename={handleRenameFolder}
                onDelete={handleDeleteFolder}
              />
            ))}
          </div>

          {/* New folder */}
          {newFolderMode ? (
            <div className="mt-2">
              <input
                ref={newFolderRef}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") { setNewFolderMode(false); setNewFolderName(""); }
                }}
                onBlur={handleCreateFolder}
                placeholder="Folder name"
                className="w-full rounded-lg border border-white/10 bg-[#1e2228] px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-BrandGray2 focus:border-BrandOrange/40"
              />
            </div>
          ) : (
            <button
              onClick={() => setNewFolderMode(true)}
              className="mt-3 flex w-full items-center gap-1.5 rounded-lg border border-dashed border-white/10 px-2.5 py-2 text-xs text-BrandGray2 transition hover:border-white/20 hover:text-white"
            >
              <FiFolderPlus className="text-xs" /> New Folder
            </button>
          )}
        </aside>

        {/* ── Main content ── */}
        <div className="min-w-0 flex-1">
          {/* Breadcrumb + search */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-BrandGray2">
              <button
                onClick={() => setCurrentFolderId(null)}
                className={`transition hover:text-white ${!currentFolderId ? "font-semibold text-white" : ""}`}
              >
                All
              </button>
              {currentFolder && (
                <>
                  <FiChevronRight className="text-[10px]" />
                  <span className="font-semibold text-white">{currentFolder.name}</span>
                </>
              )}
            </div>

            <div className="relative max-w-sm flex-1">
              <svg
                className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-BrandGray2"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plays..."
                className="w-full rounded-lg border border-white/8 bg-[#1e2228] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-BrandGray2 focus:border-BrandOrange/50"
              />
            </div>
            {search && (
              <button onClick={() => setSearch("")} className="text-xs text-BrandGray2 hover:text-white">
                Clear
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-600/10 px-4 py-2 text-sm text-red-400">{error}</div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange" />
            </div>
          )}

          {/* Empty state */}
          {!loading && visiblePlays.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/6 bg-[#1e2228] py-20 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-BrandOrange/10">
                <FiFolder className="h-6 w-6 text-BrandOrange" />
              </div>
              <p className="font-Manrope text-sm font-semibold text-white">
                {search
                  ? "No plays match your search"
                  : currentFolder
                  ? `No plays in "${currentFolder.name}"`
                  : "No platform plays yet"}
              </p>
              <p className="mt-1 text-xs text-BrandGray2">
                {search ? "Try a different search term" : "Create your first play to feature on the landing page"}
              </p>
              {!search && (
                <button
                  onClick={handleNew}
                  className="mt-5 flex items-center gap-2 rounded-lg bg-BrandOrange px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  <FiPlus /> New Play
                </button>
              )}
            </div>
          )}

          {/* Play grid */}
          {!loading && visiblePlays.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visiblePlays.map((play) => (
                <PlayCard
                  key={play.id}
                  play={play}
                  folders={folders}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMove={handleMove}
                />
              ))}
            </div>
          )}
        </div>
      </div>}
    </div>
  );
}
