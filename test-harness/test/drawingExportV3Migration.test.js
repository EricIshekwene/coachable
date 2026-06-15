/**
 * Tests for the v2 → v3 export/import migration.
 *
 * Covers:
 * - new exports always write separated annotation/motion arrays
 * - imports accept v3 (separated) and v2 (combined) shapes
 * - legacy `attachedPlayerId` is upgraded to `attachedEntityId` + type
 * - annotation drawings without timing become full-duration
 */
import { describe, it, expect } from "vitest";
import { buildPlayExport, EXPORT_SCHEMA_VERSION } from "../../src/utils/exportPlay.js";
import {
  validatePlayImport,
  IMPORT_SCHEMA_VERSION,
  LEGACY_IMPORT_SCHEMA_VERSION,
} from "../../src/utils/importPlay.js";
import { createEmptyAnimation, serializeAnimation } from "../../src/animation/index.js";

const baseAnimation = () => createEmptyAnimation({ durationMs: 12000 });

const baseExportArgs = () => ({
  playName: "Test",
  advancedSettings: {},
  allPlayersDisplay: {},
  currentPlayerColor: "#ef4444",
  camera: { x: 0, y: 0, zoom: 1 },
  fieldRotation: 0,
  playersById: { p1: { id: "p1" } },
  representedPlayerIds: ["p1"],
  ball: { id: "ball-1", x: 0, y: 0 },
  ballsById: { "ball-1": { id: "ball-1" } },
  animationData: baseAnimation(),
  playback: { speedMultiplier: 50, autoplayEnabled: true },
});

describe("EXPORT_SCHEMA_VERSION", () => {
  it("is bumped to v3", () => {
    expect(EXPORT_SCHEMA_VERSION).toBe("play-export-v3");
    expect(IMPORT_SCHEMA_VERSION).toBe("play-export-v3");
    expect(LEGACY_IMPORT_SCHEMA_VERSION).toBe("play-export-v2");
  });
});

describe("buildPlayExport with separated arrays", () => {
  it("writes annotationDrawings + motionDrawings on play", () => {
    const out = buildPlayExport({
      ...baseExportArgs(),
      annotationDrawings: [
        { kind: "annotation", type: "text", text: "hi", x: 10, y: 10 },
      ],
      motionDrawings: [
        {
          kind: "motion",
          type: "arrow",
          attachedEntityId: "p1",
          attachedEntityType: "player",
          points: [0, 0, 5, 5],
          stepStartMs: 0,
          stepEndMs: 5000,
          stepIndex: 0,
        },
      ],
    });
    expect(out.schemaVersion).toBe("play-export-v3");
    expect(out.play.annotationDrawings).toHaveLength(1);
    expect(out.play.motionDrawings).toHaveLength(1);
    expect(out.play).not.toHaveProperty("drawings");
  });

  it("scrubs cross-scope fields defensively on export", () => {
    const out = buildPlayExport({
      ...baseExportArgs(),
      annotationDrawings: [
        // annotation accidentally carrying motion fields
        {
          type: "stroke",
          points: [0, 0, 1, 1],
          attachedPlayerId: "p1",
          stepStartMs: 0,
        },
      ],
      motionDrawings: [],
    });
    const ann = out.play.annotationDrawings[0];
    expect(ann).not.toHaveProperty("attachedPlayerId");
    expect(ann).not.toHaveProperty("stepStartMs");
    expect(ann.kind).toBe("annotation");
  });

  it("falls back to splitting legacy `drawings` if separated arrays are absent", () => {
    const out = buildPlayExport({
      ...baseExportArgs(),
      drawings: [
        { type: "stroke", points: [0, 0, 1, 1] },
        {
          type: "arrow",
          source: "coaching-draw",
          attachedPlayerId: "p1",
          stepStartMs: 0,
          stepEndMs: 1000,
          points: [0, 0, 2, 2],
        },
      ],
    });
    expect(out.play.annotationDrawings).toHaveLength(1);
    expect(out.play.motionDrawings).toHaveLength(1);
    expect(out.play.motionDrawings[0].attachedEntityId).toBe("p1");
    expect(out.play.motionDrawings[0].attachedEntityType).toBe("player");
  });
});

