export const SPORT_PRESET_BUNDLE_SCHEMA_VERSION = "sport-preset-bundle-v1";

const SPORT_PRESET_BUNDLE_SPORTS = new Set(["football", "soccer"]);

function normalizeSportKey(sport) {
  return String(sport || "").trim().toLowerCase();
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function derivePresetName(source, playData, index) {
  if (typeof source?.name === "string" && source.name.trim()) return source.name.trim();
  if (typeof playData?.play?.name === "string" && playData.play.name.trim()) return playData.play.name.trim();
  return `Imported Preset ${index + 1}`;
}

function deriveHiddenState(source) {
  if (typeof source?.isHidden === "boolean") return source.isHidden;
  if (typeof source?.published === "boolean") return !source.published;
  if (typeof source?.visible === "boolean") return !source.visible;
  return true;
}

function normalizeImportedPreset(entry, index) {
  const rawPlayData = entry?.playData ?? entry?.play_data ?? entry?.slateData ?? entry;
  if (!isPlainObject(rawPlayData)) {
    throw new Error(`Preset ${index + 1} is missing a valid playData object.`);
  }
  return {
    name: derivePresetName(entry, rawPlayData, index),
    playData: rawPlayData,
    isHidden: deriveHiddenState(entry),
  };
}

export function supportsSportPresetBundles(sport) {
  return SPORT_PRESET_BUNDLE_SPORTS.has(normalizeSportKey(sport));
}

export function buildSportPresetBundle(sport, presets = []) {
  const safeSport = String(sport || "").trim();
  const safePresets = Array.isArray(presets) ? presets : [];
  return {
    schemaVersion: SPORT_PRESET_BUNDLE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    sport: safeSport,
    presetCount: safePresets.length,
    presets: safePresets.map((preset, index) => ({
      id: preset?.id ?? null,
      name: derivePresetName(preset, preset?.playData, index),
      isHidden: typeof preset?.isHidden === "boolean" ? preset.isHidden : true,
      sortOrder: Number.isFinite(preset?.sortOrder) ? preset.sortOrder : index,
      playData: preset?.playData ?? null,
    })),
  };
}

export function parseSportPresetBundle(jsonText, expectedSport = "") {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  let importedSport = "";
  let rawPresets = [];

  if (Array.isArray(parsed)) {
    rawPresets = parsed;
  } else if (isPlainObject(parsed) && Array.isArray(parsed.presets)) {
    rawPresets = parsed.presets;
    importedSport = typeof parsed.sport === "string" ? parsed.sport.trim() : "";
  } else {
    throw new Error("Expected a preset bundle with a presets array.");
  }

  if (!rawPresets.length) {
    throw new Error("The selected file does not contain any presets.");
  }

  if (expectedSport && importedSport && normalizeSportKey(expectedSport) !== normalizeSportKey(importedSport)) {
    throw new Error(`This file is for ${importedSport}, not ${expectedSport}.`);
  }

  return {
    sport: importedSport || String(expectedSport || "").trim(),
    presets: rawPresets.map((entry, index) => normalizeImportedPreset(entry, index)),
  };
}
