"use client";

import { LocalizedLink } from "@/lib/i18n/localized-link";
import { useLocale } from "@/lib/i18n/locale-context";

export function HowItWorksCta() {
  const { dict } = useLocale();

  return (
    <div className="how-cta">
      <LocalizedLink href="/signup" style={{ textDecoration: "none" }}>
        <button type="button" className="btn-hero" style={{ margin: "0 auto" }}>
          {dict.nav.startJourney}{" "}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="icon-directional"
            aria-hidden
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </button>
      </LocalizedLink>
    </div>
  );
}
