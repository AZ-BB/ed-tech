import "server-only";

import { isReservedInfluencerSlug } from "@/lib/influencer-funnel-slugs";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type InfluencerFunnelRow = {
  id: string;
  slug: string;
  display_name: string;
  calendly_scheduling_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export { INFLUENCER_FUNNEL_SIGNUP_SOURCE } from "@/lib/influencer-funnel-constants";

export async function getActiveInfluencerFunnelBySlug(
  slug: string,
): Promise<InfluencerFunnelRow | null> {
  const normalized = slug.trim().toLowerCase();
  if (isReservedInfluencerSlug(normalized)) return null;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) return null;

  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("influencer_funnels")
    .select("id, slug, display_name, calendly_scheduling_url, is_active, created_at, updated_at")
    .eq("slug", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[getActiveInfluencerFunnelBySlug]", error);
    return null;
  }

  return data as InfluencerFunnelRow | null;
}

export async function getInfluencerFunnelBySlugForAdmin(
  slug: string,
): Promise<InfluencerFunnelRow | null> {
  const normalized = slug.trim().toLowerCase();
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("influencer_funnels")
    .select("id, slug, display_name, calendly_scheduling_url, is_active, created_at, updated_at")
    .eq("slug", normalized)
    .maybeSingle();

  if (error) {
    console.error("[getInfluencerFunnelBySlugForAdmin]", error);
    return null;
  }

  return data as InfluencerFunnelRow | null;
}

export async function getInfluencerFunnelById(
  id: string,
): Promise<InfluencerFunnelRow | null> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("influencer_funnels")
    .select("id, slug, display_name, calendly_scheduling_url, is_active, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getInfluencerFunnelById]", error);
    return null;
  }

  return data as InfluencerFunnelRow | null;
}

export async function listInfluencerFunnelsForAdmin(): Promise<InfluencerFunnelRow[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("influencer_funnels")
    .select("id, slug, display_name, calendly_scheduling_url, is_active, created_at, updated_at")
    .order("display_name");

  if (error) {
    console.error("[listInfluencerFunnelsForAdmin]", error);
    return [];
  }

  return (data ?? []) as InfluencerFunnelRow[];
}

export async function listActiveInfluencerFunnels(): Promise<InfluencerFunnelRow[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("influencer_funnels")
    .select("id, slug, display_name, calendly_scheduling_url, is_active, created_at, updated_at")
    .eq("is_active", true)
    .order("display_name");

  if (error) {
    console.error("[listActiveInfluencerFunnels]", error);
    return [];
  }

  return (data ?? []) as InfluencerFunnelRow[];
}
