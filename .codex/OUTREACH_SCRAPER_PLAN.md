# Outreach Scraper — Technical Plan

Status: **PLAN ONLY — not implemented.** Build later.

A `/admin/outreach-scraper` admin page that scrapes college athletic staff
directories, normalizes coaches by sport + role, and exports filtered contact
lists as CSV for outreach.

---

## 1. Scope & key decisions

Confirmed with the product owner before planning:

| Decision | Choice | Consequence |
|---|---|---|
| Volume | < 50 schools, one-time (re-runnable) | **No queue / no worker service.** Inline scrape with a small concurrency cap. |
| Data purpose | Pure CSV export for external outreach | `scraped_staff` is disposable; no dedupe/CRM modeling. |
| Target list | Known (34 Ohio schools) — platforms verified empirically (see §3) | Build only the parsers the real list needs. |
| Authorization | Bulk scraping approved | Politeness delay + concurrency cap, but no per-request throttle gymnastics. |
| Seed | SQL in `schema.sql`, idempotent | All 34 schools version-controlled, auto-applied on boot. |
| Non-scrapeable schools | Visible in UI with "manual entry" badge | Admin can hand-add staff rows for Presto/WordPress/dead schools. |

### What this plan deliberately drops from the original spec
- **No Python.** Server is Node/Express on Railway. `cheerio` + native `fetch`
  do everything BeautifulSoup would. (Adding a Python buildpack = pure cost.)
- **No queue tables / job runner / status polling.** 24 schools scrape inline in
  well under a minute. A queue is infrastructure for a problem we don't have.
- **No 60–100 alias generator.** 34 schools; admin types or picks a name. A
  trigram search over `canonical_name` covers fuzzy matching if needed later.
