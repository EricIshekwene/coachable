import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdmin } from "../admin/AdminContext";
import { adminPath } from "../admin/adminNav";
import { AdminShell, AdminModal, AdminBtn, AdminInput, AdminSelect, AdminSpinner } from "../admin/components";
import {
  FiPlus, FiEdit2, FiTrash2, FiLogOut, FiFolder, FiFolderPlus,
  FiChevronRight, FiLink, FiCheck, FiX, FiEdit3, FiLayout, FiSearch, FiCopy,
  FiBookOpen, FiEye, FiEyeOff, FiMoreHorizontal, FiMenu, FiClock, FiTag, FiSliders,
} from "react-icons/fi";
import PlayPreviewCard from "../components/PlayPreviewCard";
import ConfirmModal from "../components/subcomponents/ConfirmModal";
import {
  isAdminElevated,
  getAdminElevatedUntil,
  setAdminElevated,
  clearAdminElevated,
} from "../utils/adminElevation";
import { SUPPORTED_FIELD_TYPES } from "../features/slate/hooks/useAdvancedSettings";

const SESSION_KEY = "coachable_admin_session";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const PANEL_STYLE = {
  backgroundColor: "var(--adm-surface)",
  border: "1px solid var(--adm-border)",
  boxShadow: "var(--adm-shadow-sm)",
};
const INSET_STYLE = {
  backgroundColor: "var(--adm-surface2)",
  border: "1px solid var(--adm-border)",
};
const MENU_STYLE = {
  backgroundColor: "var(--adm-surface-elevated)",
  border: "1px solid var(--adm-border2)",
  boxShadow: "var(--adm-shadow)",
};
const MENU_DIVIDER_STYLE = { borderColor: "var(--adm-border)" };
const NEUTRAL_BADGE_STYLE = {
  backgroundColor: "var(--adm-surface3)",
  color: "var(--adm-text2)",
};
const SUCCESS_BADGE_STYLE = {
  backgroundColor: "var(--adm-badge-green-bg)",
  color: "var(--adm-badge-green-text)",
};

/**
 * Format an ISO timestamp as a human-readable relative time string.
 * @param {string} isoString - ISO 8601 date string
 * @returns {string} Relative time string (e.g. "2w ago")
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
 * Duplicate a platform play via the admin API (creates a new play with the same data).
 * @param {string} session - Admin session token
 * @param {string} id - Source platform play ID
 * @returns {Promise<Object>} Newly created play object
 */
async function duplicatePlay(session, id) {
  const res = await fetch(`${API_URL}/admin/plays/${id}/duplicate`, {
    method: "POST",
    headers: { "x-admin-session": session },
  });
  if (!res.ok) throw new Error("Failed to duplicate play");
  const data = await res.json();
  return data.play;
}

/**
 * Rename a platform play by updating its title via the admin API.
 * @param {string} session - Admin session token
 * @param {string} id - Platform play ID
 * @param {string} title - New title for the play
 * @returns {Promise<Object>} Updated play object
 */
async function renamePlay(session, id, title) {
  const res = await fetch(`${API_URL}/admin/plays/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to rename play");
  return (await res.json()).play;
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
  return await res.json();
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
 * Update the tags array for a platform play.
 * @param {string} session - Admin session token
 * @param {string} playId - Play ID
 * @param {string[]} tags - New tags array
 * @returns {Promise<Object>} Updated play object
 */
async function updatePlayTags(session, playId, tags) {
  const res = await fetch(`${API_URL}/admin/plays/${playId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) throw new Error("Failed to update tags");
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

/**
 * Toggle the priority flag for a page section.
 * @param {string} session - Admin session token
 * @param {string} key - Section key
 * @param {boolean} isPriority - New priority value
 */
async function setSectionPriority(session, key, isPriority) {
  const res = await fetch(`${API_URL}/admin/page-sections/${encodeURIComponent(key)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify({ isPriority }),
  });
  if (!res.ok) throw new Error("Failed to update section priority");
  return (await res.json()).section;
}

// ── Playbook section API helpers ─────────────────────────────────────────────

/**
 * Fetch all admin playbook sections (includes drafts).
 * @param {string} session - Admin session token
 * @returns {Promise<Object[]>} Array of section objects
 */
async function fetchPlaybookSections(session) {
  const res = await fetch(`${API_URL}/admin/playbook-sections`, {
    headers: { "x-admin-session": session },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  return (await res.json()).sections || [];
}

/**
 * Create a new playbook section.
 * @param {string} session - Admin session token
 * @param {Object} data - { name, description?, sport? }
 * @returns {Promise<Object>} Created section object
 */
async function createPlaybookSection(session, data) {
  const res = await fetch(`${API_URL}/admin/playbook-sections`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Failed to create section");
  }
  return (await res.json()).section;
}

/**
 * Update a playbook section.
 * @param {string} session - Admin session token
 * @param {string} id - Section ID
 * @param {Object} data - Partial section fields
 * @returns {Promise<Object>} Updated section object
 */
async function updatePlaybookSection(session, id, data) {
  const res = await fetch(`${API_URL}/admin/playbook-sections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update section");
  return (await res.json()).section;
}

/**
 * Delete a playbook section.
 * @param {string} session - Admin session token
 * @param {string} id - Section ID
 */
async function deletePlaybookSection(session, id) {
  const res = await fetch(`${API_URL}/admin/playbook-sections/${id}`, {
    method: "DELETE",
    headers: { "x-admin-session": session },
  });
  if (!res.ok) throw new Error("Failed to delete section");
}

/**
 * Fetch plays belonging to a playbook section.
 * @param {string} session - Admin session token
 * @param {string} sectionId - Section ID
 * @returns {Promise<Object[]>} Array of play objects
 */
async function fetchSectionPlays(session, sectionId) {
  const res = await fetch(`${API_URL}/admin/playbook-sections/${sectionId}/plays`, {
    headers: { "x-admin-session": session },
  });
  if (!res.ok) throw new Error("Failed to load section plays");
  return (await res.json()).plays || [];
}

/**
 * Add a platform play to a playbook section.
 * @param {string} session - Admin session token
 * @param {string} sectionId - Section ID
 * @param {string} playId - Platform play ID
 */
async function addPlayToSection(session, sectionId, playId) {
  const res = await fetch(`${API_URL}/admin/playbook-sections/${sectionId}/plays`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify({ playId }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Failed to add play");
  }
}

/**
 * Remove a platform play from a playbook section.
 * @param {string} session - Admin session token
 * @param {string} sectionId - Section ID
 * @param {string} playId - Platform play ID
 */
async function removePlayFromSection(session, sectionId, playId) {
  const res = await fetch(`${API_URL}/admin/playbook-sections/${sectionId}/plays/${playId}`, {
    method: "DELETE",
    headers: { "x-admin-session": session },
  });
  if (!res.ok) throw new Error("Failed to remove play");
}

/**
 * Update the sort_order of a platform play (for drag-to-reorder in the plays grid).
 * @param {string} session - Admin session token
 * @param {string} playId - Platform play ID
 * @param {number} sortOrder - New sort order value
 */
async function reorderPlayApi(session, playId, sortOrder) {
  const res = await fetch(`${API_URL}/admin/plays/${playId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify({ sortOrder }),
  });
  if (!res.ok) throw new Error("Failed to reorder play");
}

/**
 * Update the sort_order of a play within a playbook section (for drag-to-reorder).
 * @param {string} session - Admin session token
 * @param {string} sectionId - Section ID
 * @param {string} playId - Platform play ID
 * @param {number} sortOrder - New sort order value
 */
async function reorderSectionPlayApi(session, sectionId, playId, sortOrder) {
  const res = await fetch(`${API_URL}/admin/playbook-sections/${sectionId}/plays/${playId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify({ sortOrder }),
  });
  if (!res.ok) throw new Error("Failed to reorder play in section");
}

// ── Sport Presets API helpers ─────────────────────────────────────────────────

/**
 * Sports that can have admin-configured presets, derived from the canonical
 * SUPPORTED_FIELD_TYPES list. Adding a new sport to useAdvancedSettings.js
 * automatically surfaces it here — no manual update needed.
 */
const PRESET_SPORTS = SUPPORTED_FIELD_TYPES.filter((s) => s !== "Blank");

/**
 * Fetch all saved sport presets from the admin API.
 * @param {string} session - Admin session token
 * @returns {Promise<Object[]>} Array of preset objects with { sport, playData, updatedAt }
 */
async function fetchSportPresets(session) {
  const res = await fetch(`${API_URL}/admin/sport-presets`, {
    headers: { "x-admin-session": session },
  });
  if (!res.ok) throw new Error("Failed to load sport presets");
  return (await res.json()).presets || [];
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

  const isSport = folder.isSportFolder;

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
      className="group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition hover:opacity-85"
      style={isActive
        ? { backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }
        : isSport
          ? { color: "var(--adm-accent)" }
          : { color: "var(--adm-text2)" }}
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
          className="flex-1 rounded px-1 py-0 text-xs outline-none"
          style={{ border: "1px solid var(--adm-accent)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }}
        />
      ) : (
        <span className="flex-1 truncate text-xs">{folder.name}</span>
      )}
      {isSport && !editing && (
        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--adm-accent)" }}>sport</span>
      )}
      {!isSport && !editing && (
        <div className="hidden items-center gap-1 group-hover:flex">
          {onRename && (
            <button
              onClick={startEdit}
              title="Rename"
              className="rounded p-0.5 transition hover:opacity-80"
              style={{ color: "var(--adm-text2)" }}
            >
              <FiEdit3 className="text-[10px]" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(folder); }}
              title="Delete folder"
              className="rounded p-0.5 transition hover:opacity-80"
              style={{ color: "var(--adm-danger)" }}
            >
              <FiTrash2 className="text-[10px]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Copy-link menu item with its own copied-flash state. */
function CopyLinkButton({ play, onClose }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        const url = `${window.location.origin}/platform-play/${play.id}`;
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => { setCopied(false); onClose(); }, 1200);
        });
      }}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:opacity-80"
      style={{ color: "var(--adm-text2)" }}
    >
      {copied ? <FiCheck className="shrink-0 text-[10px]" style={{ color: "var(--adm-success)" }} /> : <FiLink className="shrink-0 text-[10px]" />}
      {copied ? "Copied!" : "Copy shareable link"}
    </button>
  );
}

