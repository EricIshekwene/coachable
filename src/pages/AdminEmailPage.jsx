/**
 * Admin email composer page.
 * Left column: audience filters, rich composer, send controls.
 * Right column: live preview that cycles through real recipients.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCheck, FiChevronLeft, FiChevronRight, FiClock, FiFilm,
  FiFolder, FiMail, FiSearch, FiSend, FiUsers, FiX,
} from "react-icons/fi";
import { useAdmin } from "../admin/AdminContext";
import { adminApi } from "../admin/adminTransport";
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

const USER_TYPE_OPTIONS = [
  { value: "all", label: "All verified users" },
  { value: "onboarded", label: "Onboarded users" },
  { value: "beta", label: "Beta testers" },
];

const SPORT_OPTIONS = [
  { value: "", label: "All sports" },
  ...SUPPORTED_FIELD_TYPES
    .filter((sport) => sport !== "Blank")
    .map((sport) => ({ value: sport, label: sport })),
];

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

// ── Play Picker Modal ─────────────────────────────────────────────────────────

/**
 * Modal for browsing platform plays by folder and searching by title.
 * Calls onSelect(play) when the user confirms a play.
 */
function PlayPickerModal({ plays, folders, loading, error, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const [activeFolderId, setActiveFolderId] = useState(null); // null = all
  const [selectedPlay, setSelectedPlay] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const filteredPlays = useMemo(() => {
    let list = plays;
    if (activeFolderId !== null) {
      list = list.filter((p) => p.folderId === activeFolderId);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.title?.toLowerCase().includes(q));
    }
    return list;
  }, [plays, activeFolderId, search]);

  const handleConfirm = useCallback(() => {
    if (!selectedPlay) return;
    onSelect(selectedPlay);
  }, [selectedPlay, onSelect]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl"
        style={{
          backgroundColor: "var(--adm-surface)",
          border: "1px solid var(--adm-border)",
          maxHeight: "80vh",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--adm-border)" }}
        >
          <div className="flex items-center gap-2">
            <FiFilm style={{ color: "var(--adm-accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
              Insert Play GIF
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
            style={{ color: "var(--adm-muted)" }}
          >
            <FiX />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border2)" }}
          >
            <FiSearch className="shrink-0 text-sm" style={{ color: "var(--adm-muted)" }} />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveFolderId(null); }}
              placeholder="Search plays…"
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: "var(--adm-text)" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} style={{ color: "var(--adm-muted)" }}>
                <FiX className="text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* Body: folders + plays */}
        <div className="flex flex-1 overflow-hidden">
          {/* Folder tree */}
          {!search && (
            <div
              className="flex w-44 shrink-0 flex-col overflow-y-auto"
              style={{ borderRight: "1px solid var(--adm-border)" }}
            >
              <button
                type="button"
                onClick={() => setActiveFolderId(null)}
                className="px-4 py-2.5 text-left text-xs font-semibold transition-colors"
                style={{
                  color: activeFolderId === null ? "var(--adm-accent)" : "var(--adm-text)",
                  backgroundColor: activeFolderId === null ? "var(--adm-accent-dim)" : "transparent",
                }}
              >
                All plays
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFolderId(f.id)}
                  className="flex items-center gap-2 px-4 py-2.5 text-left text-xs transition-colors"
                  style={{
                    color: activeFolderId === f.id ? "var(--adm-accent)" : "var(--adm-text)",
                    backgroundColor: activeFolderId === f.id ? "var(--adm-accent-dim)" : "transparent",
                  }}
                >
                  <FiFolder className="shrink-0" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Play list */}
          <div className="flex flex-1 flex-col overflow-y-auto">
            {loading ? (
              <div className="flex flex-1 items-center justify-center p-8 gap-2 text-xs" style={{ color: "var(--adm-muted)" }}>
                <AdminSpinner size={14} /> Loading plays…
              </div>
            ) : error ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 gap-1 text-xs" style={{ color: "var(--adm-danger)" }}>
                <span className="font-semibold">Failed to load plays</span>
                <span style={{ color: "var(--adm-muted)" }}>{error}</span>
              </div>
            ) : filteredPlays.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-8 text-xs" style={{ color: "var(--adm-muted)" }}>
                {search ? `No plays match "${search}"` : plays.length === 0 ? "No platform plays found" : "No plays in this folder"}
              </div>
            ) : (
              filteredPlays.map((play) => {
                const isSelected = selectedPlay?.id === play.id;
                return (
                  <button
                    key={play.id}
                    type="button"
                    onClick={() => setSelectedPlay(isSelected ? null : play)}
                    className="flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{
                      backgroundColor: isSelected ? "var(--adm-accent-dim)" : "transparent",
                      borderBottom: "1px solid var(--adm-border)",
                    }}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: isSelected ? "var(--adm-accent)" : "var(--adm-surface2)" }}
                    >
                      <FiFilm className="text-xs" style={{ color: isSelected ? "#fff" : "var(--adm-muted)" }} />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-semibold" style={{ color: "var(--adm-text)" }}>
                        {play.title}
                      </span>
                      {play.sport && (
                        <span className="truncate text-[10px]" style={{ color: "var(--adm-muted)" }}>
                          {play.sport}
                        </span>
                      )}
                    </div>
                    {isSelected && <FiCheck className="ml-auto shrink-0" style={{ color: "var(--adm-accent)" }} />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: "1px solid var(--adm-border)" }}
        >
          <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
            {selectedPlay ? `Selected: ${selectedPlay.title}` : "Select a play to insert"}
          </span>
          <div className="flex gap-2">
            <AdminBtn onClick={onClose}>Cancel</AdminBtn>
            <AdminBtn variant="primary" onClick={handleConfirm} disabled={!selectedPlay}>
              <FiFilm className="text-sm" />
              Generate &amp; Insert GIF
            </AdminBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminEmailPage() {
  const { isOwner } = useAdmin();
  const navigate = useNavigate();

  const [userType, setUserType] = useState("onboarded");
  const [sport, setSport] = useState("");

  const [audienceData, setAudienceData] = useState(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [audienceError, setAudienceError] = useState("");

  const [subject, setSubject] = useState("");
  const [subheader, setSubheader] = useState("");
  const [body, setBody] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  const [testEmail, setTestEmail] = useState("founder@coachableplays.com");
  const [editorFocused, setEditorFocused] = useState(false);
  const [activeFormats, setActiveFormats] = useState(EMPTY_ACTIVE_FORMATS);
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null); // cursor position before modal opens

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
  // Single inline play embed: { id, title, gifUrl } | null
  const [playEmbed, setPlayEmbed] = useState(null);
  const [slatePlayData, setSlatePlayData] = useState(null);
  const slatePlayRef = useRef(null); // full play object for current generation
  const gifExportRef = useRef(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const youtubeId = extractYouTubeId(youtubeUrl);
  const bodyText = useMemo(() => getBroadcastBodyText(body), [body]);
  const canCompose = subject.trim() && bodyText.trim();
  const canSend = canCompose && audienceData && audienceData.count > 0;

  const previewRecipients = audienceData?.preview?.length
    ? audienceData.preview
    : [PLACEHOLDER_RECIPIENT];
  const clampedIndex = Math.min(previewIndex, previewRecipients.length - 1);
  const currentPreviewRecipient = previewRecipients[clampedIndex];

  const previewHtml = useMemo(
    () =>
      buildBroadcastEmailHtml({
        subheader,
        body,
        youtubeUrl,
        gifUrl,
        playEmbed,
        recipientName: currentPreviewRecipient.name,
        recipientTeam: currentPreviewRecipient.team_name || "",
      }),
    [subheader, body, youtubeUrl, gifUrl, playEmbed, currentPreviewRecipient]
  );

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    // Rehydrate {{playEmbed}} sentinel back to a visual chip when syncing body to DOM
    const chipHtml = playEmbed
      ? `<span data-play-embed="1" data-embed-title="${escapeHtml(playEmbed.title)}" contenteditable="false" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:var(--adm-accent-dim,#fff3e8);border:1px solid color-mix(in srgb,var(--adm-accent,#f97316) 30%,transparent);color:var(--adm-accent,#f97316);font-size:12px;font-weight:600;cursor:default;user-select:none;">🎬 ${escapeHtml(playEmbed.title)} ✓</span>`
      : "{{playEmbed}}";
    const rehydrated = (body || "").replace(/\{\{playEmbed\}\}/g, chipHtml);
    if (editor.innerHTML !== rehydrated) {
      editor.innerHTML = rehydrated;
    }
  }, [body, playEmbed]);

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
    if (gifPhase !== "mounting" || !slatePlayData) return;

    let cancelled = false;
    const POLL_MS = 200;
    const TIMEOUT_MS = 20_000;
    const start = Date.now();

    const poll = setInterval(async () => {
      if (cancelled) return;

      const api = gifExportRef.current;
      // Wait until both generateGIF and the Konva capture API are ready
      if (!api?.generateGIF || !api?.isCanvasReady?.()) {
        if (Date.now() - start > TIMEOUT_MS) {
          clearInterval(poll);
          if (!cancelled) {
            setGifPhase("error");
            setGifError("Canvas timed out — try again.");
          }
        }
        return;
      }

      clearInterval(poll);
      if (cancelled) return;

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

        if (cancelled) return;

        const play = slatePlayRef.current;
        const editor = editorRef.current;

        if (editor) {
          editor.focus();
          const sel = window.getSelection();

          // If a play embed already exists, replace its chip token in place.
          // Otherwise insert the sentinel at the saved cursor position.
          const SENTINEL = "{{playEmbed}}";
          const CHIP_ATTR = "data-play-embed";
          const existingChip = editor.querySelector(`[${CHIP_ATTR}]`);

          if (existingChip) {
            // Replace existing chip with updated one
            existingChip.setAttribute("data-embed-title", play?.title || "Play");
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
          }

          // Serialize body — convert chip back to sentinel token for storage
          const rawHtml = editor.innerHTML;
          const tokenized = rawHtml.replace(
            /<span[^>]*data-play-embed[^>]*>[\s\S]*?<\/span>/gi,
            SENTINEL
          );
          setBody(tokenized);
        }

        setPlayEmbed({ id: play?.id, title: play?.title || "Play", gifUrl: url });
        setGifPhase("idle");
        setSlatePlayData(null);
        slatePlayRef.current = null;
        savedRangeRef.current = null;
      } catch (err) {
        if (!cancelled) {
          setGifPhase("error");
          setGifError(err?.message || "GIF generation failed.");
        }
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [gifPhase, slatePlayData]);

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
      "{{playEmbed}}"
    );
    setBody(tokenized);
    // If the sentinel was removed by the user, clear playEmbed state
    if (!tokenized.includes("{{playEmbed}}")) {
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

  const handleLinkInsert = useCallback(() => {
    const url = window.prompt("Enter a link URL");
    if (!url?.trim()) return;
    focusEditor();
    const selectionText = window.getSelection?.()?.toString().trim();
    if (selectionText) {
      document.execCommand("createLink", false, url.trim());
    } else {
      insertHtmlAtCursor(`<a href="${escapeHtml(url.trim())}">${escapeHtml(url.trim())}</a>`);
    }
    syncBodyFromEditor();
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
    slatePlayRef.current = play;
    setGifError("");
    setGifProgress(0);
    setSlatePlayData(play.playData);
    setGifPhase("mounting");
  }, []);

  // ── Audience / send ─────────────────────────────────────────────────────────

  const handlePreviewAudience = useCallback(async () => {
    setLoadingAudience(true);
    setAudienceData(null);
    setAudienceError("");
    setPreviewIndex(0);
    try {
      const data = await adminApi("/admin/email/preview-recipients", {
        method: "POST",
        body: JSON.stringify({ filters: { userType, sport } }),
      });
      setAudienceData(data);
    } catch (err) {
      setAudienceError(err.message || "Failed to load recipients");
    } finally {
      setLoadingAudience(false);
    }
  }, [userType, sport]);

  const handleSendTest = useCallback(async () => {
    if (!testEmail.trim()) { setSendError("Enter a test email address first"); return; }
    setSending(true); setSendResult(null); setSendError("");
    try {
      const data = await adminApi("/admin/email/send", {
        method: "POST",
        body: JSON.stringify({ subject, subheader, body, youtubeUrl, gifUrl, playEmbed: playEmbed || undefined, filters: { userType, sport }, previewTo: testEmail.trim() }),
      });
      setSendResult({ ...data, testEmail: testEmail.trim() });
    } catch (err) {
      setSendError(err.message || "Test send failed");
    } finally {
      setSending(false);
    }
  }, [subject, subheader, body, youtubeUrl, gifUrl, userType, sport, testEmail]);

  const handleSendToAll = useCallback(async () => {
    setConfirmOpen(false); setSending(true); setSendResult(null); setSendError("");
    try {
      const data = await adminApi("/admin/email/send", {
        method: "POST",
        body: JSON.stringify({ subject, subheader, body, youtubeUrl, gifUrl, playEmbed: playEmbed || undefined, filters: { userType, sport } }),
      });
      setSendResult(data);
    } catch (err) {
      setSendError(err.message || "Broadcast failed");
    } finally {
      setSending(false);
    }
  }, [subject, subheader, body, youtubeUrl, gifUrl, userType, sport]);

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
              subtitle="Choose which users receive this email. Click 'Preview' to see the count."
            >
              <AdminCard>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <AdminSelect
                      label="User type"
                      value={userType}
                      onChange={(e) => { setUserType(e.target.value); setAudienceData(null); }}
                      className="min-w-[160px]"
                    >
                      {USER_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </AdminSelect>
                    <AdminSelect
                      label="Sport"
                      value={sport}
                      onChange={(e) => { setSport(e.target.value); setAudienceData(null); }}
                      className="min-w-[140px]"
                    >
                      {SPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </AdminSelect>
                    <AdminBtn onClick={handlePreviewAudience} disabled={loadingAudience} className="self-end">
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
                        { label: "Clear", onClick: () => runEditorCommand("removeFormat") },
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
                            setBody((prev) => prev.replace(/\{\{playEmbed\}\}/g, "").trim());
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

                    {gifPhase === "error" && gifError && (
                      <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{gifError}</p>
                    )}

                    <p className="text-xs leading-relaxed" style={{ color: "var(--adm-muted)" }}>
                      Formatting is preserved in the sent email. Use + Play to embed a play GIF inline.
                    </p>
                  </div>

                  {/* YouTube URL */}
                  <div className="flex flex-col gap-2">
                    <AdminInput
                      label="YouTube URL (optional)"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      type="url"
                    />
                    {youtubeId && (
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                          alt="YouTube thumbnail"
                          className="rounded-lg object-cover"
                          style={{ width: 160, height: 90 }}
                        />
                        <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
                          Renders as a richer video card with a direct watch button.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Manual GIF URL */}
                  <div className="flex flex-col gap-2">
                    <AdminInput
                      label="GIF URL (optional)"
                      value={gifUrl}
                      onChange={(e) => setGifUrl(e.target.value)}
                      placeholder="https://example.com/play-animation.gif"
                      type="url"
                    />
                    {gifUrl && (
                      <div className="flex items-center gap-3">
                        <img
                          src={gifUrl}
                          alt="GIF preview"
                          className="rounded-lg"
                          style={{ maxWidth: 200, maxHeight: 150, objectFit: "contain" }}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                        <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
                          Renders inside its own card below the message body.
                        </span>
                      </div>
                    )}
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

                  <div className="flex items-center justify-between">
                    {!audienceData && (
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
                      Send to {audienceData?.count ?? "?"} recipient{(audienceData?.count ?? 0) !== 1 ? "s" : ""}
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
        message={`Send "${subject}" to ${audienceData?.count ?? 0} recipient${(audienceData?.count ?? 0) !== 1 ? "s" : ""}?`}
        subtitle="This will send the email immediately to all matching users. This cannot be undone."
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
            left: -2000,
            top: 0,
            width: 1000,
            height: 700,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <Slate
            adminMode
            gifExportRef={gifExportRef}
            initialPlayData={slatePlayData}
          />
        </div>
      )}
    </AdminShell>
  );
}
