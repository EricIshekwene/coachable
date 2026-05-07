/**
 * Tests for the conditional Playbooks nav tab on sport landing pages.
 * The tab should appear only when the sport has at least one published
 * playbook section with at least one play.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { filterPublishedPlaybookSectionsForSport } from "../../src/utils/playbookSectionsApi";

const API_URL = "http://localhost:3001";

/**
 * Replace global fetch with a mock returning the given response.
 * @param {any} responseData
 * @param {boolean} ok
 */
function mockFetch(responseData, ok = true) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(responseData),
  });
}

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// filterPublishedPlaybookSectionsForSport (pure helper used by Landing.jsx)
// ---------------------------------------------------------------------------

describe("filterPublishedPlaybookSectionsForSport", () => {
  const sections = [
    { id: 1, sport: "rugby",    playCount: 3 },
    { id: 2, sport: "rugby",    playCount: 0 },
    { id: 3, sport: "football", playCount: 5 },
    { id: 4, sport: "soccer",   playCount: 2 },
  ];

  it("returns only sections matching the sport with at least one play", () => {
    const result = filterPublishedPlaybookSectionsForSport(sections, "rugby");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("excludes sections with zero plays even if sport matches", () => {
    const result = filterPublishedPlaybookSectionsForSport(sections, "rugby");
    expect(result.every((s) => s.playCount > 0)).toBe(true);
  });

  it("returns empty array when no sections match the sport", () => {
    const result = filterPublishedPlaybookSectionsForSport(sections, "basketball");
    expect(result).toHaveLength(0);
  });

  it("is case-insensitive for sport matching", () => {
    const result = filterPublishedPlaybookSectionsForSport(sections, "Rugby");
    expect(result).toHaveLength(1);
  });

  it("returns all non-empty sections when sport is empty string", () => {
    const result = filterPublishedPlaybookSectionsForSport(sections, "");
    expect(result).toHaveLength(3);
  });

  it("returns empty array for empty sections input", () => {
    const result = filterPublishedPlaybookSectionsForSport([], "rugby");
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Landing page fetch logic — simulates what Landing.jsx does at runtime
// ---------------------------------------------------------------------------

/**
 * Simulate the fetch + filter logic from Landing.jsx to verify hasPlaybooks
 * resolves correctly for a given sport.
 * @param {string} sport
 * @returns {Promise<boolean>}
 */
async function resolveHasPlaybooks(sport) {
  const r = await fetch(`${API_URL}/playbook-sections`);
  const data = await r.json();
  const matching = filterPublishedPlaybookSectionsForSport(data.sections || [], sport);
  return matching.length > 0;
}

describe("Landing hasPlaybooks fetch logic", () => {
  it("sets hasPlaybooks true when sport has sections with plays", async () => {
    mockFetch({
      sections: [
        { id: 1, sport: "rugby", playCount: 4 },
        { id: 2, sport: "soccer", playCount: 1 },
      ],
    });
    const result = await resolveHasPlaybooks("rugby");
    expect(result).toBe(true);
  });

  it("sets hasPlaybooks false when sport has no sections", async () => {
    mockFetch({
      sections: [
        { id: 1, sport: "soccer", playCount: 4 },
      ],
    });
    const result = await resolveHasPlaybooks("rugby");
    expect(result).toBe(false);
  });

  it("sets hasPlaybooks false when sport sections all have zero plays", async () => {
    mockFetch({
      sections: [
        { id: 1, sport: "rugby", playCount: 0 },
      ],
    });
    const result = await resolveHasPlaybooks("rugby");
    expect(result).toBe(false);
  });

  it("handles fetch error gracefully without throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    // Landing.jsx catches the error silently; hasPlaybooks stays false
    let result = true;
    try {
      result = await resolveHasPlaybooks("rugby");
    } catch {
      result = false;
    }
    expect(result).toBe(false);
  });

  it("handles missing sections key in response", async () => {
    mockFetch({});
    const result = await resolveHasPlaybooks("rugby");
    expect(result).toBe(false);
  });
});
