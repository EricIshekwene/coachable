/**
 * adminNotifications.test.js
 *
 * Unit tests for AdminNotificationsPage business logic:
 * - Open-rate / click-rate percentage helper
 * - Audience label resolution
 * - Composer "canCompose" gating logic
 * - Response-form question factory + type metadata
 * - CSV cell escaping for response export
 * - Demo past-notification + response-summary data shape
 */

import { describe, it, expect } from "vitest";

// ── Helpers mirrored from AdminNotificationsPage ─────────────────────────────

/** pct(a, b) — open/click rate display. */
function pct(a, b) {
  if (!b) return "—";
  return ((a / b) * 100).toFixed(1) + "%";
}

/** audienceLabel — resolves audience display name from mode key. */
function audienceLabel(mode) {
  return (
    mode === "all"      ? "All Users"
    : mode === "active"  ? "Active Users"
    : mode === "inactive" ? "Inactive Users"
    : mode === "coaches" ? "Coaches"
    : mode === "players" ? "Players Only"
    : "Selected audience"
  );
}

/** canCompose — mirrors the enabled state for the send buttons. */
function canCompose({ title, subject, body }) {
  return Boolean(title.trim() && subject.trim() && body.trim());
}

// Question type metadata (mirrors QUESTION_TYPES in the page).
const QUESTION_TYPES = [
  { value: "short",      hasOptions: false },
  { value: "paragraph",  hasOptions: false },
  { value: "multiple",   hasOptions: true },
  { value: "checkboxes", hasOptions: true },
  { value: "dropdown",   hasOptions: true },
  { value: "yes_no",     hasOptions: false },
  { value: "scale",      hasOptions: false },
  { value: "rating",     hasOptions: false },
  { value: "date",       hasOptions: false },
  { value: "file",       hasOptions: false },
];
const QUESTION_TYPE_MAP = Object.fromEntries(QUESTION_TYPES.map((q) => [q.value, q]));

let questionSeq = 0;
/** makeQuestion — mirrors the factory in the page. */
function makeQuestion(type = "short") {
  questionSeq += 1;
  const id = `q-${Date.now()}-${questionSeq}`;
  const base = { id, type, label: "", required: false };
  if (QUESTION_TYPE_MAP[type]?.hasOptions) base.options = ["Option 1", "Option 2"];
  if (type === "scale") { base.scaleMax = 5; base.scaleMinLabel = ""; base.scaleMaxLabel = ""; }
  return base;
}

