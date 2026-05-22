/**
 * AdminNotificationsPage.jsx
 *
 * Full notification command center: compose, target, preview, test-send,
 * broadcast, and review past sent notifications with analytics.
 *
 * Uses demo/mock data for past notifications since no backend endpoint
 * exists yet. Live send actions are wired to real API calls.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiBell, FiSend, FiUsers, FiEye, FiCheck, FiBarChart2,
  FiSmartphone, FiAlertCircle, FiFilter, FiChevronDown,
  FiClock, FiZap, FiArrowRight, FiSearch, FiClipboard,
  FiPlus, FiTrash2, FiCopy, FiChevronUp, FiType, FiAlignLeft,
  FiList, FiCheckSquare, FiStar, FiCalendar, FiUpload,
  FiSliders, FiToggleLeft, FiDownload, FiMove,
} from "react-icons/fi";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  AdminBtn,
  AdminCard,
  AdminHeader,
  AdminInput,
  AdminModal,
  AdminPage,
  AdminSection,
  AdminSelect,
  AdminShell,
  AdminSpinner,
  AdminBadge,
  AdminAlert,
  AdminEmptyState,
  AdminTextarea,
} from "../admin/components";
import { useAdmin } from "../admin/AdminContext";
import { adminApi } from "../admin/adminTransport";

// ── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: "normal",   label: "Normal" },
  { value: "high",     label: "High Priority" },
  { value: "critical", label: "Critical / Urgent" },
];

const SPORT_OPTIONS = [
  { value: "",               label: "All sports" },
  { value: "Rugby",          label: "Rugby" },
  { value: "Soccer",         label: "Soccer" },
  { value: "Football",       label: "Football" },
  { value: "Basketball",     label: "Basketball" },
  { value: "Lacrosse",       label: "Lacrosse" },
  { value: "Field Hockey",   label: "Field Hockey" },
  { value: "Ice Hockey",     label: "Ice Hockey" },
];

const PLAY_FILTER_OPTIONS = [
  { value: "any",       label: "Any (all users)" },
  { value: "has_plays", label: "Have created plays" },
  { value: "no_plays",  label: "Have NOT created plays" },
];

const AUDIENCE_QUICK = [
  { id: "all",      label: "All Users",     icon: <FiUsers /> },
  { id: "active",   label: "Active Users",  icon: <FiZap /> },
  { id: "inactive", label: "Inactive",      icon: <FiClock /> },
  { id: "coaches",  label: "Coaches",       icon: <FiBell /> },
  { id: "players",  label: "Players Only",  icon: <FiSmartphone /> },
];

const LABEL_CLASS = "block text-xs font-semibold mb-1.5";

// ── Response form question types ─────────────────────────────────────────────
// Curated from Google Forms — only the inputs that make sense for collecting
// data from coaches/players inside a notification.

const QUESTION_TYPES = [
  { value: "short",      label: "Short answer",     icon: <FiType />,        hasOptions: false, group: "Text" },
  { value: "paragraph",  label: "Paragraph",        icon: <FiAlignLeft />,   hasOptions: false, group: "Text" },
  { value: "multiple",   label: "Multiple choice",  icon: <FiList />,        hasOptions: true,  group: "Choice" },
  { value: "checkboxes", label: "Checkboxes",       icon: <FiCheckSquare />, hasOptions: true,  group: "Choice" },
  { value: "dropdown",   label: "Dropdown",         icon: <FiChevronDown />, hasOptions: true,  group: "Choice" },
  { value: "yes_no",     label: "Yes / No",         icon: <FiToggleLeft />,  hasOptions: false, group: "Choice" },
  { value: "scale",      label: "Linear scale",     icon: <FiSliders />,     hasOptions: false, group: "Rating" },
  { value: "rating",     label: "Star rating",      icon: <FiStar />,        hasOptions: false, group: "Rating" },
  { value: "date",       label: "Date",             icon: <FiCalendar />,    hasOptions: false, group: "Date" },
  { value: "file",       label: "File upload",      icon: <FiUpload />,      hasOptions: false, group: "Media" },
];

const QUESTION_TYPE_MAP = Object.fromEntries(QUESTION_TYPES.map((q) => [q.value, q]));

let questionSeq = 0;
/** Create a blank question of the given type with sensible defaults. */
function makeQuestion(type = "short") {
  questionSeq += 1;
  const id = `q-${Date.now()}-${questionSeq}`;
  const base = { id, type, label: "", required: false };
  if (QUESTION_TYPE_MAP[type]?.hasOptions) base.options = ["Option 1", "Option 2"];
  if (type === "scale") { base.scaleMax = 5; base.scaleMinLabel = ""; base.scaleMaxLabel = ""; }
  return base;
}

// The notification body is an ordered list of blocks. Each block is either a
// rich-text block or a question block, so text and questions can be interleaved.

let blockSeq = 0;
/** Create an empty rich-text block. */
function makeTextBlock(html = "") {
  blockSeq += 1;
  return { id: `b-${Date.now()}-${blockSeq}`, kind: "text", html };
}

/** Create a question block of the given type (a question + kind tag). */
function makeQuestionBlock(type = "short") {
  return { ...makeQuestion(type), kind: "question" };
}

