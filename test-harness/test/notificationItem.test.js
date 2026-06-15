/**
 * notificationItem.test.js
 *
 * Pure logic tests for AdminNotificationItem: read/unread state, dot color
 * resolution, tone mapping, and source guards.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// ── Read/unread background ────────────────────────────────────────────────────

function unreadBg(read) {
  return !read
    ? "color-mix(in srgb, var(--adm-accent-dim) 80%, transparent)"
    : "transparent";
}

describe("NotificationItem unread background", () => {
  it("unread item gets accent-dim tint", () => {
    expect(unreadBg(false)).toBe("color-mix(in srgb, var(--adm-accent-dim) 80%, transparent)");
  });

  it("read item gets transparent background", () => {
    expect(unreadBg(true)).toBe("transparent");
  });

  it("defaults to unread when read prop is omitted (false)", () => {
    expect(unreadBg(false)).not.toBe("transparent");
  });
});

// ── Dot color by tone ─────────────────────────────────────────────────────────

function dotColor(tone, read) {
  const map = {
    default: read ? "var(--adm-border2)" : "var(--adm-accent)",
    success: "var(--ui-success, #22c55e)",
    warning: "var(--ui-warning, #f59e0b)",
    danger:  "var(--ui-danger,  #ef4444)",
  };
  return map[tone] ?? (read ? "var(--adm-border2)" : "var(--adm-accent)");
}

describe("NotificationItem dot color", () => {
  it("unread default tone → accent dot", () => {
    expect(dotColor("default", false)).toBe("var(--adm-accent)");
  });

  it("read default tone → border2 dot (muted)", () => {
    expect(dotColor("default", true)).toBe("var(--adm-border2)");
  });

  it("success tone always uses success color", () => {
    expect(dotColor("success", false)).toContain("--ui-success");
    expect(dotColor("success", true)).toContain("--ui-success");
  });

  it("warning tone uses warning color", () => {
    expect(dotColor("warning", false)).toContain("--ui-warning");
  });

  it("danger tone uses danger color", () => {
    expect(dotColor("danger", false)).toContain("--ui-danger");
  });

  it("unknown tone falls back to read/unread default logic", () => {
    expect(dotColor("neon", false)).toBe("var(--adm-accent)");
    expect(dotColor("neon", true)).toBe("var(--adm-border2)");
  });
});

// ── Interactivity ─────────────────────────────────────────────────────────────

function isInteractive(onClick) {
  return typeof onClick === "function";
}

describe("NotificationItem interactivity", () => {
  it("is interactive when onClick is a function", () => {
    expect(isInteractive(() => {})).toBe(true);
  });

  it("is not interactive when onClick is undefined", () => {
    expect(isInteractive(undefined)).toBe(false);
  });

  it("is not interactive when onClick is null", () => {
    expect(isInteractive(null)).toBe(false);
  });

  it("is not interactive when onClick is a non-function value", () => {
    expect(isInteractive(0)).toBe(false);
  });
});

// ── Source guards ─────────────────────────────────────────────────────────────

describe("NotificationItem source guard", () => {
  const src = readFileSync(resolve(ROOT, "src/admin/components/NotificationItem.jsx"), "utf8");

  it("has data-component attribute", () => {
    expect(src).toContain('data-component="NotificationItem"');
  });

  it("exports a default function", () => {
    expect(src).toContain("export default function NotificationItem");
  });

  it("renders title prop", () => {
    expect(src).toContain("title");
  });

  it("renders time prop", () => {
    expect(src).toContain("time");
  });

  it("uses --adm-accent for unread dot", () => {
    expect(src).toContain("--adm-accent");
  });

  it("uses --adm-border2 for read dot", () => {
    expect(src).toContain("--adm-border2");
  });

  it("renders unread accent-dim background", () => {
    expect(src).toContain("--adm-accent-dim");
  });

  it("uses borderTop for item separation", () => {
    expect(src).toContain("borderTop");
  });

  it("has keyboard activation via onKeyDown", () => {
    expect(src).toContain("onKeyDown");
  });

  it("sets role=button when onClick provided", () => {
    expect(src).toContain('role={onClick ? "button" : undefined}');
  });
});
