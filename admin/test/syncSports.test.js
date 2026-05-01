import { describe, it, expect, beforeEach, vi } from "vitest";
import { syncSports } from "../../server/utils/syncSports.js";

/**
 * Builds a mock pg Pool whose query() returns controlled results per SQL pattern.
 * Tracks all queries executed for assertion.
 */
function mockPool(queryResponses = {}) {
  const executed = [];

  const query = vi.fn(async (sql, params) => {
    executed.push({ sql: sql.replace(/\s+/g, " ").trim(), params });

    // Match by substring of the SQL
    for (const [key, result] of Object.entries(queryResponses)) {
      if (sql.includes(key)) return result;
    }
    return { rows: [] };
  });

  return { query, executed };
}

describe("syncSports", () => {
  it("creates a new sport folder when none exists and no name match", async () => {
    const pool = mockPool({
      "is_sport_folder = true AND sport": { rows: [] },        // no existing sport folder
      "LOWER(name) = LOWER": { rows: [] },                     // no name match
      "INSERT INTO platform_play_folders": { rows: [] },
      "INSERT INTO page_sections": { rows: [] },
    });

    await syncSports(pool);

    const insertFolder = pool.executed.find((q) => q.sql.includes("INSERT INTO platform_play_folders"));
    expect(insertFolder).toBeTruthy();
    expect(insertFolder.params[2]).toBe(true); // is_sport_folder = true
  });

  it("converts an existing folder whose name matches a sport", async () => {
    const pool = mockPool({
      "is_sport_folder = true AND sport = $1": { rows: [] },   // no sport folder yet
      "LOWER(name) = LOWER": { rows: [{ id: "existing-id" }] },// name match found
      "UPDATE platform_play_folders": { rows: [] },
      "INSERT INTO page_sections": { rows: [] },
    });

    await syncSports(pool);

    const updateQuery = pool.executed.find((q) => q.sql.includes("UPDATE platform_play_folders"));
    expect(updateQuery).toBeTruthy();
    expect(updateQuery.params[1]).toBe("existing-id");
  });

  it("skips folder creation when sport folder already exists", async () => {
    const pool = mockPool({
      "is_sport_folder = true AND sport": { rows: [{ id: "sport-folder-id" }] }, // already exists
      "INSERT INTO page_sections": { rows: [] },
    });

    await syncSports(pool);

    const insertFolder = pool.executed.find((q) => q.sql.includes("INSERT INTO platform_play_folders"));
    const updateFolder = pool.executed.find((q) => q.sql.includes("UPDATE platform_play_folders"));
    expect(insertFolder).toBeUndefined();
    expect(updateFolder).toBeUndefined();
  });

  it("always inserts page_sections rows (ON CONFLICT DO NOTHING makes it idempotent)", async () => {
    const pool = mockPool({
      "is_sport_folder = true AND sport": { rows: [{ id: "sport-folder-id" }] },
      "INSERT INTO page_sections": { rows: [] },
    });

    await syncSports(pool);

    const sectionInserts = pool.executed.filter((q) => q.sql.includes("INSERT INTO page_sections"));
    // One per sport in SPORT_CONFIGS
    expect(sectionInserts.length).toBeGreaterThan(0);
  });

  it("is idempotent — running twice does not double-create folders", async () => {
    // Simulate: after first run, sport folders exist
    let callCount = 0;
    const pool = {
      executed: [],
      query: vi.fn(async (sql, params) => {
        pool.executed.push({ sql, params });
        if (sql.includes("is_sport_folder = true AND sport")) {
          callCount++;
          // Second run: sport folder already exists
          if (callCount > 8) return { rows: [{ id: "sport-folder-id" }] };
          return { rows: [] };
        }
        if (sql.includes("LOWER(name) = LOWER")) return { rows: [] };
        return { rows: [] };
      }),
    };

    await syncSports(pool);
    const firstRunInserts = pool.executed.filter((q) => q.sql.includes("INSERT INTO platform_play_folders")).length;

    pool.executed = [];
    callCount = 0;
    // Now simulate all sport folders exist
    pool.query = vi.fn(async (sql) => {
      if (sql.includes("is_sport_folder = true AND sport")) return { rows: [{ id: "x" }] };
      return { rows: [] };
    });

    await syncSports(pool);
    const secondRunInserts = pool.executed.filter((q) => q.sql.includes("INSERT INTO platform_play_folders")).length;

    expect(firstRunInserts).toBeGreaterThan(0);
    expect(secondRunInserts).toBe(0);
  });
});
