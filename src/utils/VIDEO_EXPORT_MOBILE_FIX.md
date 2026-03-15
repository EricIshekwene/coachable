# Video Export Mobile Fix

## Problem
Video export failed on mobile devices with "Encoding task failed" error.
The canvas was 2100x3840 pixels (700x1280 field at pixelRatio=3), which exceeds
mobile H.264 hardware encoder limits (typically max ~1920px on any dimension).

`VideoEncoder.isConfigSupported()` reported the codec as supported, but the
actual encode operation failed because the hardware couldn't handle the resolution.

## Solution
Added `clampEncodeDimensions()` in `videoEncoder.js` that caps the longest
dimension to 1920px and scales the other proportionally, preserving aspect ratio.
Both dimensions are ensured to be even (H.264 requirement).

When clamping occurs, the resize canvas uses high-quality image smoothing to
minimize quality loss during downscale.

## Key Decisions
- **1920px cap**: Chosen as the safe maximum for mobile hardware encoders.
  Desktop encoders can typically handle higher, but 1920px is 1080p-equivalent
  and produces good quality for play animations.
- **Automatic clamping** rather than user-facing error: The user shouldn't need
  to know about encoder limits. Quality preset stays at "Ultra" but output is
  silently capped to a mobile-safe resolution.
- **Proportional scaling**: Aspect ratio is preserved so the field doesn't distort.
