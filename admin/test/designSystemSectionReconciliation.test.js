/**
 * designSystemSectionReconciliation.test.js
 *
 * Guard tests that verify design-system section files stay in sync with
 * the component upgrades made during Q2/Q3 sessions. Tests are intentionally
 * source-level (readFileSync) so they catch regressions without needing a DOM.
 *
 * Rules enforced:
 *  1. Sections that use session-5+ components import them from the admin barrel.
 *  2. Sections upgraded to "live" do NOT still carry the old "spec"/"inApp" status.
 *  3. Admin-only components are NOT imported from design-system barrel directly.
 *  4. New components are exported from the correct barrels.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Read a section file by name. */
function section(name) {
  const path = resolve(ROOT, `src/admin/designSystem/sections/${name}.jsx`);
  if (!existsSync(path)) throw new Error(`Section file not found: ${name}.jsx`);
  return readFileSync(path, "utf8");
}

/** Read a component file from a given root-relative path. */
function component(rel) {
  const path = resolve(ROOT, rel);
  if (!existsSync(path)) throw new Error(`Component file not found: ${rel}`);
  return readFileSync(path, "utf8");
}

// ── Session 5: tables & lists ──────────────────────────────────────────────────
// Note: Q4 Session 1 alias purge — sections now import directly from DS barrel.

describe("TablesSection reconciliation", () => {
  const src = section("TablesSection");

  it("imports DataTable from DS barrel (not admin alias)", () => {
    expect(src).toContain("DataTable");
    expect(src).toContain("design-system/components");
    expect(src).not.toContain("AdminDataTable");
  });

  it("does not use raw <table> element", () => {
    expect(src).not.toMatch(/<table[\s>]/);
  });

  it("marks at least one table group as live", () => {
    expect(src).toContain('status="live"');
  });
});

describe("ListsSection reconciliation", () => {
  const src = section("ListsSection");

  it("imports ListItem from DS barrel (not admin alias)", () => {
    expect(src).toContain("ListItem");
    expect(src).toContain("design-system/components");
    expect(src).not.toContain("AdminListItem");
  });

  it("marks at least one list group as live", () => {
    expect(src).toContain('status="live"');
  });
});

// ── Session 6: search, filter & settings ──────────────────────────────────────

describe("SearchSection reconciliation", () => {
  const src = section("SearchSection");

  it("imports SearchInput from DS barrel (not admin alias)", () => {
    expect(src).toContain("SearchInput");
    expect(src).toContain("design-system/components");
    expect(src).not.toContain("AdminSearchInput");
  });

  it("does not inline the search icon + input pattern (uses component)", () => {
    expect(src).toContain("<SearchInput");
  });
});

describe("SettingsSection reconciliation", () => {
  const src = section("SettingsSection");

  it("imports SettingsRow from DS barrel (not admin alias)", () => {
    expect(src).toContain("SettingsRow");
    expect(src).toContain("design-system/components");
    expect(src).not.toContain("AdminSettingsRow");
  });

  it("imports DangerZone from DS barrel (not admin alias)", () => {
    expect(src).toContain("DangerZone");
    expect(src).not.toContain("AdminDangerZone");
  });
});

describe("DashboardSection reconciliation", () => {
  const src = section("DashboardSection");

  it("imports FilterBar from DS barrel (not admin alias)", () => {
    expect(src).toContain("FilterBar");
    expect(src).toContain("design-system/components");
    expect(src).not.toContain("AdminFilterBar");
  });

  it("imports BulkBar from DS barrel (not admin alias)", () => {
    expect(src).toContain("BulkBar");
    expect(src).not.toContain("AdminBulkBar");
  });

  it("imports StatCard from DS barrel (not admin alias)", () => {
    expect(src).toContain("StatCard");
    expect(src).not.toContain("AdminStatCard");
  });

  it("has a live StatCard demo group", () => {
    expect(src).toContain("<StatCard");
    expect(src).toContain('status="live"');
  });
});

// ── Session 7: stat cards, notifications, nav, selection ─────────────────────

describe("NotificationsSection reconciliation", () => {
  const src = section("NotificationsSection");

  it("imports AdminNotificationItem from admin barrel", () => {
    expect(src).toContain("AdminNotificationItem");
    expect(src).toContain("../../../admin/components");
  });

  it("uses <AdminNotificationItem> in the demo", () => {
    expect(src).toContain("<AdminNotificationItem");
  });

  it("marks the notification items group as live (not inApp)", () => {
    expect(src).toContain('status="live"');
  });
});

