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
