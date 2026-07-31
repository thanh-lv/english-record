import { Bell, Check, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Notification } from "../hooks/useNotifications";
import { useLanguage, interpolate } from "../../../i18n/LanguageContext";
import { useEscapeToClose } from "../../../hooks/useEscapeToClose";

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  readIds: Set<string>;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onNavigate: (recordId: string, studentName: string) => void;
}

export function NotificationBell({
  notifications,
  unreadCount,
  readIds,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  onNavigate,
}: NotificationBellProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  function timeAgo(isoString: string): string {
    const diff = Math.floor(
      (Date.now() - new Date(isoString).getTime()) / 1000,
    );
    if (diff < 60) return t.notifications.justNow;
    if (diff < 3600)
      return `${Math.floor(diff / 60)} ${t.notifications.minutesAgo}`;
    if (diff < 86400)
      return `${Math.floor(diff / 3600)} ${t.notifications.hoursAgo}`;
    return `${Math.floor(diff / 86400)} ${t.notifications.daysAgo}`;
  }
  const ref = useRef<HTMLDivElement>(null);
  useEscapeToClose(() => setOpen(false), open);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) onMarkAllRead();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={
          unreadCount > 0
            ? interpolate(t.notifications.unreadCount, { count: unreadCount })
            : t.notifications.toggleLabel
        }
        aria-expanded={open}
        aria-haspopup="true"
        className="relative w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors border border-white/20"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-lg flex items-center justify-center border-2 border-white shadow-md"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-bell-title"
          className="fixed md:absolute left-2 right-2 md:left-auto md:right-0 top-16 md:top-12 md:w-80 bg-white rounded-lg shadow-md border border-slate-100 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span
              id="notification-bell-title"
              className="font-extrabold text-slate-800 text-sm"
            >
              {t.notifications.title}
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-black rounded-lg">
                  {unreadCount} {t.notifications.new}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  aria-label={t.notifications.clearAll}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title={t.notifications.clearAll}
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.common.close}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                <Bell size={28} className="opacity-30" />
                <p className="text-xs font-bold">{t.notifications.empty}</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isRead = readIds.has(n.id);
                const itemLabel = `${n.studentName} ${t.notifications.submitted}${
                  n.topicNumber !== undefined
                    ? ` ${t.notifications.topic} ${n.topicNumber}`
                    : ""
                } — ${timeAgo(n.createdAt)}`;
                return (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    aria-label={itemLabel}
                    onClick={() => {
                      onMarkRead(n.id);
                      onNavigate(n.id, n.studentName);
                      setOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onMarkRead(n.id);
                        onNavigate(n.id, n.studentName);
                        setOpen(false);
                      }
                    }}
                    className={`px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer flex items-start gap-3 transition-colors ${
                      !isRead ? "bg-[#E3F2FD]/30" : ""
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-2 h-2 rounded-lg mt-1.5 shrink-0 ${
                        !isRead ? "bg-[#1E88E5]" : "bg-transparent"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 leading-snug">
                        <span className="font-extrabold text-slate-900">
                          {n.studentName}
                        </span>{" "}
                        {t.notifications.submitted}{" "}
                        {n.topicNumber !== undefined && (
                          <span className="text-[#1E88E5] font-black">
                            {t.notifications.topic} {n.topicNumber}
                          </span>
                        )}
                      </p>
                      {(n as any).questionText && (
                        <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                          "{(n as any).questionText}"
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 font-bold mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
