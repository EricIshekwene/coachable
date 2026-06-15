/**
 * Admin page for managing recurring email campaigns.
 * Each campaign has a frequency (weekly / monthly / custom interval), a full
 * broadcast composer with play GIF embed support, and a live countdown to
 * the next scheduled send. The server fires campaigns automatically every 15 minutes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiCheck, FiClock, FiEdit2, FiFilm, FiImage, FiMail,
  FiPause, FiPlay, FiPlus, FiSend, FiTrash2, FiX,
} from "react-icons/fi";
import { useAdmin } from "../../admin/AdminContext";
import { adminApi } from "../../admin/adminTransport";
import AdminFlagGate from "../../admin/AdminFlagGate";
import { AdminShell, AdminHeader, AdminPage } from "../../admin/components";
import {
  Button, Card, Input, Section, Select, Spinner, ConfirmDialog,
} from "../../design-system/components";
import PlayPickerModal from "../../components/PlayPickerModal";
import Slate from "../../features/slate/Slate";
import { SUPPORTED_FIELD_TYPES } from "../../features/slate/hooks/useAdvancedSettings";
import {
  buildBroadcastEmailHtml,
  extractYouTubeId,
  getBroadcastBodyText,
  sanitizeBroadcastBodyMarkup,
} from "../../../shared/broadcastEmailTemplate.js";
import { getLogs as getGifExportDebugLogs, log as logGifExport } from "../../utils/gifExportDebugLogger";

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, "0")}:00 UTC`,
}));

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
    .filter((s) => s !== "Blank")
    .map((s) => ({ value: s, label: s })),
];

const LABEL_CLASS = "text-xs font-semibold";
const TOOLBAR_BTN_CLASS =
  "rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80";

const EMPTY_FORMATS = {
  bold: false, italic: false, underline: false,
  h2: false, quote: false, bullets: false, numbers: false, link: false,
};

const PLAY_EMBED_SENTINEL = "{{playEmbed}}";
const PLAY_EMBED_TOKEN_REGEX = /\{\{playembed\}\}?/gi;
const hasPlayEmbedToken = (v) => /\{\{playembed\}\}?/i.test(String(v || ""));

const EMPTY_FORM = {
  name: "",
  subject: "",
  subheader: "",
  body: "",
  youtubeUrl: "",
  gifUrl: "",
  playEmbed: null,
  audienceUserType: "onboarded",
  audienceSport: "",
  audienceRoles: [],
  frequencyType: "weekly",
  frequencyDayOfWeek: 1,
  frequencyDayOfMonth: 1,
  frequencyIntervalDays: 7,
  frequencyHour: 9,
  active: true,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return a human-readable description of a campaign's schedule.
 * @param {Object} c - Campaign DB row
 * @returns {string}
 */
function describeFrequency(c) {
  const hour = c.frequency_hour ?? 9;
  const timeStr = `${String(hour).padStart(2, "0")}:00 UTC`;
  if (c.frequency_type === "weekly") {
    const day = DAYS_OF_WEEK.find((d) => d.value === c.frequency_day_of_week)?.label ?? "Monday";
    return `Every ${day} at ${timeStr}`;
  }
  if (c.frequency_type === "monthly") {
    const d = c.frequency_day_of_month ?? 1;
    const suffix = d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th";
    return `Monthly on the ${d}${suffix} at ${timeStr}`;
  }
  if (c.frequency_type === "custom") {
    return `Every ${c.frequency_interval_days ?? 7} day${c.frequency_interval_days === 1 ? "" : "s"} at ${timeStr}`;
  }
  return "Unknown";
}

/**
 * Format a millisecond duration into a countdown string.
 * @param {number} ms
 * @returns {string}
 */
