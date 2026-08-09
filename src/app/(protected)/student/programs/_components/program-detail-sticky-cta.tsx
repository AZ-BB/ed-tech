"use client";

import { useEffect, useState } from "react";

import { ApplicationSupportLink } from "../../_components/application-support-link";
import detailStyles from "./program-detail.module.css";

type ProgramDetailStickyCtaProps = {
  title: string;
  subtitle: string;
  buttonLabel: string;
};

export function ProgramDetailStickyCta({
  title,
  subtitle,
  buttonLabel,
}: ProgramDetailStickyCtaProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 800);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`${detailStyles.stickyCta} ${visible ? detailStyles.stickyCtaVisible : ""}`}
    >
      <div className={detailStyles.stickyCtaInner}>
        <div className={detailStyles.stickyCtaText}>
          <strong>{title}</strong>
          <span className={detailStyles.stickyCtaTextSub}>{subtitle}</span>
        </div>
        <ApplicationSupportLink href="/student/application-support" className={detailStyles.stickyCtaBtn}>
          {buttonLabel}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="icon-directional"
            aria-hidden
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </ApplicationSupportLink>
      </div>
    </div>
  );
}
