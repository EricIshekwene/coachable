/**
 * Admin email composer page.
 * Left column: audience filters, rich composer, send controls.
 * Right column: live preview that cycles through real recipients.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCheck, FiChevronLeft, FiChevronRight, FiClock, FiFilm,
  FiImage, FiMail, FiPlus, FiSend, FiUsers, FiX,
} from "react-icons/fi";
import { useAdmin } from "../admin/AdminContext";
import { adminApi } from "../admin/adminTransport";
import AdminFlagGate from "../admin/AdminFlagGate";
import Slate from "../features/slate/Slate";
import {
  AdminBtn,
  AdminCard,
  AdminHeader,
  AdminInput,
  AdminPage,
  AdminSection,
  AdminSelect,
  AdminShell,
  AdminSpinner,
} from "../admin/components";
import ConfirmModal from "../components/subcomponents/ConfirmModal";
import { SUPPORTED_FIELD_TYPES } from "../features/slate/hooks/useAdvancedSettings";
import {
  buildBroadcastEmailHtml,
  extractYouTubeId,
  getBroadcastBodyText,
  sanitizeBroadcastBodyMarkup,
} from "../../shared/broadcastEmailTemplate.js";
import { getLogs as getGifExportDebugLogs, log as logGifExport } from "../utils/gifExportDebugLogger";
import PlayPickerModal from "../components/PlayPickerModal";
import RecipientPicker from "../components/RecipientPicker";

const USER_TYPE_OPTIONS = [
  { value: "all", label: "All verified users" },
  { value: "onboarded", label: "Onboarded users" },
  { value: "beta", label: "Beta testers" },
];

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "coach", label: "Coach" },
  { value: "assistant_coach", label: "Assistant Coach" },
  { value: "player", label: "Player" },
];

const SPORT_OPTIONS = [
  { value: "", label: "All sports" },
  ...SUPPORTED_FIELD_TYPES
    .filter((sport) => sport !== "Blank")
    .map((sport) => ({ value: sport, label: sport })),
];

const EMPTY_FILTER_GROUP = { userType: "onboarded", sport: "", roles: [] };

const PLACEHOLDER_RECIPIENT = {
  name: "Alex Johnson",
  email: "alex@example.com",
  team_name: "Example FC",
};

const LABEL_CLASS = "text-xs font-semibold";
const TOOLBAR_BTN_CLASS =
  "rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80";

const EMPTY_ACTIVE_FORMATS = {
  bold: false, italic: false, underline: false,
  h2: false, quote: false, bullets: false, numbers: false, link: false,
};
const PLAY_EMBED_SENTINEL = "{{playEmbed}}";
const PLAY_EMBED_TOKEN_REGEX = /\{\{playembed\}\}?/gi;
const hasPlayEmbedToken = (value) => /\{\{playembed\}\}?/i.test(String(value || ""));

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function insertHtmlAtCursor(html) {
  document.execCommand("insertHTML", false, html);
}

function insertTextAtCursor(text) {
  document.execCommand("insertText", false, text);
}

// ── GIF debug panel ───────────────────────────────────────────────────────────

/**
 * Always-visible panel at the bottom of the Send card that surfaces drawing-mode
 * GIF rendering diagnostics: editorMode, motion drawings, animation tracks, and
 * live canvas metrics. Helps diagnose why a drawing-mode play GIF looks wrong.
 *
 * @param {{ playEmbed: object|null, slatePlayRef: React.RefObject, gifExportRef: React.RefObject, gifPhase: string, gifError: string }} props
 */
