"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  markAllSchoolNotificationsReadAction,
  markSchoolNotificationReadAction,
} from "@/actions/school-notifications";
import {
  formatSchoolNotificationTimestamp,
  type SchoolNotificationItem,
} from "@/lib/school-admin-notifications";

const SCROLL_THIN =
  "[scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#d4d0c8]" as const;

type SchoolNotificationsPanelProps = {
  open: boolean;
  onClose: () => void;
  items: SchoolNotificationItem[];
  loading: boolean;
  error: string | null;
  onMarkLocalRead: (notificationId: string) => void;
  onMarkAllLocalRead: () => void;
  onRefresh: () => Promise<void>;
};

export function SchoolNotificationsPanel({
  open,
  onClose,
  items,
  loading,
  error,
  onMarkLocalRead,
  onMarkAllLocalRead,
  onRefresh,
}: SchoolNotificationsPanelProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleMarkAllRead = async () => {
    onMarkAllLocalRead();
    const res = await markAllSchoolNotificationsReadAction();
    if (res.error) {
      await onRefresh();
    }
  };

  const handleItemClick = async (item: SchoolNotificationItem) => {
    if (!item.read) {
      onMarkLocalRead(item.id);
      void markSchoolNotificationReadAction(item.id);
    }

    onClose();

    if (item.linkPath) {
      router.push(item.linkPath);
    }
  };

  if (!open) return null;

  const unreadCount = items.filter((item) => !item.read).length;

  return (
    <div
      id="school-notifications-panel"
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-[calc(100%+8px)] z-[200] w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-[12px] border-[1.5px] border-[#e0deda] bg-[#faf9f4] shadow-[0_12px_40px_rgba(15,30,20,0.14)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#ece9e4] px-4 py-3">
        <div>
          <h2 className="text-[15px] font-semibold text-[#1a1a1a]">
            Notifications
          </h2>
          {unreadCount > 0 ? (
            <p className="mt-0.5 text-[11px] text-[#6b6b6b]">
              {unreadCount} unread
            </p>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            className="shrink-0 rounded-[6px] border-0 bg-transparent px-2 py-1 text-[11.5px] font-semibold text-[#2D6A4F] transition-colors hover:bg-[#f0f7f2]"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      <div className={`max-h-[360px] overflow-y-auto px-2 py-2 ${SCROLL_THIN}`}>
        {loading && items.length === 0 ? (
          <p className="px-2 py-6 text-center text-[13px] text-[#6b6b6b]">
            Loading notifications…
          </p>
        ) : error ? (
          <p className="px-2 py-6 text-center text-[13px] text-[#c0392b]">
            {error}
          </p>
        ) : items.length === 0 ? (
          <p className="px-2 py-6 text-center text-[13px] text-[#6b6b6b]">
            No notifications yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const timeLabel = formatSchoolNotificationTimestamp(item.createdAt);
              const content = (
                <div className="flex items-start gap-2.5">
                  {!item.read ? (
                    <span
                      className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full bg-[#40916C]"
                      aria-hidden
                    />
                  ) : (
                    <span className="mt-[6px] h-[6px] w-[6px] shrink-0" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[13px] leading-snug ${
                        item.read ? "text-[#5a5a5a]" : "font-semibold text-[#1a1a1a]"
                      }`}
                    >
                      {item.title}
                    </div>
                    {item.body ? (
                      <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#6b6b6b]">
                        {item.body}
                      </div>
                    ) : null}
                    {timeLabel ? (
                      <div className="mt-1 text-[11px] text-[#8a8a8a]">
                        {timeLabel}
                      </div>
                    ) : null}
                  </div>
                </div>
              );

              return (
                <li key={item.id}>
                  {item.linkPath ? (
                    <button
                      type="button"
                      onClick={() => void handleItemClick(item)}
                      className="w-full rounded-[8px] border-0 bg-transparent px-2 py-2.5 text-left transition-colors hover:bg-[#f0f7f2]"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="px-2 py-2.5">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
