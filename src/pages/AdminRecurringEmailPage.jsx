/**
 * Admin page for managing recurring email campaigns.
 * Each campaign has a frequency (weekly / monthly / custom interval), a full
 * broadcast composer, and a live countdown to the next scheduled send.
 * The server fires campaigns automatically every 15 minutes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiClock, FiEdit2, FiMail, FiPause, FiPlay, FiPlus,
  FiSend, FiTrash2, FiX,
} from "react-icons/fi";
import { useAdmin } from "../admin/AdminContext";
import { adminApi } from "../admin/adminTransport";
import {
  AdminBtn, AdminCard, AdminHeader, AdminInput, AdminPage,
  AdminSection, AdminSelect, AdminShell, AdminSpinner,
} from "../admin/components";
import ConfirmModal from "../components/subcomponents/ConfirmModal";
import { SUPPORTED_FIELD_TYPES } from "../features/slate/hooks/useAdvancedSettings";
import {
  buildBroadcastEmailHtml,
  extractYouTubeId,
  getBroadcastBodyText,
  sanitizeBroadcastBodyMarkup,
} from "../../shared/broadcastEmailTemplate.js";

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

const EMPTY_FORM = {
  name: "",
  subject: "",
  subheader: "",
  body: "",
  youtubeUrl: "",
  gifUrl: "",
  audienceUserType: "onboarded",
  audienceSport: "",
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

// ── Rich text editor (shared with broadcast composer) ─────────────────────────

/**
 * Inline rich-text body editor with toolbar.
 * Calls onChange(html) whenever the content changes.
 */
function RichBodyEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [formats, setFormats] = useState(EMPTY_FORMATS);

  useEffect(() => {
    const el = editorRef.current;
    if (el && el.innerHTML !== value) el.innerHTML = value || "";
  }, [value]);

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
    onChange(editorRef.current?.innerHTML ?? "");
    syncFormats();
  }, [onChange, syncFormats]);

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
      </div>

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
 */
