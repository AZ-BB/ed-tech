import "server-only";

import { createSupabaseServerClient } from "@/utils/supabase-server";

import type { Scholarship } from "../_components/types";

export async function getScholarshipDiscoveryPrograms(): Promise<Scholarship[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("scholarships")
    .select("id, discovery_slug, discovery_payload")
    .not("discovery_payload", "is", null)
    .order("name", { ascending: true });

  if (error) {
    console.error("[getScholarshipDiscoveryPrograms]", error.message);
    return [];
  }

  const rows = data ?? [];
  return rows.map((row) => {
    const payload = row.discovery_payload as Record<string, unknown>;
    const id =
      typeof payload.id === "string" && payload.id.length > 0
        ? payload.id
        : (row.discovery_slug ?? row.id);
    return { ...payload, id } as Scholarship;
  });
}
