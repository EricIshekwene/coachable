# Mac Safari Compatibility

## Problem

Coaches using Coachable on a Mac with Safari found that video export did not work.
The rest of the app (play design, playbooks, sharing) works fine in any modern browser,
but Safari has two specific incompatibilities with the video export feature:

### 1. `captureStream()` not available in Safari

The MediaRecorder fallback path (used when WebCodecs fails) relies on
`HTMLCanvasElement.captureStream()` to stream canvas frames into a `MediaRecorder`.
Safari does not implement `captureStream()`, so calling it threw a cryptic
`"captureStream is not a function"` error that surfaced as a generic "Export failed"
message with no useful guidance.

### 2. MediaRecorder MIME type selection

The `resolveRecorderMimeType()` function tries WebM candidates first by default.
Safari does not support WebM. Without explicitly preferring MP4, Safari would exhaust
all WebM candidates before falling through to MP4 — making the intent unreadable
and relying on incidental ordering rather than explicit browser detection.

## Solution

### New functions in `videoEncoder.js`

**`isSafari()`** — Detects Safari by checking for "Safari" in the user-agent string
while excluding Chrome, Edge, and Firefox (which all include "Safari" in their UA).
Handles desktop Safari on Mac, Safari on iOS, and correctly excludes CriOS/FxiOS.

**`supportsCanvasCaptureStream()`** — Feature-detects whether `captureStream()` is
available on canvas elements. Returns `false` on Safari.

### Changes in `Slate.jsx` and `SlateRecord.jsx`

1. **Prefer MP4 on Safari**: Pass `preferMp4: isIOS || isSafariBrowser` to
   `resolveRecorderMimeType()` so Safari always gets MP4 candidates first instead
   of exhausting WebM first.

2. **Guard the MediaRecorder fallback**: Before attempting `captureStream()`, check
   `hasCaptureStream`. If not available, throw a clear error:
   _"Video export is not supported in this browser. Please use Chrome or Firefox
   for video export."_ — replacing the cryptic API error.

3. **WebCodecs still attempted on Mac Safari**: Unlike iOS (where WebCodecs is
   unreliable at runtime), Mac Safari's WebCodecs implementation (available since
   Safari 16.4, March 2023) is more stable. The code continues to attempt WebCodecs
   on Mac Safari and only falls back to MediaRecorder if WebCodecs fails.

## Browser behavior after fix

| Browser | WebCodecs path | MediaRecorder fallback |
|---|---|---|
| Chrome (Mac/Win) | MP4 via WebCodecs | WebM (captureStream supported) |
| Safari 16.4+ (Mac) | MP4 via WebCodecs | Clear error message if fallback needed |
| Safari < 16.4 (Mac) | Not available | Clear error message |
| iOS Safari | Skipped (known buggy) | MP4 MediaRecorder (no captureStream) |
| Firefox | MP4 via WebCodecs | WebM (captureStream supported) |

## Recommendation for users on Mac Safari

If a coach is on Mac and prefers Safari, video export will work if their Mac Safari
is version 16.4 or later (released March 2023, ships with macOS Ventura 13.3+).
If WebCodecs fails for any reason, they'll see a clear message suggesting Chrome.
All other Coachable features work in Safari.
