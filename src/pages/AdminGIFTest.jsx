import { useState, useRef, useCallback, useEffect } from "react";
import Slate from "../features/slate/Slate";
import MessagePopup from "../components/MessagePopup/MessagePopup";
import { useMessagePopup } from "../components/messaging/useMessagePopup";
import { useAdmin } from "../admin/AdminContext";
import useThemeColor from "../utils/useThemeColor";
import MobileViewOnlyGate from "../components/MobileViewOnlyGate";
import { GIF_PRESETS } from "../utils/gifEncoder";
import { getLogs as getGifLogs } from "../utils/gifExportDebugLogger";

const DURATIONS = [5, 10, 20, 30];

const pillBtn = (active) =>
  `px-3 py-1.5 rounded-full text-xs font-DmSans font-semibold transition-colors ${
    active
      ? "bg-BrandOrange text-BrandBlack"
      : "bg-BrandGray2 text-white hover:bg-BrandGray"
  }`;

/**
 * Admin sandbox page at /admin/gif-test.
 *
 * Renders the full Slate editor alongside a floating control panel that lets
 * you generate a GIF from the current play, monitor progress, preview the
 * result inline, and download it. Used to validate the GIF encoder before
 * wiring it into the email composer.
 */
export default function AdminGIFTest() {
  const { theme } = useAdmin();
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  const gifExportRef = useRef(null);
  useThemeColor(theme === "light" ? "#f3f6fb" : "#121212");

  const [preset, setPreset] = useState("medium");
  const [duration, setDuration] = useState(10);
  const [phase, setPhase] = useState("idle"); // "idle" | "capturing" | "encoding" | "done" | "error"
  const [progress, setProgress] = useState(0);
  const [gifUrl, setGifUrl] = useState(null);
  const [gifSizeKB, setGifSizeKB] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [logLines, setLogLines] = useState([]);
  const [logExpanded, setLogExpanded] = useState(false);
  const logRef = useRef(null);

  // Revoke any previous object URL on unmount
  useEffect(() => () => { if (gifUrl) URL.revokeObjectURL(gifUrl); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll GIF export debug log while generating or on error
  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    const interval = setInterval(() => {
      setLogLines(getGifLogs(30));
    }, 500);
    return () => clearInterval(interval);
  }, [phase]);

  // Scroll log panel to bottom when new lines arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines]);

  /**
   * Map raw 0–1 progress into a phase label.
   * 0–0.5 = frame capture, 0.5–1 = FFmpeg encode.
   */
  const handleProgress = useCallback((p) => {
    setProgress(p);
    setPhase(p < 0.5 ? "capturing" : "encoding");
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!gifExportRef.current?.generateGIF) {
      showMessage("Not ready", "Load a play in the editor first.", "error");
      return;
    }

    // Clean up previous result
    if (gifUrl) {
      URL.revokeObjectURL(gifUrl);
      setGifUrl(null);
      setGifSizeKB(null);
    }

    setPhase("capturing");
    setProgress(0);
    setErrorMsg(null);

    const selectedPreset = GIF_PRESETS[preset];
    let blob = null;
    try {
      blob = await gifExportRef.current.generateGIF(duration, {
        fps: selectedPreset.fps,
        width: selectedPreset.width,
        onProgress: handleProgress,
      });
    } catch (err) {
      blob = null;
      setLogLines(getGifLogs(30));
      setPhase("error");
      setLogExpanded(true);
      setErrorMsg(err?.message || "Generation failed — see the browser console for details.");
      return;
    }

    if (blob) {
      const url = URL.createObjectURL(blob);
      setGifUrl(url);
      setGifSizeKB(Math.round(blob.size / 1024));
      setPhase("done");
    } else {
      // null return means recordGIFExport already showed a toast — just reset UI
      setPhase("idle");
    }
  }, [gifUrl, preset, duration, handleProgress, showMessage]);

  const handleDownload = useCallback(() => {
    if (!gifUrl) return;
    const a = document.createElement("a");
    a.href = gifUrl;
    a.download = `play-gif-${preset}-${duration}s.gif`;
    a.click();
  }, [gifUrl, preset, duration]);

  const handleReset = useCallback(() => {
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    setGifUrl(null);
    setGifSizeKB(null);
    setPhase("idle");
    setProgress(0);
    setErrorMsg(null);
  }, [gifUrl]);

  const isGenerating = phase === "capturing" || phase === "encoding";
  const pct = Math.round(progress * 100);

  return (
    <div
      data-admin-theme={theme}
      className="relative flex h-full w-full overflow-hidden"
      style={{ height: "100dvh", backgroundColor: "var(--adm-bg)" }}
    >
      <MessagePopup
        message={messagePopup.message}
        subtitle={messagePopup.subtitle}
        visible={messagePopup.visible}
        type={messagePopup.type}
        autoHideDuration={messagePopup.autoHideDuration}
        onClose={hideMessage}
      />

      {/* Full-screen Slate editor */}
      <MobileViewOnlyGate>
        <Slate
          onShowMessage={showMessage}
          adminMode
          gifExportRef={gifExportRef}
        />
      </MobileViewOnlyGate>

      {/* Floating GIF control panel — top right */}
      <div
        className="pointer-events-auto absolute right-4 top-4 z-50 flex w-72 flex-col gap-3 rounded-xl p-4"
        style={{
          backgroundColor: "rgba(10,10,10,0.92)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-DmSans text-xs font-bold uppercase tracking-widest text-white/60">
            GIF Export Test
          </span>
          {phase === "done" && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[10px] text-white/40 transition hover:text-white/70"
            >
              Reset
            </button>
          )}
        </div>

        {/* Preset selector */}
        <div className="flex flex-col gap-1.5">
          <span className="font-DmSans text-[10px] text-white/50">Quality</span>
          <div className="flex gap-1.5">
            {Object.entries(GIF_PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                className={pillBtn(preset === key)}
                onClick={() => setPreset(key)}
                disabled={isGenerating}
              >
                {p.label}
              </button>
            ))}
          </div>
          <span className="font-DmSans text-[9px] text-white/30">
            {GIF_PRESETS[preset].note}
          </span>
        </div>

        {/* Duration selector */}
        <div className="flex flex-col gap-1.5">
          <span className="font-DmSans text-[10px] text-white/50">Duration</span>
          <div className="flex gap-1.5">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={pillBtn(duration === d)}
                onClick={() => setDuration(d)}
                disabled={isGenerating}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        {!isGenerating && phase !== "done" && (
          <button
            type="button"
            onClick={handleGenerate}
            className="mt-1 w-full rounded-lg bg-BrandOrange py-2.5 font-DmSans text-xs font-bold text-BrandBlack transition hover:bg-BrandOrange/90 active:scale-[0.98] disabled:opacity-40"
            disabled={isGenerating}
          >
            Generate GIF
          </button>
        )}

        {/* Progress */}
        {isGenerating && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between font-DmSans text-[10px]">
              <span className="text-white/60">
                {phase === "capturing" ? "Capturing frames…" : "Encoding GIF…"}
              </span>
              <span className="text-white/40">{pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-BrandOrange transition-[width] duration-150"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="font-DmSans text-[9px] text-white/30">
              {phase === "capturing"
                ? `${Math.round(pct * 2)}% of frames captured`
                : "Running FFmpeg palette optimisation…"}
            </p>
          </div>
        )}

        {/* Error state */}
        {phase === "error" && errorMsg && (
          <div className="rounded-lg bg-red-500/10 p-3">
            <p className="font-DmSans text-[10px] leading-relaxed text-red-400">{errorMsg}</p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-2 font-DmSans text-[10px] text-white/40 hover:text-white/70"
            >
              Try again
            </button>
          </div>
        )}

        {/* Live debug log — visible while generating or on error */}
        {logLines.length > 0 && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setLogExpanded((v) => !v)}
              className="flex items-center justify-between w-full text-[9px] text-white/40 hover:text-white/60"
            >
              <span>Debug log ({logLines.length} lines)</span>
              <span>{logExpanded ? "▲" : "▼"}</span>
            </button>
            {logExpanded && (
              <div
                ref={logRef}
                className="overflow-y-auto rounded bg-black/40 p-2 font-mono"
                style={{ maxHeight: 120, fontSize: 8, lineHeight: "1.4", color: "rgba(255,255,255,0.45)" }}
              >
                {logLines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(logLines.join("\n"))}
              className="text-[9px] text-BrandOrange/60 hover:text-BrandOrange text-left"
            >
              Copy log
            </button>
          </div>
        )}

        {/* Result: preview + actions */}
        {phase === "done" && gifUrl && (
          <div className="flex flex-col gap-2">
            {/* Size badge */}
            <div className="flex items-center justify-between font-DmSans text-[10px]">
              <span className="text-white/60">Preview</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-white/50">
                {gifSizeKB} KB
              </span>
            </div>

            {/* GIF preview */}
            <div
              className="overflow-hidden rounded-lg"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <img
                src={gifUrl}
                alt="Generated GIF preview"
                className="w-full object-contain"
                style={{ maxHeight: 160 }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 rounded-lg bg-BrandOrange py-2 font-DmSans text-xs font-bold text-BrandBlack transition hover:bg-BrandOrange/90"
              >
                Download
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                className="flex-1 rounded-lg bg-white/10 py-2 font-DmSans text-xs font-semibold text-white/80 transition hover:bg-white/15"
              >
                Regenerate
              </button>
            </div>

            {/* Metadata */}
            <p className="font-DmSans text-[9px] text-white/25">
              {GIF_PRESETS[preset].fps} fps · {GIF_PRESETS[preset].width}px · {duration}s
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
