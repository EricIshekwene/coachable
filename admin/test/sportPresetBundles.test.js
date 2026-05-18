import { describe, it, expect } from "vitest";
import {
  SPORT_PRESET_BUNDLE_SCHEMA_VERSION,
  buildSportPresetBundle,
  parseSportPresetBundle,
  supportsSportPresetBundles,
} from "../../src/utils/sportPresetBundles.js";

describe("sportPresetBundles", () => {
  it("limits bundle tools to football and soccer", () => {
    expect(supportsSportPresetBundles("Football")).toBe(true);
    expect(supportsSportPresetBundles("soccer")).toBe(true);
    expect(supportsSportPresetBundles("Rugby")).toBe(false);
  });

  it("builds a stable export bundle shape", () => {
    const bundle = buildSportPresetBundle("Football", [
      {
        id: "preset-1",
        name: "Spread",
        isHidden: false,
        sortOrder: 3,
        playData: { play: { name: "Spread" } },
      },
    ]);

    expect(bundle.schemaVersion).toBe(SPORT_PRESET_BUNDLE_SCHEMA_VERSION);
    expect(bundle.sport).toBe("Football");
    expect(bundle.presetCount).toBe(1);
    expect(bundle.presets[0]).toEqual({
      id: "preset-1",
      name: "Spread",
      isHidden: false,
      sortOrder: 3,
      playData: { play: { name: "Spread" } },
    });
  });

  it("parses the exported bundle format", () => {
    const parsed = parseSportPresetBundle(JSON.stringify({
      schemaVersion: SPORT_PRESET_BUNDLE_SCHEMA_VERSION,
      sport: "Soccer",
      presets: [
        {
          name: "4-3-3",
          isHidden: false,
          playData: { play: { name: "4-3-3" } },
        },
      ],
    }), "Soccer");

    expect(parsed.sport).toBe("Soccer");
    expect(parsed.presets).toEqual([
      {
        name: "4-3-3",
        isHidden: false,
        playData: { play: { name: "4-3-3" } },
      },
    ]);
  });

  it("accepts a plain array of generated preset entries", () => {
    const parsed = parseSportPresetBundle(JSON.stringify([
      {
        name: "Trips Right",
        playData: { play: { name: "Trips Right" } },
      },
      {
        play: { name: "I-Formation" },
      },
    ]), "Football");

    expect(parsed.sport).toBe("Football");
    expect(parsed.presets).toEqual([
      {
        name: "Trips Right",
        isHidden: true,
        playData: { play: { name: "Trips Right" } },
      },
      {
        name: "I-Formation",
        isHidden: true,
        playData: { play: { name: "I-Formation" } },
      },
    ]);
  });

  it("rejects files for the wrong sport", () => {
    expect(() => parseSportPresetBundle(JSON.stringify({
      sport: "Soccer",
      presets: [{ name: "4-3-3", playData: { play: { name: "4-3-3" } } }],
    }), "Football")).toThrow("This file is for Soccer, not Football.");
  });
});
