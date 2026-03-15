/**
 * Frame-by-frame video encoder using WebCodecs API + mp4-muxer.
 * Produces proper MP4 files with exact frame timing (no real-time dependency).
 * Falls back to MediaRecorder/WebM when WebCodecs is unavailable.
 *
 * @module videoEncoder
 */

import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

/**
 * Check if the browser supports WebCodecs-based encoding.
 * @returns {boolean}
 */
export function supportsWebCodecsMP4() {
  return (
    typeof VideoEncoder === "function" &&
    typeof VideoFrame === "function" &&
    typeof EncodedVideoChunk === "function"
  );
}

/**
 * Codec candidates in priority order. Each entry specifies the WebCodecs codec
 * string, the mp4-muxer codec key, and hardware preference.
 */
const CODEC_CANDIDATES = [
  // H.264 Main Level 4.0 — hardware
  { webCodec: "avc1.4D0028", muxCodec: "avc", hw: "prefer-hardware" },
  // H.264 Main Level 4.0 — software
  { webCodec: "avc1.4D0028", muxCodec: "avc", hw: "prefer-software" },
  // H.264 High Level 4.0 — software
  { webCodec: "avc1.640028", muxCodec: "avc", hw: "prefer-software" },
  // H.264 Main Level 3.1 — software (lower level, wider compat)
  { webCodec: "avc1.4D001F", muxCodec: "avc", hw: "prefer-software" },
  // H.264 Baseline Level 3.0 — software (most compatible profile)
  { webCodec: "avc1.42001E", muxCodec: "avc", hw: "prefer-software" },
  // H.264 Constrained Baseline — software
  { webCodec: "avc1.42E01E", muxCodec: "avc", hw: "prefer-software" },
  // VP9 — hardware
  { webCodec: "vp09.00.10.08", muxCodec: "vp9", hw: "prefer-hardware" },
  // VP9 — software
  { webCodec: "vp09.00.10.08", muxCodec: "vp9", hw: "prefer-software" },
];

/**
 * Maximum dimension (width or height) for video encoding.
 * Mobile hardware encoders commonly fail above 1920px; we cap at 1920
 * and scale the other axis proportionally to stay within safe limits.
 */
const MAX_ENCODE_DIMENSION = 1920;

/**
 * Clamp dimensions so neither exceeds MAX_ENCODE_DIMENSION, preserving aspect ratio.
 * Also ensures both dimensions are even (required by H.264).
 * @param {number} width
 * @param {number} height
 * @returns {{ width: number, height: number, scale: number }}
 */
export function clampEncodeDimensions(width, height) {
  let scale = 1;
  const maxDim = Math.max(width, height);
  if (maxDim > MAX_ENCODE_DIMENSION) {
    scale = MAX_ENCODE_DIMENSION / maxDim;
  }
  let w = Math.round(width * scale);
  let h = Math.round(height * scale);
  // Ensure even (H.264 requirement)
  if (w % 2 !== 0) w += 1;
  if (h % 2 !== 0) h += 1;
  return { width: w, height: h, scale };
}

/**
 * Create a frame-by-frame MP4 encoder.
 *
 * Usage:
 *   const enc = await createMP4Encoder({ width, height, fps, bitrate });
 *   for (let i = 0; i < totalFrames; i++) {
 *     await enc.addFrame(canvasElement, i);
 *   }
 *   const blob = await enc.finish(); // MP4 Blob
 *
 * Dimensions are automatically clamped to MAX_ENCODE_DIMENSION (1920) on the
 * longest side to ensure compatibility with mobile hardware encoders.
 *
 * @param {Object} opts
 * @param {number} opts.width - Frame width in pixels
 * @param {number} opts.height - Frame height in pixels
 * @param {number} opts.fps - Frames per second
 * @param {number} [opts.bitrate=5_000_000] - Target bitrate in bits/second
 * @returns {Promise<{addFrame: Function, finish: Function, encodedWidth: number, encodedHeight: number}>}
 */
