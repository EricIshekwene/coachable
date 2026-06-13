import { useState, useEffect, useRef } from "react";
import {
  FiEdit2, FiTrash2, FiFolder, FiChevronRight, FiLink, FiCheck, FiX,
  FiBookOpen, FiMoreHorizontal, FiClock, FiTag, FiCopy,
} from "react-icons/fi";
import PlayPreviewCard from "../../components/PlayPreviewCard";
import { PANEL_STYLE, MENU_STYLE, MENU_DIVIDER_STYLE } from "./adminPlayStyles";

/**
 * Formats an ISO timestamp as a short relative string ("Just now", "5m ago",
 * "3h ago", "2d ago", "4w ago").
 * @param {string} isoString - ISO date string (may be empty/nullish).
 * @returns {string}
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

/**
 * Copy-link menu item with its own copied-flash state.
 * @param {Object} props
 * @param {Object} props.play - Platform play object (uses `play.id` for the URL).
 * @param {Function} props.onClose - Called to close the parent menu after copying.
 * @returns {JSX.Element}
 */
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

/**
 * Duplicate menu item with its own loading state.
 * @param {Object} props
 * @param {Object} props.play - Platform play object to duplicate.
 * @param {Function} props.onDuplicate - Async handler called with the play.
 * @param {Function} props.onClose - Called to close the parent menu when done.
 * @returns {JSX.Element}
 */
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
 *
 * Extracted verbatim (behavior-preserving) from AdminPlaysPage.jsx's local
 * `PlayCard`.
 *
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
 * @param {Function} [props.onRename] - Called with (play, newTitle) to rename
 * @param {Function} [props.onRemoveFromSection] - Called with play to remove from its section
 * @param {string[]} [props.allTags] - All tags seen across plays (for suggestions)
 * @param {boolean} [props.canEdit]
 * @param {boolean} [props.canDelete]
 * @param {boolean} [props.canMove]
 * @param {boolean} [props.canDuplicate]
 * @param {boolean} [props.canAddToSection]
 * @param {boolean} [props.canEditTags]
 * @param {boolean} [props.canRename]
 * @param {boolean} [props.canCopyShareLinks]
 * @param {boolean} [props.canRemoveFromSection]
 * @returns {JSX.Element}
 */
export default function AdminPlayCard({
  play,
  folders,
  playbookSections,
  onEdit,
  onDelete,
  onMove,
  onDuplicate,
  onAddToSection,
  onTagsUpdate,
  onRename,
  onRemoveFromSection,
  allTags,
  canEdit = false,
  canDelete = false,
  canMove = false,
  canDuplicate = false,
  canAddToSection = false,
  canEditTags = false,
  canRename = false,
  canCopyShareLinks = false,
  canRemoveFromSection = false,
}) {
  // null → closed  |  "main" → first popup  |  "sections" / "folders" / "tags" / "rename" → sub-pickers
  const [menuStep, setMenuStep] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef(null);
  const tagInputRef = useRef(null);
  const renameInputRef = useRef(null);
  const hasSecondaryActions = canCopyShareLinks || canDuplicate || canRename || canAddToSection || canMove || canEditTags || canDelete || canRemoveFromSection;
  const hasPrimaryMenuActions = canCopyShareLinks || canDuplicate || canRename;
  const hasGroupedMenuActions = canAddToSection || canMove || canEditTags;

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
      data-component="AdminPlayCard"
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
          {hasSecondaryActions && (
            <button
              onClick={(e) => { e.stopPropagation(); setMenuStep((v) => (v ? null : "main")); }}
              className="rounded-md p-1 opacity-100 transition hover:opacity-80 md:opacity-0 group-hover:opacity-100"
              style={{ color: "var(--adm-text2)" }}
            >
              <FiMoreHorizontal className="text-sm" />
            </button>
          )}

          {/* ── Step 1: main popup ── */}
          {menuStep === "main" && (
            <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl py-1" style={MENU_STYLE}>
              {/* Copy link */}
              {canCopyShareLinks && <CopyLinkButton play={play} onClose={close} />}

              {/* Duplicate */}
              {canDuplicate && <DuplicateButton play={play} onDuplicate={onDuplicate} onClose={close} />}

              {/* Rename */}
              {canRename && (
                <button
                  onClick={() => { setRenameValue(play.title || ""); setMenuStep("rename"); setTimeout(() => renameInputRef.current?.focus(), 50); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:opacity-80"
                  style={{ color: "var(--adm-text2)" }}
                >
                  <FiEdit2 className="shrink-0 text-[10px]" />
                  Rename
                </button>
              )}

              {hasPrimaryMenuActions && hasGroupedMenuActions && (
                <div className="my-1 border-t" style={MENU_DIVIDER_STYLE} />
              )}

              {/* Add to section → sub-popup */}
              {canAddToSection && (
                <button
                  onClick={() => setMenuStep("sections")}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:opacity-80"
                  style={{ color: "var(--adm-text2)" }}
                >
                  <FiBookOpen className="shrink-0 text-[10px]" />
                  Add to Section
                  <FiChevronRight className="ml-auto shrink-0 text-[10px]" style={{ color: "var(--adm-muted)" }} />
                </button>
              )}

              {/* Move to folder → sub-popup */}
              {canMove && (
                <button
                  onClick={() => setMenuStep("folders")}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:opacity-80"
                  style={{ color: "var(--adm-text2)" }}
                >
                  <FiFolder className="shrink-0 text-[10px]" style={play.folderId ? { color: "var(--adm-color-blue)" } : undefined} />
                  Move to Folder
                  <FiChevronRight className="ml-auto shrink-0 text-[10px]" style={{ color: "var(--adm-muted)" }} />
                </button>
              )}

              {/* Edit tags → sub-popup */}
              {canEditTags && (
                <button
                  onClick={() => { setTagInput(""); setMenuStep("tags"); setTimeout(() => tagInputRef.current?.focus(), 50); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:opacity-80"
                  style={{ color: "var(--adm-text2)" }}
                >
                  <FiTag className="shrink-0 text-[10px]" />
                  Edit Tags
                  <FiChevronRight className="ml-auto shrink-0 text-[10px]" style={{ color: "var(--adm-muted)" }} />
                </button>
              )}

              {(canDelete || canRemoveFromSection) && <div className="my-1 border-t" style={MENU_DIVIDER_STYLE} />}

              {/* Remove from Section */}
              {canRemoveFromSection && (
                <button
                  onClick={() => { onRemoveFromSection(play); close(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:opacity-80"
                  style={{ color: "var(--adm-danger)" }}
                >
                  <FiX className="shrink-0 text-[10px]" /> Remove from Section
                </button>
              )}

              {/* Delete */}
              {canDelete && (
                <button
                  onClick={() => { onDelete(play); close(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:opacity-80"
                  style={{ color: "var(--adm-danger)" }}
                >
                  <FiTrash2 className="shrink-0 text-[10px]" /> Delete
                </button>
              )}
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
          {play.creatorName && (
            <span>by {play.creatorName}</span>
          )}
        </span>
        {canEdit ? (
          <button
            onClick={() => onEdit(play)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition hover:opacity-80"
            style={{ color: "var(--adm-text2)" }}
          >
            <FiEdit2 className="text-[10px]" /> Edit
          </button>
        ) : <span />}
      </div>
    </div>
  );
}
