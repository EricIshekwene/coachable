/**
 * Evidence-preserving audit helpers for the V1 migration admission boundary.
 *
 * This module deliberately stores fingerprints, never invitation codes,
 * passwords, bearer values, or V2 intents.  It is used for operational
 * reconciliation, not for automatically repairing an admission discrepancy.
 */

import crypto from "crypto";

const DEFAULT_FINGERPRINT_KEY = "migration-audit-development-key";

/**
 * Produce an opaque stable fingerprint. Production must configure a distinct
 * key; the fallback only keeps local/test environments deterministic.
 * @param {string} value
 */
export function migrationAuditFingerprint(value) {
  const key = process.env.MIGRATION_AUDIT_FINGERPRINT_SECRET || process.env.CODE_PEPPER || DEFAULT_FINGERPRINT_KEY;
  return crypto.createHmac("sha256", key).update(String(value)).digest("hex");
}

/** @param {string|undefined|null} code */
export function credentialFingerprint(code) {
  if (typeof code !== "string" || !code.trim()) return null;
  return migrationAuditFingerprint(`standing-code:${code.trim().toUpperCase()}`);
}

/**
 * Persist a decision within a caller's transaction. Allowed decisions are
 * intentionally compact and contain no raw credential or personally readable
 * address. Callers that roll the transaction back must record the refusal
 * afterwards through recordAdmissionDecisionOutOfBand().
 */
export async function recordAdmissionDecision(client, input) {
  await client.query(
    `INSERT INTO migration_admission_audit_events
       (event_type, team_id, fence_generation, decision, source, credential_fingerprint, metadata)
     VALUES ('resolver_decision', $1, $2, $3, $4, $5, $6)`,
    [
      input.teamId ?? null,
      input.fenceGeneration ?? null,
      input.decision,
      input.source,
      input.credentialFingerprint ?? null,
      input.metadata ?? {},
    ]
  );
}

/**
 * Record a resolver decision independently from its caller's admission
 * transaction. This separate, tiny write preserves refused decisions too;
 * putting it in the admission transaction would erase the very evidence
 * needed for a fence/live refusal. Audit unavailability never changes the
 * fail-closed admission decision.
 */
export async function recordResolverDecision(database, input) {
  try {
    await recordAdmissionDecision(database, input);
  } catch {
    // Do not turn an evidence-store outage into an unsafe allow. Operators can
    // observe the gap through normal database/service monitoring; no secret or
    // credential is logged here.
  }
}

/**
 * Record the V2 rollback evidence immediately before a V1 fence release.
 * Both the evidence and the release event belong to the same V1 transaction,
 * so a release cannot commit without durable evidence of the terminal V2
 * rollback outcome. The caller must still be an authenticated operator.
 */
export async function recordV2RollbackEvidence(client, input) {
  const result = await client.query(
    `INSERT INTO migration_admission_audit_events
       (event_type, team_id, fence_generation, decision, source, v2_rollback_evidence_id, metadata, actor_auth_mode, actor_user_id)
     VALUES ('v2_rollback_evidence', $1, $2, $3, 'operator_release', $4, $5, $6, $7)
     RETURNING id, occurred_at`,
    [
      input.teamId,
      input.fenceGeneration,
      input.terminalOutcome,
      input.v2RollbackEvidenceId,
      { v2RollbackCompletedAt: input.v2RollbackCompletedAt, reason: input.reason },
      input.actor?.authMode ?? null,
      input.actor?.userId ?? null,
    ]
  );
  return result.rows[0];
}

export async function recordFenceRelease(client, input) {
  const result = await client.query(
    `INSERT INTO migration_admission_audit_events
       (event_type, team_id, fence_generation, decision, source, related_evidence_id, metadata, actor_auth_mode, actor_user_id)
     VALUES ('fence_release', $1, $2, $3, 'operator_release', $4, $5, $6, $7)
     RETURNING id, occurred_at`,
    [
      input.teamId,
      input.fenceGeneration,
      input.terminalOutcome,
      input.rollbackEvidenceRecordId,
      { reason: input.reason },
      input.actor?.authMode ?? null,
      input.actor?.userId ?? null,
    ]
  );
  return result.rows[0];
}

/**
 * Load the immutable evidence for memberships created after the durable fence
 * acknowledgement. This is a read-only reconciliation report; it never
 * matches identities by email, creates a V2 invite, backfills, or deletes.
 */
export async function getPostFenceMembershipEvidence(database, teamId) {
  const { rows } = await database.query(
    `SELECT
       f.team_id,
       f.fence_generation,
       f.migration_job_id,
       f.acknowledged_at,
       f.released_at,
       tm.id AS membership_id,
       tm.user_id,
       tm.joined_at
     FROM migration_admission_fence_history f
     LEFT JOIN team_memberships tm
       ON tm.team_id = f.team_id
      AND tm.joined_at >= f.acknowledged_at
     WHERE f.team_id = $1
     ORDER BY f.acknowledged_at ASC, tm.joined_at ASC NULLS LAST`,
    [teamId]
  );
  return rows.map((row) => ({
    teamId: row.team_id,
    fenceGeneration: row.fence_generation,
    migrationJobId: row.migration_job_id,
    acknowledgedAt: new Date(row.acknowledged_at).toISOString(),
    releasedAt: row.released_at ? new Date(row.released_at).toISOString() : null,
    membership: row.membership_id ? {
      id: row.membership_id,
      userId: row.user_id,
      joinedAt: new Date(row.joined_at).toISOString(),
      evidenceFingerprint: migrationAuditFingerprint(`membership:${row.membership_id}:${row.fence_generation}`),
    } : null,
  }));
}
