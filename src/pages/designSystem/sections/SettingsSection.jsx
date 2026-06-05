import { AdminToggle, AdminBtn } from "../../../admin/components";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSRef } from "../dsPrimitives";

/**
 * Settings page patterns: structure, settings rows, and the per-domain settings
 * catalog (account, workspace, team, security, notifications, billing, etc.).
 *
 * @returns {JSX.Element}
 */
export default function SettingsSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Settings pages"
        lead="Settings pages are sectioned cards of rows: each row is a label + description on the left and a control on the right. Changes either autosave or surface a sticky save/cancel footer. Destructive options live in a clearly separated danger zone."
      />

      <DSGroup title="Settings row pattern" status="spec" description="Label + description left, control right.">
        <DSTile>
          <div className="divide-y" style={{ borderColor: "var(--adm-border)" }}>
            {[
              { title: "Email notifications", desc: "Get notified when a play is shared with your team.", on: true },
              { title: "Product updates", desc: "Occasional news about new Coachable features.", on: false },
              { title: "Security alerts", desc: "Always on for important account activity.", on: true },
            ].map((row, i) => (
              <div key={row.title} className="flex items-center justify-between gap-4 py-4" style={{ borderTop: i === 0 ? "none" : "1px solid var(--adm-border)" }}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{row.title}</p>
                  <p className="text-xs" style={{ color: "var(--adm-text3)" }}>{row.desc}</p>
                </div>
                <AdminToggle checked={row.on} onChange={() => {}} />
              </div>
            ))}
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Danger zone" status="spec">
        <div className="rounded-[var(--adm-radius)] p-4" style={{ backgroundColor: "var(--adm-danger-dim)", border: "1px solid color-mix(in srgb, var(--adm-danger) 24%, transparent)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm font-semibold" style={{ color: "var(--adm-danger)" }}>Delete account</p><p className="text-xs" style={{ color: "var(--adm-text2)" }}>Permanently removes your account and all data. This cannot be undone.</p></div>
            <AdminBtn variant="danger" size="sm">Delete account</AdminBtn>
          </div>
        </div>
      </DSGroup>

      <DSGroup title="Settings structure">
        <DSChecklist
          columns={3}
          items={[
            { label: "Settings sidebar / tabs", status: "spec" },
            { label: "Settings section / card / row", status: "spec" },
            { label: "Sticky save / cancel footer", status: "spec" },
            { label: "Unsaved-changes warning", status: "spec" },
            { label: "Autosave vs explicit save", status: "inApp" },
            { label: "Danger zone", status: "spec" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Settings domains" description="Each is a template to fill in against the structure above.">
        <DSChecklist
          columns={3}
          items={[
            { label: "Account (profile, email, password)", note: "src/pages/app/Profile.jsx", status: "inApp" },
            { label: "Appearance (theme, density)", note: "Theme toggle exists.", status: "inApp" },
            { label: "Notifications", note: "src/pages/app/Settings.jsx", status: "inApp" },
            { label: "Team (members, roles, invites)", note: "src/pages/app/Team.jsx", status: "inApp" },
            { label: "Workspace / company", status: "spec" },
            { label: "Security (2FA, sessions, SSO)", status: "planned" },
            { label: "Billing (plan, payment, invoices)", status: "planned" },
            { label: "Integrations (API keys, webhooks)", status: "planned" },
            { label: "Privacy (data export/delete)", note: "Account delete exists.", status: "inApp" },
          ]}
        />
        <p className="text-xs" style={{ color: "var(--adm-text3)" }}>Real settings: <DSRef>src/pages/app/Settings.jsx</DSRef> <DSRef>src/pages/app/Profile.jsx</DSRef> <DSRef>src/pages/app/Team.jsx</DSRef></p>
      </DSGroup>
    </div>
  );
}
