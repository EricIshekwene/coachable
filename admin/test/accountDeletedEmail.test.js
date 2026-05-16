/**
 * Tests for sendAccountDeletedEmail() in server/lib/email.js.
 *
 * Notifies users when their account is removed — either by the stale-account
 * auto-cleanup or by an admin Danger Mode delete — so they aren't silently
 * stranded on the login screen.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendAccountDeletedEmail,
  __setResendClientForTests,
} from "../../server/lib/email.js";

const sendMock = vi.fn();

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "stub" }, error: null });
  process.env.FROM_EMAIL = "Coachable <noreply@test>";
  process.env.FRONTEND_URL = "https://example.com";
  __setResendClientForTests({ emails: { send: sendMock } });
});

afterEach(() => {
  __setResendClientForTests(null);
});

describe("sendAccountDeletedEmail", () => {
  it("uses the 'unfinished signup' subject and copy when reason is 'stale'", async () => {
    await sendAccountDeletedEmail({
      toEmail: "user@example.com",
      userName: "Luke Bentvelzen",
      reason: "stale",
    });

    expect(sendMock).toHaveBeenCalledOnce();
    const payload = sendMock.mock.calls[0][0];
    expect(payload.to).toBe("user@example.com");
    expect(payload.subject).toMatch(/unfinished/i);
    expect(payload.html).toContain("Luke");
    expect(payload.html).toContain("never finished");
    expect(payload.html).toContain("https://example.com/signup");
  });

  it("uses the 'admin removed' subject and copy when reason is 'admin'", async () => {
    await sendAccountDeletedEmail({
      toEmail: "user@example.com",
      userName: "Luke Bentvelzen",
      reason: "admin",
    });

    const payload = sendMock.mock.calls[0][0];
    expect(payload.subject).toMatch(/was removed/i);
    expect(payload.html).toContain("admin has removed");
  });

  it("falls back to a generic greeting when no name is provided", async () => {
    await sendAccountDeletedEmail({
      toEmail: "user@example.com",
      userName: "",
      reason: "stale",
    });

    const payload = sendMock.mock.calls[0][0];
    expect(payload.html).toContain("Hey there");
  });

  it("throws when Resend returns an error", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "rate limited" } });

    await expect(
      sendAccountDeletedEmail({
        toEmail: "user@example.com",
        userName: "Luke",
        reason: "stale",
      })
    ).rejects.toThrow("rate limited");
  });
});
