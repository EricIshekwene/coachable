import { useMemo, useState } from "react";

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
  },
};

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
