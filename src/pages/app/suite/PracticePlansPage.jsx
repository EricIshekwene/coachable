/**
 * PracticePlansPage
 *
 * Practice Plan Builder for the Team Suite.
 * Coaches can create/edit practice plans for specific dates.
 * Each plan has ordered blocks (warmup, drill, install, etc.).
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useAppMessage } from "../../../context/AppMessageContext";
import { apiFetch } from "../../../utils/api";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiClipboard, FiChevronLeft, FiClock } from "react-icons/fi";

const COACH_ROLES = ["owner", "coach", "assistant_coach"];

const BLOCK_TYPE_LABELS = {
  warmup: "Warmup",
  drill: "Drill",
  install: "Install",
  team_period: "Team Period",
  conditioning: "Conditioning",
  notes: "Notes",
  other: "Other",
};

const BLOCK_TYPE_COLORS = {
  warmup: "bg-yellow-500/10 text-yellow-400",
  drill: "bg-blue-500/10 text-blue-400",
  install: "bg-BrandOrange/10 text-BrandOrange",
  team_period: "bg-green-500/10 text-green-400",
  conditioning: "bg-purple-500/10 text-purple-400",
  notes: "bg-BrandGray2/15 text-BrandGray",
  other: "bg-BrandGray2/15 text-BrandGray",
};

// ── Plan list view ─────────────────────────────────────────────────────────────

/**
 * Block form inside the plan detail view.
 * @param {{ block: object|null, planId: string, teamId: string, onSave: (b:object)=>void, onClose:()=>void }} props
 */
