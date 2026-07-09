"use client";

import clsx from "clsx";
import { useLocale } from "@/lib/i18n/locale-context";
import { ArrowForwardIcon } from "../../_components/directional-icons";
import type { DiscoveryProgram } from "../_lib/program-row-to-program";

type ProgramCardProps = {
  program: DiscoveryProgram;
  onOpenDetail: () => void;
};

export function ProgramCard({ program, onOpenDetail }: ProgramCardProps) {
  const { dict } = useLocale();
  const t = dict.student.programs;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetail();
        }
      }}
      className="relative w-full min-w-0 cursor-pointer rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white p-4 text-start transition-all hover:border-[var(--border)] hover:shadow-[0_3px_12px_rgba(0,0,0,0.04)] sm:p-5"
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold leading-snug text-[var(--text)]">
            {program.title}
          </div>
          <div className="mt-1 text-[12px] text-[var(--text-light)]">
            {program.category}
          </div>
        </div>
        {program.featured ? (
          <span className="shrink-0 rounded-full bg-[#FAEEDA] px-2.5 py-0.5 text-[10px] font-semibold text-[#854F0B]">
            {t.featuredBadge}
          </span>
        ) : null}
      </div>

      <p className="mb-3.5 line-clamp-3 text-[12.5px] leading-normal text-[var(--text-mid)]">
        {program.shortDescription || program.description}
      </p>

      <div className="mb-3.5 grid grid-cols-2 gap-2 border-y border-[var(--border-light)] py-3 sm:grid-cols-4">
        <Metric label={t.salaryPotential} value={program.salaryPotential} />
        <Metric label={t.demand} value={program.demandLevel} />
        <Metric label={t.mathIntensity} value={program.mathIntensity} />
        <Metric label={t.aiResilience} value={program.aiResilience} />
      </div>

      {program.tags.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {program.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--sand)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-mid)]"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-end text-[12px] font-semibold text-[var(--green)]">
        {t.viewDetails}
        <ArrowForwardIcon className="ms-1 h-3.5 w-3.5" />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-hint)]">
        {label}
      </div>
      <div
        className={clsx(
          "text-[11px] font-semibold leading-snug text-[var(--text)] sm:text-[12px]",
          !value && "text-[var(--text-hint)]",
        )}
      >
        {value || "—"}
      </div>
    </div>
  );
}
