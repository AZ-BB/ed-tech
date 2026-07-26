"use client";

import { getSchoolLessonDownloadUrl } from "@/actions/school-lessons";
import { format } from "date-fns";
import { useTransition } from "react";

import type { SchoolLessonRow } from "../_lib/fetch-school-lessons";

function formatTableDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy");
}

type SchoolLessonsClientProps = {
  lessons: SchoolLessonRow[];
};

export function SchoolLessonsClient({ lessons }: SchoolLessonsClientProps) {
  const [isPending, startTransition] = useTransition();

  function handleDownload(lesson: SchoolLessonRow) {
    startTransition(async () => {
      const result = await getSchoolLessonDownloadUrl(lesson.id);
      if ("error" in result) {
        window.alert(result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white">
      <div className="border-b border-[var(--border-light)] px-6 py-5">
        <h2 className="text-[16px] font-bold text-[var(--text)]">Lesson library</h2>
        <p className="mt-1 text-[13px] text-[var(--text-mid)]">
          Shared documents and resources for teachers. Download any file below.
        </p>
      </div>

      {lessons.length === 0 ? (
        <div className="px-6 py-14 text-center text-[13px] text-[var(--text-mid)]">
          No lesson documents available yet.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-light)]">
          {lessons.map((lesson) => (
            <article key={lesson.id} className="px-6 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-bold text-[var(--text)]">{lesson.title}</h3>
                  {lesson.description ? (
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-mid)]">
                      {lesson.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[12px] text-[var(--text-light)]">
                    {lesson.fileName} · Added {formatTableDate(lesson.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDownload(lesson)}
                  className="shrink-0 cursor-pointer rounded-[8px] border border-[var(--border-light)] bg-white px-4 py-2 text-[12px] font-semibold text-[var(--text)] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-60"
                >
                  Download
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
