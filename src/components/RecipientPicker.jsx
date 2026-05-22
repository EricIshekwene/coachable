/**
 * Outlook-style recipient picker for the email composer.
 *
 * Renders selected recipients as dismissible chips and provides a typeahead
 * input that searches internal users by name or email. Typing a valid email
 * address that yields no results shows an "Add as external" option.
 *
 * @param {Object}   props
 * @param {Array<{email:string, name:string, isExternal?:boolean}>} props.recipients
 * @param {function} props.onChange       - called with the updated recipients array
 * @param {string[]} [props.audienceEmails=[]] - emails already covered by audience
 *   filters; used to surface a "already going out" duplicate warning
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import { adminApi } from "../admin/adminTransport";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RecipientPicker({ recipients, onChange, audienceEmails = [] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [dupToast, setDupToast] = useState("");

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const dupTimerRef = useRef(null);

  // Debounced search against internal users
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await adminApi(`/admin/users/search?q=${encodeURIComponent(q)}`);
        setResults(data.users || []);
        setOpen(true);
        setActiveIdx(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /** Show a transient warning near the input. */
  const showDupToast = (msg) => {
    setDupToast(msg);
    clearTimeout(dupTimerRef.current);
    dupTimerRef.current = setTimeout(() => setDupToast(""), 2800);
  };

  /**
   * Attempt to add a recipient. Rejects duplicates already in the picker or
   * already covered by the audience filters.
   */
  const addRecipient = useCallback((recipient) => {
    const emailLower = recipient.email.toLowerCase().trim();

    if (recipients.some((r) => r.email.toLowerCase() === emailLower)) {
      showDupToast(`${recipient.email} is already added.`);
      return;
    }
    if (audienceEmails.some((e) => e.toLowerCase() === emailLower)) {
      showDupToast(`${recipient.name || recipient.email} is already going out to this user via your audience filters.`);
      return;
    }

    onChange([...recipients, { ...recipient, isExternal: recipient.isExternal ?? false }]);
    setQuery("");
    setResults([]);
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  }, [recipients, audienceEmails, onChange]);

  const removeRecipient = useCallback((email) => {
    onChange(recipients.filter((r) => r.email !== email));
  }, [recipients, onChange]);

  // Append an "Add as external" option when the query is a valid email
  const externalOption =
    EMAIL_RE.test(query.trim()) &&
    !results.some((r) => r.email.toLowerCase() === query.trim().toLowerCase())
      ? { email: query.trim(), name: query.trim(), isExternal: true }
      : null;

  const visibleResults = externalOption ? [...results, externalOption] : results;

  const handleKeyDown = (e) => {
    if (!open && e.key === "ArrowDown") {
      setOpen(visibleResults.length > 0);
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, visibleResults.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIdx >= 0 && visibleResults[activeIdx]) {
          addRecipient(visibleResults[activeIdx]);
        } else if (EMAIL_RE.test(query.trim())) {
          addRecipient({ email: query.trim(), name: query.trim(), isExternal: true });
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIdx(-1);
        break;
      case "Backspace":
        if (!query && recipients.length > 0) {
          removeRecipient(recipients[recipients.length - 1].email);
        }
        break;
      case ",":
      case ";": {
        // Allow comma/semicolon as chip separators (Outlook behaviour)
        const trimmed = query.trim().replace(/[,;]$/, "").trim();
        if (EMAIL_RE.test(trimmed)) {
          e.preventDefault();
          addRecipient({ email: trimmed, name: trimmed, isExternal: true });
        }
        break;
      }
    }
  };

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <span className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>
        Additional recipients (optional)
      </span>

      {/* Chip + input row */}
      <div
        className="relative flex min-h-[38px] flex-wrap items-center gap-1.5 cursor-text rounded-[var(--adm-radius-sm)] px-2.5 py-1.5"
        style={{
          backgroundColor: "var(--adm-surface)",
          border: "1px solid var(--adm-border2)",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {recipients.map((r) => (
          <span
            key={r.email}
            className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: r.isExternal ? "var(--adm-surface2)" : "var(--adm-accent-dim)",
              color: r.isExternal ? "var(--adm-text2)" : "var(--adm-accent)",
              border: `1px solid ${
                r.isExternal
                  ? "var(--adm-border)"
                  : "color-mix(in srgb, var(--adm-accent) 30%, transparent)"
              }`,
            }}
          >
            <span>{r.name && r.name !== r.email ? r.name : r.email}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeRecipient(r.email); }}
              className="ml-0.5 transition-opacity hover:opacity-70"
              aria-label={`Remove ${r.email}`}
            >
              <FiX className="text-[10px]" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= 2 && visibleResults.length > 0) setOpen(true);
          }}
          placeholder={recipients.length === 0 ? "Type a name or email address…" : ""}
          className="min-w-[160px] flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--adm-text)" }}
        />

        {loading && (
          <span className="text-[10px]" style={{ color: "var(--adm-muted)" }}>…</span>
        )}

        {/* Dropdown */}
        {open && visibleResults.length > 0 && (
          <div
            className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-[var(--adm-radius-sm)] shadow-lg"
            style={{
              backgroundColor: "var(--adm-surface)",
              border: "1px solid var(--adm-border)",
            }}
          >
            {visibleResults.map((r, idx) => (
              <button
                key={r.email}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addRecipient(r); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
                style={{
                  backgroundColor: idx === activeIdx ? "var(--adm-surface2)" : "transparent",
                  color: "var(--adm-text)",
                }}
              >
                {/* Avatar letter */}
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: r.isExternal ? "var(--adm-surface2)" : "var(--adm-accent-dim)",
                    color: r.isExternal ? "var(--adm-muted)" : "var(--adm-accent)",
                  }}
                >
                  {r.isExternal ? "@" : (r.name?.[0] || "?").toUpperCase()}
                </span>

                <span className="flex flex-col">
                  <span className="text-xs font-semibold">
                    {r.isExternal ? `Add "${r.email}"` : r.name}
                  </span>
                  <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
                    {r.isExternal ? "External recipient" : r.email}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Duplicate warning toast */}
      {dupToast && (
        <p
          className="text-xs font-medium"
          style={{ color: "var(--adm-accent)" }}
        >
          {dupToast}
        </p>
      )}

      {recipients.length > 0 && !dupToast && (
        <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
          {recipients.length} specific recipient{recipients.length !== 1 ? "s" : ""} — sent to in addition to your audience filters.
        </p>
      )}
    </div>
  );
}
