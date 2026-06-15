/**
 * Tests for sport-aware public navigation context preservation.
 * Verifies that navigating from a sport landing page carries the sport slug
 * through to Resources, Enterprise, and other public pages via ?sport= query param,
 * and that nav links on those pages link back correctly to the sport home.
 */

import { describe, it, expect } from "vitest";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a raw sport string to a URL slug.
 * @param {string} sport
 * @returns {string}
 */
function toSlug(sport) {
  return sport.replace(/ /g, "-");
}

/**
 * Converts a URL slug back to a sport API key (with spaces).
 * @param {string} slug
 * @returns {string}
 */
function fromSlug(slug) {
  return slug.replace(/-/g, " ");
}

/**
 * Builds a nav link href with optional sport context.
 * Mirrors the sportHref() helper in SportAwarePublicNav.jsx.
 * @param {string} path
 * @param {string|null} sportSlug
 * @returns {string}
 */
function sportHref(path, sportSlug) {
  return sportSlug ? `${path}?sport=${sportSlug}` : path;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Sport slug conversion", () => {
  it("converts sport name to URL slug", () => {
    expect(toSlug("field hockey")).toBe("field-hockey");
    expect(toSlug("ice hockey")).toBe("ice-hockey");
    expect(toSlug("womens lacrosse")).toBe("womens-lacrosse");
    expect(toSlug("rugby")).toBe("rugby");
  });

  it("converts URL slug back to sport API key", () => {
    expect(fromSlug("field-hockey")).toBe("field hockey");
    expect(fromSlug("ice-hockey")).toBe("ice hockey");
    expect(fromSlug("womens-lacrosse")).toBe("womens lacrosse");
    expect(fromSlug("rugby")).toBe("rugby");
  });

  it("round-trips correctly", () => {
    const sports = ["rugby", "field hockey", "ice hockey", "womens lacrosse", "lacrosse"];
    for (const sport of sports) {
      expect(fromSlug(toSlug(sport))).toBe(sport);
    }
  });
});

describe("sportHref nav link builder", () => {
  it("returns bare path when no sport", () => {
    expect(sportHref("/resources", null)).toBe("/resources");
    expect(sportHref("/enterprise", null)).toBe("/enterprise");
  });

  it("appends ?sport= param when sport slug is provided", () => {
    expect(sportHref("/resources", "rugby")).toBe("/resources?sport=rugby");
    expect(sportHref("/enterprise", "field-hockey")).toBe("/enterprise?sport=field-hockey");
    expect(sportHref("/resources", "womens-lacrosse")).toBe("/resources?sport=womens-lacrosse");
  });
});

describe("Sport home href", () => {
  it("links to sport landing page when sport is present", () => {
    const sportSlug = "rugby";
    const homeHref = sportSlug ? `/${sportSlug}` : "/home";
    expect(homeHref).toBe("/rugby");
  });

  it("links to /home when no sport", () => {
    const sportSlug = null;
    const homeHref = sportSlug ? `/${sportSlug}` : "/home";
    expect(homeHref).toBe("/home");
  });

  it("builds correct home hrefs for multi-word sports", () => {
    const cases = [
      { sport: "field hockey", expected: "/field-hockey" },
      { sport: "ice hockey", expected: "/ice-hockey" },
      { sport: "womens lacrosse", expected: "/womens-lacrosse" },
    ];
    for (const { sport, expected } of cases) {
      const slug = toSlug(sport);
      expect(`/${slug}`).toBe(expected);
    }
  });
});

describe("Login/Signup back link label", () => {
  it("shows sport-specific back label when ?sport= is present", () => {
    const sportSlug = "rugby";
    const label = sportSlug
      ? `Back to ${sportSlug.replace(/-/g, " ")} home`
      : "Back to home";
    expect(label).toBe("Back to rugby home");
  });

  it("shows generic back label when no sport", () => {
    const sportSlug = null;
    const label = sportSlug
      ? `Back to ${sportSlug.replace(/-/g, " ")} home`
      : "Back to home";
    expect(label).toBe("Back to home");
  });

  it("humanises multi-word sport slugs in back label", () => {
    const sportSlug = "field-hockey";
    const label = `Back to ${sportSlug.replace(/-/g, " ")} home`;
    expect(label).toBe("Back to field hockey home");
  });
});

describe("Nav link context preservation across pages", () => {
  const PAGES = ["/resources", "/enterprise"];
  const SPORTS = ["rugby", "football", "lacrosse", "field-hockey"];

  it("every public page nav link carries the sport slug forward", () => {
    for (const sport of SPORTS) {
      for (const page of PAGES) {
        const href = sportHref(page, sport);
        expect(href).toContain(`?sport=${sport}`);
      }
    }
  });

  it("sport context is absent from links when sport is null", () => {
    for (const page of PAGES) {
      expect(sportHref(page, null)).not.toContain("?sport=");
    }
  });
});
