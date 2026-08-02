import type { Database } from "@/database.types";
import {
  formatEventDateParts,
  isOnlineEventMode,
  isPastEventDate,
} from "@/lib/event-type-styles";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import type { EventDiscoverySearchParams } from "./parse-event-discovery-search-params";
import { eventCountryMatchesLocationFilter } from "./event-location-options";

export type StudentEventRow =
  Database["public"]["Tables"]["university_events"]["Row"];

export type StudentEventCard = {
  id: string;
  eventId: string;
  name: string;
  eventType: string;
  organizer: string;
  shortDescription: string;
  dateStart: string | null;
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
  mode: string | null;
  country: string | null;
  city: string | null;
  venue: string | null;
  featured: boolean;
  recommendedTag: string | null;
  universityCount: number | null;
  universitiesAttending: string | null;
  registrationStatus: string | null;
  registrationUrl: string | null;
  fullOverview: string | null;
  targetAudience: string | null;
  whyAttend: string | null;
  prepSteps: string | null;
  regionFocus: string | null;
  isSaved: boolean;
};

export type EventDiscoveryPageData = {
  events: StudentEventCard[];
  featuredEvent: StudentEventCard | null;
  filterOptions: {
    locations: string[];
    types: string[];
  };
  selectedEvent: StudentEventCard | null;
  savedEventIds: string[];
  query: EventDiscoverySearchParams;
};

function mapRow(
  row: StudentEventRow,
  savedIds: Set<string>,
): StudentEventCard {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.event_name,
    eventType: row.event_type,
    organizer: row.organizer?.trim() || "",
    shortDescription: row.short_description?.trim() || "",
    dateStart: row.date_start,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone,
    mode: row.mode,
    country: row.country,
    city: row.city,
    venue: row.venue,
    featured: row.featured,
    recommendedTag: row.recommended_tag,
    universityCount: row.university_count,
    universitiesAttending: row.universities_attending,
    registrationStatus: row.registration_status,
    registrationUrl: row.registration_url,
    fullOverview: row.full_overview,
    targetAudience: row.target_audience,
    whyAttend: row.why_attend,
    prepSteps: row.prep_steps,
    regionFocus: row.region_focus,
    isSaved: savedIds.has(row.id),
  };
}

function eventMatchesFilters(
  event: StudentEventCard,
  query: EventDiscoverySearchParams,
): boolean {
  if (event.dateStart && isPastEventDate(event.dateStart)) {
    return false;
  }

  if (query.location) {
    if (query.location === "Online") {
      if (!isOnlineEventMode(event.mode)) return false;
    } else if (!eventCountryMatchesLocationFilter(event.country, query.location)) {
      return false;
    }
  }

  if (query.month) {
    const monthNum = formatEventDateParts(event.dateStart).monthNum;
    if (monthNum !== Number.parseInt(query.month, 10)) return false;
  }

  if (query.type && event.eventType !== query.type) return false;

  if (query.mode === "online" && !isOnlineEventMode(event.mode)) return false;
  if (query.mode === "inperson" && isOnlineEventMode(event.mode)) return false;

  const q = query.q.trim().toLowerCase();
  if (q) {
    const hay = [
      event.name,
      event.organizer,
      event.shortDescription,
      event.universitiesAttending ?? "",
      event.eventType,
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }

  return true;
}

function sortEvents(events: StudentEventCard[]): StudentEventCard[] {
  return [...events].sort((a, b) => {
    const da = a.dateStart ? new Date(`${a.dateStart}T12:00:00`).getTime() : NaN;
    const db = b.dateStart ? new Date(`${b.dateStart}T12:00:00`).getTime() : NaN;
    const pa = Number.isNaN(da);
    const pb = Number.isNaN(db);
    if (pa && pb) return a.name.localeCompare(b.name);
    if (pa) return 1;
    if (pb) return -1;
    return da - db;
  });
}

export async function getEventDiscoveryPageData(
  query: EventDiscoverySearchParams,
): Promise<EventDiscoveryPageData> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows, error } = await supabase
    .from("university_events")
    .select("*")
    .ilike("record_status", "active")
    .order("date_start", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[events-discovery]", error);
    return {
      events: [],
      featuredEvent: null,
      filterOptions: { locations: [], types: [] },
      selectedEvent: null,
      savedEventIds: [],
      query,
    };
  }

  let savedIds = new Set<string>();
  if (user?.id) {
    const { data: saves } = await supabase
      .from("student_activities")
      .select("university_event_id")
      .eq("student_id", user.id)
      .eq("entity_type", "event")
      .eq("type", "save");

    savedIds = new Set(
      (saves ?? [])
        .map((row) => row.university_event_id)
        .filter((id): id is string => Boolean(id)),
    );
  }

  const allEvents = (rows ?? []).map((row) => mapRow(row, savedIds));
  const locationSet = new Set<string>();
  const typeSet = new Set<string>();

  for (const event of allEvents) {
    if (isOnlineEventMode(event.mode)) {
      locationSet.add("Online");
    } else if (event.country?.trim()) {
      locationSet.add(event.country.trim());
    }
    if (event.eventType.trim()) typeSet.add(event.eventType.trim());
  }

  const filtered = sortEvents(
    allEvents.filter((event) => eventMatchesFilters(event, query)),
  );

  const featuredEvent =
    allEvents.find(
      (event) =>
        event.featured &&
        !isPastEventDate(event.dateStart) &&
        eventMatchesFilters({ ...event }, { ...query, q: "", detail: "" }),
    ) ?? null;

  const selectedEvent =
    query.detail.trim().length > 0
      ? allEvents.find((event) => event.eventId === query.detail.trim()) ?? null
      : null;

  return {
    events: filtered,
    featuredEvent,
    filterOptions: {
      locations: [...locationSet].sort((a, b) => a.localeCompare(b)),
      types: [...typeSet].sort((a, b) => a.localeCompare(b)),
    },
    selectedEvent,
    savedEventIds: [...savedIds],
    query,
  };
}
