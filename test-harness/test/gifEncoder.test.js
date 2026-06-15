import { describe, it, expect, vi, beforeEach } from "vitest";
import { GIF_PRESETS, encodeCanvasFramesToGIF } from "../../src/utils/gifEncoder";

// ---------------------------------------------------------------------------
// Mock @ffmpeg/ffmpeg and @ffmpeg/util.
// vi.mock is hoisted so we cannot reference let/const from the outer scope
// inside the factory — we use globalThis to share the mock instance instead.
// ---------------------------------------------------------------------------

vi.mock("@ffmpeg/ffmpeg", () => {
  const instance = {
    loaded: false,
    load: vi.fn().mockImplementation(() => {
      instance.loaded = true;
      return Promise.resolve();
    }),
    on: vi.fn(),
    off: vi.fn(),
    exec: vi.fn().mockResolvedValue(0),
    writeFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(new Uint8Array([71, 73, 70])),
  };
  // Expose for tests — globalThis is the only safe cross-boundary channel here
  globalThis.__mockFFmpegInstance = instance;
  // Must use a regular function (not arrow) so `new FFmpeg()` works as a constructor
  return { FFmpeg: vi.fn(function () { return instance; }) };
});

vi.mock("@ffmpeg/util", () => ({
  toBlobURL: vi.fn((url) => Promise.resolve(url)),
  fetchFile: vi.fn(),
}));

// ---------------------------------------------------------------------------
// GIF_PRESETS
// ---------------------------------------------------------------------------

describe("GIF_PRESETS", () => {
  it("exports low, medium, and high presets", () => {
    expect(GIF_PRESETS).toHaveProperty("low");
    expect(GIF_PRESETS).toHaveProperty("medium");
    expect(GIF_PRESETS).toHaveProperty("high");
  });

  it("each preset has fps, width, label, and note fields", () => {
    for (const preset of Object.values(GIF_PRESETS)) {
      expect(typeof preset.fps).toBe("number");
      expect(typeof preset.width).toBe("number");
      expect(typeof preset.label).toBe("string");
      expect(typeof preset.note).toBe("string");
    }
  });

  it("fps values are ordered low ≤ medium ≤ high", () => {
    expect(GIF_PRESETS.low.fps).toBeLessThanOrEqual(GIF_PRESETS.medium.fps);
    expect(GIF_PRESETS.medium.fps).toBeLessThanOrEqual(GIF_PRESETS.high.fps);
  });

  it("width values are ordered low < medium < high", () => {
    expect(GIF_PRESETS.low.width).toBeLessThan(GIF_PRESETS.medium.width);
    expect(GIF_PRESETS.medium.width).toBeLessThan(GIF_PRESETS.high.width);
  });

  it("medium fps is suitable for email (8–12 fps)", () => {
    expect(GIF_PRESETS.medium.fps).toBeGreaterThanOrEqual(8);
    expect(GIF_PRESETS.medium.fps).toBeLessThanOrEqual(12);
  });
});

// ---------------------------------------------------------------------------
// encodeCanvasFramesToGIF — input validation (no FFmpeg needed)
// ---------------------------------------------------------------------------

describe("encodeCanvasFramesToGIF input validation", () => {
  it("throws when frames array is empty", async () => {
    await expect(encodeCanvasFramesToGIF([])).rejects.toThrow(
      "frames must be a non-empty array"
    );
  });

  it("throws when frames is null", async () => {
    await expect(encodeCanvasFramesToGIF(null)).rejects.toThrow(
      "frames must be a non-empty array"
    );
  });

  it("throws when frames is a string", async () => {
    await expect(encodeCanvasFramesToGIF("bad")).rejects.toThrow(
      "frames must be a non-empty array"
    );
  });

  it("throws when WebAssembly is unavailable", async () => {
    const original = globalThis.WebAssembly;
    delete globalThis.WebAssembly;
    try {
      await expect(
        encodeCanvasFramesToGIF([{ toBlob: vi.fn() }])
      ).rejects.toThrow("WebAssembly");
    } finally {
      globalThis.WebAssembly = original;
    }
  });
});

