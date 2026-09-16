/** Operator-only, evidence-preserving V1 migration admission reporting. */

import { Router } from "express";
import pool from "../db/pool.js";
import { requireOwnerOrLegacyAdmin, writeAudit } from "../middleware/staffAuth.js";
import { isUuid, releaseMigrationAdmissionFence } from "../lib/migrationAdmissionFence.js";
import {
  getPostFenceMembershipEvidence,
  recordFenceRelease,
  recordV2RollbackEvidence,
} from "../lib/migrationAdmissionAudit.js";

function isIsoTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

/** @param {unknown} body */
export function parseTerminalReleaseRequest(body) {
  if (!body || typeof body !== "object") return { ok: false };
  const { teamId, fenceGeneration, terminalOutcome, v2RollbackEvidenceId, v2RollbackCompletedAt, reason } = body;
  if (!isUuid(teamId) || !isUuid(fenceGeneration) || !isUuid(v2RollbackEvidenceId)) return { ok: false };
  if (!['rollback', 'failed'].includes(terminalOutcome) || !isIsoTimestamp(v2RollbackCompletedAt)) return { ok: false };
  if (reason !== undefined && (typeof reason !== "string" || reason.length > 500)) return { ok: false };
  return { ok: true, value: { teamId, fenceGeneration, terminalOutcome, v2RollbackEvidenceId, v2RollbackCompletedAt, reason: reason ?? null } };
}

/**
 * Constructed separately for focused tests. This router does not implement
 * repair: it offers a report and an explicit terminal-release recording step.
 */
export function createMigrationAdmissionAuditRouter(database = pool, auditWriter = writeAudit) {
  const router = Router();

  router.get("/teams/:teamId/report", requireOwnerOrLegacyAdmin, async (req, res, next) => {
    if (!isUuid(req.params.teamId)) return res.status(400).json({ code: "INVALID_TEAM_ID" });
    try {
      const evidence = await getPostFenceMembershipEvidence(database, req.params.teamId);
      return res.json({ teamId: req.params.teamId, evidence });
    } catch (err) {
      return next(err);
    }
  });

  router.post("/fence-release", requireOwnerOrLegacyAdmin, async (req, res, next) => {
    const parsed = parseTerminalReleaseRequest(req.body);
    if (!parsed.ok) return res.status(400).json({ code: "INVALID_TERMINAL_RELEASE_REQUEST" });
    const input = parsed.value;
    let client;
    let begun = false;
    try {
      client = await database.connect();
      await client.query("BEGIN");
      begun = true;

      // Durable V2 rollback evidence is written before the release mutation.
      // There is no automatic rollback, data repair, invitation reissue, or
      // membership deletion in this path.
      const rollbackEvidence = await recordV2RollbackEvidence(client, { ...input, actor: req.actor });
      const release = await releaseMigrationAdmissionFence(client, input);
      if (release !== "released") {
        await client.query("ROLLBACK");
        begun = false;
        return res.status(release === "not_found" ? 404 : 409).json({ code: `FENCE_${release.toUpperCase()}` });
      }
      const releaseEvent = await recordFenceRelease(client, {
        ...input,
        rollbackEvidenceRecordId: rollbackEvidence.id,
        actor: req.actor,
      });
      await client.query("COMMIT");
      begun = false;
      // This is an operator action audit, separate from the immutable
      // migration evidence. It never contains the V2 evidence value itself.
      await auditWriter(req, "migrationAdmission.fenceRelease", {
        targetType: "team",
        targetId: input.teamId,
        metadata: { fenceGeneration: input.fenceGeneration, terminalOutcome: input.terminalOutcome, evidenceRecordId: rollbackEvidence.id, releaseEventId: releaseEvent.id },
      });
      return res.status(200).json({
        teamId: input.teamId,
        fenceGeneration: input.fenceGeneration,
        released: true,
        rollbackEvidenceRecordId: rollbackEvidence.id,
        releaseEventId: releaseEvent.id,
      });
    } catch (err) {
      if (client && begun) {
        try { await client.query("ROLLBACK"); } catch { /* safe generic error */ }
      }
      return next(err);
    } finally {
      client?.release();
    }
  });
  return router;
}

export default createMigrationAdmissionAuditRouter();
