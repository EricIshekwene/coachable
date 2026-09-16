/** Focused V1-to-V2 server admission-client contract tests. */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  requestV2CodeHandoff,
  requestV2EmailInvitation,
  verifyV2RollbackEvidence,
} from "../../server/lib/migrationAdmission.js";

const savedSecret = process.env.V1_ADMISSION_SECRET;
const savedBase = process.env.V2_BASE_URL;

afterEach(() => {
  vi.unstubAllGlobals();
  if (savedSecret === undefined) delete process.env.V1_ADMISSION_SECRET;
  else process.env.V1_ADMISSION_SECRET = savedSecret;
  if (savedBase === undefined) delete process.env.V2_BASE_URL;
  else process.env.V2_BASE_URL = savedBase;
});

function configure() {
  process.env.V1_ADMISSION_SECRET = "test-v1-admission-secret";
  process.env.V2_BASE_URL = "https://v2.example.test/";
}

describe("V2 admission service client", () => {
  it("hands a live standing code to V2's authenticated public admission route", async () => {
    configure();
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ intent: "opaque-handle", expiresInSeconds: 900 }),
    });
    vi.stubGlobal("fetch", fetch);

    await expect(requestV2CodeHandoff({ code: "LIVE-CODE", email: "new@example.test" }))
      .resolves.toEqual({ intent: "opaque-handle", expiresInSeconds: 900 });
    expect(fetch).toHaveBeenCalledWith("https://v2.example.test/api/admission/legacy-code", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "x-v1-admission-secret": "test-v1-admission-secret" }),
      body: JSON.stringify({ code: "LIVE-CODE", email: "new@example.test" }),
    }));
  });

  it("requests V2-native email delivery and accepts only its opaque acknowledgement", async () => {
    configure();
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ handoff: { kind: "v2_email_invitation", expiresInSeconds: 1209600 } }),
    });
    vi.stubGlobal("fetch", fetch);

    await expect(requestV2EmailInvitation({
      teamId: "11111111-1111-4111-8111-111111111111", email: "invitee@example.test", role: "coach",
    })).resolves.toEqual({ kind: "v2_email_invitation", expiresInSeconds: 1209600 });
    expect(fetch).toHaveBeenCalledWith("https://v2.example.test/api/admission/v1-email-invitation", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "x-v1-admission-secret": "test-v1-admission-secret" }),
    }));
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      teamId: "11111111-1111-4111-8111-111111111111", email: "invitee@example.test", role: "coach",
    });
  });

  it("rejects a delivery reply that is not the safe V2-native acknowledgement", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: "must-not-leak" }) }));

    await expect(requestV2EmailInvitation({ teamId: "team", email: "invitee@example.test", role: "player" }))
      .rejects.toThrow("invalid response");
  });

  it("accepts only an exact V2 rollback attestation for the requested fence", async () => {
    configure();
    const evidenceId = "33333333-3333-4333-8333-333333333333";
    const teamId = "11111111-1111-4111-8111-111111111111";
    const fenceGeneration = "22222222-2222-4222-8222-222222222222";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ attestation: {
      evidenceId, teamId, fenceGeneration,
      rollbackCompletedAt: "2026-09-16T01:02:00.000Z",
      v1FenceReleasePermittedAt: "2026-09-16T01:02:01.000Z",
    } }) }));

    await expect(verifyV2RollbackEvidence({ evidenceId, teamId, fenceGeneration })).resolves.toMatchObject({ evidenceId, teamId, fenceGeneration });
  });

  it("rejects a mismatched V2 rollback attestation", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ attestation: {
      evidenceId: "33333333-3333-4333-8333-333333333333",
      teamId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      fenceGeneration: "22222222-2222-4222-8222-222222222222",
      rollbackCompletedAt: "2026-09-16T01:02:00.000Z",
      v1FenceReleasePermittedAt: "2026-09-16T01:02:01.000Z",
    } }) }));

    await expect(verifyV2RollbackEvidence({
      evidenceId: "33333333-3333-4333-8333-333333333333",
      teamId: "11111111-1111-4111-8111-111111111111",
      fenceGeneration: "22222222-2222-4222-8222-222222222222",
    })).rejects.toThrow("invalid response");
  });
});
