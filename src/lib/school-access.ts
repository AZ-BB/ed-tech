import { createSupabaseSecretClient } from "@/utils/supabase-server";

export const SCHOOL_DEACTIVATED_LOGIN_MESSAGE =
  "The school has been deactivated. Please contact support.";

export async function isSchoolActive(schoolId: string): Promise<boolean | null> {
  const secret = await createSupabaseSecretClient();
  const { data: school, error } = await secret
    .from("schools")
    .select("is_active")
    .eq("id", schoolId)
    .maybeSingle();

  if (error || !school) {
    console.error("[school-access] schools lookup", error);
    return null;
  }

  return school.is_active !== false;
}
