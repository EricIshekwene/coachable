import { Alert, Badge, Button, Card, Checkbox, EmptyState, Input, RadioGroup, Select, Spinner, Textarea } from "../../design-system/components";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiBell, FiAlertCircle, FiStar, FiInbox } from "react-icons/fi";
import { useNotifications } from "../../context/NotificationsContext";

/** Friendly absolute date, e.g. "May 22, 2026 · 3:14 PM". */
function fmtDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

const INPUT_CLASS =
  "w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2 px-3 py-2 text-sm text-BrandText outline-none transition focus:border-BrandOrange";

/**
 * Renders a single question block as an interactive (or read-only) field.
 * @param {{ question, value, onChange, disabled }} props
 */
function QuestionField({ question, value, onChange, disabled }) {
  const q = question;
  const required = q.required;

  if (q.type === "paragraph") {
    return (
      <Textarea
        rows={3}
        required={required}
        disabled={disabled}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your answer"
        className={`${INPUT_CLASS} resize-y disabled:opacity-70`}
      />
    );
  }

  if (q.type === "short" || q.type === "file") {
    return (
      <Input
        type="text"
        required={required}
        disabled={disabled}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={q.type === "file" ? "Paste a link to your file" : "Your answer"}
        className={`${INPUT_CLASS} disabled:opacity-70`}
      />
    );
  }

  if (q.type === "date") {
    return (
      <Input
        type="date"
        required={required}
        disabled={disabled}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT_CLASS} max-w-[220px] disabled:opacity-70`}
      />
    );
  }

  if (q.type === "dropdown") {
    return (
      <Select
        disabled={disabled}
        required={required}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT_CLASS} max-w-xs disabled:opacity-70`}
      >
        <option value="">Choose…</option>
        {(q.options || []).map((opt, i) => (
          <option key={i} value={opt}>{opt || `Option ${i + 1}`}</option>
        ))}
      </Select>
    );
  }

  if (q.type === "multiple" || q.type === "yes_no") {
    const options = q.type === "yes_no" ? ["Yes", "No"] : (q.options || []);
    return (
      <RadioGroup
        options={options.map((opt, i) => ({ value: opt, label: opt || `Option ${i + 1}` }))}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  if (q.type === "checkboxes") {
    const arr = Array.isArray(value) ? value : [];
    const toggle = (opt) =>
      onChange(arr.includes(opt) ? arr.filter((v) => v !== opt) : [...arr, opt]);
    return (
      <div className="flex flex-col gap-2">
        {(q.options || []).map((opt, i) => (
          <Checkbox
            key={i}
            label={opt || `Option ${i + 1}`}
            checked={arr.includes(opt)}
            disabled={disabled}
            onChange={() => toggle(opt)}
            className="rounded-lg border border-BrandGray2/30 px-3 py-2"
          />
        ))}
      </div>
    );
  }

  if (q.type === "scale") {
    const max = q.scaleMax || 5;
    return (
      <div className="flex flex-wrap items-center gap-3">
        {q.scaleMinLabel && <span className="text-xs text-BrandGray2">{q.scaleMinLabel}</span>}
        <div className="flex gap-2">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <Button variant="primary"
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onChange(n)}
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition disabled:opacity-70 ${
                Number(value) === n
                  ? "border-BrandOrange bg-BrandOrange text-white"
                  : "border-BrandGray2/30 text-BrandGray hover:border-BrandGray2/60"
              }`}
            >
              {n}
            </Button>
          ))}
        </div>
        {q.scaleMaxLabel && <span className="text-xs text-BrandGray2">{q.scaleMaxLabel}</span>}
      </div>
    );
  }

  if (q.type === "rating") {
    return (
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Button variant="ghost"
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="transition disabled:opacity-70"
          >
            <FiStar
              className="h-7 w-7"
              style={{
                fill: Number(value) >= n ? "var(--color-BrandOrange)" : "transparent",
                color: Number(value) >= n ? "var(--color-BrandOrange)" : "var(--tw-prose-body, #9ca3af)",
              }}
            />
          </Button>
        ))}
      </div>
    );
  }

  return null;
}

/** Detail view for a single notification, including the response form. */
function NotificationDetail({ notif, onRespond }) {
  const responded = Boolean(notif.respondedAt);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);

  // Reset the form when switching notifications.
  useEffect(() => {
    setAnswers({});
    setError("");
    setJustSubmitted(false);
  }, [notif.id]);

  const questions = useMemo(
    () => (notif.blocks || []).filter((b) => b?.kind === "question"),
    [notif.blocks]
  );
  const showForm = questions.length > 0 && !responded && !justSubmitted;

  const handleSubmit = async () => {
    // Validate required questions.
    for (const q of questions) {
      if (!q.required) continue;
      const v = answers[q.id];
      const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      if (empty) {
        setError("Please answer all required questions.");
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
      await onRespond(notif.id, answers);
      setJustSubmitted(true);
    } catch (err) {
      setError(err?.message || "Could not submit your response.");
    } finally {
      setSubmitting(false);
    }
  };

  let qIndex = 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2">
          {notif.priority === "critical" && <FiAlertCircle className="text-red-400" />}
          {notif.priority === "high" && <FiAlertCircle className="text-amber-400" />}
          <h1 className="text-xl font-bold text-BrandText">{notif.title}</h1>
        </div>
        {notif.subject && <p className="mt-1 text-sm text-BrandGray">{notif.subject}</p>}
        <p className="mt-1 text-xs text-BrandGray2">{fmtDateTime(notif.sentAt)}</p>
      </div>

      {/* Blocks in order */}
      <div className="flex flex-col gap-5">
        {(notif.blocks || []).map((b) => {
          if (b.kind === "text") {
            return (
              <div
                key={b.id}
                className="notif-body text-sm leading-relaxed text-BrandGray"
                dangerouslySetInnerHTML={{ __html: b.html || "" }}
              />
            );
          }
          qIndex += 1;
          const num = qIndex;
          const readOnly = !showForm;
          return (
            <Card
              key={b.id}
              padding="sm"
              className="bg-BrandBlack2/40"
            >
              <div className="mb-3 flex items-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-BrandOrange/15 text-xs font-bold text-BrandOrange">
                  {num}
                </span>
                <span className="text-sm font-semibold text-BrandText">
                  {b.label || "Untitled question"}
                  {b.required && <span className="ml-1 text-BrandOrange">*</span>}
                </span>
              </div>
              <div className="pl-8">
                <QuestionField
                  question={b}
                  value={answers[b.id]}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [b.id]: v }))}
                  disabled={readOnly}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <div className="flex flex-col gap-3">
          {error && (
            <Alert tone="error" title="Could not submit response">{error}</Alert>
          )}
          <Button
            type="button"
            variant="primary"
            loading={submitting}
            onClick={handleSubmit}
            disabled={submitting}
            className="flex w-fit items-center gap-2 rounded-lg bg-BrandOrange px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit response"}
          </Button>
        </div>
      )}

      {(responded || justSubmitted) && questions.length > 0 && (
        <Alert tone="success" title="Response recorded">Thank you!</Alert>
      )}
    </div>
  );
}

/**
 * The /app/notifications page: a master/detail inbox of the user's
 * in-app notifications with inline response forms.
 */
export default function NotificationsPage() {
  const { notifications, loading, error, unreadCount, markRead, markAllRead, respond } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState(null);

  // Honor the ?n=<id> deep-link from the bell dropdown, else select the first.
  useEffect(() => {
    if (!notifications.length) return;
    const fromQuery = searchParams.get("n");
    if (fromQuery && notifications.some((n) => n.id === fromQuery)) {
      setSelectedId(fromQuery);
    } else if (!selectedId) {
      setSelectedId(notifications[0].id);
    }
  }, [notifications, searchParams, selectedId]);

  const selected = notifications.find((n) => n.id === selectedId) || null;

  // Mark the open notification read.
  useEffect(() => {
    if (selected && !selected.readAt) markRead(selected.id);
  }, [selected, markRead]);

  const handleSelect = (id) => {
    setSelectedId(id);
    if (searchParams.get("n")) {
      searchParams.delete("n");
      setSearchParams(searchParams, { replace: true });
    }
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-BrandText">Notifications</h1>
            <p className="text-sm text-BrandGray2">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline"
              type="button"
              onClick={markAllRead}
              className="rounded-lg border border-BrandGray2/30 px-3 py-2 text-xs font-semibold text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"
            >
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" label="Loading notifications" />
          </div>
        ) : error ? (
          <Alert tone="error" title="Could not load notifications">{error}</Alert>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<FiInbox className="text-2xl" />}
            title="No notifications yet"
            description="When your coach or the Coachable team sends you something, it'll show up here."
            contained
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[320px_1fr]">
            {/* List */}
            <div className="flex flex-col gap-2">
              {notifications.map((n) => {
                const active = n.id === selectedId;
                return (
                  <Button variant="primary"
                    key={n.id}
                    type="button"
                    onClick={() => handleSelect(n.id)}
                    className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                      active
                        ? "border-BrandOrange bg-BrandOrange/10"
                        : "border-BrandGray2/20 hover:border-BrandGray2/40 hover:bg-BrandBlack2"
                    }`}
                  >
                    <span className="mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                      {!n.readAt && <span className="h-2 w-2 rounded-full bg-BrandOrange" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {n.priority === "critical" && <FiAlertCircle className="shrink-0 text-xs text-red-400" />}
                        {n.priority === "high" && <FiAlertCircle className="shrink-0 text-xs text-amber-400" />}
                        <span className={`truncate text-sm ${n.readAt ? "text-BrandGray" : "font-semibold text-BrandText"}`}>
                          {n.title}
                        </span>
                      </div>
                      {n.subject && <p className="mt-0.5 truncate text-xs text-BrandGray2">{n.subject}</p>}
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-BrandGray2">
                        <span>{fmtDateTime(n.sentAt)}</span>
                        {n.hasQuestions && !n.respondedAt && (
                          <Badge tone="warning" size="xs">Needs response</Badge>
                        )}
                        {n.respondedAt && <span className="text-green-400">✓ Responded</span>}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* Detail */}
            <Card padding="md" className="sm:p-6">
              {selected ? (
                <NotificationDetail notif={selected} onRespond={respond} />
              ) : (
                <EmptyState icon={<FiBell />} title="Select a notification" description="Choose an item to read it." />
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