// Block model — body is an ordered list of text + question blocks.
let blockSeq = 0;
function makeTextBlock(html = "") {
  blockSeq += 1;
  return { id: `b-${Date.now()}-${blockSeq}`, kind: "text", html };
}
function makeQuestionBlock(type = "short") {
  return { ...makeQuestion(type), kind: "question" };
}
function stripHtml(html) {
  return String(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}
/** hasContent — mirrors the canCompose content check in the page. */
function hasContent(blocks) {
  return blocks.some((b) => b.kind === "question" || (b.kind === "text" && stripHtml(b.html)));
}
/** insertAt — mirrors block insertion (text can sit between questions). */
function insertAt(blocks, index, pick) {
  const block = pick.kind === "text" ? makeTextBlock() : makeQuestionBlock(pick.type);
  const next = [...blocks];
  next.splice(index, 0, block);
  return next;
}

/** csvCell — mirrors CSV escaping in the page. */
function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ── Demo data subset (mirrors a notification with responses) ─────────────────

const DEMO_WITH_RESPONSES = {
  id: "n-001",
  title: "Welcome",
  subject: "Hi",
  status: "sent",
  recipientCount: 1247,
  openCount: 834,
  clickCount: 312,
  responseCount: 89,
  responseSummary: [
    {
      id: "q1", label: "Rate it", type: "rating", average: 4.1,
      distribution: [
        { name: "5★", value: 41 }, { name: "4★", value: 28 },
        { name: "3★", value: 12 }, { name: "2★", value: 5 }, { name: "1★", value: 3 },
      ],
    },
    {
      id: "q3", label: "Feedback", type: "paragraph",
      samples: ["Great, with a comma", 'Has "quotes"', "Plain"],
    },
  ],
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("pct helper", () => {
  it("returns a percentage string for normal inputs", () => {
    expect(pct(834, 1247)).toBe("66.9%");
  });
  it("returns '—' when denominator is 0", () => {
    expect(pct(100, 0)).toBe("—");
  });
  it("returns '0.0%' when numerator is 0", () => {
    expect(pct(0, 500)).toBe("0.0%");
  });
});

describe("audienceLabel", () => {
  it("resolves all known audience modes", () => {
    expect(audienceLabel("all")).toBe("All Users");
    expect(audienceLabel("active")).toBe("Active Users");
    expect(audienceLabel("inactive")).toBe("Inactive Users");
    expect(audienceLabel("coaches")).toBe("Coaches");
    expect(audienceLabel("players")).toBe("Players Only");
  });
  it("falls back to 'Selected audience' for unknown modes", () => {
    expect(audienceLabel("custom")).toBe("Selected audience");
  });
});

describe("canCompose gating", () => {
  it("returns true when title, subject, and body are non-empty", () => {
    expect(canCompose({ title: "T", subject: "S", body: "<p>B</p>" })).toBe(true);
  });
  it("returns false when any field is blank/whitespace", () => {
    expect(canCompose({ title: "", subject: "S", body: "B" })).toBe(false);
    expect(canCompose({ title: "T", subject: "   ", body: "B" })).toBe(false);
    expect(canCompose({ title: "T", subject: "S", body: "" })).toBe(false);
  });
});

describe("makeQuestion factory", () => {
  it("creates a base question with id, type, empty label, not required", () => {
    const q = makeQuestion("short");
    expect(q.id).toMatch(/^q-/);
    expect(q.type).toBe("short");
    expect(q.label).toBe("");
    expect(q.required).toBe(false);
  });

  it("adds default options only for choice types", () => {
    expect(makeQuestion("multiple").options).toEqual(["Option 1", "Option 2"]);
    expect(makeQuestion("checkboxes").options).toEqual(["Option 1", "Option 2"]);
    expect(makeQuestion("dropdown").options).toEqual(["Option 1", "Option 2"]);
    expect(makeQuestion("short").options).toBeUndefined();
    expect(makeQuestion("rating").options).toBeUndefined();
    expect(makeQuestion("yes_no").options).toBeUndefined();
  });

  it("adds scale defaults only for scale type", () => {
    const scale = makeQuestion("scale");
    expect(scale.scaleMax).toBe(5);
    expect(scale.scaleMinLabel).toBe("");
    expect(scale.scaleMaxLabel).toBe("");
    expect(makeQuestion("short").scaleMax).toBeUndefined();
  });

  it("generates unique ids across calls", () => {
    const a = makeQuestion("short");
    const b = makeQuestion("short");
    expect(a.id).not.toBe(b.id);
  });

  it("defaults to short answer when no type given", () => {
    expect(makeQuestion().type).toBe("short");
  });
});

describe("block model", () => {
  it("makeTextBlock creates a text block with kind and html", () => {
    const b = makeTextBlock("<p>Hi</p>");
    expect(b.kind).toBe("text");
    expect(b.html).toBe("<p>Hi</p>");
    expect(b.id).toMatch(/^b-/);
  });

  it("makeQuestionBlock tags a question with kind 'question'", () => {
    const b = makeQuestionBlock("rating");
    expect(b.kind).toBe("question");
    expect(b.type).toBe("rating");
  });

  it("stripHtml detects empty vs non-empty text blocks", () => {
    expect(stripHtml("<p></p>")).toBe("");
    expect(stripHtml("<p>&nbsp;</p>")).toBe("");
    expect(stripHtml("<p>hello</p>")).toBe("hello");
  });

  it("hasContent is false for only-empty text blocks, true once a question exists", () => {
    expect(hasContent([makeTextBlock("")])).toBe(false);
    expect(hasContent([makeTextBlock("<p></p>")])).toBe(false);
    expect(hasContent([makeTextBlock(""), makeQuestionBlock("short")])).toBeTruthy();
    expect(hasContent([makeTextBlock("<p>Hello</p>")])).toBeTruthy();
  });

  it("insertAt can place a text block between two questions", () => {
    let blocks = [makeQuestionBlock("short"), makeQuestionBlock("rating")];
    blocks = insertAt(blocks, 1, { kind: "text" });
    expect(blocks.map((b) => b.kind)).toEqual(["question", "text", "question"]);
  });

  it("insertAt appends at the end when index === length", () => {
    let blocks = [makeTextBlock("<p>Intro</p>")];
    blocks = insertAt(blocks, blocks.length, { kind: "question", type: "yes_no" });
    expect(blocks).toHaveLength(2);
    expect(blocks[1].kind).toBe("question");
    expect(blocks[1].type).toBe("yes_no");
  });

  it("question ordinal numbering counts only question blocks", () => {
    const blocks = [
      makeTextBlock("<p>a</p>"),
      makeQuestionBlock("short"),
      makeTextBlock("<p>b</p>"),
      makeQuestionBlock("rating"),
    ];
    let qNum = 0;
    const numbers = blocks.map((b) => (b.kind === "question" ? ++qNum : null));
    expect(numbers).toEqual([null, 1, null, 2]);
  });
});

describe("question type metadata", () => {
  it("includes the curated set of 10 input types", () => {
    expect(QUESTION_TYPES).toHaveLength(10);
  });
  it("only choice types declare hasOptions", () => {
    const withOptions = QUESTION_TYPES.filter((q) => q.hasOptions).map((q) => q.value);
    expect(withOptions.sort()).toEqual(["checkboxes", "dropdown", "multiple"]);
  });
});

describe("csvCell escaping", () => {
  it("leaves plain values unquoted", () => {
    expect(csvCell("Plain")).toBe("Plain");
    expect(csvCell(42)).toBe("42");
  });
  it("quotes values containing commas", () => {
    expect(csvCell("a, b")).toBe('"a, b"');
  });
  it("escapes internal double quotes", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });
  it("quotes values containing newlines", () => {
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });
  it("handles null/undefined as empty string", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
});

describe("response summary data shape", () => {
  it("rating/scale questions carry a numeric distribution", () => {
    const q = DEMO_WITH_RESPONSES.responseSummary[0];
    expect(Array.isArray(q.distribution)).toBe(true);
    for (const d of q.distribution) {
      expect(typeof d.name).toBe("string");
      expect(typeof d.value).toBe("number");
    }
  });

  it("text questions carry sample strings", () => {
    const q = DEMO_WITH_RESPONSES.responseSummary[1];
    expect(Array.isArray(q.samples)).toBe(true);
    for (const s of q.samples) expect(typeof s).toBe("string");
  });

  it("distribution totals do not exceed response count", () => {
    const q = DEMO_WITH_RESPONSES.responseSummary[0];
    const sum = q.distribution.reduce((s, d) => s + d.value, 0);
    expect(sum).toBeLessThanOrEqual(DEMO_WITH_RESPONSES.responseCount);
  });

  it("CSV export rows escape commas and quotes from samples", () => {
    const rows = [["Question", "Type", "Answer", "Count"]];
    for (const q of DEMO_WITH_RESPONSES.responseSummary) {
      if (q.distribution) for (const d of q.distribution) rows.push([q.label, q.type, d.name, d.value]);
      if (q.samples) for (const s of q.samples) rows.push([q.label, q.type, s, ""]);
    }
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    expect(csv).toContain('"Great, with a comma"');
    expect(csv).toContain('"Has ""quotes"""');
    expect(csv.split("\n")[0]).toBe("Question,Type,Answer,Count");
  });
});
