/**
 * Outreach scraper orchestrator.
 *
 * Decoupled from the Express app: pure functions that take a school record and
 * return normalized staff rows. The route layer owns all DB I/O.
 *
 * @module outreachScraper
 */

import { fetchHtml, sleep, POLITE_DELAY_MS } from "./http.js";
import { parseSidearm } from "./sidearm.js";
import { normalizeStaff } from "./normalize.js";

/** Platforms this scraper can extract automatically. */
const SCRAPEABLE_PLATFORMS = new Set(["sidearm_legacy", "sidearm_nextgen", "unknown"]);

/**
 * Resolve the staff-directory URL for a school: its explicit
 * `staff_directory_url`, else derived from the athletic domain.
 * @param {{ athletic_domain: string, staff_directory_url?: string|null }} school
 * @returns {string}
 */
export function staffDirectoryUrl(school) {
  if (school.staff_directory_url) return school.staff_directory_url;
  return `https://${school.athletic_domain}/staff-directory`;
}

/**
 * Scrape a single school's staff directory.
 *
 * @param {{ athletic_domain: string, platform: string, staff_directory_url?: string|null }} school
 * @returns {Promise<Array<{name,title,sport,roleTags,email,phone}>>}
 * @throws {Error} if the platform is unsupported or the fetch/parse fails
 */
export async function scrapeSchool(school) {
  if (!SCRAPEABLE_PLATFORMS.has(school.platform)) {
    const err = new Error(`Platform "${school.platform}" is not auto-scrapeable`);
    err.code = "unsupported_platform";
    throw err;
  }
  const url = staffDirectoryUrl(school);
  const { html } = await fetchHtml(url);
  const raw = parseSidearm(html, school.platform);
  return raw.map(normalizeStaff).filter((r) => r.name || r.email);
}

/**
 * Scrape many schools with a concurrency cap and a politeness delay. Never
 * rejects — each school's outcome is reported individually so a single failure
 * doesn't abort the batch.
 *
 * @param {Array<object>} schools - school records (must include an `id`)
 * @param {{ concurrency?: number }} [opts]
 * @returns {Promise<Array<{ schoolId: string, ok: boolean, count: number, error: string|null, staff: Array }>>}
 */
export async function scrapeMany(schools, { concurrency = 5 } = {}) {
  const results = new Array(schools.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < schools.length) {
      const idx = cursor++;
      const school = schools[idx];
      try {
        const staff = await scrapeSchool(school);
        results[idx] = { schoolId: school.id, ok: true, count: staff.length, error: null, staff };
      } catch (err) {
        results[idx] = {
          schoolId: school.id,
          ok: false,
          count: 0,
          error: err.message || "scrape failed",
          staff: [],
        };
      }
      await sleep(POLITE_DELAY_MS);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, schools.length) }, worker));
  return results;
}

export { SCRAPEABLE_PLATFORMS };
