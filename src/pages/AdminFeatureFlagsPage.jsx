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
  FiPlus, FiTrash2, FiEdit2, FiX, FiChevronDown, FiChevronUp,
  FiToggleLeft, FiToggleRight, FiInfo,
} from "react-icons/fi";
import { useAdmin } from "../admin/AdminContext";
import { adminApi } from "../admin/adminTransport";
import {
  AdminShell, AdminHeader, AdminPage, AdminCard, AdminSection,
  AdminBtn, AdminInput, AdminTextarea, AdminSelect, AdminToggle,
  AdminModal, AdminBadge, AdminEmptyState, AdminSpinner, AdminAlert,
} from "../admin/components";

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
  { value: "registered",  label: "Registered (not yet onboarded)" },
];

// ISO 3166-1 alpha-2 common countries for the picker
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
 * Human-readable summary of a rule for the collapsed list view.
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
      if (rule.states) parts.push(`State/region: ${rule.states}`);
      return parts.join(" · ") || "Geolocation (no filter set)";
    }
    default:
      return rule.type;
  }
}

// ── Multi-select chip component ───────────────────────────────────────────────

/**
 * Chip-based multi-select for a fixed list of options.
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
 * Editor for a single rule object.
 * @param {{ rule: object, index: number, onChange: (next:object) => void, onRemove: () => void }} props
 */
