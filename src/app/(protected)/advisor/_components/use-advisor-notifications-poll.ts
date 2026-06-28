"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AdvisorNotificationItem,
  AdvisorNotificationsResponse,
} from "@/lib/advisor-notifications";

const POLL_MS = 30_000;

export function useAdvisorNotificationsPoll() {
  const [items, setItems] = useState<AdvisorNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (document.visibilityState === "hidden") {
      return;
    }

    if (!opts?.silent) {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/advisor/notifications", {
        credentials: "same-origin",
      });
      const data = (await res.json()) as
        | AdvisorNotificationsResponse
        | { error?: string };

      if (cancelledRef.current) return;

      if (!res.ok) {
        setError(
          "error" in data && data.error
            ? data.error
            : "Could not load notifications.",
        );
        return;
      }

      const payload = data as AdvisorNotificationsResponse;
      setItems(payload.items);
      setUnreadCount(payload.unreadCount);
      setError(null);
    } catch {
      if (!cancelledRef.current) {
        setError("Could not load notifications.");
      }
    } finally {
      if (!cancelledRef.current && !opts?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    void refresh();

    const id = window.setInterval(() => {
      void refresh({ silent: true });
    }, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelledRef.current = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const markLocalRead = useCallback((notificationId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllLocalRead = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
  }, []);

  return {
    items,
    unreadCount,
    loading,
    error,
    refresh,
    markLocalRead,
    markAllLocalRead,
  };
}