/** Strip HTML tags to test whether a text block has real content. */
function stripHtml(html) {
  return String(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

const EMPTY_ACTIVE_FORMATS = {
  bold: false, italic: false, underline: false,
  h2: false, quote: false, ul: false, ol: false, link: false,
};

// ── Demo past notifications ──────────────────────────────────────────────────

const DEMO_PAST = [
  {
    id: "n-001",
    title: "Welcome to the new Coachable!",
    subject: "Your coaching experience just got better",
    type: "email",
    priority: "normal",
    status: "sent",
    sentAt: "2026-05-10T14:32:00Z",
    audienceLabel: "All onboarded users",
    recipientCount: 1247,
    openCount: 834,
    clickCount: 312,
    responseCount: 89,
    body: "<p>We've launched new features to make building plays faster than ever. Check out the new drawing tools and GIF export.</p>",
    opensByDay: [
      { day: "May 10", opens: 440 },
      { day: "May 11", opens: 215 },
      { day: "May 12", opens: 98 },
      { day: "May 13", opens: 51 },
      { day: "May 14", opens: 30 },
    ],
    deviceBreakdown: [
      { name: "Desktop", value: 62 },
      { name: "Mobile",  value: 31 },
      { name: "Tablet",  value: 7 },
    ],
    responseSummary: [
      {
        id: "q1", label: "How would you rate the new update?", type: "rating", average: 4.1,
        distribution: [
          { name: "5★", value: 41 }, { name: "4★", value: 28 },
          { name: "3★", value: 12 }, { name: "2★", value: 5 }, { name: "1★", value: 3 },
        ],
      },
      {
        id: "q2", label: "Which feature are you most excited about?", type: "multiple",
        distribution: [
          { name: "Drawing tools", value: 38 },
          { name: "GIF export",    value: 31 },
          { name: "New presets",   value: 20 },
        ],
      },
      {
        id: "q3", label: "Any other feedback?", type: "paragraph",
        samples: [
          "Love the new drawing tools — way faster than before!",
          "GIF export is a game changer for sharing plays with parents.",
          "Would be great to have more rugby presets out of the box.",
          "The mobile experience feels much smoother now.",
        ],
      },
    ],
  },
  {
    id: "n-002",
    title: "New Rugby Preset Packs Available",
    subject: "6 new formation presets — free for your team",
    type: "email",
    priority: "normal",
    status: "sent",
    sentAt: "2026-04-28T10:15:00Z",
    audienceLabel: "Rugby coaches",
    recipientCount: 386,
    openCount: 270,
    clickCount: 144,
    responseCount: 22,
    body: "<p>We added 6 new rugby formation presets. Access them from the Presets tab in any play.</p>",
    opensByDay: [
      { day: "Apr 28", opens: 175 },
      { day: "Apr 29", opens: 68 },
      { day: "Apr 30", opens: 27 },
    ],
    deviceBreakdown: [
      { name: "Desktop", value: 71 },
      { name: "Mobile",  value: 22 },
      { name: "Tablet",  value: 7 },
    ],
    responseSummary: [
      {
        id: "q1", label: "Will you use the new presets?", type: "yes_no",
        distribution: [{ name: "Yes", value: 19 }, { name: "No", value: 3 }],
      },
      {
        id: "q2", label: "Rate the preset quality (1–5)", type: "scale", average: 4.0,
        distribution: [
          { name: "5", value: 9 }, { name: "4", value: 7 },
          { name: "3", value: 4 }, { name: "2", value: 1 }, { name: "1", value: 1 },
        ],
      },
    ],
  },
  {
    id: "n-003",
    title: "Maintenance: downtime 12–1 AM Sunday",
    subject: "Scheduled maintenance this Sunday",
    type: "in_app",
    priority: "high",
    status: "sent",
    sentAt: "2026-04-19T08:00:00Z",
    audienceLabel: "All users",
    recipientCount: 1389,
    openCount: 610,
    clickCount: 0,
    responseCount: 0,
    body: "<p>Coachable will be offline for scheduled maintenance from 12:00 AM to 1:00 AM this Sunday. Thanks for your patience.</p>",
    opensByDay: [
      { day: "Apr 19", opens: 390 },
      { day: "Apr 20", opens: 140 },
      { day: "Apr 21", opens: 80 },
    ],
    deviceBreakdown: [
      { name: "Desktop", value: 55 },
      { name: "Mobile",  value: 38 },
      { name: "Tablet",  value: 7 },
    ],
  },
  {
    id: "n-004",
    title: "Beta Feature: Recording Mode",
    subject: "You're invited to try Recording Mode",
    type: "email",
    priority: "normal",
    status: "sent",
    sentAt: "2026-03-14T16:45:00Z",
    audienceLabel: "Beta testers",
    recipientCount: 74,
    openCount: 62,
    clickCount: 47,
    responseCount: 18,
    body: "<p>Recording Mode is now live in beta. Record player-by-player animations and compile them into full play walkthroughs.</p>",
    opensByDay: [
      { day: "Mar 14", opens: 45 },
      { day: "Mar 15", opens: 12 },
      { day: "Mar 16", opens: 5 },
    ],
    deviceBreakdown: [
      { name: "Desktop", value: 68 },
      { name: "Mobile",  value: 25 },
      { name: "Tablet",  value: 7 },
    ],
    responseSummary: [
      {
        id: "q1", label: "Did Recording Mode work for you?", type: "yes_no",
        distribution: [{ name: "Yes", value: 14 }, { name: "No", value: 4 }],
      },
      {
        id: "q2", label: "What should we improve?", type: "paragraph",
        samples: [
          "Needs a way to re-record a single player without starting over.",
          "Ghost trails of already-recorded players would help a lot.",
          "Please add ball recording support.",
          "Smooth! Compiled walkthrough looked great.",
        ],
      },
    ],
  },
];

const PIE_COLORS = ["#FF7A18", "#3b82f6", "#10b981"];

// ── Helper fns ───────────────────────────────────────────────────────────────

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtDateShort(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

function pct(a, b) {
  if (!b) return "—";
  return ((a / b) * 100).toFixed(1) + "%";
}

function insertHtml(html) {
  document.execCommand("insertHTML", false, html);
}

/** Escape a CSV cell value (wrap in quotes, double internal quotes). */
function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Build a CSV string from a notification's response summary and trigger a
 * browser download. Demo export — flattens distributions and text samples.
 */
function exportResponsesCsv(notif) {
  const rows = [["Question", "Type", "Answer", "Count"]];
  for (const q of notif.responseSummary || []) {
    if (q.distribution) {
      for (const d of q.distribution) rows.push([q.label, q.type, d.name, d.value]);
    }
    if (q.samples) {
      for (const s of q.samples) rows.push([q.label, q.type, s, ""]);
    }
  }
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${notif.id}-responses.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Toolbar format button for the rich body editor. */
function FmtBtn({ active, title, onMouseDown, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={onMouseDown}
      className="rounded-[8px] px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
      style={{
        backgroundColor: active ? "var(--adm-accent-dim)" : "transparent",
        color: active ? "var(--adm-accent)" : "var(--adm-text2)",
        border: active ? "1px solid color-mix(in srgb, var(--adm-accent) 25%, transparent)" : "1px solid transparent",
      }}
    >
      {children}
    </button>
  );
}

/**
 * Rich contentEditable body editor with formatting toolbar.
 * Mirrors the editor pattern used in AdminEmailPage.
 *
 * @param {{ value: string, onChange: (html: string) => void }} props
 */
function RichBodyEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [formats, setFormats] = useState(EMPTY_ACTIVE_FORMATS);

  // Keep DOM in sync when value changes externally
  useEffect(() => {
    const el = editorRef.current;
    if (el && el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  const syncFormats = useCallback(() => {
    setFormats({
      bold:      document.queryCommandState("bold"),
      italic:    document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      h2:        document.queryCommandValue("formatBlock") === "h2",
      quote:     document.queryCommandValue("formatBlock") === "blockquote",
      ul:        document.queryCommandState("insertUnorderedList"),
      ol:        document.queryCommandState("insertOrderedList"),
      link:      document.queryCommandState("createLink"),
    });
  }, []);

  const syncBody = useCallback(() => {
    const el = editorRef.current;
    if (el) onChange(el.innerHTML);
    syncFormats();
  }, [onChange, syncFormats]);

  const focusEditor = useCallback(() => {
    editorRef.current?.focus();
  }, []);

  /** execCommand wrapper that re-focuses editor & syncs body. */
  const exec = useCallback((cmd, val) => {
    focusEditor();
    document.execCommand(cmd, false, val ?? undefined);
    syncBody();
  }, [focusEditor, syncBody]);

  const handleFmtBlock = useCallback((tag) => {
    focusEditor();
    const current = document.queryCommandValue("formatBlock");
    document.execCommand("formatBlock", false, current === tag ? "p" : tag);
    syncBody();
  }, [focusEditor, syncBody]);

  const handleLink = useCallback(() => {
    const url = window.prompt("Enter link URL:");
    if (!url?.trim()) return;
    focusEditor();
    const sel = window.getSelection?.()?.toString().trim();
    if (sel) {
      document.execCommand("createLink", false, url.trim());
    } else {
      insertHtml(`<a href="${url.trim()}">${url.trim()}</a>`);
    }
    syncBody();
  }, [focusEditor, syncBody]);

  const handleClearFormat = useCallback(() => {
    exec("removeFormat");
    exec("formatBlock", "p");
  }, [exec]);

  return (
    <div
      className="flex flex-col rounded-[var(--adm-radius-sm)] overflow-hidden"
      style={{
        border: focused
          ? "1px solid var(--adm-accent)"
          : "1px solid var(--adm-border2)",
        transition: "border-color 0.15s",
        boxShadow: focused ? "0 0 0 3px color-mix(in srgb, var(--adm-accent) 18%, transparent)" : "none",
      }}
    >
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-0.5 px-2 py-1.5"
        style={{ borderBottom: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface2)" }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <FmtBtn active={formats.bold}      title="Bold"      onMouseDown={() => exec("bold")}>      <b>B</b> </FmtBtn>
        <FmtBtn active={formats.italic}    title="Italic"    onMouseDown={() => exec("italic")}>    <i>I</i>  </FmtBtn>
        <FmtBtn active={formats.underline} title="Underline" onMouseDown={() => exec("underline")}> <u>U</u>  </FmtBtn>
        <span className="mx-1 h-4 w-px" style={{ backgroundColor: "var(--adm-border)" }} />
        <FmtBtn active={formats.h2}    title="Heading"    onMouseDown={() => handleFmtBlock("h2")}>H2</FmtBtn>
        <FmtBtn active={formats.quote} title="Blockquote" onMouseDown={() => handleFmtBlock("blockquote")}>&ldquo;</FmtBtn>
        <span className="mx-1 h-4 w-px" style={{ backgroundColor: "var(--adm-border)" }} />
        <FmtBtn active={formats.ul}    title="Bullet list" onMouseDown={() => exec("insertUnorderedList")}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
            <circle cx="2.5" cy="4" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="2.5" cy="8" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="2.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
            <line x1="6" y1="4" x2="15" y2="4" />
            <line x1="6" y1="8" x2="15" y2="8" />
            <line x1="6" y1="12" x2="15" y2="12" />
          </svg>
        </FmtBtn>
        <FmtBtn active={formats.ol} title="Numbered list" onMouseDown={() => exec("insertOrderedList")}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
            <text x="1" y="5.5" fontSize="4.5" fill="currentColor" stroke="none" fontWeight="700">1.</text>
            <text x="1" y="9.5" fontSize="4.5" fill="currentColor" stroke="none" fontWeight="700">2.</text>
            <text x="1" y="13.5" fontSize="4.5" fill="currentColor" stroke="none" fontWeight="700">3.</text>
            <line x1="7" y1="4" x2="15" y2="4" />
            <line x1="7" y1="8" x2="15" y2="8" />
            <line x1="7" y1="12" x2="15" y2="12" />
          </svg>
        </FmtBtn>
        <FmtBtn active={formats.link} title="Insert link" onMouseDown={handleLink}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </FmtBtn>
        <span className="mx-1 h-4 w-px" style={{ backgroundColor: "var(--adm-border)" }} />
        <FmtBtn active={false} title="Clear formatting" onMouseDown={handleClearFormat}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L17.94 6M3.27 3L21 21" />
          </svg>
        </FmtBtn>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncBody}
        onKeyUp={syncFormats}
        onMouseUp={syncFormats}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); syncBody(); }}
        className="min-h-[220px] p-4 text-sm outline-none"
        style={{
          color: "var(--adm-text)",
          backgroundColor: "var(--adm-surface)",
          lineHeight: 1.65,
        }}
        data-placeholder="Write your notification message here..."
      />
    </div>
  );
}

/**
 * Renders a single response question as an interactive (sample) form field,
 * exactly as a recipient would see it. Inputs are live but unmanaged — this is
 * a visual preview only.
 *
 * @param {{ question: object, index: number }} props
 */
function QuestionPreviewField({ question, index }) {
  const { type, label, required, options = [], scaleMax = 5, scaleMinLabel, scaleMaxLabel } = question;
  const fieldStyle = {
    backgroundColor: "var(--adm-surface)",
    border: "1px solid var(--adm-border2)",
    color: "var(--adm-text)",
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
        {label || `Question ${index + 1}`}
        {required && <span style={{ color: "var(--adm-danger)" }}> *</span>}
      </label>

      {type === "short" && (
        <input type="text" disabled placeholder="Short answer text"
          className="h-9 rounded-[var(--adm-radius-sm)] px-3 text-sm" style={fieldStyle} />
      )}

      {type === "paragraph" && (
        <textarea disabled rows={3} placeholder="Long answer text"
          className="rounded-[var(--adm-radius-sm)] p-3 text-sm resize-none" style={fieldStyle} />
      )}

      {(type === "multiple" || type === "checkboxes") && (
        <div className="flex flex-col gap-2">
          {options.map((opt, i) => (
            <label key={i} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--adm-text2)" }}>
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center"
                style={{
                  border: "2px solid var(--adm-border2)",
                  borderRadius: type === "multiple" ? "999px" : "4px",
                  backgroundColor: "var(--adm-surface)",
                }}
              />
              {opt || `Option ${i + 1}`}
            </label>
          ))}
        </div>
      )}

      {type === "dropdown" && (
        <div className="relative" style={{ maxWidth: 280 }}>
          <select disabled className="h-9 w-full appearance-none rounded-[var(--adm-radius-sm)] px-3 pr-8 text-sm" style={fieldStyle}>
            <option>Choose…</option>
            {options.map((opt, i) => <option key={i}>{opt || `Option ${i + 1}`}</option>)}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--adm-muted)" }} />
        </div>
      )}

      {type === "yes_no" && (
        <div className="flex gap-2">
          {["Yes", "No"].map((opt) => (
            <span key={opt} className="rounded-full px-4 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border2)", color: "var(--adm-text2)" }}>
              {opt}
            </span>
          ))}
        </div>
      )}

      {type === "scale" && (
        <div className="flex items-center gap-3">
          {scaleMinLabel && <span className="text-xs" style={{ color: "var(--adm-muted)" }}>{scaleMinLabel}</span>}
          <div className="flex items-center gap-3">
            {Array.from({ length: scaleMax }, (_, i) => i + 1).map((n) => (
              <div key={n} className="flex flex-col items-center gap-1">
                <span className="text-[10px]" style={{ color: "var(--adm-muted)" }}>{n}</span>
                <span className="h-4 w-4 rounded-full" style={{ border: "2px solid var(--adm-border2)" }} />
              </div>
            ))}
          </div>
          {scaleMaxLabel && <span className="text-xs" style={{ color: "var(--adm-muted)" }}>{scaleMaxLabel}</span>}
        </div>
      )}

      {type === "rating" && (
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <FiStar key={n} className="h-6 w-6" style={{ color: "var(--adm-border2)" }} />
          ))}
        </div>
      )}

      {type === "date" && (
        <input type="date" disabled className="h-9 rounded-[var(--adm-radius-sm)] px-3 text-sm" style={{ ...fieldStyle, maxWidth: 200 }} />
      )}

      {type === "file" && (
        <span className="flex w-fit items-center gap-2 rounded-[var(--adm-radius-sm)] px-3 py-2 text-xs font-semibold"
          style={{ backgroundColor: "var(--adm-surface2)", border: "1px dashed var(--adm-border2)", color: "var(--adm-text2)" }}>
          <FiUpload /> Upload a file
        </span>
      )}
    </div>
  );
}

