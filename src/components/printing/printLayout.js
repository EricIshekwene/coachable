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
