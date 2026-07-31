import { fetchSupabaseAllRows } from "@/lib/supabase-fetch-all";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminEventExportRow = {
  event_id: string;
  event_name: string;
  event_type: string;
  featured: string;
  recommended_tag: string;
  date_start: string;
  date_end: string;
  month: string;
  year: string;
  start_time: string;
  end_time: string;
  timezone: string;
  mode: string;
  country: string;
  city: string;
  venue: string;
  region_focus: string;
  short_description: string;
  full_overview: string;
  topics_covered: string;
  target_audience: string;
  why_attend: string;
  universities_attending: string;
  university_count: string;
  organizer: string;
  organizer_type: string;
  cost: string;
  language: string;
  registration_status: string;
  registration_required: string;
  registration_url: string;
  source_name: string;
  source_url: string;
  date_verified: string;
  record_status: string;
  internal_notes: string;
  prep_steps: string;
};

type EventExportQueryRow = {
  event_id: string;
  event_name: string;
  event_type: string;
  featured: boolean;
  recommended_tag: string | null;
  date_start: string | null;
  date_end: string | null;
  month: string | null;
  year: number | null;
  start_time: string | null;
  end_time: string | null;
  timezone: string | null;
  mode: string | null;
  country: string | null;
  city: string | null;
  venue: string | null;
  region_focus: string | null;
  short_description: string | null;
  full_overview: string | null;
  topics_covered: string | null;
  target_audience: string | null;
  why_attend: string | null;
  universities_attending: string | null;
  university_count: number | null;
  organizer: string | null;
  organizer_type: string | null;
  cost: string | null;
  language: string | null;
  registration_status: string | null;
  registration_required: string | null;
  registration_url: string | null;
  source_name: string | null;
  source_url: string | null;
  date_verified: string | null;
  record_status: string;
  internal_notes: string | null;
  prep_steps: string | null;
};

const EVENT_EXPORT_SELECT = `
  event_id,
  event_name,
  event_type,
  featured,
  recommended_tag,
  date_start,
  date_end,
  month,
  year,
  start_time,
  end_time,
  timezone,
  mode,
  country,
  city,
  venue,
  region_focus,
  short_description,
  full_overview,
  topics_covered,
  target_audience,
  why_attend,
  universities_attending,
  university_count,
  organizer,
  organizer_type,
  cost,
  language,
  registration_status,
  registration_required,
  registration_url,
  source_name,
  source_url,
  date_verified,
  record_status,
  internal_notes,
  prep_steps
`;

function str(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function dateStr(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export async function fetchAdminEventsExport(): Promise<AdminEventExportRow[]> {
  const supabase = await createSupabaseSecretClient();

  const { data, error } = await fetchSupabaseAllRows<EventExportQueryRow>(
    async (from, to) =>
      supabase
        .from("university_events")
        .select(EVENT_EXPORT_SELECT)
        .order("event_id", { ascending: true })
        .range(from, to),
  );

  if (error) {
    console.error("[admin-events-export]", error);
    throw new Error("Could not load events for export.");
  }

  return data.map((row) => ({
    event_id: row.event_id,
    event_name: row.event_name,
    event_type: row.event_type,
    featured: row.featured ? "Yes" : "No",
    recommended_tag: str(row.recommended_tag),
    date_start: dateStr(row.date_start),
    date_end: dateStr(row.date_end),
    month: str(row.month),
    year: row.year != null ? String(row.year) : "",
    start_time: str(row.start_time),
    end_time: str(row.end_time),
    timezone: str(row.timezone),
    mode: str(row.mode),
    country: str(row.country),
    city: str(row.city),
    venue: str(row.venue),
    region_focus: str(row.region_focus),
    short_description: str(row.short_description),
    full_overview: str(row.full_overview),
    topics_covered: str(row.topics_covered),
    target_audience: str(row.target_audience),
    why_attend: str(row.why_attend),
    universities_attending: str(row.universities_attending),
    university_count:
      row.university_count != null ? String(row.university_count) : "",
    organizer: str(row.organizer),
    organizer_type: str(row.organizer_type),
    cost: str(row.cost),
    language: str(row.language),
    registration_status: str(row.registration_status),
    registration_required: str(row.registration_required),
    registration_url: str(row.registration_url),
    source_name: str(row.source_name),
    source_url: str(row.source_url),
    date_verified: dateStr(row.date_verified),
    record_status: row.record_status,
    internal_notes: str(row.internal_notes),
    prep_steps: str(row.prep_steps),
  }));
}
