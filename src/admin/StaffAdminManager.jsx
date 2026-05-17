import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "./adminTransport";

// Sport keys stored in permission scopes. These are matched case-insensitively
// against the canonical capitalized names ("Rugby", "Football", ...) used
// elsewhere in the app, so picking "rugby" here grants access to all plays
// stored with sport = "Rugby".
const DEFAULT_SPORTS = [
  "rugby",
  "football",
  "soccer",
  "lacrosse",
  "basketball",
  "field hockey",
  "ice hockey",
  "womens lacrosse",
];

/** Title-case a sport key for display. */
function displaySportLabel(s) {
  return String(s).replace(/\b\w/g, (c) => c.toUpperCase());
}

const EMPTY_PERMS = {
  dashboard: { viewAnalytics: false },
  users: { viewTable: false, viewEmails: false, viewUsernames: false, editStatus: false },
  tests: { run: false },
  errors: { viewReports: false },
  issues: { view: false, resolve: false },
  plays: {
    viewFolders: false,
    sportScope: [],
    add: false,
    rename: false,
    editTags: false,
    editContent: false,
    copyShareLinks: false,
  },
  pageSections: { manage: false },
  playbooks: { view: false, addPlays: false },
  presets: { sportScope: [], create: false, edit: false },
  prefabs: { manage: false },
  videos: { addDemo: false },
};

const PERMISSION_GROUPS = [
  {
    title: "Dashboard and users",
    rows: [
      { path: "dashboard.viewAnalytics", label: "View analytics dashboard" },
      { path: "users.viewTable", label: "See users list" },
      { path: "users.viewEmails", label: "Unmask user emails", requires: "users.viewTable" },
      { path: "users.viewUsernames", label: "Unmask usernames", requires: "users.viewTable" },
      { path: "users.editStatus", label: "Edit user status", requires: "users.viewTable" },
      { path: "tests.run", label: "Run tests" },
      { path: "errors.viewReports", label: "See error reports" },
      { path: "issues.view", label: "See reported issues" },
      { path: "issues.resolve", label: "Resolve or update issue status", requires: "issues.view" },
    ],
  },
  {
    title: "Plays library",
    rows: [
      { path: "plays.viewFolders", label: "See platform folders" },
      { path: "plays.add", label: "Add plays", requires: "plays.viewFolders" },
      { path: "plays.editContent", label: "Edit play content", requires: "plays.viewFolders" },
      { path: "plays.rename", label: "Rename plays", requires: "plays.viewFolders" },
      { path: "plays.editTags", label: "Edit tags", requires: "plays.viewFolders" },
      { path: "plays.copyShareLinks", label: "Generate share links", requires: "plays.viewFolders" },
    ],
    sportScope: { path: "plays.sportScope", label: "Allowed sports for play access" },
  },
  {
    title: "Page sections and playbooks",
    rows: [
      { path: "pageSections.manage", label: "Manage landing page sections" },
      { path: "playbooks.view", label: "See playbook sections" },
      { path: "playbooks.addPlays", label: "Add plays to playbook sections", requires: "playbooks.view" },
    ],
  },
  {
    title: "Presets and prefabs",
    rows: [
      { path: "presets.create", label: "Create sport presets" },
      { path: "presets.edit", label: "Edit sport presets" },
      { path: "prefabs.manage", label: "Manage prefab presets and admin prefabs" },
    ],
    sportScope: { path: "presets.sportScope", label: "Allowed sports for preset access" },
  },
  {
    title: "Videos",
    rows: [{ path: "videos.addDemo", label: "Add demo videos" }],
  },
];

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function clonePerms(perms = EMPTY_PERMS) {
  return JSON.parse(JSON.stringify(perms));
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (isPlainObject(value)) {
    const out = {};
    for (const [key, child] of Object.entries(value)) out[key] = cloneValue(child);
    return out;
  }
  return value;
}

function mergePermissionLayers(basePerms, overrides) {
  const out = isPlainObject(basePerms) ? cloneValue(basePerms) : {};
  if (!isPlainObject(overrides)) return out;
  for (const [key, value] of Object.entries(overrides)) {
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = mergePermissionLayers(out[key], value);
    } else {
      out[key] = cloneValue(value);
    }
  }
  return out;
}