/** Duplicate menu item with its own loading state. */
function DuplicateButton({ play, onDuplicate, onClose }) {
  const [duplicating, setDuplicating] = useState(false);
  return (
    <button
      onClick={async () => {
        setDuplicating(true);
        await onDuplicate(play);
        setDuplicating(false);
        onClose();
      }}
      disabled={duplicating}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:opacity-80 disabled:opacity-50"
      style={{ color: "var(--adm-text2)" }}
    >
      {duplicating
        ? <span className="inline-block h-3 w-3 shrink-0 rounded-full animate-spin" style={{ border: "1px solid var(--adm-border2)", borderTopColor: "var(--adm-accent)" }} />
        : <FiCopy className="shrink-0 text-[10px]" />}
      Duplicate
    </button>
  );
}

/**
 * A single platform play card styled to match the regular app play card.
 * Edit is always visible at the bottom; all secondary actions (copy link, duplicate,
 * add to section, move to folder, delete) are accessed via the three-dots menu.
 * The outer wrapper is draggable — the parent grid handles drag events.
 * @param {Object} props
 * @param {Object} props.play - Platform play object
 * @param {Object[]} props.folders - All folders for the move dropdown
 * @param {Object[]} props.playbookSections - All playbook sections for the add-to-section dropdown
 * @param {Function} props.onEdit - Called with play to navigate to editor
 * @param {Function} props.onDelete - Called with play to delete
 * @param {Function} props.onMove - Called with (play, folderId) to move to folder
 * @param {Function} props.onDuplicate - Called with play to duplicate it
 * @param {Function} props.onAddToSection - Called with (play, sectionId) to add play to a section
 * @param {Function} props.onTagsUpdate - Called with (play, newTags[]) to update play tags
 */
