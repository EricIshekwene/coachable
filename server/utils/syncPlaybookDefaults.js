import { SPORT_CONFIGS } from "../config/sports.js";

/**
 * Ensures every sport in SPORT_CONFIGS has exactly one default playbook section
 * (is_default = true). Default sections are protected — they cannot be deleted
 * and their is_default flag cannot be changed via the API.
 *
 * Safe to run on every server startup — all operations are idempotent.
 *
 * @param {import('pg').Pool} pool
 */
export async function syncPlaybookDefaults(pool) {
  for (const { name } of SPORT_CONFIGS) {
    const { rows: existing } = await pool.query(
      `SELECT id FROM playbook_sections WHERE is_default = true AND sport = $1`,
      [name]
    );

    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO playbook_sections (name, description, sport, is_default, is_published, sort_order)
         VALUES ($1, $2, $3, true, false, 0)`,
        [`${name} — Default`, `Standard platform plays for ${name}.`, name]
      );
      console.log(`[syncPlaybookDefaults] Created default playbook section for: ${name}`);
    }
  }

  console.log("[syncPlaybookDefaults] Playbook defaults sync complete.");
}