function materializePerms(basePerms, overrides) {
  return mergePermissionLayers(clonePerms(), mergePermissionLayers(basePerms, overrides));
}

function getPermAtPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function setPermAtPath(obj, path, value) {
  const segments = path.split(".");
  const next = cloneValue(obj || {});
  let cursor = next;
  for (let i = 0; i < segments.length - 1; i += 1) {
    cursor[segments[i]] = isPlainObject(cursor[segments[i]]) ? { ...cursor[segments[i]] } : {};
    cursor = cursor[segments[i]];
  }
  cursor[segments[segments.length - 1]] = cloneValue(value);
  return next;
}

function removePermAtPath(obj, path) {
  if (!isPlainObject(obj)) return {};
  const segments = path.split(".");
  const next = cloneValue(obj);

  function prune(target, idx) {
    const key = segments[idx];
    if (!isPlainObject(target)) return;
    if (idx === segments.length - 1) {
      delete target[key];
      return;
    }
    prune(target[key], idx + 1);
    if (isPlainObject(target[key]) && Object.keys(target[key]).length === 0) {
      delete target[key];
    }
  }

  prune(next, 0);
  return next;
}

function areStringArraysEqual(a, b) {
  const left = Array.isArray(a) ? [...a].sort() : [];
  const right = Array.isArray(b) ? [...b].sort() : [];
  return JSON.stringify(left) === JSON.stringify(right);
}

function countEnabledPermissions(perms) {
  let total = 0;
  for (const group of Object.values(perms || {})) {
    if (!isPlainObject(group)) continue;
    for (const value of Object.values(group)) {
      if (value === true) total += 1;
    }
  }
  return total;
}

function dependencyHint(perms, row) {
  if (!row.requires) return null;
  if (getPermAtPath(perms, row.requires) === true) return null;
  return `Requires ${row.requires}`;
}

function roleBadgeText(role) {
  return role?.name || "Custom access";
}

