/**
 * outreachScraper.test.js
 *
 * Unit tests for the outreach scraper's pure logic:
 *   - normalize.js  — title/category → sport + role tags
 *   - sidearm.js    — DOM parsing of real saved staff-directory fixtures
 *   - csv.js        — RFC 4180 escaping
 *
 * The fixtures in ./fixtures/ are real pages saved during development
 * (Dayton = Sidearm legacy, Toledo = Sidearm nextgen).
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  deriveSport,
  deriveRoleTags,
  normalizeStaff,
  cleanCategory,
} from "../../server/lib/outreachScraper/normalize.js";
import {
  parseSidearm,
  deobfuscateLegacyEmail,
} from "../../server/lib/outreachScraper/sidearm.js";
import { csvField, toCsv } from "../../server/lib/outreachScraper/csv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(__dirname, "fixtures");
const readFixture = (n) => fs.readFileSync(path.join(FIX, n), "utf8");

describe("normalize: cleanCategory", () => {
  it("strips Sidearm legacy ZIP suffix and collapses whitespace", () => {
    expect(cleanCategory("Athletics Administration  (ZIP: 45469-1230)")).toBe(
      "Athletics Administration"
    );
  });
  it("handles empty input", () => {
    expect(cleanCategory()).toBe("");
  });
});

describe("normalize: deriveSport", () => {
  it("derives sport from the category heading when the title is generic", () => {
    expect(deriveSport("Football Coaching Staff", "Assistant Coach")).toBe("football");
  });
  it("derives sport from the title when category is empty", () => {
    expect(deriveSport("", "Head Women's Lacrosse Coach")).toBe("womens_lacrosse");
  });
  it("prefers gendered over generic (women's basketball, not basketball)", () => {
    expect(deriveSport("Women's Basketball Coaching Staff", "Head Coach")).toBe(
      "womens_basketball"
    );
  });
  it("returns null for administrative staff with no sport", () => {
    expect(deriveSport("Athletics Administration", "Director of Athletics")).toBeNull();
  });
});

describe("normalize: deriveRoleTags", () => {
  it("tags a head coach", () => {
    expect(deriveRoleTags("Head Football Coach")).toContain("head_coach");
  });
  it("tags coordinators", () => {
    expect(deriveRoleTags("Offensive Coordinator")).toContain("offensive_coordinator");
  });
  it("captures split 'Assistant ... Coach' phrasing", () => {
    expect(deriveRoleTags("Assistant Women's Soccer Coach")).toContain("assistant_coach");
  });
  it("does NOT tag a non-coaching assistant as assistant_coach", () => {
    expect(deriveRoleTags("Executive Assistant to the Director of Athletics")).not.toContain(
      "assistant_coach"
    );
  });
  it("can return multiple role tags", () => {
    const tags = deriveRoleTags("Assistant Coach / Recruiting Coordinator");
    expect(tags).toEqual(expect.arrayContaining(["assistant_coach", "recruiting_coordinator"]));
  });
  it("returns an empty array when nothing matches", () => {
    expect(deriveRoleTags("Faculty Athletic Representative")).toEqual([]);
  });
});

describe("normalize: normalizeStaff", () => {
  it("normalizes a full record and trims whitespace", () => {
    const out = normalizeStaff({
      name: "  Jane Doe ",
      title: "Head Softball Coach",
      email: "jdoe@school.edu ",
      phone: "555-1234",
      categoryLabel: "Softball Coaching Staff",
    });
    expect(out).toEqual({
      name: "Jane Doe",
      title: "Head Softball Coach",
      sport: "softball",
      roleTags: ["head_coach"],
      email: "jdoe@school.edu",
      phone: "555-1234",
    });
  });
});

describe("sidearm: deobfuscateLegacyEmail", () => {
  it("reconstructs an email from the inline-script halves", () => {
    const cell = `<a href="#"></a><script>var firstHalf = "AD"; var secondHalf = "udayton.edu"; var full_email = firstHalf + '@' + secondHalf;</script>`;
    expect(deobfuscateLegacyEmail(cell)).toBe("AD@udayton.edu");
  });
  it("returns null when the halves aren't present", () => {
    expect(deobfuscateLegacyEmail("<td>no script here</td>")).toBeNull();
  });
});

describe("sidearm: parse legacy fixture (Dayton)", () => {
  const rows = parseSidearm(readFixture("sidearm_legacy_dayton.html"), "sidearm_legacy");
  it("extracts a substantial number of staff", () => {
    expect(rows.length).toBeGreaterThan(100);
  });
  it("de-obfuscates emails for most rows", () => {
    const withEmail = rows.filter((r) => r.email && r.email.includes("@"));
    expect(withEmail.length).toBeGreaterThan(100);
  });
  it("associates a category with members", () => {
    expect(rows.some((r) => r.categoryLabel && r.categoryLabel.length > 0)).toBe(true);
  });
  it("captures name + title for the athletic director", () => {
    const ad = rows.find((r) => /director of athletics/i.test(r.title));
    expect(ad).toBeTruthy();
    expect(ad.name).toMatch(/\w+\s+\w+/);
  });
});

describe("sidearm: parse nextgen fixture (Toledo)", () => {
  const rows = parseSidearm(readFixture("sidearm_nextgen_toledo.html"), "sidearm_nextgen");
  it("extracts a substantial number of staff", () => {
    expect(rows.length).toBeGreaterThan(100);
  });
  it("pulls mailto emails directly", () => {
    const withEmail = rows.filter((r) => r.email && r.email.includes("@"));
    expect(withEmail.length).toBeGreaterThan(100);
  });
  it("extracts a head football coach with the right normalized fields", () => {
    const norm = rows.map(normalizeStaff);
    const coach = norm.find((r) => /head football coach/i.test(r.title));
    expect(coach).toBeTruthy();
    expect(coach.sport).toBe("football");
    expect(coach.roleTags).toContain("head_coach");
  });
});

describe("sidearm: unknown platform tries both parsers", () => {
  it("still extracts staff from a legacy page tagged 'unknown'", () => {
    const rows = parseSidearm(readFixture("sidearm_legacy_dayton.html"), "unknown");
    expect(rows.length).toBeGreaterThan(100);
  });
});

describe("csv: escaping (RFC 4180)", () => {
  it("leaves simple values unquoted", () => {
    expect(csvField("Head Coach")).toBe("Head Coach");
  });
  it("quotes values with commas", () => {
    expect(csvField("Smith, John")).toBe('"Smith, John"');
  });
  it("doubles embedded quotes", () => {
    expect(csvField('He said "hi"')).toBe('"He said ""hi"""');
  });
  it("quotes values with newlines", () => {
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
  });
  it("renders null/undefined as empty", () => {
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
  });
  it("builds a CRLF-joined document with a header", () => {
    const csv = toCsv(["A", "B"], [["1", "x,y"], ["2", "z"]]);
    expect(csv).toBe('A,B\r\n1,"x,y"\r\n2,z');
  });
});
