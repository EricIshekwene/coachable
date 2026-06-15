import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the localStorage-first autosave system.
 * Covers the recovery logic extracted from PlayEditPage and the localStorage
 * persistence/clear helpers used by the page components.
 */

const LS_PREFIX = "coachable_play_";

// --- Helpers extracted for testability (mirrors PlayEditPage logic) ---

function recoverFromLocalStorage(playId, serverPlay) {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${playId}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.playData || !cached?.savedAt) return null;
    if (!serverPlay) return cached;
    const serverUpdated = serverPlay.updated_at ? new Date(serverPlay.updated_at).getTime() : 0;
    if (cached.savedAt > serverUpdated) return cached;
    return null;
  } catch {
    return null;
  }
}

function clearLocalStorageCache(playId) {
  try {
    localStorage.removeItem(`${LS_PREFIX}${playId}`);
  } catch { /* ignore */ }
}

// --- Mock localStorage ---

function createMockLocalStorage() {
  const store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = String(val); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    _store: store,
  };
}

describe("localStorage autosave", () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    Object.defineProperty(globalThis, "localStorage", { value: mockStorage, writable: true });
  });

  describe("recoverFromLocalStorage", () => {
    it("returns null when no cached data exists", () => {
      expect(recoverFromLocalStorage("play-1", null)).toBeNull();
    });

    it("returns cached data when no server play exists", () => {
      const cached = { playData: { foo: 1 }, playName: "Test", savedAt: 1000 };
      mockStorage._store[`${LS_PREFIX}play-1`] = JSON.stringify(cached);

      const result = recoverFromLocalStorage("play-1", null);
      expect(result).toEqual(cached);
    });

    it("returns cached data when it is newer than server", () => {
      const cached = { playData: { foo: 2 }, playName: "Newer", savedAt: 2000 };
      mockStorage._store[`${LS_PREFIX}play-1`] = JSON.stringify(cached);

      const serverPlay = { updated_at: new Date(1000).toISOString() };
      const result = recoverFromLocalStorage("play-1", serverPlay);
      expect(result).toEqual(cached);
    });

    it("returns null when server data is newer", () => {
      const cached = { playData: { foo: 1 }, playName: "Old", savedAt: 1000 };
      mockStorage._store[`${LS_PREFIX}play-1`] = JSON.stringify(cached);

      const serverPlay = { updated_at: new Date(2000).toISOString() };
      expect(recoverFromLocalStorage("play-1", serverPlay)).toBeNull();
    });

    it("returns null when cached data is malformed", () => {
      mockStorage._store[`${LS_PREFIX}play-1`] = "not json";
      expect(recoverFromLocalStorage("play-1", null)).toBeNull();
    });

    it("returns null when cached data has no playData", () => {
      const cached = { playName: "NoData", savedAt: 1000 };
      mockStorage._store[`${LS_PREFIX}play-1`] = JSON.stringify(cached);
      expect(recoverFromLocalStorage("play-1", null)).toBeNull();
    });

    it("returns null when cached data has no savedAt", () => {
      const cached = { playData: { foo: 1 }, playName: "NoTimestamp" };
      mockStorage._store[`${LS_PREFIX}play-1`] = JSON.stringify(cached);
      expect(recoverFromLocalStorage("play-1", null)).toBeNull();
    });
  });

  describe("clearLocalStorageCache", () => {
    it("removes the cached entry", () => {
      mockStorage._store[`${LS_PREFIX}play-1`] = "data";
      clearLocalStorageCache("play-1");
      expect(mockStorage.removeItem).toHaveBeenCalledWith(`${LS_PREFIX}play-1`);
      expect(mockStorage._store[`${LS_PREFIX}play-1`]).toBeUndefined();
    });

    it("does not throw when key does not exist", () => {
      expect(() => clearLocalStorageCache("nonexistent")).not.toThrow();
    });
  });

  describe("localStorage persistence format", () => {
    it("stores play data with correct key format and schema", () => {
      const payload = { playData: { players: [] }, playName: "My Play", savedAt: Date.now() };
      const key = `${LS_PREFIX}test-id`;
      localStorage.setItem(key, JSON.stringify(payload));

      const stored = JSON.parse(localStorage.getItem(key));
      expect(stored).toHaveProperty("playData");
      expect(stored).toHaveProperty("playName");
      expect(stored).toHaveProperty("savedAt");
      expect(typeof stored.savedAt).toBe("number");
    });
  });
});
