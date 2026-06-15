/**
 * Unit tests for server/lib/validate.js helpers.
 *
 * These are the building blocks every mutation route uses to enforce input
 * type, length, and format. Lock down behavior so we catch regressions like
 * "oops, removed length check on the password field."
 */
import { describe, it, expect } from "vitest";
import {
  ValidationError,
  LIMITS,
  requireString,
  optionalString,
  requireEmail,
  optionalEmail,
  requirePassword,
  requireUuid,
  optionalUuid,
  requireEnum,
  optionalEnum,
  requireInt,
  requireBoolean,
  requireUrl,
  requireArray,
  requireSlug,
  requireCode,
} from "../../server/lib/validate.js";

describe("requireString", () => {
  it("returns trimmed value within bounds", () => {
    expect(requireString("  hello  ", { field: "x", max: 20 })).toBe("hello");
  });
  it("rejects empty string", () => {
    expect(() => requireString("", { field: "x" })).toThrow(ValidationError);
  });
  it("rejects whitespace-only", () => {
    expect(() => requireString("   ", { field: "x" })).toThrow(ValidationError);
  });
  it("rejects strings exceeding max", () => {
    expect(() => requireString("a".repeat(101), { field: "x", max: 100 })).toThrow(/at most 100/);
  });
  it("rejects non-string types", () => {
    expect(() => requireString(123, { field: "x" })).toThrow(/must be a string/);
    expect(() => requireString(null, { field: "x" })).toThrow(/must be a string/);
  });
  it("sets status 400 on the thrown error", () => {
    try { requireString(null, { field: "x" }); }
    catch (e) { expect(e.status).toBe(400); }
  });
});

describe("optionalString", () => {
  it("returns undefined for null/undefined/empty", () => {
    expect(optionalString(null, { field: "x" })).toBeUndefined();
    expect(optionalString(undefined, { field: "x" })).toBeUndefined();
    expect(optionalString("", { field: "x" })).toBeUndefined();
    expect(optionalString("   ", { field: "x" })).toBeUndefined();
  });
  it("returns trimmed value when present", () => {
    expect(optionalString("  foo  ", { field: "x", max: 10 })).toBe("foo");
  });
  it("rejects oversize strings", () => {
    expect(() => optionalString("a".repeat(201), { field: "x", max: 200 })).toThrow();
  });
});

describe("requireEmail", () => {
  it("accepts well-formed emails", () => {
    expect(requireEmail("foo@bar.com")).toBe("foo@bar.com");
    expect(requireEmail("  FOO@BAR.com  ")).toBe("foo@bar.com");
  });
  it("rejects malformed emails", () => {
    expect(() => requireEmail("not-an-email")).toThrow(/valid email/);
    expect(() => requireEmail("a@b")).toThrow(/valid email/);
    expect(() => requireEmail("")).toThrow();
  });
  it("rejects emails over the RFC max", () => {
    const huge = "a".repeat(LIMITS.EMAIL + 1) + "@x.com";
    expect(() => requireEmail(huge)).toThrow(/at most/);
  });
});

describe("optionalEmail", () => {
  it("returns undefined for null/empty", () => {
    expect(optionalEmail(null)).toBeUndefined();
    expect(optionalEmail("")).toBeUndefined();
  });
  it("validates when present", () => {
    expect(optionalEmail("a@b.com")).toBe("a@b.com");
    expect(() => optionalEmail("nope")).toThrow();
  });
});

describe("requirePassword", () => {
  it("accepts passwords within bounds", () => {
    expect(requirePassword("hunter2")).toBe("hunter2");
  });
  it("rejects too-short", () => {
    expect(() => requirePassword("abc")).toThrow(/at least 6/);
  });
  it("rejects too-long", () => {
    expect(() => requirePassword("a".repeat(LIMITS.PASSWORD_MAX + 1))).toThrow(/at most/);
  });
  it("rejects non-string", () => {
    expect(() => requirePassword(12345678)).toThrow(/must be a string/);
  });
});

describe("requireUuid / optionalUuid", () => {
  const VALID = "12345678-1234-1234-1234-123456789012";
  it("accepts valid UUIDs", () => {
    expect(requireUuid(VALID, { field: "id" })).toBe(VALID);
  });
  it("rejects malformed UUIDs", () => {
    expect(() => requireUuid("not-a-uuid", { field: "id" })).toThrow();
    expect(() => requireUuid("", { field: "id" })).toThrow();
  });
  it("optional returns undefined for empty", () => {
    expect(optionalUuid(null, { field: "id" })).toBeUndefined();
    expect(optionalUuid("", { field: "id" })).toBeUndefined();
    expect(optionalUuid(VALID, { field: "id" })).toBe(VALID);
  });
});

