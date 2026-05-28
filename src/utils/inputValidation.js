const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || "").trim());
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
