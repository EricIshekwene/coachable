/** Focused V1-to-V2 server admission-client contract tests. */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  requestV2CodeHandoff,
  requestV2EmailInvitation,
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
});
