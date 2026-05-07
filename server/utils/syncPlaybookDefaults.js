import { SPORT_CONFIGS } from "../config/sports.js";

/**
 * Ensures every sport in SPORT_CONFIGS has:
 *   1. One default playbook section (is_default = true, protected from deletion).
 *   2. One community plays section for coach-submitted / community-created plays.
 *
 * Safe to run on every server startup — all operations are idempotent.
 *
 * @param {import('pg').Pool} pool
 */
export async function syncPlaybookDefaults(pool) {
  for (const { name } of SPORT_CONFIGS) {
    // Ensure default section exists.
    const { rows: existingDefault } = await pool.query(
      `SELECT id FROM playbook_sections WHERE is_default = true AND sport = $1`,
      [name]
    );

    if (existingDefault.length === 0) {
      await pool.query(
        `INSERT INTO playbook_sections (name, description, sport, is_default, is_published, sort_order)
         VALUES ($1, $2, $3, true, false, 0)`,
        [`${name} — Default`, `Standard platform plays for ${name}.`, name]
      );
      console.log(`[syncPlaybookDefaults] Created default playbook section for: ${name}`);
    }

    // Ensure community section exists.
    const communityName = `Community ${name} Plays`;
    const { rows: existingCommunity } = await pool.query(
      `SELECT id FROM playbook_sections WHERE name = $1 AND sport = $2`,
      [communityName, name]
    );

    if (existingCommunity.length === 0) {
      await pool.query(
        `INSERT INTO playbook_sections (name, description, sport, is_default, is_published, sort_order)
         VALUES ($1, $2, $3, false, false, 1)`,
        [communityName, `Community-created plays for ${name}.`, name]
      );
      console.log(`[syncPlaybookDefaults] Created community playbook section for: ${name}`);
    }
  }

  console.log("[syncPlaybookDefaults] Playbook defaults sync complete.");
}