- **No `__NUXT__` JSON parsing** (spec's proposed NextGen mechanism). It's empty
  — see §3. Use DOM scraping instead.

---

## 2. Architecture at a glance

```
Browser (admin)
  └── src/pages/AdminOutreachScraperPage.jsx   (uses AdminShell + adminApi)
        │  POST /admin/outreach/scrape-all
        │  POST /admin/outreach/scrape/:schoolId
        │  GET  /admin/outreach/staff?sport=&role=&hasEmail=
        │  GET  /admin/outreach/export.csv?...
        │  POST /admin/outreach/staff           (manual add)
        ▼
server/routes/outreach.js   (mounted at /admin/outreach, admin-guarded)
        │  calls
        ▼
server/lib/outreachScraper/index.js   scrapeSchool(school) → [staff]
        ├── sidearm.js        (DOM parser; handles legacy + nextgen variants)
        ├── normalize.js      (title + category → sport + role_tags)
        └── http.js           (polite fetch: UA, timeout, retry)
        ▼
Postgres:  outreach_schools, outreach_scraped_staff
```

Scraping runs **inside the existing Express process** on the request. No
separate service. Concurrency capped at 5; ~250 ms delay per domain.

---

## 3. Verified platform findings (the de-risking work)

All 34 domains were probed live (scripts in `scripts/`, see §12). Results
**correct several claims in the original spec**:

### 3a. Sidearm NextGen does NOT embed staff in `window.__NUXT__`
On Ohio State and Toledo, the script block is literally:
```js
window.__NUXT__={};window.__NUXT__.config={...}
```
i.e. **initialized empty** — no staff payload. The spec's "parse `__NUXT__` with
`re + json`" approach would extract nothing.

### 3b. There IS a clean JSON API, but its pagination is unusable
`GET /api/v2/staff` → `200 application/json`:
```jsonc
{ "items": [ { "id", "firstName", "lastName", "title", "email", "phone",
              "category": { "id", "title" }, ... } ],
  "total": 717, "page": 1, "pages": 72 }
```
Fields are clean, **but** `items` is only 10 records and **every pagination
param tried is ignored** (`?page=2`, `?offset=`, `?$skip=`, `?pageSize=`,
path `/2` — all return page 1 of 72). The real param is whatever the Nuxt SPA
sends; not worth reverse-engineering blind.
→ **Implementation-time check (2 min):** open a NextGen staff page in browser
devtools, watch the Network tab while scrolling/paging, copy the exact request.
If found, the API becomes the preferred NextGen source (cleaner than DOM).

### 3c. Pages are server-rendered (SSR) — the DOM has the data
Ohio State `/staff-directory` is **6 MB of SSR HTML** containing **658 distinct
staff profile links** and **504 `mailto:` addresses** (vs 717 total). The ~8%
gap is name-only support staff with no profile/email — **all coaches (the
valuable rows) are rendered.** Legacy sites are likewise standard server-rendered
HTML.
→ **Decision: scrape the SSR DOM with `cheerio` for both Sidearm variants.**
Uniform, robust, no headless browser, no API reverse-engineering.

### 3d. PrestoSports has no scrapeable staff directory
Defiance, Ohio Northern, Wittenberg, Marietta (`pioneersathletics.com`): no
`/staff-directory` (404), and `/composite` / `/landing/index` contain calendar
data only (1 `mailto`, a "share schedule" link; zero coach keywords; no staff
JSON). → **Not auto-scrapeable. Manual entry only.**

### 3e. Several "best-guess" domains were wrong — 6 recovered
The 11 DNS failures were mostly wrong domains. A pattern-resolver
(`athletics.<school>.edu`, `<nickname>.com`, etc.) recovered 6 real Sidearm
Legacy sites (see appendix). 2 schools have closed; 3 have no findable athletics
site or are WordPress.

### 3f. Final tally (34 schools)
| Bucket | Count | Auto-scrape? |
|---|---:|---|
| Sidearm NextGen | 7 | ✅ |
| Sidearm Legacy | 15 | ✅ |
| Unknown but `/staff-directory` returns 200 (try optimistically) | 2 | ⚠️ attempt |
| PrestoSports | 4 | ❌ manual |
| WordPress / custom | 2 | ❌ manual |
| No athletics site found | 1 | ❌ manual |
| Closed / stub page | 3 | ❌ exclude/manual |

**22 confidently scrapeable + 2 worth attempting = up to 24.** Full per-school
table in the Appendix.

---

## 4. Database schema

Add to [server/db/schema.sql](server/db/schema.sql) (idempotent like the rest;
auto-runs on boot). `gen_random_uuid()` is available via `pgcrypto`/PG13+ — the
file already uses uuid PKs, follow the existing pattern.

```sql
CREATE TABLE IF NOT EXISTS outreach_schools (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name      TEXT NOT NULL,
  short_name          TEXT,
  athletic_domain     TEXT NOT NULL UNIQUE,          -- e.g. "athletics.walsh.edu"
  platform            TEXT NOT NULL DEFAULT 'unknown'
                        CHECK (platform IN
                          ('sidearm_legacy','sidearm_nextgen',
                           'prestosports','wordpress','custom','unknown')),
  staff_directory_url TEXT,                           -- derived; nullable
  division            TEXT,                           -- "FBS-B1G","MAC","FCS","D2","D3"
  scrapeable          BOOLEAN NOT NULL DEFAULT FALSE, -- false ⇒ manual-entry only
  last_scraped_at     TIMESTAMPTZ,
  last_scrape_error   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outreach_scraped_staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES outreach_schools(id) ON DELETE CASCADE,
  name        TEXT,
  title       TEXT,
  sport       TEXT,                       -- normalized slug, e.g. "womens_lacrosse"
  role_tags   TEXT[] NOT NULL DEFAULT '{}',
  email       TEXT,
  phone       TEXT,
  source      TEXT NOT NULL DEFAULT 'scrape'  -- 'scrape' | 'manual'
                CHECK (source IN ('scrape','manual')),
  scraped_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_staff_school ON outreach_scraped_staff(school_id);
CREATE INDEX IF NOT EXISTS idx_outreach_staff_sport  ON outreach_scraped_staff(sport);
```

**Re-scrape semantics:** a scrape of school X does
`DELETE FROM outreach_scraped_staff WHERE school_id=$1 AND source='scrape'`
then bulk-inserts fresh rows (manual rows are preserved).

### Seed
Append idempotent inserts for all 34 schools (Appendix has the data):
```sql
INSERT INTO outreach_schools
  (canonical_name, short_name, athletic_domain, platform, staff_directory_url,
   division, scrapeable)
VALUES
  ('Ohio State University','Ohio State','ohiostatebuckeyes.com',
   'sidearm_nextgen','https://ohiostatebuckeyes.com/staff-directory','FBS-B1G',TRUE),
  -- … 33 more …
ON CONFLICT (athletic_domain) DO NOTHING;
```
> Per CLAUDE.md, schema changes require a Railway redeploy (see §11).

---

## 5. Scraper service (`server/lib/outreachScraper/`)

Standalone, decoupled module. Pure functions + one orchestrator. Only new
dependency: **`cheerio`** (add to `server/package.json`).

### 5.1 `http.js` — polite fetch
- `fetchHtml(url, { timeoutMs = 15000, retries = 1 })`
- Desktop Chrome `User-Agent`; `AbortController` timeout; one retry on
  network error/5xx; throws on persistent failure.
- `POLITE_DELAY_MS = 250` exported for the orchestrator.

### 5.2 `sidearm.js` — DOM parser (handles legacy + nextgen)
Both Sidearm variants render staff as repeated cards under **category
headings** (e.g. "Football Coaching Staff", "Athletics Administration"). The
parser walks headings → the staff items beneath each, so **sport can be derived
from the category heading even when the person's title doesn't name a sport**
(a real win: "Assistant Coach" under "Women's Lacrosse" → `womens_lacrosse`).

```js
/**
 * Parse a Sidearm staff-directory HTML document into normalized staff rows.
 * Works for both legacy (ASP.NET) and nextgen (Nuxt SSR) markup by selecting
 * on the stable staff-row / category-heading structure rather than framework
 * chrome. Each row is associated with the nearest preceding category heading,
 * which feeds sport derivation.
 * @param {string} html - server-rendered staff-directory page
 * @param {string} baseUrl - for resolving relative profile links
 * @returns {Array<{name,title,email,phone,categoryLabel}>}
 */
export function parseSidearm(html, baseUrl) { /* cheerio */ }
```
Extraction per card:
- **name** — card heading / profile-link slug (`/staff-directory/<slug>/<id>`),
  de-duplicated by profile id.
- **title** — the role/title text node in the card.
- **email** — `a[href^="mailto:"]` → strip `mailto:`, `.trim()` (live data had
  trailing spaces).
- **phone** — `a[href^="tel:"]` or a phone-formatted text node.
- **categoryLabel** — nearest preceding section heading.

> Selectors must be verified against 2 legacy + 2 nextgen pages at build time and
> documented in `OUTREACH_SCRAPER.md`. Both share Sidearm's markup family, but
> class names differ between versions — expect a small per-version selector map.

### 5.3 `normalize.js` — sport + role_tags
Pure, table-driven keyword matching over `${categoryLabel} ${title}` (lowercased):

```js
const SPORT_KEYWORDS = {
  football: ['football'],
  mens_basketball: ["men's basketball", 'mens basketball'],
  womens_basketball: ["women's basketball", 'womens basketball'],
  mens_soccer: ["men's soccer"], womens_soccer: ["women's soccer"],
  baseball: ['baseball'], softball: ['softball'],
  mens_lacrosse: ["men's lacrosse"], womens_lacrosse: ["women's lacrosse"],
  volleyball: ['volleyball'], wrestling: ['wrestling'],
  // … extend per division sport sponsorship …
};

const ROLE_KEYWORDS = {
  head_coach: ['head coach'],
  offensive_coordinator: ['offensive coordinator'],
  defensive_coordinator: ['defensive coordinator'],
  special_teams_coordinator: ['special teams'],
  recruiting_coordinator: ['recruiting coordinator', 'recruiting'],
  assistant_coach: ['assistant coach'],
  strength_coach: ['strength', 'sports performance'],
  graduate_assistant: ['graduate assistant', 'graduate manager'],
  director_of_operations: ['director of operations', 'operations'],
  athletic_trainer: ['athletic trainer', 'sports medicine'],
  video_coordinator: ['video'],
};

/** @returns {{sport: string|null, roleTags: string[]}} */
export function normalize(categoryLabel, title) { /* keyword scan, longest-first */ }
```
Notes: match category first then title for sport; collect **all** matching role
tags (a person can be `recruiting_coordinator` + `assistant_coach`). Unmatched
sport ⇒ `null` (likely administration/support — fine, filterable).

### 5.4 `index.js` — orchestrator
```js
/** Scrape one school by dispatching on its stored platform.
 *  Sidearm → fetch staff-directory HTML → parseSidearm → normalize.
 *  Non-sidearm/unknown → throw 'unsupported_platform' (caller records error).
 *  @returns {Promise<Array<StaffRow>>} */
export async function scrapeSchool(school) { ... }

/** Scrape many with concurrency cap + politeness delay; never rejects —
 *  returns per-school {schoolId, ok, count, error}. */
export async function scrapeMany(schools, { concurrency = 5 } = {}) { ... }
```
The 2 "unknown-but-200" schools (Central State, Tiffin): attempt with the
Sidearm parser; if it yields 0 rows, record `last_scrape_error = 'no staff
parsed'` and leave them for manual entry.

---

## 6. Server routes (`server/routes/outreach.js`)

Mount at `/admin/outreach` in [server/index.js](server/index.js). Guard with
the same admin middleware other `/admin/*` routes use
([server/middleware/auth.js](server/middleware/auth.js) /
[staffAuth.js](server/middleware/staffAuth.js) — match `admin.js`). Apply
`express-rate-limit` (already a dependency) to the scrape endpoints.

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/admin/outreach/schools` | List all schools + status (scrapeable, last_scraped_at, error, staff count). |
| `POST` | `/admin/outreach/scrape/:schoolId` | Scrape one; replace its `source='scrape'` rows; update timestamps/error. Returns count. |
| `POST` | `/admin/outreach/scrape-all` | Scrape all `scrapeable=true`; returns per-school summary. Inline, concurrency 5. |
| `GET`  | `/admin/outreach/staff` | Filter: `?sport=&role=&hasEmail=&schoolId=`. Joins school name. |
| `POST` | `/admin/outreach/staff` | Manual add (`source='manual'`) for any school. |
| `DELETE` | `/admin/outreach/staff/:id` | Remove a staff row. |
| `GET`  | `/admin/outreach/export.csv` | Same filters as `/staff`; streams `text/csv` with `Content-Disposition: attachment`. |

CSV generation: build server-side from the filtered query — escape per RFC 4180
(quote fields containing `, " \n`; double embedded quotes). Columns: `School,
Name, Title, Sport, Role Tags, Email, Phone`. `role_tags` joined with `;`.
(`export.csv` supersedes the spec's separate "export selected" vs "export all"
buttons — the frontend passes either the active filters or an explicit id list.)

---

## 7. Frontend page (`src/pages/AdminOutreachScraperPage.jsx`)

Route `/admin/outreach-scraper` in [src/App.jsx](src/App.jsx); nav entry
"Outreach Scraper" in [src/admin/adminNav.js](src/admin/adminNav.js). Build with
the existing admin primitives ([src/admin/components/](src/admin/components/)):
`AdminShell`, `AdminPage`, `AdminSection`, `AdminCard`, `AdminBtn`,
`AdminInput`, `AdminSelect`, `AdminCheckbox`, `AdminBadge`, `AdminEmptyState`,
`AdminSpinner`, `AdminModal`. All requests via `adminApi` from
[src/admin/adminTransport.js](src/admin/adminTransport.js).

> ⚠️ Per project memory: the root container **must** have `overflow-y-auto` so
> the page scrolls. Apply on the `AdminPage` root.

Layout (top → bottom):
1. **Schools panel** — table of all 34: name · division · platform badge ·
   scrapeable/"manual entry" badge · last scraped · staff count · actions
   (Scrape / re-scrape; non-scrapeable rows show "Add staff manually"). A
   "Scrape All" button runs scrapeable schools; show per-school result toasts.
2. **Filters bar** — Sport (`AdminSelect`), Role (multi-select), Has-email
   (`AdminCheckbox` toggle), School (optional).
3. **Results table** — School · Name · Title · Sport · Role Tags · Email ·
   Phone, with row checkboxes. Buttons: "Export Filtered → CSV" and "Export
   Selected → CSV" (hits `export.csv` with filters or explicit ids).
4. **Manual-add modal** — `AdminModal` form (name/title/sport/role/email/phone)
   posting `source='manual'`.

No live polling needed — scrapes are synchronous request/response; refresh the
table from the response.

---

## 8. Testing (`admin/test/outreachScraper.test.js`)

Vitest, per CLAUDE.md. Pure-function tests (no live network):
- `normalize()` — category+title → expected sport + role_tags across ~15 cases
  (incl. category-derived sport, multi-role, admin → `null` sport).
- `parseSidearm()` — run against **saved HTML fixtures** (one legacy, one
  nextgen page committed under `admin/test/fixtures/`); assert known coaches
  extracted with correct name/title/email/phone.
- CSV escaping — fields with commas/quotes/newlines round-trip correctly.
- Route handler — `scrape-all` records `last_scrape_error` for an unsupported
  platform without throwing (mock `scrapeSchool`).

---

## 9. File checklist

**New**
- `server/lib/outreachScraper/http.js`
- `server/lib/outreachScraper/sidearm.js`
- `server/lib/outreachScraper/normalize.js`
- `server/lib/outreachScraper/index.js`
- `server/lib/outreachScraper/OUTREACH_SCRAPER.md`  *(impl doc, per CLAUDE.md)*
- `server/routes/outreach.js`
- `src/pages/AdminOutreachScraperPage.jsx`
- `admin/test/outreachScraper.test.js` (+ `admin/test/fixtures/*.html`)

**Edit**
- `server/db/schema.sql` — 2 tables + 34-row seed
- `server/index.js` — mount `/admin/outreach`
- `server/package.json` — add `cheerio`
- `src/App.jsx` — route
- `src/admin/adminNav.js` — nav entry
- `CRAWLER_MAP.md` — feature + files + route + tables + test *(per CLAUDE.md)*

**Delete** (exploratory probes, once parsers are verified) — or keep
`scripts/detect-platforms.js` as a re-seed/verify helper:
- `scripts/detect-platforms-debug.js`, `scripts/resolve-domains.js`,
  `scripts/probe-presto.js`, `scripts/probe-nextgen.js`,
  `scripts/probe-nextgen-api.js`

---

## 10. Build order (when implementing)
1. Schema + seed → boot locally, confirm tables/rows.
2. `http.js` + `sidearm.js` + `normalize.js`; verify against 2 legacy + 2
   nextgen pages; commit HTML fixtures; finalize selectors.
3. `index.js` orchestrator; smoke-test `scrapeMany` on ~5 schools.
4. Routes + mount; test with curl.
5. Admin page + nav + route.
6. Tests; update CRAWLER_MAP + impl doc.
7. Railway redeploy (§11).

---

## 11. Deployment (per CLAUDE.md Railway checklist)
Schema **and** routes change ⇒ redeploy required.
- `railway up --service resplendent-inspiration` from **project root** (not
  `server/`); no `--ci`; `.railwayignore` present.
- Verify Build Logs service id = `629a8d8a-6a2c-4434-9f3c-ec90a3fff6ed`, then
  `railway deployment list` until `SUCCESS`.

---

## 12. Open risks / things to verify at build time
1. **Sidearm DOM selectors** differ between legacy and nextgen — confirm on real
   pages, keep a per-version selector map. (Highest-effort item.)
2. **NextGen API pagination** (§3b) — 2-min devtools check; if solved, prefer
   API over DOM for NextGen (cleaner fields, exact `category`).
3. **Central State / Tiffin** (`unknown`, 200) — may not be Sidearm; attempt,
   fall back to manual if 0 rows.
4. **Email obfuscation** — some Sidearm sites Cloudflare-obfuscate emails
   (`data-cfemail`). If encountered, add a small decoder; otherwise emails come
   back blank (still usable via name/title + manual lookup).
5. **Rate/ToS** — owner approved bulk scraping; keep the 250 ms delay + UA so
   we're not hammering. One-time use limits exposure.

---

## Appendix — full 34-school seed data

`*` = domain corrected from the original best-guess list during resolution.
"manual" rows seed with `scrapeable=false`.

| School | Div | Domain (final) | Platform | scrapeable |
|---|---|---|---|:--:|
| Ohio State University | FBS-B1G | ohiostatebuckeyes.com | sidearm_nextgen | ✅ |
| Ohio University | MAC | ohiobobcats.com | sidearm_nextgen | ✅ |
| Bowling Green State University | MAC | bgsufalcons.com | sidearm_nextgen | ✅ |
| Kent State University | MAC | kentstatesports.com | sidearm_nextgen | ✅ |
| Miami University (OH) | MAC | miamiredhawks.com | sidearm_nextgen | ✅ |
| University of Toledo | MAC | utrockets.com | sidearm_nextgen | ✅ |
| University of Akron | MAC | gozips.com | sidearm_nextgen | ✅ |
| University of Dayton | FCS | daytonflyers.com | sidearm_legacy | ✅ |
| Youngstown State University | FCS | ysusports.com | sidearm_legacy | ✅ |
| Ashland University | D2 | goashlandeagles.com | sidearm_legacy | ✅ |
| University of Findlay | D2 | findlayoilers.com | sidearm_legacy | ✅ |
| Lake Erie College | D2 | lakeeriestorm.com | sidearm_legacy | ✅ |
| Walsh University | D2 | athletics.walsh.edu * | sidearm_legacy | ✅ |
| Baldwin Wallace University | D3 | bwyellowjackets.com | sidearm_legacy | ✅ |
| Capital University | D3 | athletics.capital.edu * | sidearm_legacy | ✅ |
| Case Western Reserve University | D3 | athletics.case.edu | sidearm_legacy | ✅ |
| John Carroll University | D3 | jcusports.com | sidearm_legacy | ✅ |
| Kenyon College | D3 | athletics.kenyon.edu * | sidearm_legacy | ✅ |
| Mount Union | D3 | athletics.mountunion.edu | sidearm_legacy | ✅ |
| Ohio Wesleyan University | D3 | battlingbishops.com * | sidearm_legacy | ✅ |
| Otterbein University | D3 | otterbeincardinals.com * | sidearm_legacy | ✅ |
| Wilmington College | D3 | wilmingtonquakers.com * | sidearm_legacy | ✅ |
| Central State University | D2 | centralstatesports.com * | unknown | ⚠️ attempt |
| Tiffin University | D2 | godragons.com * | unknown | ⚠️ attempt |
| Defiance College | D3 | defianceathletics.com | prestosports | ❌ manual |
| Marietta College | D3 | pioneersathletics.com * | prestosports | ❌ manual |
| Ohio Northern University | D3 | onusports.com | prestosports | ❌ manual |
| Wittenberg University | D3 | wittenbergtigers.com | prestosports | ❌ manual |
| Hiram College | D3 | hiramathletics.com | wordpress | ❌ manual |
| Muskingum University | D3 | muskies.com * | wordpress | ❌ manual |
| Heidelberg University | D3 | heidelberg.edu * | unknown | ❌ manual |
| Ohio Dominican University | D2 | ohiodominican.com | custom | ❌ manual |
| Notre Dame College | D2 | (closed May 2024) | custom | ❌ exclude |
| Urbana University | D2 | (closed 2020) | custom | ❌ exclude |
