/**
 * Unit tests for the signup spam blocklist heuristics added after the
 * 2026-05-27 Turkish gambling promo burst (70k+ fake accounts).
 */
import { describe, it, expect } from "vitest";
import { isBlockedName, isBlockedEmailDomain } from "../../server/lib/signupBlocklist.js";

describe("isBlockedName", () => {
  it("blocks the exact spam name from the 2026-05-27 attack", () => {
    expect(isBlockedName("🔥5.000TL🔥Bonus🔥For🔥You🔥https://bit.ly/3RluJej 🔥")).toBe(true);
  });

  it("blocks the variant Turkish promo name", () => {
    expect(isBlockedName("🔥5.000 TL + 100% - Tam İade Garantili! https://bit.ly/4v2bNQr 🔥")).toBe(true);
  });

  it("blocks any name with a URL", () => {
    expect(isBlockedName("Click https://evil.example")).toBe(true);
    expect(isBlockedName("Visit www.spam.example for prizes")).toBe(true);
  });

  it("blocks names with bit.ly even without a full URL", () => {
    expect(isBlockedName("free money bit.ly/abc")).toBe(true);
  });

  it("blocks names with two or more fire emojis", () => {
    expect(isBlockedName("🔥🔥 hot deal")).toBe(true);
  });

  it("blocks names containing 1win/casino/bahis tokens", () => {
    expect(isBlockedName("1win bonus")).toBe(true);
    expect(isBlockedName("Casino King")).toBe(true);
    expect(isBlockedName("Bahis promo")).toBe(true);
  });

  it("allows normal user names", () => {
    expect(isBlockedName("Eric Ishekwene")).toBe(false);
    expect(isBlockedName("Jean-Luc Picard")).toBe(false);
    expect(isBlockedName("李雷")).toBe(false);
    expect(isBlockedName("María José")).toBe(false);
    expect(isBlockedName("Coach 🔥")).toBe(false); // single fire emoji is fine
  });

  it("ignores non-string input", () => {
    expect(isBlockedName(null)).toBe(false);
    expect(isBlockedName(undefined)).toBe(false);
    expect(isBlockedName(123)).toBe(false);
  });
});

describe("isBlockedEmailDomain", () => {
  it("blocks 1win.* gambling domains", () => {
    expect(isBlockedEmailDomain("a@1win.com")).toBe(true);
    expect(isBlockedEmailDomain("a@1win.xyz")).toBe(true);
  });

  it("blocks the gmail/icloud/hotmail typo-squats seen in the attack", () => {
    expect(isBlockedEmailDomain("user@gmail.com.com")).toBe(true);
    expect(isBlockedEmailDomain("user@gmail.com.tr")).toBe(true);
    expect(isBlockedEmailDomain("user@gmail.cok")).toBe(true);
    expect(isBlockedEmailDomain("user@icloud.con")).toBe(true);
    expect(isBlockedEmailDomain("user@hotmail.con")).toBe(true);
    expect(isBlockedEmailDomain("user@hotmail.com.tr")).toBe(true);
    expect(isBlockedEmailDomain("user@outlook.com.tr")).toBe(true);
  });

  it("blocks the punycode/IDN gmail lookalike", () => {
    expect(isBlockedEmailDomain("user@xn--gmal-nza.com")).toBe(true);
  });

  it("allows legitimate domains", () => {
    expect(isBlockedEmailDomain("user@gmail.com")).toBe(false);
    expect(isBlockedEmailDomain("user@icloud.com")).toBe(false);
    expect(isBlockedEmailDomain("user@hotmail.com")).toBe(false);
    expect(isBlockedEmailDomain("user@osu.edu")).toBe(false);
    expect(isBlockedEmailDomain("user@proton.me")).toBe(false);
  });

  it("is case-insensitive on the domain", () => {
    expect(isBlockedEmailDomain("User@1Win.COM")).toBe(true);
  });

  it("returns false for malformed input", () => {
    expect(isBlockedEmailDomain("no-at-sign")).toBe(false);
    expect(isBlockedEmailDomain("")).toBe(false);
    expect(isBlockedEmailDomain(null)).toBe(false);
  });
});