function RuleEditor({ rule, index, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(true);

  const set = (patch) => onChange({ ...rule, ...patch });

  return (
    <div
      className="rounded-lg border"
      style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface2)" }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {expanded ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
          <span className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>
            Rule {index + 1}
          </span>
          {!expanded && (
            <span className="ml-1 text-xs" style={{ color: "var(--adm-text3)" }}>
              {ruleLabel(rule)}
            </span>
          )}
        </button>
        <AdminSelect
          value={rule.type}
          onChange={(e) => onChange(defaultRule(e.target.value))}
          className="text-xs"
          style={{ padding: "2px 6px", fontSize: "11px", minWidth: 130 }}
        >
          {RULE_TYPES.map((rt) => (
            <option key={rt.value} value={rt.value}>{rt.label}</option>
          ))}
        </AdminSelect>
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
        <div className="border-t px-3 py-3" style={{ borderColor: "var(--adm-border)" }}>
          {rule.type === "sport" && (
            <div className="flex flex-col gap-2">
              <p className="text-xs" style={{ color: "var(--adm-text3)" }}>
                User must be on a team whose sport matches at least one selected sport.
              </p>
              <ChipSelect
                options={SPORT_OPTIONS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                selected={rule.values || []}
                onChange={(values) => set({ values })}
              />
            </div>
          )}

          {rule.type === "team_role" && (
            <div className="flex flex-col gap-2">
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
            <div className="flex flex-col gap-2">
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
                Stable rollout — each user is deterministically in or out based on
                a hash of their ID + flag name. The same user always lands in the
                same bucket.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={rule.value ?? 50}
                  onChange={(e) => set({ value: Number(e.target.value) })}
                  className="flex-1"
                />
                <span
                  className="w-12 text-center text-sm font-bold tabular-nums"
                  style={{ color: "var(--adm-accent)" }}
                >
                  {rule.value ?? 50}%
                </span>
              </div>
            </div>
          )}

          {rule.type === "geolocation" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs" style={{ color: "var(--adm-text3)" }}>
                IP-based geolocation (country + optional state/region). Leave a
                field empty to match all values for that dimension.
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
                  State / Region codes (comma-separated, e.g. OH, CA, TX)
                </p>
                <AdminInput
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
  const [form, setForm] = useState(() => flag ? { ...flag, rules: Array.isArray(flag.rules) ? [...flag.rules] : [] } : { ...EMPTY_FLAG });
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
      const body = { name: form.name.trim(), description: form.description.trim(), enabled: form.enabled, rules: form.rules };
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
    <AdminModal
      title={isNew ? "New Feature Flag" : `Edit: ${flag.name}`}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          {saveError && <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{saveError}</p>}
          <div className="ml-auto flex gap-2">
            <AdminBtn variant="ghost" onClick={onClose}>Cancel</AdminBtn>
            <AdminBtn onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : isNew ? "Create flag" : "Save changes"}
            </AdminBtn>
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
          <AdminInput
            placeholder="e.g. in_app_notifications"
            value={form.name}
            onChange={(e) => setField("name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
            disabled={!isNew}
          />
          <p className="text-xs" style={{ color: "var(--adm-text3)" }}>
            Lowercase letters, numbers, underscores only. Cannot be changed after creation.
          </p>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold" style={{ color: "var(--adm-text2)" }}>Description</label>
          <AdminTextarea
            placeholder="What does this flag control?"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={2}
          />
        </div>

        {/* Global toggle */}
        <AdminToggle
          checked={form.enabled}
          onChange={(v) => setField("enabled", v)}
          label="Globally enabled"
          description="Master switch. When off, the feature is hidden for every user regardless of targeting rules."
        />

        {/* Rules */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
                Targeting rules
              </p>
              <p className="text-xs" style={{ color: "var(--adm-text3)" }}>
                All rules must match (AND). No rules = feature is on for everyone.
              </p>
            </div>
            <AdminBtn size="sm" variant="ghost" onClick={addRule}>
              <FiPlus size={13} />
              Add rule
            </AdminBtn>
          </div>

          {form.rules.length === 0 && (
            <p className="rounded-lg border border-dashed py-4 text-center text-xs" style={{ color: "var(--adm-text3)", borderColor: "var(--adm-border)" }}>
              No rules — this flag targets every authenticated user.
            </p>
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
    </AdminModal>
  );
}

// ── Flag card ─────────────────────────────────────────────────────────────────

/**
 * Single flag row in the list.
 * @param {{ flag: object, onEdit: () => void, onDelete: () => void, onToggle: (enabled:boolean) => void }} props
 */
function FlagCard({ flag, onEdit, onDelete, onToggle }) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(!flag.enabled);
    setToggling(false);
  };

  return (
    <AdminCard className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {/* Toggle */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className="mt-0.5 shrink-0 transition-opacity disabled:opacity-50"
          title={flag.enabled ? "Disable flag" : "Enable flag"}
        >
          {flag.enabled
            ? <FiToggleRight size={22} style={{ color: "var(--adm-accent)" }} />
            : <FiToggleLeft size={22} style={{ color: "var(--adm-text3)" }} />}
        </button>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold" style={{ color: "var(--adm-text)" }}>
              {flag.name}
            </span>
            <AdminBadge color={flag.enabled ? "green" : "gray"}>
              {flag.enabled ? "on" : "off"}
            </AdminBadge>
            {flag.rules?.length > 0 && (
              <AdminBadge color="blue">{flag.rules.length} rule{flag.rules.length !== 1 ? "s" : ""}</AdminBadge>
            )}
          </div>
          {flag.description && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--adm-text3)" }}>
              {flag.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1.5 transition-opacity hover:opacity-70"
            style={{ color: "var(--adm-text2)" }}
            title="Edit flag"
          >
            <FiEdit2 size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1.5 transition-opacity hover:opacity-70"
            style={{ color: "var(--adm-danger)" }}
            title="Delete flag"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>

      {/* Rules summary */}
      {flag.rules?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-8">
          {flag.rules.map((rule, i) => (
            <span
              key={i}
              className="rounded-full px-2.5 py-0.5 text-xs"
              style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}
            >
              {ruleLabel(rule)}
            </span>
          ))}
        </div>
      )}
    </AdminCard>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Admin feature flags management page.
 * Full CRUD for feature flags with targeting rule builder.
 */
export default function AdminFeatureFlagsPage() {
  const { isOwner } = useAdmin();

  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modalFlag, setModalFlag] = useState(null); // null = closed, EMPTY_FLAG = new, flag obj = edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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
      // Revert handled by re-render staying on old state
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await adminApi(`/flags/admin/${deleteTarget.id}`, { method: "DELETE" });
      setFlags((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  if (!isOwner) {
    return (
      <AdminShell>
        <AdminPage>
          <AdminEmptyState
            icon={<FiInfo size={20} />}
            title="Owner access required"
            subtitle="Feature flags can only be managed by the account owner."
          />
        </AdminPage>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <AdminHeader
        title="Feature Flags"
        subtitle="Control which users see each feature. All rules on a flag must match (AND logic)."
        sticky
        actions={
          <AdminBtn onClick={() => setModalFlag({ ...EMPTY_FLAG })}>
            <FiPlus size={14} />
            New flag
          </AdminBtn>
        }
      />

      <AdminPage>
        <AdminSection>
          {/* Info callout */}
          <AdminAlert type="info" className="mb-4">
            <span className="text-xs">
              <strong>How targeting works:</strong> Rules restrict who sees the feature. Targeting filters include sport,
              team role, user type, a stable % rollout (same user always in/out), and IP-based geolocation.
              All rules must match (AND). An empty rules list means <em>everyone</em> when the flag is globally on.
            </span>
          </AdminAlert>

          {loading && (
            <div className="flex justify-center py-12">
              <AdminSpinner />
            </div>
          )}

          {!loading && loadError && (
            <AdminEmptyState
              icon={<FiInfo size={20} />}
              title="Failed to load flags"
              subtitle={loadError}
              action={<AdminBtn onClick={load}>Retry</AdminBtn>}
            />
          )}

          {!loading && !loadError && flags.length === 0 && (
            <AdminEmptyState
              icon={<FiToggleLeft size={20} />}
              title="No feature flags yet"
              subtitle="Create your first flag to start targeting features to specific user segments."
              action={
                <AdminBtn onClick={() => setModalFlag({ ...EMPTY_FLAG })}>
                  <FiPlus size={14} />
                  New flag
                </AdminBtn>
              }
            />
          )}

          {!loading && !loadError && flags.length > 0 && (
            <div className="flex flex-col gap-3">
              {flags.map((flag) => (
                <FlagCard
                  key={flag.id}
                  flag={flag}
                  onEdit={() => setModalFlag(flag)}
                  onDelete={() => { setDeleteTarget(flag); setDeleteError(""); }}
                  onToggle={(enabled) => handleToggle(flag, enabled)}
                />
              ))}
            </div>
          )}
        </AdminSection>
      </AdminPage>

      {/* Create / edit modal */}
      {modalFlag !== null && (
        <FlagModal
          flag={modalFlag.id ? modalFlag : null}
          onClose={() => setModalFlag(null)}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <AdminModal
          title={`Delete "${deleteTarget.name}"?`}
          onClose={() => setDeleteTarget(null)}
          footer={
            <div className="flex items-center justify-between gap-3">
              {deleteError && <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{deleteError}</p>}
              <div className="ml-auto flex gap-2">
                <AdminBtn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</AdminBtn>
                <AdminBtn variant="danger" onClick={handleDeleteConfirm} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete flag"}
                </AdminBtn>
              </div>
            </div>
          }
        >
          <p className="text-sm" style={{ color: "var(--adm-text2)" }}>
            This will permanently remove the <code className="font-mono text-xs">{deleteTarget.name}</code> flag.
            Any code gating on this flag will fall back to <strong>false</strong> (feature hidden).
          </p>
        </AdminModal>
      )}
    </AdminShell>
  );
}
