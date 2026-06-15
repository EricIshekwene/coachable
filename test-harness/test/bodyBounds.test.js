/**
 * Tests for the global bodyBoundsCheck middleware.
 *
 * Calls the middleware directly with stub req/res objects — avoids spinning
 * up Express. Verifies that oversized strings/arrays are rejected with 400
 * and that exempt paths are passed through.
 */
import { describe, it, expect, vi } from "vitest";
import { bodyBoundsCheck } from "../../server/middleware/bodyBounds.js";

function stubResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function run(req) {
  const res = stubResponse();
  const next = vi.fn();
  bodyBoundsCheck(req, res, next);
  return { res, next };
}

describe("bodyBoundsCheck", () => {
  it("passes through small payloads", () => {
    const { res, next } = run({ originalUrl: "/auth/signup", body: { email: "a@b.com", name: "x" } });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it("rejects a single 100KB string field", () => {
    const huge = "x".repeat(100 * 1024);
    const { res, next } = run({ originalUrl: "/auth/signup", body: { name: huge } });
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/string field exceeds/);
  });

  it("rejects arrays larger than the limit", () => {
    const arr = new Array(20_000).fill("x");
    const { res, next } = run({ originalUrl: "/auth/signup", body: { tags: arr } });
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/array field exceeds/);
  });

  it("rejects deeply nested objects", () => {
    let nested = {};
    let cursor = nested;
    for (let i = 0; i < 20; i++) {
      cursor.child = {};
      cursor = cursor.child;
    }
    const { res, next } = run({ originalUrl: "/auth/signup", body: nested });
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/nested too deeply/);
  });

  it("rejects objects with too many keys", () => {
    const huge = {};
    for (let i = 0; i < 1000; i++) huge["k" + i] = "v";
    const { res, next } = run({ originalUrl: "/auth/signup", body: huge });
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("exempts /teams/* — play payloads can be large", () => {
    const huge = "x".repeat(200 * 1024);
    const { res, next } = run({ originalUrl: "/teams/abc/plays", body: { playData: huge } });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it("exempts /admin/email — broadcast bodies can be large", () => {
    const huge = "x".repeat(200 * 1024);
    const { res, next } = run({ originalUrl: "/admin/email/broadcasts", body: { html: huge } });
    expect(next).toHaveBeenCalledOnce();
  });

  it("passes through when body is not an object (e.g. GET with empty body)", () => {
    const { res, next } = run({ originalUrl: "/auth/me", body: undefined });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it("walks nested arrays of strings", () => {
    const huge = "x".repeat(100 * 1024);
    const { res, next } = run({ originalUrl: "/auth/signup", body: { tags: ["ok", huge, "also ok"] } });
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });
});
