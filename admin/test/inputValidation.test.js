/**
 * inputValidation.test.js
 *
 * Unit tests for the client-side inline validation helpers in
 * src/utils/inputValidation.js. These functions drive the red error text
 * shown under form fields in Login, Signup, ForgotPassword, ResetPassword,
 * and StaffLogin — they are the first line of defence before hitting the API.
 */

import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validateName,
  validatePassword,
  validateConfirmPassword,
  isValidEmail,
  isValidPhone,
  getPhoneDigits,
  INPUT_LIMITS,
} from "../../src/utils/inputValidation.js";

// ── validateEmail ─────────────────────────────────────────────────────────────

describe("validateEmail", () => {
  it("returns empty string for a valid email", () => {
    expect(validateEmail("user@example.com")).toBe("");
    expect(validateEmail("coach.smith+tag@club.org")).toBe("");
    expect(validateEmail("a@b.co")).toBe("");
  });

  it("returns required error for empty input", () => {
    expect(validateEmail("")).toBe("Email is required");
    expect(validateEmail("   ")).toBe("Email is required");
    expect(validateEmail(null)).toBe("Email is required");
    expect(validateEmail(undefined)).toBe("Email is required");
  });

  it("returns format error for missing @ symbol", () => {
    expect(validateEmail("notanemail")).toBe("Please enter a valid email address");
    expect(validateEmail("user.example.com")).toBe("Please enter a valid email address");
  });

  it("returns format error for missing domain", () => {
    expect(validateEmail("user@")).toBe("Please enter a valid email address");
    expect(validateEmail("user@.com")).toBe("Please enter a valid email address");
  });

  it("returns format error for missing TLD", () => {
    expect(validateEmail("user@example")).toBe("Please enter a valid email address");
  });

  it("trims whitespace before validating", () => {
    expect(validateEmail("  user@example.com  ")).toBe("");
  });

  it("is case-insensitive for structure (allows uppercase)", () => {
    expect(validateEmail("User@Example.COM")).toBe("");
  });
});

// ── validateName ─────────────────────────────────────────────────────────────

describe("validateName", () => {
  it("returns empty string for a valid name", () => {
    expect(validateName("Jane Smith")).toBe("");
    expect(validateName("O'Brien")).toBe("");
    expect(validateName("García-López")).toBe("");
    expect(validateName("St. Claire")).toBe("");
  });

  it("returns required error for empty input", () => {
    expect(validateName("")).toBe("Name is required");
    expect(validateName("  ")).toBe("Name is required");
    expect(validateName(null)).toBe("Name is required");
    expect(validateName(undefined)).toBe("Name is required");
  });

  it("returns length error for single character", () => {
    expect(validateName("A")).toBe("Name must be at least 2 characters");
    expect(validateName("z")).toBe("Name must be at least 2 characters");
  });

  it("accepts exactly 2 characters", () => {
    expect(validateName("Jo")).toBe("");
  });

  it("returns format error for names with numbers", () => {
    const err = validateName("Coach1");
    expect(err).toBe("Name can only contain letters, spaces, hyphens, and apostrophes");
  });

  it("returns format error for names with disallowed special chars", () => {
    expect(validateName("User@Email")).toBe(
      "Name can only contain letters, spaces, hyphens, and apostrophes"
    );
    expect(validateName("Name!")).toBe(
      "Name can only contain letters, spaces, hyphens, and apostrophes"
    );
  });

  it("trims whitespace before validating", () => {
    expect(validateName("  Jane  ")).toBe("");
  });

  it("accepts accented characters", () => {
    expect(validateName("Zoë")).toBe("");
    expect(validateName("François")).toBe("");
  });
});

// ── validatePassword ──────────────────────────────────────────────────────────

describe("validatePassword", () => {
  it("returns empty string for a valid password", () => {
    expect(validatePassword("password1")).toBe("");
    expect(validatePassword("Secure99Pass")).toBe("");
    expect(validatePassword("12345678a")).toBe("");
  });

  it("returns required error for empty input", () => {
    expect(validatePassword("")).toBe("Password is required");
    expect(validatePassword(null)).toBe("Password is required");
    expect(validatePassword(undefined)).toBe("Password is required");
  });

  it("returns length error for fewer than 8 characters", () => {
    expect(validatePassword("abc1")).toContain("at least 8 characters");
    expect(validatePassword("1234567")).toContain("at least 8 characters");
  });

  it("accepts exactly 8 characters with letter and number", () => {
    expect(validatePassword("abcdef1a")).toBe("");
  });

  it("returns error when password has no letters", () => {
    expect(validatePassword("12345678")).toBe("Password must contain at least one letter");
    expect(validatePassword("99999999")).toBe("Password must contain at least one letter");
  });

  it("returns error when password has no numbers", () => {
    expect(validatePassword("abcdefgh")).toBe("Password must contain at least one number");
    expect(validatePassword("ABCDEFGH")).toBe("Password must contain at least one number");
  });

  it("does NOT trim password (spaces are allowed in passwords)", () => {
    expect(validatePassword("pass word1")).toBe("");
  });

  it("length check takes precedence over character checks", () => {
    // Short password with only letters — should fail on length, not letter check
    expect(validatePassword("abc")).toContain("at least 8 characters");
  });
});

