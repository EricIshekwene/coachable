/**
 * Sidearm Sports staff-directory parsers (the dominant college athletics CMS).
 *
 * Two server-rendered layouts, verified live against real pages:
 *  - **legacy** (ASP.NET): a single table of `.sidearm-staff-category` heading
 *    rows interleaved with `.sidearm-staff-member` rows. Name/title/phone live
 *    in `td[headers~="col-*"]` cells; the email is JS-obfuscated (an inline
 *    `<script>` concatenates `firstHalf + "@" + secondHalf`).
 *  - **nextgen** (Nuxt SSR): `.s-person-card` cards grouped under `<h3>`
 *    category headings. Name/title/email/phone live in stable `data-test-id`
 *    and `s-person-details__*` hooks.
 *
 * Both produce the same raw shape: `{ name, title, email, phone, categoryLabel }`.
 * Normalization (sport + role tags) happens in normalize.js.
 *
 * @module outreachScraper/sidearm
 */

import { load } from "cheerio";

/**
 * Reconstruct a Sidearm-legacy obfuscated email from its cell HTML.
 * The cell contains an inline script of the form:
 *   var firstHalf = "AD"; var secondHalf = "udayton.edu"; ...
 * @param {string} cellHtml
 * @returns {string|null}
 */
function deobfuscateLegacyEmail(cellHtml) {
  if (!cellHtml) return null;
  const fh = cellHtml.match(/firstHalf\s*=\s*"([^"]*)"/);
  const sh = cellHtml.match(/secondHalf\s*=\s*"([^"]*)"/);
  if (fh && sh && fh[1] && sh[1]) return `${fh[1]}@${sh[1]}`;
  return null;
}

/**
 * Parse a Sidearm **legacy** staff-directory document.
 * @param {import('cheerio').CheerioAPI} $
 * @returns {Array<{name:string,title:string,email:string|null,phone:string|null,categoryLabel:string}>}
 */
function parseLegacy($) {
  const out = [];
  let currentCategory = "";
  // Categories and members are sibling rows in document order.
  $(".sidearm-staff-category, .sidearm-staff-member").each((_i, el) => {
    const $el = $(el);
    if ($el.hasClass("sidearm-staff-category")) {
      currentCategory = $el.text().trim();
      return;
    }
    const name = $el.find('td[headers~="col-fullname"] a').first().text().trim() ||
      $el.find('td[headers~="col-fullname"]').first().text().trim();
    const title = $el.find('td[headers~="col-staff_title"]').first().text().trim();
    const phone =
      $el.find('td[headers~="col-staff_phone"] a[href^="tel:"]').first().text().trim() ||
      $el.find('td[headers~="col-staff_phone"]').first().text().trim() ||
      null;
    const emailCell = $el.find('td[headers~="col-staff_email"]');
    let email =
      emailCell.find('a[href^="mailto:"]').first().attr("href")?.replace(/^mailto:/, "") || null;
    if (!email) email = deobfuscateLegacyEmail(emailCell.html() || "");
    if (!name && !title) return;
    out.push({ name, title, email, phone, categoryLabel: currentCategory });
  });
  return out;
}

/**
 * Parse a Sidearm **nextgen** (Nuxt SSR) staff-directory document.
 * @param {import('cheerio').CheerioAPI} $
 * @returns {Array<{name:string,title:string,email:string|null,phone:string|null,categoryLabel:string}>}
 */
function parseNextgen($) {
  // Find the container holding the bulk of the cards, so stray <h3>s elsewhere
  // on the page (e.g. "Related News") don't pollute category tracking.
  let container = $(".s-person-card").first();
  while (container.length && container.find(".s-person-card").length < 5) {
    container = container.parent();
  }
  if (!container.length) container = $.root();

  const out = [];
  let currentCategory = "";
  // Walk h3 headings (category groupings) and cards in document order.
  container.find("h3, .s-person-card").each((_i, el) => {
    const $el = $(el);
    if ($el.is("h3")) {
      currentCategory = $el.text().trim();
      return;
    }
    const name = $el
      .find('[data-test-id="s-person-details__personal-single-line"]')
      .first()
      .text()
      .trim();
    const title = $el.find(".s-person-details__position").first().text().trim();
    const email =
      $el
        .find('[data-test-id="s-person-card-list__content-contact-det-email"] a[href^="mailto:"]')
        .first()
        .attr("href")
        ?.replace(/^mailto:/, "") || null;
    const phone =
      $el
        .find('[data-test-id="s-person-card-list__content-contact-det-phone"] a[href^="tel:"]')
        .first()
        .text()
        .trim() || null;
    if (!name && !title) return;
    out.push({ name, title, email, phone, categoryLabel: currentCategory });
  });
  return out;
}

/**
 * Parse a Sidearm staff-directory HTML document into raw staff records.
 *
 * For a known platform the matching parser runs directly. For `unknown`
 * (schools whose `/staff-directory` returned 200 but weren't classified),
 * both parsers are attempted and whichever yields more rows wins.
 *
 * @param {string} html - server-rendered staff-directory page
 * @param {'sidearm_legacy'|'sidearm_nextgen'|'unknown'} platform
 * @returns {Array<{name:string,title:string,email:string|null,phone:string|null,categoryLabel:string}>}
 */
export function parseSidearm(html, platform) {
  const $ = load(html);
  if (platform === "sidearm_legacy") return parseLegacy($);
  if (platform === "sidearm_nextgen") return parseNextgen($);
  // unknown: try both, keep the richer result
  const legacy = parseLegacy($);
  const nextgen = parseNextgen($);
  return nextgen.length > legacy.length ? nextgen : legacy;
}

export { parseLegacy, parseNextgen, deobfuscateLegacyEmail };
