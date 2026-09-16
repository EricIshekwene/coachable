/** Authenticated internal API for V2's durable migration admission fence. */

import crypto from "crypto";
import { Router } from "express";
import pool from "../db/pool.js";
import {
  acknowledgeMigrationAdmissionFence,
  isUuid,
} from "../lib/migrationAdmissionFence.js";

export const FENCE_AUTH_SCHEME = "Bearer";

/** @param {string|undefined} supplied @param {string|undefined} expected */
export function hasValidFenceSecret(supplied, expected) {
  if (!supplied || !expected) return false;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && crypto.timingSafeEqual(suppliedBytes, expectedBytes);
}

/** @param {unknown} authorization */
export function bearerFenceSecret(authorization) {
  if (typeof authorization !== "string") return null;
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  return match ? match[1] : null;
}

/** @param {unknown} body */
export function parseFenceRequest(body) {
  if (!body || typeof body !== "object") return { ok: false, code: "INVALID_FENCE_REQUEST" };
  const { action = "fence", teamId, fenceGeneration, reason } = body;
  if (!isUuid(teamId) || !isUuid(fenceGeneration)) {
    return { ok: false, code: "INVALID_FENCE_REQUEST" };
  }
  // Release is deliberately NOT an endpoint operation yet. D4 requires
  // recorded V2 terminal rollback evidence before it can happen; V1-4 owns
  // that operator/audit boundary. This Wave 1 route only acknowledges fences.
  if (action !== "fence") return { ok: false, code: "INVALID_FENCE_REQUEST" };
  if (reason !== undefined && (typeof reason !== "string" || reason.length > 500)) {
    return { ok: false, code: "INVALID_FENCE_REQUEST" };
  }
  // V2's fence generation is its migration-job UUID. Keeping one canonical
  // value prevents a caller from claiming one job while releasing another.
  return { ok: true, value: { action, teamId, jobId: fenceGeneration, fenceGeneration, reason: reason ?? null } };
}

/**
 * Construct the router with injectable dependencies for focused route tests.
 * @param {{connect: Function}} [database]
 * @param {() => string|undefined} [secretForRequest]
 */
export function createInternalMigrationAdmissionFenceRouter(
  database = pool,
  secretForRequest = () => process.env.V1_MIGRATION_FENCE_SECRET
) {
  const router = Router();
  router.post("/migration-admission-fences", async (req, res) => {
    const expectedSecret = secretForRequest();
    const authorization = req.get?.("authorization") ?? req.headers?.authorization;
    if (!hasValidFenceSecret(bearerFenceSecret(authorization), expectedSecret)) {
      return res.status(401).json({ code: "UNAUTHORIZED" });
    }
    const parsed = parseFenceRequest(req.body);
    if (!parsed.ok) return res.status(400).json({ code: parsed.code });

    let client;
    let begun = false;
    try {
      client = await database.connect();
      await client.query("BEGIN");
      begun = true;
      // This conflicts with the shared parent-row lock taken by
      // getActiveMigrationAdmissionFence() inside an admission transaction.
      // It closes the first-fence-row race before this endpoint can acknowledge.
      const knownTeam = await client.query("SELECT id FROM teams WHERE id = $1 FOR UPDATE", [parsed.value.teamId]);
      if (!knownTeam.rows[0]) {
        await client.query("ROLLBACK");
        begun = false;
        return res.status(404).json({ code: "TEAM_NOT_FOUND" });
      }

      const result = await acknowledgeMigrationAdmissionFence(client, parsed.value);
      if (result.outcome === "generation_conflict") {
        await client.query("ROLLBACK");
        begun = false;
        return res.status(409).json({ code: "FENCE_GENERATION_CONFLICT" });
      }
      if (result.outcome === "released") {
        await client.query("ROLLBACK");
        begun = false;
        return res.status(409).json({ code: "FENCE_ALREADY_RELEASED" });
      }
      await client.query("COMMIT");
      begun = false;
      return res.status(200).json({ teamId: result.fence.teamId, fenceGeneration: result.fence.fenceGeneration, fenced: true, acknowledgedAt: result.fence.acknowledgedAt });
    } catch {
      if (client && begun) {
        try { await client.query("ROLLBACK"); } catch { /* preserve the safe generic response */ }
      }
      return res.status(503).json({ code: "MIGRATION_FENCE_UNAVAILABLE" });
    } finally {
      client?.release();
    }
  });
  return router;
}

export default createInternalMigrationAdmissionFenceRouter();
