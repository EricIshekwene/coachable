const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Allows letters (including accented), spaces, hyphens, apostrophes, and
 * periods — covers names like "O'Brien", "St. Claire", "García-López".
 */
const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ'\-.\s]+$/;

/** Minimum password length enforced both client-side and server-side. */
export const PASSWORD_MIN = 8;

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || "").trim());
}

/**
 * Returns an inline error message for an email field, or "" if valid.
 * @param {string} value
 * @returns {string}
 */
export function validateEmail(value) {
  const v = String(value || "").trim();
  if (!v) return "Email is required";
  if (!EMAIL_PATTERN.test(v)) return "Please enter a valid email address";
  return "";
}

/**
 * Returns an inline error message for a display-name field, or "" if valid.
 * Allows letters, spaces, hyphens, apostrophes, and periods.
 * @param {string} value
 * @returns {string}
 */
export function validateName(value) {
  const v = String(value || "").trim();
  if (!v) return "Name is required";
  if (v.length < 2) return "Name must be at least 2 characters";
  if (!NAME_PATTERN.test(v)) return "Name can only contain letters, spaces, hyphens, and apostrophes";
  return "";
}

/**
 * Returns an inline error message for a password field, or "" if valid.
 * Requires at least 8 characters, one letter, and one number.
 * @param {string} value
 * @returns {string}
 */
export function validatePassword(value) {
  const v = String(value || "");
  if (!v) return "Password is required";
  if (v.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
  if (!/[A-Za-z]/.test(v)) return "Password must contain at least one letter";
  if (!/[0-9]/.test(v)) return "Password must contain at least one number";
  return "";
}

/**
 * Returns an inline error message for a confirm-password field, or "" if valid.
 * @param {string} password - The original password
 * @param {string} confirm - The confirmation value
 * @returns {string}
 */
export function validateConfirmPassword(password, confirm) {
  if (!confirm) return "Please confirm your password";
  if (password !== confirm) return "Passwords do not match";
  return "";
}

export function getPhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function isValidPhone(value) {
  const digits = getPhoneDigits(value);
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Input length caps mirrored from server/lib/validate.js LIMITS. Keep the
 * two in sync — the backend enforces these as the actual security boundary;
 * these are for `<input maxLength=...>` attributes and inline UX checks.
 */
export const INPUT_LIMITS = {
  NAME: 80,
  EMAIL: 254,
  PASSWORD_MAX: 256,
  TITLE: 200,
  TAG: 40,
  SHORT_TEXT: 200,
  MEDIUM_TEXT: 2000,
  LONG_TEXT: 10000,
  URL: 2048,
  CODE: 6,
  INVITE_CODE: 12,
};
