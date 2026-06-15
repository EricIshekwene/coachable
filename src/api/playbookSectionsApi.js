import { apiFetch } from "./api";

function normalizeSport(value) {
  return String(value || "").trim().toLowerCase();
}

function getSectionPlayCount(section) {
  const count = Number(section?.playCount);
  return Number.isFinite(count) ? count : 0;
}

/**
 * Fetch all published playbook sections with play counts.
 * @returns {Promise<Object[]>}
 */
export async function fetchPublishedPlaybookSections() {
  const data = await apiFetch("/playbook-sections");
  return data.sections || [];
}

/**
 * Filter published sections down to the active sport and hide empty sections.
 * If no sport is set, keep all non-empty published sections.
 * @param {Object[]} sections
 * @param {string} sport
 * @returns {Object[]}
 */
export function filterPublishedPlaybookSectionsForSport(sections, sport) {
  const normalizedSport = normalizeSport(sport);

  return (sections || []).filter((section) => {
    if (getSectionPlayCount(section) <= 0) return false;
    if (!normalizedSport) return true;
    return normalizeSport(section?.sport) === normalizedSport;
  });
}
