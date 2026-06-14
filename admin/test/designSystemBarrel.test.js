import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as DS from "../../src/design-system/components";
import * as Admin from "../../src/admin/components";
import {
  Alert, Avatar, Badge, Breadcrumbs, Button, Card, Checkbox, Chip, Divider, EmptyState, Field,
  Input, Modal, Pagination, Progress, RadioGroup, Section, Select, Skeleton,
  Spinner, Tabs, Textarea, Toggle, Tooltip,
  DataTable, Th, Td, TableSearchHeader, ListItem,
  SearchInput, SettingsRow, FilterBar, BulkBar, DangerZone,
  StatCard,
} from "../../src/design-system/components";

/** Returns true for function components, class components, forwardRef, and memo wrappers. */
function isReactComponentType(value) {
  if (typeof value === "function") return true;
  if (value === null || typeof value !== "object") return false;
  return typeof value.$$typeof === "symbol";
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("design-system barrel", () => {
  const canonical = [
    "Button", "Field", "Input", "Textarea", "Select", "Checkbox", "Toggle", "RadioGroup",
    "Card", "Section", "Modal", "ConfirmDialog", "Toast", "Menu", "MenuItem", "Popover",
    "Alert", "Spinner", "Skeleton", "Progress",
    "EmptyState", "Badge", "Chip", "Avatar", "Tabs", "Breadcrumbs", "Pagination",
    "Tooltip", "Divider", "PageShell", "Page", "PageHeader",
    // Session 5 — tables & lists
    "DataTable", "Th", "Td", "TableSearchHeader", "ListItem",
    // Session 6 — search, filter & settings patterns
    "SearchInput", "SettingsRow", "FilterBar", "BulkBar", "DangerZone",
    // Session 7 — dashboard & stat tiles
    "StatCard",
    // Q4 Session 3 — atomic components
    "IconBubble", "AccordionItem", "InlineEdit", "TimestampChip", "TokenBox", "AuthCard",
  ];

  test.each(canonical)("%s is exported as a React component type", (name) => {
    expect(DS[name]).toBeDefined();
    expect(isReactComponentType(DS[name])).toBe(true);
  });

  test.each(["Checkbox", "Toggle"])("%s imports forwardRef before initialization", (name) => {
    const source = readFileSync(resolve(ROOT, `src/design-system/components/${name}.jsx`), "utf8");
    expect(source.indexOf('import { forwardRef } from "react";')).toBeLessThan(
      source.indexOf(`const ${name} = forwardRef`),
    );
  });

  test("Field has no admin compatibility alias", () => {
    expect(Field).toBe(DS.Field);
    expect(Admin.AdminField).toBeUndefined();
  });
});

describe("admin barrel — purge guard (Q4 Session 1)", () => {
  const purgedAliases = [
    "AdminBtn", "AdminInput", "AdminTextarea", "AdminSelect", "AdminCheckbox", "AdminToggle",
    "AdminRadioGroup", "AdminCard", "AdminSection", "AdminModal", "AdminAlert", "AdminSpinner",
    "AdminSkeleton", "AdminProgress", "AdminEmptyState", "AdminBadge", "AdminChip",
    "AdminAvatar", "AdminTabs", "AdminBreadcrumbs", "AdminPagination", "AdminTooltip",
    "AdminDataTable", "AdminTh", "AdminTd", "AdminTableSearchHeader", "AdminListItem",
    "AdminSearchInput", "AdminSettingsRow", "AdminFilterBar", "AdminBulkBar", "AdminDangerZone",
    "AdminStatCard",
  ];

  test.each(purgedAliases)("%s is no longer exported from the admin barrel", (name) => {
    expect(Admin[name]).toBeUndefined();
  });

  test("admin barrel still exports non-alias shell components", () => {
    expect(Admin.AdminShell).toBeDefined();
    expect(Admin.AdminPage).toBeDefined();
    expect(Admin.AdminSidebar).toBeDefined();
    expect(Admin.AdminPlayCard).toBeDefined();
    expect(Admin.AdminFolderCard).toBeDefined();
    expect(Admin.AdminSectionRow).toBeDefined();
  });
});
