"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import {
  activityConfig,
  type StudentDashboardActivityCounts,
} from "../_data/student-dashboard-data";

type Props = {
  totalLogins: number;
};

export function StudentDashboardActivityStats({ totalLogins }: Props) {
  const [counts, setCounts] = useState<StudentDashboardActivityCounts | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    (async () => {
      try {
        const [
          { count: savedUniversitiesCount },
          { count: viewedUniversitiesCount },
          { count: savedScholarshipsCount },
          { count: essaysReviewedCount },
          { count: aiMatchesGeneratedCount },
          { count: advisorSessionsBookedCount },
          { count: ambassadorSessionsBookedCount },
        ] = await Promise.all([
          supabase
            .from("student_activities")
            .select("id", { count: "exact", head: true })
            .eq("entity_type", "university")
            .eq("type", "save"),
          supabase
            .from("student_activities")
            .select("id", { count: "exact", head: true })
            .eq("entity_type", "university")
            .eq("type", "viewed"),
          supabase
            .from("student_activities")
            .select("id", { count: "exact", head: true })
            .eq("entity_type", "scholarship")
            .eq("type", "save"),
          supabase
            .from("ai_usage")
            .select("id", { count: "exact", head: true })
            .eq("type", "essay_review"),
          supabase
            .from("ai_usage")
            .select("id", { count: "exact", head: true })
            .eq("type", "matching"),
          supabase
            .from("advisor_sessions")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("ambassador_session_requests")
            .select("id", { count: "exact", head: true }),
        ]);

        if (cancelled) return;

        setCounts({
          universities_viewed: viewedUniversitiesCount ?? 0,
          universities_saved: savedUniversitiesCount ?? 0,
          scholarships_saved: savedScholarshipsCount ?? 0,
          essays_reviewed: essaysReviewedCount ?? 0,
          advisor_sessions_booked: advisorSessionsBookedCount ?? 0,
          ambassador_sessions_booked: ambassadorSessionsBookedCount ?? 0,
          total_logins: totalLogins,
          ai_matches_generated: aiMatchesGeneratedCount ?? 0,
        });
      } catch (e) {
        console.error("[StudentDashboardActivityStats]", e);
        if (!cancelled) {
          setCounts({
            universities_viewed: 0,
            universities_saved: 0,
            scholarships_saved: 0,
            essays_reviewed: 0,
            advisor_sessions_booked: 0,
            ambassador_sessions_booked: 0,
            total_logins: totalLogins,
            ai_matches_generated: 0,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [totalLogins]);

  return (
    <>
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-hint)]">
        Your activity
      </div>
      <div
        className="mb-5 grid grid-cols-2 gap-3 min-[801px]:grid-cols-4"
        aria-busy={counts === null}
      >
        {activityConfig.map((m) => (
          <div
            key={m.key}
            className="rounded-xl border border-[var(--border-light)] bg-white px-4 py-4 text-center"
          >
            <div className="flex min-h-[34px] items-center justify-center font-[family-name:var(--font-dm-serif)] text-2xl font-bold text-[var(--green)]">
              {counts === null ? (
                <span
                  className="h-7 w-10 animate-pulse rounded-md bg-[var(--sand)]"
                  aria-hidden
                />
              ) : (
                counts[m.key]
              )}
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-[var(--text-light)]">
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