// ---------------------------------------------------------------------------
// encodeCanvasFramesToGIF — FFmpeg integration (mocked via vi.mock above)
// ---------------------------------------------------------------------------

/** Creates a minimal canvas stub whose toBlob resolves with a PNG Blob. */
function makeCanvas() {
  return {
    toBlob: vi.fn((cb) => {
      cb(new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }));
    }),
    width: 480,
    height: 270,
  };
}

describe("encodeCanvasFramesToGIF with mocked FFmpeg", () => {
  /** @type {typeof globalThis.__mockFFmpegInstance} */
  let ff;

  beforeEach(() => {
    ff = globalThis.__mockFFmpegInstance;
    vi.clearAllMocks();
    // Re-wire default behaviours after clearAllMocks
    ff.load.mockImplementation(() => { ff.loaded = true; return Promise.resolve(); });
    ff.exec.mockResolvedValue(0);
    ff.writeFile.mockResolvedValue(undefined);
    ff.deleteFile.mockResolvedValue(undefined);
    ff.readFile.mockResolvedValue(new Uint8Array([71, 73, 70]));
    ff.on.mockImplementation(() => {});
    ff.off.mockImplementation(() => {});
    // Mark as loaded so getSharedFFmpeg reuses it without calling load again
    ff.loaded = true;
  });

  it("writes one PNG per frame to the virtual FS", async () => {
    const frames = [makeCanvas(), makeCanvas(), makeCanvas()];
    await encodeCanvasFramesToGIF(frames, { fps: 10, width: 320 });

    expect(ff.writeFile).toHaveBeenCalledTimes(3);
    expect(ff.writeFile.mock.calls[0][0]).toMatch(/gif_frame_0000\.png/);
    expect(ff.writeFile.mock.calls[2][0]).toMatch(/gif_frame_0002\.png/);
  });

  it("calls ffmpeg.exec with -loop 0 for infinite loop", async () => {
    await encodeCanvasFramesToGIF([makeCanvas()], { fps: 10, width: 320 });

    const args = ff.exec.mock.calls[0][0];
    const loopIdx = args.indexOf("-loop");
    expect(loopIdx).toBeGreaterThanOrEqual(0);
    expect(args[loopIdx + 1]).toBe("0");
  });

  it("passes the requested fps to ffmpeg -framerate", async () => {
    await encodeCanvasFramesToGIF([makeCanvas()], { fps: 12, width: 320 });

    const args = ff.exec.mock.calls[0][0];
    const idx = args.indexOf("-framerate");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(args[idx + 1]).toBe("12");
  });

  it("returns an image/gif Blob on success", async () => {
    const result = await encodeCanvasFramesToGIF([makeCanvas()], { fps: 10, width: 320 });

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("image/gif");
  });

  it("cleans up virtual FS files after successful encoding", async () => {
    await encodeCanvasFramesToGIF([makeCanvas(), makeCanvas()], { fps: 10, width: 320 });

    expect(ff.deleteFile).toHaveBeenCalled();
  });

  it("cleans up virtual FS even when FFmpeg exec fails", async () => {
    ff.exec.mockResolvedValue(1);

    await encodeCanvasFramesToGIF([makeCanvas()], { fps: 10, width: 320 }).catch(() => {});

    expect(ff.deleteFile).toHaveBeenCalled();
  });

  it("throws a clear error when FFmpeg exec returns non-zero", async () => {
    ff.exec.mockResolvedValue(1);

    await expect(
      encodeCanvasFramesToGIF([makeCanvas()], { fps: 10, width: 320 })
    ).rejects.toThrow("FFmpeg GIF encode failed");
  });

  it("reports progress from > 0 up to 1", async () => {
    const frames = [makeCanvas(), makeCanvas(), makeCanvas()];
    const progressValues = [];
    await encodeCanvasFramesToGIF(frames, {
      fps: 10,
      width: 320,
      onProgress: (p) => progressValues.push(p),
    });

    expect(progressValues.length).toBeGreaterThan(0);
    for (let i = 1; i < progressValues.length; i++) {
      expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
    }
    expect(progressValues[progressValues.length - 1]).toBeCloseTo(1, 2);
  });
});
