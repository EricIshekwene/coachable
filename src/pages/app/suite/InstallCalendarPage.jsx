/**
 * InstallCalendarPage
 *
 * Install Calendar for the Team Suite.
 * Coaches can plan what concepts/plays/drills are being installed each week.
 * Items are displayed in a sorted list grouped by date.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useAppMessage } from "../../../context/AppMessageContext";
import { apiFetch } from "../../../utils/api";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCalendar } from "react-icons/fi";

const COACH_ROLES = ["owner", "coach", "assistant_coach"];

const CATEGORY_LABELS = { concept: "Concept", play: "Play", drill: "Drill", focus: "Focus", other: "Other" };
const CATEGORY_COLORS = {
  concept: "bg-blue-500/10 text-blue-400",
  play: "bg-BrandOrange/10 text-BrandOrange",
  drill: "bg-purple-500/10 text-purple-400",
  focus: "bg-green-500/10 text-green-400",
  other: "bg-BrandGray2/15 text-BrandGray",
};

// ── Install item modal ────────────────────────────────────────────────────────

/**
 * Modal for creating or editing an install calendar item.
 * @param {{ item: object|null, teamId: string, onSave: (item:object)=>void, onClose:()=>void }} props
 */
function ItemModal({ item, teamId, onSave, onClose }) {
  const isNew = !item?.id;
  const [form, setForm] = useState(() => item ? { ...item, installDate: item.install_date || "" } : { installDate: "", title: "", description: "", category: "concept" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.installDate) { setError("Title and date are required."); return; }
    setSaving(true);
    setError("");
    try {
      const body = { installDate: form.installDate, title: form.title, description: form.description, category: form.category };
      const endpoint = isNew ? `/teams/${teamId}/suite/install` : `/teams/${teamId}/suite/install/${item.id}`;
      const data = await apiFetch(endpoint, { method: isNew ? "POST" : "PATCH", body });
      onSave(data.item);
    } catch (err) {
      setError(err.message || "Save failed");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-BrandGray2/20 bg-BrandBlack p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-Manrope text-base font-bold">{isNew ? "Add Install Item" : "Edit Install Item"}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText"><FiX /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-BrandGray2 uppercase tracking-wider">Date *</label>
              <input type="date" className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange" value={form.installDate} onChange={(e) => set("installDate", e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-BrandGray2 uppercase tracking-wider">Category</label>
              <select className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange" value={form.category} onChange={(e) => set("category", e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-BrandGray2 uppercase tracking-wider">Title *</label>
            <input className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]" value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} placeholder="e.g. Inside Zone Run" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-BrandGray2 uppercase tracking-wider">Description</label>
            <textarea className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange resize-none" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={2000} placeholder="Details..." />
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-BrandGray2/40 px-3.5 py-2 text-sm text-BrandGray hover:text-BrandText">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40">{saving ? "Saving…" : isNew ? "Add" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Install Calendar page — shows install items grouped by date.
 */
export default function InstallCalendarPage() {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const isCoach = COACH_ROLES.includes(user?.role);
  const teamId = user?.teamId;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalItem, setModalItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/teams/${teamId}/suite/install`);
      setItems(data.items || []);
    } catch (err) {
      showMessage("Failed to load install calendar", err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [teamId, showMessage]);

  useEffect(() => { load(); }, [load]);

  const handleSave = (saved) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === saved.id);
      const next = exists ? prev.map((i) => (i.id === saved.id ? saved : i)) : [...prev, saved];
      return next.sort((a, b) => (a.install_date > b.install_date ? 1 : -1));
    });
    setModalItem(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiFetch(`/teams/${teamId}/suite/install/${confirmDelete.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== confirmDelete.id));
      showMessage("Item deleted", "", "success");
    } catch (err) {
      showMessage("Delete failed", err.message, "error");
    } finally {
      setConfirmDelete(null);
    }
  };

  // Group by date
  const byDate = {};
  for (const item of items) {
    const d = item.install_date;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(item);
  }
  const dates = Object.keys(byDate).sort();

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:px-10 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-Manrope text-xl font-bold tracking-tight">Install Calendar</h1>
        {isCoach && (
          <button onClick={() => setModalItem({})} className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110 transition">
            <FiPlus className="text-sm" /> Add Item
          </button>
        )}
      </div>

      {loading && <div className="flex justify-center py-16"><div className="h-8 w-8 rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange animate-spin" /></div>}

      {!loading && items.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-BrandGray2/10 mb-4">
            <FiCalendar className="text-2xl text-BrandGray2" />
          </div>
          <p className="font-Manrope text-base font-semibold">No install items yet</p>
          <p className="mt-1 text-sm text-BrandGray2">{isCoach ? "Add your first install item to plan what you're teaching week by week." : "No items have been added yet."}</p>
        </div>
      )}

      {!loading && dates.length > 0 && (
        <div className="flex flex-col gap-5">
          {dates.map((date) => (
            <div key={date}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-BrandGray2">{date}</p>
              <div className="flex flex-col gap-1.5">
                {byDate[date].map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/20 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other}`}>
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                        <p className="text-sm font-semibold text-BrandText">{item.title}</p>
                      </div>
                      {item.description && <p className="mt-1.5 text-xs text-BrandGray leading-relaxed">{item.description}</p>}
                    </div>
                    {isCoach && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setModalItem(item)} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText transition"><FiEdit2 className="text-sm" /></button>
                        <button onClick={() => setConfirmDelete(item)} className="rounded-md p-1.5 text-BrandGray2 hover:text-red-400 transition"><FiTrash2 className="text-sm" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalItem !== null && (
        <ItemModal item={modalItem.id ? modalItem : null} teamId={teamId} onSave={handleSave} onClose={() => setModalItem(null)} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-xl border border-BrandGray2/20 bg-BrandBlack p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-Manrope text-base font-bold mb-2">Delete item?</h2>
            <p className="text-sm text-BrandGray">Delete <strong className="text-BrandText">{confirmDelete.title}</strong>?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-BrandGray2/40 px-3.5 py-2 text-sm text-BrandGray hover:text-BrandText">Cancel</button>
              <button onClick={handleDelete} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
