/**
 * Regression tests: selecting a preset on the Create Play page must not override
 * the editor mode (drawing vs keyframe) the user explicitly chose.
 *
 * Bug: sport-preset bundles bake in their own `play.meta.editorMode` (usually
 * "keyframe"). When such a preset was used to create a play, PlayEditPage reads
 * the saved `editorMode` first (`savedEditorMode ?? modeFromState`), so the
 * preset's baked value silently won — a play started in Drawing mode opened in
 * Keyframe mode. Presets should only supply object positioning.
 *
 * These tests mirror the two pieces of logic involved:
 *  1. PlayNew.handleCreate stamps the chosen mode onto the preset playData.
 *  2. PlayEditPage resolves the effective editor mode.
 */
import { describe, it, expect } from "vitest";

/** Mirrors the mode-stamping step in PlayNew.handleCreate. */
function stampChosenMode(presetPlayData, fieldType, editorMode) {
  const mode = fieldType === "Football" ? editorMode : "keyframe";
  let playData = presetPlayData ?? null;
  if (playData?.play) {
    playData = {
      ...playData,
      play: {
        ...playData.play,
        meta: { ...(playData.play.meta || {}), editorMode: mode },
      },
    };
  }
  return { playData, mode };
}

/** Mirrors PlayEditPage's effective-mode resolution. */
function resolveEditorMode(initialPlayData, modeFromState) {
  const savedEditorMode = initialPlayData?.play?.meta?.editorMode ?? null;
  return savedEditorMode ?? modeFromState ?? "keyframe";
}

/** Mirrors AdminPlaysPage.applyEditorModeToPreset. */
function applyEditorModeToPreset(playData, mode) {
  if (!playData?.play) return playData ?? null;
  return {
    ...playData,
    play: {
      ...playData.play,
      meta: { ...(playData.play.meta || {}), editorMode: mode },
    },
  };
}

/** Mirrors AdminPlayEditPage's effective-mode resolution (new vs existing play). */
function resolveAdminEditorMode({ isNew, initialPlayData, initialModeFromState }) {
  return isNew
    ? initialModeFromState
    : (initialPlayData?.play?.meta?.editorMode ?? initialModeFromState);
}

function makePreset() {
  return {
    play: {
      id: null,
      name: "Spread",
      meta: { appVersion: null, editorMode: "keyframe" },
      entities: { playersById: { "player-1": { id: "player-1", x: 10, y: 20 } } },
    },
  };
}

describe("preset editor mode does not override chosen creation mode", () => {
  it("stamps the chosen drawing mode over the preset's baked keyframe mode", () => {
    const { playData, mode } = stampChosenMode(makePreset(), "Football", "drawing");
    expect(mode).toBe("drawing");
    expect(playData.play.meta.editorMode).toBe("drawing");
    // Object positioning from the preset is preserved.
    expect(playData.play.entities.playersById["player-1"]).toEqual({ id: "player-1", x: 10, y: 20 });
  });

  it("a drawing-mode play created from a preset opens in drawing mode", () => {
    const { playData, mode } = stampChosenMode(makePreset(), "Football", "drawing");
    expect(resolveEditorMode(playData, mode)).toBe("drawing");
  });

  it("a keyframe-mode play created from a preset opens in keyframe mode", () => {
    const { playData, mode } = stampChosenMode(makePreset(), "Football", "keyframe");
    expect(playData.play.meta.editorMode).toBe("keyframe");
    expect(resolveEditorMode(playData, mode)).toBe("keyframe");
  });

  it("non-football sports always resolve to keyframe regardless of picker", () => {
    const { playData, mode } = stampChosenMode(makePreset(), "Soccer", "drawing");
    expect(mode).toBe("keyframe");
    expect(resolveEditorMode(playData, mode)).toBe("keyframe");
  });

  it("does not mutate the original preset playData", () => {
    const original = makePreset();
    stampChosenMode(original, "Football", "drawing");
    expect(original.play.meta.editorMode).toBe("keyframe");
  });

  it("without the fix the baked preset mode would win (documents the regression)", () => {
    const preset = makePreset(); // unstamped, editorMode: "keyframe"
    // User picked drawing (passed as modeFromState), but saved value wins.
    expect(resolveEditorMode(preset, "drawing")).toBe("keyframe");
  });
});

describe("admin: preset never overrides chosen mode on create or reopen", () => {
  it("stamps the chosen mode onto the football preset before navigating", () => {
    const stamped = applyEditorModeToPreset(makePreset(), "drawing");
    expect(stamped.play.meta.editorMode).toBe("drawing");
    // Positioning preserved.
    expect(stamped.play.entities.playersById["player-1"]).toEqual({ id: "player-1", x: 10, y: 20 });
  });

  it("new play opens in the picked mode (admin reads nav state, ignores preset)", () => {
    const stamped = applyEditorModeToPreset(makePreset(), "drawing");
    const mode = resolveAdminEditorMode({
      isNew: true,
      initialPlayData: stamped,
      initialModeFromState: "drawing",
    });
    expect(mode).toBe("drawing");
  });

  it("reopened play honors the stamped mode instead of the preset's baked keyframe", () => {
    // On reopen the play is no longer new, so the saved meta.editorMode is used.
    // With stamping, that saved value matches the user's original pick.
    const stamped = applyEditorModeToPreset(makePreset(), "drawing");
    const mode = resolveAdminEditorMode({
      isNew: false,
      initialPlayData: stamped,
      initialModeFromState: "keyframe", // nav state is gone on reopen
    });
    expect(mode).toBe("drawing");
  });

  it("regression: an unstamped preset reopens as keyframe and clobbers the pick", () => {
    const raw = makePreset(); // baked editorMode: "keyframe"
    const mode = resolveAdminEditorMode({
      isNew: false,
      initialPlayData: raw,
      initialModeFromState: "keyframe",
    });
    expect(mode).toBe("keyframe");
  });

  it("non-football preset path stamps keyframe", () => {
    const stamped = applyEditorModeToPreset(makePreset(), "keyframe");
    expect(stamped.play.meta.editorMode).toBe("keyframe");
  });

  it("handles a missing/blank preset without throwing", () => {
    expect(applyEditorModeToPreset(null, "drawing")).toBeNull();
    expect(applyEditorModeToPreset(undefined, "drawing")).toBeNull();
    expect(applyEditorModeToPreset({}, "drawing")).toEqual({});
  });
});
