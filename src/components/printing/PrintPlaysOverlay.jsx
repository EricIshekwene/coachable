/**
 * PrintPlaysOverlay — full-screen print preview for multiple plays.
 *
 * Opened from the bulk action bar on /app/plays. Renders the selected plays
 * as letter-portrait sheets (2, 4, or 6 plays per page) in one of several
 * sheet styles (see PRINT_STYLES in printLayout.js), then hands off to the
 * browser's print dialog via window.print().
 *
 * Diagrams are static PlayPreviewCard SVGs (controlledTimeMs=0, autoplay
 * off) — no RAF loops, crisp at any print size. The overlay portals to
 * document.body so the print CSS can hide #root and show only the sheets.
 *
 * Sheet colors are hardcoded hex (not Brand* Tailwind tokens) because the
 * brand tokens flip in light mode while paper is always white; BrandOrange
 * (#FF7A18) and BrandGreen are theme-constant but are still written as hex
 * here for consistency. Toolbar chrome uses the normal tokens.
 */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FiPrinter, FiX } from "react-icons/fi";
import PlayPreviewCard from "../PlayPreviewCard";
import lockupBlack from "../../assets/logos/coachableplays-lockup-black.png";
import lockupWhite from "../../assets/logos/coachableplays-lockup-white.png";
import {
  PRINT_LAYOUTS,
  PRINT_STYLES,
  DEFAULT_PER_PAGE,
  DEFAULT_STYLE_ID,
  getPrintLayout,
  getPrintStyle,
  getPlayNumber,
  paginatePlays,
} from "./printLayout";

/**
 * Print-only CSS, mounted with the overlay. Hides the app and toolbar when
 * printing, paginates sheets, and forces background colors (green field,
 * brand bands) to actually print. Sheets keep a min-height slightly under
 * the letter content height (10.1in at 0.45in margins) so mt-auto footers
 * sit near the page bottom without spilling onto blank pages; A4 is taller,
 * so it fits there too.
 */
const PRINT_CSS = `
@page { size: letter portrait; margin: 0.45in; }
.print-sheet, .print-sheet * {
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
@media print {
  html, body { overflow: visible !important; background: #fff !important; }
  #root { display: none !important; }
  .print-plays-overlay {
    position: static !important;
    inset: auto !important;
    overflow: visible !important;
    background: #fff !important;
    padding: 0 !important;
  }
  .print-plays-toolbar { display: none !important; }
  .print-sheet-stack { padding: 0 !important; gap: 0 !important; }
  .print-sheet {
    box-shadow: none !important;
    margin: 0 !important;
    min-height: 9.8in !important;
    break-after: page;
    page-break-after: always;
  }
  .print-sheet:last-child { break-after: auto; page-break-after: auto; }
}
`;

/**
 * The coachableplays lockup, cropped to the artwork. The PNGs have large
 * transparent margins baked in (artwork is x 92–1420, y 172–306 of a
 * 1520×480 canvas), so the mark is cropped via a fixed-size container to
 * keep it flush left and let rules sit tight under it. Black and white
 * variants share the same canvas geometry.
 * @param {{ variant?: "black" | "white" }} props
 */
function BrandLockup({ variant = "black" }) {
  return (
    <div className="relative overflow-hidden" style={{ width: "2in", height: "0.202in" }}>
      <img
        src={variant === "white" ? lockupWhite : lockupBlack}
        alt="Coachable Plays"
        className="absolute max-w-none"
        style={{ width: "2.289in", left: "-0.139in", top: "-0.259in" }}
        draggable="false"
      />
    </div>
  );
}

/**
 * A single play cell: static diagram plus a per-style title treatment.
 * Plays without diagram data get a placeholder box so the sheet grid stays
 * aligned in every style.
 * @param {{ play: object, style: {id: string}, number: number }} props
 */
