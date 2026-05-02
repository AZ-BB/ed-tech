import type { ReactNode } from "react";
import type { Scholarship } from "./types";
import { ScholarshipCard } from "./scholarship-card";

type Props = {
  title: string;
  subtitle: string;
  iconWrapClass: string;
  icon: ReactNode;
  count: number;
  scholarships: Scholarship[];
  onSelect: (id: string) => void;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  footer?: ReactNode;
};

export function ScholarshipCategorySection({
  title,
  subtitle,
  iconWrapClass,
  icon,
  count,
  scholarships,
  onSelect,
  savedIds,
  onToggleSave,
  footer,
}: Props) {
  if (scholarships.length === 0 && !footer) return null;

  return (
    <section className="mb-7">
      <div className="mb-3.5 flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${iconWrapClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-[var(--text)]">{title}</div>
          <div className="text-[12px] text-[var(--text-light)]">{subtitle}</div>
        </div>
        <span className="ml-auto shrink-0 rounded-xl bg-[var(--sand)] px-3 py-0.5 text-[11px] font-medium text-[var(--text-hint)]">
          {count} available
        </span>
      </div>
      {scholarships.length > 0 ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {scholarships.map((s) => (
            <ScholarshipCard
              key={s.id}
              scholarship={s}
              onOpenDetail={() => onSelect(s.id)}
              saved={savedIds.has(s.id)}
              onToggleSave={() => onToggleSave(s.id)}
            />
          ))}
        </div>
      ) : null}
      {footer}
    </section>
  );
}
