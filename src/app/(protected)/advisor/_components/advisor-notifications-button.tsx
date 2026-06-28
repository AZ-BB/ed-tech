"use client";

import { useEffect, useRef, useState } from "react";
import { AdvisorNotificationsPanel } from "./advisor-notifications-panel";
import { useAdvisorNotificationsPoll } from "./use-advisor-notifications-poll";

export function AdvisorNotificationsButton() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    items,
    unreadCount,
    loading,
    error,
    refresh,
    markLocalRead,
    markAllLocalRead,
  } = useAdvisorNotificationsPoll();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
        aria-controls="advisor-notifications-panel"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex cursor-pointer items-center justify-center rounded-[8px] border-[1.5px] border-[#e0deda] bg-[#faf9f4] p-[9px] text-[#4a4a4a] transition-all duration-[150ms] hover:border-[#40916C] hover:bg-[#f0f7f2] hover:text-[#2D6A4F]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span
            className="absolute right-[7px] top-[7px] h-[6px] w-[6px] rounded-full bg-[#E74C3C]"
            aria-hidden
          />
        ) : null}
      </button>

      <AdvisorNotificationsPanel
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        loading={loading}
        error={error}
        onMarkLocalRead={markLocalRead}
        onMarkAllLocalRead={markAllLocalRead}
        onRefresh={refresh}
      />
    </div>
  );
}
