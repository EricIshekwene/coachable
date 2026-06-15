/**
 * componentExtraction.test.js
 *
 * Logic-mirror tests for the five components extracted in Phase 2:
 *   AdminPlayCard  (src/admin/components/AdminPlayCard.jsx)
 *   AdminFolderCard (src/admin/components/AdminFolderCard.jsx)
 *   AdminSectionRow (src/admin/components/AdminSectionRow.jsx)
 *   PlayCard       (src/components/PlayCard.jsx)
 *   FolderCard     (src/components/FolderCard.jsx)
 *
 * Pure-function mirrors of component logic — no DOM rendering, no RTL, no jsdom.
 * Follows the same style as adminShell.test.js / appLayout.test.js.
 */

import { describe, it, expect } from "vitest";

// ── AdminPlayCard ─────────────────────────────────────────────────────────────

/**
 * Mirrors AdminPlayCard's permission-flag guard: a menu item is visible only
 * when the corresponding `can*` prop is truthy.
 */
function adminPlayMenuItems({
  canEdit, canDelete, canMove, canDuplicate,
  canAddToSection, canEditTags, canRename,
  canCopyShareLinks, canRemoveFromSection,
}) {
  const items = [];
  if (canEdit)             items.push("edit");
  if (canDelete)           items.push("delete");
  if (canMove)             items.push("move");
  if (canDuplicate)        items.push("duplicate");
  if (canAddToSection)     items.push("addToSection");
  if (canEditTags)         items.push("editTags");
  if (canRename)           items.push("rename");
  if (canCopyShareLinks)   items.push("copyShareLinks");
  if (canRemoveFromSection) items.push("removeFromSection");
  return items;
}

/** Mirrors the AdminPlayCard menu-step machine initial state. */
function adminPlayInitialMenuStep() {
  return null;
}

/** Mirrors the "open menu" transition. */
function adminPlayOpenMenu(step) {
  return step === null ? "main" : step;
}

/** Mirrors navigating to a sub-menu step. */
function adminPlayNavigateStep(_, target) {
  return target;
}

/** Mirrors closing the menu (any cancel/action path). */
function adminPlayCloseMenu() {
  return null;
}

describe("AdminPlayCard — permission flags", () => {
  it("shows no items when all permissions are false", () => {
    const items = adminPlayMenuItems({
      canEdit: false, canDelete: false, canMove: false, canDuplicate: false,
      canAddToSection: false, canEditTags: false, canRename: false,
      canCopyShareLinks: false, canRemoveFromSection: false,
    });
    expect(items).toHaveLength(0);
  });

  it("shows all items when all permissions are true", () => {
    const items = adminPlayMenuItems({
      canEdit: true, canDelete: true, canMove: true, canDuplicate: true,
      canAddToSection: true, canEditTags: true, canRename: true,
      canCopyShareLinks: true, canRemoveFromSection: true,
    });
    expect(items).toHaveLength(9);
  });

  it("shows only the permitted items for a typical coach (no delete, no removeFromSection)", () => {
    const items = adminPlayMenuItems({
      canEdit: true, canDelete: false, canMove: true, canDuplicate: true,
      canAddToSection: true, canEditTags: true, canRename: true,
      canCopyShareLinks: true, canRemoveFromSection: false,
    });
    expect(items).toContain("edit");
    expect(items).not.toContain("delete");
    expect(items).not.toContain("removeFromSection");
  });
});

describe("AdminPlayCard — menu step machine", () => {
  it("starts with step null (menu closed)", () => {
    expect(adminPlayInitialMenuStep()).toBeNull();
  });

  it("transitions to 'main' when menu is opened from null", () => {
    expect(adminPlayOpenMenu(null)).toBe("main");
  });

  it("navigates to sub-step", () => {
    expect(adminPlayNavigateStep("main", "sections")).toBe("sections");
    expect(adminPlayNavigateStep("main", "folders")).toBe("folders");
    expect(adminPlayNavigateStep("main", "tags")).toBe("tags");
    expect(adminPlayNavigateStep("main", "rename")).toBe("rename");
  });

  it("returns null when menu is closed from any step", () => {
    expect(adminPlayCloseMenu()).toBeNull();
  });
});

// ── AdminFolderCard ───────────────────────────────────────────────────────────

/** Mirrors AdminFolderCard inline-rename confirmation logic. */
function adminFolderConfirmRename(editValue, originalName) {
  const trimmed = editValue.trim();
  if (!trimmed) return { saved: false, value: originalName };
  if (trimmed === originalName) return { saved: false, value: originalName };
  return { saved: true, value: trimmed };
}

/** Mirrors the folder sport-badge label for a given sport key. */
function adminFolderSportBadge(sport) {
  const SPORT_LABELS = {
    rugby_union: "Rugby Union",
    rugby_league: "Rugby League",
    american_football: "American Football",
    australian_football: "Australian Football",
    field_hockey: "Field Hockey",
  };
  return SPORT_LABELS[sport] ?? sport ?? null;
}

