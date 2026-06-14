/**
 * Admin page for the outreach scraper: scrape college athletic staff
 * directories, filter the resulting contacts by sport/role, and export CSV.
 *
 * Owner-only. Talks to /admin/outreach/* (see server/routes/outreach.js).
 * Layout: schools panel (scrape status + actions) → filters → results table.
 *
 * @module AdminOutreachScraperPage
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../admin/AdminContext";
import { adminPath } from "../admin/adminNav";
import { adminApi, adminUrl, adminFetchOptions, readAdminSession } from "../admin/adminTransport";
import {
  AdminShell, AdminHeader, AdminPage, AdminCard, AdminSection,
  AdminBtn, AdminInput, AdminSelect, AdminCheckbox, AdminBadge,
  AdminEmptyState, AdminSpinner, AdminModal, AdminDataTable,
} from "../admin/components";

const ROLE_OPTIONS = [
  "head_coach", "offensive_coordinator", "defensive_coordinator",
  "special_teams_coordinator", "assistant_coach", "recruiting_coordinator",
  "strength_coach", "graduate_assistant", "director_of_operations",
  "athletic_trainer", "video_coordinator",
];

/** Turn a snake_case slug into a Title Case label. */
function humanize(slug) {
  if (!slug) return "";
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Map a platform slug to an AdminBadge status tone. */
function platformBadgeStatus(platform) {
  if (platform === "sidearm_nextgen" || platform === "sidearm_legacy") return "resolved";
  if (platform === "unknown") return "warning";
  return "info";
}

/** Format an ISO timestamp as a short local date-time, or a dash. */
function formatTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

/**
 * Outreach scraper admin dashboard.
 */
export default function AdminOutreachScraperPage() {
  const { basePath, isOwner } = useAdmin();
  const [session] = useState(() => readAdminSession() || "");
  const authed = basePath === "/staff" || Boolean(session);

  const [schools, setSchools] = useState([]);
  const [staff, setStaff] = useState([]);
  const [error, setError] = useState("");
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [scrapingId, setScrapingId] = useState(null); // school id or "all"
  const [scrapeMsg, setScrapeMsg] = useState("");

  // Filters
  const [fSport, setFSport] = useState("");
  const [fRoles, setFRoles] = useState([]);
  const [fHasEmail, setFHasEmail] = useState(false);
  const [fSchool, setFSchool] = useState("");

  const [selected, setSelected] = useState(() => new Set());

  // Manual-add modal
  const [manualFor, setManualFor] = useState(null); // school object
  const [manualForm, setManualForm] = useState({ name: "", title: "", sport: "", roleTags: "", email: "", phone: "" });

  /** Load all schools with status + counts. */
  const fetchSchools = useCallback(async () => {
    setLoadingSchools(true);
    setError("");
    try {
      const data = await adminApi("/admin/outreach/schools");
      setSchools(data.schools || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSchools(false);
    }
  }, []);

  /** Build the staff filter query string from current filter state. */
  const filterParams = useCallback(() => {
    const p = new URLSearchParams();
    if (fSport) p.set("sport", fSport);
    if (fRoles.length) p.set("role", fRoles.join(","));
    if (fHasEmail) p.set("hasEmail", "true");
    if (fSchool) p.set("schoolId", fSchool);
    return p;
  }, [fSport, fRoles, fHasEmail, fSchool]);

  /** Load filtered staff rows. */
  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const data = await adminApi(`/admin/outreach/staff?${filterParams()}`);
      setStaff(data.staff || []);
      setSelected(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingStaff(false);
    }
  }, [filterParams]);

  useEffect(() => { if (authed) fetchSchools(); }, [authed, fetchSchools]);
  useEffect(() => { if (authed) fetchStaff(); }, [authed, fetchStaff]);

  /** Scrape a single school, then refresh schools + staff. */
  const handleScrapeOne = async (school) => {
    setScrapingId(school.id);
    setScrapeMsg("");
    try {
      const r = await adminApi(`/admin/outreach/scrape/${school.id}`, { method: "POST" });
      setScrapeMsg(
        r.ok ? `${school.canonical_name}: ${r.count} staff scraped`
             : `${school.canonical_name}: ${r.error}`
      );
      await fetchSchools();
      await fetchStaff();
    } catch (err) {
      setError(err.message);
    } finally {
      setScrapingId(null);
    }
  };

  /** Scrape all scrapeable schools, then refresh. */
  const handleScrapeAll = async () => {
    setScrapingId("all");
    setScrapeMsg("Scraping all schools — this can take a minute…");
    try {
      const r = await adminApi("/admin/outreach/scrape-all", { method: "POST" });
      const okCount = (r.results || []).filter((x) => x.ok).length;
      const total = (r.results || []).reduce((sum, x) => sum + (x.count || 0), 0);
      setScrapeMsg(`Done: ${okCount}/${(r.results || []).length} schools scraped, ${total} staff total`);
      await fetchSchools();
      await fetchStaff();
    } catch (err) {
      setError(err.message);
    } finally {
      setScrapingId(null);
    }
  };

  /** Download CSV for the current filters (optionally only selected rows). */
  const handleExport = async (onlySelected) => {
    try {
      const p = filterParams();
      const res = await fetch(adminUrl(`/admin/outreach/export.csv?${p}`), adminFetchOptions());
      if (!res.ok) throw new Error("Export failed");
      let blob = await res.blob();
      if (onlySelected && selected.size) {
        // Filter the CSV client-side to the selected rows by email+name match.
        const text = await blob.text();
        const lines = text.split("\r\n");
        const keep = new Set([...selected].map((id) => {
          const row = staff.find((s) => s.id === id);
          return row ? `${row.name}|${row.email || ""}` : "";
        }));
        const filtered = [lines[0], ...lines.slice(1).filter((ln) => {
          // crude: match on name+email columns; safe enough for export
          return [...keep].some((k) => {
            const [n, e] = k.split("|");
            return ln.includes(n) && (e === "" || ln.includes(e));
          });
        })];
        blob = new Blob([filtered.join("\r\n")], { type: "text/csv" });
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "outreach-contacts.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  /** Add a manual staff row for the school in the modal. */
  const handleManualAdd = async () => {
    if (!manualFor) return;
    try {
      await adminApi("/admin/outreach/staff", {
        method: "POST",
        body: JSON.stringify({
          schoolId: manualFor.id,
          name: manualForm.name,
          title: manualForm.title,
          sport: manualForm.sport || null,
          roleTags: manualForm.roleTags ? manualForm.roleTags.split(",").map((s) => s.trim()).filter(Boolean) : [],
          email: manualForm.email,
          phone: manualForm.phone,
        }),
      });
      setManualFor(null);
      setManualForm({ name: "", title: "", sport: "", roleTags: "", email: "", phone: "" });
      await fetchSchools();
      await fetchStaff();
    } catch (err) {
      setError(err.message);
    }
  };

  /** Delete a single staff row. */
  const handleDeleteStaff = async (id) => {
    try {
      await adminApi(`/admin/outreach/staff/${id}`, { method: "DELETE" });
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleRole = (role) => {
    setFRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const toggleSelected = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Distinct sports present in the current staff result, for the sport dropdown.
  const sportOptions = useMemo(() => {
    const s = new Set();
    staff.forEach((r) => { if (r.sport) s.add(r.sport); });
    return [...s].sort();
  }, [staff]);

  if (!authed) {
    return (
      <AdminShell className="flex items-center justify-center">
        <AdminCard>
          <p className="mb-3 text-sm" style={{ color: "var(--adm-muted)" }}>Admin session required</p>
          <Link to={adminPath(basePath, "")} className="text-sm" style={{ color: "var(--adm-accent)" }}>Go to Admin Login</Link>
        </AdminCard>
      </AdminShell>
    );
  }

  if (!isOwner) {
    return (
      <AdminShell>
        <AdminHeader title="Outreach Scraper" backLabel="Dashboard" backTo={adminPath(basePath, "")} />
        <AdminPage>
          <AdminEmptyState title="Owner only" subtitle="The outreach scraper is restricted to the account owner." />
        </AdminPage>
      </AdminShell>
    );
  }

  const allChecked = staff.length > 0 && selected.size === staff.length;

  return (
    <AdminShell>
      <AdminHeader
        title="Outreach Scraper"
        backLabel="Dashboard"
        backTo={adminPath(basePath, "")}
        actions={
          <AdminBtn variant="primary" size="sm" onClick={handleScrapeAll} disabled={scrapingId !== null}>
            {scrapingId === "all" ? <AdminSpinner size={12} /> : "Scrape All"}
          </AdminBtn>
        }
      />
      <AdminPage wide>
        {error && (
          <div className="mb-4 rounded-[var(--adm-radius-sm)] px-4 py-2 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{error}</div>
        )}
        {scrapeMsg && (
          <div className="mb-4 rounded-[var(--adm-radius-sm)] px-4 py-2 text-sm" style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text2)" }}>{scrapeMsg}</div>
        )}

        <div className="space-y-8">
        {/* ---------- Schools panel ---------- */}
        <AdminSection title="Schools" subtitle={`${schools.length} seeded`}>
          {loadingSchools ? (
            <AdminSpinner />
          ) : (
            <div className="max-h-[42vh] overflow-y-auto pr-1">
              <AdminDataTable
                columns={[
                  {
                    key: "canonical_name",
                    label: "School",
                    render: (s) => (
                      <span style={{ color: "var(--adm-text)" }}>
                        {s.canonical_name}
                        {s.last_scrape_error && (
                          <span className="ml-2 text-[10px]" style={{ color: "var(--adm-danger)" }} title={s.last_scrape_error}>⚠</span>
                        )}
                      </span>
                    ),
                  },
                  {
                    key: "division",
                    label: "Div",
                    render: (s) => <span style={{ color: "var(--adm-muted)" }}>{s.division}</span>,
                  },
                  {
                    key: "platform",
                    label: "Platform",
                    render: (s) => (
                      <>
                        <AdminBadge status={platformBadgeStatus(s.platform)}>{s.platform.replace(/_/g, " ")}</AdminBadge>
                        {!s.scrapeable && <span className="ml-1 text-[10px]" style={{ color: "var(--adm-muted)" }}>manual</span>}
                      </>
                    ),
                  },
                  {
                    key: "last_scraped_at",
                    label: "Last scraped",
                    render: (s) => <span style={{ color: "var(--adm-muted)" }}>{formatTime(s.last_scraped_at)}</span>,
                  },
                  {
                    key: "staff_count",
                    label: "Staff",
                    render: (s) => <span style={{ color: "var(--adm-text2)" }}>{s.staff_count}</span>,
                  },
                  {
                    key: "action",
                    label: "",
                    align: "right",
                    render: (s) => s.scrapeable ? (
                      <AdminBtn variant="secondary" size="sm" onClick={() => handleScrapeOne(s)} disabled={scrapingId !== null}>
                        {scrapingId === s.id ? <AdminSpinner size={12} /> : "Scrape"}
                      </AdminBtn>
                    ) : (
                      <AdminBtn variant="secondary" size="sm" onClick={() => setManualFor(s)}>Add staff</AdminBtn>
                    ),
                  },
                ]}
                data={schools}
                keyField="id"
                size="xs"
                minWidth="560px"
              />
            </div>
          )}
        </AdminSection>

        {/* ---------- Filters ---------- */}
        <AdminSection title="Filters">
          <div className="flex flex-wrap items-end gap-4">
            <AdminSelect label="Sport" value={fSport} onChange={(e) => setFSport(e.target.value)}>
              <option value="">All sports</option>
              {sportOptions.map((sp) => <option key={sp} value={sp}>{humanize(sp)}</option>)}
            </AdminSelect>
            <AdminSelect label="School" value={fSchool} onChange={(e) => setFSchool(e.target.value)}>
              <option value="">All schools</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.canonical_name}</option>)}
            </AdminSelect>
            <div className="pb-1">
              <AdminCheckbox label="Has email" checked={fHasEmail} onChange={(e) => setFHasEmail(e.target.checked)} />
            </div>
          </div>
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>Roles</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {ROLE_OPTIONS.map((role) => (
                <AdminCheckbox key={role} label={humanize(role)} checked={fRoles.includes(role)} onChange={() => toggleRole(role)} />
              ))}
            </div>
          </div>
        </AdminSection>

        {/* ---------- Results ---------- */}
        <AdminSection
          title="Contacts"
          subtitle={`${staff.length} result${staff.length !== 1 ? "s" : ""}${selected.size ? ` · ${selected.size} selected` : ""}`}
          actions={
            <div className="flex gap-2">
              <AdminBtn variant="secondary" size="sm" onClick={() => handleExport(false)} disabled={!staff.length}>Export Filtered → CSV</AdminBtn>
              <AdminBtn variant="primary" size="sm" onClick={() => handleExport(true)} disabled={!selected.size}>Export Selected → CSV</AdminBtn>
            </div>
          }
        >
          {loadingStaff ? (
            <AdminSpinner />
          ) : staff.length === 0 ? (
            <AdminEmptyState title="No contacts" subtitle="Scrape a school or adjust the filters." />
          ) : (
            <div className="max-h-[55vh] overflow-y-auto pr-1">
              <AdminDataTable
                columns={[
                  {
                    key: "select",
                    label: (
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={() => setSelected(allChecked ? new Set() : new Set(staff.map((s) => s.id)))}
                      />
                    ),
                    width: "32px",
                    render: (r) => <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelected(r.id)} />,
                  },
                  {
                    key: "school_name",
                    label: "School",
                    render: (r) => <span style={{ color: "var(--adm-muted)" }}>{r.school_name}</span>,
                  },
                  {
                    key: "name",
                    label: "Name",
                    render: (r) => (
                      <span style={{ color: "var(--adm-text)" }}>
                        {r.name}
                        {r.source === "manual" && <span className="ml-1 text-[10px]" style={{ color: "var(--adm-muted)" }}>(manual)</span>}
                      </span>
                    ),
                  },
                  {
                    key: "title",
                    label: "Title",
                    render: (r) => <span style={{ color: "var(--adm-text2)" }}>{r.title}</span>,
                  },
                  {
                    key: "sport",
                    label: "Sport",
                    render: (r) => <span style={{ color: "var(--adm-muted)" }}>{r.sport ? humanize(r.sport) : "—"}</span>,
                  },
                  {
                    key: "role_tags",
                    label: "Roles",
                    render: (r) => <span style={{ color: "var(--adm-muted)" }}>{(r.role_tags || []).map(humanize).join(", ") || "—"}</span>,
                  },
                  {
                    key: "email",
                    label: "Email",
                    render: (r) => r.email
                      ? <a href={`mailto:${r.email}`} style={{ color: "var(--adm-accent)" }}>{r.email}</a>
                      : <span style={{ color: "var(--adm-text2)" }}>—</span>,
                  },
                  {
                    key: "phone",
                    label: "Phone",
                    render: (r) => <span style={{ color: "var(--adm-muted)" }}>{r.phone || "—"}</span>,
                  },
                  {
                    key: "action",
                    label: "",
                    align: "right",
                    render: (r) => (
                      <button onClick={() => handleDeleteStaff(r.id)} className="text-[11px]" style={{ color: "var(--adm-danger)" }}>Delete</button>
                    ),
                  },
                ]}
                data={staff}
                keyField="id"
                size="xs"
                minWidth="760px"
              />
            </div>
          )}
        </AdminSection>
        </div>
      </AdminPage>

      {/* ---------- Manual-add modal ---------- */}
      <AdminModal open={Boolean(manualFor)} onClose={() => setManualFor(null)} title={manualFor ? `Add staff — ${manualFor.canonical_name}` : ""}>
        <div className="flex flex-col gap-3">
          <AdminInput label="Name" value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} />
          <AdminInput label="Title" value={manualForm.title} onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })} />
          <AdminInput label="Sport (slug, optional)" value={manualForm.sport} onChange={(e) => setManualForm({ ...manualForm, sport: e.target.value })} hint="e.g. football, womens_lacrosse" />
          <AdminInput label="Role tags (comma-separated)" value={manualForm.roleTags} onChange={(e) => setManualForm({ ...manualForm, roleTags: e.target.value })} hint="e.g. head_coach, recruiting_coordinator" />
          <AdminInput label="Email" value={manualForm.email} onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })} />
          <AdminInput label="Phone" value={manualForm.phone} onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })} />
          <div className="mt-2 flex justify-end gap-2">
            <AdminBtn variant="secondary" size="sm" onClick={() => setManualFor(null)}>Cancel</AdminBtn>
            <AdminBtn variant="primary" size="sm" onClick={handleManualAdd} disabled={!manualForm.name && !manualForm.email}>Add</AdminBtn>
          </div>
        </div>
      </AdminModal>
    </AdminShell>
  );
}
