import { FiBell } from "react-icons/fi";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSRef } from "../dsPrimitives";

/**
 * Notifications & messaging: the bell + dropdown, notification items, and the
 * messaging/comment catalog.
 *
 * @returns {JSX.Element}
 */
export default function NotificationsSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Notifications & messaging"
        lead="Notifications surface through a bell + unread badge in the app nav, a dropdown, and a full inbox page. Unread items carry an accent dot; read items mute. The product has a working in-app inbox; richer messaging/comments are mostly spec."
      />

      <DSGroup title="Notification bell + items" status="inApp" description="Real implementation: NotificationBell + NotificationsContext.">
        <DSTile>
          <div className="mx-auto max-w-sm overflow-hidden rounded-xl" style={{ backgroundColor: "var(--adm-surface-elevated)", border: "1px solid var(--adm-border2)", boxShadow: "var(--adm-shadow)" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
              <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--adm-text)" }}><FiBell /> Notifications</span>
              <button className="text-xs font-semibold" style={{ color: "var(--adm-accent)" }}>Mark all read</button>
            </div>
            {[
              { title: "Maya shared \"Trips Right Flood\"", time: "2m ago", unread: true },
              { title: "New join request for Austin Arrows", time: "1h ago", unread: true },
              { title: "Your play was added to a playbook", time: "Yesterday", unread: false },
            ].map((n, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid var(--adm-border)", backgroundColor: n.unread ? "var(--adm-accent-dim)" : "transparent" }}>
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: n.unread ? "var(--adm-accent)" : "var(--adm-border2)" }} />
                <div><p className="text-sm" style={{ color: "var(--adm-text)" }}>{n.title}</p><p className="text-xs" style={{ color: "var(--adm-text3)" }}>{n.time}</p></div>
              </div>
            ))}
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Notification system">
        <DSChecklist
          columns={3}
          items={[
            { label: "Bell + unread badge", status: "inApp" },
            { label: "Dropdown + inbox page", status: "inApp" },
            { label: "Read / unread item", status: "inApp" },
            { label: "Mark all as read", status: "inApp" },
            { label: "Empty notifications", status: "inApp" },
            { label: "Inline response forms", status: "inApp" },
            { label: "Grouping", status: "spec" },
            { label: "Timestamp / relative time", status: "live" },
            { label: "Notification settings", status: "inApp" },
          ]}
        />
        <p className="text-xs" style={{ color: "var(--adm-text3)" }}>Real: <DSRef>src/components/NotificationBell.jsx</DSRef> <DSRef>src/pages/app/Notifications.jsx</DSRef> <DSRef>src/context/NotificationsContext.jsx</DSRef></p>
      </DSGroup>

      <DSGroup title="Messaging & comments" description="Mostly spec — the product is play-centric, not chat-centric.">
        <DSChecklist
          columns={3}
          items={[
            { label: "Comment composer / item", status: "planned" },
            { label: "Reply thread / mention", status: "planned" },
            { label: "Reaction / edited / deleted state", status: "planned" },
            { label: "Message bubble / system message", status: "planned" },
            { label: "Typing indicator", status: "planned" },
            { label: "Empty / loading conversation", status: "planned" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
