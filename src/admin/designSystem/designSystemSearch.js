/**
 * designSystemSearch.js
 *
 * Pure, dependency-free ranking for the design-system search box and command
 * palette. It scores each section against a free-text query using label,
 * keyword, summary, and group matches, then returns the best matches in
 * descending relevance. Because it imports only the plain metadata from
 * designSystemNav.js (no React), it is unit-testable in a Node environment —
 * see admin/test/designSystemSearch.test.js.
 */

import { ALL_SECTIONS } from "./designSystemNav";

/** Relevance weights, highest signal first. */
const WEIGHTS = {
  labelExact: 100,
  labelStarts: 70,
  labelIncludes: 45,
  keywordExact: 40,
  keywordIncludes: 22,
  summaryIncludes: 14,
  groupIncludes: 8,
};

/**
 * Normalize a string for comparison: lowercase, collapse whitespace, strip
 * surrounding punctuation noise so "Cmd-K" and "cmd k" match the same way.
 * @param {string} value
 * @returns {string}
 */
function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Score a single section against an already-normalized query and its
 * whitespace-split terms. Returns 0 when nothing matches.
 *
 * @param {import("./designSystemNav").DSSectionMeta & { group: string }} section
 * @param {string} query   Normalized full query.
 * @param {string[]} terms Normalized query terms.
 * @returns {number}
 */
function scoreSection(section, query, terms) {
  const label = normalize(section.label);
  const summary = normalize(section.summary);
  const group = normalize(section.group);
  const keywords = (section.keywords ?? []).map(normalize);

  let score = 0;

  // Whole-query matches against the label are the strongest signal.
  if (label === query) score += WEIGHTS.labelExact;
  else if (label.startsWith(query)) score += WEIGHTS.labelStarts;
  else if (label.includes(query)) score += WEIGHTS.labelIncludes;

  // Per-term matches let multi-word queries ("toast badge") still rank.
  for (const term of terms) {
    if (!term) continue;
    if (label.includes(term)) score += WEIGHTS.labelIncludes / 2;
    if (keywords.some((k) => k === term)) score += WEIGHTS.keywordExact;
    else if (keywords.some((k) => k.includes(term))) score += WEIGHTS.keywordIncludes;
    if (summary.includes(term)) score += WEIGHTS.summaryIncludes;
    if (group.includes(term)) score += WEIGHTS.groupIncludes;
  }

  return score;
}

/**
 * Rank design-system sections against a free-text query.
 *
 * @param {string} rawQuery       The user's query.
 * @param {Object} [opts]
 * @param {number} [opts.limit=8] Max results to return.
 * @returns {Array<{ id: string, label: string, summary: string, group: string, score: number }>}
 *          Matching sections, most relevant first. An empty/blank query yields
 *          an empty array (the caller shows the normal grouped nav instead).
 */
export function searchDesignSystem(rawQuery, { limit = 8 } = {}) {
  const query = normalize(rawQuery);
  if (!query) return [];
  const terms = query.split(" ").filter(Boolean);

  return ALL_SECTIONS
    .map((section) => ({ section, score: scoreSection(section, query, terms) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.section.label.localeCompare(b.section.label))
    .slice(0, limit)
    .map(({ section, score }) => ({
      id: section.id,
      label: section.label,
      summary: section.summary,
      group: section.group,
      score,
    }));
}
