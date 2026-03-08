import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaTimes, FaFolder, FaFolderOpen, FaPlus, FaChevronDown } from "react-icons/fa";
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
  loadTeams,
  addTeam,
  loadActiveTeamId,
  saveActiveTeamId,
  getFoldersForTeam,
  addFolderForTeam,
  getPlayCountsByFolder,
  savePlayToPlaybook,
} from "../utils/playbookStorage";

export default function SaveToPlaybookModal({
  open,
  playName: initialPlayName,
  thumbnailDataUrl,
  playData,
  onClose,
  onSaved,
}) {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [playName, setPlayName] = useState("");
  const [notes, setNotes] = useState("");
  const [playCounts, setPlayCounts] = useState({});
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewShape, setPreviewShape] = useState("wide");

  // Initialize state when modal opens.
  useEffect(() => {
    if (!open) return;
    const loadedTeams = loadTeams();
    setTeams(loadedTeams);
    const activeId = loadActiveTeamId();
    const teamId =
      loadedTeams.find((t) => t.id === activeId)?.id || loadedTeams[0]?.id;
    setSelectedTeamId(teamId);
    setPlayName(initialPlayName || "");
    setNotes("");
    setShowNewTeam(false);
    setNewTeamName("");
    setShowNewFolder(false);
    setNewFolderName("");
    setTeamDropdownOpen(false);
    setSaving(false);
    setPreviewShape("wide");
  }, [open, initialPlayName]);

  // Load folders when team changes.
  useEffect(() => {
    if (!selectedTeamId) return;
    const f = getFoldersForTeam(selectedTeamId);
    setFolders(f);
    setSelectedFolderId(f[0]?.id || null);
    setPlayCounts(getPlayCountsByFolder(selectedTeamId));
  }, [selectedTeamId]);

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId),
    [teams, selectedTeamId]
  );

  const handleTeamSelect = useCallback((teamId) => {
    setSelectedTeamId(teamId);
    saveActiveTeamId(teamId);
    setTeamDropdownOpen(false);
  }, []);

  const handleAddTeam = useCallback(() => {
    const trimmed = newTeamName.trim();
    if (!trimmed) return;
    const { teams: updated, team } = addTeam(trimmed);
    setTeams(updated);
    setSelectedTeamId(team.id);
    saveActiveTeamId(team.id);
    setNewTeamName("");
    setShowNewTeam(false);
  }, [newTeamName]);

  const handleAddFolder = useCallback(() => {
    const trimmed = newFolderName.trim();
    if (!trimmed || !selectedTeamId) return;
    const { folders: updated, folder } = addFolderForTeam(selectedTeamId, trimmed);
    setFolders(updated);
    setSelectedFolderId(folder.id);
    setNewFolderName("");
    setShowNewFolder(false);
  }, [newFolderName, selectedTeamId]);

  const handleSave = useCallback(() => {
    if (!playName.trim() || !selectedTeamId || !selectedFolderId || saving) return;
    setSaving(true);
    try {
      const entry = savePlayToPlaybook({
        teamId: selectedTeamId,
        folderId: selectedFolderId,
        playName: playName.trim(),
        thumbnail: thumbnailDataUrl || null,
        playData,
        notes,
      });
      onSaved?.(entry);
      onClose?.();
    } catch {
      setSaving(false);
    }
  }, [playName, selectedTeamId, selectedFolderId, thumbnailDataUrl, playData, notes, saving, onSaved, onClose]);

  if (!open) return null;

  const canSave = playName.trim() && selectedTeamId && selectedFolderId && !saving;

  return (
    <div className={POPUP_MODAL_OVERLAY_CLASS} onClick={onClose}>
      <div
        className={`relative w-[94vw] max-w-6xl p-4 sm:p-6 flex flex-col gap-4 max-h-[92vh] overflow-hidden ${POPUP_SURFACE_CLASS}`}
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
            Pick a team and folder, then save this play.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 min-h-0 flex-1 overflow-hidden">
          {/* Left panel: preview + metadata */}
          <section className="lg:w-[38%] flex flex-col gap-3 min-h-0">
            <div className="flex items-center justify-between">
              <label className={POPUP_LABEL_CLASS}>Preview Shape</label>
              <div className="inline-flex rounded-md border border-BrandGray2/50 bg-BrandBlack2 p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewShape("square")}
                  className={`h-7 px-2.5 rounded text-[11px] font-DmSans transition-colors ${
                    previewShape === "square"
                      ? "bg-BrandOrange/20 text-BrandOrange"
                      : "text-BrandGray hover:text-BrandWhite"
                  }`}
                >
                  Square
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewShape("wide")}
                  className={`h-7 px-2.5 rounded text-[11px] font-DmSans transition-colors ${
                    previewShape === "wide"
                      ? "bg-BrandOrange/20 text-BrandOrange"
                      : "text-BrandGray hover:text-BrandWhite"
                  }`}
                >
                  Wide
                </button>
              </div>
            </div>

            <PlayPreviewCard
              playData={playData}
              fallbackImageSrc={thumbnailDataUrl}
              autoplay="always"
              cameraMode="fit-distribution"
              background="field"
              paddingPx={26}
              minSpanPx={150}
              shape={previewShape}
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

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={`${POPUP_PRIMARY_BUTTON_CLASS} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {saving ? "Saving..." : "Save to Playbook"}
            </button>
          </section>

          {/* Right panel: team + folder bento grid */}
          <section className="lg:w-[62%] flex flex-col gap-3 min-h-0 overflow-hidden">
            {/* Team selector */}
            <div className="flex flex-col gap-1.5">
              <label className={POPUP_LABEL_CLASS}>Team</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTeamDropdownOpen((v) => !v)}
                  className="w-full h-9 bg-BrandBlack2 border border-BrandGray rounded-md px-3 text-BrandWhite text-sm font-DmSans flex items-center justify-between hover:border-BrandOrange/60 transition-colors"
                >
                  <span className="truncate">{selectedTeam?.name || "Select team"}</span>
                  <FaChevronDown
                    className={`text-[10px] text-BrandGray transition-transform ${teamDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {teamDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-BrandBlack2 border border-BrandGray2 rounded-md shadow-lg z-10 max-h-44 overflow-y-auto">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => handleTeamSelect(team.id)}
                        className={`w-full px-3 py-2 text-left text-sm font-DmSans transition-colors ${
                          team.id === selectedTeamId
                            ? "bg-BrandOrange/20 text-BrandOrange"
                            : "text-BrandWhite hover:bg-BrandGray2/30"
                        }`}
                      >
                        {team.name}
                      </button>
                    ))}
                    <div className="border-t border-BrandGray2/40">
                      {showNewTeam ? (
                        <div className="flex items-center gap-1 p-1.5">
                          <input
                            type="text"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
                            placeholder="Team name"
                            className="flex-1 h-7 bg-BrandBlack border border-BrandGray rounded px-2 text-BrandWhite text-xs font-DmSans focus:outline-none focus:border-BrandOrange"
                            maxLength={30}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleAddTeam}
                            disabled={!newTeamName.trim()}
                            className="h-7 px-2 rounded bg-BrandOrange/20 text-BrandOrange text-xs font-DmSans hover:bg-BrandOrange/30 disabled:opacity-40"
                          >
                            Add
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowNewTeam(true)}
                          className="w-full px-3 py-2 text-left text-xs font-DmSans text-BrandGray hover:text-BrandOrange hover:bg-BrandGray2/20 transition-colors flex items-center gap-1.5"
                        >
                          <FaPlus className="text-[8px]" /> Add New Team
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Folder selector */}
            <div className="flex items-center justify-between">
              <label className={POPUP_LABEL_CLASS}>Folder</label>
              {!showNewFolder && (
                <button
                  type="button"
                  onClick={() => setShowNewFolder(true)}
                  className="text-BrandGray hover:text-BrandOrange text-[11px] font-DmSans transition-colors flex items-center gap-1"
                >
                  <FaPlus className="text-[8px]" /> New Folder
                </button>
              )}
            </div>

            {showNewFolder && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddFolder();
                    if (e.key === "Escape") {
                      setShowNewFolder(false);
                      setNewFolderName("");
                    }
                  }}
                  placeholder="Folder name"
                  className="flex-1 h-8 bg-BrandBlack2 border border-BrandGray rounded-md px-2 text-BrandWhite text-xs font-DmSans focus:outline-none focus:border-BrandOrange"
                  maxLength={30}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddFolder}
                  disabled={!newFolderName.trim()}
                  className="h-8 px-2.5 rounded-md bg-BrandOrange/20 text-BrandOrange text-xs font-DmSans hover:bg-BrandOrange/30 disabled:opacity-40"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewFolder(false);
                    setNewFolderName("");
                  }}
                  className="h-8 px-2 rounded-md bg-BrandGray2/30 text-BrandGray text-xs font-DmSans hover:bg-BrandGray2/50"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto hide-scroll pr-1 min-h-0 flex-1">
              {folders.map((folder) => {
                const count = playCounts[folder.id] || 0;
                const isSelected = folder.id === selectedFolderId;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`relative rounded-2xl min-h-[110px] p-3 text-left transition-all border ${
                      isSelected
                        ? "bg-BrandOrange/15 border-BrandOrange/50 shadow-[0_0_0_1px_rgba(255,122,24,0.35)]"
                        : "bg-BrandGray2/15 border-BrandGray2/40 hover:bg-BrandGray2/30"
                    }`}
                  >
                    <div className="flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between">
                        {isSelected ? (
                          <FaFolderOpen className="text-BrandOrange text-2xl shrink-0" />
                        ) : (
                          <FaFolder className="text-BrandGray text-2xl shrink-0" />
                        )}
                        <span className="text-[10px] text-BrandGray font-DmSans rounded-full px-2 py-0.5 bg-BrandBlack/40">
                          {count} {count === 1 ? "play" : "plays"}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-DmSans break-words ${
                          isSelected ? "text-BrandOrange font-semibold" : "text-BrandWhite"
                        }`}
                      >
                        {folder.name}
                      </span>
                    </div>
                  </button>
                );
              })}
              {folders.length === 0 && (
                <div className="col-span-full rounded-xl border border-BrandGray2/40 bg-BrandGray2/10 p-4 text-center text-xs text-BrandGray font-DmSans">
                  No folders yet. Create one to save this play.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
