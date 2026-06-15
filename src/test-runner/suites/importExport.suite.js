/**
 * In-browser test suite for import/export utility functions.
 */
import { buildSuite } from "../testRunner";
import { buildPlayExport, EXPORT_SCHEMA_VERSION } from "../../utils/exportPlay";
import { validatePlayImport, IMPORT_SCHEMA_VERSION } from "../../utils/importPlay";

export default buildSuite(({ describe, it, expect }) => {
  const minAnimation = {
    version: 1,
    durationMs: 30000,
    tracks: {
      "p-1": { keyframes: [{ t: 0, x: 10, y: 20 }] },
    },
  };

  const minPlayers = {
    "p-1": { id: "p-1", x: 10, y: 20, number: 1, name: "Player 1", color: "#ef4444" },
  };

  // ─── buildPlayExport ──────────────────────────────────────────────────
  describe("buildPlayExport", () => {
    it("includes correct schema version", () => {
      const exp = buildPlayExport({ playName: "Test", animationData: minAnimation, playersById: minPlayers });
      expect(exp.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    }, "Every export must include the schema version string so the importer knows how to parse it. If this is wrong or missing, importing the file will fail with a 'unsupported schemaVersion' error.");

    it("includes play name", () => {
      const exp = buildPlayExport({ playName: "My Play", animationData: minAnimation });
      expect(exp.play.name).toBe("My Play");
    }, "The play name should be preserved in the export so it can be restored on import. Failure means imported plays would lose their name and show as blank.");

    it("includes exportedAt timestamp", () => {
      const exp = buildPlayExport({ playName: "Test", animationData: minAnimation });
      expect(exp.exportedAt).toBeTruthy();
    }, "The export timestamp helps users identify when a file was created. Missing timestamp won't break import but loses useful metadata for debugging file issues.");

    it("normalizes players into entities", () => {
      const exp = buildPlayExport({ playName: "Test", animationData: minAnimation, playersById: minPlayers });
      expect(exp.play.entities.playersById["p-1"].name).toBe("Player 1");
    }, "Player data (names, numbers, colors, positions) must be included in the export. Without this, importing a play would have animations but no players to animate.");

    it("builds representedPlayerIds from playersById keys", () => {
      const exp = buildPlayExport({ playName: "Test", animationData: minAnimation, playersById: minPlayers });
      expect(exp.play.entities.representedPlayerIds).toContain("p-1");
    }, "representedPlayerIds tracks which players are visible on the field. This list must include all player IDs. If missing, imported plays might hide players that should be visible.");

    it("handles empty params", () => {
      const exp = buildPlayExport({ animationData: minAnimation });
      expect(exp.play.name).toBe("");
      expect(exp.play.entities.playersById).toEqual({});
    }, "Exporting with minimal data (no name, no players) should still produce a valid export object with sensible defaults. Failure would crash the export when optional fields are missing.");

    it("includes animation data", () => {
      const exp = buildPlayExport({ playName: "Test", animationData: minAnimation });
      expect(exp.play.animation.version).toBe(1);
      expect(exp.play.animation.durationMs).toBe(30000);
    }, "The animation (tracks, keyframes, duration) is the core data of a play. If this isn't included or is malformed, the imported play would have no movement data.");

    it("defaults camera when not provided", () => {
      const exp = buildPlayExport({ playName: "Test", animationData: minAnimation });
      expect(exp.play.canvas.camera.zoom).toBe(1);
    }, "Camera defaults to {x:0, y:0, zoom:1} when not specified. This ensures imported plays start with a reasonable viewport. If the default is wrong, imports would open at a weird zoom or position.");

    it("includes drawings array", () => {
      const drawings = [{ id: "d1", type: "stroke", points: [0, 0, 10, 10] }];
      const exp = buildPlayExport({ playName: "Test", animationData: minAnimation, drawings });
      expect(exp.play.drawings).toHaveLength(1);
    }, "Drawings (strokes, arrows, text, shapes) drawn on the canvas must be exported. Without this, all annotations would be lost when sharing or backing up plays.");

    it("defaults drawings to empty array", () => {
      const exp = buildPlayExport({ playName: "Test", animationData: minAnimation });
      expect(exp.play.drawings).toEqual([]);
    }, "Plays with no drawings should export an empty array (not null/undefined). The importer expects an array. Failure would cause import validation to treat missing drawings as an error.");
  });

  // ─── validatePlayImport ───────────────────────────────────────────────
  describe("validatePlayImport", () => {
    it("rejects null input", () => {
      const result = validatePlayImport(null);
      expect(result.ok).toBe(false);
    }, "Null input (corrupted file, empty paste) must be rejected with ok:false. If this returns ok:true, subsequent code would crash trying to read properties of null.");

    it("rejects non-object input", () => {
      const result = validatePlayImport("not an object");
      expect(result.ok).toBe(false);
    }, "Strings, numbers, and other non-objects are invalid import data. This catches cases where someone accidentally tries to import a non-JSON file or a malformed string.");

    it("rejects wrong schema version", () => {
      const result = validatePlayImport({ schemaVersion: "play-export-v99" });
      expect(result.ok).toBe(false);
      expect(result.error).toContain("schemaVersion");
    }, "Files from incompatible future versions (or other apps) should be rejected with a clear error message mentioning the version mismatch. Without this check, the app might try to parse incompatible data and corrupt state.");

    it("rejects missing play object", () => {
      const result = validatePlayImport({ schemaVersion: IMPORT_SCHEMA_VERSION });
      expect(result.ok).toBe(false);
      expect(result.error).toContain("play");
    }, "A valid schema version but missing play data means a truncated or hand-edited file. The error should point the user to the missing 'play' field.");

    it("accepts valid v2 export", () => {
      const exported = buildPlayExport({
        playName: "Round Trip",
        animationData: minAnimation,
        playersById: minPlayers,
        ball: { id: "ball-1", x: 0, y: 0 },
      });
      const result = validatePlayImport(exported);
      expect(result.ok).toBe(true);
      expect(result.play.name).toBe("Round Trip");
    }, "The critical round-trip test: export a play, then import it, and verify it comes back intact. This is the most important import/export test. Failure means the export/import pipeline is broken and users will lose data.");

    it("preserves players in round trip", () => {
      const exported = buildPlayExport({
        playName: "Test",
        animationData: minAnimation,
        playersById: minPlayers,
      });
      const result = validatePlayImport(exported);
      expect(result.ok).toBe(true);
      expect(result.play.entities.playersById["p-1"].name).toBe("Player 1");
    }, "Player data must survive the export-import cycle. Check that names, IDs, and other fields come back exactly as exported. Failure means shared plays would lose player information.");

    it("accepts raw animation v1 format", () => {
      const result = validatePlayImport(minAnimation);
      expect(result.ok).toBe(true);
      expect(result.play.name).toBe("Imported Play");
    }, "The importer also accepts raw animation JSON (version 1 format) for backwards compatibility. This lets users import animation-only files without the full play wrapper. Failure breaks backwards compat with older exports.");

    it("preserves animation data in round trip", () => {
      const exported = buildPlayExport({
        playName: "Test",
        animationData: minAnimation,
        playersById: minPlayers,
      });
      const result = validatePlayImport(exported);
      expect(result.ok).toBe(true);
      expect(result.play.animation.durationMs).toBe(30000);
    }, "The animation duration and track data must survive import. If duration is lost, the timeline would reset to a default length, making keyframe positions wrong.");

    it("normalizes ball from legacy format", () => {
      const exported = buildPlayExport({
        playName: "Test",
        animationData: minAnimation,
        ball: { id: "ball-1", x: 50, y: 60 },
      });
      const result = validatePlayImport(exported);
      expect(result.ok).toBe(true);
    }, "Older exports store ball as a single object; newer ones use ballsById map. The importer must handle both formats. Failure means old saved plays can't be re-imported.");

    it("preserves drawings in round trip", () => {
      const drawings = [{ id: "d1", type: "stroke", points: [0, 0, 10, 10] }];
      const exported = buildPlayExport({ playName: "Test", animationData: minAnimation, drawings });
      const result = validatePlayImport(exported);
      expect(result.ok).toBe(true);
      expect(result.play.drawings).toHaveLength(1);
    }, "Canvas drawings (annotations, arrows, shapes) must survive the round trip. Failure means coaches lose all their drawn annotations when sharing plays between devices.");

    it("defaults drawings to empty array when missing", () => {
      const exported = buildPlayExport({ playName: "Test", animationData: minAnimation });
      delete exported.play.drawings;
      const result = validatePlayImport(exported);
      expect(result.ok).toBe(true);
      expect(result.play.drawings).toEqual([]);
    }, "If the drawings field is missing from an export (older file format), it should default to an empty array rather than null. This prevents 'cannot read length of null' errors in the drawing renderer.");
  });
});
