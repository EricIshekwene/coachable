/**
 * Pure layout helpers for multi-play printing.
 *
 * Kept free of React so pagination and layout config can be unit tested
 * directly (see admin/test/printing/).
 */

/**
 * Available print layouts. `perPage` is the number of play cells per printed
 * page, `columns` the CSS grid column count. 2-up stacks full-width cells in
 * a single column; 4-up and 6-up use a 2-column grid (2×2 and 2×3).
 */
export const PRINT_LAYOUTS = [
  { perPage: 2, columns: 1, label: "2 per page" },
  { perPage: 4, columns: 2, label: "4 per page" },
  { perPage: 6, columns: 2, label: "6 per page" },
];

/** Default layout per the PRD: 4 plays per page. */
export const DEFAULT_PER_PAGE = 4;

/**
 * Available sheet styles. Pure config (id + picker label + description) so
 * the picker and style resolution can be unit tested; the actual visual
 * differences are CSS/JSX per sheet in PrintPlaysOverlay.
 * - minimal:  the original sheet — lockup header, plain diagram + title grid.
 * - sideline: orange accent rule and corner ticks, title ticks, branded footer.
 * - playcall: numbered orange play chips with title blocks above each diagram.
 * - gameday:  bolder — black header band (white lockup) and black title bands.
 */
export const PRINT_STYLES = [
  { id: "minimal", label: "Style 1", description: "Plain grid — lockup header, diagram and title" },
  { id: "sideline", label: "Style 2", description: "Orange accent rule and corner ticks with a branded footer" },
  { id: "playcall", label: "Style 3", description: "Numbered play chips with title blocks above each diagram" },
  { id: "gameday", label: "Style 4", description: "Bold black header and title bands (uses more ink)" },
];

/** Default sheet style: the original minimal look. */
export const DEFAULT_STYLE_ID = "minimal";

/**
 * Returns the style config for a style id, falling back to the default.
 * @param {string} styleId
 * @returns {{id: string, label: string, description: string}}
 */
export function getPrintStyle(styleId) {
  return PRINT_STYLES.find((s) => s.id === styleId)
    || PRINT_STYLES.find((s) => s.id === DEFAULT_STYLE_ID);
}

/**
 * 1-based play number across the whole print job (used by styles that show
 * numbered play chips), from a cell's page/position.
 * @param {number} pageIndex - 0-based page index
 * @param {number} perPage - plays per page for the active layout
 * @param {number} cellIndex - 0-based cell index within the page
 * @returns {number}
 */
export function getPlayNumber(pageIndex, perPage, cellIndex) {
  return pageIndex * perPage + cellIndex + 1;
}

/**
 * Returns the layout config for a per-page count, falling back to the default.
 * @param {number} perPage
 * @returns {{perPage: number, columns: number, label: string}}
 */
export function getPrintLayout(perPage) {
  return PRINT_LAYOUTS.find((l) => l.perPage === perPage)
    || PRINT_LAYOUTS.find((l) => l.perPage === DEFAULT_PER_PAGE);
}

/**
 * Chunks plays into pages of `perPage` items, preserving order.
 * @param {Array} plays
 * @param {number} perPage
 * @returns {Array<Array>} pages
 */
export function paginatePlays(plays, perPage) {
  const list = Array.isArray(plays) ? plays : [];
  const size = Math.max(1, Math.floor(perPage) || 1);
  const pages = [];
  for (let i = 0; i < list.length; i += size) {
    pages.push(list.slice(i, i + size));
  }
  return pages;
}

/**
 * Whether the Print action should be visible in the plays bulk bar.
 * Hidden entirely (fail closed) unless the viewer is a coach and the team
 * has the 'printing' suite feature enabled.
 * @param {boolean} isCoach
 * @param {boolean} printingEnabled
 * @returns {boolean}
 */
export function canShowPrintAction(isCoach, printingEnabled) {
  return Boolean(isCoach) && Boolean(printingEnabled);
}
