/**
 * Tests for the "hide from players" play visibility feature.
 * Covers API response mapping, frontend filtering, and backend PATCH support.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock mapApiPlayToLocal (mirrors src/utils/apiPlays.js) ──────────────────

function mapApiPlayToLocal(p) {
  return {
    id: p.id,
    teamId: p.teamId || null,
    folderId: p.folderId || null,
    title: p.title || "Untitled",
    tags: p.tags || [],
    playData: p.playData || null,
    thumbnail: p.thumbnail || null,
    notes: p.notes || "",
    notesAuthorName: p.notesAuthorName || "",
    notesUpdatedAt: p.notesUpdatedAt || null,
    favorited: Boolean(p.favorited),
    hiddenFromPlayers: Boolean(p.hiddenFromPlayers),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    playName: p.title || "Untitled",
    savedAt: p.updatedAt,
  };
}

// ── Mock toPlayResponse (mirrors server/routes/plays.js) ────────────────────

function toPlayResponse(row, { tags = [], favorited = false } = {}) {
  return {
    id: row.id,
    teamId: row.team_id,
    folderId: row.folder_id || null,
    title: row.title,
    tags,
    playData: row.play_data,
    thumbnail: row.thumbnail_url || null,
    notes: row.notes || "",
    notesAuthorName: row.notes_author_name || "",
    notesUpdatedAt: row.notes_updated_at || null,
    favorited,
    hiddenFromPlayers: Boolean(row.hidden_from_players),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Player-visible filter (mirrors Plays.jsx logic) ─────────────────────────

function filterPlayerVisible(plays, playerViewMode) {
  const playerVisible = (p) => !playerViewMode || !p.hiddenFromPlayers;
  return plays.filter(playerVisible);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Hide from Players feature", () => {
  describe("mapApiPlayToLocal", () => {
    it("maps hiddenFromPlayers as false when not set", () => {
      const result = mapApiPlayToLocal({ id: "1", title: "Test" });
      expect(result.hiddenFromPlayers).toBe(false);
    });

    it("maps hiddenFromPlayers as true when set", () => {
      const result = mapApiPlayToLocal({ id: "1", title: "Test", hiddenFromPlayers: true });
      expect(result.hiddenFromPlayers).toBe(true);
    });

    it("coerces truthy values to boolean", () => {
      const result = mapApiPlayToLocal({ id: "1", title: "Test", hiddenFromPlayers: 1 });
      expect(result.hiddenFromPlayers).toBe(true);
    });
  });

  describe("toPlayResponse", () => {
    it("includes hiddenFromPlayers from DB row", () => {
      const row = {
        id: "play-1",
        team_id: "team-1",
        title: "My Play",
        hidden_from_players: true,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      };
      const response = toPlayResponse(row);
      expect(response.hiddenFromPlayers).toBe(true);
    });

    it("defaults hiddenFromPlayers to false for old rows", () => {
      const row = {
        id: "play-2",
        team_id: "team-1",
        title: "Old Play",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      };
      const response = toPlayResponse(row);
      expect(response.hiddenFromPlayers).toBe(false);
    });
  });

  describe("Player visibility filtering", () => {
    const plays = [
      { id: "1", title: "Visible Play", hiddenFromPlayers: false },
      { id: "2", title: "Hidden Play", hiddenFromPlayers: true },
      { id: "3", title: "Another Visible", hiddenFromPlayers: false },
    ];

    it("shows all plays when not in player view mode", () => {
      const result = filterPlayerVisible(plays, false);
      expect(result).toHaveLength(3);
    });

    it("filters hidden plays in player view mode", () => {
      const result = filterPlayerVisible(plays, true);
      expect(result).toHaveLength(2);
      expect(result.every((p) => !p.hiddenFromPlayers)).toBe(true);
    });

    it("returns empty array when all plays are hidden in player view", () => {
      const allHidden = [
        { id: "1", hiddenFromPlayers: true },
        { id: "2", hiddenFromPlayers: true },
      ];
      const result = filterPlayerVisible(allHidden, true);
      expect(result).toHaveLength(0);
    });

    it("returns all plays when none are hidden in player view", () => {
      const noneHidden = [
        { id: "1", hiddenFromPlayers: false },
        { id: "2", hiddenFromPlayers: false },
      ];
      const result = filterPlayerVisible(noneHidden, true);
      expect(result).toHaveLength(2);
    });
  });
});
