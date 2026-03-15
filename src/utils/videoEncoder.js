/**
 * Frame-by-frame video encoder using WebCodecs API + mp4-muxer.
 * Produces proper MP4 files with exact frame timing (no real-time dependency).
 * Falls back to MediaRecorder/WebM when WebCodecs is unavailable.
 *
 * @module videoEncoder
 */

import { Muxer, ArrayBufferTarget } from "mp4-muxer";

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
      muxer.addVideoChunk(chunk, meta);
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
