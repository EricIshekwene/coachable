import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourcePath = "C:/Users/ericl/Downloads/football-presets-2026-05-18.json";
const outputPath = path.join(rootDir, "football-presets-all-formations.json");

const sourceBundle = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const templatePreset =
  sourceBundle.presets.find((preset) => preset.name === "Spread" && preset.playData?.schemaVersion === "play-export-v3") ||
  sourceBundle.presets.find((preset) => preset.playData?.schemaVersion === "play-export-v3") ||
  sourceBundle.presets[0];

if (!templatePreset?.playData?.play) {
  throw new Error("Could not find a valid football preset template in the source bundle.");
}

const basePlayData = templatePreset.playData;
const basePlay = basePlayData.play;
const color = basePlay.settings?.allPlayersDisplay?.color || "#ef4444";
const baseCamera = basePlay.canvas?.camera || { x: 0, y: 0, zoom: 2.3 };

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function p(x, y, number) {
  return { x, y, number };
}

const OL = [
  p(-60, 0, "LT"),
  p(-30, 0, "LG"),
  p(0, 0, "C"),
  p(30, 0, "RG"),
  p(60, 0, "RT"),
];

const FORMATIONS = [
  {
    name: "Spread",
    camera: { x: 0, y: 0, zoom: 2.4 },
    players: [
      ...OL,
      p(0, 34, "QB"),
      p(0, 58, "RB"),
      p(-230, 15, "WR"),
      p(-190, 34, "WR"),
      p(190, 34, "WR"),
      p(230, 15, "WR"),
    ],
  },
  {
    name: "Doubles",
    camera: { x: 0, y: 0, zoom: 2.35 },
    players: [
      ...OL,
      p(0, 34, "QB"),
      p(0, 62, "RB"),
      p(-220, 15, "WR"),
      p(-175, 34, "WR"),
      p(175, 34, "WR"),
      p(220, 15, "WR"),
    ],
  },
  {
    name: "Trips Right",
    camera: { x: 0, y: 0, zoom: 2.25 },
    players: [
      ...OL,
      p(0, 34, "QB"),
      p(0, 62, "RB"),
      p(-220, 15, "WR"),
      p(150, 34, "WR"),
      p(195, 18, "WR"),
      p(235, 42, "WR"),
    ],
  },
  {
    name: "Trips Left",
    camera: { x: 0, y: 0, zoom: 2.25 },
    players: [
      ...OL,
      p(0, 34, "QB"),
      p(0, 62, "RB"),
      p(220, 15, "WR"),
      p(-150, 34, "WR"),
      p(-195, 18, "WR"),
      p(-235, 42, "WR"),
    ],
  },
  {
    name: "Bunch Right",
    camera: { x: 0, y: 0, zoom: 2.1 },
    players: [
      ...OL,
      p(0, 34, "QB"),
      p(0, 62, "RB"),
      p(-220, 15, "WR"),
      p(150, 24, "WR"),
      p(185, 36, "WR"),
      p(170, 6, "WR"),
    ],
  },
  {
    name: "Bunch Left",
    camera: { x: 0, y: 0, zoom: 2.1 },
    players: [
      ...OL,
      p(0, 34, "QB"),
      p(0, 62, "RB"),
      p(220, 15, "WR"),
      p(-150, 24, "WR"),
      p(-185, 36, "WR"),
      p(-170, 6, "WR"),
    ],
  },
  {
    name: "Empty",
    camera: { x: 0, y: 0, zoom: 2.35 },
    players: [
      ...OL,
      p(0, 34, "QB"),
      p(-235, 15, "WR"),
      p(-180, 34, "WR"),
      p(0, 62, "WR"),
      p(180, 34, "WR"),
      p(235, 15, "WR"),
    ],
  },
  {
    name: "Shotgun",
    camera: { x: 0, y: 0, zoom: 2.3 },
    players: [
      ...OL,
      p(0, 48, "QB"),
      p(-18, 88, "RB"),
      p(-220, 15, "WR"),
      p(220, 15, "WR"),
      p(90, 0, "TE"),
      p(-170, 34, "WR"),
    ],
  },
  {
    name: "Shotgun Doubles",
    camera: { x: 0, y: 0, zoom: 2.35 },
    players: [
      ...OL,
      p(0, 48, "QB"),
      p(-15, 88, "RB"),
      p(-220, 15, "WR"),
      p(-175, 34, "WR"),
      p(175, 34, "WR"),
      p(220, 15, "WR"),
    ],
  },
  {
    name: "Shotgun Trips Right",
    camera: { x: 0, y: 0, zoom: 2.25 },
    players: [
      ...OL,
      p(0, 48, "QB"),
      p(-18, 88, "RB"),
      p(-220, 15, "WR"),
      p(150, 34, "WR"),
      p(195, 18, "WR"),
      p(235, 42, "WR"),
    ],
  },
  {
    name: "Shotgun Trips Left",
    camera: { x: 0, y: 0, zoom: 2.25 },
    players: [
      ...OL,
      p(0, 48, "QB"),
      p(-18, 88, "RB"),
      p(220, 15, "WR"),
      p(-150, 34, "WR"),
      p(-195, 18, "WR"),
      p(-235, 42, "WR"),
    ],
  },
  {
    name: "Shotgun Bunch Right",
    camera: { x: 0, y: 0, zoom: 2.1 },
    players: [
      ...OL,
      p(0, 48, "QB"),
      p(-18, 88, "RB"),
      p(-220, 15, "WR"),
      p(150, 24, "WR"),
      p(185, 36, "WR"),
      p(170, 6, "WR"),
    ],
  },
  {
    name: "Shotgun Bunch Left",
    camera: { x: 0, y: 0, zoom: 2.1 },
    players: [
      ...OL,
      p(0, 48, "QB"),
      p(-18, 88, "RB"),
      p(220, 15, "WR"),
      p(-150, 24, "WR"),
      p(-185, 36, "WR"),
      p(-170, 6, "WR"),
    ],
  },
  {
    name: "Shotgun Empty",
    camera: { x: 0, y: 0, zoom: 2.35 },
    players: [
      ...OL,
      p(0, 48, "QB"),
      p(-235, 15, "WR"),
      p(-180, 34, "WR"),
      p(0, 78, "WR"),
      p(180, 34, "WR"),
      p(235, 15, "WR"),
    ],
  },
  {
    name: "Pistol",
    camera: { x: 0, y: 0, zoom: 2.15 },
    players: [
      ...OL,
      p(0, 28, "QB"),
      p(0, 72, "RB"),
      p(-220, 15, "WR"),
      p(220, 15, "WR"),
      p(90, 0, "TE"),
      p(-170, 34, "WR"),
    ],
  },
  {
    name: "Pistol Spread",
    camera: { x: 0, y: 0, zoom: 2.25 },
    players: [
      ...OL,
      p(0, 28, "QB"),
      p(0, 72, "RB"),
      p(-220, 15, "WR"),
      p(-180, 34, "WR"),
      p(180, 34, "WR"),
      p(220, 15, "WR"),
    ],
  },
  {
    name: "Pistol Strong",
    camera: { x: 0, y: 0, zoom: 2.1 },
    players: [
      ...OL,
      p(0, 28, "QB"),
      p(12, 72, "RB"),
      p(-220, 15, "WR"),
      p(220, 15, "WR"),
      p(90, 0, "TE"),
      p(135, 24, "H"),
    ],
  },
  {
    name: "Single Back",
    camera: { x: 0, y: 0, zoom: 2.15 },
    players: [
      ...OL,
      p(0, 24, "QB"),
      p(0, 76, "RB"),
      p(-220, 15, "WR"),
      p(220, 15, "WR"),
      p(90, 0, "TE"),
      p(-150, 34, "WR"),
    ],
  },
  {
    name: "Singleback Ace",
    camera: { x: 0, y: 0, zoom: 2.1 },
    players: [
      ...OL,
      p(0, 24, "QB"),
      p(0, 76, "RB"),
      p(-220, 15, "WR"),
      p(220, 15, "WR"),
      p(-90, 0, "TE"),
      p(90, 0, "TE"),
    ],
  },
  {
    name: "Singleback Doubles",
    camera: { x: 0, y: 0, zoom: 2.25 },
    players: [
      ...OL,
      p(0, 24, "QB"),
      p(0, 76, "RB"),
      p(-220, 15, "WR"),
      p(-175, 34, "WR"),
      p(175, 34, "WR"),
      p(220, 15, "WR"),
    ],
  },
  {
    name: "Singleback Trips Right",
    camera: { x: 0, y: 0, zoom: 2.2 },
    players: [
      ...OL,
      p(0, 24, "QB"),
      p(0, 76, "RB"),
      p(-220, 15, "WR"),
      p(150, 34, "WR"),
      p(195, 18, "WR"),
      p(235, 42, "WR"),
    ],
  },
  {
    name: "Singleback Bunch Right",
    camera: { x: 0, y: 0, zoom: 2.05 },
    players: [
      ...OL,
      p(0, 24, "QB"),
      p(0, 76, "RB"),
      p(-220, 15, "WR"),
      p(150, 24, "WR"),
      p(185, 36, "WR"),
      p(170, 6, "WR"),
    ],
  },
  {
    name: "I Formation",
    camera: { x: 0, y: 0, zoom: 2.2 },
    players: [
      ...OL,
      p(0, 22, "QB"),
      p(0, 48, "FB"),
      p(0, 78, "RB"),
      p(-220, 15, "WR"),
      p(220, 15, "WR"),
      p(90, 0, "TE"),
    ],
  },
  {
    name: "I-Formation Pro",
    camera: { x: 0, y: 0, zoom: 2.1 },
    players: [
      ...OL,
      p(0, 20, "QB"),
      p(0, 44, "FB"),
      p(0, 72, "HB"),
      p(-220, 15, "WR"),
      p(220, 15, "WR"),
      p(90, 0, "TE"),
    ],
  },
  {
    name: "I-Formation Twins",
    camera: { x: 0, y: 0, zoom: 2.15 },
    players: [
      ...OL,
      p(0, 20, "QB"),
      p(0, 44, "FB"),
      p(0, 72, "HB"),
      p(-220, 15, "WR"),
      p(175, 34, "WR"),
      p(220, 15, "WR"),
    ],
  },
  {
    name: "Strong I",
    camera: { x: 0, y: 0, zoom: 2.05 },
    players: [
      ...OL,
      p(0, 20, "QB"),
      p(24, 42, "FB"),
      p(0, 72, "HB"),
      p(-220, 15, "WR"),
      p(220, 15, "WR"),
      p(90, 0, "TE"),
    ],
  },
  {
    name: "Weak I",
    camera: { x: 0, y: 0, zoom: 2.05 },
    players: [
      ...OL,
      p(0, 20, "QB"),
      p(-24, 42, "FB"),
      p(0, 72, "HB"),
      p(-220, 15, "WR"),
      p(220, 15, "WR"),
      p(90, 0, "TE"),
    ],
  },
  {
    name: "Pro Set",
    camera: { x: 0, y: 0, zoom: 2.1 },
    players: [
      ...OL,
      p(0, 22, "QB"),
      p(-26, 56, "FB"),
      p(26, 56, "HB"),
      p(-220, 15, "WR"),
      p(220, 15, "WR"),
      p(90, 0, "TE"),
    ],
  },
  {
    name: "Goal Line",
    camera: { x: 0, y: 0, zoom: 1.9 },
    players: [
      ...OL,
      p(-90, 0, "TE"),
      p(90, 0, "TE"),
      p(0, 18, "QB"),
      p(0, 42, "FB"),
      p(0, 68, "HB"),
      p(-165, 15, "WR"),
    ],
  },
  {
    name: "Wishbone",
    camera: { x: 0, y: 0, zoom: 2.0 },
    players: [
      ...OL,
      p(0, 18, "QB"),
      p(0, 44, "FB"),
      p(-38, 74, "HB"),
      p(38, 74, "HB"),
      p(-220, 15, "WR"),
      p(220, 15, "WR"),
    ],
  },
  {
    name: "Wing T",
    camera: { x: 0, y: 0, zoom: 2.0 },
    players: [
      ...OL,
      p(90, 0, "TE"),
      p(0, 18, "QB"),
      p(0, 54, "FB"),
      p(-88, 24, "WB"),
      p(88, 24, "WB"),
      p(-220, 15, "WR"),
    ],
  },
  {
    name: "Flexbone",
    camera: { x: 0, y: 0, zoom: 2.0 },
    players: [
      ...OL,
      p(0, 18, "QB"),
      p(0, 56, "BB"),
      p(-105, 28, "AB"),
      p(105, 28, "AB"),
      p(-220, 15, "WR"),
      p(220, 15, "WR"),
    ],
  },
];

