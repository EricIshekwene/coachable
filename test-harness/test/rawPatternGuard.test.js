import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

function read(relPath) {
  return readFileSync(resolve(__dirname, "../..", relPath), "utf-8");
}

describe("Raw pattern guard", () => {
  it("PlayCard.jsx has no raw divider (style height 1)", () => {
    expect(read("src/components/PlayCard.jsx")).not.toContain("style={{ height: 1 }}");
  });
  it("FolderCard.jsx has no raw divider (style height 1)", () => {
    expect(read("src/components/FolderCard.jsx")).not.toContain("style={{ height: 1 }}");
  });
  it("PlayEdit.jsx has no raw fixed-inset exit overlay", () => {
    expect(read("src/pages/app/PlayEdit.jsx")).not.toContain("fixed inset-0 z-50");
  });
  it("DemoVideos.jsx has no raw empty state div (py-12 text-center)", () => {
    expect(read("src/pages/app/DemoVideos.jsx")).not.toMatch(/py-12 text-center/);
  });
});
