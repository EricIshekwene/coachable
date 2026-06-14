import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { glob } from "glob";

describe("Alias purge guard", () => {
  it("no Admin* DS alias imports outside admin/components/index.js", async () => {
    const files = await glob("src/**/*.jsx", { cwd: resolve(__dirname, "../..") });
    const aliasPattern = /\bAdmin(Btn|Input|Textarea|Select|Checkbox|RadioGroup|Toggle|Card|Section|Modal|Alert|Spinner|Skeleton|Progress|EmptyState|Badge|Chip|Avatar|Tabs|Breadcrumbs|Pagination|Tooltip|DataTable|Th|Td|TableSearchHeader|ListItem|SearchInput|SettingsRow|FilterBar|BulkBar|DangerZone|StatCard)\b/;
    const violations = [];
    for (const file of files) {
      if (file.replace(/\\/g, "/").includes("admin/components/index")) continue;
      const content = readFileSync(resolve(__dirname, "../..", file), "utf-8");
      if (aliasPattern.test(content)) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });

  it("no ConfirmModal import (use ConfirmDialog from DS instead)", async () => {
    const files = await glob("src/**/*.jsx", { cwd: resolve(__dirname, "../..") });
    const violations = [];
    for (const file of files) {
      const normalized = file.replace(/\\/g, "/");
      if (normalized.includes("subcomponents/ConfirmModal")) continue;
      const content = readFileSync(resolve(__dirname, "../..", file), "utf-8");
      if (/import ConfirmModal/.test(content)) violations.push(file);
    }
    expect(violations).toEqual([]);
  });
});
