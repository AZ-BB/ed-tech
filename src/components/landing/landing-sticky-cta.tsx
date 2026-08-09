"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { localizePath, type Locale } from "@/lib/i18n/config";

type LandingStickyCtaProps = {
  title: string;
  sub: string;
  ctaLabel: string;
  locale: Locale;
  signupHref?: string;
};

export function LandingStickyCta({
  title,
  sub,
  ctaLabel,
  locale,
  signupHref = "/signup",
}: LandingStickyCtaProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 520);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`sticky-cta${visible ? " show" : ""}`} id="stickyCta">
      <div className="sticky-cta-inner">
        <div className="sticky-cta-text">
          <b>{title}</b>
          <span>{sub}</span>
        </div>
        <Link href={localizePath(signupHref, locale)} className="sticky-cta-btn">
          {ctaLabel}{" "}
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