/**
 * Shared chrome for a composer block: draggable card, grip handle, collapse
 * toggle, identifier, and the action controls (reorder / duplicate / delete /
 * add-below). Keeps controls in an always-visible header so blocks can be
 * managed while collapsed.
 *
 * @param {{
 *   kind: "text"|"question", number?: number, index: number, total: number,
 *   collapsed: boolean, onToggleCollapse: () => void, summary?: string,
 *   onMove: (dir: -1|1) => void, onDelete: () => void,
 *   onDuplicate?: () => void, onAddBelow: (pick) => void,
 *   dnd: { isDragging, isOver, onDragStart, onDragEnter, onDrop, onDragEnd },
 *   children: React.ReactNode,
 * }} props
 */
function BlockCard({
  kind, number, index, total, collapsed, onToggleCollapse, summary,
  onMove, onDelete, onDuplicate, onAddBelow, dnd, children,
}) {
  const [dragOn, setDragOn] = useState(false);
  const isQuestion = kind === "question";

  return (
    <div
      draggable={dragOn}
      onDragStart={dnd.onDragStart}
      onDragEnter={dnd.onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); dnd.onDrop(); setDragOn(false); }}
      onDragEnd={() => { dnd.onDragEnd(); setDragOn(false); }}
      className="flex flex-col gap-3 rounded-[var(--adm-radius-lg)] p-4 transition-shadow"
      style={{
        backgroundColor: "var(--adm-surface)",
        border: "1px solid var(--adm-border)",
        opacity: dnd.isDragging ? 0.45 : 1,
        boxShadow: dnd.isOver ? "0 -3px 0 var(--adm-accent)" : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Drag to reorder"
          onMouseDown={() => setDragOn(true)}
          onMouseUp={() => setDragOn(false)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--adm-radius-sm)] transition-opacity hover:opacity-70"
          style={{ color: "var(--adm-muted)", cursor: "grab" }}
        >
          <FiMove className="text-sm" />
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand" : "Collapse"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--adm-radius-sm)] transition-opacity hover:opacity-70"
          style={{ color: "var(--adm-muted)" }}
        >
          <FiChevronDown
            className="text-sm transition-transform"
            style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
          />
        </button>

        {isQuestion ? (
          <span
            className="flex h-6 shrink-0 items-center justify-center rounded-full px-2 text-xs font-bold"
            style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}
            title="Question"
          >
            Q{number}
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--adm-muted)" }}>
            <FiAlignLeft className="text-sm" /> Text
          </span>
        )}

        {collapsed && (
          <span className="min-w-0 flex-1 truncate text-sm" style={{ color: "var(--adm-text2)" }}>
            {summary || (isQuestion ? "Untitled question" : "Empty text block")}
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} title="Move up"
            className="flex h-7 w-7 items-center justify-center rounded-[var(--adm-radius-sm)] transition-opacity hover:opacity-70 disabled:opacity-30"
            style={{ color: "var(--adm-muted)" }}>
            <FiChevronUp className="text-sm" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} title="Move down"
            className="flex h-7 w-7 items-center justify-center rounded-[var(--adm-radius-sm)] transition-opacity hover:opacity-70 disabled:opacity-30"
            style={{ color: "var(--adm-muted)" }}>
            <FiChevronDown className="text-sm" />
          </button>
          {onDuplicate && (
            <button type="button" onClick={onDuplicate} title="Duplicate"
              className="flex h-7 w-7 items-center justify-center rounded-[var(--adm-radius-sm)] transition-opacity hover:opacity-70"
              style={{ color: "var(--adm-muted)" }}>
              <FiCopy className="text-sm" />
            </button>
          )}
          <button type="button" onClick={onDelete} title="Delete block"
            className="flex h-7 w-7 items-center justify-center rounded-[var(--adm-radius-sm)] transition-opacity hover:opacity-70"
            style={{ color: "var(--adm-danger)" }}>
            <FiTrash2 className="text-sm" />
          </button>
          <AddBlockMenu onPick={onAddBelow} compact align="right" />
        </div>
      </div>

      {!collapsed && children}
    </div>
  );
}