function CampaignModal({ campaign, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    campaign
      ? {
          name: campaign.name,
          subject: campaign.subject,
          subheader: campaign.subheader ?? "",
          body: campaign.body,
          youtubeUrl: campaign.youtube_url ?? "",
          gifUrl: campaign.gif_url ?? "",
          audienceUserType: campaign.audience_user_type ?? "onboarded",
          audienceSport: campaign.audience_sport ?? "",
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
  const [previewHtml, setPreviewHtml] = useState("");

  const youtubeId = extractYouTubeId(form.youtubeUrl);
  const bodyText = getBroadcastBodyText(form.body);
  const canSave = form.name.trim() && form.subject.trim() && bodyText.trim();

  useEffect(() => {
    setPreviewHtml(
      buildBroadcastEmailHtml({
        subheader: form.subheader,
        body: form.body,
        youtubeUrl: form.youtubeUrl,
        gifUrl: form.gifUrl,
        recipientName: "Alex Johnson",
        recipientTeam: "Example FC",
      })
    );
  }, [form.subheader, form.body, form.youtubeUrl, form.gifUrl]);

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
        audience_user_type: form.audienceUserType,
        audience_sport: form.audienceSport,
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
    <div
      className="fixed inset-0 z-50 flex overflow-hidden"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    >
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
          <AdminBtn onClick={onClose} variant="ghost" className="!p-2">
            <FiX />
          </AdminBtn>
        </div>

        {/* Modal body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: form */}
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">

            <AdminSection title="Campaign settings">
              <AdminCard>
                <div className="flex flex-col gap-4">
                  <AdminInput
                    label="Campaign name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="e.g. Weekly newsletter"
                  />

                  <div className="flex flex-col gap-2">
                    <label className={LABEL_CLASS} style={{ color: "var(--adm-muted)" }}>
                      Frequency
                    </label>
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

                  {/* Frequency-specific fields */}
                  <div className="flex flex-wrap gap-3">
                    {form.frequencyType === "weekly" && (
                      <AdminSelect
                        label="Day of week"
                        value={form.frequencyDayOfWeek}
                        onChange={(e) => set("frequencyDayOfWeek", e.target.value)}
                        className="min-w-[140px]"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </AdminSelect>
                    )}

                    {form.frequencyType === "monthly" && (
                      <AdminSelect
                        label="Day of month"
                        value={form.frequencyDayOfMonth}
                        onChange={(e) => set("frequencyDayOfMonth", e.target.value)}
                        className="min-w-[120px]"
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </AdminSelect>
                    )}

                    {form.frequencyType === "custom" && (
                      <div className="flex flex-col gap-1">
                        <label className={LABEL_CLASS} style={{ color: "var(--adm-muted)" }}>
                          Every N days
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={form.frequencyIntervalDays}
                          onChange={(e) => set("frequencyIntervalDays", Math.max(1, Number(e.target.value)))}
                          className="w-24 rounded-[var(--adm-radius-sm)] px-3 py-2 text-sm outline-none"
                          style={{
                            backgroundColor: "var(--adm-surface)",
                            border: "1px solid var(--adm-border2)",
                            color: "var(--adm-text)",
                          }}
                        />
                      </div>
                    )}

                    <AdminSelect
                      label="Send time"
                      value={form.frequencyHour}
                      onChange={(e) => set("frequencyHour", e.target.value)}
                      className="min-w-[130px]"
                    >
                      {HOURS.map((h) => (
                        <option key={h.value} value={h.value}>{h.label}</option>
                      ))}
                    </AdminSelect>
                  </div>

                  {/* Active toggle */}
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
              </AdminCard>
            </AdminSection>

            <AdminSection title="Audience">
              <AdminCard>
                <div className="flex flex-wrap gap-3">
                  <AdminSelect
                    label="User type"
                    value={form.audienceUserType}
                    onChange={(e) => set("audienceUserType", e.target.value)}
                    className="min-w-[160px]"
                  >
                    {USER_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </AdminSelect>

                  <AdminSelect
                    label="Sport"
                    value={form.audienceSport}
                    onChange={(e) => set("audienceSport", e.target.value)}
                    className="min-w-[140px]"
                  >
                    {SPORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </AdminSelect>
                </div>
              </AdminCard>
            </AdminSection>

            <AdminSection title="Compose">
              <AdminCard>
                <div className="flex flex-col gap-4">
                  <AdminInput
                    label="Subject"
                    value={form.subject}
                    onChange={(e) => set("subject", e.target.value)}
                    placeholder="Email subject…"
                  />

                  <AdminInput
                    label="Subheader (optional)"
                    value={form.subheader}
                    onChange={(e) => set("subheader", e.target.value)}
                    placeholder="Short line above the body…"
                  />

                  <RichBodyEditor value={form.body} onChange={(html) => set("body", html)} />

                  <AdminInput
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

                  <AdminInput
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
              </AdminCard>
            </AdminSection>

            {error && (
              <p className="text-sm" style={{ color: "var(--adm-danger)" }}>{error}</p>
            )}
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
          <AdminBtn onClick={onClose} disabled={saving}>Cancel</AdminBtn>
          <AdminBtn variant="primary" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? <AdminSpinner size={14} /> : <FiMail className="text-sm" />}
            {saving ? "Saving…" : campaign ? "Save changes" : "Create campaign"}
          </AdminBtn>
        </div>
      </div>
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
    <AdminCard>
      <div className="flex flex-col gap-4">
        {/* Header row */}
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
            </div>
            <span className="text-xs truncate" style={{ color: "var(--adm-muted)" }}>
              {describeFrequency(campaign)}
            </span>
            <span className="text-xs truncate" style={{ color: "var(--adm-muted)" }}>
              Audience: {audienceLabel}
            </span>
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

        {/* Subject */}
        <div
          className="rounded-[var(--adm-radius-sm)] px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text2)" }}
        >
          <span style={{ color: "var(--adm-muted)" }}>Subject: </span>
          <span className="font-medium" style={{ color: "var(--adm-text)" }}>{campaign.subject}</span>
        </div>

        {/* Countdown + stats row */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>
              Next send
            </span>
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
            <span className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>
              Total sent
            </span>
            <span className="text-lg font-bold tabular-nums" style={{ color: "var(--adm-text)" }}>
              {campaign.send_count ?? 0}
            </span>
            {campaign.last_sent_at && (
              <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
                Last: {new Date(campaign.last_sent_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Send now button + result */}
        <div className="flex items-center gap-3">
          <AdminBtn
            onClick={handleSendNow}
            disabled={sendingNow}
            className="text-xs"
          >
            {sendingNow ? <AdminSpinner size={12} /> : <FiSend className="text-xs" />}
            {sendingNow ? "Sending…" : "Send now"}
          </AdminBtn>

          {sendResult && (
            <span className="text-xs font-semibold" style={{ color: "var(--adm-badge-green-text)" }}>
              Sent to {sendResult.sent} recipient{sendResult.sent !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </AdminCard>
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
      prev.map((c) => (c.id === id ? { ...c, last_sent_at: new Date().toISOString(), send_count: (c.send_count ?? 0) + 1, next_send_at: result.next_send_at } : c))
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
    <AdminShell>
      <AdminHeader
        title="Recurring Campaigns"
        sticky
        actions={
          <div className="flex items-center gap-3">
            <AdminBtn onClick={() => navigate("/admin/email")}>
              <FiArrowLeft className="text-sm" />
              One-time email
            </AdminBtn>
            <AdminBtn variant="primary" onClick={handleOpenNew}>
              <FiPlus className="text-sm" />
              New campaign
            </AdminBtn>
          </div>
        }
      />

      <AdminPage>
        <div className="flex flex-col gap-4 overflow-y-auto">
          {/* Info strip */}
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

          {/* Loading / error */}
          {loading && (
            <div className="flex items-center gap-2 py-6">
              <AdminSpinner size={16} />
              <span className="text-sm" style={{ color: "var(--adm-muted)" }}>Loading campaigns…</span>
            </div>
          )}
          {loadError && (
            <p className="text-sm" style={{ color: "var(--adm-danger)" }}>{loadError}</p>
          )}

          {/* Empty state */}
          {!loading && !loadError && campaigns.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-16">
              <FiMail className="text-4xl" style={{ color: "var(--adm-muted)" }} />
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="font-semibold" style={{ color: "var(--adm-text)" }}>No recurring campaigns yet</span>
                <span className="text-sm" style={{ color: "var(--adm-muted)" }}>
                  Create your first campaign to start sending scheduled emails automatically.
                </span>
              </div>
              <AdminBtn variant="primary" onClick={handleOpenNew}>
                <FiPlus className="text-sm" />
                New campaign
              </AdminBtn>
            </div>
          )}

          {/* Campaign list */}
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

      {/* Create / edit modal */}
      {modalOpen && (
        <CampaignModal
          campaign={editingCampaign}
          onClose={() => { setModalOpen(false); setEditingCampaign(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={Boolean(confirmDelete)}
        message={`Delete "${confirmDelete?.name}"?`}
        subtitle="This campaign will stop sending and cannot be recovered."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
    </AdminShell>
  );
}
