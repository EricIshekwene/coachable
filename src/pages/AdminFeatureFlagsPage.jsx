/**
 * AdminFeatureFlagsPage
 *
 * Full CRUD UI for managing feature flags. Each flag has:
 *   - A global kill-switch (enabled toggle)
 *   - Optional targeting rules that ALL must match (AND logic):
 *       sport, team_role, user_type, rollout_percentage, geolocation
 *
 * Rules restrict which users see the feature. No rules = everyone.
 */

import { useCallback, useEffect, useState } from "react";
import {
  FiEdit2, FiX, FiChevronDown, FiChevronUp,
  FiInfo, FiSliders,
} from "react-icons/fi";
import { useAdmin } from "../admin/AdminContext";
import { adminApi } from "../admin/adminTransport";
import { AdminShell, AdminHeader, AdminPage } from "../admin/components";
import { Card, Section, Button, Input, Textarea, Select, Toggle, Modal, Badge, EmptyState, Spinner, Alert } from "../design-system/components";

// ── Constants ─────────────────────────────────────────────────────────────────

const RULE_TYPES = [
  { value: "sport",              label: "Sport" },
  { value: "team_role",          label: "Team Role" },
  { value: "user_type",          label: "User Type" },
  { value: "rollout_percentage", label: "Rollout %" },
  { value: "geolocation",        label: "Geolocation" },
];

const SPORT_OPTIONS = [
  "rugby", "football", "soccer", "lacrosse", "basketball",
  "field hockey", "ice hockey", "womens lacrosse",
];

const ROLE_OPTIONS = [
  { value: "owner",           label: "Owner" },
  { value: "coach",           label: "Coach" },
  { value: "assistant_coach", label: "Assistant Coach" },
  { value: "player",          label: "Player" },
];

const USER_TYPE_OPTIONS = [
  { value: "onboarded",   label: "Onboarded" },
  { value: "registered",  label: "Registered (not onboarded)" },
];

const COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "NZ", label: "New Zealand" },
  { value: "IE", label: "Ireland" },
  { value: "ZA", label: "South Africa" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "JP", label: "Japan" },
];

const EMPTY_FLAG = { name: "", description: "", enabled: true, rules: [] };

// ── Rule builder helpers ──────────────────────────────────────────────────────

/**
 * Returns a fresh rule object with sensible defaults for the given type.
 * @param {string} type
 * @returns {object}
 */
function defaultRule(type) {
  switch (type) {
    case "sport":              return { type, values: [] };
    case "team_role":          return { type, roles: [] };
    case "user_type":          return { type, values: [] };
    case "rollout_percentage": return { type, value: 50 };
    case "geolocation":        return { type, countries: [], states: "" };
    default:                   return { type };
  }
}

/**
 * Human-readable summary of a rule for the collapsed / card list view.
 * @param {object} rule
 * @returns {string}
 */
function ruleLabel(rule) {
  switch (rule.type) {
    case "sport":
      return `Sport: ${rule.values?.join(", ") || "(none)"}`;
    case "team_role":
      return `Role: ${rule.roles?.join(", ") || "(none)"}`;
    case "user_type":
      return `User type: ${rule.values?.join(", ") || "(none)"}`;
    case "rollout_percentage":
      return `${rule.value ?? 0}% rollout`;
    case "geolocation": {
      const parts = [];
      if (rule.countries?.length) parts.push(`Country: ${rule.countries.join(", ")}`);
      if (rule.states) parts.push(`State: ${rule.states}`);
      return parts.join(" · ") || "Geolocation (no filter)";
    }
    default:
      return rule.type;
  }
}

// ── Chip select ───────────────────────────────────────────────────────────────

/**
 * Multi-select chip picker for a fixed set of options.
 * @param {{ options: {value:string,label:string}[], selected: string[], onChange: (next:string[]) => void }} props
 */
