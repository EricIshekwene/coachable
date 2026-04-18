/**
 * Tests for the demo videos feature.
 * Covers the admin API helpers and the public fetch used on the Videos page.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const API_URL = "http://localhost:3001";
const SESSION = "test-admin-session";

// ── Helper: mock fetch responses ─────────────────────────────────────────────

function mockFetch(responseData, ok = true, status = ok ? 200 : 400) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(responseData),
  });
}

// ── Inline copies of the admin API helpers (mirrors AdminDemoVideos.jsx) ─────

async function fetchVideos(session) {
  const res = await fetch(`${API_URL}/demo-videos`, {
    headers: { "x-admin-session": session },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  const data = await res.json();
  return data.videos || [];
}

async function createVideo(session, body) {
  const res = await fetch(`${API_URL}/demo-videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create");
  return data.video;
}

async function updateVideo(session, id, body) {
  const res = await fetch(`${API_URL}/demo-videos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update");
  return data.video;
}

async function deleteVideo(session, id) {
  const res = await fetch(`${API_URL}/demo-videos/${id}`, {
    method: "DELETE",
    headers: { "x-admin-session": session },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete");
  }
}

// ── YouTube ID extraction (mirrors AdminDemoVideos.jsx) ───────────────────────

function extractYouTubeId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("?")[0];
    if (url.searchParams.has("v")) return url.searchParams.get("v");
    const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return embedMatch[1];
  } catch {
    // not a valid URL
  }
  return null;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchVideos", () => {
  it("returns the videos array from the API", async () => {
    const videos = [
      { id: "1", title: "How to animate", youtubeUrl: null, done: false, sortOrder: 0 },
      { id: "2", title: "How to draw", youtubeUrl: "https://youtu.be/abcdefghijk", done: true, sortOrder: 1 },
    ];
    mockFetch({ videos });
    const result = await fetchVideos(SESSION);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("How to animate");
  });

  it("returns empty array when API returns no videos key", async () => {
    mockFetch({});
    const result = await fetchVideos(SESSION);
    expect(result).toEqual([]);
  });

  it("throws UNAUTHORIZED when session is invalid", async () => {
    mockFetch({ error: "Unauthorized" }, false, 401);
    await expect(fetchVideos("bad-session")).rejects.toThrow("UNAUTHORIZED");
  });

  it("sends the admin session header", async () => {
    const spy = mockFetch({ videos: [] });
    await fetchVideos(SESSION);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/demo-videos"),
      expect.objectContaining({
        headers: expect.objectContaining({ "x-admin-session": SESSION }),
      })
    );
  });
});

describe("createVideo", () => {
  it("posts the video body and returns the created video", async () => {
    const video = { id: "abc", title: "New Video", youtubeUrl: null, done: false, sortOrder: 0 };
    const spy = mockFetch({ video });
    const result = await createVideo(SESSION, { title: "New Video", done: false, sortOrder: 0 });
    expect(result.id).toBe("abc");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/demo-videos"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws with the server error message on failure", async () => {
    mockFetch({ error: "Title is required" }, false);
    await expect(createVideo(SESSION, { title: "" })).rejects.toThrow("Title is required");
  });
});

describe("updateVideo", () => {
  it("sends a PATCH request and returns the updated video", async () => {
    const video = { id: "abc", title: "Updated", youtubeUrl: null, done: true, sortOrder: 0 };
    const spy = mockFetch({ video });
    const result = await updateVideo(SESSION, "abc", { done: true });
    expect(result.done).toBe(true);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/demo-videos/abc"),
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("throws on failure", async () => {
    mockFetch({ error: "Video not found" }, false);
    await expect(updateVideo(SESSION, "bad-id", {})).rejects.toThrow("Video not found");
  });
});

describe("deleteVideo", () => {
  it("sends a DELETE request for the given id", async () => {
    const spy = mockFetch({ ok: true });
    await deleteVideo(SESSION, "abc");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/demo-videos/abc"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("throws when the response is not ok", async () => {
    mockFetch({ error: "Video not found" }, false);
    await expect(deleteVideo(SESSION, "bad-id")).rejects.toThrow("Video not found");
  });
});

describe("extractYouTubeId", () => {
  it("returns null for null input", () => {
    expect(extractYouTubeId(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractYouTubeId("")).toBeNull();
  });

  it("extracts ID from a youtu.be URL", () => {
    expect(extractYouTubeId("https://youtu.be/abcdefghijk")).toBe("abcdefghijk");
  });

  it("extracts ID from a youtu.be URL with query params", () => {
    expect(extractYouTubeId("https://youtu.be/abcdefghijk?t=30")).toBe("abcdefghijk");
  });

  it("extracts ID from a watch?v= URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=abcdefghijk")).toBe("abcdefghijk");
  });

  it("extracts ID from an embed URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/abcdefghijk")).toBe("abcdefghijk");
  });

  it("returns bare 11-char ID as-is", () => {
    expect(extractYouTubeId("abcdefghijk")).toBe("abcdefghijk");
  });

  it("returns null for a non-YouTube URL", () => {
    expect(extractYouTubeId("https://vimeo.com/123456789")).toBeNull();
  });

  it("returns null for a short non-ID string", () => {
    expect(extractYouTubeId("notanid")).toBeNull();
  });
});
