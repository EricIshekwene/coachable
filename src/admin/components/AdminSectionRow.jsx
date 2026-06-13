import { useState, useEffect, useRef } from "react";
import { FiEdit2, FiX, FiLayout, FiSearch, FiCheck } from "react-icons/fi";
import PlayPreviewCard from "../../components/PlayPreviewCard";
import { PANEL_STYLE, INSET_STYLE, MENU_STYLE, MENU_DIVIDER_STYLE } from "./adminPlayStyles";

/**
 * A single page-section row showing the assigned play and a picker to change it,
 * plus a priority toggle. Surfaces a warning banner when a section is flagged as
 * priority but has no play assigned.
 *
 * Extracted verbatim (behavior-preserving) from AdminPlaysPage.jsx's local
 * `SectionRow`.
 *
 * @param {Object} props
 * @param {Object} props.section - Section data (`sectionKey`, `label`, `page`, `playId`, `playTitle`, `playThumbnail`, `playSport`, `isPriority`)
 * @param {Object[]} props.plays - All platform plays for the picker
 * @param {Function} props.onAssign - Called with (sectionKey, playId | null)
 * @param {Function} props.onTogglePriority - Called with (sectionKey, isPriority)
 * @returns {JSX.Element}
 */
export default function AdminSectionRow({ section, plays, onAssign, onTogglePriority }) {
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
      data-component="AdminSectionRow"
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
            <div className="w-32 shrink-0 overflow-hidden rounded-lg" style={{ border: "1px solid var(--adm-border)" }}>
              {plays.find((p) => p.id === section.playId)?.playData ? (
                <PlayPreviewCard
                  playData={plays.find((p) => p.id === section.playId).playData}
                  autoplay="hover"
                  shape="landscape"
                  cameraMode="fit-distribution"
                  background="field"
                  paddingPx={10}
                  minSpanPx={60}
                  showHoverHint={false}
                  className="rounded-lg"
                />
              ) : section.playThumbnail ? (
                <img
                  src={section.playThumbnail}
                  alt={section.playTitle}
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center" style={INSET_STYLE}>
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
              style={{ borderColor: "color-mix(in srgb, var(--adm-danger) 18%, transparent)", backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}
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
