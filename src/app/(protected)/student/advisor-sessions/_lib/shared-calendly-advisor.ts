import "server-only";

import { ADVISOR_SESSIONS_SHARED_CALENDLY_ADVISOR_ID } from "@/lib/calendly-scheduling";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SharedCalendlySecret = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

/** Shared Calendly scheduling URL for all advisor sessions, or null if not connected. */
export async function fetchAdvisorSessionsSharedCalendlyUrl(
  secret?: SharedCalendlySecret,
): Promise<string | null> {
  const client = secret ?? (await createSupabaseSecretClient());
  const { data, error } = await client
    .from("advisors")
    .select("calendly_scheduling_url, calendly_refresh_token")
    .eq("id", ADVISOR_SESSIONS_SHARED_CALENDLY_ADVISOR_ID)
    .maybeSingle();

  if (error) {
    console.error("[fetchAdvisorSessionsSharedCalendlyUrl]", error);
    return null;
  }

  const connected = Boolean(data?.calendly_refresh_token?.trim());
  const url = data?.calendly_scheduling_url?.trim() || null;
  return connected && url ? url : null;
}