function buildPlayData(formation) {
  const playData = clone(basePlayData);
  const playersById = {};
  const representedPlayerIds = [];
  const tracks = {};

  formation.players.forEach((player, index) => {
    const id = `player-${index + 1}`;
    playersById[id] = {
      x: player.x,
      y: player.y,
      id,
      name: "",
      color,
      number: player.number,
    };
    representedPlayerIds.push(id);
    tracks[id] = {
      keyframes: [
        {
          t: 0,
          x: player.x,
          y: player.y,
          r: 0,
        },
      ],
    };
  });

  const now = new Date().toISOString();
  playData.exportedAt = now;
  playData.schemaVersion = "play-export-v3";
  playData.play = {
    ...clone(basePlay),
    name: formation.name,
    meta: {
      ...(clone(basePlay.meta || {})),
      editorMode: "keyframe",
    },
    canvas: {
      ...clone(basePlay.canvas || {}),
      camera: formation.camera || baseCamera,
    },
    entities: {
      ...clone(basePlay.entities || {}),
      ball: null,
      ballsById: {},
      playersById,
      representedPlayerIds,
    },
    animation: {
      ...clone(basePlay.animation || {}),
      tracks,
      meta: {
        createdAt: now,
        updatedAt: now,
      },
    },
  };

  return playData;
}

const bundle = {
  schemaVersion: "sport-preset-bundle-v1",
  exportedAt: new Date().toISOString(),
  sport: "Football",
  presetCount: FORMATIONS.length,
  presets: FORMATIONS.map((formation, index) => ({
    id: null,
    name: formation.name,
    isHidden: false,
    sortOrder: index + 1,
    playData: buildPlayData(formation),
  })),
};

fs.writeFileSync(outputPath, JSON.stringify(bundle, null, 2));
console.log(`Wrote ${bundle.presetCount} presets to ${outputPath}`);
