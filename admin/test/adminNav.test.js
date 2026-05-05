/**
 * adminNav.test.js
 *
 * Tests for the adminPath() helper that builds base-path-aware URLs
 * for all admin navigation, ensuring no hardcoded "/admin/..." strings.
 */

import { describe, it, expect } from "vitest";
import { adminPath } from "../../src/admin/adminNav.js";

describe("adminPath", () => {
  it("returns basePath + path when both provided", () => {
    expect(adminPath("/admin", "/users/123")).toBe("/admin/users/123");
  });

  it("returns basePath only when path is empty string", () => {
    expect(adminPath("/admin", "")).toBe("/admin");
  });

  it("works with /admin2 basePath", () => {
    expect(adminPath("/admin2", "/app")).toBe("/admin2/app");
  });

  it("handles nested paths correctly", () => {
    expect(adminPath("/admin", "/presets/rugby/abc-123")).toBe("/admin/presets/rugby/abc-123");
  });

  it("does not add a trailing slash for empty path", () => {
    const result = adminPath("/admin", "");
    expect(result.endsWith("/")).toBe(false);
  });

  it("handles paths with query strings", () => {
    expect(adminPath("/admin", "/users?page=2")).toBe("/admin/users?page=2");
  });

  it("output for /admin2 basePath differs from /admin", () => {
    const a = adminPath("/admin", "/app");
    const b = adminPath("/admin2", "/app");
    expect(a).not.toBe(b);
    expect(b).toBe("/admin2/app");
  });
});
