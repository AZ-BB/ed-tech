import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminEventDetail = Database["public"]["Tables"]["university_events"]["Row"];

export async function fetchAdminEventDetail(
  id: string,
): Promise<AdminEventDetail | null> {
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

  return data;
}

export function getAdminEventDetailHref(id: string): string {
  return `/admin/content/events/${id}`;
}
