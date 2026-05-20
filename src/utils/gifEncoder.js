/**
 * GIF encoder using FFmpeg WASM.
 * Converts an array of canvas frames into a palette-optimized, looping GIF.
 *
 * FFmpeg is intentionally loaded via a <script> tag (not as an ES import) so
 * that Vite never touches the FFmpeg UMD bundle or its internal worker chunk.
 * When loaded this way, FFmpeg's self-hosted worker at /ffmpeg/814.ffmpeg.js
 * is fetched as a classic worker without any Vite transformation, allowing
 * importScripts() to work correctly inside it.
 *
 * @module gifEncoder
 */

import { log as logGif } from "./gifExportDebugLogger";

const FFMPEG_SCRIPT_URL  = "/ffmpeg/ffmpeg.js";
const FFMPEG_CORE_URL    = "/ffmpeg/ffmpeg-core.js";
const FFMPEG_WASM_URL    = "/ffmpeg/ffmpeg-core.wasm";

/**
 * Quality presets optimised for email embedding.
 * "medium" is the recommended default: reasonable file size at readable resolution.
 */
export const GIF_PRESETS = {
  low:    { fps: 8,  width: 320, label: "Low",    note: "Small file (~500 KB), 320px wide" },
  medium: { fps: 10, width: 480, label: "Medium",  note: "Balanced (~1 MB), 480px wide" },
  high:   { fps: 15, width: 640, label: "High",    note: "Smooth motion (~2 MB), 640px wide" },
};

/** @type {Promise<{FFmpeg: new() => object}>|null} */
let _scriptPromise = null;

/**
 * Inject /ffmpeg/ffmpeg.js as a classic <script> tag exactly once.
 * After the script loads, window.FFmpegWASM is populated by the UMD bundle.
 * This bypasses Vite's module transform pipeline so the FFmpeg internal
 * classic worker and its importScripts() usage are never interfered with.
 * @returns {Promise<{FFmpeg: new() => object}>}
 */
function loadFFmpegViaScript() {
  if (_scriptPromise) return _scriptPromise;

  _scriptPromise = new Promise((resolve, reject) => {
    if (window.FFmpegWASM?.FFmpeg) {
      logGif("loadFFmpegViaScript: FFmpegWASM already on window, reusing");
      resolve(window.FFmpegWASM);
      return;
    }
    logGif(`loadFFmpegViaScript: injecting script tag for ${FFMPEG_SCRIPT_URL}`);
    const script = document.createElement("script");
    script.src = FFMPEG_SCRIPT_URL;
    script.onload = () => {
      if (window.FFmpegWASM?.FFmpeg) {
        logGif("loadFFmpegViaScript: script loaded, FFmpegWASM available");
        resolve(window.FFmpegWASM);
      } else {
        const msg = "FFmpegWASM not set on window after script load";
        logGif(`loadFFmpegViaScript: ERROR — ${msg}`);
        _scriptPromise = null;
        reject(new Error(msg));
      }
    };
    script.onerror = (e) => {
      const msg = `Failed to load ${FFMPEG_SCRIPT_URL}`;
      logGif(`loadFFmpegViaScript: ERROR — ${msg}`, e);
      _scriptPromise = null;
      reject(new Error(msg));
    };
    document.head.appendChild(script);
  });

  return _scriptPromise;
}

/** @type {object|null} cached FFmpeg instance */
let _ffmpeg = null;
/** @type {Promise<object>|null} */
let _ffmpegLoading = null;

/**
 * Get or initialise the shared FFmpeg WASM instance.
 * Loads FFmpeg via a script tag so Vite never processes the UMD bundle.
 * @returns {Promise<object>}
 */
export async function getSharedFFmpeg() {
  if (_ffmpeg?.loaded) {
    logGif("getSharedFFmpeg: returning cached loaded instance");
    return _ffmpeg;
  }
  if (_ffmpegLoading) {
    logGif("getSharedFFmpeg: waiting for in-progress load");
    return _ffmpegLoading;
  }

  _ffmpegLoading = (async () => {
    logGif("getSharedFFmpeg: starting — will load script then core");

    const { FFmpeg } = await loadFFmpegViaScript();

    logGif(`getSharedFFmpeg: calling ffmpeg.load() — coreURL=${FFMPEG_CORE_URL} wasmURL=${FFMPEG_WASM_URL}`);
    const ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }) => {
      if (typeof message === "string" && message.trim()) {
        logGif(`ffmpeg-log: ${message.trim()}`);
      }
    });

    try {
      await ffmpeg.load({ coreURL: FFMPEG_CORE_URL, wasmURL: FFMPEG_WASM_URL });
      logGif("getSharedFFmpeg: load() succeeded — FFmpeg ready");
      _ffmpeg = ffmpeg;
      return ffmpeg;
    } catch (error) {
      _ffmpegLoading = null;
      const msg = error instanceof Error ? error.message : String(error);
      logGif(`getSharedFFmpeg: load() FAILED — ${msg}`, error);
      throw new Error(`FFmpeg core failed to load: ${msg}`);
    }
  })();

  return _ffmpegLoading;
}

