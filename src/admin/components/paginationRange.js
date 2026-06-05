/**
 * paginationRange.js
 *
 * Pure helper that builds the list of page items (numbers + ellipses) for the
 * AdminPagination control. Kept in its own module so it can be unit-tested
 * without importing React.
 */

/**
 * Inclusive integer range [start, end].
 * @param {number} start
 * @param {number} end
 * @returns {number[]}
 */
function range(start, end) {
  const out = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

/**
 * Build a pagination item list with ellipses, always showing the first and
 * last page, the current page, and `siblingCount` pages on each side.
 *
 * @param {number} page - current page (1-based)
 * @param {number} pageCount - total number of pages
 * @param {number} [siblingCount=1] - pages to show on each side of current
 * @returns {Array<number|"…">} ordered items; "…" marks a collapsed gap
 */
export function getPaginationRange(page, pageCount, siblingCount = 1) {
  const total = Math.max(0, Math.floor(pageCount || 0));
  if (total <= 0) return [];

  const current = Math.min(Math.max(1, Math.floor(page || 1)), total);

  // first + last + current + 2*siblings + 2 ellipsis slots
  const totalSlots = siblingCount * 2 + 5;
  if (total <= totalSlots) return range(1, total);

  const leftSibling = Math.max(current - siblingCount, 1);
  const rightSibling = Math.min(current + siblingCount, total);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [...range(1, siblingCount * 2 + 3), "…", total];
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    return [1, "…", ...range(total - (siblingCount * 2 + 2), total)];
  }
  return [1, "…", ...range(leftSibling, rightSibling), "…", total];
}