function formatCountdown(ms) {
  if (ms <= 0) return "Due now";
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

function escapeHtml(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ── Countdown cell ────────────────────────────────────────────────────────────

/**
 * Renders a live countdown that ticks every second.
 * @param {{ nextSendAt: string|null, active: boolean }} props
 */
function Countdown({ nextSendAt, active }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!nextSendAt || !active) {
      setLabel(active ? "Not scheduled" : "Paused");
      return;
    }
    const tick = () => setLabel(formatCountdown(new Date(nextSendAt) - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextSendAt, active]);

  return <span>{label}</span>;
}

// ── Rich text editor ──────────────────────────────────────────────────────────

/**
 * Inline rich-text body editor with toolbar, merge tag buttons, play embed, and image upload.
 * Serializes play embed chips back to {{playEmbed}} sentinel on every sync.
 *
 * @param {{ value: string, onChange: (html: string) => void,
 *           playEmbed: object|null, onPlayEmbedChange: (embed: object|null) => void,
 *           onInsertPlay: () => void, isGenerating: boolean }} props
 */
function RichBodyEditor({ value, onChange, playEmbed, onPlayEmbedChange, onInsertPlay, isGenerating }) {
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [formats, setFormats] = useState(EMPTY_FORMATS);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  // Sync chip or sentinel into editor DOM whenever body value or playEmbed changes.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const chipHtml = playEmbed
      ? `<span data-play-embed="1" data-embed-title="${escapeHtml(playEmbed.title)}" contenteditable="false" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:var(--adm-accent-dim,#fff3e8);border:1px solid color-mix(in srgb,var(--adm-accent,#f97316) 30%,transparent);color:var(--adm-accent,#f97316);font-size:12px;font-weight:600;cursor:default;user-select:none;">🎬 ${escapeHtml(playEmbed.title)} ✓</span>`
      : PLAY_EMBED_SENTINEL;
    const rehydrated = String(value || "").replace(PLAY_EMBED_TOKEN_REGEX, chipHtml);
    if (el.innerHTML !== rehydrated) el.innerHTML = rehydrated;
  }, [value, playEmbed]);

  const syncFormats = useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection?.();
    if (!el || !sel || sel.rangeCount === 0) { setFormats(EMPTY_FORMATS); return; }
    const anchor = sel.anchorNode;
    const focus = sel.focusNode;
    if (!el.contains(anchor) && !el.contains(focus)) { setFormats(EMPTY_FORMATS); return; }
    const fv = String(document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/[<>]/g, "");
    const anchorEl = anchor?.nodeType === Node.ELEMENT_NODE ? anchor : anchor?.parentElement;
    setFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      h2: fv === "h2",
      quote: fv === "blockquote",
      bullets: document.queryCommandState("insertUnorderedList"),
      numbers: document.queryCommandState("insertOrderedList"),
      link: Boolean(anchorEl?.closest?.("a")),
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", syncFormats);
    return () => document.removeEventListener("selectionchange", syncFormats);
  }, [syncFormats]);

  const sync = useCallback(() => {
    const raw = editorRef.current?.innerHTML ?? "";
    // Serialize chip spans back to sentinel token for storage
    const tokenized = raw.replace(
      /<span[^>]*data-play-embed[^>]*>[\s\S]*?<\/span>/gi,
      PLAY_EMBED_SENTINEL
    );
    onChange(tokenized);
    // If sentinel was deleted by the user, clear the embed
    if (!hasPlayEmbedToken(tokenized)) onPlayEmbedChange?.(null);
    syncFormats();
  }, [onChange, onPlayEmbedChange, syncFormats]);

  const focus = useCallback(() => editorRef.current?.focus(), []);

  const cmd = useCallback((command, val = null) => {
    focus();
    val == null ? document.execCommand(command, false) : document.execCommand(command, false, val);
    sync();
  }, [focus, sync]);

  const insertText = useCallback((text) => {
    focus();
    document.execCommand("insertText", false, text);
    sync();
  }, [focus, sync]);

  const insertLink = useCallback(() => {
    const url = window.prompt("Enter a link URL");
    if (!url?.trim()) return;
    focus();
    const selText = window.getSelection?.()?.toString().trim();
    if (selText) {
      document.execCommand("createLink", false, url.trim());
    } else {
      document.execCommand("insertHTML", false, `<a href="${escapeHtml(url.trim())}">${escapeHtml(url.trim())}</a>`);
    }
    sync();
  }, [focus, sync]);

  const handlePaste = useCallback((e) => {
    const html = e.clipboardData?.getData("text/html") || "";
    if (!html) return;
    e.preventDefault();
    focus();
    document.execCommand("insertHTML", false, sanitizeBroadcastBodyMarkup(html));
    sync();
  }, [focus, sync]);

  /**
   * Handle image file selection — reads as base64, uploads to R2, inserts <img> at cursor.
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  const handleImageFileSelected = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
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
      focus();
      document.execCommand("insertHTML", false, `<img src="${url}" style="display:block;max-width:100%;border-radius:4px;margin:0 0 18px;">`);
      sync();
    } catch (err) {
      setImageUploadError(err?.message || "Image upload failed.");
    } finally {
      setImageUploading(false);
    }
  }, [focus, sync]);

  const TOOLBAR = [
    { key: "bold", label: "B", action: () => cmd("bold") },
    { key: "italic", label: "I", action: () => cmd("italic") },
    { key: "underline", label: "U", action: () => cmd("underline") },
    { key: "h2", label: "H2", action: () => cmd("formatBlock", "<h2>") },
    { key: "quote", label: "Quote", action: () => cmd("formatBlock", "<blockquote>") },
    { key: "bullets", label: "Bullets", action: () => cmd("insertUnorderedList") },
    { key: "numbers", label: "Numbers", action: () => cmd("insertOrderedList") },
    { key: "link", label: "Link", action: insertLink },
    { key: null, label: "Rule", action: () => { focus(); document.execCommand("insertHTML", false, "<hr>"); sync(); } },
    { key: null, label: "Clear", action: () => cmd("removeFormat") },
  ];

  const bodyText = getBroadcastBodyText(value || "");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label className={LABEL_CLASS} style={{ color: "var(--adm-muted)" }}>Body</label>
        <div className="flex flex-wrap gap-1">
          {[
            { label: "First name", tag: "{{firstName}}" },
            { label: "Team", tag: "{{teamName}}" },
          ].map(({ label, tag }) => (
            <button
              key={tag}
              type="button"
              onClick={() => insertText(tag)}
              className={TOOLBAR_BTN_CLASS}
              style={{
                backgroundColor: "var(--adm-accent-dim)",
                color: "var(--adm-accent)",
                border: "1px solid color-mix(in srgb, var(--adm-accent) 30%, transparent)",
              }}
            >
              + {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TOOLBAR.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.action}
            className={TOOLBAR_BTN_CLASS}
            style={{
              backgroundColor: btn.key && formats[btn.key] ? "var(--adm-accent)" : "var(--adm-surface2)",
              color: btn.key && formats[btn.key] ? "#fff" : "var(--adm-text)",
              border: btn.key && formats[btn.key]
                ? "1px solid var(--adm-accent)"
                : "1px solid var(--adm-border)",
            }}
          >
            {btn.label}
          </button>
        ))}

        {/* + Play button */}
        <button
          type="button"
          onClick={onInsertPlay}
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
            {imageUploading ? <Spinner size={10} /> : <FiImage className="text-xs" />}
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

      {imageUploadError && (
        <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{imageUploadError}</p>
      )}

      <div
        className="relative overflow-hidden rounded-[var(--adm-radius-sm)]"
        style={{
          backgroundColor: "var(--adm-surface)",
          border: `1px solid ${focused ? "var(--adm-accent)" : "var(--adm-border2)"}`,
        }}
      >
        {!bodyText && (
          <div
            className="pointer-events-none absolute left-3.5 top-3.5 text-sm"
            style={{ color: "var(--adm-muted)" }}
          >
            Write your email here…
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => { setFocused(true); syncFormats(); }}
          onBlur={() => { setFocused(false); setTimeout(syncFormats, 0); }}
          onInput={sync}
          onPaste={handlePaste}
          className="min-h-[180px] px-3.5 py-3 text-sm outline-none"
          style={{ color: "var(--adm-text)" }}
        />
      </div>
    </div>
  );
}