/**
 * Inline editor for a single response question block.
 *
 * @param {{
 *   question, index, total, number, collapsed, onToggleCollapse, dnd,
 *   onChange, onDelete, onDuplicate, onMove, onAddBelow,
 * }} props
 */
function QuestionEditor({ question, index, total, number, collapsed, onToggleCollapse, dnd, onChange, onDelete, onDuplicate, onMove, onAddBelow }) {
  const meta = QUESTION_TYPE_MAP[question.type] ?? QUESTION_TYPES[0];
  const hasOptions = meta.hasOptions;
  const summary = `${meta.label} · ${question.label?.trim() || "Untitled question"}`;

  const updateOption = (i, value) => {
    const next = [...(question.options || [])];
    next[i] = value;
    onChange({ options: next });
  };
  const addOption = () => onChange({ options: [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`] });
  const removeOption = (i) => onChange({ options: (question.options || []).filter((_, j) => j !== i) });

  return (
    <BlockCard
      kind="question" number={number} index={index} total={total}
      collapsed={collapsed} onToggleCollapse={onToggleCollapse} summary={summary}
      onMove={onMove} onDelete={onDelete} onDuplicate={onDuplicate} onAddBelow={onAddBelow} dnd={dnd}
    >
      {/* Prompt + type */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <input
          type="text"
          value={question.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Question prompt (e.g. How was practice?)"
          className="h-9 flex-1 rounded-[var(--adm-radius-sm)] px-3 text-sm outline-none transition-colors"
          style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border2)", color: "var(--adm-text)" }}
        />
        <div className="relative sm:w-44">
          <select
            value={question.type}
            onChange={(e) => {
              const nextType = e.target.value;
              const patch = { type: nextType };
              if (QUESTION_TYPE_MAP[nextType]?.hasOptions && !question.options) patch.options = ["Option 1", "Option 2"];
              if (nextType === "scale" && !question.scaleMax) { patch.scaleMax = 5; }
              onChange(patch);
            }}
            className="h-9 w-full appearance-none rounded-[var(--adm-radius-sm)] px-3 pr-8 text-sm outline-none"
            style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border2)", color: "var(--adm-text)" }}
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--adm-muted)" }} />
        </div>
      </div>

      {/* Options editor */}
      {hasOptions && (
        <div className="flex flex-col gap-2">
          {(question.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 shrink-0"
                style={{
                  border: "2px solid var(--adm-border2)",
                  borderRadius: question.type === "multiple" ? "999px" : "3px",
                }}
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="h-8 flex-1 rounded-[var(--adm-radius-sm)] px-2.5 text-sm outline-none"
                style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
              />
              {(question.options || []).length > 1 && (
                <button type="button" onClick={() => removeOption(i)} title="Remove option"
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--adm-radius-sm)] transition-opacity hover:opacity-70"
                  style={{ color: "var(--adm-muted)" }}>
                  <FiTrash2 className="text-sm" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addOption}
            className="flex w-fit items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ color: "var(--adm-accent)" }}>
            <FiPlus className="text-xs" /> Add option
          </button>
        </div>
      )}

      {/* Scale config */}
      {question.type === "scale" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--adm-muted)" }}>Scale 1 to</span>
            <div className="relative">
              <select
                value={question.scaleMax ?? 5}
                onChange={(e) => onChange({ scaleMax: Number(e.target.value) })}
                className="h-8 appearance-none rounded-[var(--adm-radius-sm)] pl-2.5 pr-7 text-sm outline-none"
                style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border2)", color: "var(--adm-text)" }}
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--adm-muted)" }} />
            </div>
          </div>
          <input type="text" value={question.scaleMinLabel || ""} onChange={(e) => onChange({ scaleMinLabel: e.target.value })}
            placeholder="Low label (optional)"
            className="h-8 w-40 rounded-[var(--adm-radius-sm)] px-2.5 text-sm outline-none"
            style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }} />
          <input type="text" value={question.scaleMaxLabel || ""} onChange={(e) => onChange({ scaleMaxLabel: e.target.value })}
            placeholder="High label (optional)"
            className="h-8 w-40 rounded-[var(--adm-radius-sm)] px-2.5 text-sm outline-none"
            style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }} />
        </div>
      )}

      {/* Required toggle */}
      <div style={{ borderTop: "1px solid var(--adm-border)", paddingTop: 12 }}>
        <label className="flex w-fit items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: "var(--adm-text2)" }}>
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => onChange({ required: e.target.checked })}
            className="h-3.5 w-3.5 accent-[var(--adm-accent)]"
          />
          Required
        </label>
      </div>
    </BlockCard>
  );
}

/**
 * Dropdown that lets the user insert a new block — a text block or any
 * question type. Used both at the bottom of the composer and inline ("add
 * below") on each block.
 *
 * @param {{
 *   onPick: (pick: {kind: "text"|"question", type?: string}) => void,
 *   compact?: boolean,
 *   align?: "left"|"right",
 *   label?: string,
 * }} props
 */
function AddBlockMenu({ onPick, compact = false, align = "left", label = "Add block" }) {
  const [open, setOpen] = useState(false);
  const pick = (p) => { onPick(p); setOpen(false); };

  return (
    <div className="relative">
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title="Insert block below"
          className="flex h-7 w-7 items-center justify-center rounded-[var(--adm-radius-sm)] transition-opacity hover:opacity-70"
          style={{ color: "var(--adm-accent)" }}
        >
          <FiPlus className="text-sm" />
        </button>
      ) : (
        <AdminBtn variant="outline" onClick={() => setOpen((v) => !v)}>
          <FiPlus />
          {label}
          <FiChevronDown className="text-xs" />
        </AdminBtn>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full z-20 mt-1 w-60 overflow-hidden rounded-[var(--adm-radius-md)] py-1"
            style={{
              [align === "right" ? "right" : "left"]: 0,
              backgroundColor: "var(--adm-surface)",
              border: "1px solid var(--adm-border2)",
              boxShadow: "var(--adm-shadow)",
            }}
          >
            <button
              type="button"
              onClick={() => pick({ kind: "text" })}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:opacity-80"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-[var(--adm-radius-sm)]"
                style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-accent)" }}>
                <FiAlignLeft />
              </span>
              <span style={{ color: "var(--adm-text)" }}>Text block</span>
            </button>
            <div className="my-1" style={{ borderTop: "1px solid var(--adm-border)" }} />
            <span className="block px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--adm-muted)" }}>
              Question
            </span>
            {QUESTION_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => pick({ kind: "question", type: t.value })}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:opacity-80"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-[var(--adm-radius-sm)]"
                  style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-accent)" }}>
                  {t.icon}
                </span>
                <span style={{ color: "var(--adm-text)" }}>{t.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * A rich-text block within the composer body, rendered inside a BlockCard.
 *
 * @param {{
 *   block, index, total, collapsed, onToggleCollapse, dnd,
 *   onChange, onDelete, onMove, onAddBelow,
 * }} props
 */
function TextBlockEditor({ block, index, total, collapsed, onToggleCollapse, dnd, onChange, onDelete, onMove, onAddBelow }) {
  const summary = stripHtml(block.html).slice(0, 90) || "Empty text block";
  return (
    <BlockCard
      kind="text" index={index} total={total}
      collapsed={collapsed} onToggleCollapse={onToggleCollapse} summary={summary}
      onMove={onMove} onDelete={onDelete} onAddBelow={onAddBelow} dnd={dnd}
    >
      <RichBodyEditor value={block.html} onChange={(html) => onChange({ html })} />
    </BlockCard>
  );
}

/**
 * Unified body composer: an ordered list of text and question blocks that can
 * be freely interleaved (text can sit between questions). Supports drag-and-drop
 * reordering and per-block collapse.
 *
 * @param {{ blocks: object[], onChange: (next: object[]) => void }} props
 */
function BlockComposer({ blocks, onChange }) {
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const insertAt = (index, p) => {
    const block = p.kind === "text" ? makeTextBlock() : makeQuestionBlock(p.type);
    const next = [...blocks];
    next.splice(index, 0, block);
    onChange(next);
  };
  const patch = (id, p) => onChange(blocks.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const remove = (id) => onChange(blocks.filter((b) => b.id !== id));
  const duplicate = (id) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const src = blocks[idx];
    const copy = {
      ...makeQuestionBlock(src.type),
      label: src.label,
      required: src.required,
      options: src.options ? [...src.options] : undefined,
      scaleMax: src.scaleMax, scaleMinLabel: src.scaleMinLabel, scaleMaxLabel: src.scaleMaxLabel,
    };
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };
  const move = (id, dir) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  /** Drop the dragged block onto the position of block `to`. */
  const reorder = (from, to) => {
    if (from == null || to == null || from === to) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(from < to ? to - 1 : to, 0, moved);
    onChange(next);
  };
  const endDrag = () => { setDragIndex(null); setOverIndex(null); };

  const toggleCollapse = (id) =>
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const allCollapsed = blocks.length > 0 && blocks.every((b) => collapsedIds.has(b.id));
  const toggleAll = () =>
    setCollapsedIds(allCollapsed ? new Set() : new Set(blocks.map((b) => b.id)));

  let qCount = 0;

  return (
    <div className="flex flex-col gap-3">
      {blocks.length > 1 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ color: "var(--adm-muted)" }}
          >
            <FiChevronDown
              className="text-xs transition-transform"
              style={{ transform: allCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
            />
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
        </div>
      )}

      {blocks.length === 0 ? (
        <div
          className="flex flex-col items-center gap-2 rounded-[var(--adm-radius-lg)] py-10 text-center"
          style={{ border: "1px dashed var(--adm-border2)", backgroundColor: "var(--adm-surface)" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}>
            <FiAlignLeft />
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Empty notification</p>
          <p className="max-w-xs text-xs" style={{ color: "var(--adm-text2)" }}>
            Add a text block to write your message, or a question to collect responses. Mix them in any order.
          </p>
        </div>
      ) : (
        blocks.map((b, i) => {
          const dnd = {
            isDragging: dragIndex === i,
            isOver: overIndex === i && dragIndex !== null && dragIndex !== i,
            onDragStart: () => setDragIndex(i),
            onDragEnter: () => setOverIndex(i),
            onDrop: () => reorder(dragIndex, i),
            onDragEnd: endDrag,
          };
          if (b.kind === "question") qCount += 1;
          return b.kind === "text" ? (
            <TextBlockEditor
              key={b.id}
              block={b}
              index={i}
              total={blocks.length}
              collapsed={collapsedIds.has(b.id)}
              onToggleCollapse={() => toggleCollapse(b.id)}
              dnd={dnd}
              onChange={(p) => patch(b.id, p)}
              onDelete={() => remove(b.id)}
              onMove={(dir) => move(b.id, dir)}
              onAddBelow={(pick) => insertAt(i + 1, pick)}
            />
          ) : (
            <QuestionEditor
              key={b.id}
              question={b}
              index={i}
              total={blocks.length}
              number={qCount}
              collapsed={collapsedIds.has(b.id)}
              onToggleCollapse={() => toggleCollapse(b.id)}
              dnd={dnd}
              onChange={(p) => patch(b.id, p)}
              onDelete={() => remove(b.id)}
              onDuplicate={() => duplicate(b.id)}
              onMove={(dir) => move(b.id, dir)}
              onAddBelow={(pick) => insertAt(i + 1, pick)}
            />
          );
        })
      )}

      <AddBlockMenu onPick={(pick) => insertAt(blocks.length, pick)} label="Add text or question" />
    </div>
  );
}

/**
 * Audience quick-pick chips + filter controls.
 *
 * @param {{ mode, sport, playFilter, signupFrom, signupTo, onUpdate }} props
 */
function AudienceSelector({ mode, sport, playFilter, signupFrom, signupTo, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      {/* Quick chips */}
      <div className="flex flex-wrap gap-2">
        {AUDIENCE_QUICK.map((q) => {
          const active = mode === q.id;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onUpdate("mode", q.id)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
              style={{
                backgroundColor: active ? "var(--adm-accent-dim)" : "var(--adm-surface2)",
                color: active ? "var(--adm-accent)" : "var(--adm-text2)",
                border: active
                  ? "1px solid color-mix(in srgb, var(--adm-accent) 28%, transparent)"
                  : "1px solid var(--adm-border)",
                boxShadow: active ? "0 0 0 2px color-mix(in srgb, var(--adm-accent) 14%, transparent)" : "none",
              }}
            >
              <span className="text-xs">{q.icon}</span>
              {q.label}
              {active && <FiCheck className="text-xs" />}
            </button>
          );
        })}
      </div>

      {/* Additional filters toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-fit items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
        style={{ color: "var(--adm-muted)" }}
      >
        <FiFilter className="text-xs" />
        Additional filters
        <FiChevronDown
          className="text-xs transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {expanded && (
        <div
          className="grid grid-cols-1 gap-4 rounded-[var(--adm-radius-sm)] p-4 sm:grid-cols-2 lg:grid-cols-3"
          style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
        >
          <div>
            <label className={LABEL_CLASS} style={{ color: "var(--adm-muted)" }}>Filter by sport</label>
            <AdminSelect
              value={sport}
              onChange={(e) => onUpdate("sport", e.target.value)}
              size="sm"
            >
              {SPORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </AdminSelect>
          </div>

          <div>
            <label className={LABEL_CLASS} style={{ color: "var(--adm-muted)" }}>Play activity</label>
            <AdminSelect
              value={playFilter}
              onChange={(e) => onUpdate("playFilter", e.target.value)}
              size="sm"
            >
              {PLAY_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </AdminSelect>
          </div>

          <div>
            <label className={LABEL_CLASS} style={{ color: "var(--adm-muted)" }}>Signed up after</label>
            <AdminInput
              type="date"
              value={signupFrom}
              onChange={(e) => onUpdate("signupFrom", e.target.value)}
              size="sm"
            />
          </div>

          <div>
            <label className={LABEL_CLASS} style={{ color: "var(--adm-muted)" }}>Signed up before</label>
            <AdminInput
              type="date"
              value={signupTo}
              onChange={(e) => onUpdate("signupTo", e.target.value)}
              size="sm"
            />
          </div>
        </div>
      )}

      {/* Estimated count pill */}
      <div
        className="flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
        style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)", color: "var(--adm-text2)" }}
      >
        <FiUsers className="text-xs" />
        Estimated audience:
        <span style={{ color: "var(--adm-text)" }}>
          {mode === "all"      ? "~1,389 users"
          : mode === "active"  ? "~712 users"
          : mode === "inactive" ? "~677 users"
          : mode === "coaches" ? "~534 users"
          : mode === "players" ? "~855 users"
          : "Calculating..."}
        </span>
      </div>
    </div>
  );
}

/** Replace merge tags with sample recipient values for preview. */
function personalizeSample(html) {
  return String(html || "")
    .replace(/\{\{firstName\}\}/g, "Alex")
    .replace(/\{\{lastName\}\}/g, "Johnson")
    .replace(/\{\{teamName\}\}/g, "Westside FC")
    .replace(/\{\{email\}\}/g, "alex@example.com");
}

/**
 * In-app notification preview rendered as it would appear to a recipient.
 * Renders blocks (text + questions) in order, so text can sit between questions.
 *
 * @param {{ title, subject, priority, blocks }} props
 */
function NotificationPreview({ title, subject, priority, blocks = [] }) {
  const sampleName = "Alex Johnson";
  const sampleTeam = "Westside FC";
  const hasQuestion = blocks.some((b) => b.kind === "question");
  let qNum = 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
        Preview for: <span style={{ color: "var(--adm-text)" }}>{sampleName}</span> · {sampleTeam}
      </p>

      {/* In-app card mock */}
      <div
        className="rounded-[var(--adm-radius-lg)] p-5 flex flex-col gap-3"
        style={{
          background: "linear-gradient(160deg, var(--adm-surface2) 0%, var(--adm-surface) 100%)",
          border: "1px solid var(--adm-border)",
          maxWidth: 420,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}
          >
            <FiBell />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-sm font-bold" style={{ color: "var(--adm-text)" }}>
              {title || "Notification Title"}
            </span>
            <span className="text-xs" style={{ color: "var(--adm-text2)" }}>
              {subject || "Notification subject or headline goes here."}
            </span>
            {priority === "high" && (
              <span
                className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: "var(--adm-badge-amber-bg)", color: "var(--adm-badge-amber-text)" }}
              >
                <FiAlertCircle className="text-xs" /> HIGH PRIORITY
              </span>
            )}
            {priority === "critical" && (
              <span
                className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: "var(--adm-badge-red-bg)", color: "var(--adm-badge-red-text)" }}
              >
                <FiAlertCircle className="text-xs" /> CRITICAL
              </span>
            )}
          </div>
        </div>

        {/* Blocks in order */}
        {blocks.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--adm-muted)" }}>Your notification content will appear here.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {blocks.map((b) => {
              if (b.kind === "text") {
                return stripHtml(b.html) ? (
                  <div
                    key={b.id}
                    className="prose-sm text-sm leading-relaxed"
                    style={{ color: "var(--adm-text2)" }}
                    dangerouslySetInnerHTML={{ __html: personalizeSample(b.html) }}
                  />
                ) : null;
              }
              qNum += 1;
              return <QuestionPreviewField key={b.id} question={b} index={qNum - 1} />;
            })}
            {hasQuestion && (
              <button
                type="button"
                className="flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold"
                style={{ backgroundColor: "var(--adm-accent)", color: "#fff" }}
              >
                Submit response <FiArrowRight className="text-xs" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs" style={{ color: "var(--adm-muted)" }}>Just now</span>
          {!hasQuestion && blocks.length > 0 && (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: "var(--adm-accent)", color: "#fff" }}
            >
              View <FiArrowRight className="text-xs" />
            </button>
          )}
        </div>
      </div>

      <AdminAlert tone="info" title="Sample data">
        This preview uses sample recipient data. Real names and team info will be filled in at send time.
      </AdminAlert>
    </div>
  );
}

/**
 * Modal for entering test recipient data before test-sending.
 *
 * @param {{ open, onClose, onSend, sending }} props
 */
function TestSendModal({ open, onClose, onSend, sending }) {
  const [email, setEmail] = useState("founder@coachableplays.com");
  const [name,  setName]  = useState("Test User");
  const [team,  setTeam]  = useState("Demo Team");

  return (
    <AdminModal open={open} onClose={onClose} title="Test Send" width="max-w-sm">
      <div className="flex flex-col gap-4">
        <p className="text-sm" style={{ color: "var(--adm-text2)" }}>
          Send this notification to a single test recipient. Real users will not be notified.
        </p>

        <AdminInput
          label="Test email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <AdminInput
          label="Recipient name (for merge tags)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex Johnson"
        />
        <AdminInput
          label="Team name (for merge tags)"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          placeholder="Westside FC"
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <AdminBtn variant="ghost" onClick={onClose} disabled={sending}>
            Cancel
          </AdminBtn>
          <AdminBtn
            variant="primary"
            onClick={() => onSend({ email, name, team })}
            disabled={sending || !email.trim()}
          >
            {sending ? <AdminSpinner size="sm" /> : <FiSend />}
            Send test
          </AdminBtn>
        </div>
      </div>
    </AdminModal>
  );
}

/**
 * Confirm modal shown before sending to the full filtered audience.
 *
 * @param {{ open, onClose, onConfirm, recipientLabel, sending }} props
 */
function SendConfirmModal({ open, onClose, onConfirm, recipientLabel, sending }) {
  return (
    <AdminModal open={open} onClose={onClose} title="Confirm Send" width="max-w-sm">
      <div className="flex flex-col gap-4">
        <AdminAlert tone="warning" title="This will send to real users">
          You are about to send this notification to <strong>{recipientLabel}</strong>.
          This action cannot be undone.
        </AdminAlert>
        <div className="flex items-center justify-end gap-2 pt-1">
          <AdminBtn variant="ghost" onClick={onClose} disabled={sending}>Cancel</AdminBtn>
          <AdminBtn variant="primary" onClick={onConfirm} disabled={sending}>
            {sending ? <AdminSpinner size="sm" /> : <FiSend />}
            Yes, send now
          </AdminBtn>
        </div>
      </div>
    </AdminModal>
  );
}

/**
 * Renders collected response data for a past notification:
 * horizontal bar charts for choice/scale/rating questions, sample text lists
 * for free-text questions.
 *
 * @param {{ summary: object[], total: number }} props
 */
function ResponseAnalytics({ summary, total }) {
  const accent = "#FF7A18";
  return (
    <div className="flex flex-col gap-5">
      {summary.map((q) => {
        const maxVal = q.distribution ? Math.max(...q.distribution.map((d) => d.value), 1) : 0;
        return (
          <div
            key={q.id}
            className="flex flex-col gap-3 rounded-[var(--adm-radius-sm)] p-4"
            style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
                {q.label}
              </span>
              {q.average != null && (
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold" style={{ color: "var(--adm-accent)" }}>
                  <FiStar className="text-xs" /> {q.average} avg
                </span>
              )}
            </div>

            {/* Distribution bars */}
            {q.distribution && (
              <div className="flex flex-col gap-2">
                {q.distribution.map((d) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-xs" style={{ color: "var(--adm-text2)" }}>{d.name}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--adm-surface3)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(d.value / maxVal) * 100}%`, backgroundColor: accent, minWidth: 4 }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums" style={{ color: "var(--adm-text)" }}>
                      {d.value} <span style={{ color: "var(--adm-muted)" }}>({pct(d.value, total)})</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Text samples */}
            {q.samples && (
              <div className="flex flex-col gap-2">
                {q.samples.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-[var(--adm-radius-sm)] px-3 py-2 text-sm"
                    style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)", color: "var(--adm-text2)" }}
                  >
                    “{s}”
                  </div>
                ))}
                <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
                  Showing {q.samples.length} of {total} responses
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Detail modal for a past notification with open rate + response analytics.
 *
 * @param {{ notif: object|null, onClose: () => void }} props
 */
function NotifDetailModal({ notif, onClose }) {
  if (!notif) return null;
  const accent = "#FF7A18";
  const openRate = notif.recipientCount ? ((notif.openCount / notif.recipientCount) * 100).toFixed(1) : 0;
  const clickRate = notif.openCount ? ((notif.clickCount / notif.openCount) * 100).toFixed(1) : 0;

  return (
    <AdminModal open={!!notif} onClose={onClose} title={notif.title} width="max-w-2xl">
      <div className="flex flex-col gap-6">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3">
          <AdminBadge status="info">In-App</AdminBadge>
          <AdminBadge status="resolved">Sent</AdminBadge>
          <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
            {fmtDate(notif.sentAt)} · {notif.audienceLabel}
          </span>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Recipients",  value: notif.recipientCount.toLocaleString() },
            { label: "Opens",       value: notif.openCount.toLocaleString(),     sub: openRate + "%" },
            { label: "Clicks",      value: notif.clickCount.toLocaleString(),    sub: clickRate + "%" },
            { label: "Responses",   value: notif.responseCount.toLocaleString() },
          ].map(({ label, value, sub }) => (
            <div
              key={label}
              className="flex flex-col gap-1 rounded-[var(--adm-radius-sm)] p-4"
              style={{ background: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--adm-muted)" }}>
                {label}
              </span>
              <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--adm-text)" }}>
                {value}
              </span>
              {sub && (
                <span className="text-xs font-semibold" style={{ color: "var(--adm-accent)" }}>{sub} rate</span>
              )}
            </div>
          ))}
        </div>

        {/* Opens by day chart */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--adm-muted)" }}>
            Opens by day
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={notif.opensByDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={accent} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--adm-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "var(--adm-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--adm-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--adm-surface2)",
                  border: "1px solid var(--adm-border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--adm-text)",
                }}
              />
              <Area type="monotone" dataKey="opens" stroke={accent} strokeWidth={2} fill="url(#openGrad)" dot={false} activeDot={{ r: 4, fill: accent }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Device breakdown */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--adm-muted)" }}>
              Device breakdown
            </p>
            <div className="flex items-center gap-6">
              <PieChart width={110} height={110}>
                <Pie data={notif.deviceBreakdown} cx={50} cy={50} innerRadius={30} outerRadius={48} dataKey="value" paddingAngle={3}>
                  {notif.deviceBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
              <div className="flex flex-col gap-2">
                {notif.deviceBreakdown.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span style={{ color: "var(--adm-text2)" }}>{d.name}</span>
                    <span className="font-semibold" style={{ color: "var(--adm-text)" }}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--adm-muted)" }}>
              Notification body
            </p>
            <div
              className="text-sm leading-relaxed"
              style={{ color: "var(--adm-text2)" }}
              dangerouslySetInnerHTML={{ __html: notif.body }}
            />
          </div>
        </div>

        {/* Collected responses */}
        {notif.responseSummary?.length > 0 && (
          <div style={{ borderTop: "1px solid var(--adm-border)", paddingTop: 20 }}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiClipboard className="text-sm" style={{ color: "var(--adm-accent)" }} />
                <span className="text-sm font-bold" style={{ color: "var(--adm-text)" }}>
                  Collected responses
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}
                >
                  {notif.responseCount} total
                </span>
              </div>
              <AdminBtn size="sm" variant="outline" onClick={() => exportResponsesCsv(notif)}>
                <FiDownload />
                Export CSV
              </AdminBtn>
            </div>
            <ResponseAnalytics summary={notif.responseSummary} total={notif.responseCount} />
          </div>
        )}

        <div className="flex justify-end">
          <AdminBtn variant="ghost" onClick={onClose}>Close</AdminBtn>
        </div>
      </div>
    </AdminModal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

