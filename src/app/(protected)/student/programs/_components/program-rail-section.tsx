"use client";

import { useRef } from "react";

import type { DiscoveryProgram } from "../_lib/program-row-to-program";
import { ProgramExplorerCard } from "./program-explorer-card";
import explorerStyles from "./programs-explorer.module.css";

type ProgramRailSectionProps = {
  eyebrow: string;
  title: string;
  programs: DiscoveryProgram[];
  salaryLabel: string;
  demandLabel: string;
};

export function ProgramRailSection({
  eyebrow,
  title,
  programs,
  salaryLabel,
  demandLabel,
}: ProgramRailSectionProps) {
  const railRef = useRef<HTMLDivElement>(null);

  if (programs.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    const node = railRef.current;
    if (!node) return;
    const amount = direction === "left" ? -300 : 300;
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
            onClick={() => scroll("left")}
            aria-label="Scroll left"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            className={explorerStyles.railArrow}
            onClick={() => scroll("right")}
            aria-label="Scroll right"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
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