function PrintPlayCell({ play, style, number }) {
  const diagram = play.playData?.play ? (
    <PlayPreviewCard
      playData={play.playData}
      autoplay="off"
      controlledTimeMs={0}
      shape="landscape"
      cameraMode="fit-distribution"
      background="field"
      paddingPx={20}
      minSpanPx={100}
    />
  ) : (
    <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl border border-gray-300 bg-gray-100">
      <span className="text-xs text-gray-400">No diagram</span>
    </div>
  );

  if (style.id === "sideline") {
    return (
      <div className="flex min-w-0 flex-col">
        <div className="relative">
          {diagram}
          <span className="pointer-events-none absolute -left-[3px] -top-[3px] h-3.5 w-3.5 border-l-2 border-t-2 border-[#FF7A18]" />
          <span className="pointer-events-none absolute -bottom-[3px] -right-[3px] h-3.5 w-3.5 border-b-2 border-r-2 border-[#FF7A18]" />
        </div>
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
          <span className="h-3 w-[3px] shrink-0 bg-[#FF7A18]" />
          <p className="truncate font-Manrope text-[13px] font-semibold text-black">{play.title}</p>
        </div>
      </div>
    );
  }

  if (style.id === "playcall") {
    return (
      <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-2 border-b border-gray-300 pb-1.5">
          <span className="flex h-[0.24in] w-[0.24in] shrink-0 items-center justify-center rounded-full bg-[#FF7A18] font-Manrope text-[11px] font-bold text-white">
            {number}
          </span>
          <p className="truncate font-Manrope text-[13px] font-bold text-black">{play.title}</p>
        </div>
        <div className="mt-1.5">{diagram}</div>
      </div>
    );
  }

  if (style.id === "gameday") {
    return (
      <div className="flex min-w-0 flex-col">
        {diagram}
        <div className="mt-1.5 flex min-w-0 items-stretch overflow-hidden rounded-md bg-[#121212]">
          <span className="flex w-[0.28in] shrink-0 items-center justify-center bg-[#FF7A18] font-Manrope text-[11px] font-bold text-white">
            {number}
          </span>
          <p className="truncate px-2 py-1 font-Manrope text-[12.5px] font-semibold text-white">{play.title}</p>
        </div>
      </div>
    );
  }

  // minimal (default)
  return (
    <div className="flex min-w-0 flex-col">
      {diagram}
      <p className="mt-1 truncate text-center text-[13px] font-semibold text-black">{play.title}</p>
    </div>
  );
}

/**
 * Per-style sheet header. Every style shows exactly one lockup per page;
 * styles differ only in the treatment around it.
 * @param {{ style: {id: string}, teamName?: string }} props
 */
function SheetHeader({ style, teamName }) {
  if (style.id === "sideline") {
    return (
      <div className="mb-4 px-2">
        <div className="flex items-end justify-between">
          <BrandLockup />
          {teamName ? (
            <p className="truncate pl-4 font-Manrope text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              {teamName}
            </p>
          ) : null}
        </div>
        <div className="mt-3 flex items-center">
          <span className="h-[3px] w-[1.4in] bg-[#FF7A18]" />
          <span className="h-px flex-1 bg-gray-300" />
        </div>
      </div>
    );
  }

  if (style.id === "playcall") {
    return (
      <div className="mb-4 px-2">
        <div className="flex items-end justify-between">
          <BrandLockup />
          <div className="min-w-0 pl-4 text-right">
            <p className="font-Manrope text-[11px] font-bold uppercase tracking-[0.16em] text-black">Play Call Sheet</p>
            {teamName ? <p className="truncate text-[10px] text-gray-500">{teamName}</p> : null}
          </div>
        </div>
        <div className="mt-3 h-[2px] w-full bg-[#FF7A18]" />
      </div>
    );
  }

  if (style.id === "gameday") {
    return (
      <div className="mb-4 flex items-center justify-between rounded-md border-b-[3px] border-[#FF7A18] bg-[#121212] px-[0.22in] py-[0.2in]">
        <BrandLockup variant="white" />
        {teamName ? (
          <p className="truncate pl-4 font-Manrope text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            {teamName}
          </p>
        ) : null}
      </div>
    );
  }

  // minimal (default) — the original header with breathing room under the lockup.
  return (
    <div className="mb-4 px-2">
      <BrandLockup />
      <hr className="mt-3 border-t border-gray-300" />
    </div>
  );
}

/**
 * Per-style branded footer line (page number + team name slot). The minimal
 * style keeps its original footer-less look. mt-auto pins the footer to the
 * sheet bottom (sheets keep a near-page min-height in print).
 * @param {{ style: {id: string}, teamName?: string, pageIndex: number, pageCount: number }} props
 */