/**
 * Convert an HTMLCanvasElement to a PNG Uint8Array.
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Uint8Array>}
 */
async function canvasToPNG(canvas) {
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("canvas.toBlob returned null"));
    }, "image/png");
  });
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Encode an array of canvas frames into a looping GIF using FFmpeg WASM.
 *
 * Encoding uses a 2-pass palette approach via FFmpeg's split/palettegen/paletteuse
 * filtergraph for significantly better colour accuracy than single-pass GIF encoding.
 *
 * @param {HTMLCanvasElement[]} frames - Ordered array of canvas frames (must be non-empty).
 * @param {Object} [opts]
 * @param {number} [opts.fps=10] - Output frame rate. 8–15 is ideal for email.
 * @param {number} [opts.width=480] - Output width in pixels; height scales proportionally.
 * @param {Function} [opts.onProgress] - Callback receiving a progress value 0–1.
 * @returns {Promise<Blob>} GIF file as an `image/gif` Blob.
 */
export async function encodeCanvasFramesToGIF(frames, { fps = 10, width = 480, onProgress } = {}) {
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new Error("encodeCanvasFramesToGIF: frames must be a non-empty array");
  }
  if (typeof WebAssembly === "undefined") {
    throw new Error("GIF encoding requires WebAssembly support");
  }

  logGif(`encodeCanvasFramesToGIF: ${frames.length} frames, fps=${fps}, width=${width}`);

  const ffmpeg = await getSharedFFmpeg();

  const logLines = [];
  const ffmpegLogHandler = ({ message }) => {
    if (typeof message === "string" && message.trim()) {
      logLines.push(message.trim());
      if (logLines.length > 30) logLines.shift();
    }
  };
  const progressHandler = onProgress
    ? ({ progress }) => onProgress(Math.min(1, Math.max(0, progress)))
    : null;

  ffmpeg.on("log", ffmpegLogHandler);
  if (progressHandler) ffmpeg.on("progress", progressHandler);

  const writtenFiles = [];
  try {
    logGif("encodeCanvasFramesToGIF: writing frames to FFmpeg virtual FS");
    for (let i = 0; i < frames.length; i++) {
      const filename = `gif_frame_${String(i).padStart(4, "0")}.png`;
      const pngData = await canvasToPNG(frames[i]);
      await ffmpeg.writeFile(filename, pngData);
      writtenFiles.push(filename);
      onProgress?.((i + 1) / (frames.length + 1) * 0.6);
    }
    logGif(`encodeCanvasFramesToGIF: wrote ${writtenFiles.length} frames, starting encode`);

    // 2-pass palette GIF via -filter_complex (';' separates graph chains, ',' is intra-chain only)
    const gifFilter = [
      `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1]`,
      `[s0]palettegen=max_colors=256:stats_mode=diff[p]`,
      `[s1][p]paletteuse=dither=bayer:bayer_scale=5`,
    ].join(";");

    const ffmpegArgs = [
      "-framerate", String(fps),
      "-i",         "gif_frame_%04d.png",
      "-filter_complex", gifFilter,
      "-loop",      "0",
      "output.gif",
    ];
    logGif(`encodeCanvasFramesToGIF: exec args: ${ffmpegArgs.join(" ")}`);

    const exitCode = await ffmpeg.exec(ffmpegArgs);
    logGif(`encodeCanvasFramesToGIF: exec finished with exit code ${exitCode}`);

    if (exitCode !== 0) {
      const tail = logLines.slice(-5).join(" | ");
      throw new Error(
        tail
          ? `FFmpeg GIF encode failed (exit ${exitCode}): ${tail}`
          : `FFmpeg GIF encode failed with exit code ${exitCode}`
      );
    }

    onProgress?.(0.95);
    const outputData = await ffmpeg.readFile("output.gif");
    const gifBlob = new Blob([outputData], { type: "image/gif" });
    logGif(`encodeCanvasFramesToGIF: done — blob size ${gifBlob.size} bytes`);
    onProgress?.(1);
    return gifBlob;
  } finally {
    ffmpeg.off("log", ffmpegLogHandler);
    if (progressHandler) ffmpeg.off("progress", progressHandler);

    for (const file of writtenFiles) {
      try { await ffmpeg.deleteFile(file); } catch { /* ignore */ }
    }
    try { await ffmpeg.deleteFile("output.gif"); } catch { /* ignore */ }
  }
}
