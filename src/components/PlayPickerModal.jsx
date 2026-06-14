/**
 * Reusable modal for browsing platform plays by folder and selecting one for GIF embed.
 * Used by both the one-time email composer and the recurring campaign modal.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiFilm, FiFolder, FiSearch, FiX } from "react-icons/fi";
import { Button, Spinner } from "../design-system/components";

/**
 * @param {{ plays: Array, folders: Array, loading: boolean, error: string,
 *           onSelect: (play: object) => void, onClose: () => void }} props
 */
export default function PlayPickerModal({ plays, folders, loading, error, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [selectedPlay, setSelectedPlay] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const filteredPlays = useMemo(() => {
    let list = plays;
    if (activeFolderId !== null) {
      list = list.filter((p) => p.folderId === activeFolderId);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.title?.toLowerCase().includes(q));
    }
    return list;
  }, [plays, activeFolderId, search]);

  const handleConfirm = useCallback(() => {
    if (!selectedPlay) return;
    onSelect(selectedPlay);
  }, [selectedPlay, onSelect]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl"
        style={{
          backgroundColor: "var(--adm-surface)",
          border: "1px solid var(--adm-border)",
          maxHeight: "80vh",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--adm-border)" }}>
          <div className="flex items-center gap-2">
            <FiFilm style={{ color: "var(--adm-accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Insert Play GIF</span>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity hover:opacity-70" style={{ color: "var(--adm-muted)" }}>
            <FiX />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border2)" }}>
            <FiSearch className="shrink-0 text-sm" style={{ color: "var(--adm-muted)" }} />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveFolderId(null); }}
              placeholder="Search plays…"
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: "var(--adm-text)" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} style={{ color: "var(--adm-muted)" }}>
                <FiX className="text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* Body: folders + plays */}
        <div className="flex flex-1 overflow-hidden">
          {!search && (
            <div className="flex w-44 shrink-0 flex-col overflow-y-auto" style={{ borderRight: "1px solid var(--adm-border)" }}>
              <button
                type="button"
                onClick={() => setActiveFolderId(null)}
                className="px-4 py-2.5 text-left text-xs font-semibold transition-colors"
                style={{
                  color: activeFolderId === null ? "var(--adm-accent)" : "var(--adm-text)",
                  backgroundColor: activeFolderId === null ? "var(--adm-accent-dim)" : "transparent",
                }}
              >
                All plays
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFolderId(f.id)}
                  className="flex items-center gap-2 px-4 py-2.5 text-left text-xs transition-colors"
                  style={{
                    color: activeFolderId === f.id ? "var(--adm-accent)" : "var(--adm-text)",
                    backgroundColor: activeFolderId === f.id ? "var(--adm-accent-dim)" : "transparent",
                  }}
                >
                  <FiFolder className="shrink-0" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-1 flex-col overflow-y-auto">
            {loading ? (
              <div className="flex flex-1 items-center justify-center p-8 gap-2 text-xs" style={{ color: "var(--adm-muted)" }}>
                <Spinner size={14} /> Loading plays…
              </div>
            ) : error ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 gap-1 text-xs" style={{ color: "var(--adm-danger)" }}>
                <span className="font-semibold">Failed to load plays</span>
                <span style={{ color: "var(--adm-muted)" }}>{error}</span>
              </div>
            ) : filteredPlays.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-8 text-xs" style={{ color: "var(--adm-muted)" }}>
                {search ? `No plays match "${search}"` : plays.length === 0 ? "No platform plays found" : "No plays in this folder"}
              </div>
            ) : (
              filteredPlays.map((play) => {
                const isSelected = selectedPlay?.id === play.id;
                return (
                  <button
                    key={play.id}
                    type="button"
                    onClick={() => setSelectedPlay(isSelected ? null : play)}
                    className="flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{
                      backgroundColor: isSelected ? "var(--adm-accent-dim)" : "transparent",
                      borderBottom: "1px solid var(--adm-border)",
                    }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: isSelected ? "var(--adm-accent)" : "var(--adm-surface2)" }}>
                      <FiFilm className="text-xs" style={{ color: isSelected ? "#fff" : "var(--adm-muted)" }} />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-semibold" style={{ color: "var(--adm-text)" }}>{play.title}</span>
                      {play.sport && <span className="truncate text-[10px]" style={{ color: "var(--adm-muted)" }}>{play.sport}</span>}
                    </div>
                    {isSelected && <FiCheck className="ml-auto shrink-0" style={{ color: "var(--adm-accent)" }} />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: "1px solid var(--adm-border)" }}>
          <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
            {selectedPlay ? `Selected: ${selectedPlay.title}` : "Select a play to insert"}
          </span>
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleConfirm} disabled={!selectedPlay}>
              <FiFilm className="text-sm" />
              Generate &amp; Insert GIF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
