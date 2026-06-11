/**
 * SearchPalette.jsx
 *
 * Search surfaces for the design system:
 *  - `SidebarSearch`  — an always-visible filter at the top of the sub-nav that
 *    swaps the grouped section list for ranked results as you type.
 *  - `CommandPalette` — a ⌘K / Ctrl-K global overlay that jumps to any section
 *    with the keyboard. It doubles as a live, working example of the command-
 *    palette pattern the Search section documents.
 *  - `useCommandPalette` — wires the keyboard shortcut and open/close state.
 *
 * Both surfaces rank with the pure `searchDesignSystem` helper so behavior stays
 * identical and unit-testable.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiSearch, FiCornerDownLeft, FiCommand, FiX } from "react-icons/fi";
import { searchDesignSystem } from "./designSystemSearch";

/**
 * Detect the ⌘K (mac) / Ctrl-K (win) chord without depending on platform libs.
 * @param {KeyboardEvent} e
 * @returns {boolean}
 */
function isPaletteChord(e) {
  return (e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K");
}

/**
 * Hook that owns command-palette open state and binds the global ⌘K/Ctrl-K
 * shortcut (and "/" when focus is not already in a field).
 *
 * @returns {{ open: boolean, setOpen: (v: boolean) => void }}
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (isPaletteChord(e)) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      const target = e.target;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return { open, setOpen };
}

/**
 * The always-visible sub-nav search field. Renders the input and, when there is
 * a query, the ranked result list (the parent hides the grouped nav in that
 * case).
 *
 * @param {{ query: string, onQueryChange: (v: string) => void, results: Array, activeId: string, onPick: (id: string) => void }} props
 * @returns {JSX.Element}
 */
export function SidebarSearch({ query, onQueryChange, results, activeId, onPick }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-[var(--adm-radius-md)] px-3 py-2"
        style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border2)" }}>
        <FiSearch className="shrink-0 text-sm" style={{ color: "var(--adm-text3)" }} />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search the system…"
          aria-label="Search design system sections"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--adm-text)" }}
        />
        {query ? (
          <button type="button" onClick={() => onQueryChange("")} aria-label="Clear search" className="shrink-0">
            <FiX className="text-sm" style={{ color: "var(--adm-text3)" }} />
          </button>
        ) : (
          <span className="hidden shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] sm:inline-flex"
            style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text3)" }}>
            <FiCommand className="text-[10px]" />K
          </span>
        )}
      </div>

      {query ? (
        <div className="flex flex-col gap-0.5">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-xs" style={{ color: "var(--adm-text3)" }}>
              No sections match “{query}”.
            </p>
          ) : (
            results.map((r) => {
              const active = r.id === activeId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onPick(r.id)}
                  className="flex flex-col rounded-[var(--adm-radius-md)] px-3 py-2 text-left transition-colors"
                  style={active
                    ? { backgroundColor: "color-mix(in srgb, var(--adm-accent-dim) 85%, var(--adm-surface2))", color: "var(--adm-accent)" }
                    : { color: "var(--adm-text2)" }}
                >
                  <span className="text-sm font-semibold">{r.label}</span>
                  <span className="truncate text-[11px]" style={{ color: "var(--adm-text3)" }}>{r.group}</span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Full-screen ⌘K command palette. Fuzzy-jumps to any section with the keyboard:
 * ↑/↓ to move, Enter to open, Esc to close.
 *
 * @param {{ open: boolean, onClose: () => void, onPick: (id: string) => void }} props
 * @returns {JSX.Element | null}
 */
export function CommandPalette({ open, onClose, onPick }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  // Blank query previews a handful of useful starting points.
  const results = useMemo(
    () => searchDesignSystem(query, { limit: 8 }),
    [query],
  );
  const fallback = useMemo(
    () => (query.trim() ? [] : searchDesignSystem("overview color buttons forms", { limit: 5 })),
    [query],
  );
  const list = results.length ? results : fallback;

  // Reset and focus each time the palette opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Keep the highlighted row in range as results change.
  useEffect(() => { setActive(0); }, [query]);

  const choose = useCallback((id) => {
    if (id) onPick(id);
    onClose();
  }, [onPick, onClose]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, list.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter") { e.preventDefault(); choose(list[active]?.id); }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--adm-z-modal,1000)] flex items-start justify-center p-4 pt-[12vh]"
      style={{ backgroundColor: "var(--adm-scrim, rgba(0,0,0,0.55))" }}
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Design system command palette"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-[var(--adm-radius-lg)]"
        style={{ backgroundColor: "var(--adm-surface-elevated)", border: "1px solid var(--adm-border2)", boxShadow: "var(--adm-shadow-lg)" }}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
          <FiSearch style={{ color: "var(--adm-text3)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a section…"
            aria-label="Search sections"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--adm-text)" }}
          />
          <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text3)" }}>Esc</span>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {list.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm" style={{ color: "var(--adm-text3)" }}>
              No matches for “{query}”.
            </p>
          ) : (
            <>
              {!query.trim() ? (
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-text3)" }}>Jump to</p>
              ) : null}
              {list.map((r, i) => {
                const highlighted = i === active;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(r.id)}
                    className="flex w-full items-center justify-between rounded-[var(--adm-radius-md)] px-3 py-2 text-left"
                    style={highlighted
                      ? { backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }
                      : { color: "var(--adm-text2)" }}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-semibold">{r.label}</span>
                      <span className="truncate text-[11px]" style={{ color: highlighted ? "var(--adm-accent)" : "var(--adm-text3)" }}>{r.summary}</span>
                    </span>
                    {highlighted ? <FiCornerDownLeft className="shrink-0 text-xs" /> : null}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