describe("validatePlayImport", () => {
  const makeV3Export = (overrides = {}) => ({
    schemaVersion: "play-export-v3",
    exportedAt: new Date().toISOString(),
    play: {
      name: "Test",
      settings: {},
      canvas: {},
      entities: {
        playersById: { p1: { id: "p1" } },
        representedPlayerIds: ["p1"],
        ball: null,
        ballsById: null,
      },
      animation: JSON.parse(serializeAnimation(baseAnimation(), { pretty: false })),
      annotationDrawings: [],
      motionDrawings: [],
      playback: {},
      meta: {},
      ...overrides,
    },
  });

  it("accepts v3 exports and round-trips separated arrays", () => {
    const v3 = makeV3Export({
      annotationDrawings: [
        { kind: "annotation", type: "text", text: "hi", visibleStartMs: 1000, visibleEndMs: 4000 },
      ],
      motionDrawings: [
        {
          kind: "motion",
          type: "arrow",
          attachedEntityId: "p1",
          attachedEntityType: "player",
          points: [0, 0, 1, 1],
          stepStartMs: 0,
          stepEndMs: 1000,
          stepIndex: 0,
        },
      ],
    });
    const result = validatePlayImport(v3);
    expect(result.ok).toBe(true);
    expect(result.play.annotationDrawings).toHaveLength(1);
    expect(result.play.motionDrawings).toHaveLength(1);
    expect(result.play.annotationDrawings[0].visibleStartMs).toBe(1000);
    expect(result.play.motionDrawings[0].attachedEntityId).toBe("p1");
  });

  it("accepts v2 exports and splits the combined array", () => {
    const v2 = {
      schemaVersion: "play-export-v2",
      exportedAt: new Date().toISOString(),
      play: {
        name: "Legacy",
        settings: {},
        canvas: {},
        entities: {
          playersById: { p1: { id: "p1" } },
          representedPlayerIds: ["p1"],
          ball: null,
          ballsById: null,
        },
        animation: JSON.parse(serializeAnimation(baseAnimation(), { pretty: false })),
        drawings: [
          { type: "stroke", points: [0, 0, 1, 1] },
          {
            type: "arrow",
            source: "coaching-draw",
            attachedPlayerId: "p1",
            stepStartMs: 0,
            stepEndMs: 1000,
            points: [0, 0, 2, 2],
          },
        ],
        playback: {},
        meta: {},
      },
    };
    const result = validatePlayImport(v2);
    expect(result.ok).toBe(true);
    expect(result.play.annotationDrawings).toHaveLength(1);
    expect(result.play.motionDrawings).toHaveLength(1);
    // Legacy attachedPlayerId is upgraded
    expect(result.play.motionDrawings[0].attachedEntityId).toBe("p1");
    expect(result.play.motionDrawings[0]).not.toHaveProperty("attachedPlayerId");
  });

  it("defaults annotation visibility to full duration when missing", () => {
    const v2 = {
      schemaVersion: "play-export-v2",
      exportedAt: new Date().toISOString(),
      play: {
        name: "Legacy",
        settings: {},
        canvas: {},
        entities: {
          playersById: {},
          representedPlayerIds: [],
          ball: null,
          ballsById: null,
        },
        animation: JSON.parse(serializeAnimation(baseAnimation(), { pretty: false })),
        drawings: [{ type: "text", text: "x" }],
        playback: {},
        meta: {},
      },
    };
    const result = validatePlayImport(v2);
    expect(result.ok).toBe(true);
    expect(result.play.annotationDrawings[0].visibleStartMs).toBe(0);
    expect(result.play.annotationDrawings[0].visibleEndMs).toBe(12000);
  });

  it("rejects unknown schema versions", () => {
    const out = validatePlayImport({ schemaVersion: "play-export-v9", play: {} });
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/Unsupported schemaVersion/);
  });
});
