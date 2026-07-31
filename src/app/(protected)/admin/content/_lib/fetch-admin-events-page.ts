import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdminEventsPageFilters } from "./parse-admin-events-search-params";

export type AdminEventTableRow = {
  id: string;
  eventId: string;
  eventName: string;
  eventType: string;
  dateStart: string | null;
  country: string;
  mode: string;
  recordStatus: string;
  registrationStatus: string;
  savedCount: number;
};

async function fetchEventSaveCounts(
  eventUuids: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (eventUuids.length === 0) return counts;

  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("student_activities")
    .select("university_event_id")
    .eq("entity_type", "event")
    .eq("type", "save")
    .in("university_event_id", eventUuids);

  if (error) {
    console.error("[admin-events] save counts", error);
    return counts;
  }

  for (const row of data ?? []) {
    const id = row.university_event_id;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return counts;
}

export async function fetchAdminEventsPage(
  filters: AdminEventsPageFilters,
): Promise<{ rows: AdminEventTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const { q, eventType, country, mode, status, page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = supabase.from("university_events").select(
    `id, event_id, event_name, event_type, date_start, country, mode, record_status, registration_status`,
  );

  const trimmed = q.trim();
  if (trimmed) {
    const e = escapeIlike(trimmed);
    query = query.or(
      `event_id.ilike.%${e}%,event_name.ilike.%${e}%,organizer.ilike.%${e}%,short_description.ilike.%${e}%`,
    );
  }

  if (eventType) query = query.eq("event_type", eventType);
  if (country) query = query.eq("country", country);
  if (mode) query = query.eq("mode", mode);

  if (status === "active") {
    query = query.ilike("record_status", "active");
  } else if (status === "draft") {
    query = query.ilike("record_status", "draft");
  } else if (status === "archived") {
    query = query.ilike("record_status", "archived");
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin-content] events page", error);
    return { rows: [], totalRows: 0 };
  }

  const events = data ?? [];
  const savedCounts = await fetchEventSaveCounts(events.map((row) => row.id));

  const rows: AdminEventTableRow[] = events.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    eventName: row.event_name.trim(),
    eventType: row.event_type.trim() || "—",
    dateStart: row.date_start,
    country: row.country?.trim() || "—",
    mode: row.mode?.trim() || "—",
    recordStatus: row.record_status.trim() || "Active",
    registrationStatus: row.registration_status?.trim() || "—",
    savedCount: savedCounts.get(row.id) ?? 0,
  }));

  rows.sort((a, b) => {
    const da = a.dateStart ? new Date(a.dateStart).getTime() : Number.MAX_SAFE_INTEGER;
    const db = b.dateStart ? new Date(b.dateStart).getTime() : Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    return a.eventName.localeCompare(b.eventName);
  });

  const totalRows = rows.length;
  const pagedRows = rows.slice(offset, offset + limit);

  return { rows: pagedRows, totalRows };
}

export async function fetchAdminEventTypeOptions(): Promise<string[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("university_events")
    .select("event_type")
    .order("event_type");

  if (error) {
    console.error("[admin-events] type options", error);
    return [];
  }

  const set = new Set<string>();
  for (const row of data ?? []) {
    const t = row.event_type?.trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export async function fetchAdminEventCountryOptions(): Promise<string[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("university_events")
    .select("country")
    .order("country");

  if (error) {
    console.error("[admin-events] country options", error);
    return [];
  }

  const set = new Set<string>();
  for (const row of data ?? []) {
    const c = row.country?.trim();
    if (c) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
