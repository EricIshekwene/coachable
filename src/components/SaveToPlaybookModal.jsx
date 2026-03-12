import React, { useCallback, useEffect, useState, useRef } from "react";
import { FaTimes, FaPlus } from "react-icons/fa";
import { FiFolder, FiChevronRight } from "react-icons/fi";
import PlayPreviewCard from "./PlayPreviewCard";
import {
  POPUP_CLOSE_BUTTON_CLASS,
  POPUP_INPUT_CLASS,
  POPUP_LABEL_CLASS,
  POPUP_MODAL_OVERLAY_CLASS,
  POPUP_PRIMARY_BUTTON_CLASS,
  POPUP_SURFACE_CLASS,
  POPUP_TITLE_CLASS,
} from "./subcomponents/popupStyles";
import {
  loadAppPlays,
  updateAppPlay,
  saveAppPlay,
  loadFolders,
  saveFolders,
} from "../utils/appPlaysStorage";
import { useAuth } from "../context/AuthContext";

const normalizePlayName = (value) => String(value ?? "").trim().toLowerCase();

export default function SaveToPlaybookModal({
  open,
  playName: initialPlayName,
  thumbnailDataUrl,
  playData,
  sourcePlayId = null,
  onClose,
  onSaved,
}) {
  const { user } = useAuth();
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null); // null = root (no folder)
  const [folderPath, setFolderPath] = useState([]); // breadcrumb navigation
  const [playName, setPlayName] = useState("");
  const [notes, setNotes] = useState("");
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const newFolderRef = useRef(null);

  // Initialize state when modal opens.
  useEffect(() => {
    if (!open) return;
    const allPlays = loadAppPlays();
    const sourcePlay = sourcePlayId
      ? allPlays.find((play) => play.id === sourcePlayId) || null
      : null;
    setFolders(loadFolders());
    setSelectedFolderId(null);
    setFolderPath([]);
    setPlayName(initialPlayName || "");
    setNotes(sourcePlay?.notes || "");
    setNewFolderMode(false);
    setNewFolderName("");
    setSaving(false);
    setSaveError(null);
  }, [open, initialPlayName, sourcePlayId]);

  // Auto-focus new folder input
  useEffect(() => {
    if (newFolderMode) newFolderRef.current?.focus();
  }, [newFolderMode]);

  // Current location in the folder tree
  const currentFolderId = folderPath[folderPath.length - 1] ?? null;
  const visibleFolders = folders.filter((f) => f.parentId === currentFolderId);

  const handleCreateFolder = useCallback(() => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setNewFolderMode(false);
      return;
    }
    const id = "f-" + Date.now();
    const newFolder = { id, name: trimmed, parentId: currentFolderId, tags: [], playIds: [] };
    const updated = [...folders, newFolder];
    saveFolders(updated);
    setFolders(updated);
    setSelectedFolderId(id);
    setNewFolderName("");
    setNewFolderMode(false);
  }, [newFolderName, currentFolderId, folders]);

  const handleNavigateFolder = useCallback((folderId) => {
    setFolderPath((prev) => [...prev, folderId]);
    setSelectedFolderId(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!playName.trim() || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const trimmedPlayName = playName.trim();
      const trimmedNotes = notes.trim();
      const noteAuthorName = trimmedNotes
        ? String(user?.name || user?.email || "Coach").trim()
        : "";
      const noteUpdatedAt = trimmedNotes ? new Date().toISOString() : null;
      const normalizedPlayName = normalizePlayName(trimmedPlayName);
      const allPlays = loadAppPlays();
      const sourcePlay = sourcePlayId
        ? allPlays.find((play) => play.id === sourcePlayId) || null
        : null;
      const sameNameAsSource =
        Boolean(sourcePlay) && normalizePlayName(sourcePlay.title) === normalizedPlayName;

      let entry = null;
      // Save as update when name matches the source play; otherwise save as a duplicate.
      if (sameNameAsSource) {
        entry = updateAppPlay(sourcePlay.id, {
          title: trimmedPlayName,
          playData,
          notes: trimmedNotes,
          notesAuthorName: noteAuthorName,
          notesUpdatedAt: noteUpdatedAt,
          updatedAt: new Date().toISOString(),
        });
      }
      if (!entry) {
        entry = saveAppPlay({
          playName: trimmedPlayName,
          playData,
          tags: Array.isArray(sourcePlay?.tags) ? sourcePlay.tags : [],
          notes: trimmedNotes,
          notesAuthorName: noteAuthorName,
          notesUpdatedAt: noteUpdatedAt,
        });
      }

      // Move this play to the selected folder (or root), not add to multiple folders.
      const requestedFolderId = selectedFolderId || currentFolderId || null;
      const latestFolders = loadFolders();
      const targetFolderId = latestFolders.some((folder) => folder.id === requestedFolderId)
        ? requestedFolderId
        : null;
      const updatedFolders = latestFolders.map((folder) => {
        const withoutPlay = Array.isArray(folder.playIds)
          ? folder.playIds.filter((id) => id !== entry.id)
          : [];
        if (folder.id === targetFolderId) {
          return { ...folder, playIds: [...withoutPlay, entry.id] };
        }
        return withoutPlay.length === (folder.playIds || []).length
          ? folder
          : { ...folder, playIds: withoutPlay };
      });
      saveFolders(updatedFolders);
      setFolders(updatedFolders);

      onSaved?.({ ...entry, folderId: targetFolderId });
      onClose?.();
    } catch (err) {
      setSaving(false);
      setSaveError(err?.message || "Failed to save play. Please try again.");
    }
  }, [playName, notes, selectedFolderId, currentFolderId, playData, sourcePlayId, user, saving, onSaved, onClose]);

  if (!open) return null;

  const canSave = playName.trim() && !saving;

  // Determine save location label
  const getSaveLocationLabel = () => {
    if (selectedFolderId) {
      const f = folders.find((fol) => fol.id === selectedFolderId);
      return f ? f.name : "Selected folder";
    }
    if (currentFolderId) {
      const f = folders.find((fol) => fol.id === currentFolderId);
      return f ? f.name : "Current folder";
    }
    return "All Plays (root)";
  };

  return (
    <div className={POPUP_MODAL_OVERLAY_CLASS} onClick={onClose}>
      <div
        className={`relative w-[94vw] max-w-3xl p-4 sm:p-6 flex flex-col gap-4 max-h-[92vh] overflow-hidden ${POPUP_SURFACE_CLASS}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className={POPUP_CLOSE_BUTTON_CLASS}
          aria-label="Close"
        >
          <FaTimes className="text-sm" />
        </button>

        <div className="pr-8">
          <h2 className={POPUP_TITLE_CLASS}>Save to Playbook</h2>
          <p className="text-BrandGray text-xs font-DmSans mt-1">
            Save this play to your library. Optionally pick a folder.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 min-h-0 flex-1 overflow-hidden">
          {/* Left panel: preview + metadata */}
          <section className="lg:w-[40%] flex flex-col gap-3 min-h-0">
            <PlayPreviewCard
              playData={playData}
              fallbackImageSrc={thumbnailDataUrl}
              autoplay="always"
              cameraMode="fit-distribution"
              background="field"
              paddingPx={26}
              minSpanPx={150}
              shape="fill"
            />

            <div className="flex flex-col gap-1.5">
              <label className={POPUP_LABEL_CLASS}>Play Name</label>
              <input
                type="text"
                value={playName}
                onChange={(e) => setPlayName(e.target.value)}
                placeholder="e.g. Inside Centre Crash"
                className={POPUP_INPUT_CLASS}
                maxLength={50}
              />
            </div>

            <div className="flex flex-col gap-1.5 min-h-0">
              <label className={POPUP_LABEL_CLASS}>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about this play..."
                className="w-full h-24 sm:h-28 lg:flex-1 min-h-[96px] bg-BrandBlack2 border border-BrandGray rounded-md px-3 py-2 text-BrandWhite text-xs font-DmSans focus:outline-none focus:border-BrandOrange transition-colors resize-none"
                maxLength={200}
              />
            </div>

            {saveError && (
              <p className="text-red-400 text-[11px] font-DmSans">{saveError}</p>
            )}

            {/* Save location indicator */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-BrandGray2/10 border border-BrandGray2/20">
              <FiFolder className="text-sm text-BrandOrange shrink-0" />
              <span className="text-[11px] text-BrandGray font-DmSans truncate">
                Saving to: <span className="text-BrandText">{getSaveLocationLabel()}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={`${POPUP_PRIMARY_BUTTON_CLASS} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {saving ? "Saving..." : "Save Play"}
            </button>
          </section>

          {/* Right panel: folder browser */}
          <section className="lg:w-[60%] flex flex-col gap-3 min-h-0 overflow-hidden">
            {/* Breadcrumb */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs font-DmSans">
                <button
                  onClick={() => {
                    setFolderPath([]);
                    setSelectedFolderId(null);
                  }}
                  className={`transition hover:text-BrandText ${
                    folderPath.length === 0 ? "text-BrandText font-semibold" : "text-BrandGray"
                  }`}
                >
                  All Plays
                </button>
                {folderPath.map((fId, idx) => {
                  const f = folders.find((fol) => fol.id === fId);
                  const isLast = idx === folderPath.length - 1;
                  return (
                    <div key={fId} className="flex items-center gap-1">
                      <FiChevronRight className="text-[8px] text-BrandGray2" />
                      {isLast ? (
                        <span className="text-BrandText font-semibold">{f?.name}</span>
                      ) : (
                        <button
                          onClick={() => {
                            setFolderPath(folderPath.slice(0, idx + 1));
                            setSelectedFolderId(null);
                          }}
                          className="text-BrandGray transition hover:text-BrandText"
                        >
                          {f?.name}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {folderPath.length < 4 && !newFolderMode && (
                <button
                  type="button"
                  onClick={() => setNewFolderMode(true)}
                  className="flex items-center gap-1.5 text-[11px] font-DmSans text-BrandGray hover:text-BrandOrange transition-colors"
                >
                  <FaPlus className="text-[8px]" /> New Folder
                </button>
              )}
            </div>

            {/* Folder list */}
            <div className="flex flex-col gap-1.5 overflow-y-auto hide-scroll pr-1 min-h-0 flex-1">
              {/* "Save here" option for current browsed folder */}
              {currentFolderId && (
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(null)}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 transition ${
                    selectedFolderId === null
                      ? "border-BrandOrange/40 bg-BrandOrange/5"
                      : "border-BrandGray2/20 bg-BrandBlack2/30 hover:border-BrandGray2/40"
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                    selectedFolderId === null ? "bg-BrandOrange/20" : "bg-BrandGray2/15"
                  }`}>
                    <FiFolder className={`text-base ${selectedFolderId === null ? "text-BrandOrange" : "text-BrandGray"}`} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className={`text-sm font-semibold ${selectedFolderId === null ? "text-BrandOrange" : "text-BrandText"}`}>
                      Save in this folder
                    </p>
                    <p className="text-[11px] text-BrandGray2">
                      {folders.find((f) => f.id === currentFolderId)?.name}
                    </p>
                  </div>
                </button>
              )}

              {visibleFolders.map((folder) => {
                const isSelected = folder.id === selectedFolderId;
                const subFolderCount = folders.filter((f) => f.parentId === folder.id).length;
                return (
                  <div
                    key={folder.id}
                    className={`group relative flex items-center gap-3 rounded-xl border p-3.5 transition cursor-pointer ${
                      isSelected
                        ? "border-BrandOrange/40 bg-BrandOrange/5 shadow-[0_0_0_1px_rgba(255,122,24,0.15)]"
                        : "border-BrandGray2/20 bg-BrandBlack2/30 hover:border-BrandGray2/40"
                    }`}
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                      isSelected ? "bg-BrandOrange/20" : "bg-BrandGray2/15"
                    }`}>
                      <FiFolder className={`text-base ${isSelected ? "text-BrandOrange" : "text-BrandGray"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${isSelected ? "text-BrandOrange" : "text-BrandText"}`}>
                        {folder.name}
                      </p>
                      <p className="text-[11px] text-BrandGray2">
                        {folder.playIds.length} play{folder.playIds.length !== 1 ? "s" : ""}
                        {subFolderCount > 0 && ` · ${subFolderCount} subfolder${subFolderCount !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                    {subFolderCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigateFolder(folder.id);
                        }}
                        className="shrink-0 rounded-md p-1.5 text-BrandGray2 transition hover:bg-BrandBlack2 hover:text-BrandText opacity-0 group-hover:opacity-100"
                        title="Browse subfolders"
                      >
                        <FiChevronRight className="text-sm" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* New folder inline input */}
              {newFolderMode && (
                <div className="flex items-center gap-3 rounded-xl border border-BrandOrange/40 bg-BrandOrange/5 p-3.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-BrandOrange/20">
                    <FiFolder className="text-base text-BrandOrange" />
                  </div>
                  <input
                    ref={newFolderRef}
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onBlur={handleCreateFolder}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder();
                      if (e.key === "Escape") {
                        setNewFolderMode(false);
                        setNewFolderName("");
                      }
                    }}
                    placeholder="Folder name..."
                    className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-BrandGray2 text-BrandWhite font-DmSans"
                    maxLength={30}
                  />
                </div>
              )}

              {visibleFolders.length === 0 && !newFolderMode && (
                <div className="rounded-xl border border-BrandGray2/20 bg-BrandBlack2/20 p-6 text-center">
                  <FiFolder className="mx-auto text-xl text-BrandGray2/40 mb-2" />
                  <p className="text-xs text-BrandGray2 font-DmSans">
                    {currentFolderId ? "No subfolders here." : "No folders yet."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setNewFolderMode(true)}
                    className="mt-2 text-[11px] text-BrandOrange font-DmSans hover:underline"
                  >
                    Create a folder
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
