import "server-only";

import type { Json } from "@/database.types";
import {
  CALENDLY_INFLUENCER_ADVISOR_URL,
} from "@/lib/calendly-scheduling";
import { INFLUENCER_FUNNEL_SIGNUP_SOURCE } from "@/lib/influencer-funnel-constants";
import {
  getActiveInfluencerFunnelBySlug,
  getInfluencerFunnelById,
} from "@/lib/influencer-funnels";

function readMetaString(meta: Json | null | undefined, key: string): string | null {
  if (meta == null || typeof meta !== "object" || Array.isArray(meta)) return null;
  const value = (meta as Record<string, unknown>)[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function resolveCustomStudentInfluencerCalendlyBase(
  metaData: Json | null | undefined,
): Promise<string> {
  const source = readMetaString(metaData, "source");
  if (source !== INFLUENCER_FUNNEL_SIGNUP_SOURCE) {
    return CALENDLY_INFLUENCER_ADVISOR_URL;
  }

  const funnelId = readMetaString(metaData, "influencerFunnelId");
  if (funnelId) {
    const funnel = await getInfluencerFunnelById(funnelId);
    const url = funnel?.calendly_scheduling_url?.trim();
    if (url) return url;
  }

  const slug = readMetaString(metaData, "influencerFunnelSlug");
  if (slug) {
    const funnel = await getActiveInfluencerFunnelBySlug(slug);
    const url = funnel?.calendly_scheduling_url?.trim();
    if (url) return url;
  }

  return CALENDLY_INFLUENCER_ADVISOR_URL;
}
