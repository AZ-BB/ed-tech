"use client";

import { useEffect, useRef, useState } from "react";

import { StudentSpinner } from "@/app/(protected)/student/_components/student-spinner";

export type CalendlyPrefill = {
  name?: string;
  email?: string;
};

type Props = {
  url: string;
  prefill?: CalendlyPrefill;
  title?: string;
  className?: string;
  onEventScheduled?: () => void;
};

function isCalendlyMessageEvent(data: unknown): data is { event: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "event" in data &&
    typeof (data as { event: unknown }).event === "string" &&
    (data as { event: string }).event.startsWith("calendly.")
  );
}

/** Calendly inline iframe — avoids widget.js timing issues; matches application-support embed behavior. */
export function CalendlyInlineEmbed({
  url,
  prefill,
  title = "Book your session — Calendly",
  className = "min-h-[780px] w-full min-w-[320px] rounded-none border-0 bg-white",
  onEventScheduled,
}: Props) {
  const [iframeSrc, setIframeSrc] = useState("");
  const onEventScheduledRef = useRef(onEventScheduled);

  useEffect(() => {
    onEventScheduledRef.current = onEventScheduled;
  }, [onEventScheduled]);

  useEffect(() => {
    if (!onEventScheduled) return;

    function handleMessage(event: MessageEvent) {
      if (event.origin !== "https://calendly.com") return;
      if (!isCalendlyMessageEvent(event.data)) return;
      if (event.data.event !== "calendly.event_scheduled") return;
      onEventScheduledRef.current?.();
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onEventScheduled]);

  useEffect(() => {
    try {
      const u = new URL(url);
      if (!u.searchParams.has("embed_type")) {
        u.searchParams.set("embed_type", "Inline");
      }
      if (!u.searchParams.has("embed_domain")) {
        u.searchParams.set("embed_domain", window.location.hostname);
      }
      const n = prefill?.name?.trim();
      const e = prefill?.email?.trim();
      if (n) u.searchParams.set("name", n);
      if (e) u.searchParams.set("email", e);
      setIframeSrc(u.toString());
    } catch {
      setIframeSrc(url);
    }
  }, [url, prefill?.name, prefill?.email]);

  if (!iframeSrc) {
    return (
      <div
        role="status"
        className="flex min-h-[780px] w-full items-center justify-center bg-white"
      >
        <StudentSpinner />
        <span className="sr-only">Loading calendar…</span>
      </div>
    );
  }

  return (
    <iframe
      title={title}
      src={iframeSrc}
      className={className}
      loading="lazy"
      allow="camera; microphone; fullscreen; payment"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