function SheetFooter({ style, teamName, pageIndex, pageCount }) {
  const pageLabel = `Page ${pageIndex + 1} of ${pageCount}`;

  if (style.id === "sideline") {
    return (
      <div className="mt-auto pt-3">
        <div className="flex items-center justify-between border-t border-gray-300 pt-1.5 text-[9.5px] text-gray-500">
          <span className="truncate">{teamName || "Team — ________________"}</span>
          <span className="shrink-0 pl-4">coachableplays.com &middot; {pageLabel}</span>
        </div>
      </div>
    );
  }

  if (style.id === "playcall") {
    return (
      <div className="mt-auto pt-3 text-center text-[9.5px] text-gray-500">
        {teamName ? (
          <>
            <span>{teamName}</span> <span className="text-[#FF7A18]">&bull;</span>{" "}
          </>
        ) : null}
        coachableplays.com <span className="text-[#FF7A18]">&bull;</span> {pageLabel}
      </div>
    );
  }

  if (style.id === "gameday") {
    return (
      <div className="mt-auto pt-3">
        <div className="flex items-center justify-between border-t-2 border-[#121212] pt-1.5 text-[9.5px] font-semibold text-[#121212]">
          <span className="truncate font-Manrope uppercase tracking-[0.12em]">{teamName || ""}</span>
          <span className="shrink-0 pl-4">coachableplays.com &middot; {pageLabel}</span>
        </div>
      </div>
    );
  }

  return null; // minimal
}

/**
 * One printed page: per-style header + grid of play cells + per-style footer.
 * @param {{
 *   plays: Array,
 *   layout: {perPage: number, columns: number},
 *   style: {id: string},
 *   pageIndex: number,
 *   pageCount: number,
 *   teamName?: string,
 * }} props
 */
function PrintSheet({ plays, layout, style, pageIndex, pageCount, teamName }) {
  const twoUp = layout.perPage === 2;
  return (
    <div
      className="print-sheet mx-auto flex flex-col bg-white p-[0.15in] shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
      style={{ width: "7.3in", minHeight: "10.1in" }}
    >
      <SheetHeader style={style} teamName={teamName} />
      <div
        className="grid content-start"
        style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`, gap: "0.22in" }}
      >
        {plays.map((play, cellIndex) => (
          <div key={play.id} style={twoUp ? { maxWidth: "6.2in", width: "100%", margin: "0 auto" } : undefined}>
            <PrintPlayCell
              play={play}
              style={style}
              number={getPlayNumber(pageIndex, layout.perPage, cellIndex)}
            />
          </div>
        ))}
      </div>
      <SheetFooter style={style} teamName={teamName} pageIndex={pageIndex} pageCount={pageCount} />
    </div>
  );
}

/**
 * Full-screen print preview overlay.
 * @param {{ plays: Array, teamName?: string, onClose: () => void }} props
 */
export default function PrintPlaysOverlay({ plays, teamName, onClose }) {
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [styleId, setStyleId] = useState(DEFAULT_STYLE_ID);
  const layout = getPrintLayout(perPage);
  const style = getPrintStyle(styleId);
  const pages = useMemo(() => paginatePlays(plays, layout.perPage), [plays, layout.perPage]);

  // Lock body scroll while the overlay is open; Escape closes.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="print-plays-overlay fixed inset-0 z-[100] overflow-y-auto bg-[#0D0D0D]/95 font-DmSans">
      <style>{PRINT_CSS}</style>

      {/* Screen-only toolbar */}
      <div className="print-plays-toolbar sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-BrandGray2/25 bg-BrandBlack px-5 py-3">
        <p className="text-sm font-semibold text-BrandText">Print {plays.length} play{plays.length !== 1 ? "s" : ""}</p>
        <div className="ml-4 flex items-center gap-1 rounded-lg border border-BrandGray2/30 p-1">
          {PRINT_LAYOUTS.map((l) => (
            <button
              key={l.perPage}
              onClick={() => setPerPage(l.perPage)}
              className={`rounded-md px-3 py-1.5 text-xs transition ${
                l.perPage === layout.perPage
                  ? "bg-BrandOrange/20 font-semibold text-BrandOrange"
                  : "text-BrandGray hover:text-BrandText"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-BrandGray2/30 p-1">
          {PRINT_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyleId(s.id)}
              title={s.description}
              className={`rounded-md px-3 py-1.5 text-xs transition ${
                s.id === style.id
                  ? "bg-BrandOrange/20 font-semibold text-BrandOrange"
                  : "text-BrandGray hover:text-BrandText"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-BrandGray2">
          {pages.length} page{pages.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
          >
            <FiPrinter className="text-sm" />
            Print
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg border border-BrandGray2/30 px-3 py-2 text-sm text-BrandGray transition hover:border-BrandGray hover:text-BrandText"
          >
            <FiX className="text-sm" />
            Close
          </button>
        </div>
      </div>

      {/* Sheets */}
      <div className="print-sheet-stack flex flex-col gap-6 px-4 py-8">
        {pages.map((pagePlays, idx) => (
          <PrintSheet
            key={idx}
            plays={pagePlays}
            layout={layout}
            style={style}
            pageIndex={idx}
            pageCount={pages.length}
            teamName={teamName}
          />
        ))}
      </div>
    </div>,
    document.body
  );
}