/**
 * Admin notification command center.
 * Compose, target, preview, test-send, broadcast, and review past notifications.
 */
export default function AdminNotificationsPage() {
  const { isOwner } = useAdmin();

  // ── Composer state ───────────────────────────────────────────────────────
  const [composerTab,  setComposerTab]  = useState("form");   // "form" | "preview"
  const [title,        setTitle]        = useState("");
  const [subject,      setSubject]      = useState("");
  const [priority,     setPriority]     = useState("normal");
  const [blocks,       setBlocks]       = useState(() => [makeTextBlock()]);

  // Audience
  const [audMode,      setAudMode]      = useState("all");
  const [audSport,     setAudSport]     = useState("");
  const [audPlayFilter, setAudPlayFilter] = useState("any");
  const [audSignupFrom, setAudSignupFrom] = useState("");
  const [audSignupTo,   setAudSignupTo]   = useState("");

  // Actions
  const [testSendOpen,   setTestSendOpen]   = useState(false);
  const [confirmOpen,    setConfirmOpen]    = useState(false);
  const [sending,        setSending]        = useState(false);
  const [sendResult,     setSendResult]     = useState(null);
  const [sendError,      setSendError]      = useState("");

  // Past notifications
  const [searchQ,        setSearchQ]        = useState("");
  const [detailNotif,    setDetailNotif]    = useState(null);

  // ── Derived ─────────────────────────────────────────────────────────────
  const hasContent = blocks.some(
    (b) => b.kind === "question" || (b.kind === "text" && stripHtml(b.html))
  );
  const canCompose = title.trim() && subject.trim() && hasContent;
  const questionCount = blocks.filter((b) => b.kind === "question").length;

  const audienceLabel =
    audMode === "all"      ? "All Users"
    : audMode === "active"  ? "Active Users"
    : audMode === "inactive" ? "Inactive Users"
    : audMode === "coaches" ? "Coaches"
    : audMode === "players" ? "Players Only"
    : "Selected audience";

  const filteredPast = useMemo(() => {
    if (!searchQ.trim()) return DEMO_PAST;
    const q = searchQ.toLowerCase();
    return DEMO_PAST.filter(
      (n) => n.title.toLowerCase().includes(q) || n.subject.toLowerCase().includes(q) || n.audienceLabel.toLowerCase().includes(q)
    );
  }, [searchQ]);

  // ── Overall KPIs from demo data ──────────────────────────────────────────
  const totalSent       = DEMO_PAST.reduce((s, n) => s + n.recipientCount, 0);
  const totalOpens      = DEMO_PAST.reduce((s, n) => s + n.openCount, 0);
  const avgOpenRate     = totalSent ? ((totalOpens / totalSent) * 100).toFixed(1) : 0;
  const totalNotifs     = DEMO_PAST.length;

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleAudUpdate = useCallback((key, val) => {
    if (key === "mode")       setAudMode(val);
    if (key === "sport")      setAudSport(val);
    if (key === "playFilter") setAudPlayFilter(val);
    if (key === "signupFrom") setAudSignupFrom(val);
    if (key === "signupTo")   setAudSignupTo(val);
  }, []);

  const handleTestSend = useCallback(async ({ email, name, team }) => {
    setSending(true);
    setSendResult(null);
    setSendError("");
    try {
      await adminApi("/admin/notifications/send", {
        method: "POST",
        body: JSON.stringify({
          title, subject, notifType: "in_app", priority, blocks,
          audience: { mode: audMode, sport: audSport, playFilter: audPlayFilter, signupFrom: audSignupFrom, signupTo: audSignupTo },
          testRecipient: { email, name, team },
        }),
      });
      setSendResult({ type: "test", email });
    } catch (err) {
      setSendError(err?.message || "Test send failed — API endpoint not yet wired.");
      setSendResult({ type: "test_error" });
    } finally {
      setSending(false);
      setTestSendOpen(false);
    }
  }, [title, subject, priority, blocks, audMode, audSport, audPlayFilter, audSignupFrom, audSignupTo]);

  const handleSendAll = useCallback(async () => {
    setConfirmOpen(false);
    setSending(true);
    setSendResult(null);
    setSendError("");
    try {
      await adminApi("/admin/notifications/send", {
        method: "POST",
        body: JSON.stringify({
          title, subject, notifType: "in_app", priority, blocks,
          audience: { mode: audMode, sport: audSport, playFilter: audPlayFilter, signupFrom: audSignupFrom, signupTo: audSignupTo },
        }),
      });
      setSendResult({ type: "broadcast" });
    } catch (err) {
      setSendError(err?.message || "Broadcast failed — API endpoint not yet wired.");
    } finally {
      setSending(false);
    }
  }, [title, subject, priority, blocks, audMode, audSport, audPlayFilter, audSignupFrom, audSignupTo]);

  if (!isOwner) {
    return (
      <AdminShell>
        <AdminPage>
          <p className="text-sm" style={{ color: "var(--adm-muted)" }}>
            Notifications are only available to the account owner.
          </p>
        </AdminPage>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <AdminHeader title="Notifications" subtitle="Compose, send, and review notifications" sticky />

      <AdminPage wide className="overflow-y-auto">
        <div className="flex flex-col gap-8 pb-16">

          {/* ── Send Notification ─────────────────────────────────────── */}
          <AdminSection
            title="Send Notification"
            subtitle="Compose a notification, target your audience, preview, then send."
          >
            <div className="flex flex-col gap-5">

              {/* Send result banners */}
              {sendResult?.type === "test" && (
                <AdminAlert tone="success" title="Test sent">
                  Notification sent to <strong>{sendResult.email}</strong>. Check your inbox.
                </AdminAlert>
              )}
              {sendResult?.type === "broadcast" && (
                <AdminAlert tone="success" title="Notification sent">
                  Your notification was queued for delivery to <strong>{audienceLabel}</strong>.
                </AdminAlert>
              )}
              {sendError && (
                <AdminAlert tone="warning" title="Note">
                  {sendError}
                </AdminAlert>
              )}

              {/* ── Setup fields ──────────────────────────────────────── */}
              <AdminCard>
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <AdminInput
                      label="Notification title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. New feature announcement"
                      hint="Internal label — not shown to recipients"
                    />
                    <AdminInput
                      label="Subject / headline"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Your plays just got superpowers"
                      hint="Shown as the email subject or push heading"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={LABEL_CLASS} style={{ color: "var(--adm-text2)" }}>
                        Priority
                      </label>
                      <AdminSelect
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                      >
                        {PRIORITY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </AdminSelect>
                    </div>
                    <div className="flex items-end">
                      <div
                        className="flex items-center gap-2 rounded-[var(--adm-radius-sm)] px-3 py-2.5 text-xs font-semibold w-full"
                        style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)", color: "var(--adm-text2)" }}
                      >
                        <FiBell style={{ color: "var(--adm-accent)" }} />
                        Delivery: In-app notification
                      </div>
                    </div>
                  </div>
                </div>
              </AdminCard>

              {/* ── Audience ──────────────────────────────────────────── */}
              <AdminCard>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FiUsers className="text-sm" style={{ color: "var(--adm-accent)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
                      Target audience
                    </span>
                  </div>
                  <AudienceSelector
                    mode={audMode}
                    sport={audSport}
                    playFilter={audPlayFilter}
                    signupFrom={audSignupFrom}
                    signupTo={audSignupTo}
                    onUpdate={handleAudUpdate}
                  />
                </div>
              </AdminCard>

              {/* ── Body composer + response form ─────────────────────── */}
              <AdminCard padding={false}>
                {/* Tab bar */}
                <div
                  className="flex items-center gap-1 px-4 pt-4 pb-0"
                  style={{ borderBottom: "1px solid var(--adm-border)" }}
                >
                  {["form", "preview"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setComposerTab(tab)}
                      className="px-4 py-2.5 text-sm font-semibold capitalize transition-colors"
                      style={{
                        color: composerTab === tab ? "var(--adm-accent)" : "var(--adm-muted)",
                        borderBottom: composerTab === tab ? "2px solid var(--adm-accent)" : "2px solid transparent",
                        marginBottom: -1,
                        backgroundColor: "transparent",
                      }}
                    >
                      {tab === "form" ? "Form" : "Preview"}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {composerTab === "form" ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold" style={{ color: "var(--adm-text2)" }}>
                          Notification content
                        </span>
                        <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
                          Mix text and questions in any order · merge tags: {"{{firstName}}"}, {"{{teamName}}"}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
                        Add text blocks to write your message and question blocks to collect responses
                        (ratings, RSVPs, availability, feedback, file uploads, and more). Put text between questions wherever you need it.
                      </p>
                      <BlockComposer blocks={blocks} onChange={setBlocks} />
                    </div>
                  ) : (
                    <NotificationPreview
                      title={title}
                      subject={subject}
                      priority={priority}
                      blocks={blocks}
                    />
                  )}
                </div>
              </AdminCard>

              {/* ── Actions ───────────────────────────────────────────── */}
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--adm-radius-lg)] p-4"
                style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
                    Ready to send?
                  </span>
                  <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
                    Test first, then broadcast to <strong style={{ color: "var(--adm-text2)" }}>{audienceLabel}</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <AdminBtn
                    variant="outline"
                    onClick={() => setTestSendOpen(true)}
                    disabled={!canCompose || sending}
                  >
                    <FiEye />
                    Test Send
                  </AdminBtn>
                  <AdminBtn
                    variant="primary"
                    onClick={() => setConfirmOpen(true)}
                    disabled={!canCompose || sending}
                  >
                    {sending ? <AdminSpinner size="sm" /> : <FiSend />}
                    Send Notification
                  </AdminBtn>
                </div>
              </div>

            </div>
          </AdminSection>

          {/* ── Past Notifications ────────────────────────────────────── */}
          <AdminSection
            title="Past Notifications"
            subtitle="Review previously sent notifications and their engagement metrics."
          >
            {/* KPI strip */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total sent",    value: totalNotifs,                         sub: "notifications" },
                { label: "Total reached", value: totalSent.toLocaleString(),           sub: "recipients" },
                { label: "Total opens",   value: totalOpens.toLocaleString(),          sub: "unique opens" },
                { label: "Avg open rate", value: avgOpenRate + "%",                    sub: "across all" },
              ].map(({ label, value, sub }) => (
                <div
                  key={label}
                  className="flex flex-col gap-1 rounded-[var(--adm-radius-lg)] p-4"
                  style={{
                    background: "linear-gradient(160deg, var(--adm-surface2) 0%, var(--adm-surface) 100%)",
                    border: "1px solid var(--adm-border)",
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--adm-muted)" }}>
                    {label}
                  </span>
                  <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--adm-text)" }}>
                    {value}
                  </span>
                  <span className="text-xs" style={{ color: "var(--adm-muted)" }}>{sub}</span>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                  style={{ color: "var(--adm-muted)" }}
                />
                <input
                  type="text"
                  placeholder="Search notifications…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  className="h-9 w-full rounded-[var(--adm-radius-sm)] pl-8 pr-3 text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--adm-surface2)",
                    border: "1px solid var(--adm-border2)",
                    color: "var(--adm-text)",
                  }}
                />
              </div>
            </div>

            <AdminCard padding={false}>
              {filteredPast.length === 0 ? (
                <AdminEmptyState
                  icon={<FiBell />}
                  title="No notifications found"
                  subtitle="Try adjusting your search query."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
                        {["Notification", "Sent", "Recipients", "Opens", "Open rate", "Responses", ""].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap"
                            style={{ color: "var(--adm-muted)" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPast.map((n, i) => (
                        <tr
                          key={n.id}
                          style={{
                            borderBottom: i < filteredPast.length - 1 ? "1px solid var(--adm-border)" : "none",
                          }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold" style={{ color: "var(--adm-text)" }}>
                                {n.title}
                              </span>
                              <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
                                {n.audienceLabel}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "var(--adm-text2)" }}>
                            {fmtDateShort(n.sentAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap tabular-nums" style={{ color: "var(--adm-text2)" }}>
                            {n.recipientCount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap tabular-nums" style={{ color: "var(--adm-text2)" }}>
                            {n.openCount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                              style={{
                                backgroundColor: parseFloat(pct(n.openCount, n.recipientCount)) > 50
                                  ? "var(--adm-badge-green-bg)"
                                  : "var(--adm-badge-amber-bg)",
                                color: parseFloat(pct(n.openCount, n.recipientCount)) > 50
                                  ? "var(--adm-badge-green-text)"
                                  : "var(--adm-badge-amber-text)",
                              }}
                            >
                              {pct(n.openCount, n.recipientCount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap tabular-nums" style={{ color: "var(--adm-text2)" }}>
                            {n.responseCount > 0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--adm-accent)" }}>
                                <FiClipboard className="text-xs" />
                                {n.responseCount.toLocaleString()}
                              </span>
                            ) : (
                              <span style={{ color: "var(--adm-muted)" }}>—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <AdminBtn
                              size="sm"
                              variant="ghost"
                              onClick={() => setDetailNotif(n)}
                            >
                              <FiBarChart2 />
                              Details
                            </AdminBtn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminCard>
          </AdminSection>

        </div>
      </AdminPage>

      {/* Modals */}
      <TestSendModal
        open={testSendOpen}
        onClose={() => setTestSendOpen(false)}
        onSend={handleTestSend}
        sending={sending}
      />
      <SendConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSendAll}
        recipientLabel={audienceLabel}
        sending={sending}
      />
      <NotifDetailModal
        notif={detailNotif}
        onClose={() => setDetailNotif(null)}
      />
    </AdminShell>
  );
}