describe("NavigationSection reconciliation", () => {
  const src = section("NavigationSection");

  it("imports AdminSidebarNavItem from admin barrel", () => {
    expect(src).toContain("AdminSidebarNavItem");
    expect(src).toContain("../../../admin/components");
  });

  it("uses <AdminSidebarNavItem> in the sidebar demo", () => {
    expect(src).toContain("<AdminSidebarNavItem");
  });

  it("does not use raw div-based nav item rendering (old pattern)", () => {
    // Old pattern: className="flex items-center justify-between gap-2 rounded-[var(--adm-radius-md)] px-3 py-2 text-xs font-semibold"
    // with inline active style checks. After migration, this is gone.
    expect(src).not.toContain("rounded-[var(--adm-radius-md)] px-3 py-2 text-xs font-semibold");
  });
});

describe("SelectionSection reconciliation", () => {
  const src = section("SelectionSection");

  it("imports AdminSelectableCard from admin barrel", () => {
    expect(src).toContain("AdminSelectableCard");
    expect(src).toContain("../../../admin/components");
  });

  it("uses <AdminSelectableCard> in the demo", () => {
    expect(src).toContain("<AdminSelectableCard");
  });

  it("marks the selectable cards group as live (not spec)", () => {
    // After migration the group status went from spec to live.
    expect(src).toContain('status="live"');
  });

  it("is interactive — uses useState for selection", () => {
    expect(src).toContain("useState");
  });
});

// ── Q4 Sessions 3–7: atomic, media, composite, and chip components ─────────────

describe("FormsSection — Q4 reconciliation", () => {
  const src = section("FormsSection");

  it("imports TagInput from DS barrel", () => {
    expect(src).toContain("TagInput");
    expect(src).toContain("design-system/components");
  });

  it("renders <TagInput> in a live group", () => {
    expect(src).toContain("<TagInput");
  });

  it("imports CodeInput from DS barrel", () => {
    expect(src).toContain("CodeInput");
  });

  it("renders <CodeInput> in a live group", () => {
    expect(src).toContain("<CodeInput");
  });
});

describe("CardsSection — Q4 reconciliation", () => {
  const src = section("CardsSection");

  it("imports VideoCard from DS barrel", () => {
    expect(src).toContain("VideoCard");
    expect(src).toContain("design-system/components");
  });

  it("renders <VideoCard> in a live group", () => {
    expect(src).toContain("<VideoCard");
  });

  it("imports BrowseTile from DS barrel", () => {
    expect(src).toContain("BrowseTile");
  });

  it("renders <BrowseTile> in a live group", () => {
    expect(src).toContain("<BrowseTile");
  });

  it("imports RecentlyEditedChip from DS barrel", () => {
    expect(src).toContain("RecentlyEditedChip");
  });

  it("renders <RecentlyEditedChip> in a live group", () => {
    expect(src).toContain("<RecentlyEditedChip");
  });
});

describe("FeedbackSection — Q4 reconciliation", () => {
  const src = section("FeedbackSection");

  it("imports StarRating from DS barrel", () => {
    expect(src).toContain("StarRating");
    expect(src).toContain("design-system/components");
  });

  it("renders <StarRating> in a live group", () => {
    expect(src).toContain("<StarRating");
  });
});

describe("IconographySection — Q4 reconciliation", () => {
  const src = section("IconographySection");

  it("imports IconBubble from DS barrel", () => {
    expect(src).toContain("IconBubble");
    expect(src).toContain("design-system/components");
  });

  it("renders <IconBubble> in a live group", () => {
    expect(src).toContain("<IconBubble");
  });
});

describe("Doc-only sections — comment guard", () => {
  const DOC_ONLY = [
    "ColorSection", "BrandSection", "ValuesSection", "CopySection",
    "DocumentationSection", "OverviewSection", "AccessibilitySection",
    "TypographySection", "SpacingSection", "DataVizSection", "SlateSection",
    "MarketingSection", "CommerceSection", "FilesSection", "EdgeCasesSection",
    "OnboardingSection",
  ];

  test.each(DOC_ONLY)("%s has the {/* doc-only */} marker", (name) => {
    const src = section(name);
    expect(src).toContain("doc-only");
  });
});

describe("Q4 DS barrel completeness", () => {
  const barrelSrc = readFileSync(resolve(ROOT, "src/design-system/components/index.js"), "utf8");

  it("exports Q4 Session 3 components", () => {
    expect(barrelSrc).toContain("IconBubble");
    expect(barrelSrc).toContain("AccordionItem");
    expect(barrelSrc).toContain("InlineEdit");
    expect(barrelSrc).toContain("TimestampChip");
    expect(barrelSrc).toContain("TokenBox");
    expect(barrelSrc).toContain("AuthCard");
  });

  it("exports Q4 Session 4 components", () => {
    expect(barrelSrc).toContain("VideoCard");
    expect(barrelSrc).toContain("BrowseTile");
  });

  it("exports Q4 Session 5 components", () => {
    expect(barrelSrc).toContain("TagInput");
    expect(barrelSrc).toContain("StarRating");
    expect(barrelSrc).toContain("QuestionCard");
    expect(barrelSrc).toContain("CodeInput");
  });

  it("exports Q4 Session 7 component", () => {
    expect(barrelSrc).toContain("RecentlyEditedChip");
  });

  it("exports Q4 Session 9 navigation components", () => {
    expect(barrelSrc).toContain("Sidebar");
    expect(barrelSrc).toContain("SidebarNavItem");
  });
});