function AccessCheckbox({ checked, label, hint, onChange }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors"
      style={{
        backgroundColor: checked
          ? "color-mix(in srgb, var(--adm-accent-dim) 70%, transparent)"
          : "color-mix(in srgb, var(--adm-surface2) 86%, transparent)",
        border: checked
          ? "1px solid color-mix(in srgb, var(--adm-accent) 30%, transparent)"
          : "1px solid color-mix(in srgb, var(--adm-border) 82%, transparent)",
      }}
    >
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
        style={{
          backgroundColor: checked ? "var(--adm-accent)" : "transparent",
          border: checked ? "1px solid var(--adm-accent)" : "1px solid var(--adm-border2)",
          color: checked ? "#fff" : "transparent",
          boxShadow: checked ? "0 8px 18px rgba(15,23,42,0.12)" : "none",
        }}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 8.5 6.5 11.5 12.5 4.5" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-5" style={{ color: "var(--adm-text)" }}>
          {label}
        </span>
        {hint ? (
          <span className="mt-1 block text-[11px] leading-4" style={{ color: "var(--adm-muted)" }}>
            {hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function ScopeChip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors"
      style={{
        backgroundColor: active
          ? "color-mix(in srgb, var(--adm-accent) 88%, white)"
          : "color-mix(in srgb, var(--adm-surface2) 84%, transparent)",
        color: active ? "#fff" : "var(--adm-text2)",
        border: active
          ? "1px solid color-mix(in srgb, var(--adm-accent) 68%, transparent)"
          : "1px solid color-mix(in srgb, var(--adm-border) 82%, transparent)",
      }}
    >
      {label}
    </button>
  );
}

function RoleSelect({ roles, value, onChange, helperText }) {
  return (
    <div
      className="rounded-[24px] px-4 py-4"
      style={{
        backgroundColor: "color-mix(in srgb, var(--adm-surface2) 86%, transparent)",
        border: "1px solid color-mix(in srgb, var(--adm-border) 78%, transparent)",
      }}
    >
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--adm-muted)" }}>
        Role
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
        style={{
          backgroundColor: "var(--adm-surface)",
          border: "1px solid color-mix(in srgb, var(--adm-border) 82%, transparent)",
        }}
      >
        <option value="">No role - custom access only</option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
      {helperText ? (
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--adm-text2)" }}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

function PermissionMatrix({ perms, onToggle, onToggleScope, availableSports }) {
  return (
    <div className="space-y-5">
      {PERMISSION_GROUPS.map((group) => (
        <section
          key={group.title}
          className="rounded-[24px] p-4 sm:p-5"
          style={{
            backgroundColor: "color-mix(in srgb, var(--adm-surface2) 88%, transparent)",
            border: "1px solid color-mix(in srgb, var(--adm-border) 76%, transparent)",
          }}
        >
          <div className="mb-4">
            <h4 className="text-sm font-semibold tracking-[-0.02em]" style={{ color: "var(--adm-text)" }}>
              {group.title}
            </h4>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {group.rows.map((row) => (
              <AccessCheckbox
                key={row.path}
                checked={getPermAtPath(perms, row.path) === true}
                onChange={(next) => onToggle(row.path, next)}
                label={row.label}
                hint={dependencyHint(perms, row)}
              />
            ))}
          </div>
          {group.sportScope ? (
            <div className="mt-4 rounded-2xl px-4 py-4" style={{ backgroundColor: "var(--adm-surface)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-muted)" }}>
                Sport Scope
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--adm-text2)" }}>
                {group.sportScope.label}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {availableSports.map((sport) => {
                  const current = getPermAtPath(perms, group.sportScope.path) || [];
                  const active = Array.isArray(current) && current.includes(sport);
                  return (
                    <ScopeChip
                      key={sport}
                      active={active}
                      label={displaySportLabel(sport)}
                      onClick={() => onToggleScope(group.sportScope.path, sport, !active)}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function InviteResult({ createResult }) {
  if (!createResult) return null;

  let localUrl = null;
  try {
    const parsed = new URL(createResult.inviteUrl);
    if (typeof window !== "undefined" && parsed.origin !== window.location.origin) {
      localUrl = `${window.location.origin}${parsed.pathname}${parsed.search}`;
    }
  } catch {}

  return (
    <div
      className="rounded-2xl px-4 py-3 text-xs space-y-2"
      style={{
        backgroundColor: "color-mix(in srgb, var(--adm-success, #22c55e) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--adm-success, #22c55e) 20%, transparent)",
        color: "var(--adm-text2)",
      }}
    >
      <div className="font-semibold" style={{ color: "var(--adm-text)" }}>Invite created</div>
      {!createResult.emailSent ? (
        <div style={{ color: "var(--adm-warning)" }}>
          Email send failed{createResult.emailError ? ` (${createResult.emailError})` : ""}. Share a link manually.
        </div>
      ) : null}
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--adm-muted)" }}>
          Production URL
        </div>
        <a
          href={createResult.inviteUrl}
          target="_blank"
          rel="noreferrer"
          className="block break-all underline"
          style={{ color: "var(--adm-text2)" }}
        >
          {createResult.inviteUrl}
        </a>
      </div>
      {localUrl ? (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--adm-muted)" }}>
            Local URL
          </div>
          <a
            href={localUrl}
            target="_blank"
            rel="noreferrer"
            className="block break-all underline"
            style={{ color: "var(--adm-accent)" }}
          >
            {localUrl}
          </a>
        </div>
      ) : null}
    </div>
  );
}

function PermissionModal({
  title,
  subtitle,
  emailValue,
  onEmailChange,
  roleId,
  onRoleChange,
  roles,
  roleHelperText,
  perms,
  onToggle,
  onToggleScope,
  availableSports,
  onClose,
  onSubmit,
  submitLabel,
  disabled,
  children,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
      <div
        className="w-full max-w-4xl rounded-[32px] p-6 sm:p-7"
        style={{
          backgroundColor: "var(--adm-surface-elevated)",
          border: "1px solid color-mix(in srgb, var(--adm-border) 76%, transparent)",
          boxShadow: "var(--adm-shadow)",
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-Manrope text-2xl font-semibold tracking-[-0.03em]">{title}</h3>
            {subtitle ? (
              <p className="mt-1 text-sm leading-6" style={{ color: "var(--adm-text2)" }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="text-lg" style={{ color: "var(--adm-text2)" }}>
            x
          </button>
        </div>

        {typeof emailValue === "string" ? (
          <input
            type="email"
            value={emailValue}
            onChange={(e) => onEmailChange?.(e.target.value)}
            placeholder="staffmember@example.com"
            className="mb-5 w-full rounded-2xl px-4 py-3 text-sm outline-none"
            style={{
              backgroundColor: "color-mix(in srgb, var(--adm-surface2) 88%, transparent)",
              border: "1px solid color-mix(in srgb, var(--adm-border) 78%, transparent)",
            }}
          />
        ) : null}

        <div className="space-y-5">
          <RoleSelect
            roles={roles}
            value={roleId}
            onChange={onRoleChange}
            helperText={roleHelperText}
          />

          <PermissionMatrix
            perms={perms}
            onToggle={onToggle}
            onToggleScope={onToggleScope}
            availableSports={availableSports}
          />
        </div>

        {children}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-4 py-2.5 text-sm font-semibold"
            style={{
              border: "1px solid color-mix(in srgb, var(--adm-border2) 74%, transparent)",
              color: "var(--adm-text2)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled}
            className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--adm-accent) 0%, color-mix(in srgb, var(--adm-accent) 72%, white) 100%)",
            }}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleEditorModal({
  title,
  name,
  description,
  perms,
  onNameChange,
  onDescriptionChange,
  onToggle,
  onToggleScope,
  availableSports,
  onClose,
  onSubmit,
  submitLabel,
  disabled,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
      <div
        className="w-full max-w-4xl rounded-[32px] p-6 sm:p-7"
        style={{
          backgroundColor: "var(--adm-surface-elevated)",
          border: "1px solid color-mix(in srgb, var(--adm-border) 76%, transparent)",
          boxShadow: "var(--adm-shadow)",
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-Manrope text-2xl font-semibold tracking-[-0.03em]">{title}</h3>
            <p className="mt-1 text-sm leading-6" style={{ color: "var(--adm-text2)" }}>
              Roles are reusable baselines. Assign one, then add or remove per-person access later.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-lg" style={{ color: "var(--adm-text2)" }}>
            x
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Role name"
            className="rounded-2xl px-4 py-3 text-sm outline-none"
            style={{
              backgroundColor: "color-mix(in srgb, var(--adm-surface2) 88%, transparent)",
              border: "1px solid color-mix(in srgb, var(--adm-border) 78%, transparent)",
            }}
          />
          <input
            type="text"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Short description"
            className="rounded-2xl px-4 py-3 text-sm outline-none"
            style={{
              backgroundColor: "color-mix(in srgb, var(--adm-surface2) 88%, transparent)",
              border: "1px solid color-mix(in srgb, var(--adm-border) 78%, transparent)",
            }}
          />
        </div>

        <div className="mt-5">
          <PermissionMatrix
            perms={perms}
            onToggle={onToggle}
            onToggleScope={onToggleScope}
            availableSports={availableSports}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-4 py-2.5 text-sm font-semibold"
            style={{
              border: "1px solid color-mix(in srgb, var(--adm-border2) 74%, transparent)",
              color: "var(--adm-text2)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled}
            className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--adm-accent) 0%, color-mix(in srgb, var(--adm-accent) 72%, white) 100%)",
            }}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function describeRoleSelection(role) {
  if (!role) {
    return "No reusable role selected. The checkboxes below define this person's full access directly.";
  }
  return `Starting from ${role.name}. Use the checkboxes below to add or remove access just for this person.`;
}

export default function StaffAdminManager({ availableSports = DEFAULT_SPORTS }) {
  const [roles, setRoles] = useState([]);
  const [invites, setInvites] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviteOverrides, setInviteOverrides] = useState({});
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [createResult, setCreateResult] = useState(null);

  const [editing, setEditing] = useState(null);
  const [editRoleId, setEditRoleId] = useState("");
  const [editOverrides, setEditOverrides] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [roleEditor, setRoleEditor] = useState(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [rolePerms, setRolePerms] = useState(clonePerms());
  const [savingRole, setSavingRole] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [roleData, inviteData, staffData] = await Promise.all([
        adminApi("/admin/staff-roles"),
        adminApi("/admin/staff-invites"),
        adminApi("/admin/staff-admins"),
      ]);
      setRoles(roleData.roles || []);
      setInvites(inviteData.invites || []);
      setStaff(staffData.staffAdmins || []);
    } catch (err) {
      setError(err?.message || "Failed to load staff access settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const inviteRole = useMemo(
    () => roles.find((role) => role.id === inviteRoleId) || null,
    [roles, inviteRoleId]
  );
  const editRole = useMemo(
    () => roles.find((role) => role.id === editRoleId) || null,
    [roles, editRoleId]
  );
  const invitePerms = useMemo(
    () => materializePerms(inviteRole?.permissions, inviteOverrides),
    [inviteRole, inviteOverrides]
  );
  const editPerms = useMemo(
    () => materializePerms(editRole?.permissions, editOverrides),
    [editRole, editOverrides]
  );

  function updateOverrideBoolean(setOverrides, rolePermissions, path, nextValue) {
    setOverrides((current) => {
      const baseline = getPermAtPath(rolePermissions || {}, path) === true;
      if (nextValue === baseline) {
        return removePermAtPath(current, path);
      }
      return setPermAtPath(current, path, nextValue);
    });
  }

  function updateOverrideScope(setOverrides, rolePermissions, scopePath, sport, active, effectivePerms) {
    setOverrides((current) => {
      const next = [...(getPermAtPath(effectivePerms, scopePath) || [])];
      const nextSet = new Set(next);
      if (active) nextSet.add(sport);
      else nextSet.delete(sport);
      const nextArray = Array.from(nextSet);
      const baseline = getPermAtPath(rolePermissions || {}, scopePath) || [];
      if (areStringArraysEqual(nextArray, baseline)) {
        return removePermAtPath(current, scopePath);
      }
      return setPermAtPath(current, scopePath, nextArray);
    });
  }

  function updateRolePerm(path, nextValue) {
    setRolePerms((current) => setPermAtPath(current, path, nextValue));
  }

  function updateRoleScope(scopePath, sport, active) {
    setRolePerms((current) => {
      const next = [...(getPermAtPath(current, scopePath) || [])];
      const nextSet = new Set(next);
      if (active) nextSet.add(sport);
      else nextSet.delete(sport);
      return setPermAtPath(current, scopePath, Array.from(nextSet));
    });
  }

  function openInvite() {
    setInviteOpen(true);
    setInviteEmail("");
    setInviteRoleId("");
    setInviteOverrides({});
    setCreateResult(null);
  }

  function openEditor(staffRow) {
    setEditing(staffRow);
    setEditRoleId(staffRow.role_id || "");
    setEditOverrides(cloneValue(staffRow.permissionOverrides || {}));
  }

  function openRoleCreator() {
    setRoleEditor({ mode: "create", roleId: null });
    setRoleName("");
    setRoleDescription("");
    setRolePerms(clonePerms());
  }

  function openRoleEditor(role) {
    setRoleEditor({ mode: "edit", roleId: role.id });
    setRoleName(role.name || "");
    setRoleDescription(role.description || "");
    setRolePerms(materializePerms(role.permissions, {}));
  }

  async function createInvite() {
    if (!inviteEmail.trim()) return;
    setCreatingInvite(true);
    setCreateResult(null);
    setError("");
    try {
      const result = await adminApi("/admin/staff-invites", {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          roleId: inviteRoleId || null,
          permissions: inviteOverrides,
        }),
      });
      setCreateResult(result);
      await reload();
    } catch (err) {
      setError(err?.message || "Failed to create invite");
    } finally {
      setCreatingInvite(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSavingEdit(true);
    setError("");
    try {
      await adminApi(`/admin/staff-admins/${editing.user_id}`, {
        method: "PATCH",
        body: JSON.stringify({
          roleId: editRoleId || null,
          permissions: editOverrides,
        }),
      });
      setEditing(null);
      await reload();
    } catch (err) {
      setError(err?.message || "Failed to save staff access");
    } finally {
      setSavingEdit(false);
    }
  }

  async function saveRole() {
    if (!roleName.trim()) return;
    setSavingRole(true);
    setError("");
    try {
      if (roleEditor?.mode === "edit" && roleEditor.roleId) {
        await adminApi(`/admin/staff-roles/${roleEditor.roleId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: roleName.trim(),
            description: roleDescription.trim(),
            permissions: rolePerms,
          }),
        });
      } else {
        await adminApi("/admin/staff-roles", {
          method: "POST",
          body: JSON.stringify({
            name: roleName.trim(),
            description: roleDescription.trim(),
            permissions: rolePerms,
          }),
        });
      }
      setRoleEditor(null);
      await reload();
    } catch (err) {
      setError(err?.message || "Failed to save role");
    } finally {
      setSavingRole(false);
    }
  }

  async function deleteRole(role) {
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    try {
      await adminApi(`/admin/staff-roles/${role.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err?.message || "Failed to delete role");
    }
  }

  async function cancelInvite(id, email) {
    if (!window.confirm(`Cancel the pending invite for ${email}? The link in their email will stop working.`)) return;
    try {
      await adminApi(`/admin/staff-invites/${id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err?.message || "Failed to cancel invite");
    }
  }

  async function revokeStaff(userId) {
    if (!window.confirm("Revoke staff access for this user?")) return;
    try {
      await adminApi(`/admin/staff-admins/${userId}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err?.message || "Failed to revoke staff");
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-Manrope text-xl font-bold tracking-tight" style={{ color: "var(--adm-text)" }}>Staff Access</h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--adm-text2)" }}>
            Create reusable roles, invite staff, and adjust access per person.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openRoleCreator}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold transition"
            style={{
              border: "1px solid color-mix(in srgb, var(--adm-border) 78%, transparent)",
              color: "var(--adm-text)",
              backgroundColor: "color-mix(in srgb, var(--adm-surface2) 82%, transparent)",
            }}
          >
            Create role
          </button>
          <button
            type="button"
            onClick={openInvite}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: "var(--adm-accent)" }}
          >
            Invite staff admin
          </button>
        </div>
      </div>

      {error ? (
        <div
          className="mt-6 rounded-xl px-4 py-3 text-sm"
          style={{
            border: "1px solid color-mix(in srgb, var(--adm-danger) 25%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--adm-danger-dim) 82%, transparent)",
            color: "var(--adm-danger)",
          }}
        >
          {error}
        </div>
      ) : null}

      <section
        className="mt-8 rounded-xl p-5"
        style={{
          border: "1px solid color-mix(in srgb, var(--adm-border) 76%, transparent)",
          backgroundColor: "var(--adm-surface)",
        }}
      >
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--adm-muted)" }}>
            Staff Directory
          </p>
          <h3 className="mt-1 text-lg font-semibold" style={{ color: "var(--adm-text)" }}>People and invites</h3>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--adm-muted)" }}>Loading...</p>
        ) : (
          <div className="space-y-8">
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--adm-muted)" }}>
                    Active Staff
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--adm-text2)" }}>
                    Current access assignments
                  </p>
                </div>
                <span className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>
                  {staff.length} total
                </span>
              </div>

              {staff.length === 0 ? (
                <div
                  className="rounded-lg px-5 py-10 text-center"
                  style={{
                    border: "1px dashed color-mix(in srgb, var(--adm-border) 84%, transparent)",
                    backgroundColor: "color-mix(in srgb, var(--adm-surface2) 84%, transparent)",
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>No staff admins yet</p>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--adm-text2)" }}>
                    When someone accepts an invite, they will appear here for ongoing role and permission edits.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {staff.map((staffRow) => {
                    const effectivePerms = materializePerms(staffRow.role?.permissions, staffRow.permissionOverrides);
                    return (
                      <li
                        key={staffRow.user_id}
                        className="rounded-lg px-4 py-4"
                        style={{
                          border: "1px solid color-mix(in srgb, var(--adm-border) 76%, transparent)",
                          backgroundColor: "color-mix(in srgb, var(--adm-surface2) 82%, transparent)",
                        }}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <button
                            type="button"
                            onClick={() => !staffRow.revoked_at && openEditor(staffRow)}
                            disabled={!!staffRow.revoked_at}
                            className="flex-1 text-left disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold" style={{ color: "var(--adm-text)" }}>{staffRow.name || "-"}</span>
                              <span className="text-xs" style={{ color: "var(--adm-muted)" }}>{staffRow.email}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  staffRow.revoked_at ? "" : ""
                                }`}
                                style={staffRow.revoked_at
                                  ? {
                                      backgroundColor: "color-mix(in srgb, var(--adm-danger-dim) 82%, transparent)",
                                      color: "var(--adm-danger)",
                                    }
                                  : {
                                      backgroundColor: "color-mix(in srgb, var(--adm-accent-dim) 72%, transparent)",
                                      color: "var(--adm-accent)",
                                    }}
                              >
                                {roleBadgeText(staffRow.role)}
                              </span>
                              <span className="text-[11px]" style={{ color: "var(--adm-muted)" }}>
                                {staffRow.revoked_at
                                  ? `Revoked ${new Date(staffRow.revoked_at).toLocaleDateString()}`
                                  : `${countEnabledPermissions(effectivePerms)} effective permissions`}
                              </span>
                            </div>
                          </button>
                          {!staffRow.revoked_at ? (
                            <button
                              type="button"
                              onClick={() => revokeStaff(staffRow.user_id)}
                              className="rounded-lg px-3.5 py-2 text-xs font-semibold transition"
                              style={{
                                border: "1px solid color-mix(in srgb, var(--adm-danger) 26%, transparent)",
                                color: "var(--adm-danger)",
                                backgroundColor: "color-mix(in srgb, var(--adm-danger-dim) 78%, transparent)",
                              }}
                            >
                              Revoke access
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--adm-muted)" }}>
                    Pending Invites
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--adm-text2)" }}>
                    Access that has not been accepted yet
                  </p>
                </div>
                <span className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>
                  {invites.length} pending
                </span>
              </div>

              {invites.length === 0 ? (
                <div
                  className="rounded-lg px-4 py-8 text-center"
                  style={{
                    border: "1px dashed color-mix(in srgb, var(--adm-border) 84%, transparent)",
                    backgroundColor: "color-mix(in srgb, var(--adm-surface2) 84%, transparent)",
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>No pending invites</p>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--adm-text2)" }}>
                    New invites will stay here until they are accepted or cancelled.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {invites.map((invite) => (
                    <li
                      key={invite.id}
                      className="rounded-lg px-4 py-4"
                      style={{
                        border: "1px solid color-mix(in srgb, var(--adm-border) 76%, transparent)",
                        backgroundColor: "color-mix(in srgb, var(--adm-surface2) 82%, transparent)",
                      }}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <div className="font-semibold" style={{ color: "var(--adm-text)" }}>{invite.email}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold"
                              style={{
                                backgroundColor: "color-mix(in srgb, var(--adm-accent-dim) 72%, transparent)",
                                color: "var(--adm-accent)",
                              }}
                            >
                              {roleBadgeText(invite.role)}
                            </span>
                            <span className="text-[11px]" style={{ color: "var(--adm-muted)" }}>
                              {countEnabledPermissions(materializePerms(invite.role?.permissions, invite.permissionOverrides))} effective permissions
                            </span>
                          </div>
                          <div className="mt-1 text-[11px]" style={{ color: "var(--adm-muted)" }}>
                            Expires {new Date(invite.expires_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => cancelInvite(invite.id, invite.email)}
                          className="rounded-lg px-3.5 py-2 text-xs font-semibold transition"
                          style={{
                            border: "1px solid color-mix(in srgb, var(--adm-danger) 26%, transparent)",
                            color: "var(--adm-danger)",
                            backgroundColor: "color-mix(in srgb, var(--adm-danger-dim) 78%, transparent)",
                          }}
                        >
                          Cancel invite
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      <section
        className="mt-6 rounded-xl p-5"
        style={{
          border: "1px solid color-mix(in srgb, var(--adm-border) 76%, transparent)",
          backgroundColor: "var(--adm-surface)",
        }}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--adm-muted)" }}>
              Reusable Roles
            </p>
            <h3 className="mt-1 text-lg font-semibold" style={{ color: "var(--adm-text)" }}>Baselines for staff access</h3>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <button
              type="button"
              onClick={openRoleCreator}
              className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: "var(--adm-accent)" }}
            >
              Create role
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--adm-muted)" }}>Loading...</p>
        ) : roles.length === 0 ? (
          <div
            className="rounded-lg px-5 py-10 text-center"
            style={{
              border: "1px dashed color-mix(in srgb, var(--adm-border) 84%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--adm-surface2) 84%, transparent)",
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>No roles yet</p>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--adm-text2)" }}>
              Create a role once, then reuse it when inviting contractors or team members.
            </p>
            <button
              type="button"
              onClick={openRoleCreator}
              className="mt-4 inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: "var(--adm-accent)" }}
            >
              Create your first role
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {roles.map((role) => (
              <article
                key={role.id}
                className="rounded-lg px-4 py-4"
                style={{
                  border: "1px solid color-mix(in srgb, var(--adm-border) 76%, transparent)",
                  backgroundColor: "color-mix(in srgb, var(--adm-surface2) 82%, transparent)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold" style={{ color: "var(--adm-text)" }}>{role.name}</span>
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--adm-accent-dim) 72%, transparent)",
                          color: "var(--adm-accent)",
                        }}
                      >
                        {countEnabledPermissions(materializePerms(role.permissions, {}))} permissions
                      </span>
                    </div>
                    {role.description ? (
                      <p className="mt-2 text-sm leading-6" style={{ color: "var(--adm-text2)" }}>
                        {role.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openRoleEditor(role)}
                      className="rounded-lg px-3 py-2 text-xs font-semibold transition"
                      style={{
                        border: "1px solid color-mix(in srgb, var(--adm-border) 78%, transparent)",
                        color: "var(--adm-text)",
                        backgroundColor: "color-mix(in srgb, var(--adm-surface) 88%, transparent)",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRole(role)}
                      className="rounded-lg px-3 py-2 text-xs font-semibold transition"
                      style={{
                        border: "1px solid color-mix(in srgb, var(--adm-danger) 26%, transparent)",
                        color: "var(--adm-danger)",
                        backgroundColor: "color-mix(in srgb, var(--adm-danger-dim) 78%, transparent)",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[11px]" style={{ color: "var(--adm-muted)" }}>
                  <span>Active staff: {role.activeStaffCount || 0}</span>
                  <span>Pending invites: {role.pendingInviteCount || 0}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {inviteOpen ? (
        <PermissionModal
          title="Invite staff admin"
          subtitle="Assign a role first if one fits, then fine-tune the access below."
          emailValue={inviteEmail}
          onEmailChange={setInviteEmail}
          roleId={inviteRoleId}
          onRoleChange={setInviteRoleId}
          roles={roles}
          roleHelperText={describeRoleSelection(inviteRole)}
          perms={invitePerms}
          onToggle={(path, next) => updateOverrideBoolean(setInviteOverrides, inviteRole?.permissions, path, next)}
          onToggleScope={(scopePath, sport, active) =>
            updateOverrideScope(setInviteOverrides, inviteRole?.permissions, scopePath, sport, active, invitePerms)
          }
          availableSports={availableSports}
          onClose={() => setInviteOpen(false)}
          onSubmit={createInvite}
          submitLabel={creatingInvite ? "Creating..." : "Send invite"}
          disabled={creatingInvite || !inviteEmail.trim()}
        >
          <div className="mt-5">
            <InviteResult createResult={createResult} />
          </div>
        </PermissionModal>
      ) : null}

      {editing ? (
        <PermissionModal
          title="Edit staff access"
          subtitle={`${editing.name || "-"} - ${editing.email}`}
          roleId={editRoleId}
          onRoleChange={setEditRoleId}
          roles={roles}
          roleHelperText={describeRoleSelection(editRole)}
          perms={editPerms}
          onToggle={(path, next) => updateOverrideBoolean(setEditOverrides, editRole?.permissions, path, next)}
          onToggleScope={(scopePath, sport, active) =>
            updateOverrideScope(setEditOverrides, editRole?.permissions, scopePath, sport, active, editPerms)
          }
          availableSports={availableSports}
          onClose={() => setEditing(null)}
          onSubmit={saveEdit}
          submitLabel={savingEdit ? "Saving..." : "Save access"}
          disabled={savingEdit}
        />
      ) : null}

      {roleEditor ? (
        <RoleEditorModal
          title={roleEditor.mode === "edit" ? "Edit role" : "Create role"}
          name={roleName}
          description={roleDescription}
          perms={rolePerms}
          onNameChange={setRoleName}
          onDescriptionChange={setRoleDescription}
          onToggle={updateRolePerm}
          onToggleScope={updateRoleScope}
          availableSports={availableSports}
          onClose={() => setRoleEditor(null)}
          onSubmit={saveRole}
          submitLabel={savingRole ? "Saving..." : roleEditor.mode === "edit" ? "Save role" : "Create role"}
          disabled={savingRole || !roleName.trim()}
        />
      ) : null}
    </section>
  );
}
