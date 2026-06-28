"use client";

import { format, isValid, parseISO } from "date-fns";

import type { SchoolWebinarRow } from "../_lib/fetch-school-webinars";
import { WebinarTags } from "@/app/(protected)/student/webinars/_components/webinar-tag-badge";

function formatWebinarDate(iso: string): string {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return iso;
  return format(parsed, "EEEE, MMMM d, yyyy 'at' h:mm a");
}

type SchoolWebinarsClientProps = {
  webinars: SchoolWebinarRow[];
};

export function SchoolWebinarsClient({ webinars }: SchoolWebinarsClientProps) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white">
      <div className="border-b border-[var(--border-light)] px-6 py-5">
        <h2 className="text-[16px] font-bold text-[var(--text)]">Upcoming webinars</h2>
        <p className="mt-1 text-[13px] text-[var(--text-mid)]">
          Live sessions your students can register for from their Univeera student portal.
        </p>
      </div>

      {webinars.length === 0 ? (
        <div className="px-6 py-14 text-center text-[13px] text-[var(--text-mid)]">
          No upcoming webinars scheduled right now.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-light)]">
          {webinars.map((webinar) => (
            <article key={webinar.id} className="px-6 py-5">
              <WebinarTags tags={webinar.tags} className="mb-2" />
              <h3 className="text-[15px] font-bold text-[var(--text)]">{webinar.title}</h3>
              <p className="mt-1 text-[12px] text-[var(--text-light)]">
                {formatWebinarDate(webinar.scheduledAt)} {webinar.timezoneLabel} · {webinar.format}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-mid)]">
                {webinar.description}
              </p>
              <p className="mt-3 text-[12px] text-[var(--text-mid)]">
                <span className="font-semibold text-[var(--text)]">{webinar.advisorName}</span>
                {webinar.advisorTitle ? ` · ${webinar.advisorTitle}` : ""}
              </p>
              <p className="mt-2 text-[12px] font-medium text-[var(--text)]">
                {webinar.registeredCount} / {webinar.maxStudents} students registered
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
