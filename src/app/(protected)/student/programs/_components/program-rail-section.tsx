"use client";

import { useRef } from "react";

import { useLocale } from "@/lib/i18n/locale-context";
import type { DiscoveryProgram } from "../_lib/program-row-to-program";
import { ProgramExplorerCard } from "./program-explorer-card";
import explorerStyles from "./programs-explorer.module.css";

type ProgramRailSectionProps = {
  eyebrow: string;
  title: string;
  programs: DiscoveryProgram[];
  salaryLabel: string;
  demandLabel: string;
  scrollPreviousLabel: string;
  scrollNextLabel: string;
};

export function ProgramRailSection({
  eyebrow,
  title,
  programs,
  salaryLabel,
  demandLabel,
  scrollPreviousLabel,
  scrollNextLabel,
}: ProgramRailSectionProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();
  const isRtl = locale === "ar";

  if (programs.length === 0) return null;

  const scroll = (direction: "prev" | "next") => {
    const node = railRef.current;
    if (!node) return;
    const sign = direction === "prev" ? -1 : 1;
    const amount = (isRtl ? -sign : sign) * 300;
    node.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className={explorerStyles.sectionBlock}>
      <div className={explorerStyles.railRow}>
        <div>
          <div className={explorerStyles.sectionEyebrow}>{eyebrow}</div>
          <h2 className={explorerStyles.sectionTitle}>{title}</h2>
        </div>
        <div className={explorerStyles.railArrows}>
          <button
            type="button"
            className={explorerStyles.railArrow}
            onClick={() => scroll("prev")}
            aria-label={scrollPreviousLabel}
          >
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
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            className={explorerStyles.railArrow}
            onClick={() => scroll("next")}
            aria-label={scrollNextLabel}
          >
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
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
      <div ref={railRef} className={explorerStyles.rail}>
        {programs.map((program) => (
          <ProgramExplorerCard
            key={program.id}
            program={program}
            salaryLabel={salaryLabel}
            demandLabel={demandLabel}
          />
        ))}
      </div>
    </section>
  );
}