function ChipSelect({ options, selected, onChange }) {
  const toggle = (v) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className="rounded-full px-3 py-1 text-xs font-semibold transition-all"
            style={{
              backgroundColor: active ? "var(--adm-accent)" : "var(--adm-surface3)",
              color: active ? "#fff" : "var(--adm-text2)",
              border: `1px solid ${active ? "var(--adm-accent)" : "var(--adm-border)"}`,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Rule editor ───────────────────────────────────────────────────────────────

/**
 * Editor for a single targeting rule.
 * @param {{ rule: object, index: number, onChange: (next:object) => void, onRemove: () => void }} props
 */
function RuleEditor({ rule, index, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(true);

  const set = (patch) => onChange({ ...rule, ...patch });

  return (
    <div
      className="rounded-(--adm-radius-md) overflow-hidden"
      style={{
        border: "1px solid var(--adm-border)",
        backgroundColor: "var(--adm-surface2)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="text-xs font-semibold" style={{ color: "var(--adm-text2)" }}>
            Rule {index + 1}
          </span>
          {!expanded && (
            <span className="text-xs" style={{ color: "var(--adm-text3)" }}>
              — {ruleLabel(rule)}
            </span>
          )}
          <span className="ml-auto" style={{ color: "var(--adm-text3)" }}>
            {expanded ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
          </span>
        </button>

        <Select
          value={rule.type}
          onChange={(e) => onChange(defaultRule(e.target.value))}
          style={{ padding: "3px 8px", fontSize: "11px", minWidth: 130 }}
        >
          {RULE_TYPES.map((rt) => (
            <option key={rt.value} value={rt.value}>{rt.label}</option>
          ))}
        </Select>

        <button
          type="button"
          onClick={onRemove}
          className="ml-1 rounded p-1 transition-opacity hover:opacity-70"
          style={{ color: "var(--adm-danger)" }}
          title="Remove rule"
        >
          <FiX size={13} />
        </button>
      </div>

      {/* Body */}
      {expanded && (
        <div className="border-t px-4 py-4" style={{ borderColor: "var(--adm-border)" }}>
          {rule.type === "sport" && (
            <div className="flex flex-col gap-2.5">
              <p className="text-xs" style={{ color: "var(--adm-text3)" }}>
                User must be on a team whose sport matches at least one selection.
              </p>
              <ChipSelect
                options={SPORT_OPTIONS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                selected={rule.values || []}
                onChange={(values) => set({ values })}
              />
            </div>
          )}

          {rule.type === "team_role" && (
            <div className="flex flex-col gap-2.5">
              <p className="text-xs" style={{ color: "var(--adm-text3)" }}>
                User must hold at least one of these roles on any of their teams.
              </p>
              <ChipSelect
                options={ROLE_OPTIONS}
                selected={rule.roles || []}
                onChange={(roles) => set({ roles })}
              />
            </div>
          )}

          {rule.type === "user_type" && (
            <div className="flex flex-col gap-2.5">
              <p className="text-xs" style={{ color: "var(--adm-text3)" }}>
                Filter by whether the user has completed onboarding.
              </p>
              <ChipSelect
                options={USER_TYPE_OPTIONS}
                selected={rule.values || []}
                onChange={(values) => set({ values })}
              />
            </div>
          )}

          {rule.type === "rollout_percentage" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs" style={{ color: "var(--adm-text3)" }}>
                Stable rollout — each user is deterministically in or out based on a hash
                of their ID and flag name. The same user always lands in the same bucket.
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={rule.value ?? 50}
                  onChange={(e) => set({ value: Number(e.target.value) })}
                  className="flex-1"
                  style={{ accentColor: "var(--adm-accent)" }}
                />
                <span
                  className="w-14 text-center text-base font-bold tabular-nums"
                  style={{ color: "var(--adm-accent)" }}
                >
                  {rule.value ?? 50}%
                </span>
              </div>
            </div>
          )}

          {rule.type === "geolocation" && (
            <div className="flex flex-col gap-4">
              <p className="text-xs" style={{ color: "var(--adm-text3)" }}>
                IP-based geolocation (country + optional state/region). Leave a field
                empty to match all values for that dimension.
              </p>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold" style={{ color: "var(--adm-text2)" }}>Countries</p>
                <ChipSelect
                  options={COUNTRY_OPTIONS}
                  selected={rule.countries || []}
                  onChange={(countries) => set({ countries })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold" style={{ color: "var(--adm-text2)" }}>
                  State / Region codes <span style={{ color: "var(--adm-text3)", fontWeight: 400 }}>(comma-separated — e.g. OH, CA, TX)</span>
                </p>
                <Input
                  placeholder="OH, CA, TX"
                  value={rule.states || ""}
                  onChange={(e) => set({ states: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Flag modal ────────────────────────────────────────────────────────────────

/**
 * Create / edit modal for a single feature flag.
 * @param {{ flag: object|null, onClose: () => void, onSave: (flag: object) => void }} props
 */
function FlagModal({ flag, onClose, onSave }) {
  const isNew = !flag?.id;
  const [form, setForm] = useState(() =>
    flag
      ? { ...flag, rules: Array.isArray(flag.rules) ? [...flag.rules] : [] }
      : { ...EMPTY_FLAG }
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const addRule = () =>
    setForm((f) => ({ ...f, rules: [...f.rules, defaultRule("sport")] }));

  const updateRule = (i, next) =>
    setForm((f) => ({ ...f, rules: f.rules.map((r, idx) => (idx === i ? next : r)) }));

  const removeRule = (i) =>
    setForm((f) => ({ ...f, rules: f.rules.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveError("Name is required."); return; }
    setSaving(true);
    setSaveError("");
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        enabled: form.enabled,
        rules: form.rules,
      };
      const data = isNew
        ? await adminApi("/flags/admin", { method: "POST", body: JSON.stringify(body) })
        : await adminApi(`/flags/admin/${flag.id}`, { method: "PUT", body: JSON.stringify(body) });
      onSave(data.flag);
    } catch (err) {
      setSaveError(err.message || "Save failed");
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isNew ? "New Feature Flag" : `Edit: ${flag.name}`}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          {saveError && (
            <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{saveError}</p>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : isNew ? "Create flag" : "Save changes"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5 overflow-y-auto" style={{ maxHeight: "70vh" }}>
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold" style={{ color: "var(--adm-text2)" }}>
            Flag name <span style={{ color: "var(--adm-danger)" }}>*</span>
          </label>
          <Input
            placeholder="e.g. in_app_notifications"
            value={form.name}
            onChange={(e) =>
              setField("name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))
            }
            disabled={!isNew}
          />
          <p className="text-xs" style={{ color: "var(--adm-text3)" }}>
            Lowercase letters, numbers, underscores only. Cannot be changed after creation.
          </p>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold" style={{ color: "var(--adm-text2)" }}>
            Description
          </label>
          <Textarea
            placeholder="What does this flag control?"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={2}
          />
        </div>

        {/* Global toggle */}
        <div
          className="rounded-(--adm-radius-md) px-4 py-3"
          style={{
            backgroundColor: form.enabled
              ? "color-mix(in srgb, var(--adm-accent) 8%, var(--adm-surface2))"
              : "var(--adm-surface2)",
            border: `1px solid ${form.enabled ? "color-mix(in srgb, var(--adm-accent) 22%, transparent)" : "var(--adm-border)"}`,
          }}
        >
          <Toggle
            checked={form.enabled}
            onChange={(v) => setField("enabled", v)}
            label="Globally enabled"
            description="Master switch. When off, the feature is hidden for every user regardless of targeting rules."
          />
        </div>

        {/* Rules */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
                Targeting rules
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--adm-text3)" }}>
                All rules must match (AND). No rules = on for everyone when globally enabled.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={addRule}>
              <FiPlus size={12} />
              Add rule
            </Button>
          </div>

          {form.rules.length === 0 && (
            <div
              className="rounded-(--adm-radius-md) py-6 text-center"
              style={{
                border: "1px dashed var(--adm-border2)",
                backgroundColor: "var(--adm-surface2)",
              }}
            >
              <p className="text-xs font-semibold" style={{ color: "var(--adm-text3)" }}>
                No targeting rules
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--adm-text3)" }}>
                This flag will be shown to every authenticated user.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {form.rules.map((rule, i) => (
              <RuleEditor
                key={i}
                rule={rule}
                index={i}
                onChange={(next) => updateRule(i, next)}
                onRemove={() => removeRule(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Flag card ─────────────────────────────────────────────────────────────────

/**
 * Single flag row card — toggle, info, rules summary, and actions.
 * @param {{ flag: object, onEdit: () => void, onToggle: (enabled:boolean) => void }} props
 */
function FlagCard({ flag, onEdit, onToggle }) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (next) => {
    setToggling(true);
    await onToggle(next);
    setToggling(false);
  };

  const hasRules = flag.rules?.length > 0;

  return (
    <div
      className="rounded-(--adm-radius-lg) p-4 transition-all"
      style={{
        backgroundColor: flag.enabled
          ? "color-mix(in srgb, var(--adm-accent) 5%, var(--adm-surface))"
          : "var(--adm-surface)",
        border: flag.enabled
          ? "1px solid color-mix(in srgb, var(--adm-accent) 20%, var(--adm-border))"
          : "1px solid var(--adm-border)",
        boxShadow: flag.enabled
          ? "0 0 0 1px color-mix(in srgb, var(--adm-accent) 6%, transparent) inset, var(--adm-shadow-sm)"
          : "var(--adm-shadow-sm)",
      }}
    >
      <div className="flex items-start gap-4">
        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="font-mono text-sm font-bold"
              style={{ color: "var(--adm-text)" }}
            >
              {flag.name}
            </span>
            <Badge status={flag.enabled ? "pass" : "fail"}>
              {flag.enabled ? "On" : "Off"}
            </Badge>
            {hasRules && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  backgroundColor: "var(--adm-badge-purple-bg)",
                  color: "var(--adm-badge-purple-text)",
                  border: "1px solid color-mix(in srgb, var(--adm-badge-purple-text) 14%, transparent)",
                }}
              >
                <FiSliders size={9} />
                {flag.rules.length} rule{flag.rules.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {flag.description && (
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--adm-text3)" }}>
              {flag.description}
            </p>
          )}

          {/* Rules summary chips */}
          {hasRules && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {flag.rules.map((rule, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: "var(--adm-surface3)",
                    color: "var(--adm-text2)",
                    border: "1px solid var(--adm-border)",
                  }}
                >
                  {ruleLabel(rule)}
                </span>
              ))}
            </div>
          )}

          {!hasRules && (
            <p className="mt-1.5 text-[11px]" style={{ color: "var(--adm-text3)" }}>
              No targeting — shown to all authenticated users
            </p>
          )}
        </div>

        {/* Right: toggle + actions */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => handleToggle(!flag.enabled)}
            disabled={toggling}
            role="switch"
            aria-checked={flag.enabled}
            className="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: flag.enabled ? "var(--adm-accent)" : "var(--adm-surface3)",
              boxShadow: flag.enabled
                ? "inset 0 0 0 1px color-mix(in srgb, var(--adm-accent) 40%, transparent)"
                : "inset 0 0 0 1px var(--adm-border2)",
            }}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full transition-transform ${flag.enabled ? "translate-x-5.5" : "translate-x-0.5"}`}
              style={{
                backgroundColor: "#fff",
                boxShadow: "0 4px 10px rgba(15, 23, 42, 0.18)",
              }}
            />
          </button>

          <div
            className="flex items-center gap-0.5 rounded-(--adm-radius-md) p-0.5"
            style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
          >
            <button
              type="button"
              onClick={onEdit}
              className="rounded-(--adm-radius) p-1.5 transition-colors hover:opacity-80"
              style={{ color: "var(--adm-text2)" }}
              title="Edit targeting rules"
            >
              <FiEdit2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Admin feature flags management page — full CRUD with targeting rule builder.
 */
export default function AdminFeatureFlagsPage() {
  const { isOwner } = useAdmin();

  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modalFlag, setModalFlag] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await adminApi("/flags/admin");
      setFlags(data.flags || []);
    } catch (err) {
      setLoadError(err.message || "Failed to load flags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = (saved) => {
    setFlags((prev) => {
      const exists = prev.find((f) => f.id === saved.id);
      return exists ? prev.map((f) => (f.id === saved.id ? saved : f)) : [...prev, saved];
    });
    setModalFlag(null);
  };

  const handleToggle = async (flag, enabled) => {
    try {
      const data = await adminApi(`/flags/admin/${flag.id}`, {
        method: "PUT",
        body: JSON.stringify({ enabled }),
      });
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? data.flag : f)));
    } catch {
      // state stays unchanged on error
    }
  };

  if (!isOwner) {
    return (
      <AdminShell>
        <AdminPage>
          <EmptyState
            icon={<FiInfo size={20} />}
            title="Owner access required"
            subtitle="Feature flags can only be managed by the account owner."
          />
        </AdminPage>
      </AdminShell>
    );
  }

  const enabledCount = flags.filter((f) => f.enabled).length;

  return (
    <AdminShell>
      <AdminHeader
        title="Feature Flags"
        subtitle="Control which users see each feature. All targeting rules on a flag must match (AND logic)."
        sticky
      />

      <AdminPage className="overflow-y-auto">
        <Section>
          {/* Info callout */}
          <Alert tone="info" className="mb-6">
            <strong>How targeting works:</strong> Rules restrict who sees the feature.
            Filters include sport, team role, user type, stable % rollout (same user always
            in or out), and IP-based geolocation. All rules must match (AND logic). An
            empty rules list means <em>everyone</em> when the flag is globally on.
          </Alert>

          {/* Stats strip */}
          {!loading && !loadError && flags.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
                {flags.length} flag{flags.length !== 1 ? "s" : ""}
              </span>
              <span style={{ color: "var(--adm-border2)" }}>·</span>
              <span className="text-sm" style={{ color: "var(--adm-text3)" }}>
                <span style={{ color: "var(--adm-success)" }} className="font-semibold">{enabledCount}</span> on,{" "}
                <span style={{ color: "var(--adm-danger)" }} className="font-semibold">{flags.length - enabledCount}</span> off
              </span>
            </div>
          )}

          {/* States */}
          {loading && (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          )}

          {!loading && loadError && (
            <EmptyState
              icon={<FiInfo size={20} />}
              title="Failed to load flags"
              subtitle={loadError}
              action={<Button onClick={load}>Retry</Button>}
            />
          )}

          {!loading && !loadError && flags.length === 0 && (
            <EmptyState
              icon={<FiSliders size={20} />}
              title="No feature flags"
              subtitle="Feature flags are hardcoded — add new ones in the codebase."
            />
          )}

          {!loading && !loadError && flags.length > 0 && (
            <div className="flex flex-col gap-3">
              {flags.map((flag) => (
                <FlagCard
                  key={flag.id}
                  flag={flag}
                  onEdit={() => setModalFlag(flag)}
                  onToggle={(enabled) => handleToggle(flag, enabled)}
                />
              ))}
            </div>
          )}
        </Section>
      </AdminPage>

      {/* Create / edit modal */}
      {modalFlag !== null && (
        <FlagModal
          flag={modalFlag.id ? modalFlag : null}
          onClose={() => setModalFlag(null)}
          onSave={handleSave}
        />
      )}

    </AdminShell>
  );
}
