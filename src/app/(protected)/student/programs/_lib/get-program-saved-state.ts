import "server-only";

import { createSupabaseServerClient } from "@/utils/supabase-server";

export async function getProgramSavedState(
  programId: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return false;

  const { data } = await supabase
    .from("student_activities")
    .select("id")
    .eq("student_id", user.id)
    .eq("entity_type", "program")
    .eq("type", "save")
    .eq("program_discovery_id", programId)
    .maybeSingle();

  return Boolean(data);
}
