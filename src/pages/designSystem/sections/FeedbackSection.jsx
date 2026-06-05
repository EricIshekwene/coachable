import { FiPlus } from "react-icons/fi";
import { AdminBadge, AdminAlert, AdminEmptyState, AdminSpinner, AdminBtn } from "../../../admin/components";
import { DSPageHeading, DSGroup, DSTile, DSStage, DSChecklist } from "../dsPrimitives";

/**
 * Status & feedback: alerts, toasts, badges, status indicators, loading,
 * empty, and error states. Live admin primitives plus documented coverage.
 *
 * @returns {JSX.Element}
 */
export default function FeedbackSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Components"
        title="Status & feedback"
        lead="Badges are compact and semantic; alerts carry message hierarchy; toasts are transient. Loading, empty, and error states share one visual language so a page can move between them without inventing new styling."
      />

      <DSGroup title="Badges" status="live" description="Small, semantic status labels for lists and tables.">
        <DSTile>
          <DSStage>
            <AdminBadge status="resolved" />
            <AdminBadge status="warning" />
            <AdminBadge status="fail" />
            <AdminBadge status="info" />
            <AdminBadge status="open" />
            <AdminBadge status="in_progress" />
          </DSStage>
        </DSTile>
      </DSGroup>

      <DSGroup title="Alerts" status="live" description="Inline message blocks with tone + title.">
        <div className="space-y-3">
          <AdminAlert tone="success" title="Publish complete">18 athletes can now open the updated play sheet.</AdminAlert>
          <AdminAlert tone="warning" title="Needs attention">One modal still uses a custom button stack outside the shared admin primitives.</AdminAlert>
          <AdminAlert tone="info" title="Heads up">New reusable admin UI should appear in this design system before it spreads to multiple pages.</AdminAlert>
        </div>
      </DSGroup>

      <DSGroup title="Toasts" description="Transient confirmations. The product uses MessagePopup for this.">
        <DSTile status="inApp" caption="Real implementation: src/components/MessagePopup/MessagePopup.jsx">
          <div className="space-y-3 rounded-[var(--adm-radius)] p-4" style={{ background: "#101317" }}>
            {[
              { title: "Play shared", body: "Trips Right Flood was sent to 18 players." },
              { title: "Needs review", body: "Two issue reports are waiting on triage." },
            ].map((t) => (
              <div key={t.title} className="flex justify-center">
                <div className="flex items-center gap-2 rounded-lg px-4 py-3 shadow-xl" style={{ backgroundColor: "#121212", border: "1px solid rgba(75,81,87,0.3)" }}>
                  <div className="h-1 w-1 rounded-full" style={{ backgroundColor: "#FF7A18" }} />
                  <p className="text-sm" style={{ color: "#f5f7fa" }}>{t.title}: {t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </DSTile>
        <DSChecklist
          columns={3}
          items={[
            { label: "Success / error / info toast", status: "inApp" },
            { label: "Loading / progress toast", status: "spec" },
            { label: "Undo toast", status: "planned" },
            { label: "Toast with action", status: "spec" },
            { label: "Stacking & duration rules", status: "spec" },
            { label: "Mobile placement", status: "spec" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Status indicators" description="State the product surfaces on plays, users, and teams.">
        <DSChecklist
          columns={3}
          items={[
            { label: "Online / offline / away / busy", note: "AdminAvatar status dot.", status: "live" },
            { label: "Draft / published / archived", note: "Play status badges.", status: "inApp" },
            { label: "Pending / approved / rejected", note: "Join requests, invites.", status: "inApp" },
            { label: "Processing / synced", status: "spec" },
            { label: "Locked / private / public", note: "Share visibility.", status: "inApp" },
            { label: "Scheduled / failed", status: "spec" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Loading states" status="live" description="Spinner and skeletons.">
        <div className="grid gap-4 md:grid-cols-2">
          <DSTile title="Spinner + skeleton lines">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Syncing play activity</p>
              <AdminSpinner size={22} />
            </div>
            <div className="mt-4 space-y-2">
              {[72, 88, 60].map((w, i) => (
                <div key={i} className="h-3 animate-pulse rounded-full" style={{ width: `${w}%`, backgroundColor: "var(--adm-surface3)" }} />
              ))}
            </div>
          </DSTile>
          <DSTile title="Skeleton bars">
            <div className="flex h-28 items-end gap-2">
              {[42, 76, 58, 88, 54, 64, 40].map((h, i) => (
                <div key={i} className="animate-pulse rounded-t-[8px]" style={{ height: h, flex: 1, backgroundColor: "var(--adm-surface3)" }} />
              ))}
            </div>
          </DSTile>
        </div>
      </DSGroup>

      <DSGroup title="Empty states" status="live">
        <DSTile>
          <AdminEmptyState
            className="py-8"
            title="No saved filters"
            subtitle="Create a few standard views here so the table stays consistent across teams."
            action={<AdminBtn variant="secondary" size="sm"><FiPlus /> Create filter</AdminBtn>}
          />
        </DSTile>
        <DSChecklist
          columns={3}
          items={[
            { label: "No data / no results", status: "live" },
            { label: "No notifications / messages", status: "inApp" },
            { label: "First-use empty state", status: "spec" },
            { label: "Permission-blocked", status: "spec" },
            { label: "Error empty state", status: "spec" },
            { label: "Empty-state CTA", status: "live" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Error states" description="Inline through full-page.">
        <DSChecklist
          columns={3}
          items={[
            { label: "Inline / field / form error", status: "live" },
            { label: "404 page", note: "src/pages/NotFound.jsx", status: "inApp" },
            { label: "403 / permission error", status: "spec" },
            { label: "500 page", status: "spec" },
            { label: "Network / offline / timeout", status: "spec" },
            { label: "Recovery actions", note: "Retry / go back.", status: "spec" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
