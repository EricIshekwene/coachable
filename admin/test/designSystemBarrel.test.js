import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as DS from "../../src/design-system/components";
import * as Admin from "../../src/admin/components";
import {
  Alert, Avatar, Badge, Breadcrumbs, Button, Card, Checkbox, Chip, EmptyState,
  Input, Modal, Pagination, Progress, RadioGroup, Section, Select, Skeleton,
  Spinner, Tabs, Textarea, Toggle, Tooltip,
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
    "Button", "Input", "Textarea", "Select", "Checkbox", "Toggle", "RadioGroup",
    "Card", "Section", "Modal", "Alert", "Spinner", "Skeleton", "Progress",
    "EmptyState", "Badge", "Chip", "Avatar", "Tabs", "Breadcrumbs", "Pagination",
    "Tooltip", "PageShell", "Page", "PageHeader",
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
});

describe("admin compatibility barrel", () => {
  const aliases = [
    ["AdminBtn", Button], ["AdminInput", Input], ["AdminTextarea", Textarea],
    ["AdminSelect", Select], ["AdminCheckbox", Checkbox], ["AdminToggle", Toggle],
    ["AdminRadioGroup", RadioGroup], ["AdminCard", Card], ["AdminSection", Section],
    ["AdminModal", Modal], ["AdminAlert", Alert], ["AdminSpinner", Spinner],
    ["AdminSkeleton", Skeleton], ["AdminProgress", Progress],
    ["AdminEmptyState", EmptyState], ["AdminBadge", Badge], ["AdminChip", Chip],
    ["AdminAvatar", Avatar], ["AdminTabs", Tabs], ["AdminBreadcrumbs", Breadcrumbs],
    ["AdminPagination", Pagination], ["AdminTooltip", Tooltip],
  ];

  test.each(aliases)("%s is the canonical component reference", (name, canonical) => {
    expect(Admin[name]).toBe(canonical);
  });
});