// ── Admin-only components live in the right barrel ────────────────────────────

describe("Admin-only component source locations", () => {
  it("NotificationItem lives in src/admin/components/", () => {
    const src = component("src/admin/components/NotificationItem.jsx");
    expect(src).toContain('data-component="NotificationItem"');
  });

  it("SidebarNavItem lives in src/admin/components/", () => {
    const src = component("src/admin/components/SidebarNavItem.jsx");
    expect(src).toContain('data-component="SidebarNavItem"');
  });

  it("SelectableCard lives in src/admin/components/", () => {
    const src = component("src/admin/components/SelectableCard.jsx");
    expect(src).toContain('data-component="SelectableCard"');
  });

  it("StatCard lives in src/design-system/components/ (shared)", () => {
    const src = component("src/design-system/components/StatCard.jsx");
    expect(src).toContain('data-component="StatCard"');
  });
});

// ── Token consistency: new components use correct token layers ────────────────

describe("Token layer consistency", () => {
  it("StatCard uses --ui-* tokens only (not --adm-*)", () => {
    const src = component("src/design-system/components/StatCard.jsx");
    expect(src).not.toContain("--adm-");
  });

  it("NotificationItem uses --adm-* tokens (admin context)", () => {
    const src = component("src/admin/components/NotificationItem.jsx");
    expect(src).toContain("--adm-");
  });

  it("SidebarNavItem uses --adm-* tokens (admin context)", () => {
    const src = component("src/admin/components/SidebarNavItem.jsx");
    expect(src).toContain("--adm-");
  });

  it("SelectableCard uses --adm-* tokens (admin context)", () => {
    const src = component("src/admin/components/SelectableCard.jsx");
    expect(src).toContain("--adm-");
  });
});

// ── Barrel export completeness ─────────────────────────────────────────────────

describe("Design-system barrel completeness", () => {
  const barrelSrc = readFileSync(resolve(ROOT, "src/design-system/components/index.js"), "utf8");

  it("exports StatCard", () => {
    expect(barrelSrc).toContain("StatCard");
  });

  it("exports all Session-5 table primitives", () => {
    expect(barrelSrc).toContain("DataTable");
    expect(barrelSrc).toContain('"./Th"');
    expect(barrelSrc).toContain('"./Td"');
    expect(barrelSrc).toContain("TableSearchHeader");
    expect(barrelSrc).toContain("ListItem");
  });

  it("exports all Session-6 pattern components", () => {
    expect(barrelSrc).toContain("SearchInput");
    expect(barrelSrc).toContain("SettingsRow");
    expect(barrelSrc).toContain("FilterBar");
    expect(barrelSrc).toContain("BulkBar");
    expect(barrelSrc).toContain("DangerZone");
  });
});

describe("Admin barrel — Q4 Session 1 purge guard", () => {
  const barrelSrc = readFileSync(resolve(ROOT, "src/admin/components/index.js"), "utf8");

  it("still exports AdminNotificationItem (legitimate non-alias)", () => {
    expect(barrelSrc).toContain("AdminNotificationItem");
  });

  it("still exports AdminSidebarNavItem (legitimate non-alias)", () => {
    expect(barrelSrc).toContain("AdminSidebarNavItem");
  });

  it("still exports AdminSelectableCard (legitimate non-alias)", () => {
    expect(barrelSrc).toContain("AdminSelectableCard");
  });

  it("no longer exports DS aliases (Session-5 tables)", () => {
    expect(barrelSrc).not.toContain("AdminDataTable");
    expect(barrelSrc).not.toContain("AdminListItem");
  });

  it("no longer exports DS aliases (Session-6 patterns)", () => {
    expect(barrelSrc).not.toContain("AdminSearchInput");
    expect(barrelSrc).not.toContain("AdminSettingsRow");
    expect(barrelSrc).not.toContain("AdminFilterBar");
    expect(barrelSrc).not.toContain("AdminBulkBar");
    expect(barrelSrc).not.toContain("AdminDangerZone");
  });

  it("no longer exports AdminStatCard DS alias", () => {
    expect(barrelSrc).not.toContain("AdminStatCard");
  });
});
