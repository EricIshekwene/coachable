import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourcePath = "C:/Users/ericl/Downloads/soccer-presets-2026-05-18.json";
const outputPath = path.join(rootDir, "soccer-presets-all-formations.json");

const sourceBundle = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const templatePreset = sourceBundle.presets.find((preset) => preset.name === "4-4-2") || sourceBundle.presets[0];

if (!templatePreset?.playData?.play) {
  throw new Error("Could not find a valid soccer preset template in the source bundle.");
}

const basePlayData = templatePreset.playData;
const basePlay = basePlayData.play;
const ball = basePlay.entities.ball;
const color = basePlay.settings.allPlayersDisplay.color;
const gkY = basePlay.entities.playersById["player-11"]?.y ?? 442.0454477278655;

const DEF_X = {
  2: [-110, 110],
  3: [-180, 0, 180],
  4: [-255, -110, 110, 255],
  5: [-285, -150, 0, 150, 285],
};

const MID_X = {
  1: [0],
  2: [-110, 110],
  3: [-180, 0, 180],
  4: [-255, -85, 85, 255],
  5: [-285, -140, 0, 140, 285],
  6: [-285, -170, -55, 55, 170, 285],
};

const ATT_X = {
  1: [0],
  2: [-50, 50],
  3: [-255, 0, 255],
  4: [-285, -95, 95, 285],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeLine(roleType, y, roles) {
  return { roleType, y, roles };
}

const FORMATIONS = [
  {
    name: "4-4-2",
    lines: [
      makeLine("def", 350, ["LB", "CB", "CB", "RB"]),
      makeLine("mid", 210, ["LM", "CM", "CM", "RM"]),
      makeLine("att", 65, ["ST", "ST"]),
    ],
    camera: { x: 0, y: -310.9090841703178, zoom: 1 },
  },
  {
    name: "4-4-1-1",
    lines: [
      makeLine("def", 350, ["LB", "CB", "CB", "RB"]),
      makeLine("mid", 220, ["LM", "CM", "CM", "RM"]),
      makeLine("att", 115, ["CF"]),
      makeLine("att", 45, ["ST"]),
    ],
  },
  {
    name: "4-1-2-1-2",
    lines: [
      makeLine("def", 350, ["LB", "CB", "CB", "RB"]),
      makeLine("mid", 280, ["CDM"]),
      makeLine("mid", 210, ["LCM", "RCM"]),
      makeLine("mid", 140, ["CAM"]),
      makeLine("att", 65, ["ST", "ST"]),
    ],
  },
  {
    name: "4-2-3-1",
    lines: [
      makeLine("def", 350, ["LB", "CB", "CB", "RB"]),
      makeLine("mid", 275, ["CDM", "CDM"]),
      makeLine("mid", 170, ["LW", "CAM", "RW"]),
      makeLine("att", 65, ["ST"]),
    ],
  },
  {
    name: "4-3-3",
    lines: [
      makeLine("def", 350, ["LB", "CB", "CB", "RB"]),
      makeLine("mid", 210, ["LCM", "CM", "RCM"]),
      makeLine("att", 90, ["LW", "ST", "RW"]),
    ],
    camera: { x: 0, y: -209.90908417031778, zoom: 0.6000000000000001 },
  },
  {
    name: "4-2-2-2",
    lines: [
      makeLine("def", 350, ["LB", "CB", "CB", "RB"]),
      makeLine("mid", 280, ["CDM", "CDM"]),
      makeLine("mid", 165, ["LAM", "RAM"]),
      makeLine("att", 65, ["ST", "ST"]),
    ],
  },
  {
    name: "4-2-4",
    lines: [
      makeLine("def", 350, ["LB", "CB", "CB", "RB"]),
      makeLine("mid", 225, ["CM", "CM"]),
      makeLine("att", 80, ["LW", "ST", "ST", "RW"]),
    ],
    camera: { x: 0, y: -260, zoom: 0.88 },
  },
  {
    name: "4-5-1",
    lines: [
      makeLine("def", 350, ["LB", "CB", "CB", "RB"]),
      makeLine("mid", 200, ["LM", "LCM", "CM", "RCM", "RM"]),
      makeLine("att", 65, ["ST"]),
    ],
  },
  {
    name: "4-1-4-1",
    lines: [
      makeLine("def", 350, ["LB", "CB", "CB", "RB"]),
      makeLine("mid", 285, ["CDM"]),
      makeLine("mid", 185, ["LM", "LCM", "RCM", "RM"]),
      makeLine("att", 65, ["ST"]),
    ],
  },
  {
    name: "4-3-2-1",
    lines: [
      makeLine("def", 350, ["LB", "CB", "CB", "RB"]),
      makeLine("mid", 225, ["LCM", "CM", "RCM"]),
      makeLine("mid", 145, ["LAM", "RAM"]),
      makeLine("att", 55, ["ST"]),
    ],
  },
  {
    name: "4-3-1-2",
    lines: [
      makeLine("def", 350, ["LB", "CB", "CB", "RB"]),
      makeLine("mid", 225, ["LCM", "CM", "RCM"]),
      makeLine("mid", 140, ["CAM"]),
      makeLine("att", 65, ["ST", "ST"]),
    ],
  },
  {
    name: "4-1-3-2",
    lines: [
      makeLine("def", 350, ["LB", "CB", "CB", "RB"]),
      makeLine("mid", 285, ["CDM"]),
      makeLine("mid", 185, ["LM", "CAM", "RM"]),
      makeLine("att", 65, ["ST", "ST"]),
    ],
  },
  {
    name: "4-1-2-3",
    lines: [
      makeLine("def", 350, ["LB", "CB", "CB", "RB"]),
      makeLine("mid", 285, ["CDM"]),
      makeLine("mid", 205, ["LCM", "RCM"]),
      makeLine("att", 90, ["LW", "ST", "RW"]),
    ],
  },
  {
    name: "3-5-2",
    lines: [
      makeLine("def", 355, ["LCB", "CB", "RCB"]),
      makeLine("mid", 245, ["LWB", "LCM", "CM", "RCM", "RWB"]),
      makeLine("att", 75, ["ST", "ST"]),
    ],
    camera: { x: 0, y: -260, zoom: 0.88 },
  },
  {
    name: "3-4-3",
    lines: [
      makeLine("def", 355, ["LCB", "CB", "RCB"]),
      makeLine("mid", 235, ["LM", "CM", "CM", "RM"]),
      makeLine("att", 90, ["LW", "ST", "RW"]),
    ],
    camera: { x: 0, y: -245, zoom: 0.85 },
  },
  {
    name: "3-4-2-1",
    lines: [
      makeLine("def", 355, ["LCB", "CB", "RCB"]),
      makeLine("mid", 240, ["LWB", "CM", "CM", "RWB"]),
      makeLine("mid", 145, ["LAM", "RAM"]),
      makeLine("att", 55, ["ST"]),
    ],
    camera: { x: 0, y: -250, zoom: 0.85 },
  },
  {
    name: "3-4-1-2",
    lines: [
      makeLine("def", 355, ["LCB", "CB", "RCB"]),
      makeLine("mid", 240, ["LWB", "CM", "CM", "RWB"]),
      makeLine("mid", 145, ["CAM"]),
      makeLine("att", 65, ["ST", "ST"]),
    ],
    camera: { x: 0, y: -250, zoom: 0.85 },
  },
  {
    name: "3-1-4-2",
    lines: [
      makeLine("def", 355, ["LCB", "CB", "RCB"]),
      makeLine("mid", 290, ["CDM"]),
      makeLine("mid", 185, ["LM", "LCM", "RCM", "RM"]),
      makeLine("att", 70, ["ST", "ST"]),
    ],
    camera: { x: 0, y: -255, zoom: 0.85 },
  },
  {
    name: "3-6-1",
    lines: [
      makeLine("def", 355, ["LCB", "CB", "RCB"]),
      makeLine("mid", 225, ["LWB", "LCM", "CAM", "CM", "RCM", "RWB"]),
      makeLine("att", 65, ["ST"]),
    ],
    camera: { x: 0, y: -245, zoom: 0.82 },
  },
  {
    name: "3-2-4-1",
    lines: [
      makeLine("def", 355, ["LCB", "CB", "RCB"]),
      makeLine("mid", 290, ["CDM", "CDM"]),
      makeLine("mid", 180, ["LW", "LAM", "RAM", "RW"]),
      makeLine("att", 55, ["ST"]),
    ],
    camera: { x: 0, y: -245, zoom: 0.82 },
  },
  {
    name: "5-3-2",
    lines: [
      makeLine("def", 350, ["LWB", "LCB", "CB", "RCB", "RWB"]),
      makeLine("mid", 220, ["LCM", "CM", "RCM"]),
      makeLine("att", 70, ["ST", "ST"]),
    ],
    camera: { x: 0, y: -255, zoom: 0.88 },
  },
  {
    name: "5-4-1",
    lines: [
      makeLine("def", 350, ["LWB", "LCB", "CB", "RCB", "RWB"]),
      makeLine("mid", 205, ["LM", "LCM", "RCM", "RM"]),
      makeLine("att", 65, ["ST"]),
    ],
    camera: { x: 0, y: -255, zoom: 0.88 },
  },
  {
    name: "5-2-3",
    lines: [
      makeLine("def", 350, ["LWB", "LCB", "CB", "RCB", "RWB"]),
      makeLine("mid", 225, ["CM", "CM"]),
      makeLine("att", 90, ["LW", "ST", "RW"]),
    ],
    camera: { x: 0, y: -245, zoom: 0.85 },
  },
  {
    name: "5-2-2-1",
    lines: [
      makeLine("def", 350, ["LWB", "LCB", "CB", "RCB", "RWB"]),
      makeLine("mid", 230, ["CM", "CM"]),
      makeLine("mid", 145, ["LAM", "RAM"]),
      makeLine("att", 55, ["ST"]),
    ],
    camera: { x: 0, y: -245, zoom: 0.85 },
  },
];

function getXs(roleType, count) {
  const map = roleType === "def" ? DEF_X : roleType === "att" ? ATT_X : MID_X;
  const xs = map[count];
  if (!xs) {
    throw new Error(`No x spacing configured for ${roleType} line with ${count} players.`);
  }
  return xs;
}

function buildPlayers(lines) {
  const players = [];

  for (const line of lines) {
    const xs = getXs(line.roleType, line.roles.length);
    line.roles.forEach((role, index) => {
      players.push({
        x: xs[index],
        y: line.y,
        role,
      });
    });
  }

  players.push({
    x: 0,
    y: gkY,
    role: "GK",
  });

  return players;
}

function buildCamera(formation, players) {
  if (formation.camera) return formation.camera;

  const lineCount = formation.lines.length;
  const maxAbsX = Math.max(...players.map((player) => Math.abs(player.x)));

  if (maxAbsX >= 285 || lineCount >= 5) {
    return { x: 0, y: -250, zoom: 0.82 };
  }
  if (maxAbsX >= 255 || lineCount === 4) {
    return { x: 0, y: -260, zoom: 0.9 };
  }
  return { x: 0, y: -285, zoom: 1 };
}

function buildPlayData(formation) {
  const playData = clone(basePlayData);
  const players = buildPlayers(formation.lines);
  const playersById = {};
  const representedPlayerIds = [];
  const tracks = {
    "ball-1": {
      keyframes: [
        {
          r: 0,
          t: 0,
          x: ball.x,
          y: ball.y,
        },
      ],
    },
  };

  players.forEach((player, index) => {
    const id = `player-${index + 1}`;
    playersById[id] = {
      x: player.x,
      y: player.y,
      id,
      name: "",
      color,
      number: player.role,
    };
    representedPlayerIds.push(id);
    tracks[id] = {
      keyframes: [
        {
          r: 0,
          t: 0,
          x: player.x,
          y: player.y,
        },
      ],
    };
  });

  const createdAt = new Date().toISOString();

  playData.exportedAt = createdAt;
  playData.play = {
    ...playData.play,
    name: formation.name,
    canvas: {
      ...playData.play.canvas,
      camera: buildCamera(formation, players),
    },
    entities: {
      ...playData.play.entities,
      ball: clone(ball),
      ballsById: {
        "ball-1": clone(ball),
      },
      playersById,
      representedPlayerIds,
    },
    animation: {
      ...playData.play.animation,
      tracks,
      meta: {
        createdAt,
        updatedAt: createdAt,
      },
    },
  };

  return playData;
}

const bundle = {
  schemaVersion: "sport-preset-bundle-v1",
  exportedAt: new Date().toISOString(),
  sport: "Soccer",
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
