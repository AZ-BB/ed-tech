"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import type { DiscoveryProgram } from "../_lib/program-row-to-program";

type ProgramDetailOverlayProps = {
  program: DiscoveryProgram;
  onClose: () => void;
};

export function ProgramDetailOverlay({
  program,
  onClose,
}: ProgramDetailOverlayProps) {
  const { dict } = useLocale();
  const t = dict.student.programs;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[16px] bg-white shadow-2xl sm:rounded-[16px]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-light)] px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--green)]">
              {program.category}
            </div>
            <h2 className="mt-1 text-[20px] font-bold text-[var(--text)]">
              {program.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border border-[var(--border-light)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-mid)]"
          >
            {t.close}
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <Section title={t.overview}>
            <p className="text-[14px] leading-relaxed text-[var(--text-mid)]">
              {program.description || program.shortDescription || "—"}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label={t.salaryPotential} value={program.salaryPotential} />
              <Info label={t.demand} value={program.demandLevel} />
              <Info label={t.mathIntensity} value={program.mathIntensity} />
              <Info label={t.aiResilience} value={program.aiResilience} />
            </div>
          </Section>

          <ListSection title={t.careerPaths} items={program.careerPaths.map((item) => item.title)} />
          <ListSection title={t.coreSkills} items={program.coreSkills.map((item) => item.skill)} />

          {program.careerPaths.length > 0 ? (
            <Section title={t.careerPaths}>
              <div className="space-y-3">
                {program.careerPaths.map((path) => (
                  <div
                    key={`${path.title}-${path.tag ?? ""}`}
                    className="rounded-[12px] border border-[var(--border-light)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-[14px] font-semibold text-[var(--text)]">
                        {path.title}
                      </div>
                      {path.tag ? (
                        <span className="rounded-full bg-[var(--sand)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-mid)]">
                          {path.tag}
                        </span>
                      ) : null}
                    </div>
                    {path.description ? (
                      <p className="mt-2 text-[13px] text-[var(--text-mid)]">
                        {path.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {program.videos.length > 0 ? (
            <Section title={t.videos}>
              <div className="space-y-2">
                {program.videos.map((video) => (
                  <a
                    key={video.youtube_id}
                    href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-[10px] border border-[var(--border-light)] px-4 py-3 text-[13px] font-medium text-[var(--green)] hover:bg-[var(--sand)]"
                  >
                    {video.title}
                  </a>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-[15px] font-bold text-[var(--text)]">{title}</h3>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-[var(--sand)] px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-hint)]">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-semibold text-[var(--text)]">
        {value || "—"}
      </div>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Section title={title}>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-[var(--border-light)] px-3 py-1 text-[12px] text-[var(--text-mid)]"
          >
            {item}
          </span>
        ))}
      </div>
    </Section>
  );
}
