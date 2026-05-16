/**
 * Tests for the static SEO assets — public/sitemap.xml, public/llms.txt, and
 * public/robots.txt — and the per-sport SEO metadata helpers used to drive
 * <title>/<meta> tags on the public pages.
 *
 * These tests guard against three regressions that would silently hurt AI/search visibility:
 *   1. A public route is added in App.jsx but forgotten in sitemap.xml / llms.txt.
 *   2. llms.txt drifts away from the proposed standard (H1, blockquote, link list).
 *   3. A sport key (Landing's `sport` prop) is added without a matching SEO entry.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import {
  getSportMeta,
  getLandingMeta,
  getPlaybooksMeta,
  SPORT_META,
  SITE_ORIGIN,
} from "../../src/utils/sportSeo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../..");

const PUBLIC_SPORT_SLUGS = [
  "rugby",
  "football",
  "soccer",
  "lacrosse",
  "basketball",
  "field-hockey",
  "ice-hockey",
  "womens-lacrosse",
];

// ---------------------------------------------------------------------------
// public/sitemap.xml
// ---------------------------------------------------------------------------

describe("public/sitemap.xml", () => {
  const xml = readFileSync(resolve(projectRoot, "public/sitemap.xml"), "utf8");

  it("declares the xml prolog and urlset envelope", () => {
    expect(xml.startsWith("<?xml")).toBe(true);
    expect(xml).toContain("<urlset");
    expect(xml).toContain("</urlset>");
  });

  it("includes the home page at root", () => {
    expect(xml).toContain("<loc>https://coachableplays.com/</loc>");
  });

  it("includes every public sport landing page", () => {
    for (const slug of PUBLIC_SPORT_SLUGS) {
      expect(
        xml.includes(`<loc>https://coachableplays.com/${slug}</loc>`),
        `missing landing entry for /${slug}`,
      ).toBe(true);
    }
  });

  it("includes every public sport playbooks page", () => {
    for (const slug of PUBLIC_SPORT_SLUGS) {
      expect(
        xml.includes(`<loc>https://coachableplays.com/${slug}/playbooks</loc>`),
        `missing playbooks entry for /${slug}/playbooks`,
      ).toBe(true);
    }
  });

  it("includes /resources and /enterprise", () => {
    expect(xml).toContain("<loc>https://coachableplays.com/resources</loc>");
    expect(xml).toContain("<loc>https://coachableplays.com/enterprise</loc>");
  });

  it("does not expose auth or admin routes", () => {
    expect(xml).not.toContain("/admin");
    expect(xml).not.toContain("/login");
    expect(xml).not.toContain("/signup");
    expect(xml).not.toContain("/onboarding");
    expect(xml).not.toContain("/verify-email");
    expect(xml).not.toContain("/reset-password");
    expect(xml).not.toContain("/forgot-password");
    expect(xml).not.toContain("/shared/");
    expect(xml).not.toContain("/app/");
  });
});

// ---------------------------------------------------------------------------
// public/llms.txt
// ---------------------------------------------------------------------------

describe("public/llms.txt", () => {
  const text = readFileSync(resolve(projectRoot, "public/llms.txt"), "utf8");

  it("starts with an H1 (per the llms.txt spec)", () => {
    expect(text.split("\n")[0]).toMatch(/^# /);
  });

  it("has a blockquote elevator-pitch line", () => {
    expect(text).toMatch(/^>\s+/m);
  });

  it("uses H2 section headings", () => {
    expect(text).toMatch(/^## /m);
  });

  it("links to every public sport landing page", () => {
    for (const slug of PUBLIC_SPORT_SLUGS) {
      expect(
        text.includes(`https://coachableplays.com/${slug})`),
        `missing landing link for /${slug}`,
      ).toBe(true);
    }
  });

  it("links to every public sport playbooks page", () => {
    for (const slug of PUBLIC_SPORT_SLUGS) {
      expect(
        text.includes(`https://coachableplays.com/${slug}/playbooks)`),
        `missing playbooks link for /${slug}/playbooks`,
      ).toBe(true);
    }
  });

  it("includes Home, Resources, and Enterprise", () => {
    expect(text).toContain("https://coachableplays.com/)");
    expect(text).toContain("https://coachableplays.com/resources)");
    expect(text).toContain("https://coachableplays.com/enterprise)");
  });
});

// ---------------------------------------------------------------------------
// public/robots.txt
// ---------------------------------------------------------------------------

describe("public/robots.txt", () => {
  const text = readFileSync(resolve(projectRoot, "public/robots.txt"), "utf8");

  it("references the sitemap", () => {
    expect(text).toContain("Sitemap: https://coachableplays.com/sitemap.xml");
  });

  it("explicitly allows major AI crawlers", () => {
    expect(text).toMatch(/User-agent:\s*GPTBot/i);
    expect(text).toMatch(/User-agent:\s*ClaudeBot/i);
    expect(text).toMatch(/User-agent:\s*PerplexityBot/i);
    expect(text).toMatch(/User-agent:\s*Google-Extended/i);
  });
});

// ---------------------------------------------------------------------------
// src/utils/sportSeo.js (per-sport meta helpers)
// ---------------------------------------------------------------------------

describe("getSportMeta", () => {
  it("returns null for nullish keys", () => {
    expect(getSportMeta(null)).toBeNull();
    expect(getSportMeta(undefined)).toBeNull();
    expect(getSportMeta("")).toBeNull();
  });

  it("accepts the spaced form used by Landing's `sport` prop", () => {
    expect(getSportMeta("field hockey")).toBeTruthy();
    expect(getSportMeta("ice hockey")).toBeTruthy();
    expect(getSportMeta("womens lacrosse")).toBeTruthy();
  });

  it("accepts the slug form used in URLs", () => {
    expect(getSportMeta("field-hockey")).toBe(SPORT_META["field hockey"]);
    expect(getSportMeta("ice-hockey")).toBe(SPORT_META["ice hockey"]);
    expect(getSportMeta("womens-lacrosse")).toBe(SPORT_META["womens lacrosse"]);
  });

  it("returns null for unrecognized sports", () => {
    expect(getSportMeta("cricket")).toBeNull();
    expect(getSportMeta("badminton")).toBeNull();
  });
});

describe("getLandingMeta", () => {
  it("returns null for unknown sports", () => {
    expect(getLandingMeta(null)).toBeNull();
    expect(getLandingMeta("cricket")).toBeNull();
  });

  it("returns title, description, and canonical for each public sport", () => {
    for (const slug of PUBLIC_SPORT_SLUGS) {
      const meta = getLandingMeta(slug);
      expect(meta, `landing meta missing for ${slug}`).toBeTruthy();
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(meta.canonical).toBe(`${SITE_ORIGIN}/${slug}`);
    }
  });
});

describe("getPlaybooksMeta", () => {
  it("returns null for unknown sports", () => {
    expect(getPlaybooksMeta(null)).toBeNull();
    expect(getPlaybooksMeta("cricket")).toBeNull();
  });

  it("returns title, description, and canonical for each public sport", () => {
    for (const slug of PUBLIC_SPORT_SLUGS) {
      const meta = getPlaybooksMeta(slug);
      expect(meta, `playbooks meta missing for ${slug}`).toBeTruthy();
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(meta.canonical).toBe(`${SITE_ORIGIN}/${slug}/playbooks`);
    }
  });
});
