import { useMemo, useState } from "react";

const SUPPORTED_FIELD_TYPES = ["Rugby", "Soccer", "Football", "Lacrosse", "Basketball"];

export function resolveFieldTypeFromSport(sport) {
  const normalizedSport = String(sport ?? "").trim().toLowerCase();
  if (normalizedSport === "soccer") return "Soccer";
  if (normalizedSport === "football") return "Football";
  if (normalizedSport === "lacrosse") return "Lacrosse";
  if (normalizedSport === "basketball") return "Basketball";
  return "Rugby";
}

/** Default values for all advanced settings (pitch, players, ball, export, animation, logging). */
export function createDefaultAdvancedSettings(fieldType = "Rugby") {
  const resolvedFieldType = SUPPORTED_FIELD_TYPES.includes(fieldType) ? fieldType : "Rugby";
  return {
    pitch: {
      fieldType: resolvedFieldType,
      fieldOpacity: 100,
      showMarkings: true,
      pitchSize: "Full Field",
      pitchColor: "#4FA85D",
    },
    players: {
      baseSizePx: 30,
    },
    ball: {
      sizePercent: 100,
      coneSizePercent: 70,
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
