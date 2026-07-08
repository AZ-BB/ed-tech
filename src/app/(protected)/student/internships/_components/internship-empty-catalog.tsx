"use client";

import { useLocale } from "@/lib/i18n/locale-context";

export function InternshipEmptyCatalog() {
  const { dict } = useLocale();
  const t = dict.student.internships;

  return (
    <div className="internship-empty-catalog">
      <h2 className="internship-empty-title">{t.emptyTitle}</h2>
      <p className="internship-empty-body">{t.emptyBody}</p>
      <p className="internship-empty-footnote">{t.emptyFootnote}</p>
    </div>
  );
}
