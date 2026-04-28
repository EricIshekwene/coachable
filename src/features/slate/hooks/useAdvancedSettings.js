import { useMemo, useState } from "react";

export const SUPPORTED_FIELD_TYPES = ["Rugby", "Soccer", "Football", "Lacrosse", "Womens Lacrosse", "Basketball", "Field Hockey", "Ice Hockey", "Blank"];

export function resolveFieldTypeFromSport(sport) {
  const normalizedSport = String(sport ?? "").trim().toLowerCase();
  if (normalizedSport === "soccer") return "Soccer";
  if (normalizedSport === "football") return "Football";
  if (normalizedSport === "womens lacrosse" || normalizedSport === "women's lacrosse") return "Womens Lacrosse";
  if (normalizedSport === "lacrosse") return "Lacrosse";
  if (normalizedSport === "basketball") return "Basketball";
  if (normalizedSport === "field hockey") return "Field Hockey";
  if (normalizedSport === "ice hockey") return "Ice Hockey";
  if (normalizedSport === "blank" || normalizedSport === "" || normalizedSport === "other") return "Blank";
  return "Rugby";
}

/** Per-sport default overrides for player/ball/cone sizes, pitch color, and field rotation. */
export const SPORT_DEFAULTS = {
  Rugby: { baseSizePx: 23, sizePercent: 75 },
  Football: { baseSizePx: 16, sizePercent: 70, coneSizePercent: 65, usePositionLabels: true },
  Lacrosse: { sizePercent: 65, defaultFieldRotation: 90, usePositionLabels: true },
  "Womens Lacrosse": { sizePercent: 65, defaultFieldRotation: 90, usePositionLabels: true },
  Soccer: { baseSizePx: 26, sizePercent: 65, usePositionLabels: true },
  "Field Hockey": { baseSizePx: 17, sizePercent: 50, usePositionLabels: true },
  "Ice Hockey": { baseSizePx: 23, sizePercent: 65, usePositionLabels: true, pitchColor: "#ECF8FE" },
  Basketball: { sizePercent: 80, pitchColor: "#D8C3A5", defaultFieldRotation: 90 },
  Blank: { pitchColor: "#4FA85D", sizePercent: 75 },
};

/**
 * Common position abbreviations per sport, organized by category
 * for quick-select in the player edit panel.
 */
export const SPORT_POSITION_PRESETS = {
  Football: [
    { category: "Offense", positions: ["QB", "RB", "FB", "WR", "TE"] },
    { category: "O-Line", positions: ["LT", "LG", "C", "RG", "RT"] },
    { category: "Defense", positions: ["DE", "DT", "NT"] },
    { category: "Linebackers", positions: ["OLB", "MLB", "ILB"] },
    { category: "Secondary", positions: ["CB", "SS", "FS"] },
    { category: "Special Teams", positions: ["K", "P", "KR", "PR"] },
  ],
  Soccer: [
    { category: "Goalkeeper", positions: ["GK"] },
    { category: "Defenders", positions: ["CB", "LB", "RB", "LWB", "RWB"] },
    { category: "Midfield", positions: ["CDM", "CM", "CAM", "LM", "RM"] },
    { category: "Forwards", positions: ["LW", "RW", "CF", "ST"] },
  ],
  Lacrosse: [
    { category: "Attack", positions: ["A", "X", "C", "W"] },
    { category: "Midfield", positions: ["M", "LSM", "FOGO"] },
    { category: "Defense", positions: ["D", "G"] },
  ],
  "Womens Lacrosse": [
    { category: "Attack", positions: ["A", "X", "C", "W"] },
    { category: "Midfield", positions: ["M", "LSM"] },
    { category: "Defense", positions: ["D", "G"] },
  ],
  "Field Hockey": [
    { category: "Goalkeeper", positions: ["GK"] },
    { category: "Defenders", positions: ["SW", "LB", "CB", "RB"] },
    { category: "Midfield", positions: ["LH", "CH", "RH"] },
    { category: "Forwards", positions: ["LW", "IF", "CF", "RW"] },
  ],
  "Ice Hockey": [
    { category: "Goalie", positions: ["G"] },
    { category: "Defense", positions: ["LD", "RD"] },
    { category: "Forwards", positions: ["LW", "C", "RW"] },
  ],
};

/** Default values for all advanced settings (pitch, players, ball, export, animation, logging). */
export function createDefaultAdvancedSettings(fieldType = "Rugby") {
  const resolvedFieldType = SUPPORTED_FIELD_TYPES.includes(fieldType) ? fieldType : (fieldType ? "Rugby" : "Blank");
  const sportDefaults = SPORT_DEFAULTS[resolvedFieldType] || {};
  return {
    pitch: {
      fieldType: resolvedFieldType,
      fieldOpacity: 100,
      showMarkings: true,
      pitchSize: "Full Field",
      pitchColor: sportDefaults.pitchColor ?? "#4FA85D",
    },
    players: {
      baseSizePx: sportDefaults.baseSizePx ?? 30,
    },
    ball: {
      sizePercent: sportDefaults.sizePercent ?? 100,
      coneSizePercent: sportDefaults.coneSizePercent ?? 70,
    },
    exportVideo: {
      videoQuality: "1080p",
      watermark: true,
      includeMetadata: true,
    },
    animation: {
      playOnLoad: true,
    },
    logging: {
      slate: false,
      controlPill: false,
      canvas: false,
      sidebar: false,
      drawing: false,
    },
  };
}

export const DEFAULT_ADVANCED_SETTINGS = createDefaultAdvancedSettings();

/**
 * Manages advanced settings state and provides scoped logging utility.
 * @returns {Object} Settings state, visibility toggle, logging config, and logEvent function.
 */
export function useAdvancedSettings(defaultFieldType = "Rugby") {
  const [advancedSettings, setAdvancedSettings] = useState(() =>
    createDefaultAdvancedSettings(defaultFieldType)
  );
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const logging = useMemo(() => advancedSettings?.logging ?? {}, [advancedSettings]);

  const logEvent = (scope, action, payload) => {
    if (!logging?.[scope]) return;
    const stamp = new Date().toISOString();
    if (payload !== undefined) {
      console.log(`[${stamp}] ${scope}: ${action}`, payload);
      return;
    }
    console.log(`[${stamp}] ${scope}: ${action}`);
  };

  return {
    advancedSettings,
    setAdvancedSettings,
    showAdvancedSettings,
    setShowAdvancedSettings,
    logging,
    logEvent,
  };
}

export default useAdvancedSettings;
