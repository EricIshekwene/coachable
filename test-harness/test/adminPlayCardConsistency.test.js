/**
 * Tests for the admin play card consistency fix:
 * - PlayCard now accepts canRemoveFromSection / onRemoveFromSection
 * - PlaybookSectionPanel enriches section plays with full playData from allPlays
 * - hasSecondaryActions includes canRemoveFromSection so the three-dots button appears
 */

import { describe, it, expect } from "vitest";

// ── enrichedSectionPlays merging logic ───────────────────────────────────────

/**
 * Mirrors the enrichment done inside PlaybookSectionPanel before rendering cards.
 * Merges each section play with its full entry from allPlays (indexed by id) so
 * that playData is available for PlayPreviewCard.
 *
 * @param {Object[]} sectionPlays - Plays returned by fetchSectionPlays (id + meta only)
 * @param {Object[]} allPlays - Full platform plays including playData
 * @returns {Object[]} Enriched plays with playData merged in
 */
function enrichSectionPlays(sectionPlays, allPlays) {
  const allPlaysById = {};
  for (const p of allPlays) allPlaysById[p.id] = p;
  return sectionPlays.map((p) => ({ ...p, ...(allPlaysById[p.id] || {}) }));
}

describe("enrichSectionPlays", () => {
  const sectionPlays = [
    { id: "p1", title: "Play One", sortOrder: 0 },
    { id: "p2", title: "Play Two", sortOrder: 10 },
    { id: "p3", title: "Orphan Play", sortOrder: 20 },
  ];

  const allPlays = [
    { id: "p1", title: "Play One", playData: { play: { entities: {} } }, tags: ["defense"] },
    { id: "p2", title: "Play Two", playData: { play: { entities: {} } }, tags: ["offense"] },
  ];

  it("merges playData from allPlays onto matching section plays", () => {
    const enriched = enrichSectionPlays(sectionPlays, allPlays);
    expect(enriched[0].playData).toEqual({ play: { entities: {} } });
    expect(enriched[1].playData).toEqual({ play: { entities: {} } });
  });

  it("preserves section play fields (sortOrder) after merge", () => {
    const enriched = enrichSectionPlays(sectionPlays, allPlays);
    expect(enriched[0].sortOrder).toBe(0);
    expect(enriched[1].sortOrder).toBe(10);
  });

  it("leaves plays with no allPlays match intact (no playData)", () => {
    const enriched = enrichSectionPlays(sectionPlays, allPlays);
    expect(enriched[2].id).toBe("p3");
    expect(enriched[2].playData).toBeUndefined();
  });

  it("returns the same length array as sectionPlays", () => {
    const enriched = enrichSectionPlays(sectionPlays, allPlays);
    expect(enriched).toHaveLength(sectionPlays.length);
  });

  it("tags from allPlays are merged onto enriched plays", () => {
    const enriched = enrichSectionPlays(sectionPlays, allPlays);
    expect(enriched[0].tags).toEqual(["defense"]);
    expect(enriched[1].tags).toEqual(["offense"]);
  });

  it("returns an empty array when sectionPlays is empty", () => {
    expect(enrichSectionPlays([], allPlays)).toHaveLength(0);
  });

  it("returns section plays unchanged when allPlays is empty", () => {
    const enriched = enrichSectionPlays(sectionPlays, []);
    expect(enriched).toHaveLength(3);
    expect(enriched[0].playData).toBeUndefined();
  });
});

// ── PlayCard hasSecondaryActions logic ───────────────────────────────────────

/**
 * Mirrors hasSecondaryActions from PlayCard.
 * The three-dots button is only shown when at least one action is available.
 */
function computeHasSecondaryActions({
  canCopyShareLinks = false,
  canDuplicate = false,
  canRename = false,
  canAddToSection = false,
  canMove = false,
  canEditTags = false,
  canDelete = false,
  canRemoveFromSection = false,
} = {}) {
  return canCopyShareLinks || canDuplicate || canRename || canAddToSection || canMove || canEditTags || canDelete || canRemoveFromSection;
}

