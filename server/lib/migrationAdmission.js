/**
 * Target-code admission boundary for the V1/V2 migration.  Unlike ordinary
 * migration-status consumers, this module fails closed: a cached default is
 * never evidence that a team is still V1-owned.
 */
import { getActiveMigrationAdmissionFence } from "./migrationAdmissionFence.js";
import { getFreshValidatedTeamStatus } from "./migrationStatus.js";

export const ADMISSION_IN_PROGRESS = "TEAM_MIGRATION_IN_PROGRESS";
export const CROSS_VERSION_REVIEW = "CROSS_VERSION_MEMBERSHIP_REVIEW_REQUIRED";

/**
 * Resolve a reusable standing code while the caller owns the transaction that
 * will perform its membership write. The shared team lock held by the fence
 * helper serializes this read with a fence acknowledgement.
 *
 * @param {{query: Function}} client
 * @param {string} rawCode
 * @returns {Promise<{outcome: 'v1_only'|'v2_live'|'invalid'|'in_progress', teamId?: string, role?: string}>}
 */
export async function resolveTargetCodeAdmission(client, rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  const codeResult = await client.query(
    "SELECT team_id, role FROM team_invite_codes WHERE code = $1",
    [code]
  );
  if (!codeResult.rows.length) return { outcome: "invalid" };

  const { team_id: teamId, role } = codeResult.rows[0];
  const fence = await getActiveMigrationAdmissionFence(teamId, client);
  if (fence) return { outcome: "in_progress" };

  const status = getFreshValidatedTeamStatus(teamId);
  if (status === "v1_only") return { outcome: "v1_only", teamId, role };
  if (status === "v2_live") return { outcome: "v2_live", teamId, role };
  return { outcome: "in_progress" };
}

/**
 * Check whether a V1 account has a membership that remains safely V1-owned.
 * Unknown/stale target rows are deliberately not treated as usable.
 *
 * @param {{query: Function}} client
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function hasUsableV1Membership(client, userId) {
  const result = await client.query(
    `SELECT tm.team_id
       FROM team_memberships tm
       JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = $1 AND t.deleted_at IS NULL`,
    [userId]
  );
  for (const row of result.rows) {
    if (getFreshValidatedTeamStatus(row.team_id) === "v1_only") return true;
  }
  return false;
}

/**
 * Exchange a live V1 standing code for V2's opaque, email-bound intent. The
 * raw code travels only on this authenticated server-to-server request.
 *
 * @param {{code: string, email: string}} input
 * @returns {Promise<{intent: string, expiresInSeconds: number}>}
 */
export async function requestV2CodeHandoff({ code, email }) {
  const secret = process.env.V1_ADMISSION_SECRET;
  const base = (process.env.V2_ADMISSION_BASE_URL || process.env.V2_BASE_URL || "").replace(/\/+$/, "");
  if (!secret || !base) throw new Error("V2 admission handoff is not configured");

  const response = await fetch(`${base}/api/admission/legacy-code`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-v1-admission-secret": secret,
    },
    body: JSON.stringify({ code, email }),
  });
  if (!response.ok) throw new Error("V2 admission handoff was refused");
  const body = await response.json();
  if (!body || typeof body.intent !== "string" || !Number.isFinite(body.expiresInSeconds)) {
    throw new Error("V2 admission handoff returned an invalid response");
  }
  return { intent: body.intent, expiresInSeconds: body.expiresInSeconds };
}

/**
 * Ask V2 to create and deliver its native, email-bound invitation for a
 * migrated team.  This deliberately has no V1 fallback: once a team is live,
 * V1 must neither persist an invite nor mail its reusable standing code.
 *
 * @param {{teamId: string, email: string, role: string}} input
 * @returns {Promise<{kind: string, expiresInSeconds: number}>}
 */
export async function requestV2EmailInvitation({ teamId, email, role }) {
  const secret = process.env.V1_ADMISSION_SECRET;
  const base = (process.env.V2_ADMISSION_BASE_URL || process.env.V2_BASE_URL || "").replace(/\/+$/, "");
  if (!secret || !base) throw new Error("V2 admission delivery is not configured");

  const response = await fetch(`${base}/api/admission/v1-email-invitation`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-v1-admission-secret": secret,
    },
    body: JSON.stringify({ teamId, email, role }),
  });
  if (!response.ok) throw new Error("V2 admission delivery was refused");
  const body = await response.json();
  const handoff = body?.handoff;
  if (!handoff || handoff.kind !== "v2_email_invitation" || !Number.isFinite(handoff.expiresInSeconds)) {
    throw new Error("V2 admission delivery returned an invalid response");
  }
  return { kind: handoff.kind, expiresInSeconds: handoff.expiresInSeconds };
}

/** @param {import('express').Response} res */
export function sendAdmissionInProgress(res) {
  return res.status(409).json({ code: ADMISSION_IN_PROGRESS, error: "Team migration is in progress. Please try again shortly." });
}
