import { SPORT_CONFIGS } from "../config/sports.js";

/**
 * Ensures every sport in SPORT_CONFIGS has:
 *   1. A protected sport folder in platform_play_folders (converted from an existing name-matched
 *      folder, or newly created).
 *   2. A page_sections row for its sport landing page.
 *
 * Safe to run on every server startup — all operations are idempotent.
 *
 * @param {import('pg').Pool} pool
 */
export async function syncSports(pool) {
  for (const { name, pageKey } of SPORT_CONFIGS) {
    // 1. Check if a sport folder already exists for this sport
    const { rows: existing } = await pool.query(
      `SELECT id FROM platform_play_folders WHERE is_sport_folder = true AND sport = $1`,
      [name]
    );

    if (existing.length === 0) {
      // Try to convert an existing folder whose name matches (case-insensitive)
      const { rows: byName } = await pool.query(
        `SELECT id FROM platform_play_folders
         WHERE LOWER(name) = LOWER($1)
           AND (is_sport_folder IS NULL OR is_sport_folder = false)
         LIMIT 1`,
        [name]
      );

      if (byName.length > 0) {
        await pool.query(
          `UPDATE platform_play_folders
           SET sport = $1, is_sport_folder = true
           WHERE id = $2`,
          [name, byName[0].id]
        );
        console.log(`[syncSports] Converted existing folder to sport folder: ${name}`);
      } else {
        await pool.query(
          `INSERT INTO platform_play_folders (name, sport, is_sport_folder)
           VALUES ($1, $2, true)`,
          [name, name]
        );
        console.log(`[syncSports] Created sport folder: ${name}`);
      }
    }

    // 2. Ensure page_sections row exists for this sport's landing page
    await pool.query(
      `INSERT INTO page_sections (section_key, label, page)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [`landing.visualize.${pageKey}`, `${name} — Visualize`, pageKey]
    );
  }

  console.log("[syncSports] Sport sync complete.");
}
