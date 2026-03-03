import { useMemo, useState } from "react";

/** Default values for all advanced settings (pitch, players, ball, export, animation, logging). */
export const DEFAULT_ADVANCED_SETTINGS = {
  pitch: {
    showMarkings: true,
    pitchSize: "Full Field",
    pitchColor: "#4FA85D",
  },
  players: {
    baseSizePx: 30,
  },
  ball: {
    sizePercent: 100,
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

/**
 * Manages advanced settings state and provides scoped logging utility.
 * @returns {Object} Settings state, visibility toggle, logging config, and logEvent function.
 */
export function useAdvancedSettings() {
  const [advancedSettings, setAdvancedSettings] = useState(DEFAULT_ADVANCED_SETTINGS);
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
