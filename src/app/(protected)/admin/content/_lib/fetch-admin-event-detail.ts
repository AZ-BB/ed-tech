import type { Database } from "@/database.types";
import {
  getEventTranslationStatus,
  parseEventContentAr,
  parseEventContentArMeta,
  type EventContentAr,
  type EventTranslationStatus,
} from "@/lib/event-translatable-fields";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminEventDetail = Database["public"]["Tables"]["university_events"]["Row"];

export type { EventTranslationStatus };

export type AdminEventDetailPayload = {
  event: AdminEventDetail;
  contentAr: EventContentAr;
  contentArTranslatedAt: string | null;
  translationStatus: EventTranslationStatus;
};

export async function fetchAdminEventDetail(
  id: string,
): Promise<AdminEventDetailPayload | null> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("university_events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin-events] detail", error);
    return null;
  }

  if (!data) return null;

  const contentAr = parseEventContentAr(data.content_ar);
  const meta = parseEventContentArMeta(data.content_ar_meta);

  return {
    event: data,
    contentAr,
    contentArTranslatedAt: meta?.translated_at ?? null,
    translationStatus: getEventTranslationStatus(
      {
        event_name: data.event_name,
        event_type: data.event_type,
        recommended_tag: data.recommended_tag,
        short_description: data.short_description,
        full_overview: data.full_overview,
        topics_covered: data.topics_covered,
        target_audience: data.target_audience,
        why_attend: data.why_attend,
        prep_steps: data.prep_steps,
        city: data.city,
        venue: data.venue,
        organizer: data.organizer,
        universities_attending: data.universities_attending,
        cost: data.cost,
        region_focus: data.region_focus,
        country: data.country,
      },
      contentAr,
      meta,
    ),
  };
}

export function getAdminEventDetailHref(id: string): string {
  return `/admin/content/events/${id}`;
}