describe("PlayCard hasSecondaryActions", () => {
  it("is false when all permission flags are off", () => {
    expect(computeHasSecondaryActions()).toBe(false);
  });

  it("is true when canRemoveFromSection is the only flag enabled", () => {
    expect(computeHasSecondaryActions({ canRemoveFromSection: true })).toBe(true);
  });

  it("is true when canDelete is enabled alongside canRemoveFromSection", () => {
    expect(computeHasSecondaryActions({ canDelete: true, canRemoveFromSection: true })).toBe(true);
  });

  it("is true when only canCopyShareLinks is enabled (pre-existing behaviour)", () => {
    expect(computeHasSecondaryActions({ canCopyShareLinks: true })).toBe(true);
  });

  it("is true when only canDuplicate is enabled (pre-existing behaviour)", () => {
    expect(computeHasSecondaryActions({ canDuplicate: true })).toBe(true);
  });

  it("is true when only canDelete is enabled (pre-existing behaviour)", () => {
    expect(computeHasSecondaryActions({ canDelete: true })).toBe(true);
  });

  it("is false even when canRemoveFromSection defaults to false", () => {
    expect(computeHasSecondaryActions({ canRemoveFromSection: false })).toBe(false);
  });
});

// ── PlayCard danger-divider visibility ───────────────────────────────────────

/**
 * Mirrors the condition that shows the top-of-danger-zone divider in the PlayCard
 * main popup. The divider appears when either canDelete or canRemoveFromSection is true.
 */
function computeShowDangerDivider({ canDelete = false, canRemoveFromSection = false } = {}) {
  return canDelete || canRemoveFromSection;
}

describe("PlayCard danger divider visibility", () => {
  it("is hidden when neither canDelete nor canRemoveFromSection is enabled", () => {
    expect(computeShowDangerDivider()).toBe(false);
  });

  it("is shown when canDelete is true", () => {
    expect(computeShowDangerDivider({ canDelete: true })).toBe(true);
  });

  it("is shown when canRemoveFromSection is true", () => {
    expect(computeShowDangerDivider({ canRemoveFromSection: true })).toBe(true);
  });

  it("is shown when both are true", () => {
    expect(computeShowDangerDivider({ canDelete: true, canRemoveFromSection: true })).toBe(true);
  });
});

// ── Section picker exclusion logic ───────────────────────────────────────────

/**
 * Mirrors the pickerPlays filter in PlaybookSectionPanel.
 * Plays already in the section should not appear in the add-play picker.
 */
function filterPickerPlays(allPlays, sectionPlayIds, search = "") {
  return allPlays.filter((p) => {
    if (sectionPlayIds.has(p.id)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.title?.toLowerCase().includes(q) || p.sport?.toLowerCase().includes(q);
  });
}

describe("PlaybookSectionPanel picker play exclusion", () => {
  const allPlays = [
    { id: "p1", title: "Blitz Package", sport: "football" },
    { id: "p2", title: "Zone Coverage", sport: "football" },
    { id: "p3", title: "Ruck Plays", sport: "rugby" },
  ];

  it("excludes plays already in the section", () => {
    const picker = filterPickerPlays(allPlays, new Set(["p1"]));
    expect(picker.map((p) => p.id)).toEqual(["p2", "p3"]);
  });

  it("returns all plays when the section is empty", () => {
    expect(filterPickerPlays(allPlays, new Set())).toHaveLength(3);
  });

  it("returns an empty list when all plays are in the section", () => {
    expect(filterPickerPlays(allPlays, new Set(["p1", "p2", "p3"]))).toHaveLength(0);
  });

  it("filters by search title on top of section exclusion", () => {
    const picker = filterPickerPlays(allPlays, new Set(["p1"]), "zone");
    expect(picker.map((p) => p.id)).toEqual(["p2"]);
  });

  it("filters by sport via search", () => {
    const picker = filterPickerPlays(allPlays, new Set(), "rugby");
    expect(picker.map((p) => p.id)).toEqual(["p3"]);
  });
});
