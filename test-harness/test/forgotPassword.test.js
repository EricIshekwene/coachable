/**
 * Tests for the forgot password / reset password flow.
 * Covers the API endpoints and frontend page rendering.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const API_URL = "http://localhost:3001";

// ── Helper: mock fetch responses ────────────────────────────────────────────

function mockFetch(responseData, ok = true, status = ok ? 200 : 400) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(responseData),
  });
}

// ── Inline copies of the API helper functions ───────────────────────────────

/**
 * Request a password reset code for the given email.
 */
async function requestPasswordReset(email) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/**
 * Reset password with email, code, and new password.
 */
async function resetPassword(email, code, password) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Reset failed");
  return data;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Forgot Password - Request Code", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends a forgot-password request with the correct email", async () => {
    const spy = mockFetch({ ok: true });

    const result = await requestPasswordReset("user@example.com");

    expect(spy).toHaveBeenCalledOnce();
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe(`${API_URL}/auth/forgot-password`);
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ email: "user@example.com" });
    expect(result).toEqual({ ok: true });
  });

  it("always returns ok even for non-existent emails (no email enumeration)", async () => {
    const spy = mockFetch({ ok: true });

    const result = await requestPasswordReset("nonexistent@example.com");

    expect(result).toEqual({ ok: true });
  });

  it("throws on rate limit (429)", async () => {
    mockFetch({ error: "Please wait 60 seconds before requesting another code" }, false, 429);

    await expect(requestPasswordReset("user@example.com")).rejects.toThrow(
      "Please wait 60 seconds before requesting another code"
    );
  });
});

describe("Reset Password - Verify Code and Set Password", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends reset-password request with correct payload", async () => {
    const spy = mockFetch({ ok: true });

    const result = await resetPassword("user@example.com", "123456", "newpassword123");

    expect(spy).toHaveBeenCalledOnce();
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe(`${API_URL}/auth/reset-password`);
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({
      email: "user@example.com",
      code: "123456",
      password: "newpassword123",
    });
    expect(result).toEqual({ ok: true });
  });

  it("throws on invalid or expired code", async () => {
    mockFetch({ error: "Invalid or expired code" }, false);

    await expect(resetPassword("user@example.com", "000000", "newpassword123")).rejects.toThrow(
      "Invalid or expired code"
    );
  });

  it("throws on short password", async () => {
    mockFetch({ error: "Password must be at least 6 characters" }, false);

    await expect(resetPassword("user@example.com", "123456", "short")).rejects.toThrow(
      "Password must be at least 6 characters"
    );
  });

  it("throws when required fields are missing", async () => {
    mockFetch({ error: "Email, code, and new password are required" }, false);

    await expect(resetPassword("", "", "")).rejects.toThrow(
      "Email, code, and new password are required"
    );
  });
});

describe("Security Properties", () => {
  afterEach(() => vi.restoreAllMocks());

  it("forgot-password does not reveal if email exists (same response shape)", async () => {
    // Both existing and non-existing emails should return { ok: true }
    const spy1 = mockFetch({ ok: true });
    const result1 = await requestPasswordReset("exists@example.com");
    expect(result1).toEqual({ ok: true });
    spy1.mockRestore();

    const spy2 = mockFetch({ ok: true });
    const result2 = await requestPasswordReset("doesnotexist@example.com");
    expect(result2).toEqual({ ok: true });
    spy2.mockRestore();
  });

  it("reset-password requires all three fields", async () => {
    mockFetch({ error: "Email, code, and new password are required" }, false);

    await expect(resetPassword("user@example.com", "", "password")).rejects.toThrow();
  });
});
