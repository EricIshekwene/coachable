# Video Export Mobile Fix

## Problem
Video export failed on iOS (and potentially other mobile devices) with
"Encoding task failed" error. Two root causes:

1. **Resolution too high**: Canvas was 2100x3840 (pixelRatio=3), exceeding mobile
   H.264 hardware encoder limits (~1920px max).
2. **iOS WebCodecs unreliable**: `VideoEncoder.isConfigSupported()` returns `true`
   on iOS Safari but the actual encode fails for H.264. This happens even at
   lower resolutions (e.g., 2096x1461).
3. **No iOS-compatible fallback**: The MediaRecorder fallback only tried WebM MIME
   types, which iOS Safari doesn't support (Safari uses `video/mp4`).

## Solution

### 1. Resolution clamping (`videoEncoder.js`)
Added `clampEncodeDimensions()` that caps the longest dimension to 1920px and
scales proportionally. Resize uses high-quality image smoothing.

### 2. Automatic fallback to MediaRecorder (`Slate.jsx`)
Wrapped the WebCodecs MP4 path in try/catch. If encoding fails at runtime, it
automatically falls back to the MediaRecorder path instead of showing an error.
On fallback, frame 0 is re-rendered and re-captured before starting MediaRecorder.

### 3. Safari MIME type support (`Slate.jsx`)
Added `"video/mp4"` to the `resolveRecorderMimeType()` candidate list so Safari/iOS
can use its native MediaRecorder with MP4 output.

## Key Decisions
- **1920px cap**: Safe maximum for mobile hardware encoders. 1080p-equivalent
  quality is sufficient for play animations.
- **Silent fallback**: Users get a video (WebM or MP4) regardless of device
  capabilities, without needing to understand codec support.
- **MediaRecorder is real-time**: The fallback path paces frames to wall-clock
  time, so exports take longer than the WebCodecs path but still work.
