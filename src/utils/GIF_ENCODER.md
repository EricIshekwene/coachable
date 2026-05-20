# GIF Encoder

## What was implemented

A client-side GIF export utility (`gifEncoder.js`) that converts the live Slate play canvas into a looping animated GIF, intended for embedding in emails sent from the admin dashboard.

A matching `recordGIFExport` function and `gifExportRef` prop were added to `Slate.jsx` to wire the encoder into the canvas capture pipeline without exposing any editor UI.

---

## How it works

### Frame capture (in `Slate.jsx`)

`recordGIFExport(worldRect, durationSec, options)` follows the same pipeline as `recordVideoExport`:

1. Pause the animation engine and clear selections.
2. Call `renderPoseAtTime(t)` for each evenly-spaced time step across the play duration.
3. After each render, call `api.captureFrameCanvas(worldRect, { pixelRatio: 1 })` to get an `HTMLCanvasElement` snapshot from Konva.
4. Collect all frame canvases in memory (no real-time constraint — the engine is paused).

### GIF encoding (in `gifEncoder.js`)

`encodeCanvasFramesToGIF(frames, { fps, width, onProgress })`:

1. Loads FFmpeg WASM via `getSharedFFmpeg()` (lazy singleton, shared with video export).
2. Converts each `HTMLCanvasElement` to a PNG `Uint8Array` via `canvas.toBlob` → `ArrayBuffer`.
3. Writes PNGs to FFmpeg's virtual filesystem as `gif_frame_0000.png`, `gif_frame_0001.png`, …
4. Runs a single FFmpeg command with a 2-pass palette filtergraph:
   ```
   fps={fps}, scale={width}:-1:flags=lanczos,
   split[s0][s1];
   [s0]palettegen=max_colors=256:stats_mode=diff[p];
   [s1][p]paletteuse=dither=bayer:bayer_scale=5
   ```
   - `palettegen stats_mode=diff` builds the palette from frame **deltas** rather than all pixels, which gives better colour accuracy for animation.
   - `paletteuse dither=bayer` applies ordered Bayer dithering — a good quality/file-size trade-off.
   - `-loop 0` makes the GIF loop forever.
5. Reads back `output.gif` and returns it as an `image/gif` Blob.
6. Cleans up all virtual FS files in the `finally` block.

Progress is reported in two phases:
- 0–60 %: frame writing
- 60–100 %: FFmpeg encoding (via the FFmpeg `progress` event)

### `gifExportRef` prop

When the caller passes a `gifExportRef` to `<Slate>`, Slate populates it with:

```js
gifExportRef.current = {
  generateGIF(durationSec, options) -> Promise<Blob|null>,
  presets: GIF_PRESETS,  // { low, medium, high }
}
```

The email composer will create this ref, mount Slate (or reuse an open instance), then call `gifExportRef.current.generateGIF(10, GIF_PRESETS.medium)` to get the Blob.

---

## Quality presets

| Preset | FPS | Width | Approx. size |
|--------|-----|-------|--------------|
| low    | 8   | 320px | ~500 KB      |
| medium | 10  | 480px | ~1 MB        |
| high   | 15  | 640px | ~2 MB        |

`medium` is the recommended default for email embedding.

---

## Key decisions

- **Reuse FFmpeg WASM** — `@ffmpeg/ffmpeg` is already a dependency for video export (`convertWebMToMP4`). Sharing the singleton avoids loading a second WASM module.
- **pixelRatio: 1** for frame capture — GIFs are downscaled by FFmpeg anyway; capturing at 2× would just double memory for no quality gain.
- **No editor UI** — the feature is intentionally invisible in the play editor. The `gifExportRef` prop is the only entry point, keeping the email composer as the single owner of GIF export UX.
- **Separate file prefix (`gif_frame_`)** — prevents collisions with any future parallel usage of the FFmpeg virtual FS by video export.

---

## Files

| File | Role |
|------|------|
| `src/utils/gifEncoder.js` | Core encoder — FFmpeg pipeline |
| `src/features/slate/Slate.jsx` | Frame capture + `recordGIFExport` + `gifExportRef` prop |
| `admin/test/gifEncoder.test.js` | Vitest tests for presets + validation + mocked FFmpeg path |
