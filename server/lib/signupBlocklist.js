/**
 * Heuristics that block obvious-spam signups. Added 2026-05-27 after a burst
 * of ~70k Turkish gambling-promo accounts (5.000TL / bit.ly / 🔥 names) using
 * thousands of throwaway and typo-squat email domains.
 *
 * Goal: stop the exact replay; not a general anti-abuse system.
 */

const SPAM_NAME_SUBSTRINGS = [
  "bit.ly",
  "tinyurl",
  "t.co/",
  "5.000tl",
  "5,000tl",
  "bonus for you",
  "tam i̇ade garantili",
  "tam iade garantili",
  "100% - tam",
  "1win",
  "casino",
  "bahis",
];

const URL_LIKE_RE = /(https?:\/\/|www\.)/i;
const FIRE_EMOJI = /🔥/g;

const BLOCKED_EMAIL_DOMAINS = new Set([
  // gambling / promo
  "1win.com",
  "1win.xyz",
  // typo-squats of common providers
  "gmail.com.com",
  "gmail.com.tr",
  "gmail.cok",
  "gmail.coma",
  "gmal.com",
  "xn--gmal-nza.com",
  "icloud.con",
  "icould.com",
  "icolud.com",
  "iclod.com",
  "iclud.com",
  "icluod.com",
  "hotmail.com.tr",
  "hotmail.con",
  "homail.com",
  "hotmai.com",
  "hotmil.com",
  "hormail.com",
  "outlook.com.tr",
]);

/**
 * Returns true if the display name matches a known spam pattern.
 * @param {string} name
 */
export function isBlockedName(name) {
  if (typeof name !== "string") return false;
  const lower = name.toLowerCase();
  if (URL_LIKE_RE.test(name)) return true;
  if ((name.match(FIRE_EMOJI) || []).length >= 2) return true;
  for (const needle of SPAM_NAME_SUBSTRINGS) {
    if (lower.includes(needle)) return true;
  }
  return false;
}

/**
 * Returns true if the email's domain is on the spam blocklist.
 * @param {string} email
 */
export function isBlockedEmailDomain(email) {
  if (typeof email !== "string") return false;
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return BLOCKED_EMAIL_DOMAINS.has(domain);
}

export const _internal = { SPAM_NAME_SUBSTRINGS, BLOCKED_EMAIL_DOMAINS };