function PlayCard({ play, folders, playbookSections, onEdit, onDelete, onMove, onDuplicate, onAddToSection, onTagsUpdate, onRename, allTags }) {
  // null → closed  |  "main" → first popup  |  "sections" / "folders" / "tags" / "rename" → sub-pickers
  const [menuStep, setMenuStep] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef(null);
  const tagInputRef = useRef(null);
  const renameInputRef = useRef(null);

  useEffect(() => {
    if (!menuStep) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuStep(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuStep]);

  const close = () => setMenuStep(null);

  return (
    <div
      className="group relative flex cursor-grab flex-col rounded-xl border p-5 transition active:cursor-grabbing hover:opacity-95"
      style={{ ...PANEL_STYLE, zIndex: menuStep ? 50 : "auto" }}
    >
      {/* Preview */}
      <div className="relative mb-4 aspect-[16/10] w-full overflow-hidden rounded-xl" style={{ border: "1px solid var(--adm-border)" }}>
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
      </div>

      {/* Title + three-dots menu */}
      <div className="flex items-center gap-1.5">
        <h3 className="min-w-0 flex-1 truncate font-Manrope text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{play.title}</h3>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuStep((v) => (v ? null : "main")); }}
            className="rounded-md p-1 opacity-100 transition hover:opacity-80 md:opacity-0 group-hover:opacity-100"
            style={{ color: "var(--adm-text2)" }}
          >
            <FiMoreHorizontal className="text-sm" />
          </button>

          {/* ── Step 1: main popup ── */}
          {menuStep === "main" && (
            <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl py-1" style={MENU_STYLE}>
              {/* Copy link */}
              <CopyLinkButton play={play} onClose={close} />

              {/* Duplicate */}
              <DuplicateButton play={play} onDuplicate={onDuplicate} onClose={close} />

              {/* Rename */}
              <button
                onClick={() => { setRenameValue(play.title || ""); setMenuStep("rename"); setTimeout(() => renameInputRef.current?.focus(), 50); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:opacity-80"
                style={{ color: "var(--adm-text2)" }}
              >
                <FiEdit2 className="shrink-0 text-[10px]" />
                Rename
              </button>

              <div className="my-1 border-t" style={MENU_DIVIDER_STYLE} />

              {/* Add to section → sub-popup */}
              <button
                onClick={() => setMenuStep("sections")}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:opacity-80"
                style={{ color: "var(--adm-text2)" }}
              >
                <FiBookOpen className="shrink-0 text-[10px]" />
                Add to Section
                <FiChevronRight className="ml-auto shrink-0 text-[10px]" style={{ color: "var(--adm-muted)" }} />
              </button>

              {/* Move to folder → sub-popup */}
              <button
                onClick={() => setMenuStep("folders")}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:opacity-80"
                style={{ color: "var(--adm-text2)" }}
              >
                <FiFolder className="shrink-0 text-[10px]" style={play.folderId ? { color: "var(--adm-color-blue)" } : undefined} />
                Move to Folder
                <FiChevronRight className="ml-auto shrink-0 text-[10px]" style={{ color: "var(--adm-muted)" }} />
              </button>

              {/* Edit tags → sub-popup */}
              <button
                onClick={() => { setTagInput(""); setMenuStep("tags"); setTimeout(() => tagInputRef.current?.focus(), 50); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:opacity-80"
                style={{ color: "var(--adm-text2)" }}
              >
                <FiTag className="shrink-0 text-[10px]" />
                Edit Tags
                <FiChevronRight className="ml-auto shrink-0 text-[10px]" style={{ color: "var(--adm-muted)" }} />
              </button>

              <div className="my-1 border-t" style={MENU_DIVIDER_STYLE} />

              {/* Delete */}
              <button
                onClick={() => { onDelete(play); close(); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:opacity-80"
                style={{ color: "var(--adm-danger)" }}
              >
                <FiTrash2 className="shrink-0 text-[10px]" /> Delete
              </button>
            </div>
          )}

          {/* ── Step 2a: section picker ── */}
          {menuStep === "sections" && (
            <div className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl" style={MENU_STYLE}>
              <div className="flex items-center gap-2 border-b px-3 py-2.5" style={MENU_DIVIDER_STYLE}>
                <button
                  onClick={() => setMenuStep("main")}
                  className="flex items-center gap-1 text-[11px] transition hover:opacity-80"
                  style={{ color: "var(--adm-text2)" }}
                >
                  <FiChevronRight className="rotate-180 text-[10px]" /> Back
                </button>
                <span className="flex-1 text-center text-[11px] font-semibold" style={{ color: "var(--adm-text)" }}>Add to Section</span>
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {(playbookSections || []).length === 0 ? (
                  <p className="px-3 py-2 text-xs" style={{ color: "var(--adm-muted)" }}>No sections yet</p>
                ) : (
                  (playbookSections || []).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { onAddToSection(play, s.id); close(); }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition hover:opacity-80"
                      style={{ color: "var(--adm-text2)" }}
                    >
                      <FiBookOpen className="shrink-0 text-[10px]" />
                      <span className="flex-1 truncate">{s.name}</span>
                      {!s.isPublished && (
                        <span className="shrink-0 text-[9px]" style={{ color: "var(--adm-muted)" }}>draft</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Step 2b: folder picker ── */}
          {menuStep === "folders" && (
            <div className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl" style={MENU_STYLE}>
              <div className="flex items-center gap-2 border-b px-3 py-2.5" style={MENU_DIVIDER_STYLE}>
                <button
                  onClick={() => setMenuStep("main")}
                  className="flex items-center gap-1 text-[11px] transition hover:opacity-80"
                  style={{ color: "var(--adm-text2)" }}
                >
                  <FiChevronRight className="rotate-180 text-[10px]" /> Back
                </button>
                <span className="flex-1 text-center text-[11px] font-semibold" style={{ color: "var(--adm-text)" }}>Move to Folder</span>
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                <button
                  onClick={() => { onMove(play, null); close(); }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition hover:opacity-80"
                  style={!play.folderId ? { color: "var(--adm-accent)" } : { color: "var(--adm-text2)" }}
                >
                  <FiX className="shrink-0 text-[10px]" /> No folder
                  {!play.folderId && <FiCheck className="ml-auto shrink-0 text-[10px]" />}
                </button>
                {folders.length === 0 && (
                  <p className="px-3 py-2 text-xs" style={{ color: "var(--adm-muted)" }}>No folders yet</p>
                )}
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { onMove(play, f.id); close(); }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition hover:opacity-80"
                    style={play.folderId === f.id ? { color: "var(--adm-accent)" } : { color: "var(--adm-text2)" }}
                  >
                    <FiFolder className="shrink-0 text-[10px]" />
                    <span className="flex-1 truncate">{f.name}</span>
                    {play.folderId === f.id && <FiCheck className="ml-auto shrink-0 text-[10px]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2c: tags editor ── */}
          {menuStep === "tags" && (() => {
            const query = tagInput.trim().toLowerCase();
            const current = play.tags || [];
            const tagSuggestions = (allTags || [])
              .filter((t) => !current.includes(t) && (!query || t.toLowerCase().includes(query)));
            return (
              <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-xl" style={MENU_STYLE}>
                <div className="flex items-center gap-2 border-b px-3 py-2.5" style={MENU_DIVIDER_STYLE}>
                  <button
                    onClick={() => setMenuStep("main")}
                    className="flex items-center gap-1 text-[11px] transition hover:opacity-80"
                    style={{ color: "var(--adm-text2)" }}
                  >
                    <FiChevronRight className="rotate-180 text-[10px]" /> Back
                  </button>
                  <span className="flex-1 text-center text-[11px] font-semibold" style={{ color: "var(--adm-text)" }}>Edit Tags</span>
                </div>
                <div className="p-2.5 flex flex-col gap-2.5">
                  {/* Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const val = tagInput.trim().toLowerCase();
                      if (!val) return;
                      if (!current.includes(val)) onTagsUpdate(play, [...current, val]);
                      setTagInput("");
                    }}
                    className="flex gap-1.5"
                  >
                    <input
                      ref={tagInputRef}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Type a tag…"
                      className="flex-1 min-w-0 rounded-md px-2 py-1.5 text-[11px] outline-none"
                      style={{ border: "1px solid var(--adm-border2)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }}
                    />
                    <button
                      type="submit"
                      className="rounded-md px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-85"
                      style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}
                    >
                      Add
                    </button>
                  </form>

                  {/* Past tags to click */}
                  {tagSuggestions.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--adm-muted)" }}>Past tags</p>
                      <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                        {tagSuggestions.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => { onTagsUpdate(play, [...current, t]); setTagInput(""); tagInputRef.current?.focus(); }}
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] transition hover:opacity-85"
                            style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Current tags on this play */}
                  {current.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--adm-muted)" }}>On this play</p>
                      <div className="flex flex-wrap gap-1">
                        {current.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px]"
                            style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}
                          >
                            {tag}
                            <button
                              onClick={() => onTagsUpdate(play, current.filter((t) => t !== tag))}
                              className="ml-0.5 transition hover:opacity-80"
                              style={{ color: "var(--adm-danger)" }}
                            >
                              <FiX className="text-[9px]" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {current.length === 0 && tagSuggestions.length === 0 && (
                    <p className="text-[11px]" style={{ color: "var(--adm-muted)" }}>No tags yet — type one above.</p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── Step 2d: rename ── */}
          {menuStep === "rename" && (
            <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl" style={MENU_STYLE}>
              <div className="flex items-center gap-2 border-b px-3 py-2.5" style={MENU_DIVIDER_STYLE}>
                <button
                  onClick={() => setMenuStep("main")}
                  className="flex items-center gap-1 text-[11px] transition hover:opacity-80"
                  style={{ color: "var(--adm-text2)" }}
                >
                  <FiChevronRight className="rotate-180 text-[10px]" /> Back
                </button>
                <span className="flex-1 text-center text-[11px] font-semibold" style={{ color: "var(--adm-text)" }}>Rename Play</span>
              </div>
              <form
                className="p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = renameValue.trim();
                  if (trimmed && trimmed !== play.title) onRename(play, trimmed);
                  close();
                }}
              >
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") { setMenuStep("main"); } }}
                  className="w-full rounded-md px-2.5 py-1.5 text-xs outline-none"
                  style={{ border: "1px solid var(--adm-border2)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }}
                  placeholder="Play name…"
                />
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMenuStep("main")}
                    className="flex-1 rounded-md py-1 text-[11px] transition hover:opacity-80"
                    style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!renameValue.trim() || renameValue.trim() === play.title}
                    className="flex-1 rounded-md py-1 text-[11px] font-semibold transition hover:opacity-85 disabled:opacity-40"
                    style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}
                  >
                    Rename
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      {(play.tags || []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(play.tags || []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px]"
              style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}
            >
              <FiTag className="text-[8px]" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: time + edit */}
      <div className="mt-auto pt-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--adm-muted)" }}>
          <FiClock className="text-[10px]" />
          {formatRelativeTime(play.createdAt)}
        </span>
        <button
          onClick={() => onEdit(play)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition hover:opacity-80"
          style={{ color: "var(--adm-text2)" }}
        >
          <FiEdit2 className="text-[10px]" /> Edit
        </button>
      </div>
    </div>
  );
}

/**
 * A single page section row showing the assigned play and a picker to change it.
 * @param {Object} props
 * @param {Object} props.section - Section data (sectionKey, label, page, playId, playTitle, playThumbnail, isPriority)
 * @param {Object[]} props.plays - All platform plays for the picker
 * @param {Function} props.onAssign - Called with (sectionKey, playId | null)
 * @param {Function} props.onTogglePriority - Called with (sectionKey, isPriority)
 */
function SectionRow({ section, plays, onAssign, onTogglePriority }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [prioritySaving, setPrioritySaving] = useState(false);
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

  const handleTogglePriority = async () => {
    setPrioritySaving(true);
    await onTogglePriority(section.sectionKey, !section.isPriority);
    setPrioritySaving(false);
  };

  const showPriorityWarning = section.isPriority && !section.playId;

  return (
    <div
      className="rounded-xl border"
      style={showPriorityWarning
        ? { ...PANEL_STYLE, border: "1px solid color-mix(in srgb, var(--adm-warning) 32%, transparent)" }
        : PANEL_STYLE}
    >
      {/* Priority warning banner */}
      {showPriorityWarning && (
        <div className="flex items-center gap-2 rounded-t-xl border-b px-4 py-2" style={{ borderColor: "color-mix(in srgb, var(--adm-warning) 28%, transparent)", backgroundColor: "var(--adm-badge-amber-bg)" }}>
          <span className="text-xs font-bold" style={{ color: "var(--adm-badge-amber-text)" }}>!</span>
          <p className="text-xs font-semibold" style={{ color: "var(--adm-badge-amber-text)" }}>
            This section is marked as priority but has no play assigned.
          </p>
        </div>
      )}
      <div className="flex items-center gap-5 p-4">
      {/* Section info */}
      <div className="w-52 shrink-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{section.label}</p>
          <button
            onClick={handleTogglePriority}
            disabled={prioritySaving}
            title={section.isPriority ? "Remove priority" : "Mark as priority (warning persists until a play is assigned)"}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold transition disabled:opacity-50 hover:opacity-80"
            style={section.isPriority
              ? { backgroundColor: "var(--adm-badge-amber-bg)", color: "var(--adm-badge-amber-text)" }
              : { backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}
          >
            {prioritySaving ? (
              <span className="inline-block h-2.5 w-2.5 rounded-full animate-spin" style={{ border: "1px solid var(--adm-border2)", borderTopColor: "var(--adm-accent)" }} />
            ) : "!"}
          </button>
        </div>
        <p className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--adm-muted)" }}>{section.sectionKey}</p>
        <span className="mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}>
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
                  className="aspect-video w-full rounded-lg object-cover"
                  style={{ border: "1px solid var(--adm-border)" }}
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-lg" style={INSET_STYLE}>
                  <FiLayout style={{ color: "var(--adm-muted)" }} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{section.playTitle}</p>
              {section.playSport && (
                <p className="text-xs" style={{ color: "var(--adm-muted)" }}>{section.playSport}</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm italic" style={{ color: "var(--adm-muted)" }}>No play assigned</p>
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
              className="rounded-lg border px-2.5 py-2 text-xs transition hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: "rgba(220, 38, 38, 0.18)", backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}
            >
              <FiX />
            </button>
          )}
          <button
            onClick={() => setPickerOpen((v) => !v)}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:opacity-85 disabled:opacity-50"
            style={{ borderColor: "var(--adm-border2)", backgroundColor: "var(--adm-surface2)", color: "var(--adm-text)" }}
          >
            {saving ? (
              <span className="inline-block h-3 w-3 rounded-full animate-spin" style={{ border: "2px solid var(--adm-border2)", borderTopColor: "var(--adm-accent)" }} />
            ) : (
              <FiEdit2 className="text-xs" />
            )}
            {section.playId ? "Change" : "Assign Play"}
          </button>
        </div>

        {pickerOpen && (
          <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl" style={MENU_STYLE}>
            {/* Search */}
            <div className="flex items-center gap-2 border-b px-3 py-2.5" style={MENU_DIVIDER_STYLE}>
              <FiSearch className="shrink-0 text-xs" style={{ color: "var(--adm-muted)" }} />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plays..."
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: "var(--adm-text)" }}
              />
            </div>
            {/* Play list */}
            <div className="max-h-64 overflow-y-auto">
              {filteredPlays.length === 0 && (
                <p className="px-4 py-3 text-xs" style={{ color: "var(--adm-muted)" }}>No plays found</p>
              )}
              {filteredPlays.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePick(p.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs transition hover:opacity-85"
                  style={section.playId === p.id ? { color: "var(--adm-accent)" } : { color: "var(--adm-text)" }}
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
                        <div className="flex aspect-video w-full items-center justify-center rounded-md" style={INSET_STYLE}>
                        <FiLayout className="text-[8px]" style={{ color: "var(--adm-muted)" }} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                    <p className="truncate font-semibold">{p.title}</p>
                    {p.sport && <p style={{ color: "var(--adm-muted)" }}>{p.sport}</p>}
                    </div>
                  {section.playId === p.id && <FiCheck className="ml-auto shrink-0" style={{ color: "var(--adm-accent)" }} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// ── Playbook Section Panel ────────────────────────────────────────────────────

/**
 * Full admin panel for managing playbook sections.
 * Left side: sections grouped by sport in collapsible groups (default section pinned first).
 * Right side: selected section detail with its plays.
 * @param {Object} props
 * @param {string} props.session - Admin session token
 * @param {Object[]} props.allPlays - All platform plays (for the add-play picker)
 * @param {Object[]} props.folders - All platform play folders (for the add-folder picker)
 * @param {string} props.error - Parent-level error string
 * @param {Function} props.setError - Error setter from parent
 */
function PlaybookSectionPanel({ session, allPlays, folders, error, setError }) {
  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [sectionPlays, setSectionPlays] = useState([]);
  const [loadingPlays, setLoadingPlays] = useState(false);

  // New section form
  const [creatingSection, setCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionSport, setNewSectionSport] = useState("");
  const newSectionRef = useRef(null);

  // Add-play picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const pickerRef = useRef(null);

  // Add-folder picker
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [folderPickerSearch, setFolderPickerSearch] = useState("");
  const folderPickerRef = useRef(null);

  // Duplicate-detection modal: { folderPlays, duplicates }
  const [dupModal, setDupModal] = useState(null);

  // Inline rename of selected section
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const editNameRef = useRef(null);

  // Confirm delete
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Drag-to-reorder within section plays
  const [sectionDragSrcId, setSectionDragSrcId] = useState(null);
  const [sectionDragOverId, setSectionDragOverId] = useState(null);

  // Collapsed sport groups — keyed by sport name, true = collapsed
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const selectedSection = sections.find((s) => s.id === selectedId) || null;

  // Load sections on mount
  useEffect(() => {
    setLoadingSections(true);
    fetchPlaybookSections(session)
      .then((data) => {
        setSections(data);
        if (data.length && !selectedId) setSelectedId(data[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingSections(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Load plays when selected section changes
  useEffect(() => {
    if (!selectedId) { setSectionPlays([]); return; }
    setLoadingPlays(true);
    fetchSectionPlays(session, selectedId)
      .then(setSectionPlays)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingPlays(false));
  }, [selectedId, session, setError]);

  // Close play picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
        setPickerSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  // Close folder picker on outside click
  useEffect(() => {
    if (!folderPickerOpen) return;
    const handler = (e) => {
      if (folderPickerRef.current && !folderPickerRef.current.contains(e.target)) {
        setFolderPickerOpen(false);
        setFolderPickerSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [folderPickerOpen]);

  useEffect(() => {
    if (creatingSection) setTimeout(() => newSectionRef.current?.focus(), 0);
  }, [creatingSection]);

  useEffect(() => {
    if (editingName) setTimeout(() => editNameRef.current?.focus(), 0);
  }, [editingName]);

  /** Group sections by sport. Sports with no sections get no group. Sections with no sport go under "Other". */
  const sportGroups = (() => {
    const map = new Map();
    for (const s of sections) {
      const key = s.sport || "__other__";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    // Sort each group: default section first, then alphabetical
    for (const [, group] of map) {
      group.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.name.localeCompare(b.name);
      });
    }
    // Build ordered array: sport groups in SUPPORTED_FIELD_TYPES order, then "Other"
    const ordered = [];
    for (const sport of SUPPORTED_FIELD_TYPES) {
      if (map.has(sport)) ordered.push({ sport, sections: map.get(sport) });
    }
    if (map.has("__other__")) ordered.push({ sport: "__other__", sections: map.get("__other__") });
    return ordered;
  })();

  /** Toggle a sport group collapsed/expanded. */
  const toggleGroup = (sport) =>
    setCollapsedGroups((prev) => ({ ...prev, [sport]: !prev[sport] }));

  /** Create a new section and auto-select it. */
  const handleCreateSection = async () => {
    const name = newSectionName.trim();
    if (!name) { setCreatingSection(false); return; }
    try {
      const section = await createPlaybookSection(session, {
        name,
        sport: newSectionSport.trim() || undefined,
      });
      setSections((prev) => [...prev, section]);
      setSelectedId(section.id);
      setSectionPlays([]);
    } catch (err) { setError(err.message); }
    setNewSectionName("");
    setNewSectionSport("");
    setCreatingSection(false);
  };

  /** Rename selected section inline. */
  const handleCommitRename = async () => {
    setEditingName(false);
    const name = editNameValue.trim();
    if (!name || name === selectedSection?.name) return;
    try {
      const updated = await updatePlaybookSection(session, selectedId, { name });
      setSections((prev) => prev.map((s) => (s.id === selectedId ? updated : s)));
    } catch (err) { setError(err.message); }
  };

  /** Toggle publish/draft for selected section. */
  const handleTogglePublish = async () => {
    if (!selectedSection) return;
    try {
      const updated = await updatePlaybookSection(session, selectedId, {
        isPublished: !selectedSection.isPublished,
      });
      setSections((prev) => prev.map((s) => (s.id === selectedId ? updated : s)));
    } catch (err) { setError(err.message); }
  };

  /** Delete a section. */
  const handleDeleteSection = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await deletePlaybookSection(session, id);
      setSections((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) {
        const remaining = sections.filter((s) => s.id !== id);
        setSelectedId(remaining[0]?.id || null);
      }
    } catch (err) { setError(err.message); }
  };

  /**
   * Called when the user picks a folder from the folder picker.
   * Computes which of the folder's plays are already in the section and either
   * adds them immediately (no duplicates) or opens the duplicate-resolution modal.
   * @param {string} folderId - The selected folder's ID
   */
  const handleSelectFolder = (folderId) => {
    setFolderPickerOpen(false);
    setFolderPickerSearch("");
    const folderPlays = allPlays.filter((p) => p.folderId === folderId);
    if (folderPlays.length === 0) return;
    const duplicates = folderPlays.filter((p) => sectionPlayIds.has(p.id));
    if (duplicates.length > 0) {
      setDupModal({ folderPlays, duplicates });
    } else {
      handleConfirmAddFolder(folderPlays, false);
    }
  };

  /**
   * Adds folder plays to the section after duplicate resolution.
   * @param {Object[]} folderPlays - All plays from the selected folder
   * @param {boolean} skipDuplicates - If true, only add plays not already in the section
   */
  const handleConfirmAddFolder = async (folderPlays, skipDuplicates) => {
    setDupModal(null);
    const toAdd = skipDuplicates
      ? folderPlays.filter((p) => !sectionPlayIds.has(p.id))
      : folderPlays;
    if (toAdd.length === 0) return;
    try {
      await Promise.all(toAdd.map((p) => addPlayToSection(session, selectedId, p.id)));
      const plays = await fetchSectionPlays(session, selectedId);
      setSectionPlays(plays);
      setSections((prev) =>
        prev.map((s) => (s.id === selectedId ? { ...s, playCount: plays.length } : s))
      );
    } catch (err) { setError(err.message); }
  };

  /** Add a play to the currently selected section. */
  const handleAddPlay = async (playId) => {
    setPickerOpen(false);
    setPickerSearch("");
    try {
      await addPlayToSection(session, selectedId, playId);
      // Reload plays for this section
      const plays = await fetchSectionPlays(session, selectedId);
      setSectionPlays(plays);
      // Update play count on the section card
      setSections((prev) =>
        prev.map((s) => (s.id === selectedId ? { ...s, playCount: plays.length } : s))
      );
    } catch (err) { setError(err.message); }
  };

  /** Remove a play from the currently selected section. */
  const handleRemovePlay = async (playId) => {
    try {
      await removePlayFromSection(session, selectedId, playId);
      setSectionPlays((prev) => prev.filter((p) => p.id !== playId));
      setSections((prev) =>
        prev.map((s) =>
          s.id === selectedId ? { ...s, playCount: Math.max(0, s.playCount - 1) } : s
        )
      );
    } catch (err) { setError(err.message); }
  };

  /**
   * Reorder plays within the selected section by drag-and-drop.
   * Optimistically updates local state then persists new sort_orders to the backend.
   * @param {string} srcId - ID of the play being dragged
   * @param {string} destId - ID of the play at the drop target position
   */
  const handleReorderSectionPlay = async (srcId, destId) => {
    if (!srcId || srcId === destId) return;
    setSectionDragSrcId(null);
    setSectionDragOverId(null);
    const srcIdx = sectionPlays.findIndex((p) => p.id === srcId);
    const destIdx = sectionPlays.findIndex((p) => p.id === destId);
    if (srcIdx < 0 || destIdx < 0) return;
    const reordered = [...sectionPlays];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(destIdx, 0, moved);
    setSectionPlays(reordered);
    try {
      await Promise.all(reordered.map((p, i) => reorderSectionPlayApi(session, selectedId, p.id, i * 10)));
    } catch (err) {
      setError(err.message);
      const plays = await fetchSectionPlays(session, selectedId);
      setSectionPlays(plays);
    }
  };

  // Plays already in section (for excluding from picker)
  const sectionPlayIds = new Set(sectionPlays.map((p) => p.id));
  const pickerPlays = allPlays.filter((p) => {
    if (sectionPlayIds.has(p.id)) return false;
    if (!pickerSearch.trim()) return true;
    const q = pickerSearch.toLowerCase();
    return p.title?.toLowerCase().includes(q) || p.sport?.toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-Manrope text-base font-bold" style={{ color: "var(--adm-text)" }}>Playbook Sections</h2>
          <p className="mt-1 text-xs" style={{ color: "var(--adm-text2)" }}>
            Curate named collections of platform plays for coaches to reference in the app.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="mb-4 rounded-lg px-4 py-2 text-sm"
          style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}
        >
          {error}
        </div>
      )}

      <div className="flex min-h-[520px] gap-5">
        {/* ── Left: Section list grouped by sport ── */}
        <div className="w-64 shrink-0 overflow-y-auto rounded-2xl p-3" style={PANEL_STYLE}>
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--adm-muted)" }}>
            Sections
          </p>

          {loadingSections ? (
            <div className="flex justify-center py-8">
              <AdminSpinner size={24} />
            </div>
          ) : sportGroups.length === 0 && !creatingSection ? (
            <p className="px-1 text-xs" style={{ color: "var(--adm-muted)" }}>No sections yet</p>
          ) : (
            <div className="space-y-1">
              {sportGroups.map(({ sport, sections: groupSections }) => {
                const isCollapsed = !!collapsedGroups[sport];
                const label = sport === "__other__" ? "Other" : sport;
                return (
                  <div key={sport}>
                    {/* Sport group header */}
                    <button
                      onClick={() => toggleGroup(sport)}
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition hover:opacity-80"
                      style={{ color: "var(--adm-text2)" }}
                    >
                      <FiChevronRight
                        className="shrink-0 text-[10px] transition-transform duration-150"
                        style={{ transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)" }}
                      />
                      <span className="flex-1 truncate text-[10px] font-bold uppercase tracking-wider">
                        {label}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--adm-muted)" }}>
                        {groupSections.length}
                      </span>
                    </button>

                    {/* Section rows */}
                    {!isCollapsed && (
                      <div className="mb-1 ml-3 space-y-0.5 border-l pl-2" style={{ borderColor: "var(--adm-border)" }}>
                        {groupSections.map((section) => (
                          <button
                            key={section.id}
                            onClick={() => setSelectedId(section.id)}
                            className="group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition hover:opacity-90"
                            style={selectedId === section.id
                              ? {
                                  backgroundColor: "var(--adm-accent-dim)",
                                  color: "var(--adm-accent)",
                                  boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--adm-accent) 18%, transparent)",
                                }
                              : {
                                  backgroundColor: "transparent",
                                  color: "var(--adm-text2)",
                                }}
                          >
                            <FiBookOpen className="shrink-0 text-[10px]" />
                            <span className="flex-1 truncate font-semibold">{section.name}</span>
                            <span className="shrink-0 text-[10px]" style={{ color: selectedId === section.id ? "var(--adm-accent)" : "var(--adm-muted)" }}>
                              {section.playCount}
                            </span>
                            {section.isDefault && (
                              <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={SUCCESS_BADGE_STYLE}>
                                default
                              </span>
                            )}
                            {!section.isPublished && (
                              <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={NEUTRAL_BADGE_STYLE}>
                                draft
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* New section input */}
          {creatingSection ? (
            <div className="mt-2 space-y-1.5">
              <input
                ref={newSectionRef}
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSection();
                  if (e.key === "Escape") { setCreatingSection(false); setNewSectionName(""); }
                }}
                placeholder="Section name"
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none placeholder:text-slate-400"
                style={{
                  borderColor: "var(--adm-border2)",
                  backgroundColor: "var(--adm-surface-elevated)",
                  color: "var(--adm-text)",
                }}
              />
              <select
                value={newSectionSport}
                onChange={(e) => setNewSectionSport(e.target.value)}
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                style={{
                  borderColor: "var(--adm-border2)",
                  backgroundColor: "var(--adm-surface-elevated)",
                  color: newSectionSport ? "var(--adm-text)" : "var(--adm-muted)",
                }}
              >
                <option value="">Sport (optional)</option>
                {SUPPORTED_FIELD_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div className="flex gap-1">
                <button
                  onClick={handleCreateSection}
                  className="flex-1 rounded-lg py-1.5 text-[10px] font-semibold text-white transition hover:brightness-110"
                  style={{ backgroundColor: "var(--adm-accent)" }}
                >
                  Create
                </button>
                <button
                  onClick={() => { setCreatingSection(false); setNewSectionName(""); }}
                  className="flex-1 rounded-lg border py-1.5 text-[10px] font-semibold transition hover:opacity-85"
                  style={{
                    borderColor: "var(--adm-border2)",
                    backgroundColor: "var(--adm-surface)",
                    color: "var(--adm-text2)",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreatingSection(true)}
              className="mt-3 flex w-full items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-2 text-xs font-semibold transition hover:opacity-85"
              style={{ borderColor: "var(--adm-border2)", color: "var(--adm-text2)" }}
            >
              <FiPlus className="text-xs" /> New Section
            </button>
          )}
        </div>

        {/* ── Right: Section detail ── */}
        <div
          className="min-w-0 flex-1 rounded-xl p-5"
          style={{ ...PANEL_STYLE, backgroundColor: "var(--adm-surface-elevated)" }}
        >
          {!selectedSection ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm" style={{ color: "var(--adm-text2)" }}>Select a section to manage its plays</p>
            </div>
          ) : (
            <>
              {/* Section header */}
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {editingName ? (
                    <input
                      ref={editNameRef}
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onBlur={handleCommitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCommitRename();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      className="w-full rounded-lg border px-2 py-1 text-sm font-bold outline-none"
                      style={{
                        borderColor: "var(--adm-border2)",
                        backgroundColor: "var(--adm-surface2)",
                        color: "var(--adm-text)",
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-Manrope text-sm font-bold" style={{ color: "var(--adm-text)" }}>
                        {selectedSection.name}
                      </h3>
                      {selectedSection.sport && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={NEUTRAL_BADGE_STYLE}>
                          {selectedSection.sport}
                        </span>
                      )}
                      {selectedSection.isDefault && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={SUCCESS_BADGE_STYLE}>
                          Default
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setEditNameValue(selectedSection.name);
                          setEditingName(true);
                        }}
                        title="Rename section"
                        className="rounded p-0.5 transition hover:opacity-80"
                        style={{ color: "var(--adm-text2)" }}
                      >
                        <FiEdit3 className="text-[10px]" />
                      </button>
                    </div>
                  )}
                  <p className="mt-0.5 text-xs" style={{ color: "var(--adm-muted)" }}>
                    {selectedSection.playCount} {selectedSection.playCount === 1 ? "play" : "plays"}
                    {selectedSection.isDefault && (
                      <span className="ml-2" style={{ color: "var(--adm-muted)" }}>
                        · Standard plays given to coaches on signup
                      </span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={handleTogglePublish}
                    title={selectedSection.isPublished ? "Unpublish (hide from coaches)" : "Publish (visible to coaches)"}
                    className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:opacity-85"
                    style={selectedSection.isPublished
                      ? {
                          borderColor: "color-mix(in srgb, var(--adm-badge-green-text) 22%, transparent)",
                          backgroundColor: "var(--adm-badge-green-bg)",
                          color: "var(--adm-badge-green-text)",
                        }
                      : {
                          borderColor: "var(--adm-border2)",
                          backgroundColor: "var(--adm-surface2)",
                          color: "var(--adm-text2)",
                        }}
                  >
                    {selectedSection.isPublished
                      ? <><FiEye className="text-xs" /> Published</>
                      : <><FiEyeOff className="text-xs" /> Draft</>
                    }
                  </button>
                  {!selectedSection.isDefault && (
                    <button
                      onClick={() => setDeleteTarget(selectedSection)}
                      title="Delete section"
                      className="flex items-center justify-center rounded-lg border px-2.5 py-2 text-xs transition hover:opacity-85"
                      style={{
                        borderColor: "rgba(220, 38, 38, 0.18)",
                        backgroundColor: "var(--adm-danger-dim)",
                        color: "var(--adm-danger)",
                      }}
                    >
                      <FiTrash2 className="text-xs" />
                    </button>
                  )}
                </div>
              </div>

              {/* Add play / Add folder buttons */}
              <div className="mb-4 flex items-center gap-3">
                <div className="relative" ref={pickerRef}>
                  <button
                    onClick={() => { setPickerOpen((v) => !v); setFolderPickerOpen(false); }}
                    className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                    style={{ backgroundColor: "var(--adm-accent)" }}
                  >
                    <FiPlus /> Add Play
                  </button>

                  {pickerOpen && (
                    <div className="absolute left-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-xl" style={MENU_STYLE}>
                      {/* Search */}
                      <div className="flex items-center gap-2 border-b px-3 py-2.5" style={MENU_DIVIDER_STYLE}>
                        <FiSearch className="shrink-0 text-xs" style={{ color: "var(--adm-muted)" }} />
                        <input
                          autoFocus
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          placeholder="Search plays..."
                          className="flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400"
                          style={{ color: "var(--adm-text)" }}
                        />
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {pickerPlays.length === 0 && (
                          <p className="px-4 py-3 text-xs" style={{ color: "var(--adm-muted)" }}>
                            {sectionPlayIds.size === allPlays.length
                              ? "All plays are already in this section"
                              : "No plays found"}
                          </p>
                        )}
                        {pickerPlays.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleAddPlay(p.id)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs transition hover:opacity-85"
                            style={{ color: "var(--adm-text)" }}
                          >
                            <div className="w-12 shrink-0">
                              {p.playData ? (
                                <PlayPreviewCard
                                  playData={p.playData}
                                  autoplay="always"
                                  shape="landscape"
                                  paddingPx={10}
                                  minSpanPx={60}
                                />
                              ) : (
                                <div className="flex aspect-video w-full items-center justify-center rounded-md" style={INSET_STYLE}>
                                  <FiLayout className="text-[8px]" style={{ color: "var(--adm-muted)" }} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold" style={{ color: "var(--adm-text)" }}>{p.title}</p>
                              {p.sport && <p style={{ color: "var(--adm-muted)" }}>{p.sport}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Add Folder picker */}
                <div className="relative" ref={folderPickerRef}>
                  <button
                    onClick={() => { setFolderPickerOpen((v) => !v); setPickerOpen(false); }}
                    className="flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition hover:opacity-85"
                    style={{
                      borderColor: "var(--adm-border2)",
                      backgroundColor: "var(--adm-surface2)",
                      color: "var(--adm-text2)",
                    }}
                  >
                    <FiFolderPlus className="text-xs" /> Add Folder
                  </button>

                  {folderPickerOpen && (
                    <div className="absolute left-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl" style={MENU_STYLE}>
                      <div className="flex items-center gap-2 border-b px-3 py-2.5" style={MENU_DIVIDER_STYLE}>
                        <FiSearch className="shrink-0 text-xs" style={{ color: "var(--adm-muted)" }} />
                        <input
                          autoFocus
                          value={folderPickerSearch}
                          onChange={(e) => setFolderPickerSearch(e.target.value)}
                          placeholder="Search folders..."
                          className="flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400"
                          style={{ color: "var(--adm-text)" }}
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {(() => {
                          const visibleFolders = (folders || []).filter((f) => {
                            if (!folderPickerSearch.trim()) return true;
                            return f.name.toLowerCase().includes(folderPickerSearch.toLowerCase());
                          });
                          if (visibleFolders.length === 0) {
                            return (
                              <p className="px-4 py-3 text-xs" style={{ color: "var(--adm-muted)" }}>
                                No folders found
                              </p>
                            );
                          }
                          return visibleFolders.map((f) => {
                            const count = allPlays.filter((p) => p.folderId === f.id).length;
                            return (
                              <button
                                key={f.id}
                                onClick={() => handleSelectFolder(f.id)}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs transition hover:opacity-85"
                                style={{ color: "var(--adm-text)" }}
                              >
                                <FiFolder className="shrink-0 text-sm" style={{ color: "var(--adm-muted)" }} />
                                <span className="flex-1 truncate font-semibold">{f.name}</span>
                                <span className="shrink-0 text-[10px]" style={{ color: "var(--adm-muted)" }}>
                                  {count} {count === 1 ? "play" : "plays"}
                                </span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
                  {sectionPlays.length} {sectionPlays.length === 1 ? "play" : "plays"} in this section
                </p>
              </div>

              {/* Duplicate-resolution modal */}
              {dupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
                  <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: "var(--adm-surface-elevated)", border: "1px solid var(--adm-border2)", boxShadow: "var(--adm-shadow)" }}>
                    <h3 className="font-Manrope text-sm font-bold" style={{ color: "var(--adm-text)" }}>
                      Duplicate plays detected
                    </h3>
                    <p className="mt-2 text-xs" style={{ color: "var(--adm-text2)" }}>
                      <span className="font-semibold" style={{ color: "var(--adm-text)" }}>{dupModal.duplicates.length}</span> of the {dupModal.folderPlays.length} plays in this folder are already in the section.
                    </p>
                    <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto rounded-lg p-2 text-xs" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                      {dupModal.duplicates.map((p) => (
                        <li key={p.id} className="truncate" style={{ color: "var(--adm-text2)" }}>· {p.title}</li>
                      ))}
                    </ul>
                    <div className="mt-5 flex gap-2">
                      <button
                        onClick={() => handleConfirmAddFolder(dupModal.folderPlays, true)}
                        className="flex-1 rounded-lg py-2 text-xs font-semibold transition hover:brightness-110"
                        style={{ backgroundColor: "var(--adm-accent)", color: "#fff" }}
                      >
                        Skip duplicates
                      </button>
                      <button
                        onClick={() => handleConfirmAddFolder(dupModal.folderPlays, false)}
                        className="flex-1 rounded-lg border py-2 text-xs font-semibold transition hover:opacity-85"
                        style={{ borderColor: "var(--adm-border2)", backgroundColor: "var(--adm-surface2)", color: "var(--adm-text2)" }}
                      >
                        Add all
                      </button>
                      <button
                        onClick={() => setDupModal(null)}
                        className="rounded-lg border px-3 py-2 text-xs font-semibold transition hover:opacity-85"
                        style={{ borderColor: "var(--adm-border2)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text2)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Plays list */}
              {loadingPlays ? (
                <div className="flex justify-center py-8">
                  <AdminSpinner size={24} />
                </div>
              ) : sectionPlays.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center"
                  style={{ borderColor: "var(--adm-border2)", backgroundColor: "var(--adm-surface2)" }}
                >
                  <FiBookOpen className="mb-3 text-2xl" style={{ color: "var(--adm-muted)" }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>No plays yet</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--adm-text2)" }}>Add platform plays to build this collection</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sectionPlays.map((play) => (
                    <div
                      key={play.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setSectionDragSrcId(play.id); }}
                      onDragOver={(e) => { e.preventDefault(); if (sectionDragSrcId !== play.id) setSectionDragOverId(play.id); }}
                      onDrop={(e) => { e.preventDefault(); handleReorderSectionPlay(sectionDragSrcId, play.id); }}
                      onDragEnd={() => { setSectionDragSrcId(null); setSectionDragOverId(null); }}
                      className="flex cursor-grab items-center gap-3 rounded-lg px-3 py-2.5 transition active:cursor-grabbing"
                      style={sectionDragOverId === play.id && sectionDragSrcId !== play.id
                        ? {
                            backgroundColor: "var(--adm-surface2)",
                            border: "1px solid color-mix(in srgb, var(--adm-accent) 26%, transparent)",
                            opacity: 0.72,
                            boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--adm-accent) 14%, transparent)",
                          }
                        : INSET_STYLE}
                    >
                      {/* Drag handle */}
                      <FiMenu className="shrink-0 text-sm" style={{ color: "var(--adm-muted)" }} />

                      {/* Thumbnail */}
                      <div className="w-16 shrink-0">
                        {play.thumbnail ? (
                          <img
                            src={play.thumbnail}
                            alt={play.title}
                            className="aspect-video w-full rounded object-cover"
                          />
                        ) : (
                          <div className="flex aspect-video w-full items-center justify-center rounded" style={INSET_STYLE}>
                            <FiLayout className="text-[10px]" style={{ color: "var(--adm-muted)" }} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{play.title}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          {play.tags?.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-md px-1.5 py-0.5 text-[10px]" style={NEUTRAL_BADGE_STYLE}>#{tag}</span>
                          ))}
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => handleRemovePlay(play.id)}
                        title="Remove from section"
                        className="flex shrink-0 items-center justify-center rounded-lg border px-2 py-1.5 text-xs transition hover:opacity-85"
                        style={{
                          borderColor: "rgba(220, 38, 38, 0.18)",
                          backgroundColor: "var(--adm-danger-dim)",
                          color: "var(--adm-danger)",
                        }}
                      >
                        <FiX className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirm delete modal */}
      <ConfirmModal
        open={!!deleteTarget}
        message={`Delete "${deleteTarget?.name}"?`}
        subtitle="All play assignments in this section will be removed. This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteSection}
        onCancel={() => setDeleteTarget(null)}
      />
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
  const { basePath } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const session = sessionStorage.getItem(SESSION_KEY) || "";

  const [activeTab, setActiveTab] = useState(location.state?.tab || "plays");
  const [plays, setPlays] = useState([]);
  const [folders, setFolders] = useState([]);
  const [sections, setSections] = useState([]);
  const [playbookSections, setPlaybookSections] = useState([]);
  const [sportPresets, setSportPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const allTags = [...new Set(plays.flatMap((p) => p.tags || []))].sort();
  const [error, setError] = useState("");
  const [deletionWarning, setDeletionWarning] = useState(null);
  const [search, setSearch] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState(location.state?.folderId || null);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [newPlayModal, setNewPlayModal] = useState(false);
  const [newPlaySport, setNewPlaySport] = useState("Rugby");
  const [dragSrcId, setDragSrcId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [playSort, setPlaySort] = useState("updated");
  const [presetPickerSport, setPresetPickerSport] = useState(null);

  // ── Danger Mode (elevated permissions) ──
  const [elevatedUntil, setElevatedUntil] = useState(() => getAdminElevatedUntil());
  const [elevateModal, setElevateModal] = useState(false);
  const [elevatePassword, setElevatePassword] = useState("");
  const [elevateError, setElevateError] = useState("");
  const [elevating, setElevating] = useState(false);
  const elevateResolveRef = useRef(null);
  useEffect(() => {
    const id = setInterval(() => {
      const until = getAdminElevatedUntil();
      setElevatedUntil(until);
      if (until && Date.now() > until) {
        clearAdminElevated();
        setElevatedUntil(0);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!session) navigate(adminPath(basePath, ""), { replace: true });
  }, [session, navigate, basePath]);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const [playsData, foldersData, sectionsData, playbookSectionsData, sportPresetsData] = await Promise.all([
        fetchAllPlays(session),
        fetchAllFolders(session),
        fetchPageSections(session),
        fetchPlaybookSections(session),
        fetchSportPresets(session),
      ]);
      setPlays(playsData);
      setFolders(foldersData);
      setSections(sectionsData);
      setPlaybookSections(playbookSectionsData);
      setSportPresets(sportPresetsData);
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        sessionStorage.removeItem(SESSION_KEY);
        navigate("/admin", { replace: true });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [session, navigate]);

  useEffect(() => { load(); }, [load]);

  // Re-fetch sport preset counts whenever the presets tab becomes active so badge
  // counts stay accurate after returning from AdminSportPresetsPage without a full reload.
  useEffect(() => {
    if (activeTab !== "presets" || !session) return;
    fetchSportPresets(session).then(setSportPresets).catch(() => {});
  }, [activeTab, session]);

  // Strip any sport-name tags that were previously auto-applied.
  const SPORT_TAGS = new Set(["rugby", "soccer", "football", "lacrosse", "womens lacrosse", "basketball", "field hockey", "ice hockey", "blank"]);
  useEffect(() => {
    if (loading || !plays.length) return;
    plays.forEach(async (play) => {
      const cleaned = (play.tags || []).filter((t) => !SPORT_TAGS.has(t.toLowerCase()));
      if (cleaned.length === (play.tags || []).length) return;
      try {
        await updatePlayTags(session, play.id, cleaned);
        setPlays((prev) => prev.map((p) => p.id === play.id ? { ...p, tags: cleaned } : p));
      } catch { /* ignore */ }
    });
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (newFolderMode) setTimeout(() => newFolderRef.current?.focus(), 0);
  }, [newFolderMode]);

  /**
   * Submit the elevation password to enter Danger Mode.
   * @param {React.FormEvent} e
   */
  const handleElevate = async (e) => {
    e.preventDefault();
    setElevateError("");
    setElevating(true);
    try {
      const res = await fetch(`${API_URL}/admin/elevate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-session": session },
        body: JSON.stringify({ password: elevatePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Elevation failed");
      setAdminElevated(data.elevatedUntil);
      setElevatedUntil(data.elevatedUntil);
      setElevatePassword("");
      setElevateModal(false);
      elevateResolveRef.current?.(true);
    } catch (err) {
      setElevateError(err.message || "Invalid password");
    } finally {
      setElevating(false);
    }
  };

  const handleElevateCancel = () => {
    setElevateModal(false);
    setElevatePassword("");
    setElevateError("");
    elevateResolveRef.current?.(false);
  };

  /**
   * Ensure Danger Mode is active before a destructive action.
   * @returns {Promise<boolean>}
   */
  const ensureElevated = useCallback(() => {
    if (isAdminElevated()) return Promise.resolve(true);
    return new Promise((resolve) => {
      elevateResolveRef.current = resolve;
      setElevatePassword("");
      setElevateError("");
      setElevateModal(true);
    });
  }, []);

  const handleEdit = (play) => navigate(`/admin/plays/${play.id}/edit`);
  const handleNew = () => {
    if (currentFolderSport) {
      const visiblePresets = sportPresets.filter(
        (p) => p.sport?.toLowerCase() === currentFolderSport.toLowerCase() && !p.isHidden
      );
      if (visiblePresets.length > 0) {
        setPresetPickerSport(currentFolderSport);
      } else {
        navigate("/admin/plays/new/edit", { state: { sport: currentFolderSport, folderId: currentFolderId } });
      }
    } else {
      setNewPlaySport("Rugby");
      setNewPlayModal(true);
    }
  };

  const handlePresetPick = (preset) => {
    setPresetPickerSport(null);
    navigate("/admin/plays/new/edit", {
      state: {
        sport: currentFolderSport,
        folderId: currentFolderId,
        ...(preset ? { presetPlayData: preset.playData } : {}),
      },
    });
  };
  const handleNewPlayConfirm = () => {
    setNewPlayModal(false);
    navigate("/admin/plays/new/edit", { state: { sport: newPlaySport } });
  };

  const handleDelete = async (play) => {
    const elevated = await ensureElevated();
    if (!elevated) return;
    setConfirmModal({ type: "play", item: play });
  };

  /**
   * Execute the confirmed deletion (play or folder) from the confirm modal.
   */
  const handleDeleteConfirmed = async () => {
    const { type, item } = confirmModal;
    setConfirmModal(null);
    if (type === "play") {
      try {
        const result = await deletePlay(session, item.id);
        setPlays((prev) => prev.filter((p) => p.id !== item.id));
        setSections((prev) =>
          prev.map((s) =>
            s.playId === item.id
              ? { ...s, playId: null, playTitle: null, playThumbnail: null, playSport: null }
              : s
          )
        );
        if (result.clearedSections?.length > 0) {
          const sectionNames = result.clearedSections.map((s) => s.label).join(", ");
          const count = result.clearedSections.length;
          setDeletionWarning(
            `"${item.title}" was removed from ${count} page section${count > 1 ? "s" : ""}: ${sectionNames}`
          );
        }
      } catch (err) { setError(err.message); }
    } else if (type === "folder") {
      try {
        await deleteFolderApi(session, item.id);
        setFolders((prev) => prev.filter((f) => f.id !== item.id));
        setPlays((prev) => prev.map((p) => (p.folderId === item.id ? { ...p, folderId: null } : p)));
        if (currentFolderId === item.id) setCurrentFolderId(null);
      } catch (err) { setError(err.message); }
    }
  };

  /** Duplicate a play; inserts the copy right after the original in the list. */
  const handleDuplicate = async (play) => {
    try {
      const copy = await duplicatePlay(session, play.id);
      setPlays((prev) => {
        const idx = prev.findIndex((p) => p.id === play.id);
        const next = [...prev];
        next.splice(idx < 0 ? next.length : idx + 1, 0, copy);
        return next;
      });
    } catch (err) { setError(err.message); }
  };

  /** Move a play to a folder or remove it from any folder. */
  const handleMove = async (play, folderId) => {
    try {
      const updated = await movePlay(session, play.id, folderId);
      setPlays((prev) => prev.map((p) => (p.id === play.id ? updated : p)));
    } catch (err) { setError(err.message); }
  };

  /** Update the tags for a play. */
  const handleUpdateTags = async (play, tags) => {
    try {
      const updated = await updatePlayTags(session, play.id, tags);
      setPlays((prev) => prev.map((p) => (p.id === play.id ? updated : p)));
    } catch (err) { setError(err.message); }
  };

  /** Rename a play to a new title. */
  const handleRenamePlay = async (play, title) => {
    try {
      const updated = await renamePlay(session, play.id, title);
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
    const elevated = await ensureElevated();
    if (!elevated) return;
    setConfirmModal({ type: "folder", item: folder });
  };

  /** Add a platform play to a playbook section from the plays tab card. */
  const handleAddToSection = async (play, sectionId) => {
    try {
      await addPlayToSection(session, sectionId, play.id);
      setPlaybookSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, playCount: s.playCount + 1 } : s
        )
      );
    } catch (err) { setError(err.message); }
  };

  /**
   * Reorder plays in the currently visible grid by drag-and-drop.
   * Optimistically updates local sort_order and persists all affected plays to the backend.
   * @param {string} srcId - ID of the dragged play
   * @param {string} destId - ID of the play at the drop target
   */
  const handleReorderPlay = async (srcId, destId) => {
    if (!srcId || srcId === destId) return;
    setDragSrcId(null);
    setDragOverId(null);
    const srcIdx = visiblePlays.findIndex((p) => p.id === srcId);
    const destIdx = visiblePlays.findIndex((p) => p.id === destId);
    if (srcIdx < 0 || destIdx < 0) return;
    const reordered = [...visiblePlays];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(destIdx, 0, moved);
    const sortMap = {};
    reordered.forEach((p, i) => { sortMap[p.id] = i * 10; });
    setPlays((prev) => prev.map((p) => sortMap[p.id] !== undefined ? { ...p, sortOrder: sortMap[p.id] } : p));
    try {
      await Promise.all(reordered.map((p, i) => reorderPlayApi(session, p.id, i * 10)));
    } catch (err) {
      setError(err.message);
      load();
    }
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

  /** Toggle the priority flag for a page section. */
  const handleTogglePriority = async (key, isPriority) => {
    try {
      await setSectionPriority(session, key, isPriority);
      setSections((prev) =>
        prev.map((s) => (s.sectionKey === key ? { ...s, isPriority } : s))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const visiblePlays = plays
    .filter((p) => {
      const inFolder =
        currentFolderId === null ? !p.folderId : p.folderId === currentFolderId;
      if (!inFolder) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.title?.toLowerCase().includes(q) ||
        p.sport?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (playSort === "az") return (a.title || "").localeCompare(b.title || "");
      if (playSort === "za") return (b.title || "").localeCompare(a.title || "");
      if (playSort === "updated") return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      if (playSort === "created") return new Date(b.createdAt) - new Date(a.createdAt);
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || new Date(b.createdAt) - new Date(a.createdAt);
    });

  const currentFolder = folders.find((f) => f.id === currentFolderId);
  const currentFolderSport = currentFolder?.isSportFolder ? currentFolder.sport : null;

  // ── Danger Mode countdown display ──
  const dangerSecsLeft = elevatedUntil > 0 ? Math.max(0, Math.ceil((elevatedUntil - Date.now()) / 1000)) : 0;
  const dangerMinsDisplay = dangerSecsLeft > 0
    ? `${Math.floor(dangerSecsLeft / 60)}:${String(dangerSecsLeft % 60).padStart(2, "0")}`
    : null;

  return (
    <AdminShell sidebar={false}>
      {/* New Play sport picker */}
      <AdminModal open={newPlayModal} onClose={() => setNewPlayModal(false)} title="New Play">
        <p className="mb-4 text-sm" style={{ color: "var(--adm-muted)" }}>Choose the sport. This sets the field type and defaults.</p>
        <AdminSelect autoFocus value={newPlaySport} onChange={(e) => setNewPlaySport(e.target.value)} className="mb-4 w-full">
          {["Rugby", "Football", "Soccer", "Lacrosse", "Womens Lacrosse", "Basketball", "Field Hockey", "Ice Hockey", "Blank"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </AdminSelect>
        <div className="flex gap-2">
          <AdminBtn variant="secondary" className="flex-1" onClick={() => setNewPlayModal(false)}>Cancel</AdminBtn>
          <AdminBtn variant="primary" className="flex-1" onClick={handleNewPlayConfirm}>Create Play</AdminBtn>
        </div>
      </AdminModal>

      {/* Preset picker modal */}
      {presetPickerSport && (() => {
        const visiblePresets = sportPresets.filter(
          (p) => p.sport?.toLowerCase() === presetPickerSport.toLowerCase() && !p.isHidden
        );
        return (
          <AdminModal open onClose={() => setPresetPickerSport(null)} title="Choose a Starting Preset">
            <p className="mb-4 text-sm" style={{ color: "var(--adm-muted)" }}>{presetPickerSport} · Select a template or start blank.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={() => handlePresetPick(null)}
                className="flex flex-col gap-2 rounded-[var(--adm-radius-sm)] p-3 text-left transition"
                style={{ border: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface2)" }}
              >
                <div className="flex h-24 w-full items-center justify-center rounded text-xs" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-muted)" }}>Blank</div>
                <span className="text-xs font-medium" style={{ color: "var(--adm-text)" }}>Blank</span>
              </button>
              {visiblePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetPick(preset)}
                  className="flex flex-col gap-2 rounded-[var(--adm-radius-sm)] p-3 text-left transition"
                  style={{ border: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface2)" }}
                >
                  <div className="overflow-hidden rounded" style={{ height: 96 }}>
                    <PlayPreviewCard playData={preset.playData} shape="landscape" cameraMode="fit-distribution" />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "var(--adm-text)" }}>{preset.name}</span>
                </button>
              ))}
            </div>
            <AdminBtn variant="secondary" className="mt-4 w-full" onClick={() => setPresetPickerSport(null)}>
              Cancel
            </AdminBtn>
          </AdminModal>
        );
      })()}

      {/* Danger Mode modal */}
      <AdminModal open={elevateModal} onClose={handleElevateCancel} title="Danger Mode Required">
        <p className="mb-4 text-sm" style={{ color: "var(--adm-danger)" }}>Re-enter your admin password to unlock destructive operations for 10 minutes.</p>
        <form onSubmit={handleElevate} className="flex flex-col gap-3">
          <AdminInput type="password" value={elevatePassword} onChange={(e) => setElevatePassword(e.target.value)} placeholder="Admin password" autoFocus />
          {elevateError && <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{elevateError}</p>}
          <div className="flex gap-2">
            <AdminBtn type="button" variant="secondary" className="flex-1" onClick={handleElevateCancel}>Cancel</AdminBtn>
            <AdminBtn type="submit" variant="danger" className="flex-1" disabled={elevating || !elevatePassword}>
              {elevating ? "Verifying..." : "Unlock Danger Mode"}
            </AdminBtn>
          </div>
        </form>
      </AdminModal>

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-sm" style={{ borderBottom: "1px solid var(--adm-border)", backgroundColor: "var(--adm-bg)" }}>
        <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-4 lg:py-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => navigate(adminPath(basePath, ""))} className="inline-flex opacity-70 transition hover:opacity-100">
              <span className="font-Manrope text-sm font-bold" style={{ color: "var(--adm-accent)" }}>Coachable</span>
            </button>
            <span className="rounded px-2 py-0.5 text-[10px] font-normal uppercase tracking-wider" style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}>Admin</span>
            {dangerMinsDisplay && (
              <span className="animate-pulse rounded px-2 py-0.5 text-[10px] font-normal uppercase tracking-wider" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>
                ⚠ Danger · {dangerMinsDisplay}
              </span>
            )}
          </div>
          <div className="flex w-full items-center gap-0.5 overflow-x-auto rounded-[var(--adm-radius-sm)] p-0.5 lg:w-auto" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
            {[
              { key: "plays", icon: <FiFolder className="text-[10px]" />, label: "Plays" },
              { key: "sections", icon: <FiLayout className="text-[10px]" />, label: "Page Sections" },
              { key: "playbooks", icon: <FiBookOpen className="text-[10px]" />, label: "Playbook Sections" },
              { key: "presets", icon: <FiSliders className="text-[10px]" />, label: "Sport Presets" },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-normal transition"
                style={activeTab === key
                  ? { backgroundColor: "var(--adm-accent)", color: "#fff" }
                  : { color: "var(--adm-muted)" }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          <span className="text-xs" style={{ color: "var(--adm-muted)" }}>{plays.length} total</span>
          <div className="flex w-full flex-wrap items-center gap-2 lg:ml-auto lg:w-auto lg:justify-end">
            <AdminBtn variant="primary" size="sm" onClick={handleNew}><FiPlus className="mr-1 inline" /> New Play</AdminBtn>
            <AdminBtn variant="secondary" size="sm" onClick={() => navigate(adminPath(basePath, ""))}>Dashboard</AdminBtn>
          </div>
        </div>
      </div>

      {sections.filter((s) => s.isPriority && !s.playId).length > 0 && (
        <div className="z-10 flex flex-wrap items-start gap-3 px-4 py-3 backdrop-blur-sm sm:px-6 lg:sticky lg:top-[59px]" style={{ borderBottom: "1px solid rgba(251,191,36,0.3)", backgroundColor: "rgba(251,191,36,0.08)" }}>
          <svg className="h-4 w-4 shrink-0" style={{ color: "var(--adm-warning)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="flex-1 text-xs font-medium" style={{ color: "var(--adm-warning)" }}>
            <span className="font-normal">Priority sections need a play — </span>
            {sections.filter((s) => s.isPriority && !s.playId).map((s) => s.label).join(", ")}
          </p>
          <button onClick={() => setActiveTab("sections")} className="rounded px-2 py-1 text-xs font-normal transition" style={{ color: "var(--adm-warning)" }}>Go to Sections</button>
        </div>
      )}

      {deletionWarning && (
        <div className="z-10 flex flex-wrap items-start gap-3 px-4 py-3 backdrop-blur-sm sm:px-6 lg:sticky lg:top-[59px]" style={{ borderBottom: "1px solid var(--adm-danger)", backgroundColor: "var(--adm-danger-dim)" }}>
          <svg className="h-4 w-4 shrink-0" style={{ color: "var(--adm-danger)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="flex-1 text-xs font-medium" style={{ color: "var(--adm-danger)" }}>
            <span className="font-normal">Page section unlinked — </span>{deletionWarning}
          </p>
          <button onClick={() => setDeletionWarning(null)} className="rounded p-1 transition" style={{ color: "var(--adm-danger)" }}>
            <FiX className="text-sm" />
          </button>
        </div>
      )}

      {activeTab === "sections" && (
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <h2 className="mb-1 font-Manrope text-base font-bold" style={{ color: "var(--adm-text)" }}>Page Sections</h2>
          <p className="mb-6 text-xs" style={{ color: "var(--adm-muted)" }}>Assign a platform play to each section. The play&apos;s animation will be shown as a live preview on that page.</p>
          {error && <div className="mb-4 rounded-[var(--adm-radius-sm)] px-4 py-2 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{error}</div>}
          {loading ? (
            <div className="flex items-center justify-center py-20"><AdminSpinner size={32} /></div>
          ) : (
            <div className="space-y-3">
              {sections.map((section) => (
                <SectionRow key={section.sectionKey} section={section} plays={plays} onAssign={handleAssignSection} onTogglePriority={handleTogglePriority} />
              ))}
              {sections.length === 0 && <p className="text-sm" style={{ color: "var(--adm-muted)" }}>No sections defined yet.</p>}
            </div>
          )}
        </div>
      )}

      {/* Playbook Sections tab */}
      {activeTab === "playbooks" && (
        <PlaybookSectionPanel
          session={session}
          allPlays={plays}
          folders={folders}
          error={error}
          setError={setError}
        />
      )}

      {activeTab === "presets" && (
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <h2 className="mb-1 font-Manrope text-base font-bold" style={{ color: "var(--adm-text)" }}>Sport Presets</h2>
          <p className="mb-6 text-xs" style={{ color: "var(--adm-muted)" }}>Manage starting-canvas presets for each sport. Click a sport to view and create presets for it.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRESET_SPORTS.map((sport) => {
              const count = sportPresets.filter((p) => p.sport === sport).length;
              return (
                <button
                  key={sport}
                  type="button"
                  onClick={() => navigate(`${adminPath(basePath, "/presets")}/${encodeURIComponent(sport)}`)}
                  className="group flex flex-col gap-3 rounded-[var(--adm-radius)] p-4 text-left transition"
                  style={{ border: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface2)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-Manrope text-sm font-normal" style={{ color: "var(--adm-text)" }}>{sport}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-normal" style={count > 0 ? { backgroundColor: "rgba(52,211,153,0.12)", color: "#34d399" } : { backgroundColor: "var(--adm-surface3)", color: "var(--adm-muted)" }}>
                      {count > 0 ? `${count} ${count === 1 ? "preset" : "presets"}` : "None"}
                    </span>
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 text-[11px] font-normal opacity-0 transition group-hover:opacity-100" style={{ color: "var(--adm-accent)" }}>
                    <FiSliders className="text-xs" /> Manage
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "plays" && (
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8 lg:flex-row lg:gap-6">
          {/* Folder sidebar */}
          <aside className="w-full shrink-0 lg:w-52">
            <p className="mb-2 px-1 text-[10px] font-normal uppercase tracking-wider" style={{ color: "var(--adm-muted)" }}>Folders</p>
            <button
              onClick={() => setCurrentFolderId(null)}
              className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition"
              style={currentFolderId === null ? { backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" } : { color: "var(--adm-muted)" }}
            >
              <FiFolder className="text-xs" />
              <span className="flex-1">All Plays</span>
              <span className="text-[10px] opacity-60">{plays.length}</span>
            </button>
            <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1 lg:max-h-none lg:overflow-visible lg:pr-0">
              {folders.map((folder) => (
                <FolderItem key={folder.id} folder={folder} isActive={currentFolderId === folder.id} onClick={() => setCurrentFolderId(folder.id)} onRename={folder.isSportFolder ? null : handleRenameFolder} onDelete={folder.isSportFolder ? null : handleDeleteFolder} />
              ))}
            </div>
            {newFolderMode ? (
              <div className="mt-2">
                <input
                  ref={newFolderRef}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") { setNewFolderMode(false); setNewFolderName(""); } }}
                  onBlur={handleCreateFolder}
                  placeholder="Folder name"
                  className="w-full rounded-[var(--adm-radius-sm)] px-2.5 py-1.5 text-xs outline-none"
                  style={{ border: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface2)", color: "var(--adm-text)" }}
                />
              </div>
            ) : (
              <button
                onClick={() => setNewFolderMode(true)}
                className="mt-3 flex w-full items-center gap-1.5 rounded-lg border-dashed px-2.5 py-2 text-xs transition"
                style={{ border: "1px dashed var(--adm-border)", color: "var(--adm-muted)" }}
              >
                <FiFolderPlus className="text-xs" /> New Folder
              </button>
            )}
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-wrap items-center gap-1 text-xs" style={{ color: "var(--adm-muted)" }}>
                <button onClick={() => setCurrentFolderId(null)} className="transition" style={!currentFolderId ? { fontWeight: 600, color: "var(--adm-text)" } : {}}>All</button>
                {currentFolder && (
                  <><FiChevronRight className="text-[10px]" /><span className="font-normal" style={{ color: "var(--adm-text)" }}>{currentFolder.name}</span></>
                )}
              </div>
              <div className="relative w-full lg:max-w-sm lg:flex-1">
                <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--adm-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
                </svg>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plays..." className="w-full rounded-[var(--adm-radius-sm)] py-2 pl-9 pr-3 text-sm outline-none" style={{ border: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface2)", color: "var(--adm-text)" }} />
              </div>
              {search && <button onClick={() => setSearch("")} className="text-xs" style={{ color: "var(--adm-muted)" }}>Clear</button>}
              <select value={playSort} onChange={(e) => setPlaySort(e.target.value)} className="w-full cursor-pointer rounded-[var(--adm-radius-sm)] px-2.5 py-2 text-xs outline-none sm:w-auto sm:shrink-0" style={{ border: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface2)", color: "var(--adm-text)" }}>
                <option value="custom">Custom Order</option>
                <option value="updated">Recently Updated</option>
                <option value="created">Recently Created</option>
                <option value="az">Name A→Z</option>
                <option value="za">Name Z→A</option>
              </select>
            </div>

            {error && <div className="mb-4 rounded-[var(--adm-radius-sm)] px-4 py-2 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{error}</div>}
            {loading && <div className="flex items-center justify-center py-20"><AdminSpinner size={32} /></div>}

            {!loading && visiblePlays.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-[var(--adm-radius)] py-20 text-center" style={{ border: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface2)" }}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--adm-radius)]" style={{ backgroundColor: "var(--adm-accent-dim)" }}>
                  <FiFolder className="h-6 w-6" style={{ color: "var(--adm-accent)" }} />
                </div>
                <p className="font-Manrope text-sm font-normal" style={{ color: "var(--adm-text)" }}>
                  {search ? "No plays match your search" : currentFolder ? `No plays in "${currentFolder.name}"` : "No platform plays yet"}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--adm-muted)" }}>{search ? "Try a different search term" : "Create your first play to feature on the landing page"}</p>
                {!search && <AdminBtn variant="primary" className="mt-5" onClick={handleNew}><FiPlus className="mr-1 inline" /> New Play</AdminBtn>}
              </div>
            )}

            {!loading && visiblePlays.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visiblePlays.map((play) => (
                  <div
                    key={play.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragSrcId(play.id); }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragSrcId !== play.id) setDragOverId(play.id); }}
                    onDrop={(e) => { e.preventDefault(); handleReorderPlay(dragSrcId, play.id); }}
                    onDragEnd={() => { setDragSrcId(null); setDragOverId(null); }}
                    className={`rounded-[var(--adm-radius)] transition ${dragOverId === play.id && dragSrcId !== play.id ? "opacity-60 ring-2 ring-[var(--adm-accent)]" : ""}`}
                  >
                    <PlayCard play={play} folders={folders} playbookSections={playbookSections} onEdit={handleEdit} onDelete={handleDelete} onMove={handleMove} onDuplicate={handleDuplicate} onAddToSection={handleAddToSection} onTagsUpdate={handleUpdateTags} onRename={handleRenamePlay} allTags={allTags} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmModal}
        message={confirmModal?.type === "play" ? `Delete "${confirmModal.item.title}"?` : `Delete folder "${confirmModal?.item.name}"?`}
        subtitle={confirmModal?.type === "play" ? "This cannot be undone." : "Plays inside will become un-foldered."}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmModal(null)}
      />
    </AdminShell>
  );
}