describe("requireEnum / optionalEnum", () => {
  it("accepts allowed values", () => {
    expect(requireEnum("a", ["a", "b"], { field: "x" })).toBe("a");
  });
  it("rejects disallowed values", () => {
    expect(() => requireEnum("c", ["a", "b"], { field: "x" })).toThrow(/one of: a, b/);
  });
  it("optional returns undefined for empty", () => {
    expect(optionalEnum(null, ["a"], { field: "x" })).toBeUndefined();
    expect(optionalEnum("", ["a"], { field: "x" })).toBeUndefined();
  });
});

describe("requireInt", () => {
  it("accepts integers within bounds", () => {
    expect(requireInt(5, { field: "n", min: 0, max: 10 })).toBe(5);
  });
  it("coerces numeric strings", () => {
    expect(requireInt("7", { field: "n", min: 0, max: 10 })).toBe(7);
  });
  it("rejects non-integers", () => {
    expect(() => requireInt(1.5, { field: "n" })).toThrow(/integer/);
    expect(() => requireInt("abc", { field: "n" })).toThrow(/integer/);
  });
  it("rejects out-of-bounds", () => {
    expect(() => requireInt(-1, { field: "n", min: 0 })).toThrow(/>= 0/);
    expect(() => requireInt(100, { field: "n", max: 10 })).toThrow(/<= 10/);
  });
});

describe("requireBoolean", () => {
  it("accepts true/false", () => {
    expect(requireBoolean(true, { field: "b" })).toBe(true);
    expect(requireBoolean(false, { field: "b" })).toBe(false);
  });
  it("rejects truthy non-booleans", () => {
    expect(() => requireBoolean("true", { field: "b" })).toThrow();
    expect(() => requireBoolean(1, { field: "b" })).toThrow();
  });
});

describe("requireUrl", () => {
  it("accepts http(s) URLs", () => {
    expect(requireUrl("https://example.com", { field: "u" })).toBe("https://example.com");
    expect(requireUrl("http://x.y", { field: "u" })).toBe("http://x.y");
  });
  it("rejects non-http", () => {
    expect(() => requireUrl("ftp://x.y", { field: "u" })).toThrow(/valid http/);
    expect(() => requireUrl("javascript:alert(1)", { field: "u" })).toThrow();
  });
});

describe("requireArray", () => {
  it("accepts arrays within bounds", () => {
    expect(requireArray([1, 2, 3], { field: "a", min: 1, max: 5 })).toEqual([1, 2, 3]);
  });
  it("rejects non-arrays", () => {
    expect(() => requireArray("foo", { field: "a" })).toThrow(/must be an array/);
  });
  it("rejects oversized arrays", () => {
    expect(() => requireArray(new Array(101).fill(0), { field: "a", max: 100 })).toThrow(/at most 100/);
  });
  it("rejects undersized arrays", () => {
    expect(() => requireArray([], { field: "a", min: 1 })).toThrow(/at least 1/);
  });
});

describe("requireSlug", () => {
  it("accepts alphanumeric + dash/underscore", () => {
    expect(requireSlug("rugby-7s_v2", { field: "s" })).toBe("rugby-7s_v2");
  });
  it("rejects special chars", () => {
    expect(() => requireSlug("foo bar", { field: "s" })).toThrow();
    expect(() => requireSlug("foo.bar", { field: "s" })).toThrow();
    expect(() => requireSlug("../etc/passwd", { field: "s" })).toThrow();
  });
});

describe("requireCode", () => {
  it("accepts 6-digit codes", () => {
    expect(requireCode("123456")).toBe("123456");
    expect(requireCode("  654321  ")).toBe("654321");
  });
  it("rejects wrong length", () => {
    expect(() => requireCode("12345")).toThrow();
    expect(() => requireCode("1234567")).toThrow();
  });
  it("rejects non-digit", () => {
    expect(() => requireCode("12345a")).toThrow();
  });
});

describe("LIMITS exposed for client mirroring", () => {
  it("matches the values the frontend expects", () => {
    expect(LIMITS.NAME).toBe(80);
    expect(LIMITS.EMAIL).toBe(254);
    expect(LIMITS.TITLE).toBe(200);
    expect(LIMITS.PASSWORD_MIN).toBe(6);
  });
});