export async function createMP4Encoder({ width, height, fps, bitrate = 5_000_000 }) {
  const clamped = clampEncodeDimensions(width, height);
  const w = clamped.width;
  const h = clamped.height;

  const frameDurationMicros = Math.round(1_000_000 / fps);

  // Probe for a supported codec before creating the muxer
  let chosenCandidate = null;
  for (const candidate of CODEC_CANDIDATES) {
    try {
      const config = {
        codec: candidate.webCodec,
        width: w,
        height: h,
        bitrate,
        framerate: fps,
        hardwareAcceleration: candidate.hw,
      };
      const support = await VideoEncoder.isConfigSupported(config);
      if (support.supported) {
        chosenCandidate = { ...candidate, config: support.config || config };
        break;
      }
    } catch {
      // Try next
    }
  }

  if (!chosenCandidate) {
    throw new Error(
      "No supported video codec found. Tried H.264 (multiple profiles) and VP9."
    );
  }

  // Now create the muxer with the matched codec
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: chosenCandidate.muxCodec,
      width: w,
      height: h,
    },
    fastStart: "in-memory",
  });

  let encoderError = null;

  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      try {
        // Safari/iOS omits decoderConfig in chunk metadata, which mp4-muxer
        // requires (it reads colorSpace from it). Patch in a default if missing.
        if (meta && !meta.decoderConfig) {
          meta.decoderConfig = {
            codec: chosenCandidate.config.codec,
            codedWidth: w,
            codedHeight: h,
            colorSpace: { primaries: "bt709", transfer: "bt709", matrix: "bt709", fullRange: false },
          };
        } else if (meta?.decoderConfig && !meta.decoderConfig.colorSpace) {
          meta.decoderConfig.colorSpace = { primaries: "bt709", transfer: "bt709", matrix: "bt709", fullRange: false };
        }
        // Some encoders (notably Safari/iOS) produce chunks with duration = -1,
        // undefined, or NaN. mp4-muxer requires a non-negative real number.
        // Always use addVideoChunkRaw so we can guarantee a valid duration.
        const dur = (chunk.duration != null && Number.isFinite(chunk.duration) && chunk.duration >= 0)
          ? chunk.duration
          : frameDurationMicros;
        const buf = new Uint8Array(chunk.byteLength);
        chunk.copyTo(buf);
        muxer.addVideoChunkRaw(buf, chunk.type, chunk.timestamp, dur, meta);
      } catch (outputErr) {
        // Capture muxer errors so they don't bubble as unhandled exceptions
        // (which would fire hundreds of global error reports per frame).
        // The error is surfaced via encoderError and checked in addFrame/finish.
        encoderError = outputErr;
      }
    },
    error: (e) => {
      encoderError = e;
    },
  });

  encoder.configure(chosenCandidate.config);

  // Temp canvas for scaling/ensuring even dimensions
  let resizeCanvas = null;
  let resizeCtx = null;
  if (w !== width || h !== height) {
    resizeCanvas = new OffscreenCanvas(w, h);
    resizeCtx = resizeCanvas.getContext("2d");
    resizeCtx.imageSmoothingEnabled = true;
    resizeCtx.imageSmoothingQuality = "high";
  }

  /**
   * Add a frame from a canvas element.
   * @param {HTMLCanvasElement} canvas - The source canvas for this frame
   * @param {number} frameIndex - Zero-based frame index (determines timestamp)
   * @param {boolean} [keyFrame=false] - Force this frame as a keyframe
   */
  async function addFrame(canvas, frameIndex, keyFrame = false) {
    if (encoderError) throw encoderError;

    let source = canvas;
    if (resizeCanvas) {
      resizeCtx.clearRect(0, 0, w, h);
      resizeCtx.drawImage(canvas, 0, 0, w, h);
      source = resizeCanvas;
    }

    const timestamp = frameIndex * frameDurationMicros;
    // Force keyframe every 2 seconds or on first frame
    const isKey = keyFrame || frameIndex === 0 || frameIndex % (fps * 2) === 0;

    const frame = new VideoFrame(source, { timestamp });
    encoder.encode(frame, { keyFrame: isKey });
    frame.close();

    // Prevent encoder queue from growing too large — back-pressure
    if (encoder.encodeQueueSize > 5) {
      await new Promise((resolve) => {
        const check = () => {
          if (encoder.encodeQueueSize <= 2) resolve();
          else setTimeout(check, 1);
        };
        check();
      });
    }
  }

  /**
   * Finalize encoding and return an MP4 Blob.
   * @returns {Promise<Blob>}
   */
  async function finish() {
    if (encoderError) throw encoderError;
    await encoder.flush();
    encoder.close();
    muxer.finalize();
    const buffer = target.buffer;
    return new Blob([buffer], { type: "video/mp4" });
  }

  return {
    addFrame,
    finish,
    codec: chosenCandidate.webCodec,
    muxCodec: chosenCandidate.muxCodec,
    encodedWidth: w,
    encodedHeight: h,
  };
}

/**
 * Check if the current device is iOS (iPhone/iPad/iPod).
 * @returns {boolean}
 */
export function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Singleton FFmpeg instance (lazy-loaded). */
let _ffmpeg = null;
let _ffmpegLoading = null;

/**
 * Get or initialize the FFmpeg WASM instance.
 * @returns {Promise<FFmpeg>}
 */
async function getFFmpeg() {
  if (_ffmpeg && _ffmpeg.loaded) return _ffmpeg;
  if (_ffmpegLoading) return _ffmpegLoading;

  _ffmpegLoading = (async () => {
    const ffmpeg = new FFmpeg();
    await ffmpeg.load();
    _ffmpeg = ffmpeg;
    return ffmpeg;
  })();

  return _ffmpegLoading;
}

/**
 * Convert a WebM blob to MP4 using FFmpeg WASM.
 * This is used on iOS where WebM is not playable but MediaRecorder
 * only produces WebM. The conversion re-muxes without re-encoding
 * when possible, preserving quality.
 *
 * @param {Blob} webmBlob - The WebM video blob
 * @param {Function} [onProgress] - Optional progress callback (0-1)
 * @returns {Promise<Blob>} MP4 blob
 */
export async function convertWebMToMP4(webmBlob, onProgress) {
  const ffmpeg = await getFFmpeg();

  // Write input file
  const inputData = await fetchFile(webmBlob);
  await ffmpeg.writeFile("input.webm", inputData);

  // Set up progress reporting
  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(Math.min(1, Math.max(0, progress)));
    });
  }

  // Convert: re-encode to H.264 + AAC in MP4 container
  // Using -c:v libx264 for maximum iOS compatibility
  await ffmpeg.exec([
    "-i", "input.webm",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",       // High quality (lower = better, 18 is visually lossless)
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-an",               // No audio
    "output.mp4",
  ]);

  // Read output
  const outputData = await ffmpeg.readFile("output.mp4");

  // Clean up
  await ffmpeg.deleteFile("input.webm");
  await ffmpeg.deleteFile("output.mp4");

  return new Blob([outputData], { type: "video/mp4" });
}
