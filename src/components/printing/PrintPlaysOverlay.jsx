/**
 * PrintPlaysOverlay — full-screen print preview for multiple plays.
 *
 * Opened from the bulk action bar on /app/plays. Renders the selected plays
 * as letter-portrait sheets (2, 4, or 6 plays per page) with a thin
 * coachableplays.com header line on every page, then hands off to the
 * browser's print dialog via window.print().
 *
 * Diagrams are static PlayPreviewCard SVGs (controlledTimeMs=0, autoplay
 * off) — no RAF loops, crisp at any print size. The overlay portals to
 * document.body so the print CSS can hide #root and show only the sheets.
 */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FiPrinter, FiX } from "react-icons/fi";
import PlayPreviewCard from "../PlayPreviewCard";
import coachablePlaysLogo from "../../assets/logos/coachableplays-lockup-black.png";
import { PRINT_LAYOUTS, DEFAULT_PER_PAGE, getPrintLayout, paginatePlays } from "./printLayout";

/**
 * Print-only CSS, mounted with the overlay. Hides the app and toolbar when
 * printing, paginates sheets, and forces background colors (green field)
 * to actually print.
 */
const PRINT_STYLES = `
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
  .print-sheet {
    box-shadow: none !important;
    margin: 0 !important;
    min-height: 0 !important;
    break-after: page;
    page-break-after: always;
  }
  .print-sheet:last-child { break-after: auto; page-break-after: auto; }
}
`;

/**
 * A single play cell: static diagram + truncating play name.
 * Plays without diagram data get a placeholder box so the sheet grid
 * stays aligned.
 * @param {{ play: object }} props
 */
function PrintPlayCell({ play }) {
  return (
    <div className="flex min-w-0 flex-col">
      {play.playData?.play ? (
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
      )}
      <p className="mt-1 truncate text-center text-[13px] font-semibold text-black">{play.title}</p>
    </div>
  );
}

/**
 * One printed page: header line + grid of play cells.
 * @param {{ plays: Array, layout: {perPage: number, columns: number} }} props
 */
function PrintSheet({ plays, layout }) {
  const twoUp = layout.perPage === 2;
  return (
    <div
      className="print-sheet mx-auto flex flex-col bg-white p-[0.15in] shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
      style={{ width: "7.3in", minHeight: "10.1in" }}
    >
      {/* Brand header — black ad-view lockup, top-left, rule underneath.
          The PNG has large transparent margins baked in (artwork is x 92–1420,
          y 172–306 of a 1520×480 canvas), so it's cropped via a fixed-size
          container to keep the mark flush left and the rule tight under it. */}
      <div className="mb-3">
        <div className="relative overflow-hidden" style={{ width: "2in", height: "0.202in" }}>
          <img
            src={coachablePlaysLogo}
            alt="Coachable Plays"
            className="absolute max-w-none"
            style={{ width: "2.289in", left: "-0.139in", top: "-0.259in" }}
            draggable="false"
          />
        </div>
        <hr className="mt-1.5 border-t border-gray-300" />
      </div>
      <div
        className="grid content-start"
        style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`, gap: "0.22in" }}
      >
        {plays.map((play) => (
          <div key={play.id} style={twoUp ? { maxWidth: "6.2in", width: "100%", margin: "0 auto" } : undefined}>
            <PrintPlayCell play={play} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full-screen print preview overlay.
 * @param {{ plays: Array, onClose: () => void }} props
 */
export default function PrintPlaysOverlay({ plays, onClose }) {
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const layout = getPrintLayout(perPage);
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
      <style>{PRINT_STYLES}</style>

      {/* Screen-only toolbar */}
      <div className="print-plays-toolbar sticky top-0 z-10 flex items-center gap-3 border-b border-BrandGray2/25 bg-BrandBlack px-5 py-3">
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
      <div className="flex flex-col gap-6 px-4 py-8">
        {pages.map((pagePlays, idx) => (
          <PrintSheet key={idx} plays={pagePlays} layout={layout} />
        ))}
      </div>
    </div>,
    document.body
  );
}