function GifDebugPanel({ playEmbed, slatePlayRef, gifExportRef, gifPhase, gifError }) {
  const [metrics, setMetrics] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const tick = () => setMetrics(gifExportRef.current?.getCanvasMetrics?.() || null);
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [gifExportRef]);

  const play = slatePlayRef.current;
  const innerPlay = play?.playData?.play;
  const editorMode = innerPlay?.meta?.editorMode || null;
  const isDrawing = editorMode === "drawing";
  const animation = innerPlay?.animation;
  const tracks = animation?.tracks || {};
  const motionDrawings = innerPlay?.motionDrawings || [];
  const annotationDrawings = innerPlay?.annotationDrawings || [];
  const playersById = innerPlay?.entities?.playersById || {};
  const ballsById = innerPlay?.entities?.ballsById || {};
  const cb = metrics?.contentBounds;

  // Compute bounding box of all motion path points for display
  const pathBounds = (() => {
    if (!motionDrawings.length) return null;
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    motionDrawings.forEach((d) => {
      (d.points || []).forEach((pt) => {
        if (pt?.x == null) return;
        if (pt.x < left) left = pt.x;
        if (pt.x > right) right = pt.x;
        if (pt.y < top) top = pt.y;
        if (pt.y > bottom) bottom = pt.y;
      });
    });
    return Number.isFinite(left) ? { left, right, top, bottom } : null;
  })();

  const handleCopy = useCallback(async () => {
    const lines = [
      "=== GIF RENDERING DEBUG ===",
      "",
      "── Embedded play ──",
      `title: ${playEmbed?.title || "(none)"}`,
      `id:    ${playEmbed?.id || "(none)"}`,
      `gifUrl: ${playEmbed?.gifUrl || "(none)"}`,
      "",
      "── Source play ──",
      `title:      ${play?.title || "(none)"}`,
      `id:         ${play?.id || "(none)"}`,
      `editorMode: ${editorMode || "(none)"}`,
      `drawingMode prop passed: ${isDrawing}`,
      "",
      "── Animation ──",
      `durationMs: ${animation?.durationMs ?? "(none)"}`,
      `tracks (${Object.keys(tracks).length}):`,
      ...Object.entries(tracks).map(([id, track]) => {
        const kfs = track?.keyframes || [];
        return `  ${id}: ${kfs.length} keyframes${kfs.length ? ` [${kfs.map((k) => `${Math.round(k.timeMs)}ms (${Math.round(k.x)},${Math.round(k.y)})`).join(", ")}]` : ""}`;
      }),
      "",
      "── Player start positions ──",
      ...Object.entries(playersById).map(([id, p]) =>
        `  ${id} (#${p.number ?? "?"}): x=${Math.round(p.x ?? 0)} y=${Math.round(p.y ?? 0)}`
      ),
      ...Object.entries(ballsById).map(([id, b]) =>
        `  ${id} (ball): x=${Math.round(b.x ?? 0)} y=${Math.round(b.y ?? 0)}`
      ),
      "",
      "── Motion drawings ──",
      `count: ${motionDrawings.length}`,
      ...motionDrawings.map((d, i) => {
        const attached = d.attachedEntityId || d.attachedPlayerId || "?";
        const pts = d.points || [];
        const first = pts[0];
        const last = pts[pts.length - 1];
        return [
          `  [${i}] entity=${attached} pts=${pts.length} stepStart=${d.stepStartMs ?? "?"}ms stepEnd=${d.stepEndMs ?? "?"}ms src=${d.source || "?"}`,
          first ? `       first pt: x=${Math.round(first.x)} y=${Math.round(first.y)}` : null,
          last && pts.length > 1 ? `       last pt:  x=${Math.round(last.x)} y=${Math.round(last.y)}` : null,
        ].filter(Boolean).join("\n");
      }),
      pathBounds
        ? `  path extent: x ${Math.round(pathBounds.left)}→${Math.round(pathBounds.right)}  y ${Math.round(pathBounds.top)}→${Math.round(pathBounds.bottom)}`
        : "  path extent: (no points)",
      "",
      "── Capture frame (contentBounds) ──",
      cb
        ? `x=${cb.x?.toFixed(1)} y=${cb.y?.toFixed(1)} w=${cb.width?.toFixed(1)} h=${cb.height?.toFixed(1)}`
        : "(not yet computed — hidden Slate not mounted or not ready)",
      "",
      "── Canvas metrics ──",
      metrics
        ? `stage ${metrics.stageWidth}x${metrics.stageHeight}  capture ${metrics.captureWidth}x${metrics.captureHeight}  stageReady=${metrics.stageReady}  ready=${metrics.ready}`
        : "(no hidden Slate mounted)",
      "",
      "── GIF phase ──",
      `phase: ${gifPhase}`,
      `error: ${gifError || "(none)"}`,
      "",
      "── Export logs ──",
      ...getGifExportDebugLogs(400),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }, [play, playEmbed, editorMode, isDrawing, animation, tracks, playersById, ballsById,
      motionDrawings, pathBounds, cb, metrics, gifPhase, gifError]);

  const ROW = "flex items-start gap-2 text-xs";
  const LABEL = "shrink-0 font-semibold w-40";
  const mono = (v) => (
    <span style={{ color: "var(--adm-text)", fontFamily: "monospace", fontSize: 11 }}>{String(v ?? "(none)")}</span>
  );
  const badge = (text, ok) => (
    <span style={{
      display: "inline-block", padding: "1px 7px", borderRadius: 999,
      fontSize: 11, fontWeight: 700,
      background: ok ? "var(--adm-badge-green-bg)" : "var(--adm-danger-dim)",
      color: ok ? "var(--adm-badge-green-text)" : "var(--adm-danger)",
      border: `1px solid ${ok ? "var(--adm-border)" : "var(--adm-danger)"}`,
    }}>{text}</span>
  );

  return (
    <div
      className="flex flex-col gap-2 rounded-[var(--adm-radius-sm)] px-3 py-2.5 mt-1"
      style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border2)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>GIF rendering debug</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded px-2 py-0.5 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border2)", color: "var(--adm-text2)" }}
        >
          {copied ? "Copied ✓" : "Copy all"}
        </button>
      </div>

      {/* Embedded play */}
      <div className={ROW}>
        <span className={LABEL} style={{ color: "var(--adm-muted)" }}>Embedded play</span>
        {playEmbed ? mono(`${playEmbed.title} (${playEmbed.id})`) : mono(null)}
      </div>
      <div className={ROW}>
        <span className={LABEL} style={{ color: "var(--adm-muted)" }}>GIF URL</span>
        {playEmbed?.gifUrl
          ? <a href={playEmbed.gifUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--adm-accent)", fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>{playEmbed.gifUrl}</a>
          : mono(null)}
      </div>

      {play && (
        <>
          <div style={{ borderTop: "1px solid var(--adm-border)", margin: "2px 0" }} />

          {/* Play identity */}
          <div className={ROW}>
            <span className={LABEL} style={{ color: "var(--adm-muted)" }}>Source play</span>
            {mono(`${play.title} (${play.id})`)}
          </div>
          <div className={ROW}>
            <span className={LABEL} style={{ color: "var(--adm-muted)" }}>editorMode</span>
            <span className="flex items-center gap-2">
              {mono(editorMode)}
              {isDrawing ? badge("drawing ✓", true) : badge("keyframe", true)}
            </span>
          </div>
          <div className={ROW}>
            <span className={LABEL} style={{ color: "var(--adm-muted)" }}>drawingMode prop</span>
            {isDrawing ? badge("true ✓", true) : badge("false", true)}
          </div>
          <div className={ROW}>
            <span className={LABEL} style={{ color: "var(--adm-muted)" }}>Duration</span>
            {mono(animation?.durationMs != null ? `${animation.durationMs} ms` : null)}
          </div>

          {/* Tracks */}
          <div className={ROW}>
            <span className={LABEL} style={{ color: "var(--adm-muted)" }}>Tracks</span>
            <span className="flex flex-col gap-0.5">
              {Object.keys(tracks).length === 0
                ? <span style={{ color: "var(--adm-muted)", fontFamily: "monospace", fontSize: 11 }}>(none)</span>
                : Object.entries(tracks).map(([id, track]) => {
                    const kfs = track?.keyframes || [];
                    return (
                      <span key={id} style={{ fontFamily: "monospace", fontSize: 11, color: "var(--adm-text2)" }}>
                        {id}: {kfs.length} kf{kfs.length !== 1 ? "s" : ""}
                        {kfs.length ? ` [${kfs.map((k) => `${Math.round(k.timeMs)}ms(${Math.round(k.x)},${Math.round(k.y)})`).join(" ")}]` : ""}
                      </span>
                    );
                  })}
            </span>
          </div>

          {/* Player start positions */}
          <div className={ROW}>
            <span className={LABEL} style={{ color: "var(--adm-muted)" }}>Player start pos</span>
            <span className="flex flex-col gap-0.5">
              {[...Object.entries(playersById), ...Object.entries(ballsById)].length === 0
                ? <span style={{ color: "var(--adm-muted)", fontFamily: "monospace", fontSize: 11 }}>(none)</span>
                : <>
                    {Object.entries(playersById).map(([id, p]) => (
                      <span key={id} style={{ fontFamily: "monospace", fontSize: 11, color: "var(--adm-text2)" }}>
                        {id} #{p.number ?? "?"}: x={Math.round(p.x ?? 0)} y={Math.round(p.y ?? 0)}
                      </span>
                    ))}
                    {Object.entries(ballsById).map(([id, b]) => (
                      <span key={id} style={{ fontFamily: "monospace", fontSize: 11, color: "var(--adm-text2)" }}>
                        {id} (ball): x={Math.round(b.x ?? 0)} y={Math.round(b.y ?? 0)}
                      </span>
                    ))}
                  </>}
            </span>
          </div>

          {/* Motion drawings */}
          <div className={ROW}>
            <span className={LABEL} style={{ color: "var(--adm-muted)" }}>Motion drawings</span>
            <span className="flex flex-col gap-0.5">
              {motionDrawings.length === 0
                ? <span style={{ color: isDrawing ? "var(--adm-danger)" : "var(--adm-muted)", fontFamily: "monospace", fontSize: 11 }}>
                    {isDrawing ? "⚠ 0 — no motion paths!" : "(none)"}
                  </span>
                : motionDrawings.map((d, i) => {
                    const attached = d.attachedEntityId || d.attachedPlayerId || "?";
                    const pts = d.points || [];
                    const first = pts[0];
                    const last = pts[pts.length - 1];
                    return (
                      <span key={i} style={{ fontFamily: "monospace", fontSize: 11, color: "var(--adm-text2)" }}>
                        [{i}] {attached} pts={pts.length} {d.stepStartMs ?? "?"}→{d.stepEndMs ?? "?"}ms
                        {first ? ` start(${Math.round(first.x)},${Math.round(first.y)})` : ""}
                        {last && pts.length > 1 ? ` end(${Math.round(last.x)},${Math.round(last.y)})` : ""}
                      </span>
                    );
                  })}
              {pathBounds && (
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--adm-muted)" }}>
                  path extent x:{Math.round(pathBounds.left)}→{Math.round(pathBounds.right)} y:{Math.round(pathBounds.top)}→{Math.round(pathBounds.bottom)}
                </span>
              )}
            </span>
          </div>
          <div className={ROW}>
            <span className={LABEL} style={{ color: "var(--adm-muted)" }}>Annotation drawings</span>
            {mono(annotationDrawings.length)}
          </div>
        </>
      )}

      {/* Capture frame */}
      <div style={{ borderTop: "1px solid var(--adm-border)", margin: "2px 0" }} />
      <div className={ROW}>
        <span className={LABEL} style={{ color: "var(--adm-muted)" }}>Capture frame</span>
        {cb
          ? <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--adm-text2)" }}>
              x={cb.x?.toFixed(1)} y={cb.y?.toFixed(1)} w={cb.width?.toFixed(1)} h={cb.height?.toFixed(1)}
            </span>
          : <span style={{ color: "var(--adm-muted)", fontFamily: "monospace", fontSize: 11 }}>
              {metrics ? "(computed when Slate mounts)" : "(no hidden Slate mounted)"}
            </span>}
      </div>

      {/* Canvas metrics */}
      <div className={ROW}>
        <span className={LABEL} style={{ color: "var(--adm-muted)" }}>Canvas metrics</span>
        {metrics
          ? <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--adm-text2)" }}>
              stage {metrics.stageWidth}×{metrics.stageHeight} · capture {metrics.captureWidth}×{metrics.captureHeight} · {metrics.stageReady ? badge("ready", true) : badge("not ready", false)}
            </span>
          : <span style={{ color: "var(--adm-muted)", fontFamily: "monospace", fontSize: 11 }}>(no hidden Slate mounted)</span>}
      </div>
      <div className={ROW}>
        <span className={LABEL} style={{ color: "var(--adm-muted)" }}>GIF phase</span>
        {mono(gifPhase)}
      </div>
      {gifError && (
        <div className={ROW}>
          <span className={LABEL} style={{ color: "var(--adm-danger)" }}>Error</span>
          <span style={{ color: "var(--adm-danger)", fontFamily: "monospace", fontSize: 11 }}>{gifError}</span>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminEmailPage() {
  const { isOwner } = useAdmin();
  const navigate = useNavigate();

  const [filterGroups, setFilterGroups] = useState([{ ...EMPTY_FILTER_GROUP }]);
  const [extraRecipients, setExtraRecipients] = useState([]);

  const [audienceData, setAudienceData] = useState(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [audienceError, setAudienceError] = useState("");

  const [subject, setSubject] = useState("");
  const [subheader, setSubheader] = useState("");
  const [body, setBody] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [testEmail, setTestEmail] = useState("founder@coachableplays.com");
  const [editorFocused, setEditorFocused] = useState(false);
  const [activeFormats, setActiveFormats] = useState(EMPTY_ACTIVE_FORMATS);
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null); // cursor position before modal opens
  const imageInputRef = useRef(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  const [previewIndex, setPreviewIndex] = useState(0);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [sendError, setSendError] = useState("");

  // ── Play picker state ───────────────────────────────────────────────────────
  const [plays, setPlays] = useState([]);
  const [folders, setFolders] = useState([]);
  const [playsLoading, setPlaysLoading] = useState(false);
  const [playsError, setPlaysError] = useState("");
  const [showPlayPicker, setShowPlayPicker] = useState(false);
  // "idle" | "mounting" | "generating" | "uploading" | "error"
  const [gifPhase, setGifPhase] = useState("idle");
  const [gifProgress, setGifProgress] = useState(0);
  const [gifError, setGifError] = useState("");
  const [gifDebugCopied, setGifDebugCopied] = useState(false);
  // Single inline play embed: { id, title, gifUrl } | null
  const [playEmbed, setPlayEmbed] = useState(null);
  const [slatePlayData, setSlatePlayData] = useState(null);
  const slatePlayRef = useRef(null); // full play object for current generation
  const gifExportRef = useRef(null);
  const lastGifMetricSignatureRef = useRef("");
  const lastGifWaitSecondRef = useRef(-1);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const youtubeId = extractYouTubeId(youtubeUrl);
  const bodyText = useMemo(() => getBroadcastBodyText(body), [body]);
  const canCompose = subject.trim() && bodyText.trim();
  // Allow send when: filter audience was previewed and has matches, OR only extraRecipients are set
  const canSend = canCompose && (
    (audienceData && audienceData.count > 0) ||
    (filterGroups.length === 0 && extraRecipients.length > 0)
  );

  const previewRecipients = audienceData?.preview?.length
    ? audienceData.preview
    : extraRecipients.length > 0
    ? extraRecipients
    : [PLACEHOLDER_RECIPIENT];
  const clampedIndex = Math.min(previewIndex, previewRecipients.length - 1);
  const currentPreviewRecipient = previewRecipients[clampedIndex];

  const previewHtml = useMemo(
    () =>
      buildBroadcastEmailHtml({
        subheader,
        body,
        youtubeUrl,
        playEmbed,
        recipientName: currentPreviewRecipient.name || "",
        recipientTeam: currentPreviewRecipient.team_name || "",
        recipientEmail: currentPreviewRecipient.email || "",
      }),
    [subheader, body, youtubeUrl, playEmbed, currentPreviewRecipient]
  );

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    // Rehydrate {{playEmbed}} sentinel back to a visual chip when syncing body to DOM
    const chipHtml = playEmbed
      ? `<span data-play-embed="1" data-embed-title="${escapeHtml(playEmbed.title)}" contenteditable="false" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:var(--adm-accent-dim,#fff3e8);border:1px solid color-mix(in srgb,var(--adm-accent,#f97316) 30%,transparent);color:var(--adm-accent,#f97316);font-size:12px;font-weight:600;cursor:default;user-select:none;">🎬 ${escapeHtml(playEmbed.title)} ✓</span>`
      : PLAY_EMBED_SENTINEL;
    const rehydrated = String(body || "").replace(PLAY_EMBED_TOKEN_REGEX, chipHtml);
      if (editor.innerHTML !== rehydrated) {
        editor.innerHTML = rehydrated;
      }
  }, [body, playEmbed]);

  useEffect(() => {
    if (!playEmbed) return;
    logGifExport(
      `AdminEmailPage: playEmbed state set title="${playEmbed.title || "Play"}" ` +
      `gifUrl=${playEmbed.gifUrl || ""} bodyHasSentinel=${hasPlayEmbedToken(body)}`
    );
  }, [playEmbed, body]);

  // Fetch plays + folders once on mount
  useEffect(() => {
    setPlaysLoading(true);
    setPlaysError("");
    Promise.all([
      // ?picker=1 returns all platform plays (no playbook-section exclusion)
      adminApi("/admin/plays?picker=1"),
      adminApi("/admin/platform-folders"),
    ])
      .then(([playsRes, foldersRes]) => {
        setPlays(playsRes.plays || []);
        setFolders(foldersRes.folders || []);
      })
      .catch((err) => {
        setPlaysError(err?.message || "Failed to load plays");
      })
      .finally(() => setPlaysLoading(false));
  }, []);

  /**
   * Poll for Slate canvas readiness then generate, upload and insert the GIF.
   * Triggered when gifPhase transitions to "mounting".
   */
  useEffect(() => {
    if (!slatePlayData || gifPhase !== "mounting") return;

    let cancelled = false;
    const POLL_MS = 200;
    const TIMEOUT_MS = 10_000;
    const start = Date.now();
    lastGifMetricSignatureRef.current = "";
    lastGifWaitSecondRef.current = -1;
    logGifExport(`AdminEmailPage: mounting hidden Slate for "${slatePlayRef.current?.title || "Play"}"`);

    const poll = setInterval(async () => {
      if (cancelled) return;

      const api = gifExportRef.current;
      const metrics = api?.getCanvasMetrics?.();
      const elapsedMs = Date.now() - start;
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const isReady = Boolean(api?.generateGIF && metrics?.stageReady);
      const metricSignature = metrics
        ? `${metrics.stageWidth || 0}x${metrics.stageHeight || 0}|${metrics.captureWidth || 0}x${metrics.captureHeight || 0}|${isReady ? "ready" : "waiting"}`
        : "no-metrics";
      if (metricSignature !== lastGifMetricSignatureRef.current) {
        lastGifMetricSignatureRef.current = metricSignature;
        logGifExport(
          `AdminEmailPage: hidden Slate metrics stage=${metrics?.stageWidth || 0}x${metrics?.stageHeight || 0} ` +
          `capture=${metrics?.captureWidth || 0}x${metrics?.captureHeight || 0} stageReady=${Boolean(metrics?.stageReady)}`
        );
      } else if (elapsedSec !== lastGifWaitSecondRef.current && elapsedSec > 0) {
        lastGifWaitSecondRef.current = elapsedSec;
        logGifExport(
          `AdminEmailPage: still waiting for hidden Slate after ${elapsedSec}s ` +
          `(stage=${metrics?.stageWidth || 0}x${metrics?.stageHeight || 0}, stageReady=${Boolean(metrics?.stageReady)})`
        );
      }
      // Proceed once the Konva stage has real pixel dimensions. contentBounds and
      // captureWidth are computed fresh inside recordGIFExport so they don't need
      // to be valid here.
      if (!isReady) {
        if (elapsedMs > TIMEOUT_MS) {
          clearInterval(poll);
          if (!cancelled) {
            setGifPhase("error");
            const metricText = metrics
              ? ` Stage ${metrics.stageWidth || 0}x${metrics.stageHeight || 0}, capture ${metrics.captureWidth || 0}x${metrics.captureHeight || 0}.`
              : "";
            const message = `GIF export failed after 10 seconds while waiting for a valid hidden capture surface.${metricText}`;
            logGifExport(message);
            setGifError(message);
          }
        }
        return;
      }

      clearInterval(poll);
      if (cancelled) return;

      logGifExport("AdminEmailPage: hidden Slate ready, starting GIF generation");
      setGifPhase("generating");
      try {
        // Give the play one extra tick to finish loading
        await new Promise((r) => setTimeout(r, 400));
        const durationSec = Math.max(1, api.getDurationSec?.() || 10);
        const preset = api.presets.medium;

        const blob = await api.generateGIF(durationSec, {
          fps: preset.fps,
          width: preset.width,
          onProgress: (p) => { if (!cancelled) setGifProgress(p); },
        });

        if (cancelled) return;

        if (!blob) {
          setGifPhase("error");
          setGifError("GIF generation failed — canvas not ready. Try again.");
          return;
        }

        setGifPhase("uploading");
        logGifExport(`AdminEmailPage: GIF blob ready size=${blob.size} bytes, starting upload`);

        // Convert blob → base64 for JSON transport
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const { url } = await adminApi("/admin/email/gif-asset", {
          method: "POST",
          body: JSON.stringify({ gif: base64, playTitle: slatePlayRef.current?.title || "" }),
        });
        logGifExport(`AdminEmailPage: upload complete url=${url || ""}`);

        if (cancelled) return;

        const play = slatePlayRef.current;
        const editor = editorRef.current;

        if (editor) {
          editor.focus();
          const sel = window.getSelection();

          // If a play embed already exists, replace its chip token in place.
          // Otherwise insert the sentinel at the saved cursor position.
          const SENTINEL = PLAY_EMBED_SENTINEL;
          const CHIP_ATTR = "data-play-embed";
          const existingChip = editor.querySelector(`[${CHIP_ATTR}]`);

          if (existingChip) {
            // Replace existing chip with updated one
            existingChip.setAttribute("data-embed-title", play?.title || "Play");
            logGifExport(`AdminEmailPage: updated existing play chip for "${play?.title || "Play"}"`);
          } else {
            // Insert chip at saved cursor (or body end)
            const chipHtml = `<span ${CHIP_ATTR}="1" data-embed-title="${escapeHtml(play?.title || "Play")}" contenteditable="false" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:var(--adm-accent-dim,#fff3e8);border:1px solid color-mix(in srgb,var(--adm-accent,#f97316) 30%,transparent);color:var(--adm-accent,#f97316);font-size:12px;font-weight:600;cursor:default;user-select:none;">🎬 ${escapeHtml(play?.title || "Play")} ✓</span>`;
            if (savedRangeRef.current && editor.contains(savedRangeRef.current.commonAncestorContainer)) {
              sel.removeAllRanges();
              sel.addRange(savedRangeRef.current);
            } else {
              sel.selectAllChildren(editor);
              sel.collapseToEnd();
            }
            document.execCommand("insertHTML", false, ` ${chipHtml} `);
            logGifExport(`AdminEmailPage: inserted new play chip for "${play?.title || "Play"}"`);
          }

          // Serialize body — convert chip back to sentinel token for storage
          const rawHtml = editor.innerHTML;
          const tokenized = rawHtml.replace(
            /<span[^>]*data-play-embed[^>]*>[\s\S]*?<\/span>/gi,
            SENTINEL
          );
          setBody(tokenized);
          logGifExport(
            `AdminEmailPage: body tokenized bodyHasSentinel=${tokenized.includes(SENTINEL)} length=${tokenized.length}`
          );
        } else {
          logGifExport("AdminEmailPage: editor ref missing after upload; play chip was not inserted");
        }

        setPlayEmbed({ id: play?.id, title: play?.title || "Play", gifUrl: url });
        setGifPhase("idle");
        setSlatePlayData(null);
        slatePlayRef.current = null;
        savedRangeRef.current = null;
      } catch (err) {
        if (!cancelled) {
          logGifExport(`AdminEmailPage: generation/upload pipeline failed ${err?.message || String(err)}`);
          setGifPhase("error");
          setGifError(err?.message || "GIF generation failed.");
        }
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [slatePlayData]);

  // ── Editor helpers ───────────────────────────────────────────────────────────

  const updateActiveFormats = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection?.();
    if (!editor || !selection || selection.rangeCount === 0) {
      setActiveFormats(EMPTY_ACTIVE_FORMATS);
      return;
    }
    const { anchorNode, focusNode } = selection;
    const isInsideEditor =
      (anchorNode && editor.contains(anchorNode)) ||
      (focusNode && editor.contains(focusNode));
    if (!isInsideEditor) { setActiveFormats(EMPTY_ACTIVE_FORMATS); return; }

    const formatValue = String(document.queryCommandValue("formatBlock") || "")
      .toLowerCase().replace(/[<>]/g, "");
    const anchorElement = anchorNode?.nodeType === Node.ELEMENT_NODE
      ? anchorNode : anchorNode?.parentElement;

    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      h2: formatValue === "h2",
      quote: formatValue === "blockquote",
      bullets: document.queryCommandState("insertUnorderedList"),
      numbers: document.queryCommandState("insertOrderedList"),
      link: Boolean(anchorElement?.closest?.("a")),
    });
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => updateActiveFormats();
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [updateActiveFormats]);

  const syncBodyFromEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    // Serialize chip spans back to sentinel token
    const raw = editor.innerHTML;
    const tokenized = raw.replace(
      /<span[^>]*data-play-embed[^>]*>[\s\S]*?<\/span>/gi,
      PLAY_EMBED_SENTINEL
    );
    setBody(tokenized);
    // If the sentinel was removed by the user, clear playEmbed state
    if (!hasPlayEmbedToken(tokenized)) {
      setPlayEmbed(null);
    }
    updateActiveFormats();
  }, [updateActiveFormats]);

  const focusEditor = useCallback(() => { editorRef.current?.focus(); }, []);

  const runEditorCommand = useCallback((command, value = null) => {
    focusEditor();
    if (value == null) document.execCommand(command, false);
    else document.execCommand(command, false, value);
    syncBodyFromEditor();
  }, [focusEditor, syncBodyFromEditor]);

  const insertTag = useCallback((tag) => {
    focusEditor();
    insertTextAtCursor(tag);
    syncBodyFromEditor();
  }, [focusEditor, syncBodyFromEditor]);

  /**
   * Inserts an inline link token at the cursor. The user edits it directly in the body.
   * Format: {{URL: Display text}} — rendered as <a> when the email is built.
   */
  const handleLinkInsert = useCallback(() => {
    focusEditor();
    insertTextAtCursor("{{coachableplays.com: Link Text}}");
    syncBodyFromEditor();
  }, [focusEditor, syncBodyFromEditor]);

  /**
   * Strips all formatting from the editor body, converting content to plain paragraphs.
   */
  const handleClearFormatting = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const text = (editor.innerText || editor.textContent || "").trim();
    editor.focus();
    editor.innerHTML = text
      ? text.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`).join("")
      : "";
    syncBodyFromEditor();
  }, [syncBodyFromEditor]);

  /**
   * Handle image file selection — reads as base64, uploads to R2, inserts <img> at cursor.
   * @param {React.ChangeEvent<HTMLInputElement>} event
   */
  const handleImageFileSelected = useCallback(async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageUploadError("Only image files are supported.");
      return;
    }
    setImageUploading(true);
    setImageUploadError("");
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await adminApi("/admin/email/image-asset", {
        method: "POST",
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      });
      focusEditor();
      insertHtmlAtCursor(`<img src="${url}" style="display:block;max-width:100%;border-radius:4px;margin:0 0 18px;">`);
      syncBodyFromEditor();
    } catch (err) {
      setImageUploadError(err?.message || "Image upload failed.");
    } finally {
      setImageUploading(false);
    }
  }, [focusEditor, syncBodyFromEditor]);

  const handlePaste = useCallback((event) => {
    const html = event.clipboardData?.getData("text/html") || "";
    if (!html) return;
    event.preventDefault();
    focusEditor();
    insertHtmlAtCursor(sanitizeBroadcastBodyMarkup(html));
    syncBodyFromEditor();
  }, [focusEditor, syncBodyFromEditor]);

  // ── Play picker ─────────────────────────────────────────────────────────────

  const handleOpenPlayPicker = useCallback(() => {
    // Save cursor position so we can insert at it after generation
    const editor = editorRef.current;
    const sel = window.getSelection?.();
    if (editor && sel?.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      } else {
        savedRangeRef.current = null;
      }
    } else {
      savedRangeRef.current = null;
    }
    setShowPlayPicker(true);
  }, []);

  const handleSelectPlay = useCallback((play) => {
    setShowPlayPicker(false);
    if (!play?.playData) {
      setGifPhase("error");
      setGifError("This play has no animation data.");
      return;
    }
    setGifDebugCopied(false);
    slatePlayRef.current = play;
    setGifError("");
    setGifProgress(0);
    setSlatePlayData(play.playData);
    setGifPhase("mounting");
  }, []);

  const handleCopyGifDebug = useCallback(async () => {
    const play = slatePlayRef.current;
    const playData = play?.playData;
    const innerPlay = playData?.play;
    const animation = innerPlay?.animation;
    const motionDrawings = innerPlay?.motionDrawings || [];
    const annotationDrawings = innerPlay?.annotationDrawings || [];
    const tracks = animation?.tracks || {};
    const metrics = gifExportRef.current?.getCanvasMetrics?.() || null;

    const trackSummary = Object.entries(tracks).map(([id, track]) => {
      const kfs = track?.keyframes || [];
      return `  ${id}: ${kfs.length} keyframes${kfs.length ? ` [${kfs.map((k) => `${Math.round(k.timeMs)}ms`).join(", ")}]` : ""}`;
    });

    const motionSummary = motionDrawings.map((d, i) => {
      const attached = d.attachedEntityId || d.attachedPlayerId || "(none)";
      return (
        `  [${i}] attached=${attached} points=${d.points?.length ?? 0}` +
        ` stepStartMs=${d.stepStartMs ?? "?"} stepEndMs=${d.stepEndMs ?? "?"}` +
        ` source=${d.source || "?"}`
      );
    });

    const sections = [
      "=== GIF DEBUG DUMP ===",
      "",
      "── Play ──",
      `title: ${play?.title || "(none)"}`,
      `id: ${play?.id || "(none)"}`,
      `editorMode: ${innerPlay?.meta?.editorMode || "(none)"}`,
      `drawingModePropPassed: ${innerPlay?.meta?.editorMode === "drawing"}`,
      "",
      "── Animation ──",
      `durationMs: ${animation?.durationMs ?? "(none)"}`,
      `trackCount: ${Object.keys(tracks).length}`,
      ...trackSummary,
      "",
      "── Motion drawings ──",
      `count: ${motionDrawings.length}`,
      ...motionSummary,
      "",
      "── Annotation drawings ──",
      `count: ${annotationDrawings.length}`,
      "",
      "── Canvas metrics ──",
      metrics
        ? `stage: ${metrics.stageWidth}x${metrics.stageHeight}  capture: ${metrics.captureWidth}x${metrics.captureHeight}  stageReady: ${metrics.stageReady}`
        : "(gifExportRef not populated)",
      "",
      "── GIF phase ──",
      `phase: ${gifPhase}`,
      `error: ${gifError || "(none)"}`,
      "",
      "── Export logs ──",
      ...(getGifExportDebugLogs(400).length ? getGifExportDebugLogs(400) : ["(no logs)"]),
    ];

    const payload = sections.join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      setGifDebugCopied(true);
      setTimeout(() => setGifDebugCopied(false), 1500);
    } catch {
      setGifDebugCopied(false);
    }
  }, [gifPhase, gifError]);

  // ── Audience / send ─────────────────────────────────────────────────────────

  /** Update a single field on a filter group by index. */
  const updateFilterGroup = useCallback((idx, key, value) => {
    setFilterGroups((prev) => prev.map((g, i) => i === idx ? { ...g, [key]: value } : g));
    setAudienceData(null);
  }, []);

  const addFilterGroup = useCallback(() => {
    setFilterGroups((prev) => [...prev, { ...EMPTY_FILTER_GROUP }]);
    setAudienceData(null);
  }, []);

  const removeFilterGroup = useCallback((idx) => {
    setFilterGroups((prev) => prev.filter((_, i) => i !== idx));
    setAudienceData(null);
  }, []);

  const handlePreviewAudience = useCallback(async () => {
    setLoadingAudience(true);
    setAudienceData(null);
    setAudienceError("");
    setPreviewIndex(0);
    try {
      const data = await adminApi("/admin/email/preview-recipients", {
        method: "POST",
        body: JSON.stringify({ filterGroups, extraRecipients }),
      });
      setAudienceData(data);
    } catch (err) {
      setAudienceError(err.message || "Failed to load recipients");
    } finally {
      setLoadingAudience(false);
    }
  }, [filterGroups, extraRecipients]);

  const handleSendTest = useCallback(async () => {
    if (!testEmail.trim()) { setSendError("Enter a test email address first"); return; }
    setSending(true); setSendResult(null); setSendError("");
    try {
      const data = await adminApi("/admin/email/send", {
        method: "POST",
        body: JSON.stringify({ subject, subheader, body, youtubeUrl, playEmbed: playEmbed || undefined, filterGroups, extraRecipients, previewTo: testEmail.trim() }),
      });
      setSendResult({ ...data, testEmail: testEmail.trim() });
    } catch (err) {
      setSendError(err.message || "Test send failed");
    } finally {
      setSending(false);
    }
  }, [subject, subheader, body, youtubeUrl, playEmbed, filterGroups, extraRecipients, testEmail]);

  const handleSendToAll = useCallback(async () => {
    setConfirmOpen(false); setSending(true); setSendResult(null); setSendError("");
    try {
      const data = await adminApi("/admin/email/send", {
        method: "POST",
        body: JSON.stringify({ subject, subheader, body, youtubeUrl, playEmbed: playEmbed || undefined, filterGroups, extraRecipients }),
      });
      setSendResult(data);
    } catch (err) {
      setSendError(err.message || "Broadcast failed");
    } finally {
      setSending(false);
    }
  }, [subject, subheader, body, youtubeUrl, playEmbed, filterGroups, extraRecipients]);

  const isGenerating = gifPhase === "mounting" || gifPhase === "generating" || gifPhase === "uploading";

  if (!isOwner) {
    return (
      <AdminShell>
        <AdminPage>
          <p className="text-sm" style={{ color: "var(--adm-muted)" }}>
            Email composer is only available to the account owner.
          </p>
        </AdminPage>
      </AdminShell>
    );
  }

  return (
    <AdminFlagGate flagName="broadcast_emails">
    <AdminShell>
      <AdminHeader
        title="Email Composer"
        sticky
        actions={
          <AdminBtn onClick={() => navigate("/admin/email/recurring")}>
            <FiClock className="text-sm" />
            Manage recurring
          </AdminBtn>
        }
      />

      <AdminPage wide>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="flex flex-col gap-6">

            {/* Audience */}
            <AdminSection
              title="Audience"
              subtitle="Add specific recipients and/or filter groups. All groups are unioned together."
            >
              <AdminCard>
                <div className="flex flex-col gap-5">
                  {/* Outlook-style individual recipient picker */}
                  <RecipientPicker
                    recipients={extraRecipients}
                    onChange={(next) => { setExtraRecipients(next); setAudienceData(null); }}
                    audienceEmails={audienceData?.preview?.map((r) => r.email) ?? []}
                  />

                  {/* Filter groups */}
                  {filterGroups.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <div style={{ borderTop: "1px solid var(--adm-border)" }} />
                      <span className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>
                        Audience filters {filterGroups.length > 1 ? `(${filterGroups.length} groups — recipients from all groups are combined)` : ""}
                      </span>

                      {filterGroups.map((group, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col gap-3 rounded-[var(--adm-radius-sm)] p-3"
                          style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
                        >
                          {/* Group header */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold" style={{ color: "var(--adm-text2)" }}>
                              {filterGroups.length > 1 ? `Group ${idx + 1}` : "Filter"}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFilterGroup(idx)}
                              className="flex h-5 w-5 items-center justify-center rounded transition-opacity hover:opacity-70"
                              style={{ color: "var(--adm-muted)" }}
                              aria-label="Remove filter group"
                            >
                              <FiX className="text-xs" />
                            </button>
                          </div>

                          {/* Dropdowns */}
                          <div className="flex flex-wrap items-end gap-3">
                            <AdminSelect
                              label="User type"
                              value={group.userType}
                              onChange={(e) => updateFilterGroup(idx, "userType", e.target.value)}
                              className="min-w-[150px]"
                            >
                              {USER_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </AdminSelect>
                            <AdminSelect
                              label="Sport"
                              value={group.sport}
                              onChange={(e) => updateFilterGroup(idx, "sport", e.target.value)}
                              className="min-w-[130px]"
                            >
                              {SPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </AdminSelect>
                          </div>

                          {/* Role checkboxes */}
                          <div className="flex flex-col gap-1">
                            <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
                              Role (leave unchecked for all roles)
                            </span>
                            <div className="flex flex-wrap gap-3">
                              {ROLE_OPTIONS.map((ro) => {
                                const checked = group.roles.includes(ro.value);
                                return (
                                  <label key={ro.value} className="flex cursor-pointer items-center gap-1.5 select-none">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        updateFilterGroup(idx, "roles",
                                          checked
                                            ? group.roles.filter((r) => r !== ro.value)
                                            : [...group.roles, ro.value]
                                        )
                                      }
                                      className="h-3.5 w-3.5 rounded"
                                      style={{ accentColor: "var(--adm-accent)" }}
                                    />
                                    <span className="text-xs" style={{ color: "var(--adm-text)" }}>{ro.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {filterGroups.length === 0 && extraRecipients.length === 0 && (
                    <p className="text-xs font-medium" style={{ color: "var(--adm-danger)" }}>
                      Add at least one filter group or recipient above before sending.
                    </p>
                  )}

                  {/* Actions row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={addFilterGroup}
                      className="flex items-center gap-1.5 rounded-[var(--adm-radius-sm)] px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: "var(--adm-surface2)",
                        border: "1px solid var(--adm-border)",
                        color: "var(--adm-text2)",
                      }}
                    >
                      <FiPlus className="text-xs" />
                      Add filter group
                    </button>

                    <AdminBtn
                      onClick={handlePreviewAudience}
                      disabled={loadingAudience || (filterGroups.length === 0 && extraRecipients.length === 0)}
                    >
                      {loadingAudience ? <AdminSpinner size={14} /> : <FiUsers className="text-sm" />}
                      {loadingAudience ? "Loading..." : "Preview recipients"}
                    </AdminBtn>
                  </div>

                  {audienceError && <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{audienceError}</p>}

                  {audienceData && (
                    <div
                      className="flex flex-col gap-1 rounded-[var(--adm-radius-sm)] px-4 py-3"
                      style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
                    >
                      <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
                        {audienceData.count} recipient{audienceData.count !== 1 ? "s" : ""} match
                      </span>
                      {audienceData.preview.length > 0 && (
                        <p className="text-xs leading-relaxed" style={{ color: "var(--adm-muted)" }}>
                          {audienceData.preview.map((r) => r.email).join(", ")}
                          {audienceData.count > audienceData.preview.length
                            ? ` and ${audienceData.count - audienceData.preview.length} more...`
                            : ""}
                        </p>
                      )}
                      {audienceData.count === 0 && (
                        <p className="text-xs" style={{ color: "var(--adm-muted)" }}>No users match these filters.</p>
                      )}
                    </div>
                  )}
                </div>
              </AdminCard>
            </AdminSection>

            {/* Compose */}
            <AdminSection title="Compose">
              <AdminCard>
                <div className="flex flex-col gap-5">
                  <AdminInput label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject..." />
                  <AdminInput label="Subheader (optional)" value={subheader} onChange={(e) => setSubheader(e.target.value)} placeholder="Short line above the main body..." />

                  {/* Body */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className={LABEL_CLASS} style={{ color: "var(--adm-muted)" }}>Body</label>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { label: "First name", tag: "{{firstName}}" },
                          { label: "Last name", tag: "{{lastName}}" },
                          { label: "Team", tag: "{{teamName}}" },
                          { label: "Email", tag: "{{email}}" },
                        ].map(({ label, tag }) => (
                          <button
                            key={tag} type="button" onClick={() => insertTag(tag)}
                            className={TOOLBAR_BTN_CLASS}
                            style={{
                              backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)",
                              border: "1px solid color-mix(in srgb, var(--adm-accent) 30%, transparent)",
                            }}
                          >
                            + {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Formatting toolbar + Play button */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "bold", label: "B", onClick: () => runEditorCommand("bold") },
                        { key: "italic", label: "I", onClick: () => runEditorCommand("italic") },
                        { key: "underline", label: "U", onClick: () => runEditorCommand("underline") },
                        { key: "h2", label: "H2", onClick: () => runEditorCommand("formatBlock", "<h2>") },
                        { key: "quote", label: "Quote", onClick: () => runEditorCommand("formatBlock", "<blockquote>") },
                        { key: "bullets", label: "Bullets", onClick: () => runEditorCommand("insertUnorderedList") },
                        { key: "numbers", label: "Numbers", onClick: () => runEditorCommand("insertOrderedList") },
                        { key: "link", label: "Link", onClick: handleLinkInsert },
                        { key: "rule", label: "Rule", onClick: () => { focusEditor(); insertHtmlAtCursor("<hr>"); syncBodyFromEditor(); } },
                        { label: "Clear", onClick: handleClearFormatting },
                      ].map((btn) => (
                        <button
                          key={btn.label} type="button" onClick={btn.onClick}
                          className={TOOLBAR_BTN_CLASS}
                          style={{
                            backgroundColor: activeFormats[btn.key] ? "var(--adm-accent)" : "var(--adm-surface2)",
                            color: activeFormats[btn.key] ? "#ffffff" : "var(--adm-text)",
                            border: activeFormats[btn.key] ? "1px solid var(--adm-accent)" : "1px solid var(--adm-border)",
                          }}
                        >
                          {btn.label}
                        </button>
                      ))}

                      {/* + Play button */}
                      <button
                        type="button"
                        onClick={handleOpenPlayPicker}
                        disabled={isGenerating}
                        className={TOOLBAR_BTN_CLASS}
                        style={{
                          backgroundColor: "var(--adm-accent-dim)",
                          color: "var(--adm-accent)",
                          border: "1px solid color-mix(in srgb, var(--adm-accent) 30%, transparent)",
                          opacity: isGenerating ? 0.5 : 1,
                        }}
                      >
                        <span className="flex items-center gap-1">
                          <FiFilm className="text-xs" />
                          + Play
                        </span>
                      </button>

                      {/* + Image button */}
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={imageUploading}
                        className={TOOLBAR_BTN_CLASS}
                        style={{
                          backgroundColor: "var(--adm-surface2)",
                          color: "var(--adm-text)",
                          border: "1px solid var(--adm-border)",
                          opacity: imageUploading ? 0.5 : 1,
                        }}
                      >
                        <span className="flex items-center gap-1">
                          {imageUploading ? <AdminSpinner size={10} /> : <FiImage className="text-xs" />}
                          {imageUploading ? "Uploading…" : "+ Image"}
                        </span>
                      </button>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageFileSelected}
                      />
                    </div>

                    {/* Contenteditable body */}
                    <div
                      className="relative overflow-hidden rounded-[var(--adm-radius-sm)]"
                      style={{
                        backgroundColor: "var(--adm-surface)",
                        border: `1px solid ${editorFocused ? "var(--adm-accent)" : "var(--adm-border2)"}`,
                      }}
                    >
                      {!bodyText && (
                        <div
                          className="pointer-events-none absolute left-3.5 top-3.5 text-sm"
                          style={{ color: "var(--adm-muted)" }}
                        >
                          Write your email here. Use the toolbar to format, add links, or insert a play GIF.
                        </div>
                      )}
                      <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onFocus={() => { setEditorFocused(true); updateActiveFormats(); }}
                        onBlur={() => { setEditorFocused(false); setTimeout(updateActiveFormats, 0); }}
                        onInput={syncBodyFromEditor}
                        onPaste={handlePaste}
                        className="min-h-[220px] px-3.5 py-3 text-sm outline-none"
                        style={{ color: "var(--adm-text)" }}
                      />
                    </div>

                    {/* Embedded play chip */}
                    {playEmbed && (
                      <div className="flex items-center gap-2">
                        <div
                          className="flex items-center gap-1.5 rounded-full px-3 py-1"
                          style={{
                            backgroundColor: "var(--adm-badge-green-bg)",
                            border: "1px solid var(--adm-border)",
                          }}
                        >
                          <FiFilm className="text-xs shrink-0" style={{ color: "var(--adm-badge-green-text)" }} />
                          <span className="text-xs font-semibold" style={{ color: "var(--adm-badge-green-text)" }}>
                            {playEmbed.title}
                          </span>
                          <FiCheck className="text-xs shrink-0" style={{ color: "var(--adm-badge-green-text)" }} />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPlayEmbed(null);
                            setBody((prev) => String(prev || "").replace(PLAY_EMBED_TOKEN_REGEX, "").trim());
                          }}
                          className="text-xs transition-opacity hover:opacity-70"
                          style={{ color: "var(--adm-muted)" }}
                          title="Remove play embed"
                        >
                          <FiX />
                        </button>
                      </div>
                    )}

                    {/* GIF generation progress */}
                    {isGenerating && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs" style={{ color: "var(--adm-muted)" }}>
                          <span className="flex items-center gap-1.5">
                            <AdminSpinner size={12} />
                            {gifPhase === "mounting" ? "Loading play…"
                              : gifPhase === "generating" ? "Generating GIF…"
                              : "Uploading…"}
                          </span>
                          {gifPhase === "generating" && (
                            <span>{Math.round(gifProgress * 100)}%</span>
                          )}
                        </div>
                        {gifPhase === "generating" && (
                          <div className="h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--adm-border2)" }}>
                            <div
                              className="h-full rounded-full transition-[width] duration-150"
                              style={{ width: `${Math.round(gifProgress * 100)}%`, backgroundColor: "var(--adm-accent)" }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {imageUploadError && (
                      <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{imageUploadError}</p>
                    )}

                    {gifPhase === "error" && gifError && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{gifError}</p>
                        <div>
                          <button
                            type="button"
                            onClick={handleCopyGifDebug}
                            className="rounded-lg border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                            style={{
                              borderColor: "var(--adm-border)",
                              color: "var(--adm-text)",
                              backgroundColor: "var(--adm-surface2)",
                            }}
                          >
                            {gifDebugCopied ? "Copied GIF debug" : "Copy GIF debug"}
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-xs leading-relaxed" style={{ color: "var(--adm-muted)" }}>
                      Formatting is preserved in the sent email. Use + Play to embed a play GIF inline.
                    </p>
                  </div>

                </div>
              </AdminCard>
            </AdminSection>

            {/* Send */}
            <AdminSection title="Send">
              <AdminCard>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <AdminInput
                      label="Test email address"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="founder@coachableplays.com"
                      type="email"
                      className="min-w-[220px]"
                    />
                    <AdminBtn onClick={handleSendTest} disabled={!canCompose || sending} className="self-end">
                      {sending ? <AdminSpinner size={14} /> : <FiMail className="text-sm" />}
                      Send test
                    </AdminBtn>
                  </div>

                  <div style={{ borderTop: "1px solid var(--adm-border)" }} />

                  {sendError && <p className="text-sm" style={{ color: "var(--adm-danger)" }}>{sendError}</p>}

                  {sendResult && (
                    <div
                      className="rounded-[var(--adm-radius-sm)] px-4 py-3"
                      style={{ backgroundColor: "var(--adm-badge-green-bg)", border: "1px solid var(--adm-border)" }}
                    >
                      {sendResult.preview ? (
                        <p className="text-sm font-semibold" style={{ color: "var(--adm-badge-green-text)" }}>
                          Test sent to {sendResult.testEmail}
                        </p>
                      ) : (
                        <p className="text-sm font-semibold" style={{ color: "var(--adm-badge-green-text)" }}>
                          Sent to {sendResult.sent} recipient{sendResult.sent !== 1 ? "s" : ""}
                          {sendResult.errors?.length > 0 && (
                            <span style={{ color: "var(--adm-danger)" }}>
                              {" "}({sendResult.errors.length} batch error{sendResult.errors.length !== 1 ? "s" : ""})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Debug payload log */}
                  <div
                    className="flex flex-col gap-2 rounded-[var(--adm-radius-sm)] px-3 py-2.5"
                    style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
                  >
                    <span className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>Debug</span>
                    <button
                      type="button"
                      onClick={() => {
                        const payload = {
                          email: { subject, subheader, youtubeUrl, playEmbed },
                          filterGroups,
                          extraRecipients,
                          audience: audienceData
                            ? { count: audienceData.count, preview: audienceData.preview }
                            : null,
                        };
                        // eslint-disable-next-line no-console
                        console.log("[EMAIL DEBUG] Send payload:", JSON.stringify(payload, null, 2));
                      }}
                      className="self-start rounded-[var(--adm-radius-sm)] px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: "var(--adm-surface)",
                        border: "1px solid var(--adm-border2)",
                        color: "var(--adm-text2)",
                        fontFamily: "monospace",
                      }}
                    >
                      Log send payload to console
                    </button>

                    {/* GIF rendering debug — always visible so drawing mode issues are caught early */}
                    <GifDebugPanel
                      playEmbed={playEmbed}
                      slatePlayRef={slatePlayRef}
                      gifExportRef={gifExportRef}
                      gifPhase={gifPhase}
                      gifError={gifError}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    {!audienceData && filterGroups.length > 0 && extraRecipients.length === 0 && (
                      <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
                        Preview recipients first to enable broadcast.
                      </p>
                    )}
                    <AdminBtn
                      variant="primary"
                      onClick={() => setConfirmOpen(true)}
                      disabled={!canSend || sending}
                      className="ml-auto"
                    >
                      {sending ? <AdminSpinner size={14} /> : <FiSend className="text-sm" />}
                      Send to {audienceData ? audienceData.count : filterGroups.length === 0 ? extraRecipients.length : "?"} recipient{((audienceData?.count ?? (filterGroups.length === 0 ? extraRecipients.length : 0)) !== 1) ? "s" : ""}
                    </AdminBtn>
                  </div>
                </div>
              </AdminCard>
            </AdminSection>
          </div>

          {/* Preview panel */}
          <div className="flex flex-col gap-3 lg:sticky lg:top-14">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Preview</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                  disabled={clampedIndex === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--adm-radius-sm)] transition-opacity hover:opacity-70 disabled:opacity-30"
                  style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border2)", color: "var(--adm-text)" }}
                  aria-label="Previous recipient"
                >
                  <FiChevronLeft className="text-sm" />
                </button>
                <span className="min-w-[52px] text-center text-xs font-semibold tabular-nums" style={{ color: "var(--adm-text2)" }}>
                  {clampedIndex + 1} / {previewRecipients.length}
                  {audienceData && audienceData.count > previewRecipients.length && (
                    <span style={{ color: "var(--adm-muted)" }}> of {audienceData.count}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewIndex((i) => Math.min(previewRecipients.length - 1, i + 1))}
                  disabled={clampedIndex >= previewRecipients.length - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--adm-radius-sm)] transition-opacity hover:opacity-70 disabled:opacity-30"
                  style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border2)", color: "var(--adm-text)" }}
                  aria-label="Next recipient"
                >
                  <FiChevronRight className="text-sm" />
                </button>
              </div>
            </div>

            <div
              className="flex flex-col gap-0.5 rounded-[var(--adm-radius-sm)] px-3 py-2"
              style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
            >
              <span className="truncate text-xs font-semibold" style={{ color: "var(--adm-text)" }}>
                {currentPreviewRecipient.name || "-"}
                {!audienceData && <span className="ml-1 font-normal italic" style={{ color: "var(--adm-muted)" }}>(placeholder)</span>}
              </span>
              <span className="truncate text-xs" style={{ color: "var(--adm-muted)" }}>
                {currentPreviewRecipient.email}
                {currentPreviewRecipient.team_name ? ` | ${currentPreviewRecipient.team_name}` : ""}
              </span>
            </div>

            {subject && (
              <div
                className="rounded-[var(--adm-radius-sm)] px-3 py-2"
                style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)" }}
              >
                <span className="text-xs" style={{ color: "var(--adm-muted)" }}>Subject: </span>
                <span className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>{subject}</span>
              </div>
            )}

            <div
              className="overflow-hidden rounded-[var(--adm-radius)]"
              style={{ border: "1px solid var(--adm-border)", height: 540 }}
            >
              <iframe
                srcDoc={previewHtml}
                title="Email preview"
                // Keep scripts disabled in preview. about:srcdoc sandbox warnings are
                // expected noise here and are not the underlying GIF export failure.
                sandbox="allow-same-origin"
                className="h-full w-full border-0 bg-white"
              />
            </div>

            {!audienceData && (
              <p className="text-center text-xs" style={{ color: "var(--adm-muted)" }}>
                Preview recipients to cycle through real users.
              </p>
            )}
          </div>
        </div>
      </AdminPage>

      <ConfirmModal
        open={confirmOpen}
        message={`Send "${subject}" to ${audienceData ? audienceData.count : extraRecipients.length} recipient${((audienceData?.count ?? extraRecipients.length) !== 1) ? "s" : ""}?`}
        subtitle={filterGroups.length === 0
          ? "This will send to the specific recipients listed above only."
          : "This will send the email immediately to all matching users. This cannot be undone."
        }
        confirmLabel="Send now"
        cancelLabel="Cancel"
        onConfirm={handleSendToAll}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Play picker modal */}
      {showPlayPicker && (
        <PlayPickerModal
          plays={plays}
          folders={folders}
          loading={playsLoading}
          error={playsError}
          onSelect={handleSelectPlay}
          onClose={() => setShowPlayPicker(false)}
        />
      )}

      {/* Hidden off-screen Slate for GIF capture — needs real dimensions for Konva */}
      {slatePlayData && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: 1000,
            height: 700,
            overflow: "hidden",
            opacity: 0,
            pointerEvents: "none",
            transform: "translateX(-200vw)",
          }}
        >
          <div style={{ display: "flex", width: "100%", height: "100%" }}>
            <Slate
              adminMode
              gifExportRef={gifExportRef}
              initialPlayData={slatePlayData}
              drawingMode={slatePlayData?.play?.meta?.editorMode === "drawing"}
            />
          </div>
        </div>
      )}
    </AdminShell>
    </AdminFlagGate>
  );
}
