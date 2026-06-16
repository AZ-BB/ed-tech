import {
  mapApplicationUniversityTargetRow,
  type ApplicationUniversityTargetRow,
  type UniversityTargetRaw,
} from "@/lib/application-university-target-mapper";
import type { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient =
  | Awaited<ReturnType<typeof createSupabaseServerClient>>
  | Awaited<ReturnType<typeof createSupabaseSecretClient>>;

const UNIVERSITY_TARGETS_SELECT = `
  id,
  application_id,
  university_id,
  university_name,
  program,
  country_code,
  deadline,
  portal_url,
  status,
  decision,
  notes,
  sort_order,
  application_university_document_requirements (
    id,
    display_name,
    status,
    sort_order,
    application_university_document_files (
      id,
      source_type,
      url,
      file_name,
      file_size,
      file_type,
      uploaded_at,
      checklist_document_id
    )
  )
`;

export async function fetchApplicationUniversityTargets(
  client: DbClient,
  applicationId: number,
): Promise<ApplicationUniversityTargetRow[]> {
  const { data, error } = await client
    .from("application_university_targets")
    .select(UNIVERSITY_TARGETS_SELECT)
    .eq("application_id", applicationId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[fetchApplicationUniversityTargets]", error);
    return [];
  }

  return (data ?? []).map((row) =>
    mapApplicationUniversityTargetRow(row as UniversityTargetRaw),
  );
}
