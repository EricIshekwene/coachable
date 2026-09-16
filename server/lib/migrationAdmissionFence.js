/**
 * Durable V1 admission fence for a V2 migration closure.
 *
 * Callers that decide whether a membership may be inserted pass their existing
 * transaction client to `getActiveMigrationAdmissionFence()`. The helper first
 * takes a transaction-held shared lock on the stable parent `teams` row, then
 * reads the fence. The fence endpoint takes that same row `FOR UPDATE` before
 * it acknowledges. This is the shared serialization point for the no-fence-row
 * case: an admission either commits while the fence waits, or waits, observes
 * the committed fence, and refuses its membership write.
 */

import pool from "../db/pool.js";

/** Matches the UUIDs used for V1 teams and V2 migration jobs. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** @param {unknown} value @returns {value is string} */
export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Read the active fence using either the shared pool or a caller-owned client.
 * The optional client is deliberately not wrapped in a transaction here.
 *
 * @param {string} teamId
 * @param {{query: Function}} [db]
 * @returns {Promise<{teamId: string, fenceGeneration: string, jobId: string, acknowledgedAt: string, reason: string|null}|null>}
 */
export async function getActiveMigrationAdmissionFence(teamId, db = pool) {
  if (!isUuid(teamId)) return null;
  // Keep this lock until the caller's membership transaction commits. Do not
  // replace it with a lock on migration_admission_fences: the first fence has
  // no child row to lock yet.
  const team = await db.query(
    "SELECT id FROM teams WHERE id = $1 FOR SHARE",
    [teamId]
  );
  if (!team.rows[0]) return null;
  const { rows } = await db.query(
    `SELECT team_id, fence_generation, migration_job_id, acknowledged_at, reason
       FROM migration_admission_fences
      WHERE team_id = $1
        AND fenced = TRUE
        AND released_at IS NULL`,
    [teamId]
  );
  if (!rows[0]) return null;
  return toFence(rows[0]);
}

/** @param {Record<string, unknown>} row */
function toFence(row) {
  return {
    teamId: row.team_id,
    fenceGeneration: row.fence_generation,
    jobId: row.migration_job_id,
    acknowledgedAt: new Date(row.acknowledged_at).toISOString(),
    reason: row.reason ?? null,
  };
}

/**
 * Persist a fence inside an already-open transaction.
 *
 * An active fence is never replaced by a different opaque generation. V2 may
 * retry the same `(teamId, fenceGeneration)` safely, but an older closure can
 * never overwrite or later clear a newer one.
 *
 * @param {{query: Function}} client
 * @param {{teamId: string, fenceGeneration: string, jobId: string, reason?: string|null}} input
 * @returns {Promise<{outcome: 'acknowledged'|'released'|'generation_conflict', fence?: ReturnType<typeof toFence>}>}
 */
export async function acknowledgeMigrationAdmissionFence(client, input) {
  const { rows } = await client.query(
    `SELECT team_id, fence_generation, migration_job_id, acknowledged_at, released_at, reason
       FROM migration_admission_fences
      WHERE team_id = $1
      FOR UPDATE`,
    [input.teamId]
  );
  const current = rows[0];

  if (!current) {
    const inserted = await client.query(
      `INSERT INTO migration_admission_fences
         (team_id, fence_generation, migration_job_id, fenced, acknowledged_at, reason)
       VALUES ($1, $2, $3, TRUE, now(), $4)
       RETURNING team_id, fence_generation, migration_job_id, acknowledged_at, reason`,
      [input.teamId, input.fenceGeneration, input.jobId, input.reason ?? null]
    );
    return { outcome: "acknowledged", fence: toFence(inserted.rows[0]) };
  }

  if (current.fence_generation !== input.fenceGeneration) {
    if (current.released_at === null) return { outcome: "generation_conflict" };
    const replaced = await client.query(
      `UPDATE migration_admission_fences
          SET fence_generation = $2,
              migration_job_id = $3,
              fenced = TRUE,
              acknowledged_at = now(),
              released_at = NULL,
              reason = $4,
              updated_at = now()
        WHERE team_id = $1
        RETURNING team_id, fence_generation, migration_job_id, acknowledged_at, reason`,
      [input.teamId, input.fenceGeneration, input.jobId, input.reason ?? null]
    );
    return { outcome: "acknowledged", fence: toFence(replaced.rows[0]) };
  }

  if (current.released_at !== null) return { outcome: "released" };
  return { outcome: "acknowledged", fence: toFence(current) };
}

/**
 * Release exactly the acknowledged generation inside an already-open
 * transaction. A mismatched generation is refused rather than clearing the
 * current fence, which is the stale-release safety property.
 *
 * @param {{query: Function}} client
 * @param {{teamId: string, fenceGeneration: string, reason?: string|null}} input
 * @returns {Promise<'released'|'not_found'|'generation_conflict'>}
 */
export async function releaseMigrationAdmissionFence(client, input) {
  const { rows } = await client.query(
    `SELECT fence_generation, released_at
       FROM migration_admission_fences
      WHERE team_id = $1
      FOR UPDATE`,
    [input.teamId]
  );
  const current = rows[0];
  if (!current) return "not_found";
  if (current.fence_generation !== input.fenceGeneration) return "generation_conflict";
  if (current.released_at !== null) return "released";
  await client.query(
    `UPDATE migration_admission_fences
        SET fenced = FALSE,
            released_at = now(),
            reason = COALESCE($2, reason),
            updated_at = now()
      WHERE team_id = $1
        AND fence_generation = $3`,
    [input.teamId, input.reason ?? null, input.fenceGeneration]
  );
  return "released";
}