function BlockModal({ block, planId, teamId, onSave, onClose }) {
  const isNew = !block?.id;
  const [form, setForm] = useState(() => block ? { ...block } : { blockType: "drill", title: "", durationMinutes: "", startTime: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        blockType: form.blockType,
        title: form.title,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes, 10) : undefined,
        startTime: form.startTime,
        description: form.description,
      };
      const endpoint = isNew
        ? `/teams/${teamId}/suite/practice-plans/${planId}/blocks`
        : `/teams/${teamId}/suite/practice-plans/${planId}/blocks/${block.id}`;
      const data = await apiFetch(endpoint, { method: isNew ? "POST" : "PATCH", body });
      onSave(data.block);
    } catch (err) {
      setError(err.message || "Save failed");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-BrandGray2/20 bg-BrandBlack p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-Manrope text-base font-bold">{isNew ? "Add Block" : "Edit Block"}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText"><FiX /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-BrandGray2 uppercase tracking-wider">Type</label>
            <select
              className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange"
              value={form.blockType}
              onChange={(e) => set("blockType", e.target.value)}
            >
              {Object.entries(BLOCK_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-BrandGray2 uppercase tracking-wider">Title *</label>
            <input
              className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
              value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} placeholder="Block name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-BrandGray2 uppercase tracking-wider">Start Time</label>
              <input
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange"
                value={form.startTime} onChange={(e) => set("startTime", e.target.value)} placeholder="3:00 PM"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-BrandGray2 uppercase tracking-wider">Duration (min)</label>
              <input
                type="number" min={0} max={480}
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange"
                value={form.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} placeholder="20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-BrandGray2 uppercase tracking-wider">Description</label>
            <textarea
              className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange resize-none"
              value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={2000} placeholder="Details..."
            />
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-BrandGray2/40 px-3.5 py-2 text-sm text-BrandGray hover:text-BrandText">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40">
            {saving ? "Saving…" : isNew ? "Add Block" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plan detail view ──────────────────────────────────────────────────────────

/**
 * Shows a single practice plan and its blocks.
 * @param {{ plan: object, teamId: string, isCoach: boolean, onBack: ()=>void, onPlanUpdated: (p:object)=>void }} props
 */
function PlanDetail({ plan, teamId, isCoach, onBack, onPlanUpdated }) {
  const { showMessage } = useAppMessage();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockModal, setBlockModal] = useState(null);
  const [confirmDeleteBlock, setConfirmDeleteBlock] = useState(null);

  useEffect(() => {
    apiFetch(`/teams/${teamId}/suite/practice-plans/${plan.id}`)
      .then((data) => { setBlocks(data.blocks || []); })
      .catch((err) => showMessage("Failed to load blocks", err.message, "error"))
      .finally(() => setLoading(false));
  }, [plan.id, teamId, showMessage]);

  const handleBlockSave = (saved) => {
    setBlocks((prev) => {
      const exists = prev.find((b) => b.id === saved.id);
      return exists ? prev.map((b) => (b.id === saved.id ? saved : b)) : [...prev, saved];
    });
    setBlockModal(null);
  };

  const handleBlockDelete = async () => {
    if (!confirmDeleteBlock) return;
    try {
      await apiFetch(`/teams/${teamId}/suite/practice-plans/${plan.id}/blocks/${confirmDeleteBlock.id}`, { method: "DELETE" });
      setBlocks((prev) => prev.filter((b) => b.id !== confirmDeleteBlock.id));
      showMessage("Block removed", "", "success");
    } catch (err) {
      showMessage("Delete failed", err.message, "error");
    } finally {
      setConfirmDeleteBlock(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:px-10 md:py-12">
      <button onClick={onBack} className="mb-5 flex items-center gap-1.5 text-sm text-BrandGray2 hover:text-BrandText transition">
        <FiChevronLeft className="text-sm" /> All Plans
      </button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-Manrope text-xl font-bold">{plan.title}</h1>
          <p className="mt-1 text-sm text-BrandGray2">{plan.plan_date}</p>
          {plan.notes && <p className="mt-2 text-sm text-BrandGray">{plan.notes}</p>}
        </div>
        {isCoach && (
          <button
            onClick={() => setBlockModal({})}
            className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
          >
            <FiPlus className="text-sm" /> Add Block
          </button>
        )}
      </div>

      {loading && <div className="flex justify-center py-16"><div className="h-8 w-8 rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange animate-spin" /></div>}

      {!loading && blocks.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-BrandGray2">{isCoach ? "No blocks yet. Add your first block." : "No blocks added."}</p>
        </div>
      )}

      {!loading && blocks.length > 0 && (
        <div className="flex flex-col gap-2">
          {blocks.map((block) => (
            <div key={block.id} className="rounded-xl border border-BrandGray2/20 bg-BrandBlack2/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${BLOCK_TYPE_COLORS[block.block_type] || BLOCK_TYPE_COLORS.other}`}>
                      {BLOCK_TYPE_LABELS[block.block_type] || block.block_type}
                    </span>
                    <p className="text-sm font-semibold text-BrandText">{block.title}</p>
                  </div>
                  {(block.start_time || block.duration_minutes) && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-BrandGray2">
                      <FiClock className="text-[10px]" />
                      {[block.start_time, block.duration_minutes ? `${block.duration_minutes}min` : null].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {block.description && <p className="mt-1.5 text-xs text-BrandGray leading-relaxed">{block.description}</p>}
                </div>
                {isCoach && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setBlockModal(block)} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText"><FiEdit2 className="text-sm" /></button>
                    <button onClick={() => setConfirmDeleteBlock(block)} className="rounded-md p-1.5 text-BrandGray2 hover:text-red-400"><FiTrash2 className="text-sm" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {blockModal !== null && (
        <BlockModal block={blockModal.id ? blockModal : null} planId={plan.id} teamId={teamId} onSave={handleBlockSave} onClose={() => setBlockModal(null)} />
      )}

      {confirmDeleteBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setConfirmDeleteBlock(null)}>
          <div className="w-full max-w-sm rounded-xl border border-BrandGray2/20 bg-BrandBlack p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-Manrope text-base font-bold mb-2">Remove block?</h2>
            <p className="text-sm text-BrandGray">Remove <strong className="text-BrandText">{confirmDeleteBlock.title}</strong>?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteBlock(null)} className="rounded-lg border border-BrandGray2/40 px-3.5 py-2 text-sm text-BrandGray hover:text-BrandText">Cancel</button>
              <button onClick={handleBlockDelete} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Practice Plans list + detail page for the Team Suite.
 */
export default function PracticePlansPage() {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const isCoach = COACH_ROLES.includes(user?.role);
  const teamId = user?.teamId;

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", planDate: "", notes: "" });
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/teams/${teamId}/suite/practice-plans`);
      setPlans(data.plans || []);
    } catch (err) {
      showMessage("Failed to load plans", err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [teamId, showMessage]);

  useEffect(() => { load(); }, [load]);

  if (selectedPlan) {
    return (
      <PlanDetail
        plan={selectedPlan}
        teamId={teamId}
        isCoach={isCoach}
        onBack={() => setSelectedPlan(null)}
        onPlanUpdated={(updated) => {
          setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          setSelectedPlan(updated);
        }}
      />
    );
  }

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.planDate) { return; }
    setCreating(true);
    try {
      const data = await apiFetch(`/teams/${teamId}/suite/practice-plans`, {
        method: "POST",
        body: { title: createForm.title, planDate: createForm.planDate, notes: createForm.notes },
      });
      setPlans((prev) => [data.plan, ...prev]);
      setShowCreateModal(false);
      setCreateForm({ title: "", planDate: "", notes: "" });
      setSelectedPlan(data.plan);
    } catch (err) {
      showMessage("Create failed", err.message, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiFetch(`/teams/${teamId}/suite/practice-plans/${confirmDelete.id}`, { method: "DELETE" });
      setPlans((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      showMessage("Plan deleted", "", "success");
    } catch (err) {
      showMessage("Delete failed", err.message, "error");
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:px-10 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-Manrope text-xl font-bold tracking-tight">Practice Plans</h1>
        {isCoach && (
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110 transition">
            <FiPlus className="text-sm" /> New Plan
          </button>
        )}
      </div>

      {loading && <div className="flex justify-center py-16"><div className="h-8 w-8 rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange animate-spin" /></div>}

      {!loading && plans.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-BrandGray2/10 mb-4">
            <FiClipboard className="text-2xl text-BrandGray2" />
          </div>
          <p className="font-Manrope text-base font-semibold">No practice plans yet</p>
          <p className="mt-1 text-sm text-BrandGray2">{isCoach ? "Create your first plan to get started." : "No plans have been created yet."}</p>
        </div>
      )}

      {!loading && plans.length > 0 && (
        <div className="flex flex-col gap-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center gap-3 rounded-xl border border-BrandGray2/20 bg-BrandBlack2/20 p-4 cursor-pointer hover:border-BrandGray2/40 hover:bg-BrandBlack2/40 transition"
              onClick={() => setSelectedPlan(plan)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-BrandText">{plan.title}</p>
                <p className="text-[11px] text-BrandGray2 mt-0.5">{plan.plan_date}</p>
                {plan.notes && <p className="text-xs text-BrandGray mt-1 truncate">{plan.notes}</p>}
              </div>
              {isCoach && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(plan); }}
                  className="rounded-md p-1.5 text-BrandGray2 hover:text-red-400 transition"
                >
                  <FiTrash2 className="text-sm" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-BrandGray2/20 bg-BrandBlack p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-Manrope text-base font-bold">New Practice Plan</h2>
              <button onClick={() => setShowCreateModal(false)} className="rounded-md p-1.5 text-BrandGray2 hover:text-BrandText"><FiX /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-BrandGray2 uppercase tracking-wider">Title *</label>
                <input className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} maxLength={200} placeholder="e.g. Tuesday Install" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-BrandGray2 uppercase tracking-wider">Date *</label>
                <input type="date" className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange" value={createForm.planDate} onChange={(e) => setCreateForm((f) => ({ ...f, planDate: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-BrandGray2 uppercase tracking-wider">Notes</label>
                <textarea className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2 text-sm text-BrandText outline-none focus:border-BrandOrange resize-none" value={createForm.notes} onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))} rows={2} maxLength={2000} placeholder="Optional notes..." />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="rounded-lg border border-BrandGray2/40 px-3.5 py-2 text-sm text-BrandGray hover:text-BrandText">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !createForm.title.trim() || !createForm.planDate} className="rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40">{creating ? "Creating…" : "Create Plan"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-xl border border-BrandGray2/20 bg-BrandBlack p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-Manrope text-base font-bold mb-2">Delete plan?</h2>
            <p className="text-sm text-BrandGray">Delete <strong className="text-BrandText">{confirmDelete.title}</strong> and all its blocks?</p>
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
