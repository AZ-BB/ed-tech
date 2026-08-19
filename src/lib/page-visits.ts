import "server-only";

import { createSupabaseSecretClient } from "@/utils/supabase-server";

export const INFLUENCER_LANDING_PAGE_PATH = "/ar/custom";
export const CUSTOM_WITH_FORM_LANDING_PAGE_PATH = "/ar/custom-with-form";

export async function incrementPageVisit(path: string): Promise<void> {
  const trimmed = path.trim();
  if (!trimmed) return;

  try {
    const supabase = await createSupabaseSecretClient();
    const { error } = await supabase.rpc("increment_page_visit", {
      p_path: trimmed,
    });
    if (error) {
      console.error("[incrementPageVisit]", error);
    }
  } catch (error) {
    console.error("[incrementPageVisit]", error);
  }
}

export async function getPageVisitCount(path: string): Promise<number> {
  const trimmed = path.trim();
  if (!trimmed) return 0;

  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("page_visits")
    .select("visit_count")
    .eq("path", trimmed)
    .maybeSingle();

  if (error) {
    console.error("[getPageVisitCount]", error);
    return 0;
  }

  return Number(data?.visit_count ?? 0);
}
