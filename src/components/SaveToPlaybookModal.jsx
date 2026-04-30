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
import { createPlay, updatePlay, fetchPlay, movePlayToFolder } from "../utils/apiPlays";
import { fetchFolders, createFolder as apiCreateFolder } from "../utils/apiFolders";
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
  const teamId = user?.teamId;
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [playName, setPlayName] = useState("");
  const [notes, setNotes] = useState("");
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [sourcePlay, setSourcePlay] = useState(null);
  const newFolderRef = useRef(null);
  /** Tracks in-flight folder creation: { tempId, promise: Promise<realId|null> } */
  const pendingFolderRef = useRef(null);

  useEffect(() => {
    if (!open || !teamId) return;
    setSelectedFolderId(null);
    setFolderPath([]);
    setPlayName(initialPlayName || "");
    setNotes("");
    setNewFolderMode(false);
    setNewFolderName("");
    setSaving(false);
    setSaveError(null);
    setSourcePlay(null);

    fetchFolders(teamId).then((f) => setFolders(f)).catch(() => setFolders([]));

    if (sourcePlayId) {
      fetchPlay(teamId, sourcePlayId)
        .then((p) => {
          setSourcePlay(p);
          setNotes(p?.notes || "");
        })
        .catch(() => {});
    }
  }, [open, initialPlayName, sourcePlayId, teamId]);

  useEffect(() => {
    if (newFolderMode) newFolderRef.current?.focus();
  }, [newFolderMode]);

  const currentFolderId = folderPath[folderPath.length - 1] ?? null;
  const visibleFolders = folders.filter((f) => f.parentId === currentFolderId);

  const handleCreateFolder = useCallback(() => {
    const trimmed = newFolderName.trim();
    if (!trimmed || !teamId) {
      setNewFolderMode(false);
      return;
    }
    const tempId = "f-" + Date.now();
    const newFolder = { id: tempId, name: trimmed, parentId: currentFolderId, tags: [], playIds: [] };
    setFolders((prev) => [...prev, newFolder]);
    setSelectedFolderId(tempId);
    setNewFolderName("");
    setNewFolderMode(false);
    const promise = apiCreateFolder(teamId, { name: trimmed, parentId: currentFolderId })
      .then((created) => {
        setFolders((prev) => prev.map((f) => (f.id === tempId ? { ...f, id: created.id } : f)));
        setSelectedFolderId((prev) => (prev === tempId ? created.id : prev));
        return created.id;
      })
      .catch(() => null);
    pendingFolderRef.current = { tempId, promise };
  }, [newFolderName, currentFolderId, teamId]);

  const handleNavigateFolder = useCallback((folderId) => {
    setFolderPath((prev) => [...prev, folderId]);
    setSelectedFolderId(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!playName.trim() || saving || !teamId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const trimmedPlayName = playName.trim();
      const trimmedNotes = notes.trim();
      const noteAuthorName = trimmedNotes
        ? String(user?.name || user?.email || "Coach").trim()
        : "";
      const normalizedPlayName = normalizePlayName(trimmedPlayName);
      const sameNameAsSource =
        Boolean(sourcePlay) && normalizePlayName(sourcePlay.title) === normalizedPlayName;

      let entry = null;
      if (sameNameAsSource && sourcePlayId) {
        entry = await updatePlay(teamId, sourcePlayId, {
          title: trimmedPlayName,
          playData,
          notes: trimmedNotes,
          notesAuthorName: noteAuthorName,
        });
      }
      if (!entry) {
        entry = await createPlay(teamId, {
          title: trimmedPlayName,
          tags: Array.isArray(sourcePlay?.tags) ? sourcePlay.tags : [],
          playData,
          notes: trimmedNotes,
          notesAuthorName: noteAuthorName,
        });
      }

      let requestedFolderId = selectedFolderId || currentFolderId || null;
      // If the folder was just created and its API call is still in-flight, wait for the real UUID.
      if (requestedFolderId?.startsWith("f-") && pendingFolderRef.current?.tempId === requestedFolderId) {
        requestedFolderId = await pendingFolderRef.current.promise;
      }
      if (requestedFolderId && !requestedFolderId.startsWith("f-")) {
        await movePlayToFolder(teamId, entry.id, requestedFolderId).catch(() => {});
      }

      onSaved?.({ ...entry, folderId: requestedFolderId });
      onClose?.();
    } catch (err) {
      setSaving(false);
      setSaveError(err?.message || "Failed to save play. Please try again.");
    }
  }, [playName, notes, selectedFolderId, currentFolderId, playData, sourcePlayId, sourcePlay, user, saving, teamId, onSaved, onClose]);

  if (!open) return null;

  const canSave = playName.trim() && !saving;

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

          <section className="lg:w-[60%] flex flex-col gap-3 min-h-0 overflow-hidden">
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

            <div className="flex flex-col gap-1.5 overflow-y-auto hide-scroll pr-1 min-h-0 flex-1">
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
                        {folder.playIds?.length || 0} play{(folder.playIds?.length || 0) !== 1 ? "s" : ""}
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