// ── validateConfirmPassword ───────────────────────────────────────────────────

describe("validateConfirmPassword", () => {
  it("returns empty string when both passwords match", () => {
    expect(validateConfirmPassword("password1", "password1")).toBe("");
    expect(validateConfirmPassword("Secure99", "Secure99")).toBe("");
  });

  it("returns error when confirm is empty", () => {
    expect(validateConfirmPassword("password1", "")).toBe("Please confirm your password");
    expect(validateConfirmPassword("password1", null)).toBe("Please confirm your password");
    expect(validateConfirmPassword("password1", undefined)).toBe("Please confirm your password");
  });

  it("returns mismatch error when passwords differ", () => {
    expect(validateConfirmPassword("password1", "password2")).toBe("Passwords do not match");
    expect(validateConfirmPassword("Password1", "password1")).toBe("Passwords do not match");
  });

  it("is case-sensitive", () => {
    expect(validateConfirmPassword("Abc123", "abc123")).toBe("Passwords do not match");
  });

  it("returns mismatch if confirm has extra whitespace", () => {
    expect(validateConfirmPassword("password1", "password1 ")).toBe("Passwords do not match");
  });
});

// ── isValidEmail ──────────────────────────────────────────────────────────────

describe("isValidEmail", () => {
  it("returns true for valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("a@b.io")).toBe(true);
  });

  it("returns false for invalid emails", () => {
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });

  it("trims before testing", () => {
    expect(isValidEmail("  user@example.com  ")).toBe(true);
  });
});

// ── getPhoneDigits ────────────────────────────────────────────────────────────

describe("getPhoneDigits", () => {
  it("strips non-digit characters", () => {
    expect(getPhoneDigits("(555) 123-4567")).toBe("5551234567");
    expect(getPhoneDigits("+1 800-555-0199")).toBe("18005550199");
  });

  it("returns empty string for empty input", () => {
    expect(getPhoneDigits("")).toBe("");
    expect(getPhoneDigits(null)).toBe("");
    expect(getPhoneDigits(undefined)).toBe("");
  });

  it("leaves pure digit strings unchanged", () => {
    expect(getPhoneDigits("5551234567")).toBe("5551234567");
  });
});

// ── isValidPhone ──────────────────────────────────────────────────────────────

describe("isValidPhone", () => {
  it("returns true for a 10-digit US number", () => {
    expect(isValidPhone("5551234567")).toBe(true);
    expect(isValidPhone("(555) 123-4567")).toBe(true);
  });

  it("returns true for international numbers up to 15 digits", () => {
    expect(isValidPhone("+447911123456")).toBe(true); // 12 digits
  });

  it("returns false for fewer than 10 digits", () => {
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });

  it("returns false for more than 15 digits", () => {
    expect(isValidPhone("1234567890123456")).toBe(false); // 16 digits
  });
});

// ── INPUT_LIMITS ──────────────────────────────────────────────────────────────

describe("INPUT_LIMITS", () => {
  it("defines limits for all expected fields", () => {
    expect(typeof INPUT_LIMITS.NAME).toBe("number");
    expect(typeof INPUT_LIMITS.EMAIL).toBe("number");
    expect(typeof INPUT_LIMITS.PASSWORD_MAX).toBe("number");
    expect(typeof INPUT_LIMITS.TITLE).toBe("number");
    expect(typeof INPUT_LIMITS.CODE).toBe("number");
  });

  it("NAME limit is at least 2 (minimum valid name length)", () => {
    expect(INPUT_LIMITS.NAME).toBeGreaterThanOrEqual(2);
  });

  it("EMAIL limit is at most 254 (RFC 5321 max)", () => {
    expect(INPUT_LIMITS.EMAIL).toBeLessThanOrEqual(254);
  });

  it("CODE limit is 6 (6-digit reset codes)", () => {
    expect(INPUT_LIMITS.CODE).toBe(6);
  });

  it("PASSWORD_MAX is at least 8 (minimum password length)", () => {
    expect(INPUT_LIMITS.PASSWORD_MAX).toBeGreaterThanOrEqual(8);
  });
});
