# SEO & AI Discoverability

How Coachable is exposed to search engines and AI crawlers (ChatGPT, Claude, Perplexity, Gemini, etc.).

## Files at a glance

| File | Purpose | Audience |
|---|---|---|
| [public/sitemap.xml](../../public/sitemap.xml) | Machine-readable index of every public URL | Search engines, AI crawlers |
| [public/llms.txt](../../public/llms.txt) | Curated, prose-annotated link map at site root | AI tools that follow the [llms.txt spec](https://llmstxt.org) |
| [public/robots.txt](../../public/robots.txt) | Crawl policy; explicit allow for GPTBot/ClaudeBot/PerplexityBot/Google-Extended | All crawlers |
| [index.html](../../index.html) | Site-wide `<title>`, `<meta description>`, OG/Twitter cards, JSON-LD SoftwareApplication schema | Search engines, social previews |
| [src/utils/usePageMeta.js](./usePageMeta.js) | React hook for per-route `<title>`/`<meta>`/`<link rel="canonical">` overrides | Search engines, AI crawlers (per-page context) |
| [src/utils/sportSeo.js](./sportSeo.js) | Per-sport titles/descriptions/canonicals consumed by `usePageMeta` | — |

## How they fit together

1. **`index.html`** sets the global defaults (title, description, OG/Twitter tags, canonical, JSON-LD). This is what crawlers see for the SPA shell before any route renders.
2. **`usePageMeta`** is mounted from each public page (`Landing`, `PublicPlaybooksPage`, `Resources`, `Enterprise`) and rewrites those tags in-place once React mounts. It restores the previous values on unmount, so SPA navigation between routes keeps the meta tags accurate.
3. **`sitemap.xml`** is the authoritative URL list for search engines. It's fetched directly by crawlers — there is no React in the loop.
4. **`llms.txt`** is the equivalent for LLM-based search products. Format: H1 site name, blockquote elevator pitch, H2 sections with `[title](url): description` link lists, optional `## Optional` section for lower-priority links.
5. **`robots.txt`** explicitly allows every common AI crawler. Allowing them is the default, but stating it makes intent clear and is a positive signal.

## Adding a new public route

If you add a public route in [src/App.jsx](../App.jsx), do all of the following:

1. **`public/sitemap.xml`** — add a `<url>` entry with absolute URL, `<changefreq>`, and `<priority>`.
2. **`public/llms.txt`** — add a `[title](url): one-line description` entry under the right H2 section.
3. **`usePageMeta`** — call it from the new page component with a route-specific `title`, `description`, and absolute `canonical` URL.
4. **`admin/test/seoAssets.test.js`** — extend the `PUBLIC_SPORT_SLUGS` list (or add an assertion) so the new URL is covered by the sitemap/llms tests.

If the new route is a new sport, also add an entry to `SPORT_META` in [sportSeo.js](./sportSeo.js) — that's the single source of truth wired into both `Landing` and `PublicPlaybooksPage`.

## Why the custom hook (not react-helmet-async)

react-helmet-async has lingering React 19 compatibility issues and adds a dependency for what amounts to four lines of `document.head` manipulation. [usePageMeta.js](./usePageMeta.js) does the same job with no dependencies, follows the existing pattern set by [useThemeColor.js](./useThemeColor.js), and properly restores previous values on unmount so SPA back-navigation keeps meta tags in sync.

## What this doesn't fix

This setup is good for AI tools that crawl static HTML and for the SPA's runtime meta tags. It does **not** give search engines pre-rendered HTML for each route — they only see the values `usePageMeta` sets after React mounts. Modern crawlers (Googlebot, Bingbot, GPTBot) do execute JavaScript and will see the updated tags, but legacy / less-capable crawlers won't.

If that becomes a problem, the next step is route-level prerendering — either:
- [`vite-plugin-prerender`](https://github.com/josephlbarnett/vite-plugin-prerender) to emit static HTML for the public routes at build time, or
- moving the public pages to a tiny SSR layer (e.g. an Express handler in `server/` that renders `index.html` with route-specific tags inlined).

Neither is needed today.

## Verifying

```bash
npx vitest run admin/test/seoAssets.test.js
```

Tests guard against:
- A public route added in `App.jsx` but missing from `sitemap.xml` / `llms.txt`
- `llms.txt` drifting away from the proposed spec (H1, blockquote, H2 sections)
- A new sport key added without matching SEO metadata
- `robots.txt` losing the explicit AI-crawler allowlist