// ── Campaign composer modal ───────────────────────────────────────────────────

/**
 * Full-screen modal for creating or editing a recurring campaign.
 * Includes play GIF embed support via the hidden Slate canvas.
 *
 * @param {{ campaign: object|null, plays: Array, folders: Array,
 *           playsLoading: boolean, playsError: string,
 *           onClose: () => void, onSaved: (campaign: object) => void }} props
 */
function CampaignModal({ campaign, plays, folders, playsLoading, playsError, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    campaign
      ? {
          name: campaign.name,
          subject: campaign.subject,
          subheader: campaign.subheader ?? "",
          body: campaign.body,
          youtubeUrl: campaign.youtube_url ?? "",
          gifUrl: campaign.gif_url ?? "",
          playEmbed: campaign.play_embed ?? null,
          audienceUserType: campaign.audience_user_type ?? "onboarded",
          audienceSport: campaign.audience_sport ?? "",
          audienceRoles: campaign.audience_roles ?? [],
          frequencyType: campaign.frequency_type,
          frequencyDayOfWeek: campaign.frequency_day_of_week ?? 1,
          frequencyDayOfMonth: campaign.frequency_day_of_month ?? 1,
          frequencyIntervalDays: campaign.frequency_interval_days ?? 7,
          frequencyHour: campaign.frequency_hour ?? 9,
          active: campaign.active ?? true,
        }
      : { ...EMPTY_FORM }
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Play embed / GIF generation state ──────────────────────────────────────
  const [showPlayPicker, setShowPlayPicker] = useState(false);
  // "idle" | "mounting" | "generating" | "uploading" | "error"
  const [gifPhase, setGifPhase] = useState("idle");
  const [gifProgress, setGifProgress] = useState(0);
  const [gifError, setGifError] = useState("");
  const [gifDebugCopied, setGifDebugCopied] = useState(false);
  const [slatePlayData, setSlatePlayData] = useState(null);
  const slatePlayRef = useRef(null);
  const gifExportRef = useRef(null);
  const savedBodyRef = useRef(null); // body snapshot before modal opens, for chip insertion

  const isGenerating = gifPhase === "mounting" || gifPhase === "generating" || gifPhase === "uploading";

  // ── Derived ────────────────────────────────────────────────────────────────
  const youtubeId = extractYouTubeId(form.youtubeUrl);
  const bodyText = getBroadcastBodyText(form.body);
  const canSave = form.name.trim() && form.subject.trim() && bodyText.trim();

  const previewHtml = useMemo(
    () =>
      buildBroadcastEmailHtml({
        subheader: form.subheader,
        body: form.body,
        youtubeUrl: form.youtubeUrl,
        gifUrl: form.gifUrl,
        playEmbed: form.playEmbed,
        recipientName: "Alex Johnson",
        recipientTeam: "Example FC",
      }),
    [form.subheader, form.body, form.youtubeUrl, form.gifUrl, form.playEmbed]
  );

  // ── GIF generation effect (same pipeline as AdminEmailPage) ────────────────
  useEffect(() => {
    if (!slatePlayData || gifPhase !== "mounting") return;

    let cancelled = false;
    const POLL_MS = 200;
    const TIMEOUT_MS = 10_000;
    const start = Date.now();
    logGifExport(`CampaignModal: mounting hidden Slate for "${slatePlayRef.current?.title || "Play"}"`);

    const poll = setInterval(async () => {
      if (cancelled) return;
      const api = gifExportRef.current;
      const metrics = api?.getCanvasMetrics?.();
      const elapsed = Date.now() - start;

      if (!api?.generateGIF || !metrics?.stageReady) {
        if (elapsed > TIMEOUT_MS) {
          clearInterval(poll);
          if (!cancelled) {
            setGifPhase("error");
            setGifError("GIF export timed out waiting for canvas. Try again.");
          }
        }
        return;
      }

      clearInterval(poll);
      if (cancelled) return;

      logGifExport("CampaignModal: canvas ready, generating GIF");
      setGifPhase("generating");
      try {
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

        if (cancelled) return;

        const play = slatePlayRef.current;
        const newEmbed = { id: play?.id, title: play?.title || "Play", gifUrl: url };

        // Insert sentinel at the end of the body (or replace existing one)
        setForm((f) => {
          const hasExisting = hasPlayEmbedToken(f.body);
          const newBody = hasExisting
            ? f.body // sentinel already there, just update embed metadata
            : f.body.trim()
              ? `${f.body}<p>${PLAY_EMBED_SENTINEL}</p>`
              : `<p>${PLAY_EMBED_SENTINEL}</p>`;
          return { ...f, body: newBody, playEmbed: newEmbed };
        });

        setGifPhase("idle");
        setSlatePlayData(null);
        slatePlayRef.current = null;
        logGifExport(`CampaignModal: GIF inserted url=${url}`);
      } catch (err) {
        if (!cancelled) {
          logGifExport(`CampaignModal: pipeline failed ${err?.message || String(err)}`);
          setGifPhase("error");
          setGifError(err?.message || "GIF generation failed.");
        }
      }
    }, POLL_MS);

    return () => { cancelled = true; clearInterval(poll); };
  }, [slatePlayData]);

  // ── Play picker handlers ───────────────────────────────────────────────────

  const handleOpenPlayPicker = useCallback(() => {
    savedBodyRef.current = form.body;
    setShowPlayPicker(true);
  }, [form.body]);

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
    const lines = getGifExportDebugLogs(400);
    const payload = lines.length ? lines.join("\n") : "[GIFEXPORT] no logs captured yet";
    try {
      await navigator.clipboard.writeText(payload);
      setGifDebugCopied(true);
      setTimeout(() => setGifDebugCopied(false), 1500);
    } catch {
      setGifDebugCopied(false);
    }
  }, []);

  // ── Form helpers ───────────────────────────────────────────────────────────

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        subject: form.subject.trim(),
        subheader: form.subheader,
        body: form.body,
        youtube_url: form.youtubeUrl,
        gif_url: form.gifUrl,
        play_embed: form.playEmbed || null,
        audience_user_type: form.audienceUserType,
        audience_sport: form.audienceSport,
        audience_roles: form.audienceRoles,
        frequency_type: form.frequencyType,
        frequency_day_of_week: form.frequencyType === "weekly" ? Number(form.frequencyDayOfWeek) : null,
        frequency_day_of_month: form.frequencyType === "monthly" ? Number(form.frequencyDayOfMonth) : null,
        frequency_interval_days: form.frequencyType === "custom" ? Number(form.frequencyIntervalDays) : null,
        frequency_hour: Number(form.frequencyHour),
        active: form.active,
      };

      let saved;
      if (campaign) {
        saved = await adminApi(`/admin/email/recurring/${campaign.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        saved = await adminApi("/admin/email/recurring", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSaved(saved);
    } catch (err) {
      setError(err.message || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  }, [campaign, form, canSave, onSaved]);

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden" style={{ backgroundColor: "var(--adm-overlay)" }}>
      <div
        className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden mx-auto my-4 rounded-[var(--adm-radius)]"
        style={{ backgroundColor: "var(--adm-bg)" }}
      >
        {/* Modal header */}
        <div
          className="flex h-14 shrink-0 items-center gap-3 px-5"
          style={{ borderBottom: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
        >
          <span className="flex-1 text-base font-semibold" style={{ color: "var(--adm-text)" }}>
            {campaign ? "Edit Campaign" : "New Recurring Campaign"}
          </span>
          <Button onClick={onClose} variant="ghost" className="!p-2"><FiX /></Button>
        </div>

        {/* Modal body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: form */}
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">

            <Section title="Campaign settings">
              <Card>
                <div className="flex flex-col gap-4">
                  <Input
                    label="Campaign name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="e.g. Weekly newsletter"
                  />

                  <div className="flex flex-col gap-2">
                    <label className={LABEL_CLASS} style={{ color: "var(--adm-muted)" }}>Frequency</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "weekly", label: "Weekly" },
                        { value: "monthly", label: "Monthly" },
                        { value: "custom", label: "Custom interval" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => set("frequencyType", opt.value)}
                          className={TOOLBAR_BTN_CLASS}
                          style={{
                            backgroundColor: form.frequencyType === opt.value ? "var(--adm-accent)" : "var(--adm-surface2)",
                            color: form.frequencyType === opt.value ? "#fff" : "var(--adm-text)",
                            border: form.frequencyType === opt.value
                              ? "1px solid var(--adm-accent)"
                              : "1px solid var(--adm-border)",
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {form.frequencyType === "weekly" && (
                      <Select
                        label="Day of week"
                        value={form.frequencyDayOfWeek}
                        onChange={(e) => set("frequencyDayOfWeek", e.target.value)}
                        className="min-w-[140px]"
                      >
                        {DAYS_OF_WEEK.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </Select>
                    )}
                    {form.frequencyType === "monthly" && (
                      <Select
                        label="Day of month"
                        value={form.frequencyDayOfMonth}
                        onChange={(e) => set("frequencyDayOfMonth", e.target.value)}
                        className="min-w-[120px]"
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                      </Select>
                    )}
                    {form.frequencyType === "custom" && (
                      <div className="flex flex-col gap-1">
                        <label className={LABEL_CLASS} style={{ color: "var(--adm-muted)" }}>Every N days</label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={form.frequencyIntervalDays}
                          onChange={(e) => set("frequencyIntervalDays", Math.max(1, Number(e.target.value)))}
                          className="w-24 rounded-[var(--adm-radius-sm)] px-3 py-2 text-sm outline-none"
                          style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border2)", color: "var(--adm-text)" }}
                        />
                      </div>
                    )}
                    <Select
                      label="Send time"
                      value={form.frequencyHour}
                      onChange={(e) => set("frequencyHour", e.target.value)}
                      className="min-w-[130px]"
                    >
                      {HOURS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </Select>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => set("active", !form.active)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                      style={{ backgroundColor: form.active ? "var(--adm-accent)" : "var(--adm-border2)" }}
                      aria-checked={form.active}
                      role="switch"
                    >
                      <span
                        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                        style={{ transform: form.active ? "translateX(22px)" : "translateX(2px)" }}
                      />
                    </button>
                    <span className="text-sm" style={{ color: "var(--adm-text2)" }}>
                      {form.active ? "Active — will send on schedule" : "Paused — no automatic sends"}
                    </span>
                  </div>
                </div>
              </Card>
            </Section>

            <Section title="Audience">
              <Card>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-3">
                    <Select
                      label="User type"
                      value={form.audienceUserType}
                      onChange={(e) => set("audienceUserType", e.target.value)}
                      className="min-w-[160px]"
                    >
                      {USER_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                    <Select
                      label="Sport"
                      value={form.audienceSport}
                      onChange={(e) => set("audienceSport", e.target.value)}
                      className="min-w-[140px]"
                    >
                      {SPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </div>
                  {/* Role checkboxes */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>
                      Role (leave unchecked for all roles)
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {ROLE_OPTIONS.map((ro) => {
                        const checked = (form.audienceRoles || []).includes(ro.value);
                        return (
                          <label key={ro.value} className="flex cursor-pointer items-center gap-1.5 select-none">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const prev = form.audienceRoles || [];
                                set("audienceRoles", checked
                                  ? prev.filter((r) => r !== ro.value)
                                  : [...prev, ro.value]
                                );
                              }}
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
              </Card>
            </Section>

            <Section title="Compose">
              <Card>
                <div className="flex flex-col gap-4">
                  <Input
                    label="Subject"
                    value={form.subject}
                    onChange={(e) => set("subject", e.target.value)}
                    placeholder="Email subject…"
                  />
                  <Input
                    label="Subheader (optional)"
                    value={form.subheader}
                    onChange={(e) => set("subheader", e.target.value)}
                    placeholder="Short line above the body…"
                  />

                  <RichBodyEditor
                    value={form.body}
                    onChange={(html) => set("body", html)}
                    playEmbed={form.playEmbed}
                    onPlayEmbedChange={(embed) => set("playEmbed", embed)}
                    onInsertPlay={handleOpenPlayPicker}
                    isGenerating={isGenerating}
                  />

                  {/* Play embed status chip */}
                  {form.playEmbed && (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-1.5 rounded-full px-3 py-1"
                        style={{ backgroundColor: "var(--adm-badge-green-bg)", border: "1px solid var(--adm-border)" }}
                      >
                        <FiFilm className="text-xs shrink-0" style={{ color: "var(--adm-badge-green-text)" }} />
                        <span className="text-xs font-semibold" style={{ color: "var(--adm-badge-green-text)" }}>
                          {form.playEmbed.title}
                        </span>
                        <FiCheck className="text-xs shrink-0" style={{ color: "var(--adm-badge-green-text)" }} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({
                          ...f,
                          playEmbed: null,
                          body: String(f.body || "").replace(PLAY_EMBED_TOKEN_REGEX, "").trim(),
                        }))}
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
                          <Spinner size={12} />
                          {gifPhase === "mounting" ? "Loading play…"
                            : gifPhase === "generating" ? "Generating GIF…"
                            : "Uploading…"}
                        </span>
                        {gifPhase === "generating" && <span>{Math.round(gifProgress * 100)}%</span>}
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

                  {gifPhase === "error" && gifError && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{gifError}</p>
                      <button
                        type="button"
                        onClick={handleCopyGifDebug}
                        className="self-start rounded-lg border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)", backgroundColor: "var(--adm-surface2)" }}
                      >
                        {gifDebugCopied ? "Copied GIF debug" : "Copy GIF debug"}
                      </button>
                    </div>
                  )}

                  <Input
                    label="YouTube URL (optional)"
                    value={form.youtubeUrl}
                    onChange={(e) => set("youtubeUrl", e.target.value)}
                    placeholder="https://youtube.com/watch?v=…"
                    type="url"
                  />
                  {youtubeId && (
                    <img
                      src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                      alt="YouTube thumbnail"
                      className="h-20 rounded-lg object-cover"
                    />
                  )}

                  <Input
                    label="GIF URL (optional)"
                    value={form.gifUrl}
                    onChange={(e) => set("gifUrl", e.target.value)}
                    placeholder="https://example.com/animation.gif"
                    type="url"
                  />
                  {form.gifUrl && (
                    <img
                      src={form.gifUrl}
                      alt="GIF preview"
                      className="max-h-36 rounded-lg object-contain"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                </div>
              </Card>
            </Section>

            {error && <p className="text-sm" style={{ color: "var(--adm-danger)" }}>{error}</p>}
          </div>

          {/* Right: preview */}
          <div
            className="hidden w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l p-4 xl:flex"
            style={{ borderColor: "var(--adm-border)" }}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Preview</span>
            <div
              className="overflow-hidden rounded-[var(--adm-radius-sm)]"
              style={{ border: "1px solid var(--adm-border)", height: 520 }}
            >
              <iframe
                srcDoc={previewHtml}
                title="Email preview"
                sandbox="allow-same-origin"
                className="h-full w-full border-0 bg-white"
              />
            </div>
            <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
              Preview shows placeholder recipient "Alex Johnson".
            </p>
          </div>
        </div>

        {/* Modal footer */}
        <div
          className="flex shrink-0 items-center justify-end gap-3 px-5 py-3"
          style={{ borderTop: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
        >
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? <Spinner size={14} /> : <FiMail className="text-sm" />}
            {saving ? "Saving…" : campaign ? "Save changes" : "Create campaign"}
          </Button>
        </div>
      </div>

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

      {/* Hidden off-screen Slate for GIF capture */}
      {slatePlayData && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed", top: 0, left: 0,
            width: 1000, height: 700,
            overflow: "hidden", opacity: 0,
            pointerEvents: "none",
            transform: "translateX(-200vw)",
          }}
        >
          <div style={{ display: "flex", width: "100%", height: "100%" }}>
            <Slate adminMode gifExportRef={gifExportRef} initialPlayData={slatePlayData} drawingMode={slatePlayData?.play?.meta?.editorMode === "drawing"} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Campaign card ─────────────────────────────────────────────────────────────

/**
 * Displays a single recurring campaign with countdown and action buttons.
 */
function CampaignCard({ campaign, onEdit, onDelete, onSendNow, onToggleActive }) {
  const [sendingNow, setSendingNow] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const handleSendNow = useCallback(async () => {
    setSendingNow(true);
    setSendResult(null);
    try {
      const result = await onSendNow(campaign.id);
      setSendResult(result);
    } finally {
      setSendingNow(false);
    }
  }, [campaign.id, onSendNow]);

  const audienceLabel = useMemo(() => {
    const type = USER_TYPE_OPTIONS.find((o) => o.value === campaign.audience_user_type)?.label ?? campaign.audience_user_type;
    return campaign.audience_sport ? `${type} — ${campaign.audience_sport}` : type;
  }, [campaign.audience_user_type, campaign.audience_sport]);

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-1 flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-semibold truncate" style={{ color: "var(--adm-text)" }}>
                {campaign.name}
              </span>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={
                  campaign.active
                    ? { backgroundColor: "var(--adm-badge-green-bg)", color: "var(--adm-badge-green-text)" }
                    : { backgroundColor: "var(--adm-surface2)", color: "var(--adm-muted)" }
                }
              >
                {campaign.active ? "Active" : "Paused"}
              </span>
              {campaign.play_embed && (
                <span className="flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}>
                  <FiFilm className="text-[10px]" /> Play GIF
                </span>
              )}
            </div>
            <span className="text-xs truncate" style={{ color: "var(--adm-muted)" }}>{describeFrequency(campaign)}</span>
            <span className="text-xs truncate" style={{ color: "var(--adm-muted)" }}>Audience: {audienceLabel}</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleActive(campaign)}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--adm-radius-sm)] transition-opacity hover:opacity-70"
              style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text2)" }}
              title={campaign.active ? "Pause campaign" : "Resume campaign"}
            >
              {campaign.active ? <FiPause className="text-sm" /> : <FiPlay className="text-sm" />}
            </button>
            <button
              type="button"
              onClick={() => onEdit(campaign)}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--adm-radius-sm)] transition-opacity hover:opacity-70"
              style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text2)" }}
              title="Edit campaign"
            >
              <FiEdit2 className="text-sm" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(campaign)}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--adm-radius-sm)] transition-opacity hover:opacity-70"
              style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-danger)" }}
              title="Delete campaign"
            >
              <FiTrash2 className="text-sm" />
            </button>
          </div>
        </div>

        <div
          className="rounded-[var(--adm-radius-sm)] px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text2)" }}
        >
          <span style={{ color: "var(--adm-muted)" }}>Subject: </span>
          <span className="font-medium" style={{ color: "var(--adm-text)" }}>{campaign.subject}</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>Next send</span>
            <span
              className="text-lg font-bold tabular-nums"
              style={{ color: campaign.active && campaign.next_send_at ? "var(--adm-accent)" : "var(--adm-muted)" }}
            >
              <Countdown nextSendAt={campaign.next_send_at} active={campaign.active} />
            </span>
            {campaign.next_send_at && campaign.active && (
              <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
                {new Date(campaign.next_send_at).toLocaleString(undefined, {
                  weekday: "short", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit", timeZoneName: "short",
                })}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>Total sent</span>
            <span className="text-lg font-bold tabular-nums" style={{ color: "var(--adm-text)" }}>{campaign.send_count ?? 0}</span>
            {campaign.last_sent_at && (
              <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
                Last: {new Date(campaign.last_sent_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSendNow} disabled={sendingNow} className="text-xs">
            {sendingNow ? <Spinner size={12} /> : <FiSend className="text-xs" />}
            {sendingNow ? "Sending…" : "Send now"}
          </Button>
          {sendResult && (
            <span className="text-xs font-semibold" style={{ color: "var(--adm-badge-green-text)" }}>
              Sent to {sendResult.sent} recipient{sendResult.sent !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

/**
 * Admin page for creating and managing recurring email campaigns.
 * Campaigns are fired automatically by the server every 15 minutes.
 */
export default function AdminRecurringEmailPage() {
  const { isOwner } = useAdmin();
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Plays + folders fetched once; passed down to CampaignModal for the play picker
  const [plays, setPlays] = useState([]);
  const [folders, setFolders] = useState([]);
  const [playsLoading, setPlaysLoading] = useState(false);
  const [playsError, setPlaysError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await adminApi("/admin/email/recurring");
      setCampaigns(data);
    } catch (err) {
      setLoadError(err.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Fetch plays + folders for the play picker
  useEffect(() => {
    setPlaysLoading(true);
    setPlaysError("");
    Promise.all([
      adminApi("/admin/plays?picker=1"),
      adminApi("/admin/platform-folders"),
    ])
      .then(([playsRes, foldersRes]) => {
        setPlays(playsRes.plays || []);
        setFolders(foldersRes.folders || []);
      })
      .catch((err) => setPlaysError(err?.message || "Failed to load plays"))
      .finally(() => setPlaysLoading(false));
  }, []);

  const handleOpenNew = useCallback(() => {
    setEditingCampaign(null);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((campaign) => {
    setEditingCampaign(campaign);
    setModalOpen(true);
  }, []);

  const handleSaved = useCallback((saved) => {
    setCampaigns((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setModalOpen(false);
    setEditingCampaign(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await adminApi(`/admin/email/recurring/${confirmDelete.id}`, { method: "DELETE" });
      setCampaigns((prev) => prev.filter((c) => c.id !== confirmDelete.id));
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }, [confirmDelete]);

  const handleSendNow = useCallback(async (id) => {
    const result = await adminApi(`/admin/email/recurring/${id}/send-now`, { method: "POST" });
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id
        ? { ...c, last_sent_at: new Date().toISOString(), send_count: (c.send_count ?? 0) + 1, next_send_at: result.next_send_at }
        : c))
    );
    return result;
  }, []);

  const handleToggleActive = useCallback(async (campaign) => {
    try {
      const updated = await adminApi(`/admin/email/recurring/${campaign.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: campaign.name,
          subject: campaign.subject,
          subheader: campaign.subheader,
          body: campaign.body,
          youtube_url: campaign.youtube_url,
          gif_url: campaign.gif_url,
          play_embed: campaign.play_embed || null,
          audience_user_type: campaign.audience_user_type,
          audience_sport: campaign.audience_sport,
          frequency_type: campaign.frequency_type,
          frequency_day_of_week: campaign.frequency_day_of_week,
          frequency_day_of_month: campaign.frequency_day_of_month,
          frequency_interval_days: campaign.frequency_interval_days,
          frequency_hour: campaign.frequency_hour,
          active: !campaign.active,
        }),
      });
      setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? updated : c)));
    } catch (err) {
      console.error("Toggle failed:", err.message);
    }
  }, []);

  if (!isOwner) {
    return (
      <AdminShell>
        <AdminPage>
          <p className="text-sm" style={{ color: "var(--adm-muted)" }}>
            Recurring campaigns are only available to the account owner.
          </p>
        </AdminPage>
      </AdminShell>
    );
  }

  return (
    <AdminFlagGate flagName="recurring_emails">
    <AdminShell>
      <AdminHeader
        title="Recurring Campaigns"
        sticky
        actions={
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/admin/email")}>
              <FiArrowLeft className="text-sm" />
              One-time email
            </Button>
            <Button variant="primary" onClick={handleOpenNew}>
              <FiPlus className="text-sm" />
              New campaign
            </Button>
          </div>
        }
      />

      <AdminPage>
        <div className="flex flex-col gap-4 overflow-y-auto">
          <div
            className="flex items-start gap-3 rounded-[var(--adm-radius-sm)] px-4 py-3 text-sm"
            style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
          >
            <FiClock className="mt-0.5 shrink-0 text-base" style={{ color: "var(--adm-accent)" }} />
            <p style={{ color: "var(--adm-text2)" }}>
              The server checks for due campaigns every 15 minutes and fires them automatically.
              All send times are in UTC. Use "Send now" to trigger a campaign immediately.
            </p>
          </div>

          {loading && (
            <div className="flex items-center gap-2 py-6">
              <Spinner size={16} />
              <span className="text-sm" style={{ color: "var(--adm-muted)" }}>Loading campaigns…</span>
            </div>
          )}
          {loadError && <p className="text-sm" style={{ color: "var(--adm-danger)" }}>{loadError}</p>}

          {!loading && !loadError && campaigns.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-16">
              <FiMail className="text-4xl" style={{ color: "var(--adm-muted)" }} />
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="font-semibold" style={{ color: "var(--adm-text)" }}>No recurring campaigns yet</span>
                <span className="text-sm" style={{ color: "var(--adm-muted)" }}>
                  Create your first campaign to start sending scheduled emails automatically.
                </span>
              </div>
              <Button variant="primary" onClick={handleOpenNew}>
                <FiPlus className="text-sm" />
                New campaign
              </Button>
            </div>
          )}

          {!loading && campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onEdit={handleEdit}
              onDelete={(campaign) => setConfirmDelete(campaign)}
              onSendNow={handleSendNow}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      </AdminPage>

      {modalOpen && (
        <CampaignModal
          campaign={editingCampaign}
          plays={plays}
          folders={folders}
          playsLoading={playsLoading}
          playsError={playsError}
          onClose={() => { setModalOpen(false); setEditingCampaign(null); }}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={`Delete "${confirmDelete?.name}"?`}
        description="This campaign will stop sending and cannot be recovered."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
    </AdminShell>
    </AdminFlagGate>
  );
}
