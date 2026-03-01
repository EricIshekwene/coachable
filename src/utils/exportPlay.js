import { serializeAnimation } from "../animation";

export const EXPORT_SCHEMA_VERSION = "play-export-v2";

const sanitizeFilename = (name) => {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return "play";
  const lower = trimmed.toLowerCase();
  const hyphenated = lower.replace(/\s+/g, "-");
  const cleaned = hyphenated.replace(/[^a-z0-9-_]+/g, "");
  const collapsed = cleaned.replace(/-+/g, "-").replace(/^[-_]+|[-_]+$/g, "");
  return collapsed || "play";
};

export const buildPlayExport = ({
  playName,
  playId = null,
  appVersion = null,
  advancedSettings,
  allPlayersDisplay,
  currentPlayerColor,
  camera,
  fieldRotation,
  playersById,
  representedPlayerIds,
  ball,
  animationData,
  playback,
  coordinateSystem,
} = {}) => {
  const animationJson = serializeAnimation(animationData, { pretty: false });
  const animation = JSON.parse(animationJson);

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    play: {
      name: playName ?? "",
      id: playId ?? null,
      settings: {
        advancedSettings: advancedSettings ?? null,
        allPlayersDisplay: allPlayersDisplay ?? null,
        currentPlayerColor: currentPlayerColor ?? null,
      },
      canvas: {
        camera: camera ?? { x: 0, y: 0, zoom: 1 },
        fieldRotation: fieldRotation ?? 0,
        coordinateSystem: coordinateSystem ?? {
          origin: "center",
          units: "px",
          notes: "World coordinates are centered; +x right, +y down.",
        },
      },
      entities: {
        playersById: playersById ?? {},
        representedPlayerIds: representedPlayerIds ?? [],
        ball: ball ?? null,
      },
      animation,
      playback: playback ?? null,
      meta: {
        appVersion: appVersion ?? null,
      },
    },
  };
};

export const downloadPlayExport = (playExport, playName) => {
  if (!playExport) return;
  const filename = `${sanitizeFilename(playName)}.json`;
  const json = JSON.stringify(playExport, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
