# Outreach Scraper — Implementation Notes

Admin tool that scrapes college athletic staff directories, normalizes the
contacts by sport + role, and exports filtered lists as CSV for outreach.

Lives at **`/admin/outreach-scraper`** (owner-only). See the broader design
rationale and platform-detection findings in
[OUTREACH_SCRAPER_PLAN.md](../../../OUTREACH_SCRAPER_PLAN.md).

## What was built

| Layer | File |
|---|---|
| DB tables + 34-school seed | [server/db/schema.sql](../../db/schema.sql) (`outreach_schools`, `outreach_scraped_staff`) |
| Polite HTTP | [http.js](http.js) — UA, timeout, 1 retry |
| Parsers | [sidearm.js](sidearm.js) — legacy + nextgen DOM parsers |
| Normalizer | [normalize.js](normalize.js) — title/category → sport + role tags |
| CSV | [csv.js](csv.js) — RFC 4180 escaping |
| Orchestrator | [index.js](index.js) — `scrapeSchool`, `scrapeMany` |
| Routes | [server/routes/outreach.js](../../routes/outreach.js) (mounted `/admin/outreach`) |
| UI | [src/pages/AdminOutreachScraperPage.jsx](../../../src/pages/AdminOutreachScraperPage.jsx) |
| Tests | [admin/test/outreachScraper.test.js](../../../admin/test/outreachScraper.test.js) (+ `fixtures/`) |

## How it works

1. Schools are seeded with a verified `platform` and `scrapeable` flag. Only
   `sidearm_legacy`, `sidearm_nextgen`, and `unknown` are auto-scrapeable.
2. The admin clicks **Scrape** (one school) or **Scrape All**. Scraping runs
   **inline** on the request — no queue/worker — capped at concurrency 5 with a
   250 ms politeness delay (small target list, <50 schools).
3. `scrapeSchool` fetches the staff-directory HTML and dispatches to the parser.
4. Parsed rows are normalized (sport + role tags) and persisted, **replacing
   that school's previous `source='scrape'` rows in a transaction** while
   leaving `source='manual'` rows intact. `last_scraped_at` / `last_scrape_error`
   are updated.
5. The results table filters by sport / role / has-email / school and exports
   to CSV (filtered or selected rows).

## Key technical decisions (and why the original spec was wrong)

- **DOM scraping, not `window.__NUXT__`.** The spec claimed nextgen serializes
  staff into `window.__NUXT__`. Verified live: it is initialized **empty**
  (`window.__NUXT__={}`). The pages are Nuxt **SSR**, so the staff are in the
  rendered HTML — parsed directly with cheerio.
- **No `/api/v2/staff`.** That JSON endpoint exists but its pagination is
  unusable (every param returns page 1 of N). The SSR DOM is the reliable
  source.
- **Node + cheerio, not Python.** Matches the existing Express stack; no second
  runtime.
- **No queue.** Inline scraping is fine for the target volume.

## Parser specifics (verified against saved fixtures)

**Legacy** (`.sidearm-staff-member` table rows interleaved with
`.sidearm-staff-category` heading rows):
- name → `td[headers~="col-fullname"] a`
- title → `td[headers~="col-staff_title"]`
- phone → `td[headers~="col-staff_phone"] a[href^="tel:"]`
- email → **JS-obfuscated**: the cell holds an inline script
  `var firstHalf="AD"; var secondHalf="udayton.edu";` → reconstructed by
  `deobfuscateLegacyEmail`.

**Nextgen** (`.s-person-card` cards grouped under `<h3>` category headings):
- name → `[data-test-id="s-person-details__personal-single-line"]`
- title → `.s-person-details__position`
- email → `[data-test-id="s-person-card-list__content-contact-det-email"] a[href^="mailto:"]`
- phone → `[data-test-id="s-person-card-list__content-contact-det-phone"] a[href^="tel:"]`

Both track the most-recent category heading in document order so sport can be
derived from the section even when the title is generic ("Assistant Coach"
under "Women's Lacrosse Coaching Staff" → `womens_lacrosse`).

`unknown`-platform schools (200 on `/staff-directory` but unclassified) run
both parsers; the richer result wins. If 0 rows parse, the school records
`last_scrape_error = "No staff parsed from page"` and is left for manual entry.

## Normalization notes

- **Sport**: longest-keyword-first match over `category + title`; gendered
  variants beat generic ("women's basketball" > "basketball").
- **Roles**: keyword match, plus a co-occurrence rule — `head_coach` /
  `assistant_coach` are tagged when "head"/"assistant" appears together with
  "coach" (handles split titles like "Head Softball Coach"), while excluding
  non-coaching assistants ("Executive Assistant to the VP").

## Maintenance

Sidearm class names can change between CMS versions. If a scrape suddenly
returns 0 rows for a previously-working platform, re-save a fixture and check
the selectors above. Re-run platform detection with
`scripts/detect-platforms.js` if seeding new schools.