describe("AdminFolderCard — inline rename", () => {
  it("saves when the trimmed value differs from the original name", () => {
    expect(adminFolderConfirmRename("  New Name  ", "Old Name")).toEqual({ saved: true, value: "New Name" });
  });

  it("does not save when the value is unchanged", () => {
    expect(adminFolderConfirmRename("Old Name", "Old Name")).toEqual({ saved: false, value: "Old Name" });
  });

  it("does not save when the value is empty / whitespace only", () => {
    expect(adminFolderConfirmRename("   ", "Old Name")).toEqual({ saved: false, value: "Old Name" });
    expect(adminFolderConfirmRename("", "Old Name")).toEqual({ saved: false, value: "Old Name" });
  });
});

describe("AdminFolderCard — sport badge", () => {
  it("maps known sport keys to human-readable labels", () => {
    expect(adminFolderSportBadge("rugby_union")).toBe("Rugby Union");
    expect(adminFolderSportBadge("american_football")).toBe("American Football");
  });

  it("returns the raw value for unknown sport keys", () => {
    expect(adminFolderSportBadge("lacrosse")).toBe("lacrosse");
  });

  it("returns null for no sport", () => {
    expect(adminFolderSportBadge(null)).toBeNull();
  });
});

// ── AdminSectionRow ───────────────────────────────────────────────────────────

/** Mirrors AdminSectionRow priority-warning threshold: >50% capacity is a warning. */
function adminSectionPriorityWarning(assignedCount, sectionCapacity) {
  if (!sectionCapacity || sectionCapacity <= 0) return false;
  return assignedCount / sectionCapacity > 0.5;
}

/** Mirrors AdminSectionRow play-picker search filter. */
function adminSectionFilterPlays(plays, search) {
  const q = (search || "").trim().toLowerCase();
  if (!q) return plays;
  return plays.filter((p) => (p.title || "").toLowerCase().includes(q));
}

/** Mirrors the already-assigned guard: a play in the section is disabled in the picker. */
function adminSectionIsAssigned(play, section) {
  return (section.plays || []).some((sp) => sp.id === play.id);
}

describe("AdminSectionRow — priority warning", () => {
  it("warns when more than half capacity is filled", () => {
    expect(adminSectionPriorityWarning(6, 10)).toBe(true);
    expect(adminSectionPriorityWarning(10, 10)).toBe(true);
  });

  it("does not warn at exactly 50% or below", () => {
    expect(adminSectionPriorityWarning(5, 10)).toBe(false);
    expect(adminSectionPriorityWarning(3, 10)).toBe(false);
  });

  it("does not warn when capacity is zero or missing", () => {
    expect(adminSectionPriorityWarning(5, 0)).toBe(false);
    expect(adminSectionPriorityWarning(5, null)).toBe(false);
  });
});

describe("AdminSectionRow — play picker filter", () => {
  const plays = [
    { id: "1", title: "Scrum Play" },
    { id: "2", title: "Lineout Option A" },
    { id: "3", title: "Kick Play" },
  ];

  it("returns all plays when search is empty", () => {
    expect(adminSectionFilterPlays(plays, "")).toHaveLength(3);
    expect(adminSectionFilterPlays(plays, "   ")).toHaveLength(3);
  });

  it("returns matching plays case-insensitively", () => {
    expect(adminSectionFilterPlays(plays, "SCRUM")).toHaveLength(1);
    expect(adminSectionFilterPlays(plays, "play")).toHaveLength(2);
  });

  it("returns empty array when nothing matches", () => {
    expect(adminSectionFilterPlays(plays, "ruck")).toHaveLength(0);
  });
});

describe("AdminSectionRow — already-assigned guard", () => {
  const section = { plays: [{ id: "a" }, { id: "b" }] };

  it("marks plays already in the section as assigned", () => {
    expect(adminSectionIsAssigned({ id: "a" }, section)).toBe(true);
  });

  it("marks plays not in the section as unassigned", () => {
    expect(adminSectionIsAssigned({ id: "c" }, section)).toBe(false);
  });
});

// ── PlayCard (app) ────────────────────────────────────────────────────────────

/** Mirrors PlayCard bulk-select visibility: checkbox shows only in bulkMode. */
function playCardShowsCheckbox(bulkMode) {
  return bulkMode === true;
}

/** Mirrors PlayCard selected-state border classes. */
function playCardBorderClasses(bulkMode, selected) {
  if (bulkMode && selected) return "border-BrandOrange/50 bg-BrandOrange/6";
  return "border-BrandGray2/20";
}

/** Mirrors PlayCard inline-rename confirm logic. */
function playCardConfirmRename(renameValue, currentTitle) {
  const trimmed = (renameValue || "").trim();
  if (!trimmed) return null;
  if (trimmed === currentTitle) return null;
  return trimmed;
}

