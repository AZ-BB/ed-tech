"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Internship } from "./types";
import { InternshipCard } from "./internship-card";

type Props = {
  title: string;
  subtitle: string;
  iconWrapStyle: { background: string };
  icon: ReactNode;
  count: number;
  internships: Internship[];
  onSelect: (id: string) => void;
};

export function InternshipCategorySection({
  title,
  subtitle,
  iconWrapStyle,
  icon,
  count,
  internships,
  onSelect,
}: Props) {
  const { dict } = useLocale();
  const t = dict.student.internships;
  if (internships.length === 0) return null;

  const countLabel =
    count === 1
      ? t.optionOne.replace("{count}", "1")
      : t.optionsMany.replace("{count}", String(count));

  return (
    <section className="internship-cat-section">
      <div className="cat-header">
        <div className="cat-icon" style={iconWrapStyle}>
          {icon}
        </div>
        <div>
          <div className="cat-title">{title}</div>
          <div className="cat-sub">{subtitle}</div>
        </div>
        <div className="cat-count">{countLabel}</div>
      </div>
      <div className="internship-grid">
        {internships.map((it) => (
          <InternshipCard
            key={it.slug}
            internship={it}
            onOpenDetail={() => onSelect(it.slug)}
          />
        ))}
      </div>
    </section>
  );
}
