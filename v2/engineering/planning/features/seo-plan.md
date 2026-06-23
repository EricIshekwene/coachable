# SEO Plan

**Status:** Planning complete. Ready to execute.
**Scope:** Public page meta tags, Open Graph cards, sitemap, and social crawler support for v2.

---

## Page coverage

### Indexable — Google crawls, sitemap includes

| Route | Page | Notes |
|---|---|---|
| `/` | Landing | Generic (no sport) |
| `/home` | Landing | Alias for `/` |
| `/:sport` | Sport landing | 8 sports |
| `/:sport/playbooks` | Public playbooks | 8 sports |
| `/enterprise` | Enterprise | Static marketing page |
| `/resources` | Resources | Static marketing page |
| `/platform-play/:playId` | PlatformPlayView | Dynamic — included in sitemap via DB query |

### noindex — excluded from crawling and sitemap

| Route | Reason |
|---|---|
| `/shared/:token` | Token-gated; content may expire or be revoked |
| `/shared/folder/:token` | Same as above |
| `/slate`, `/slate/:sport` | Tool page, not a content page |
| `/signup`, `/login`, `/forgot-password`, `/reset-password` | Auth flows |
| `/app/*` | Auth-gated |
| `/admin/*`, `/staff/*` | Internal |

Add `<meta name="robots" content="noindex, nofollow">` to SharedPlay, SharedFolder, and Slate pages in v2.

---

## The social crawler problem

The app is a pure Vite SPA. `usePageMeta` mutates `document.head` via JavaScript after React mounts. **Google executes JS** and sees the correct tags. **Social crawlers do not** — Twitter, Slack, Discord, iMessage, and Facebook all read raw HTML. Every link shared on social today shows the generic `index.html` OG card.

### Solution: Express meta tag SSR for dynamic pages

For `/shared/:token` and `/platform-play/:playId`, Express intercepts the request before serving `index.html`, fetches the play data from the DB, and returns `index.html` with the correct `<head>` tags already written into the HTML. The React client loads normally; `usePageMeta` re-applies the tags client-side, but the crawler already got correct tags from the raw HTML.

This is not full SSR — the React tree is never server-rendered. Only the `<head>` is injected. The DB query reuses the same data those routes already fetch.

For static pages (Landing, sport landings, PublicPlaybooks, Enterprise, Resources), the base `index.html` fallback is acceptable. These pages use `usePageMeta` client-side which Google sees correctly, and their canonical URLs and titles are stable enough that a baked default is fine.

---

## OG card specs

### SharedPlay (`/shared/:token`)

```
og:title       → "{play.title}"
og:description → "Shared from {play.teamName} · View this play on Coachable."
og:url         → "https://coachableplays.com/shared/{token}"
og:image       → "https://coachableplays.com/og-image.png"  (site-wide fallback)
twitter:card   → "summary_large_image"
```

No canonical tag. SharedPlay is `noindex` — canonicalization across multiple tokens for the same play has no SEO value.

### PlatformPlayView (`/platform-play/:playId`)

```
og:title       → "{play.title} — {play.sport} Play on Coachable"
og:description → "{play.description if present, else: "View this {play.sport} play on Coachable. Add it to your team's playbook."}"
og:url         → "https://coachableplays.com/platform-play/{playId}"
og:image       → "https://coachableplays.com/og-image.png"  (site-wide fallback)
twitter:card   → "summary_large_image"
canonical      → "https://coachableplays.com/platform-play/{playId}"
```

### Static marketing pages

Landing, sport landings, PublicPlaybooks, Enterprise, and Resources already have meta defined in `sportSeo.js` (for sport pages) or `index.html` (for the root). In v2, carry forward `usePageMeta` and `sportSeo.js` — they are correct. Enterprise and Resources get explicit `usePageMeta` calls with their own titles and descriptions.

---

## Sitemap

Replace the static `public/sitemap.xml` with a **server-generated endpoint** at `GET /sitemap.xml`.

The handler:
1. Hardcodes all static routes (landing, sport landings, playbook pages, enterprise, resources)
2. Queries the DB for all active (non-archived, published) platform play IDs
3. Emits a full `<?xml ...>` sitemap response with `Content-Type: application/xml`

```
Static entries:
  /                priority 1.0  changefreq weekly
  /home            priority 0.9  changefreq weekly
  /:sport          priority 0.8  changefreq monthly  (×8 sports)
  /:sport/playbooks  priority 0.7  changefreq weekly  (×8 sports)
  /enterprise      priority 0.7  changefreq monthly
  /resources       priority 0.7  changefreq monthly

Dynamic entries:
  /platform-play/:playId   priority 0.6  changefreq weekly  (all active platform plays)
```

`robots.txt` already points to `https://coachableplays.com/sitemap.xml` — no change needed.

---

## Existing infrastructure to carry forward from v1

| Artifact | Status | Action |
|---|---|---|
| `usePageMeta.js` | ✅ Complete | Port to `src/utils/misc/usePageMeta.ts` |
| `sportSeo.js` | ✅ Complete | Port to `src/utils/misc/sportSeo.ts` |
| `public/og-image.png` | ✅ Complete | Copy to v2 `public/` |
| `public/robots.txt` | ✅ Complete | Copy to v2 `public/`; no changes needed |
| `public/sitemap.xml` | ❌ Replace | Replaced by dynamic `GET /sitemap.xml` server route |
| `index.html` base OG tags | ✅ Complete | Copy to v2 `index.html` |

---

## Implementation checklist

**Phase 1 — Meta tag infrastructure (no new DB work)**

- [ ] Port `usePageMeta.ts` and `sportSeo.ts` to v2
- [ ] Add `usePageMeta` calls to Enterprise and Resources pages
- [ ] Add `<meta name="robots" content="noindex, nofollow">` to SharedPlay, SharedFolder, and Slate pages
- [ ] Wire `usePageMeta` on PlatformPlayView with sport + title (client-side; Google will see it)

**Phase 2 — Express meta tag SSR (social crawler fix)**

- [ ] Write Express middleware `server/lib/metaInjector.js` — takes a route pattern + data-fetcher, returns an HTML string with injected `<head>` tags
- [ ] Wire it for `GET /shared/:token` — fetches play title and team name, injects OG tags
- [ ] Wire it for `GET /platform-play/:playId` — fetches play title, sport, and description, injects OG tags
- [ ] Serve the injected HTML for those routes; all other routes fall through to the static `index.html`

**Phase 3 — Dynamic sitemap**

- [ ] Write `GET /sitemap.xml` route in `server/routes/sitemap.js`
- [ ] Query `platform_plays` table for all active play IDs
- [ ] Remove `public/sitemap.xml`

---

## Out of scope

- Per-play thumbnail generation (server-side canvas rendering). OG image falls back to the site-wide `og-image.png` for all play pages. Thumbnail generation is a separate initiative if it becomes a priority.
- Structured data (JSON-LD) for individual play pages. The site-wide `SoftwareApplication` JSON-LD in `index.html` is sufficient for launch.
- `/llms.txt` — already exists in `public/`; carry forward unchanged.
