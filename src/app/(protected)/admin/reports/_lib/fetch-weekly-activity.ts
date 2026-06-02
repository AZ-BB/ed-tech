import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { ReportDateBounds } from "./report-date-range";
import type { WeeklyActivityPoint } from "./report-payloads";

const PAGE_SIZE = 1000;

function weekKey(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

function formatWeekLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    dt,
  );
}

export async function fetchWeeklyActivityInRange(
  studentSet: Set<string>,
  bounds: ReportDateBounds,
): Promise<WeeklyActivityPoint[]> {
  const supabase = await createSupabaseSecretClient();
  const counts = new Map<string, number>();

  const bump = (iso: string) => {
    const key = weekKey(new Date(iso));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };

  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("student_activities")
      .select("student_id, created_at")
      .gte("created_at", bounds.startIso)
      .lt("created_at", bounds.endExclusiveIso)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) break;
    if (!data?.length) break;
    for (const row of data) {
      if (row.student_id && studentSet.has(row.student_id) && row.created_at) {
        bump(row.created_at);
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("ai_usage")
      .select("student_id, created_at")
      .gte("created_at", bounds.startIso)
      .lt("created_at", bounds.endExclusiveIso)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) break;
    if (!data?.length) break;
    for (const row of data) {
      if (row.student_id && studentSet.has(row.student_id) && row.created_at) {
        bump(row.created_at);
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ label: formatWeekLabel(key), count }));
}
