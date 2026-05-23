import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiAlertCircle } from "react-icons/fi";
import { useNotifications } from "../context/NotificationsContext";

/** Compact relative-time label, e.g. "just now", "3h", "2d". */
function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Bell button with an unread badge and a dropdown panel of recent notifications.
 * Lives in the app shell; reads from the shared NotificationsProvider so the
 * badge stays in sync with the notifications page.
 */
export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const recent = notifications.slice(0, 8);

  const handleOpenItem = (n) => {
    setOpen(false);
    if (!n.readAt) markRead(n.id);
    navigate(`/app/notifications?n=${n.id}`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"
      >
        <FiBell className="text-lg" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-BrandOrange px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className="absolute left-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-BrandGray2/20 bg-BrandBlack shadow-2xl"
            role="menu"
          >
            <div className="flex items-center justify-between border-b border-BrandGray2/20 px-4 py-3">
              <span className="text-sm font-semibold text-BrandText">Notifications</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-semibold text-BrandOrange transition hover:opacity-80"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {recent.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <FiBell className="text-2xl text-BrandGray2" />
                  <p className="text-sm text-BrandGray">You're all caught up</p>
                </div>
              ) : (
                recent.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleOpenItem(n)}
                    className="flex w-full items-start gap-3 border-b border-BrandGray2/10 px-4 py-3 text-left transition hover:bg-BrandBlack2"
                  >
                    <span className="mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                      {!n.readAt && <span className="h-2 w-2 rounded-full bg-BrandOrange" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {n.priority === "critical" && <FiAlertCircle className="shrink-0 text-xs text-red-400" />}
                        {n.priority === "high" && <FiAlertCircle className="shrink-0 text-xs text-amber-400" />}
                        <span className={`truncate text-sm ${n.readAt ? "text-BrandGray" : "font-semibold text-BrandText"}`}>
                          {n.title}
                        </span>
                      </div>
                      {n.subject && <p className="mt-0.5 truncate text-xs text-BrandGray2">{n.subject}</p>}
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-BrandGray2">
                        <span>{timeAgo(n.sentAt)}</span>
                        {n.hasQuestions && !n.respondedAt && (
                          <span className="rounded-full bg-BrandOrange/15 px-1.5 py-0.5 font-semibold text-BrandOrange">
                            Needs response
                          </span>
                        )}
                        {n.respondedAt && <span className="text-green-400">Responded</span>}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => { setOpen(false); navigate("/app/notifications"); }}
              className="block w-full border-t border-BrandGray2/20 px-4 py-3 text-center text-xs font-semibold text-BrandOrange transition hover:bg-BrandBlack2"
            >
              View all notifications
            </button>
          </div>
        </>
      )}
    </div>
  );
}
