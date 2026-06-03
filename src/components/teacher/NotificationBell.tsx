import { Bell, Check, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Notification } from "./hooks/useNotifications";

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  readIds: Set<string>;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onNavigate: (recordId: string, studentName: string) => void;
}

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className="relative w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors border border-white/20"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed md:absolute left-2 right-2 md:left-auto md:right-0 top-16 md:top-12 md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-extrabold text-slate-800 text-sm">
              Thông báo
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-black rounded-full">
                  {unreadCount} mới
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Xóa tất cả"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                <Bell size={28} className="opacity-30" />
                <p className="text-xs font-bold">Chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isRead = readIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      onMarkRead(n.id);
                      onNavigate(n.id, n.studentName);
                      setOpen(false);
                    }}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${
                      isRead
                        ? "bg-white hover:bg-slate-50"
                        : "bg-emerald-50 hover:bg-emerald-100"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isRead
                          ? "bg-slate-100 text-slate-400"
                          : "bg-emerald-200 text-emerald-700"
                      }`}
                    >
                      {isRead ? <Check size={13} /> : <Bell size={13} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-slate-800 leading-snug">
                        <span className="text-emerald-600">
                          {n.studentName}
                        </span>{" "}
                        vừa nộp bài!
                      </p>
                      {n.topicNumber !== undefined && (
                        <p className="text-xs font-bold text-slate-400 mt-0.5">
                          Topic {n.topicNumber}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-300 font-bold mt-0.5">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!isRead && (
                      <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0 mt-2" />
                    )}
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
