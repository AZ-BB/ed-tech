"use client";

import { useEffect, useState } from "react";

export type CalendlyPrefill = {
  name?: string;
  email?: string;
};

type Props = {
  url: string;
  prefill?: CalendlyPrefill;
  title?: string;
  className?: string;
};

/** Calendly inline iframe — avoids widget.js timing issues; matches application-support embed behavior. */
export function CalendlyInlineEmbed({
  url,
  prefill,
  title = "Book your session — Calendly",
  className = "min-h-[780px] w-full min-w-[320px] rounded-none border-0 bg-white",
}: Props) {
  const [iframeSrc, setIframeSrc] = useState("");

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
      <div className="flex min-h-[780px] w-full items-center justify-center bg-white">
        <p className="text-sm text-[var(--text-hint)]">Loading calendar…</p>
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