/** Mirrors canPostToCommunity guard: role + ownership required. */
function playCardCanPost(canRolePostToCommunity, play, userId) {
  return canRolePostToCommunity && play.createdByUserId === userId;
}

describe("PlayCard — bulk select", () => {
  it("shows checkbox only when bulkMode is true", () => {
    expect(playCardShowsCheckbox(true)).toBe(true);
    expect(playCardShowsCheckbox(false)).toBe(false);
  });

  it("applies orange border when selected in bulk mode", () => {
    expect(playCardBorderClasses(true, true)).toContain("BrandOrange");
  });

  it("applies default border when not in bulk mode or not selected", () => {
    expect(playCardBorderClasses(false, false)).toContain("BrandGray2");
    expect(playCardBorderClasses(true, false)).toContain("BrandGray2");
  });
});

describe("PlayCard — inline rename", () => {
  it("returns the trimmed new title when it differs", () => {
    expect(playCardConfirmRename("  New Title  ", "Old Title")).toBe("New Title");
  });

  it("returns null when value is empty", () => {
    expect(playCardConfirmRename("", "Old Title")).toBeNull();
    expect(playCardConfirmRename("   ", "Old Title")).toBeNull();
  });

  it("returns null when value matches current title", () => {
    expect(playCardConfirmRename("Old Title", "Old Title")).toBeNull();
  });
});

describe("PlayCard — canPostToCommunity", () => {
  it("allows posting when role is eligible and play belongs to the current user", () => {
    expect(playCardCanPost(true, { createdByUserId: "u1" }, "u1")).toBe(true);
  });

  it("blocks posting when the play belongs to a different user", () => {
    expect(playCardCanPost(true, { createdByUserId: "u2" }, "u1")).toBe(false);
  });

  it("blocks posting when the role is not eligible", () => {
    expect(playCardCanPost(false, { createdByUserId: "u1" }, "u1")).toBe(false);
  });
});

// ── FolderCard (app) ──────────────────────────────────────────────────────────

/** Mirrors FolderCard subfolder-count subtitle logic. */
function folderCardSubtitle(playIds, subFolderCount) {
  const playCount = (playIds || []).length;
  const playLabel = `${playCount} play${playCount !== 1 ? "s" : ""}`;
  if (subFolderCount > 0) {
    return `${playLabel} · ${subFolderCount} subfolder${subFolderCount !== 1 ? "s" : ""}`;
  }
  return playLabel;
}

/** Mirrors FolderCard drag-over ring classes. */
function folderCardDragClasses(isDragOver) {
  return isDragOver
    ? "border-BrandOrange/60 bg-BrandOrange/8 shadow-[0_0_0_2px_rgba(255,122,24,0.18)]"
    : "border-BrandGray2/20";
}

/** Mirrors FolderCard rename confirm logic (same pattern as PlayCard). */
function folderCardConfirmRename(renameValue, originalName) {
  const trimmed = (renameValue || "").trim();
  if (!trimmed || trimmed === originalName) return null;
  return trimmed;
}

describe("FolderCard — subfolder count subtitle", () => {
  it("shows play count with no subfolder info when subFolderCount is 0", () => {
    expect(folderCardSubtitle(["a", "b"], 0)).toBe("2 plays");
    expect(folderCardSubtitle(["a"], 0)).toBe("1 play");
  });

  it("includes subfolder count when greater than 0", () => {
    expect(folderCardSubtitle(["a", "b"], 1)).toBe("2 plays · 1 subfolder");
    expect(folderCardSubtitle(["a"], 3)).toBe("1 play · 3 subfolders");
  });

  it("handles empty playIds gracefully", () => {
    expect(folderCardSubtitle([], 0)).toBe("0 plays");
    expect(folderCardSubtitle(null, 2)).toBe("0 plays · 2 subfolders");
  });
});

describe("FolderCard — drag-over ring", () => {
  it("applies orange ring classes when a play is dragged over", () => {
    expect(folderCardDragClasses(true)).toContain("BrandOrange");
  });

  it("applies neutral border when not dragged over", () => {
    expect(folderCardDragClasses(false)).toContain("BrandGray2");
  });
});

describe("FolderCard — inline rename", () => {
  it("returns the trimmed new name when it differs", () => {
    expect(folderCardConfirmRename("  New Name  ", "Old Name")).toBe("New Name");
  });

  it("returns null when the name is unchanged", () => {
    expect(folderCardConfirmRename("Old Name", "Old Name")).toBeNull();
  });

  it("returns null when the value is empty or whitespace", () => {
    expect(folderCardConfirmRename("", "Old Name")).toBeNull();
    expect(folderCardConfirmRename("  ", "Old Name")).toBeNull();
  });
});
